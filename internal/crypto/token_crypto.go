// Package crypto provides token encryption functionality using format-preserving encryption.
// The implementation uses the FAST algorithm, which processes data through multiple rounds
// where each round applies a mixing function with two S-box lookups and a state rotation.
// FAST provides strong security guarantees while preserving the format of the input data.
// Based on: "FAST: Secure and High Performance Format-Preserving Encryption and Tokenization"
// https://eprint.iacr.org/2021/1171.pdf
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"regexp"

	"github.com/jedisct1/go-fast"
)

const (
	// Prefix and suffix for encrypted token format
	encryptedTokenPrefix = "[ENCRYPTED-TOKEN:"
	encryptedTokenSuffix = "]"

	// Maximum length for tokens to avoid treating large binary data as secrets
	maxTokenLength = 512 // Reasonable upper bound for API keys and tokens
)

// Global encryption key for AES-128 (16 bytes), ephemeral and generated at startup
// This key is not persisted and will be different on each run
var globalEncryptionKey []byte

func init() {
	// Generate random key for AES-128 (16 bytes)
	globalEncryptionKey = make([]byte, 16)
	if _, err := rand.Read(globalEncryptionKey); err != nil {
		panic(fmt.Sprintf("failed to generate encryption key: %v", err))
	}
}

var (
	// Patterns that match potential secret tokens
	// Hex tokens: 32+ chars of hex (like API keys), but not exceeding maxTokenLength
	hexTokenPattern = regexp.MustCompile(`\b[a-fA-F0-9]{32,512}\b`)

	// Base64 tokens: sequences that look like base64 encoded secrets
	// Must be at least 20 chars and may optionally have padding, but not exceeding maxTokenLength
	base64TokenPattern = regexp.MustCompile(`\b[A-Za-z0-9+/]{20,512}(?:={1,2})?\b`)

	// Pattern to match encrypted tokens for decryption (base64 without padding)
	encryptedTokenPattern = regexp.MustCompile(`\[ENCRYPTED-TOKEN:([A-Za-z0-9+/]+)\]`)
)

// TokenCrypto handles encryption and decryption of sensitive tokens in strings.
// It uses format-preserving encryption (FPE) to maintain token format while
// ensuring they are encrypted. When Enabled is false, all operations are no-ops.
type TokenCrypto struct {
	cipher     cipher.Block
	fastCipher *fast.Cipher
	Enabled    bool
}

// NewTokenCrypto creates a new TokenCrypto instance.
// If enabled is false, returns a no-op instance that passes through all strings unchanged.
// If enabled is true, initializes AES cipher with the global encryption key.
func NewTokenCrypto(enabled bool) (*TokenCrypto, error) {
	if !enabled {
		return &TokenCrypto{Enabled: false}, nil
	}

	block, err := aes.NewCipher(globalEncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create AES cipher: %w", err)
	}

	fastCipher, err := fast.NewCipher(globalEncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create FAST cipher: %w", err)
	}

	return &TokenCrypto{
		cipher:     block,
		fastCipher: fastCipher,
		Enabled:    enabled,
	}, nil
}

// EncryptTokensInString finds and encrypts all tokens in the input string.
// It identifies potential secrets using pattern matching for hex tokens (32+ chars)
// and base64 tokens (20+ chars with appropriate character mix).
// Encrypted tokens are wrapped in [ENCRYPTED-TOKEN:...] format.
// Returns the original string if encryption is disabled.
func (tc *TokenCrypto) EncryptTokensInString(input string) string {
	if !tc.Enabled {
		return input
	}

	// Create a temporary placeholder to avoid double encryption
	type replacement struct {
		start     int
		end       int
		encrypted string
	}

	var replacements []replacement

	// Find all hex tokens
	hexMatches := hexTokenPattern.FindAllStringIndex(input, -1)
	for _, match := range hexMatches {
		token := input[match[0]:match[1]]
		if len(token) >= 32 && len(token) <= maxTokenLength && looksLikeSecret(token) {
			replacements = append(replacements, replacement{
				start:     match[0],
				end:       match[1],
				encrypted: tc.encryptToken(token),
			})
		}
	}

	// Find all base64 tokens
	base64Matches := base64TokenPattern.FindAllStringIndex(input, -1)
	for _, match := range base64Matches {
		token := input[match[0]:match[1]]
		if len(token) >= 20 && len(token) <= maxTokenLength && looksLikeBase64Secret(token) {
			// Check if this overlaps with any existing replacement
			overlaps := false
			for _, r := range replacements {
				if (match[0] >= r.start && match[0] < r.end) || (match[1] > r.start && match[1] <= r.end) {
					overlaps = true
					break
				}
			}
			if !overlaps {
				replacements = append(replacements, replacement{
					start:     match[0],
					end:       match[1],
					encrypted: tc.encryptToken(token),
				})
			}
		}
	}

	// Apply replacements in reverse order to maintain indices
	result := input
	for i := len(replacements) - 1; i >= 0; i-- {
		r := replacements[i]
		result = result[:r.start] + r.encrypted + result[r.end:]
	}

	return result
}

// DecryptTokensInString finds and decrypts all encrypted tokens in the input string.
// It looks for tokens in [ENCRYPTED-TOKEN:...] format and decrypts them back to
// their original values. If decryption fails for any token, that token is left unchanged.
// Returns the original string if encryption is disabled.
func (tc *TokenCrypto) DecryptTokensInString(input string) string {
	if !tc.Enabled {
		return input
	}

	return encryptedTokenPattern.ReplaceAllStringFunc(input, func(match string) string {
		// Extract the encrypted token from the pattern
		matches := encryptedTokenPattern.FindStringSubmatch(match)
		if len(matches) < 2 {
			return match
		}

		decrypted, err := tc.decryptToken(matches[1])
		if err != nil {
			// If decryption fails, return the original string
			return match
		}

		return decrypted
	})
}

// encryptToken encrypts a single token using format-preserving encryption
func (tc *TokenCrypto) encryptToken(token string) string {
	if tc.cipher == nil {
		return token
	}

	// Convert token to bytes
	tokenBytes := []byte(token)

	// Apply format-preserving encryption
	encrypted := tc.fpeEncrypt(tokenBytes)

	// Encode to base64 without padding and wrap in the encrypted token format
	encoded := base64.RawStdEncoding.EncodeToString(encrypted)
	return fmt.Sprintf("%s%s%s", encryptedTokenPrefix, encoded, encryptedTokenSuffix)
}

// decryptToken decrypts a single encrypted token
func (tc *TokenCrypto) decryptToken(encryptedBase64 string) (string, error) {
	if tc.cipher == nil {
		return "", fmt.Errorf("cipher not initialized")
	}

	// Decode from base64 without padding
	encrypted, err := base64.RawStdEncoding.DecodeString(encryptedBase64)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %w", err)
	}

	// Apply format-preserving decryption
	decrypted := tc.fpeDecrypt(encrypted)

	return string(decrypted), nil
}

// looksLikeSecret determines if a hex string appears to be a secret token
// by checking for sufficient length and character variety.
// Returns false for strings that are too short, all the same character,
// or lack sufficient entropy (less than 8 different characters).
func looksLikeSecret(token string) bool {
	if len(token) < 32 {
		return false
	}

	// Check if all characters are the same
	firstChar := token[0]
	allSame := true
	for _, c := range token {
		if byte(c) != firstChar {
			allSame = false
			break
		}
	}
	if allSame {
		return false
	}

	// Check for sufficient character variety (at least 8 different chars)
	charSet := make(map[rune]bool)
	for _, c := range token {
		charSet[c] = true
	}
	return len(charSet) >= 8
}

// looksLikeBase64Secret determines if a base64 string appears to be a secret
// by checking for a mix of uppercase, lowercase, and digit characters.
// This heuristic helps distinguish actual secrets from other base64 data.
func looksLikeBase64Secret(token string) bool {
	hasUpper := false
	hasLower := false
	hasDigit := false

	for _, c := range token {
		if c >= 'A' && c <= 'Z' {
			hasUpper = true
		} else if c >= 'a' && c <= 'z' {
			hasLower = true
		} else if c >= '0' && c <= '9' {
			hasDigit = true
		}
	}

	return hasUpper && hasLower && hasDigit
}

// fpeEncrypt performs format-preserving encryption using FAST algorithm.
// The output has the same length as the input, preserving the format.
// This is a wrapper around fpeEncryptWithTweak with nil tweak.
func (tc *TokenCrypto) fpeEncrypt(data []byte) []byte {
	return tc.fpeEncryptWithTweak(data, nil)
}

// fpeEncryptWithTweak performs format-preserving encryption using FAST algorithm with optional tweak.
// Based on: "FAST: Secure and High Performance Format-Preserving Encryption and Tokenization"
// https://eprint.iacr.org/2021/1171.pdf
// The tweak allows domain separation - same plaintext with different tweaks produces different ciphertexts.
func (tc *TokenCrypto) fpeEncryptWithTweak(data []byte, tweak []byte) []byte {
	if tc.fastCipher == nil {
		return data
	}
	return tc.fastCipher.Encrypt(data, tweak)
}

// fpeDecrypt performs format-preserving decryption using FAST algorithm.
// This is a wrapper around fpeDecryptWithTweak with nil tweak.
func (tc *TokenCrypto) fpeDecrypt(data []byte) []byte {
	return tc.fpeDecryptWithTweak(data, nil)
}

// fpeDecryptWithTweak performs format-preserving decryption using FAST algorithm with optional tweak.
// It reverses the encryption process by applying the FAST rounds in reverse order.
// The same tweak used for encryption must be provided for successful decryption.
func (tc *TokenCrypto) fpeDecryptWithTweak(data []byte, tweak []byte) []byte {
	if tc.fastCipher == nil {
		return data
	}
	return tc.fastCipher.Decrypt(data, tweak)
}

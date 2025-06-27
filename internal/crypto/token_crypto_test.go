package crypto

import (
	"bytes"
	"strings"
	"testing"
)

func TestTokenCrypto(t *testing.T) {
	// Create enabled token crypto
	tc, err := NewTokenCrypto(true)
	if err != nil {
		t.Fatalf("Failed to create TokenCrypto: %v", err)
	}

	tests := []struct {
		name          string
		input         string
		wantEncrypted bool
		description   string
	}{
		{
			name:          "hex token",
			input:         "The API key is 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
			wantEncrypted: true,
			description:   "Should encrypt long hex tokens",
		},
		{
			name:          "base64 token",
			input:         "Token: Zm9vYmFyYmF6YmFuZ2Jpbmdib29tMTIzNDU2Nzg5MA==",
			wantEncrypted: true,
			description:   "Should encrypt base64 tokens",
		},
		{
			name:          "short hex",
			input:         "Short hex: 1234567890abcdef",
			wantEncrypted: false,
			description:   "Should not encrypt short hex strings",
		},
		{
			name:          "repeated chars",
			input:         "Invalid: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			wantEncrypted: false,
			description:   "Should not encrypt repeated characters",
		},
		{
			name:          "multiple tokens",
			input:         "Key1: abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678 Key2: ZmVkY2JhOTg3NjU0MzIxMGZlZGNiYTk4NzY1NDMyMTA=",
			wantEncrypted: true,
			description:   "Should encrypt multiple tokens",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test encryption
			encrypted := tc.EncryptTokensInString(tt.input)

			if tt.wantEncrypted {
				if encrypted == tt.input {
					t.Errorf("Expected encryption but string was not changed")
				}
				if !strings.Contains(encrypted, "[ENCRYPTED-TOKEN:") {
					t.Errorf("Expected encrypted token marker, got: %s", encrypted)
				}
			} else {
				if encrypted != tt.input {
					t.Errorf("Expected no encryption but string was changed: %s", encrypted)
				}
			}

			// Test decryption (should always restore original)
			decrypted := tc.DecryptTokensInString(encrypted)
			if decrypted != tt.input {
				t.Errorf("Decryption failed\nOriginal:  %s\nEncrypted: %s\nDecrypted: %s", tt.input, encrypted, decrypted)
			}
		})
	}
}

func TestTokenCryptoDisabled(t *testing.T) {
	// Create disabled token crypto
	tc, err := NewTokenCrypto(false)
	if err != nil {
		t.Fatalf("Failed to create TokenCrypto: %v", err)
	}

	input := "The API key is 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

	// Should not encrypt when disabled
	encrypted := tc.EncryptTokensInString(input)
	if encrypted != input {
		t.Errorf("Expected no encryption when disabled, but string was changed")
	}

	// Should not decrypt when disabled
	inputWithToken := "Test [ENCRYPTED-TOKEN:sometoken] string"
	decrypted := tc.DecryptTokensInString(inputWithToken)
	if decrypted != inputWithToken {
		t.Errorf("Expected no decryption when disabled, but string was changed")
	}
}

// TestFASTAlgorithmProperties tests specific properties of the FAST algorithm
func TestFASTAlgorithmProperties(t *testing.T) {
	tc, err := NewTokenCrypto(true)
	if err != nil {
		t.Fatalf("Failed to create TokenCrypto: %v", err)
	}

	t.Run("format_preservation", func(t *testing.T) {
		// Test that format is preserved (same length)
		testCases := [][]byte{
			[]byte("a"),                          // 1 byte
			[]byte("ab"),                         // 2 bytes
			[]byte("abc"),                        // 3 bytes
			[]byte("abcd"),                       // 4 bytes
			[]byte("abcdefghijklmno"),            // 15 bytes
			[]byte("abcdefghijklmnop"),           // 16 bytes
			[]byte("abcdefghijklmnopqrstuvwxyz"), // 26 bytes
			make([]byte, 100),                    // 100 bytes
		}

		for _, plaintext := range testCases {
			encrypted := tc.fpeEncrypt(plaintext)
			if len(encrypted) != len(plaintext) {
				t.Errorf("Format not preserved: input length %d, output length %d", len(plaintext), len(encrypted))
			}
		}
	})

	t.Run("deterministic_encryption", func(t *testing.T) {
		// Test that same input always produces same output
		plaintext := []byte("test_deterministic_encryption_12345")

		encrypted1 := tc.fpeEncrypt(plaintext)
		encrypted2 := tc.fpeEncrypt(plaintext)

		if !bytes.Equal(encrypted1, encrypted2) {
			t.Error("Encryption is not deterministic: same plaintext produced different ciphertexts")
		}
	})

	t.Run("encryption_decryption_correctness", func(t *testing.T) {
		// Test that decryption correctly reverses encryption
		testCases := [][]byte{
			[]byte("x"),
			[]byte("test"),
			[]byte("1234567890abcdef"),
			[]byte("The quick brown fox jumps over the lazy dog"),
			make([]byte, 256), // Test with all possible byte values
		}

		// Initialize the 256-byte test case with all possible values
		for i := 0; i < 256; i++ {
			testCases[len(testCases)-1][i] = byte(i)
		}

		for _, plaintext := range testCases {
			encrypted := tc.fpeEncrypt(plaintext)
			decrypted := tc.fpeDecrypt(encrypted)

			if !bytes.Equal(decrypted, plaintext) {
				t.Errorf("Decryption failed for length %d", len(plaintext))
			}
		}
	})

	t.Run("tweak_support", func(t *testing.T) {
		// Test that tweaks affect the output
		plaintext := []byte("test_tweak_support_1234567890")
		tweak1 := []byte("tweak1")
		tweak2 := []byte("tweak2")

		// Encrypt with different tweaks
		encrypted1 := tc.fpeEncryptWithTweak(plaintext, tweak1)
		encrypted2 := tc.fpeEncryptWithTweak(plaintext, tweak2)
		encryptedNoTweak := tc.fpeEncrypt(plaintext)

		// Different tweaks should produce different ciphertexts
		if bytes.Equal(encrypted1, encrypted2) {
			t.Error("Different tweaks produced same ciphertext")
		}

		// Tweak should produce different output than no tweak
		if bytes.Equal(encrypted1, encryptedNoTweak) {
			t.Error("Tweak did not affect encryption output")
		}

		// Verify decryption works with tweaks
		decrypted1 := tc.fpeDecryptWithTweak(encrypted1, tweak1)
		decrypted2 := tc.fpeDecryptWithTweak(encrypted2, tweak2)

		if !bytes.Equal(decrypted1, plaintext) || !bytes.Equal(decrypted2, plaintext) {
			t.Error("Decryption with tweak failed")
		}

		// Wrong tweak should not decrypt correctly
		wrongDecrypt := tc.fpeDecryptWithTweak(encrypted1, tweak2)
		if bytes.Equal(wrongDecrypt, plaintext) {
			t.Error("Decryption succeeded with wrong tweak")
		}
	})

	t.Run("empty_tweak_compatibility", func(t *testing.T) {
		// Test that empty tweak works as specified
		plaintext := []byte("test_empty_tweak_compatibility")

		// These should produce the same result
		encrypted1 := tc.fpeEncrypt(plaintext)
		encrypted2 := tc.fpeEncryptWithTweak(plaintext, nil)
		encrypted3 := tc.fpeEncryptWithTweak(plaintext, []byte{})

		if !bytes.Equal(encrypted1, encrypted2) || !bytes.Equal(encrypted2, encrypted3) {
			t.Error("Empty tweak handling is inconsistent")
		}
	})

	t.Run("diffusion_property", func(t *testing.T) {
		// Test that changes in input produce changes in output
		// Note: FPE algorithms like FAST may not exhibit full avalanche effect
		// but should still show some diffusion properties
		plaintext1 := []byte("diffusion_test_1234567890abcdef")
		plaintext2 := make([]byte, len(plaintext1))
		copy(plaintext2, plaintext1)
		plaintext2[0] ^= 1 // Flip one bit

		encrypted1 := tc.fpeEncrypt(plaintext1)
		encrypted2 := tc.fpeEncrypt(plaintext2)

		// Check that the outputs are different
		if bytes.Equal(encrypted1, encrypted2) {
			t.Error("Single bit change did not affect encryption output")
		}

		// Count different bytes
		diffCount := 0
		for i := range encrypted1 {
			if encrypted1[i] != encrypted2[i] {
				diffCount++
			}
		}

		// For FPE, we expect at least some bytes to be different
		// The FAST algorithm uses rounds to spread changes
		if diffCount == 0 {
			t.Errorf("No diffusion: identical outputs for different inputs")
		}
		t.Logf("Diffusion: %d/%d bytes differ", diffCount, len(plaintext1))
	})
}

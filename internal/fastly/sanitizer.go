// Package fastly provides utilities for sanitizing sensitive information from
// command output and JSON data to prevent accidental exposure of secrets.
package fastly

import (
	"regexp"
	"strings"
)

// SanitizeOptions configures the sanitization behavior.
// When Enabled is true, sensitive data patterns will be detected and redacted.
type SanitizeOptions struct {
	Enabled bool
	// Reserved for future options: custom patterns, exclusions, etc.
}

// Sensitive data detection patterns.
// These regular expressions identify various types of secrets and PII.
var (
	// API tokens and keys
	apiTokenPattern    = regexp.MustCompile(`(?i)(api[_-]?token|api[_-]?key|access[_-]?token|auth[_-]?token|bearer)\s*[:=]\s*["']?([a-zA-Z0-9\-_.]{20,})["']?`)
	fastlyTokenPattern = regexp.MustCompile(`\b([a-zA-Z0-9]{32})\b`)
	genericKeyPattern  = regexp.MustCompile(`(?i)(secret[_-]?key|private[_-]?key|encryption[_-]?key)\s*[:=]\s*["']?([a-zA-Z0-9\-_.]{16,})["']?`)

	// Email addresses
	emailPattern = regexp.MustCompile(`\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`)

	// IP addresses
	ipv4Pattern = regexp.MustCompile(`\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b`)
	// IPv6 pattern that matches various formats but will be filtered for public addresses only
	// This pattern handles: full form, compressed form (::), and mixed notations
	ipv6Pattern = regexp.MustCompile(`(?i)\b(?:(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}:)*:(?:[0-9a-f]{1,4}:)*[0-9a-f]{0,4})\b`)

	// URLs with credentials
	urlCredsPattern = regexp.MustCompile(`(?i)(https?|ftp)://([^:]+):([^@]+)@[^\s]+`)

	// AWS patterns
	awsAccessKeyPattern = regexp.MustCompile(`\b(AKIA[0-9A-Z]{16})\b`)
	awsSecretKeyPattern = regexp.MustCompile(`(?i)aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*["']?([a-zA-Z0-9/+=]{40})["']?`)

	// SSH public keys (captures key type and beginning of base64 data)
	sshKeyPattern = regexp.MustCompile(`(?i)(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256)\s+([A-Za-z0-9+/=]{20,})`)

	// Generic secrets in JSON
	jsonSecretPattern = regexp.MustCompile(`"(?i)(password|secret|token|key|credential|auth)":\s*"([^"]+)"`)
)

// SanitizeOutput removes or obfuscates sensitive information from text output.
// It detects and redacts various types of secrets including API tokens, passwords,
// email addresses, IP addresses, SSH keys, and AWS credentials.
// Returns the original output unchanged if sanitization is disabled.
func SanitizeOutput(output string, opts SanitizeOptions) string {
	if !opts.Enabled {
		return output
	}

	// Create regex replacers for all patterns
	replacers := []*RegexReplacer{
		// Process SSH keys first to prevent email pattern from matching user@host in SSH URLs
		NewRegexReplacer(sshKeyPattern, RedactWithPrefix(1, " [REDACTED-SSH-KEY]")),

		// Replace API tokens and keys
		NewRegexReplacer(apiTokenPattern, RedactWithPrefix(1, ": [REDACTED]")),

		// Detect potential Fastly API tokens (32-character hexadecimal strings)
		NewRegexReplacer(fastlyTokenPattern, RedactConditionally(
			func(match string) bool { return isHexString(match) && len(match) == 32 },
			"[REDACTED-TOKEN]",
		)),

		// Replace generic keys
		NewRegexReplacer(genericKeyPattern, RedactWithPrefix(1, ": [REDACTED]")),

		// Replace URLs with credentials first (before IPv6 to avoid conflicts)
		NewRegexReplacer(urlCredsPattern, RedactWithPrefix(1, "://[REDACTED-CREDENTIALS]@...")),

		// Replace email addresses
		NewRegexReplacer(emailPattern, RedactEmail()),

		// Replace IP addresses
		NewRegexReplacer(ipv4Pattern, RedactCompletely("[REDACTED-IP]")),

		// Replace IPv6 addresses, but only public ones
		NewRegexReplacer(ipv6Pattern, RedactIPv6Conditionally()),

		// Replace AWS keys
		NewRegexReplacer(awsAccessKeyPattern, RedactCompletely("[REDACTED-AWS-ACCESS-KEY]")),
		NewRegexReplacer(awsSecretKeyPattern, func(match string, groups []string) string {
			if len(match) >= 20 {
				return match[:20] + "[REDACTED]"
			}
			return match
		}),

		// Replace secrets in JSON
		NewRegexReplacer(jsonSecretPattern, func(match string, groups []string) string {
			if len(groups) >= 3 {
				return `"` + groups[1] + `": "[REDACTED]"`
			}
			return match
		}),
	}

	// Apply all replacers in sequence
	return ChainReplacers(output, replacers...)
}

// SanitizeJSON recursively sanitizes JSON data by detecting and redacting values
// in fields with sensitive names (e.g., password, token, secret).
// It preserves the structure while replacing sensitive string values with "[REDACTED]".
// Returns the original data unchanged if sanitization is disabled.
func SanitizeJSON(jsonData interface{}, opts SanitizeOptions) interface{} {
	if !opts.Enabled {
		return jsonData
	}

	switch v := jsonData.(type) {
	case map[string]interface{}:
		sanitized := make(map[string]interface{})
		for key, value := range v {
			lowerKey := strings.ToLower(key)
			// Redact values for keys that likely contain sensitive data
			if containsSensitiveKey(lowerKey) {
				if str, ok := value.(string); ok && str != "" {
					sanitized[key] = "[REDACTED]"
				} else {
					sanitized[key] = value
				}
			} else {
				// Recursively sanitize nested structures
				sanitized[key] = SanitizeJSON(value, opts)
			}
		}
		return sanitized

	case []interface{}:
		sanitized := make([]interface{}, len(v))
		for i, item := range v {
			sanitized[i] = SanitizeJSON(item, opts)
		}
		return sanitized

	case string:
		// Apply output sanitization to standalone string values
		return SanitizeOutput(v, opts)

	default:
		return v
	}
}

// containsSensitiveKey checks if a key name suggests sensitive data
func containsSensitiveKey(key string) bool {
	sensitiveTerms := []string{
		"password", "passwd", "pwd",
		"secret", "token", "key",
		"credential", "cred",
		"auth", "authorization",
		"private", "priv",
		"access_key", "api_key",
		"client_secret", "client_id",
	}

	for _, term := range sensitiveTerms {
		if strings.Contains(key, term) {
			return true
		}
	}
	return false
}

// isHexString checks if a string contains only hexadecimal characters
func isHexString(s string) bool {
	if s == "" {
		return true // empty string contains only hex chars (none)
	}
	// Check each character is a valid hex digit
	for _, c := range s {
		if (c < '0' || c > '9') && (c < 'a' || c > 'f') && (c < 'A' || c > 'F') {
			return false
		}
	}
	return true
}

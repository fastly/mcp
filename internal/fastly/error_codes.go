// Package fastly provides functionality for executing and managing Fastly CLI commands.
package fastly

import "strings"

// errorCodePattern represents a pattern for matching error messages to standardized error codes.
type errorCodePattern struct {
	// patterns contains strings to search for in error messages (case-insensitive)
	patterns []string
	// code is the standardized error code to return when a pattern matches
	code string
}

// errorCodePatterns defines the mapping between error message patterns and standardized error codes.
// Patterns are checked in order, and the first match determines the error code.
// These codes help AI agents understand and handle different types of errors appropriately.
var errorCodePatterns = []errorCodePattern{
	{
		patterns: []string{"unauthorized", "authentication", "no api token"},
		code:     "auth_required",
	},
	{
		patterns: []string{"not found", "404"},
		code:     "not_found",
	},
	{
		patterns: []string{"permission", "forbidden", "403"},
		code:     "permission_denied",
	},
	{
		patterns: []string{"already exists", "duplicate"},
		code:     "already_exists",
	},
	{
		patterns: []string{"rate limit", "429"},
		code:     "rate_limit",
	},
	{
		// Check for unknown flags/commands before general "invalid" patterns
		patterns: []string{"unknown flag", "unknown long flag", "unknown short flag", "unknown command"},
		code:     "invalid_argument",
	},
	{
		patterns: []string{"no service id found", "required flag", "required argument"},
		code:     "validation_error",
	},
	{
		// Check for general "invalid" patterns last
		patterns: []string{"invalid", "validation"},
		code:     "validation_error",
	},
}

// DetectErrorCode analyzes an error message and returns a standardized error code.
// It performs case-insensitive pattern matching against known error patterns.
// If no pattern matches, it returns "operation_failed" as the default error code.
//
// Common error codes returned:
//   - "auth_required": Authentication or API token issues
//   - "not_found": Resource not found (404 errors)
//   - "permission_denied": Permission or forbidden errors (403)
//   - "validation_error": Invalid input or validation failures
//   - "already_exists": Duplicate resource errors
//   - "rate_limit": Rate limiting errors (429)
//   - "invalid_argument": Unknown flags or commands
//   - "operation_failed": Default for unrecognized errors
func DetectErrorCode(errorMessage string) string {
	errorLower := strings.ToLower(errorMessage)

	for _, pattern := range errorCodePatterns {
		for _, p := range pattern.patterns {
			if strings.Contains(errorLower, p) {
				return pattern.code
			}
		}
	}

	return "operation_failed"
}

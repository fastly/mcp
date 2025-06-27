package fastly

import (
	"regexp"
	"strings"
)

// ReplacementFunc defines a function that determines the replacement for a regex match
type ReplacementFunc func(match string, groups []string) string

// RegexReplacer encapsulates a regex pattern and its replacement logic
type RegexReplacer struct {
	Pattern     *regexp.Regexp
	Replacement ReplacementFunc
}

// Apply applies the regex replacement to the input string
func (r *RegexReplacer) Apply(input string) string {
	return r.Pattern.ReplaceAllStringFunc(input, func(match string) string {
		groups := r.Pattern.FindStringSubmatch(match)
		return r.Replacement(match, groups)
	})
}

// NewRegexReplacer creates a new RegexReplacer with the given pattern and replacement
func NewRegexReplacer(pattern *regexp.Regexp, replacement ReplacementFunc) *RegexReplacer {
	return &RegexReplacer{
		Pattern:     pattern,
		Replacement: replacement,
	}
}

// Common replacement functions

// RedactWithPrefix creates a replacement function that redacts with a prefix
func RedactWithPrefix(groupIndex int, suffix string) ReplacementFunc {
	return func(match string, groups []string) string {
		if len(groups) > groupIndex {
			return groups[groupIndex] + suffix
		}
		return match
	}
}

// RedactCompletely returns a replacement function that completely redacts the match
func RedactCompletely(redactedText string) ReplacementFunc {
	return func(match string, groups []string) string {
		return redactedText
	}
}

// RedactConditionally returns a replacement function that redacts based on a condition
func RedactConditionally(condition func(string) bool, redactedText string) ReplacementFunc {
	return func(match string, groups []string) string {
		if condition(match) {
			return redactedText
		}
		return match
	}
}

// RedactEmail returns a replacement function that partially redacts email addresses
func RedactEmail() ReplacementFunc {
	return func(match string, groups []string) string {
		parts := strings.Split(match, "@")
		if len(parts) == 2 {
			// Partially redact email: show first character and full domain
			if len(parts[0]) > 1 {
				return parts[0][:1] + "***@" + parts[1]
			}
			return "***@" + parts[1]
		}
		return match
	}
}

// RedactIPv6Conditionally returns a replacement function that redacts only public IPv6 addresses
func RedactIPv6Conditionally() ReplacementFunc {
	return func(match string, groups []string) string {
		// Skip local/private IPv6 addresses
		lower := strings.ToLower(match)

		// Check for local/private addresses
		if lower == "::1" || // loopback
			lower == "::" || // unspecified address
			strings.HasPrefix(lower, "::1/") || // loopback with prefix
			strings.HasPrefix(lower, "fe80:") || // link-local
			strings.HasPrefix(lower, "fc00:") || // unique local (ULA)
			strings.HasPrefix(lower, "fd") && len(lower) > 2 && (lower[2] == ':' || (lower[2] >= '0' && lower[2] <= '9') || (lower[2] >= 'a' && lower[2] <= 'f')) || // unique local (ULA) - fd00::/8
			strings.HasPrefix(lower, "ff") && len(lower) > 2 && (lower[2] == ':' || (lower[2] >= '0' && lower[2] <= '9') || (lower[2] >= 'a' && lower[2] <= 'f')) { // multicast - ff00::/8
			return match
		}
		return "[REDACTED-IPv6]"
	}
}

// ChainReplacers applies multiple regex replacers in sequence
func ChainReplacers(input string, replacers ...*RegexReplacer) string {
	result := input
	for _, replacer := range replacers {
		result = replacer.Apply(result)
	}
	return result
}

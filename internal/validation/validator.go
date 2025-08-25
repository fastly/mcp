// Package validation provides security-focused input validation for the Fastly MCP server.
// It implements defense-in-depth validation to prevent command injection, path traversal,
// and other security vulnerabilities when executing CLI commands based on AI agent input.
//
// The validator enforces:
//   - Command allowlisting to restrict available operations
//   - Shell metacharacter detection to prevent injection
//   - Path validation to prevent directory traversal
//   - Length limits to prevent buffer overflow attempts
//   - Character restrictions for safe command execution
package validation

import (
	"fmt"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
)

// Security constants define safe limits for various input types to prevent
// buffer overflows and resource exhaustion attacks.
const (
	// MaxCommandLength limits command names to prevent overly long command attempts
	MaxCommandLength = 50
	// MaxArgLength limits individual argument length to prevent injection of complex payloads
	MaxArgLength = 100
	// MaxFlagNameLength ensures flag names remain reasonable and CLI-compatible
	MaxFlagNameLength = 50
	// MaxFlagValueLength allows for longer values while preventing memory exhaustion
	MaxFlagValueLength = 500
	// MaxPathLength prevents excessively long file paths that could cause issues
	MaxPathLength = 256
)

// Validator provides comprehensive input validation for security.
// It maintains allowlists and patterns to ensure that all user input
// is safe to pass to the underlying Fastly CLI command execution.
type Validator struct {
	// allowedCommands is the allowlist of permitted Fastly commands
	allowedCommands map[string]bool
	// deniedCommands is the denylist of forbidden command-subcommand combinations
	deniedCommands map[string]bool
	// shellMetaChars contains dangerous shell metacharacters to block
	shellMetaChars []string
	// flagNameRegex validates flag name format
	flagNameRegex    *regexp.Regexp
	controlCharRegex *regexp.Regexp
}

// NewValidator creates a new input validator with predefined security rules.
// The validator is configured with:
//   - An allowlist of safe Fastly CLI commands
//   - Shell metacharacters that could enable command injection
//   - Regular expressions for validating input formats
//
// Only commands explicitly listed in allowedCommands can be executed.
func NewValidator() *Validator {
	return NewValidatorWithCommandsAndDenied(defaultAllowedCommands(), defaultDeniedCommands())
}

// NewValidatorWithCommandsAndDenied creates a validator with custom allowed and denied commands.
// The denied commands take precedence over allowed commands and represent command-subcommand
// combinations that should be blocked (e.g., "stats realtime").
func NewValidatorWithCommandsAndDenied(allowedCommands, deniedCommands map[string]bool) *Validator {
	shellMetaChars := []string{
		";", "|", "&", "&&", "||", "`", "$", "(", ")", "<", ">", ">>", "<<",
		"*", "?", "[", "]", "{", "}", "\\", "\n", "\r", "\t",
		"$(", "${", ";&", ";;&", "|&", ">&", "<&",
	}

	// Add Windows-specific shell metacharacters
	if runtime.GOOS == "windows" {
		shellMetaChars = append(shellMetaChars,
			"^", // Batch escape character
			"%", // Variable expansion
			"!", // Delayed expansion
			"~", // Variable substring
		)
	}

	return &Validator{
		allowedCommands:  allowedCommands,
		deniedCommands:   deniedCommands,
		shellMetaChars:   shellMetaChars,
		flagNameRegex:    regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9-]*$`),
		controlCharRegex: regexp.MustCompile(`[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]`),
	}
}

// validateStringLength checks if a string length is within bounds
func validateStringLength(value string, maxLength int, fieldName string) error {
	if len(value) == 0 {
		return fmt.Errorf("%s cannot be empty", fieldName)
	}
	if len(value) > maxLength {
		return fmt.Errorf("%s exceeds maximum length of %d", fieldName, maxLength)
	}
	return nil
}

// validateNoNullBytes checks if a string contains null bytes
func validateNoNullBytes(value string, fieldName string) error {
	if strings.Contains(value, "\x00") {
		return fmt.Errorf("%s contains null bytes", fieldName)
	}
	return nil
}

// validateNoShellMetaChars checks if a string contains shell metacharacters
func (v *Validator) validateNoShellMetaChars(value string, fieldName string) error {
	for _, char := range v.shellMetaChars {
		if strings.Contains(value, char) {
			return fmt.Errorf("%s contains forbidden character sequence: %s", fieldName, char)
		}
	}
	return nil
}

// defaultAllowedCommands returns the default allowlist of Fastly CLI commands
// that are considered safe for execution. This list includes service management,
// configuration, monitoring, and utility commands.
func defaultAllowedCommands() map[string]bool {
	return map[string]bool{
		// Service management
		"service":          true,
		"service-auth":     true,
		"service-version":  true,
		"backend":          true,
		"domain":           true,
		"domain-v1":        true,
		"healthcheck":      true,
		"logging":          true,
		"acl":              true,
		"acl-entry":        true,
		"vcl":              true,
		"dictionary":       true,
		"dictionary-entry": true,
		"purge":            true,

		// Edge compute
		"compute":        true,
		"object-storage": true,

		// Configuration and stores
		"config":             true,
		"config-store":       true,
		"config-store-entry": true,
		"secret-store":       true,
		"secret-store-entry": true,
		"kv-store":           true,
		"kv-store-entry":     true,

		// Authentication and users
		"user":   true,
		"whoami": true,

		// Monitoring and analytics
		"alerts":    true,
		"dashboard": true,
		"log-tail":  true,
		"stats":     true,

		// Security and networking
		"rate-limit":       true,
		"ip-list":          true,
		"tls-config":       true,
		"tls-custom":       true,
		"tls-platform":     true,
		"tls-subscription": true,

		// Resources and products
		"products":      true,
		"resource-link": true,

		// Utilities
		"version": true,
		"help":    true,
		"pops":    true,
		"tools":   true,
		"install": true,
		"update":  true,
	}
}

// defaultDeniedCommands returns the default denylist of command-subcommand combinations
// that should be blocked. This list includes commands that may be unsafe or should
// not be available through the MCP interface.
func defaultDeniedCommands() map[string]bool {
	return map[string]bool{
		"stats realtime": true,
		"log-tail":       true,

		// VCL upload/download commands - disabled by default for security
		"vcl custom create":   true,
		"vcl custom update":   true,
		"vcl custom describe": true,

		// VCL snippet commands - disabled by default for security
		"vcl snippet create":   true,
		"vcl snippet update":   true,
		"vcl snippet describe": true,
	}
}

// ValidateCommand validates a command name against the allowlist.
// It ensures the command:
//   - Is not empty
//   - Does not exceed maximum length (50 characters)
//   - Contains no null bytes
//   - Exists in the allowed commands list
//
// This is the first line of defense against arbitrary command execution.
func (v *Validator) ValidateCommand(command string) error {
	// Use common validation (no shell char check for commands)
	if err := v.ValidateInput(command, MaxCommandLength, "command", false); err != nil {
		return err
	}

	// Check allowlist
	if !v.allowedCommands[command] {
		return fmt.Errorf("command '%s' is not available", command)
	}

	return nil
}

// ValidateArgs validates command arguments for safety.
// Each argument is checked for:
//   - Maximum length (100 characters)
//   - Null bytes
//   - Shell metacharacters that could break out of argument context
//
// This prevents injection attacks through command arguments.
func (v *Validator) ValidateArgs(args []string) error {
	return v.ValidateAllInputs(args, MaxArgLength, "argument", true)
}

// ValidateFlagName validates a flag name format.
// Flag names must:
//   - Not be empty
//   - Not exceed 50 characters
//   - Match the pattern: start with alphanumeric, contain only alphanumeric and hyphens
//
// This ensures flags follow expected CLI conventions and prevents injection.
func (v *Validator) ValidateFlagName(name string) error {
	// Check length
	if err := validateStringLength(name, MaxFlagNameLength, "flag name"); err != nil {
		return err
	}

	// Check format (alphanumeric with hyphens, must start with letter)
	if !v.flagNameRegex.MatchString(name) {
		return fmt.Errorf("flag name contains invalid characters (must start with letter, contain only alphanumeric and hyphens)")
	}

	return nil
}

// ValidateFlagValue validates a flag value for safety.
// Values are checked for:
//   - Maximum length (500 characters)
//   - Null bytes
//   - Shell metacharacters
//
// Flag values often contain user data, making them a prime injection vector.
func (v *Validator) ValidateFlagValue(value string) error {
	return v.ValidateInput(value, MaxFlagValueLength, "flag value", true)
}

// ValidatePath validates a file path to prevent traversal attacks.
// It blocks:
//   - Paths exceeding 256 characters
//   - Null bytes
//   - Parent directory references (..)
//   - Shell metacharacters in paths
//   - Windows-specific: UNC paths, device names, alternate data streams
//
// This is critical for flags that accept file paths as values.
func (v *Validator) ValidatePath(path string) error {
	// Check length (empty paths are allowed)
	if len(path) > MaxPathLength {
		return fmt.Errorf("path exceeds maximum length of %d", MaxPathLength)
	}

	// Check for null bytes
	if err := validateNoNullBytes(path, "path"); err != nil {
		return err
	}

	// Prevent path traversal
	if strings.Contains(path, "..") {
		return fmt.Errorf("path traversal detected")
	}

	// Check for shell metacharacters in paths
	dangerousPathChars := []string{";", "&", "|", "`", "$", "(", ")", "{", "}", "<", ">", "\n", "\r"}
	for _, char := range dangerousPathChars {
		if strings.Contains(path, char) {
			return fmt.Errorf("path contains forbidden character: %s", char)
		}
	}

	// Windows-specific path validation
	if runtime.GOOS == "windows" {
		if err := v.validateWindowsPath(path); err != nil {
			return err
		}
	}

	return nil
}

// validateWindowsPath performs Windows-specific path security checks
func (v *Validator) validateWindowsPath(path string) error {
	// Check for backslash traversal
	if strings.Contains(path, "..\\") {
		return fmt.Errorf("path traversal detected (Windows backslash)")
	}

	// Check for UNC paths
	if strings.HasPrefix(path, "\\\\") {
		return fmt.Errorf("UNC paths are not allowed")
	}

	// Check for alternate data streams (excluding drive letters)
	if colonCount := strings.Count(path, ":"); colonCount > 1 {
		return fmt.Errorf("alternate data streams are not allowed")
	} else if colonCount == 1 {
		// Allow only drive letter at start (e.g., C:)
		if len(path) < 2 || path[1] != ':' || !isWindowsDriveLetter(rune(path[0])) {
			return fmt.Errorf("invalid use of colon in path")
		}
	}

	// Check for reserved device names
	base := filepath.Base(path)
	// Remove extension for checking
	ext := filepath.Ext(base)
	baseName := strings.ToUpper(strings.TrimSuffix(base, ext))

	reservedNames := []string{
		"CON", "PRN", "AUX", "NUL",
		"COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
		"LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
	}

	for _, reserved := range reservedNames {
		if baseName == reserved {
			return fmt.Errorf("reserved device name '%s' is not allowed", reserved)
		}
	}

	// Check for invalid Windows filename characters
	invalidChars := `<>:"|?*`
	// Skip checking ':' if it's part of drive letter
	if len(path) >= 2 && path[1] == ':' && isWindowsDriveLetter(rune(path[0])) {
		path = path[2:] // Check rest of path after drive letter
	}

	for _, char := range invalidChars {
		if strings.ContainsRune(path, char) {
			return fmt.Errorf("invalid Windows filename character: %c", char)
		}
	}

	// Check for trailing dots or spaces (Windows strips these)
	cleanedPath := filepath.Clean(path)
	if strings.HasSuffix(path, ".") || strings.HasSuffix(path, " ") {
		if path != cleanedPath {
			return fmt.Errorf("path contains trailing dots or spaces")
		}
	}

	return nil
}

// isWindowsDriveLetter checks if a rune is a valid Windows drive letter
func isWindowsDriveLetter(r rune) bool {
	return (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z')
}

// IsDenied checks if a command-args combination is in the denylist.
// It progressively builds command paths (e.g., "a", "a b", "a b c", "a b c d") and checks
// if any are explicitly denied. Returns true if the command should be blocked.
// For performance, we limit checking to a maximum depth of 4 levels (command + 3 args).
func (v *Validator) IsDenied(command string, args []string) bool {
	// Check the command alone first (level 1)
	if v.deniedCommands[command] {
		return true
	}

	// Progressively check deeper command paths (levels 2-4)
	fullCommand := command
	maxDepth := 3 // Check up to 3 arguments (total 4 levels)
	for i := 0; i < len(args) && i < maxDepth; i++ {
		fullCommand += " " + args[i]
		if v.deniedCommands[fullCommand] {
			return true
		}
	}

	return false
}

// GetDeniedCommand returns the specific command path that was denied, or empty string if not denied.
// This is useful for generating accurate error messages.
func (v *Validator) GetDeniedCommand(command string, args []string) string {
	// Check the command alone first (level 1)
	if v.deniedCommands[command] {
		return command
	}

	// Progressively check deeper command paths (levels 2-4)
	fullCommand := command
	maxDepth := 3 // Check up to 3 arguments (total 4 levels)
	for i := 0; i < len(args) && i < maxDepth; i++ {
		fullCommand += " " + args[i]
		if v.deniedCommands[fullCommand] {
			return fullCommand
		}
	}

	return ""
}

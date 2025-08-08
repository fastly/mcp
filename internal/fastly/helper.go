package fastly

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strings"

	"github.com/fastly/mcp/internal/types"
)

// ansiRegex matches ANSI escape sequences for removal
var ansiRegex = regexp.MustCompile(`\x1b\[[0-9;]*[a-zA-Z]`)

// CheckSetup verifies that the Fastly CLI is properly installed and configured.
// It performs two critical checks:
//  1. Verifies the 'fastly' executable exists in the system PATH
//  2. Tests authentication by attempting to list services (requires valid credentials)
//
// The function returns specific error messages to help diagnose setup issues:
//   - CLI not found errors direct users to installation instructions
//   - Authentication errors indicate missing or invalid API tokens
//   - Timeout errors suggest connectivity or CLI responsiveness issues
func CheckSetup() error {
	// Check if FASTLY_CLI_PATH is set
	customPath := os.Getenv("FASTLY_CLI_PATH")
	if customPath != "" {
		// Validate the custom path exists and is executable
		if _, err := os.Stat(customPath); err != nil {
			return fmt.Errorf("FASTLY_CLI_PATH is set to '%s' but file does not exist: %w", customPath, err)
		}
	} else {
		// Try to find fastly in PATH
		if _, err := exec.LookPath("fastly"); err != nil {
			currentPath := os.Getenv("PATH")
			pathDirs := strings.Split(currentPath, string(os.PathListSeparator))
			return fmt.Errorf("fastly CLI not found in PATH. Searched directories: %v. Please install it from https://developer.fastly.com/reference/cli/ or set FASTLY_CLI_PATH environment variable to the binary location", pathDirs)
		}
	}

	// Validate binary security
	if err := ValidateBinarySecurity(); err != nil {
		return fmt.Errorf("fastly CLI binary security check failed: %w", err)
	}

	// Try to run 'fastly whoami' to check both CLI availability and authentication
	// This command requires authentication to work and is faster than listing services
	result := RunFastlyCommand(CommandRunConfig{
		Command: "fastly",
		Args:    []string{"whoami"},
		Timeout: CommandTimeout,
	})

	if result.Error != nil {
		if result.TimedOut {
			return fmt.Errorf("fastly CLI timed out. The command may be stuck or unresponsive")
		}

		if strings.Contains(result.Error.Error(), "executable file not found") {
			return fmt.Errorf("fastly CLI not found. Please install it from https://developer.fastly.com/reference/cli/")
		}

		if IsAuthenticationError(result.Stdout, result.Stderr) {
			errorMsg := strings.TrimSpace(result.Stderr)
			if errorMsg == "" {
				errorMsg = "Please run 'fastly profile create' or set FASTLY_API_TOKEN"
			}
			return fmt.Errorf("not authenticated with Fastly. %s", errorMsg)
		}

		errorMsg := GetErrorMessage(result)
		return fmt.Errorf("fastly CLI error: %s", errorMsg)
	}

	// If we got here, the command succeeded and user is authenticated
	return nil
}

// CleanANSI removes ANSI escape sequences and transforms CLI output for AI consumption.
// It performs several transformations:
//   - Strips ANSI color codes and formatting sequences
//   - Converts Unicode escapes to their actual characters
//   - Replaces terminal-specific formatting with AI-friendly alternatives
//   - Transforms CLI command references to MCP tool instructions
//   - Standardizes terminology for consistency
//
// This ensures that CLI output is clean and actionable for AI agents.
func CleanANSI(text string) string {
	text = ansiRegex.ReplaceAllString(text, "")

	text = strings.ReplaceAll(text, "\u003c", "<")
	text = strings.ReplaceAll(text, "\u003e", ">")

	// Replace terminal formatting with AI-friendly markers
	text = regexp.MustCompile(`<([^>]+)>`).ReplaceAllString(text, "[$1]")
	text = strings.ReplaceAll(text, "the CLI", "this interface")

	text = strings.ReplaceAll(text, "Fastly CLI", "Fastly")
	text = strings.ReplaceAll(text, "fastly CLI", "Fastly")
	text = strings.ReplaceAll(text, "CLI version", "version")

	text = strings.ReplaceAll(text, "Run 'fastly", "Use the fastly_execute tool with")
	text = strings.ReplaceAll(text, "run 'fastly", "use the fastly_execute tool with")
	text = strings.ReplaceAll(text, "Try 'fastly", "Try using fastly_execute with")
	text = strings.ReplaceAll(text, "Use 'fastly", "Use the fastly_execute tool with")

	return text
}

// TruncateOutput truncates text output to a maximum size while preserving readability.
// It attempts to truncate at line boundaries within the last 1000 bytes to avoid
// cutting off mid-line. Returns pagination information when truncation occurs,
// including guidance on using pagination flags to access more data.
//
// The function ensures AI agents are aware when output is incomplete and provides
// actionable next steps for retrieving additional data.
func TruncateOutput(output string, maxSize int) (string, *types.PaginationInfo) {
	originalSize := len(output)
	if originalSize <= maxSize {
		return output, nil
	}

	truncateAt := maxSize
	for i := maxSize - 1; i >= maxSize-1000 && i >= 0; i-- {
		if output[i] == '\n' {
			truncateAt = i
			break
		}
	}

	truncated := output[:truncateAt]
	return truncated, &types.PaginationInfo{
		TotalSize:      originalSize,
		ReturnedSize:   len(truncated),
		Truncated:      true,
		TruncationNote: fmt.Sprintf("Output truncated. Showing first %d of %d bytes. Consider using flags like --page or --per-page to limit results.", len(truncated), originalSize),
	}
}

// TruncateJSONArray truncates JSON data to manage response sizes.
// For arrays, it limits the number of items to MaxJSONArrayItems (100).
// For other JSON structures, it checks the serialized size and returns
// an error object if the data exceeds MaxOutputSize.
//
// This prevents overwhelming AI agents with excessive data while providing
// clear feedback about truncation and how to access additional items.
func TruncateJSONArray(data interface{}) (interface{}, *types.PaginationInfo) {
	switch v := data.(type) {
	case []interface{}:
		if len(v) <= MaxJSONArrayItems {
			return data, nil
		}

		truncated := v[:MaxJSONArrayItems]
		return truncated, &types.PaginationInfo{
			TotalSize:      len(v),
			ReturnedSize:   MaxJSONArrayItems,
			Truncated:      true,
			TruncationNote: fmt.Sprintf("Array truncated. Showing first %d of %d items. Use pagination flags (--page, --per-page) to access more items.", MaxJSONArrayItems, len(v)),
		}
	default:
		jsonBytes, err := json.Marshal(data)
		if err != nil || len(jsonBytes) <= MaxOutputSize {
			return data, nil
		}

		return map[string]interface{}{
				"error": "Response too large",
				"size":  len(jsonBytes),
				"note":  "The JSON response is too large to display. Consider using more specific filters or queries.",
			}, &types.PaginationInfo{
				TotalSize:      len(jsonBytes),
				ReturnedSize:   0,
				Truncated:      true,
				TruncationNote: "JSON object too large. Consider using more specific queries or filters.",
			}
	}
}

// ToJSONArray converts a slice of strings to a JSON array string representation.
// It properly quotes each string element and formats them as a valid JSON array.
// This is used when constructing example commands and MCP tool parameters.
func ToJSONArray(items []string) string {
	// Use json.Marshal to ensure proper escaping of special characters
	data, err := json.Marshal(items)
	if err != nil {
		// Fallback to empty array on error
		return "[]"
	}
	return string(data)
}

// ShouldIncludeFlag determines if a flag should be included in help output.
// It filters out flags that are:
//   - Security sensitive (tokens, auth)
//   - Already handled by the wrapper (non-interactive)
//   - Not relevant for MCP usage (debug, verbose)
//   - Redundant with MCP features (help, quiet)
//
// This ensures AI agents only see flags they can safely and effectively use.
func ShouldIncludeFlag(flagName string) bool {
	excludedFlags := map[string]bool{
		"debug-mode":      true,
		"enable-sso":      true,
		"token":           true,
		"verbose":         true,
		"profile":         true,
		"help":            true,
		"accept-defaults": true, // Already handled by --non-interactive
		"auto-yes":        true, // Already handled by --non-interactive
		"non-interactive": true, // Automatically added by wrapper
		"quiet":           true, // Agent controls output format
	}

	return !excludedFlags[flagName]
}

// BuildCommandLine constructs the full command line string from command, args, and flags.
// It builds a properly formatted command line that can be shown to users for transparency
// and confirmation. The resulting string represents the exact command that will be executed,
// including the 'fastly' prefix, command name, arguments, and all flags with their values.
// Flags without values are rendered as --flag, while flags with values appear as --flag value.
func BuildCommandLine(command string, args []string, flags []types.Flag) string {
	parts := []string{"fastly", command}
	parts = append(parts, args...)

	for _, flag := range flags {
		if flag.Value == "" {
			parts = append(parts, "--"+flag.Name)
		} else {
			parts = append(parts, "--"+flag.Name, flag.Value)
		}
	}

	return strings.Join(parts, " ")
}

// IsDangerousOperation checks if a command is potentially dangerous or destructive.
// It examines the command string for keywords that indicate operations that:
//   - Delete or remove resources
//   - Modify existing configurations
//   - Manage authentication or secrets
//   - Could have significant side effects
//
// Returns true with a warning message if the operation is dangerous.
// This is used to enforce the --user-reviewed flag requirement for safety.
func IsDangerousOperation(command string) (bool, string) {
	dangerousPatterns := map[string]string{
		"delete":    "This operation permanently deletes resources",
		"purge":     "This operation invalidates cached content",
		"update":    "This operation modifies existing resources",
		"create":    "This operation creates new resources",
		"upload":    "This operation uploads files to the system",
		"write":     "This operation writes data",
		"remove":    "This operation removes resources",
		"destroy":   "This operation destroys resources",
		"terminate": "This operation terminates resources",
		"install":   "This operation installs software",
		"uninstall": "This operation uninstalls software",
		"auth":      "This operation manages authentication",
		"token":     "This operation manages API tokens",
		"secret":    "This operation manages secrets",
		"key":       "This operation manages keys",
		"cert":      "This operation manages certificates",
		"tls":       "This operation manages TLS/SSL settings",
	}

	lowerCommand := strings.ToLower(command)
	for pattern, warning := range dangerousPatterns {
		if strings.Contains(lowerCommand, pattern) {
			return true, warning
		}
	}

	return false, ""
}

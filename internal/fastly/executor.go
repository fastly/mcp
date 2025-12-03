// Package fastly provides the core functionality for wrapping and executing Fastly CLI commands.
// It includes command discovery, help parsing, execution with safety checks, and output formatting.
package fastly

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"

	"github.com/fastly/mcp/internal/cache"
	"github.com/fastly/mcp/internal/types"
	"github.com/fastly/mcp/internal/validation"
)

// globalSanitizeOpts controls whether output sanitization is enabled globally.
// It can be configured via SetSanitizationEnabled().
var globalSanitizeOpts = SanitizeOptions{Enabled: false}

// globalValidator is the validation instance used for command security checks.
// It can be customized via SetCustomValidator(), otherwise defaults to a standard validator.
var globalValidator *validation.Validator

// globalTokenEncryptionEnabled controls whether API tokens should be encrypted in transit.
// It can be configured via SetTokenEncryptionEnabled().
var globalTokenEncryptionEnabled = false

// SetSanitizationEnabled enables or disables output sanitization globally.
// When enabled, sensitive information like API tokens, secrets, and personal data
// will be redacted from command outputs before being returned to the caller.
func SetSanitizationEnabled(enabled bool) {
	globalSanitizeOpts.Enabled = enabled
}

// SetCustomValidator sets a custom validator instance to use for command validation.
// This allows callers to provide their own validation rules and security policies.
// If not set, a default validator with standard security rules will be used.
func SetCustomValidator(v *validation.Validator) {
	globalValidator = v
}

// SetTokenEncryptionEnabled enables or disables token encryption globally.
// When enabled, API tokens will be encrypted before transmission to enhance security.
// This setting affects how tokens are handled in command execution.
func SetTokenEncryptionEnabled(enabled bool) {
	globalTokenEncryptionEnabled = enabled
}

// GetTokenEncryptionEnabled returns the current token encryption setting.
// Returns true if token encryption is enabled, false otherwise.
func GetTokenEncryptionEnabled() bool {
	return globalTokenEncryptionEnabled
}

// GetValidator returns the current validator instance.
// Returns the custom validator if set, otherwise a new default validator.
func GetValidator() *validation.Validator {
	if globalValidator != nil {
		return globalValidator
	}
	return validation.NewValidator()
}

// convertFlagsToInterface converts []types.Flag to []interface{} for cache compatibility.
func convertFlagsToInterface(flags []types.Flag) []interface{} {
	result := make([]interface{}, len(flags))
	for i, flag := range flags {
		result[i] = flag
	}
	return result
}

// ExecuteCommand executes a Fastly command with comprehensive validation and safety checks.
// It performs the following operations:
//  1. Validates the command, arguments, and flags for security
//  2. Checks if the operation is dangerous (delete, purge, etc.)
//  3. Enforces --user-reviewed flag requirement for dangerous operations
//  4. Executes the command with timeout protection (30 seconds)
//  5. Processes output, including JSON parsing and truncation
//  6. Returns structured response with appropriate error codes and guidance
//
// The --user-reviewed flag is a special MCP-only flag that must be included for dangerous
// operations. It is stripped before passing to the actual Fastly CLI, serving as a
// confirmation mechanism to prevent accidental destructive operations by AI agents.
func ExecuteCommand(req types.CommandRequest) types.CommandResponse {
	validator := globalValidator
	if validator == nil {
		validator = validation.NewValidator()
	}

	// Split command into parts if it contains spaces
	// This supports both syntaxes:
	// 1. {"command": "service", "args": ["list"]}
	// 2. {"command": "service list"}
	commandParts := strings.Fields(req.Command)
	if len(commandParts) > 1 {
		// Extract the actual command (first part)
		req.Command = commandParts[0]
		// Prepend the remaining parts to args
		req.Args = append(commandParts[1:], req.Args...)
	}

	if err := validator.ValidateCommand(req.Command); err != nil {
		return ValidationError(req.Command, err)
	}

	if err := validator.ValidateArgs(req.Args); err != nil {
		return ArgValidationError(req.Command, req.Args, err)
	}

	for _, flag := range req.Flags {
		if err := validator.ValidateFlagName(flag.Name); err != nil {
			return FlagNameValidationError(req.Command, req.Args, req.Flags, flag.Name, err)
		}
		if err := validator.ValidateFlagValue(flag.Value); err != nil {
			return FlagValueValidationError(req.Command, req.Args, req.Flags, flag.Name, err)
		}

		// Additional path validation for file-related flags
		if isPathFlag(flag.Name) && flag.Value != "" {
			if err := validator.ValidatePath(flag.Value); err != nil {
				return PathValidationError(req.Command, req.Args, req.Flags, flag.Name, err)
			}
		}
	}

	// Check if the command-args combination is denied
	if validator.IsDenied(req.Command, req.Args) {
		deniedCommand := validator.GetDeniedCommand(req.Command, req.Args)
		return types.CommandResponse{
			Success:   false,
			Error:     fmt.Sprintf("The '%s' command is not available", deniedCommand),
			ErrorCode: "COMMAND_NOT_AVAILABLE",
		}
	}

	cmdStr := req.Command
	if len(req.Args) > 0 {
		cmdStr += " " + strings.Join(req.Args, " ")
	}

	isDangerous, warningText := IsDangerousOperation(cmdStr)

	// The --user-reviewed flag is MCP-specific and not passed to the Fastly CLI
	hasUserReviewed := false
	var filteredFlags []types.Flag
	for _, flag := range req.Flags {
		if flag.Name == "user-reviewed" {
			hasUserReviewed = true
		} else {
			filteredFlags = append(filteredFlags, flag)
		}
	}

	if isDangerous && !hasUserReviewed {
		response := UserConfirmationError(req.Command, req.Args, req.Flags)
		response.Instructions = fmt.Sprintf("⚠️ DANGEROUS OPERATION: %s\n\nThis command modifies or deletes resources and requires explicit confirmation from the human user. You must ask the human user to review and approve this command before proceeding.", warningText)
		response.NextSteps = []string{
			"Ask the human user to review this command: " + BuildCommandLine(req.Command, req.Args, filteredFlags),
			"Wait for the human user to explicitly confirm they want to proceed",
			"Only after receiving human confirmation, retry with {\"name\":\"user-reviewed\"} in the flags array",
			"Do NOT proceed without explicit human approval",
		}
		response.Metadata = GetOperationMetadata(req.Command, req.Args)
		return response
	}

	args := []string{req.Command}
	args = append(args, req.Args...)

	for _, flag := range filteredFlags {
		if flag.Value == "" {
			args = append(args, "--"+flag.Name)
		} else {
			args = append(args, "--"+flag.Name, flag.Value)
		}
	}

	args = append(args, "--non-interactive")

	fullCmdLine := "fastly " + strings.Join(args, " ")

	// Validate binary security before execution
	if err := ValidateBinarySecurity(); err != nil {
		return BinarySecurityValidationError(req.Command, req.Args, filteredFlags, err)
	}

	// Execute the command using the shared runner
	result := RunFastlyCommand(CommandRunConfig{
		Command: "fastly",
		Args:    args,
		Timeout: CommandTimeout,
	})

	cleanedOutput := CleanANSI(result.Stdout)

	// Apply sanitization if enabled
	if globalSanitizeOpts.Enabled {
		cleanedOutput = SanitizeOutput(cleanedOutput, globalSanitizeOpts)
	}

	response := types.CommandResponse{
		Command:     cmdStr,
		CommandLine: fullCmdLine,
		Metadata:    GetOperationMetadata(req.Command, req.Args),
	}

	if result.Error != nil {
		response.Success = false

		if result.TimedOut {
			// For timeout errors, include any partial output that was captured
			timeoutResp := TimeoutError(req.Command, req.Args, filteredFlags)
			if result.Stdout != "" || result.Stderr != "" {
				partialOutput := ""
				if result.Stdout != "" {
					partialOutput = "Partial stdout:\n" + CleanANSI(result.Stdout)
				}
				if result.Stderr != "" {
					if partialOutput != "" {
						partialOutput += "\n\n"
					}
					partialOutput += "Partial stderr:\n" + CleanANSI(result.Stderr)
				}
				// Apply sanitization if enabled
				if globalSanitizeOpts.Enabled {
					partialOutput = SanitizeOutput(partialOutput, globalSanitizeOpts)
				}
				timeoutResp.Output = partialOutput
				timeoutResp.Instructions = "The command timed out after 30 seconds. Partial output is included above."
			}
			return timeoutResp
		} else {
			// Build comprehensive error message including all available information
			errorParts := []string{}

			// Include stderr if available
			if result.Stderr != "" {
				cleanedStderr := CleanANSI(result.Stderr)
				if globalSanitizeOpts.Enabled {
					cleanedStderr = SanitizeOutput(cleanedStderr, globalSanitizeOpts)
				}
				errorParts = append(errorParts, cleanedStderr)
			}

			// Include stdout if it contains error information
			if result.Stdout != "" {
				cleanedStdout := CleanANSI(result.Stdout)
				if globalSanitizeOpts.Enabled {
					cleanedStdout = SanitizeOutput(cleanedStdout, globalSanitizeOpts)
				}
				// Only include stdout if it's different from stderr and potentially contains error info
				if cleanedStdout != "" && (len(errorParts) == 0 || cleanedStdout != errorParts[0]) {
					errorParts = append(errorParts, "Command output: "+cleanedStdout)
				}
			}

			// Include the underlying error if no other information is available
			if len(errorParts) == 0 && result.Error != nil {
				if exitErr, ok := result.Error.(*exec.ExitError); ok {
					errorParts = append(errorParts, fmt.Sprintf("Command failed with exit code %d", exitErr.ExitCode()))
				} else {
					errorParts = append(errorParts, result.Error.Error())
				}
			}

			// Combine all error parts
			if len(errorParts) > 0 {
				response.Error = strings.Join(errorParts, "\n")
			} else {
				response.Error = "Command failed with no error output"
			}

			response.ErrorCode = DetectErrorCode(response.Error)

			// Provide more specific instructions based on error type
			switch response.ErrorCode {
			case "binary_not_found":
				response.Instructions = "CRITICAL: The Fastly CLI binary could not be found. This is a system configuration issue that must be resolved before any fastly commands can be executed."
				response.NextSteps = []string{
					"Install the Fastly CLI from https://www.fastly.com/documentation/reference/cli/",
					"Ensure the fastly binary is in your PATH",
					"Or set FASTLY_CLI_PATH to the location of the fastly binary",
					"Verify installation with: which fastly",
				}
			case "binary_not_executable":
				response.Instructions = "CRITICAL: The Fastly CLI binary exists but cannot be executed due to permission issues."
				response.NextSteps = []string{
					"Check the file permissions with: ls -la $(which fastly)",
					"Make the binary executable with: chmod +x /path/to/fastly",
					"Verify you have read and execute permissions on the binary",
					"Contact system administrator if unable to fix permissions",
				}
			case "system_execution_error":
				response.Instructions = "CRITICAL: System-level error occurred while trying to execute the Fastly CLI."
				response.NextSteps = []string{
					"Check the specific error message for details",
					"Verify the fastly binary is not corrupted",
					"Check system resources (disk space, memory)",
					"Try reinstalling the Fastly CLI",
				}
			case "binary_security_error":
				response.Instructions = "CRITICAL: Binary security validation failed. The fastly CLI cannot be executed due to security issues."
				response.NextSteps = []string{
					"Check the error message for specific security issue",
					"Follow the provided fix command (e.g., chmod o-w /path/to/binary)",
					"Verify the binary is in a secure location",
					"Contact system administrator if unable to fix permissions",
				}
			case "auth_required":
				response.Instructions = "Authentication failed. Please set up authentication using 'fastly profile create'."
				response.NextSteps = []string{
					"Run 'fastly profile create' to set up authentication",
					"Get your API token from https://manage.fastly.com/account/personal/tokens",
					"Check that the token has the necessary permissions for this operation",
					"Note: FASTLY_API_TOKEN environment variable is not recommended for MCP clients",
				}
			case "not_found":
				response.Instructions = "The requested resource was not found."
				response.NextSteps = []string{
					"Verify the resource ID or name is correct",
					"Use fastly_execute with 'list' commands to see available resources",
					"Check that you have access to the resource",
				}
			default:
				response.Instructions = "The command failed. Check the error message above for details."
				response.NextSteps = []string{
					"Review the full error message for specific issues",
					"Verify all required flags are provided with valid values",
					"Check that flag values are properly formatted",
					"Use the fastly_describe tool to see the correct command syntax",
				}
			}
		}
	} else {
		response.Success = true

		// Check if output should be cached (>25KB by default, configurable)
		if cache.ShouldCache(cleanedOutput) {
			// Store the output in cache
			store := cache.GetStore()
			resultID := store.Store(cleanedOutput, req.Command, req.Args, req.Flags)

			// Create a cached response with preview
			cachedResp := cache.CreateCachedResponse(resultID, cleanedOutput, req.Command, req.Args, convertFlagsToInterface(req.Flags))

			// Convert to CommandResponse format
			response.Success = cachedResp.Success
			response.ResultID = cachedResp.ResultID
			response.Cached = cachedResp.Cached
			response.CacheMetadata = &types.CacheMetadata{
				ResultID:   cachedResp.ResultID,
				TotalSize:  cachedResp.Metadata.TotalSize,
				DataType:   cachedResp.Metadata.DataType,
				TotalItems: cachedResp.Metadata.TotalItems,
				TotalLines: cachedResp.Metadata.TotalLines,
			}
			response.Preview = cachedResp.Preview
			response.Instructions = cachedResp.Instructions
			response.NextSteps = cachedResp.NextSteps
		} else {
			// Normal processing for small outputs
			trimmedOutput := strings.TrimSpace(cleanedOutput)
			if trimmedOutput != "" && json.Valid([]byte(trimmedOutput)) {
				var jsonData interface{}
				if err := json.Unmarshal([]byte(trimmedOutput), &jsonData); err == nil {
					// Apply sanitization to JSON data if enabled
					if globalSanitizeOpts.Enabled {
						jsonData = SanitizeJSON(jsonData, globalSanitizeOpts)
					}
					truncatedJSON, paginationInfo := TruncateJSONArray(jsonData)
					response.OutputJSON = truncatedJSON
					response.Pagination = paginationInfo

					if paginationInfo != nil {
						response.Instructions = "Command executed successfully. The JSON output has been truncated due to size."
					} else {
						response.Instructions = "Command executed successfully. The output has been parsed as JSON."
					}
				} else {
					truncatedOutput, paginationInfo := TruncateOutput(cleanedOutput, MaxOutputSize)
					response.Output = truncatedOutput
					response.Pagination = paginationInfo

					if paginationInfo != nil {
						response.Instructions = "Command executed successfully. The output has been truncated due to size."
					} else {
						response.Instructions = "Command executed successfully. The output contains the result."
					}
				}
			} else {
				truncatedOutput, paginationInfo := TruncateOutput(cleanedOutput, MaxOutputSize)
				response.Output = truncatedOutput
				response.Pagination = paginationInfo

				if paginationInfo != nil {
					response.Instructions = "Command executed successfully. The output has been truncated due to size."
				} else {
					response.Instructions = "Command executed successfully. The output contains the result."
				}
			}
		}

		hasJSONOutput := response.OutputJSON != nil
		isPaginated := response.Pagination != nil && response.Pagination.Truncated

		if strings.Contains(req.Command, "list") {
			if hasJSONOutput {
				response.NextSteps = []string{
					"Access the parsed JSON data in 'output_json' field",
					"Iterate through the array/object as needed",
					"Use the fastly_describe tool on specific items for more details",
				}
			} else {
				response.NextSteps = []string{
					"Parse the text output to extract specific information",
					"Check if the command supports a flag to enable JSON output",
					"Use the fastly_describe tool on specific items for more details",
				}
			}

			if isPaginated {
				paginationSteps := []string{
					"Output was truncated. Check 'pagination' field for details",
					"Use --page and --per-page flags to control output size",
					"Call fastly_execute with flags: [{\"name\":\"per-page\",\"value\":\"20\"},{\"name\":\"page\",\"value\":\"2\"}]",
				}
				response.NextSteps = append(paginationSteps, response.NextSteps...)
			}
		} else if strings.Contains(req.Command, "create") {
			response.NextSteps = []string{
				"Save any returned IDs for future operations",
				"Use fastly_execute with 'list' commands to verify the resource was created",
				"Use the fastly_describe tool with the resource ID to see full details",
			}
		} else {
			response.NextSteps = []string{
				"Check the output for the operation result",
				"Use fastly_execute with 'list' commands to see current state",
				"Use the fastly_describe tool for more detailed information",
			}

			if isPaginated {
				response.NextSteps = append([]string{
					"Output was truncated. Check 'pagination' field for details",
				}, response.NextSteps...)
			}
		}

		// Add time-related hints for time-sensitive commands
		switch req.Command {
		case "stats", "log-tail", "logging":
			response.NextSteps = append([]string{
				"Tip: Use current_time tool to get timestamps for filtering results by time range",
			}, response.NextSteps...)
		case "purge":
			response.NextSteps = append([]string{
				"Tip: Use current_time tool to record when this purge was initiated",
			}, response.NextSteps...)
		}
	}

	return response
}

// isPathFlag determines if a flag name represents a file path parameter.
// These flags receive additional validation to prevent path traversal attacks.
// The function checks against a predefined list of common path-related flag names.
func isPathFlag(flagName string) bool {
	pathFlags := map[string]bool{
		"file":        true,
		"path":        true,
		"config":      true,
		"config-file": true,
		"output":      true,
		"input":       true,
		"cert":        true,
		"key":         true,
		"ca-cert":     true,
		"manifest":    true,
		"package":     true,
		"dir":         true,
		"directory":   true,
		"from":        true,
		"to":          true,
	}
	return pathFlags[flagName]
}

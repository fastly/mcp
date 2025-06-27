// Package fastly provides the core functionality for wrapping and executing Fastly CLI commands.
// It includes command discovery, help parsing, execution with safety checks, and output formatting.
package fastly

import (
	"encoding/json"
	"fmt"
	"strings"

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
			return TimeoutError(req.Command, req.Args, filteredFlags)
		} else {
			response.Error = CleanANSI(result.Stderr)
			// Apply sanitization to error messages if enabled
			if globalSanitizeOpts.Enabled {
				response.Error = SanitizeOutput(response.Error, globalSanitizeOpts)
			}
			if response.Error == "" {
				response.Error = result.Error.Error()
			}

			response.ErrorCode = DetectErrorCode(response.Error)

			response.Instructions = "The command failed. Check the error message for details."
			response.NextSteps = []string{
				"Verify all required flags are provided with valid values",
				"Check that flag values are properly formatted",
				"Use the fastly_describe tool to see the correct command syntax",
			}
		}
	} else {
		response.Success = true

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
					"Consider using --json flag for structured output",
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

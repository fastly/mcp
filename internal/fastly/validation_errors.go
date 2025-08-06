package fastly

import (
	"fmt"

	"github.com/fastly/mcp/internal/types"
)

// ArgValidationError creates a validation error response for invalid arguments
func ArgValidationError(command string, args []string, err error) types.CommandResponse {
	return NewResponseBuilder().
		WithCommand(command, args, nil).
		WithError(err, "validation_error").
		WithInstructions("The arguments are not available.", []string{
			"Check arguments for forbidden characters or patterns",
			"Ensure arguments don't contain shell metacharacters",
			"Remove any special characters like ;, |, &, $, etc.",
		}).
		Build()
}

// FlagNameValidationError creates a validation error response for invalid flag names
func FlagNameValidationError(command string, args []string, flags []types.Flag, flagName string, err error) types.CommandResponse {
	return NewResponseBuilder().
		WithCommand(command, args, flags).
		WithError(fmt.Errorf("flag '%s': %s", flagName, err.Error()), "validation_error").
		WithInstructions("The flag name is not available.", []string{
			"Flag names must contain only alphanumeric characters and hyphens",
			"Flag names must start with a letter or number",
			"Check the flag name format",
		}).
		Build()
}

// FlagValueValidationError creates a validation error response for invalid flag values
func FlagValueValidationError(command string, args []string, flags []types.Flag, flagName string, err error) types.CommandResponse {
	return NewResponseBuilder().
		WithCommand(command, args, flags).
		WithError(fmt.Errorf("flag '%s' value: %s", flagName, err.Error()), "validation_error").
		WithInstructions("The flag value is not available.", []string{
			"Check flag values for forbidden characters or patterns",
			"Ensure values don't contain shell metacharacters",
			"Remove any special characters like ;, |, &, $, etc.",
		}).
		Build()
}

// PathValidationError creates a validation error response for invalid file paths
func PathValidationError(command string, args []string, flags []types.Flag, flagName string, err error) types.CommandResponse {
	return NewResponseBuilder().
		WithCommand(command, args, flags).
		WithError(fmt.Errorf("flag '%s' path: %s", flagName, err.Error()), "validation_error").
		WithInstructions("The file path is not available.", []string{
			"Ensure the path doesn't contain '..' sequences",
			"Use absolute or relative paths without traversal",
			"Remove any special characters from the path",
		}).
		Build()
}

// BinarySecurityValidationError creates a validation error response for binary security failures
func BinarySecurityValidationError(command string, args []string, flags []types.Flag, err error) types.CommandResponse {
	// Extract specific remediation steps from the error message
	nextSteps := []string{
		"Check the fastly binary permissions (should not be world-writable)",
		"Verify the binary is in a trusted location (not /tmp or similar)",
		"Ensure the binary's parent directory is not world-writable",
	}

	// If the error is a BinarySecurityError, extract more specific information
	if binaryErr, ok := err.(*BinarySecurityError); ok {
		// The Details field already contains the fix command
		nextSteps = []string{
			fmt.Sprintf("Issue: %s", binaryErr.Issue),
			fmt.Sprintf("Location: %s", binaryErr.Path),
			binaryErr.Details,
		}
	}

	return NewResponseBuilder().
		WithCommand(command, args, flags).
		WithError(err, "binary_security_error").
		WithInstructions("The fastly binary failed security validation. This is a critical security issue that prevents execution.", nextSteps).
		Build()
}

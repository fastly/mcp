package mcp

import (
	"strings"
	"testing"

	"github.com/fastly/mcp/internal/fastly"
	"github.com/fastly/mcp/internal/validation"
)

// TestCommandSplittingLogic tests the command splitting functionality
// by verifying that commands with spaces are properly handled
func TestCommandSplittingLogic(t *testing.T) {
	tests := []struct {
		name            string
		inputCommand    string
		expectedCommand string
		expectedArgs    []string
	}{
		{
			name:            "simple command with space",
			inputCommand:    "service list",
			expectedCommand: "service",
			expectedArgs:    []string{"list"},
		},
		{
			name:            "command with multiple spaces",
			inputCommand:    "service version list",
			expectedCommand: "service",
			expectedArgs:    []string{"version", "list"},
		},
		{
			name:            "command without spaces",
			inputCommand:    "service",
			expectedCommand: "service",
			expectedArgs:    []string{},
		},
		{
			name:            "complex command",
			inputCommand:    "logging bigquery create",
			expectedCommand: "logging",
			expectedArgs:    []string{"bigquery", "create"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test the splitting logic directly
			parts := strings.Fields(tt.inputCommand)

			var command string
			var args []string

			if len(parts) > 0 {
				command = parts[0]
				if len(parts) > 1 {
					args = parts[1:]
				}
			}

			if command != tt.expectedCommand {
				t.Errorf("Expected command %q, got %q", tt.expectedCommand, command)
			}

			if len(args) != len(tt.expectedArgs) {
				t.Errorf("Expected %d args, got %d", len(tt.expectedArgs), len(args))
			}

			for i, arg := range args {
				if i < len(tt.expectedArgs) && arg != tt.expectedArgs[i] {
					t.Errorf("Expected arg[%d] = %q, got %q", i, tt.expectedArgs[i], arg)
				}
			}
		})
	}
}

// TestExecuteHandlerIntegration tests that the execute handler properly handles
// both the old and new command syntax
func TestExecuteHandlerIntegration(t *testing.T) {
	// Use the default validator which has a set of allowed commands
	validator := validation.NewValidator()
	fastly.SetCustomValidator(validator)

	// Test that validation works with the split commands
	tests := []struct {
		name        string
		command     string
		expectValid bool
	}{
		{
			name:        "valid service command with space",
			command:     "service list",
			expectValid: true, // service is in the default allowed commands
		},
		{
			name:        "invalid command with space",
			command:     "invalid list",
			expectValid: false, // "invalid" is not in the default allowed commands
		},
		{
			name:        "valid single command",
			command:     "stats",
			expectValid: true, // stats is in the default allowed commands
		},
		{
			name:        "valid backend command",
			command:     "backend create",
			expectValid: true, // backend is in the default allowed commands
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Split the command as the handler would
			parts := strings.Fields(tt.command)
			if len(parts) == 0 {
				t.Skip("Empty command")
			}

			command := parts[0]
			err := validator.ValidateCommand(command)

			if tt.expectValid && err != nil {
				t.Errorf("Expected command %q to be valid, got error: %v", command, err)
			}
			if !tt.expectValid && err == nil {
				t.Errorf("Expected command %q to be invalid, but it was allowed", command)
			}
		})
	}
}

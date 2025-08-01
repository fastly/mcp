package fastly

import (
	"errors"
	"fmt"
	"reflect"
	"testing"

	"github.com/fastly/mcp/internal/types"
)

func TestResponseBuilder(t *testing.T) {
	t.Run("NewResponseBuilder creates builder with success true by default", func(t *testing.T) {
		builder := NewResponseBuilder()
		response := builder.Build()

		if !response.Success {
			t.Errorf("Expected success to be true by default, got false")
		}
	})

	t.Run("WithCommand sets command details correctly", func(t *testing.T) {
		command := "service list"
		args := []string{"--verbose"}
		flags := []types.Flag{
			{Name: "json", Value: "true"},
			{Name: "filter", Value: "active"},
		}

		response := NewResponseBuilder().
			WithCommand(command, args, flags).
			Build()

		if response.Command != command {
			t.Errorf("Expected command %q, got %q", command, response.Command)
		}

		expectedCommandLine := "fastly service list --verbose --json true --filter active"
		if response.CommandLine != expectedCommandLine {
			t.Errorf("Expected command line %q, got %q", expectedCommandLine, response.CommandLine)
		}
	})

	t.Run("WithSuccess sets success status and output", func(t *testing.T) {
		output := "Command executed successfully"
		response := NewResponseBuilder().
			WithSuccess(output).
			Build()

		if !response.Success {
			t.Errorf("Expected success to be true")
		}
		if response.Output != output {
			t.Errorf("Expected output %q, got %q", output, response.Output)
		}
	})

	t.Run("WithError sets error details correctly", func(t *testing.T) {
		err := errors.New("command failed")
		errorCode := "execution_error"

		response := NewResponseBuilder().
			WithError(err, errorCode).
			Build()

		if response.Success {
			t.Errorf("Expected success to be false")
		}
		if response.Error != err.Error() {
			t.Errorf("Expected error %q, got %q", err.Error(), response.Error)
		}
		if response.ErrorCode != errorCode {
			t.Errorf("Expected error code %q, got %q", errorCode, response.ErrorCode)
		}
	})

	t.Run("WithInstructions sets instructions and next steps", func(t *testing.T) {
		instructions := "Follow these steps to resolve the issue"
		nextSteps := []string{
			"Check your authentication",
			"Verify network connectivity",
			"Retry the command",
		}

		response := NewResponseBuilder().
			WithInstructions(instructions, nextSteps).
			Build()

		if response.Instructions != instructions {
			t.Errorf("Expected instructions %q, got %q", instructions, response.Instructions)
		}
		if !reflect.DeepEqual(response.NextSteps, nextSteps) {
			t.Errorf("Expected next steps %v, got %v", nextSteps, response.NextSteps)
		}
	})

	t.Run("WithMetadata sets metadata correctly", func(t *testing.T) {
		metadata := &types.OperationMetadata{
			ResourceType:  "service",
			OperationType: "update",
			IsSafe:        false,
			RequiresAuth:  true,
		}

		response := NewResponseBuilder().
			WithMetadata(metadata).
			Build()

		if response.Metadata == nil {
			t.Fatal("Expected metadata to be set")
		}
		if response.Metadata.ResourceType != metadata.ResourceType {
			t.Errorf("Expected resource type %q, got %q", metadata.ResourceType, response.Metadata.ResourceType)
		}
		if response.Metadata.OperationType != metadata.OperationType {
			t.Errorf("Expected operation type %q, got %q", metadata.OperationType, response.Metadata.OperationType)
		}
		if response.Metadata.IsSafe != metadata.IsSafe {
			t.Errorf("Expected IsSafe %v, got %v", metadata.IsSafe, response.Metadata.IsSafe)
		}
		if response.Metadata.RequiresAuth != metadata.RequiresAuth {
			t.Errorf("Expected RequiresAuth %v, got %v", metadata.RequiresAuth, response.Metadata.RequiresAuth)
		}
	})

	t.Run("Builder methods can be chained", func(t *testing.T) {
		command := "service create"
		args := []string{"my-service"}
		flags := []types.Flag{{Name: "type", Value: "vcl"}}
		output := "Service created successfully"
		instructions := "Service has been created"
		nextSteps := []string{"Add backends", "Configure domains"}
		metadata := &types.OperationMetadata{
			ResourceType:  "service",
			OperationType: "create",
			IsSafe:        false,
			RequiresAuth:  true,
		}

		response := NewResponseBuilder().
			WithCommand(command, args, flags).
			WithSuccess(output).
			WithInstructions(instructions, nextSteps).
			WithMetadata(metadata).
			Build()

		// Verify all fields are set correctly
		if response.Command != command {
			t.Errorf("Expected command %q, got %q", command, response.Command)
		}
		if !response.Success {
			t.Errorf("Expected success to be true")
		}
		if response.Output != output {
			t.Errorf("Expected output %q, got %q", output, response.Output)
		}
		if response.Instructions != instructions {
			t.Errorf("Expected instructions %q, got %q", instructions, response.Instructions)
		}
		if !reflect.DeepEqual(response.NextSteps, nextSteps) {
			t.Errorf("Expected next steps %v, got %v", nextSteps, response.NextSteps)
		}
		if response.Metadata.ResourceType != metadata.ResourceType {
			t.Errorf("Expected metadata resource type %q, got %q", metadata.ResourceType, response.Metadata.ResourceType)
		}
		if response.Metadata.OperationType != metadata.OperationType {
			t.Errorf("Expected metadata operation type %q, got %q", metadata.OperationType, response.Metadata.OperationType)
		}
	})
}

func TestValidationError(t *testing.T) {
	command := "service delete"
	err := errors.New("command not in allowed list")

	response := ValidationError(command, err)

	if response.Success {
		t.Errorf("Expected success to be false")
	}
	if response.Command != command {
		t.Errorf("Expected command %q, got %q", command, response.Command)
	}
	if response.Error != err.Error() {
		t.Errorf("Expected error %q, got %q", err.Error(), response.Error)
	}
	if response.ErrorCode != "validation_error" {
		t.Errorf("Expected error code 'validation_error', got %q", response.ErrorCode)
	}
	if response.Instructions == "" {
		t.Errorf("Expected instructions to be set")
	}
	if len(response.NextSteps) == 0 {
		t.Errorf("Expected next steps to be provided")
	}
}

func TestSetupError(t *testing.T) {
	command := "service list"
	err := errors.New("Fastly CLI not found in PATH")

	response := SetupError(command, err)

	if response.Success {
		t.Errorf("Expected success to be false")
	}
	if response.Command != command {
		t.Errorf("Expected command %q, got %q", command, response.Command)
	}
	if response.Error != err.Error() {
		t.Errorf("Expected error %q, got %q", err.Error(), response.Error)
	}
	if response.ErrorCode != "setup_error" {
		t.Errorf("Expected error code 'setup_error', got %q", response.ErrorCode)
	}
	if response.Instructions == "" {
		t.Errorf("Expected instructions to be set")
	}

	// Verify setup-specific next steps
	hasSetupStep := false
	for _, step := range response.NextSteps {
		if step == "Run 'fastly_describe setup' for setup instructions" {
			hasSetupStep = true
			break
		}
	}
	if !hasSetupStep {
		t.Errorf("Expected setup instructions in next steps")
	}
}

func TestUserConfirmationError(t *testing.T) {
	command := "service delete"
	args := []string{"my-service-id"}
	flags := []types.Flag{{Name: "force", Value: "true"}}

	response := UserConfirmationError(command, args, flags)

	if response.Success {
		t.Errorf("Expected success to be false")
	}
	if response.Command != command {
		t.Errorf("Expected command %q, got %q", command, response.Command)
	}
	if response.ErrorCode != "user_confirmation_required" {
		t.Errorf("Expected error code 'user_confirmation_required', got %q", response.ErrorCode)
	}

	// Check that command line includes all elements
	expectedParts := []string{"service delete", "my-service-id", "--force true"}
	for _, part := range expectedParts {
		if !containsSubstring(response.CommandLine, part) {
			t.Errorf("Expected command line to contain %q, got %q", part, response.CommandLine)
		}
	}

	// Verify user-reviewed flag instruction
	hasUserReviewedStep := false
	for _, step := range response.NextSteps {
		if containsSubstring(step, "--user-reviewed") {
			hasUserReviewedStep = true
			break
		}
	}
	if !hasUserReviewedStep {
		t.Errorf("Expected --user-reviewed flag instruction in next steps")
	}
}

func TestTimeoutError(t *testing.T) {
	command := "logging list"
	args := []string{"--service-id", "test-service"}
	flags := []types.Flag{{Name: "verbose", Value: "true"}}

	response := TimeoutError(command, args, flags)

	if response.Success {
		t.Errorf("Expected success to be false")
	}
	if response.Command != command {
		t.Errorf("Expected command %q, got %q", command, response.Command)
	}
	if response.ErrorCode != "timeout" {
		t.Errorf("Expected error code 'timeout', got %q", response.ErrorCode)
	}
	if !containsSubstring(response.Error, "30 seconds") {
		t.Errorf("Expected error to mention 30 seconds timeout")
	}

	// Verify timeout-specific next steps
	hasNetworkStep := false
	for _, step := range response.NextSteps {
		if containsSubstring(step, "network connection") {
			hasNetworkStep = true
			break
		}
	}
	if !hasNetworkStep {
		t.Errorf("Expected network troubleshooting in next steps")
	}
}

// Regression tests for edge cases
func TestResponseBuilderEdgeCases(t *testing.T) {
	t.Run("Empty command with nil args and flags", func(t *testing.T) {
		response := NewResponseBuilder().
			WithCommand("", nil, nil).
			Build()

		if response.Command != "" {
			t.Errorf("Expected empty command, got %q", response.Command)
		}
		if response.CommandLine != "fastly " {
			t.Errorf("Expected command line %q, got %q", "fastly ", response.CommandLine)
		}
	})

	t.Run("WithError overwrites success status", func(t *testing.T) {
		response := NewResponseBuilder().
			WithSuccess("This should be overwritten").
			WithError(errors.New("error occurred"), "test_error").
			Build()

		if response.Success {
			t.Errorf("Expected success to be false after WithError")
		}
		if response.Output != "This should be overwritten" {
			t.Errorf("Expected output to be preserved, got %q", response.Output)
		}
	})

	t.Run("WithSuccess after WithError resets success status", func(t *testing.T) {
		response := NewResponseBuilder().
			WithError(errors.New("error"), "error_code").
			WithSuccess("Success after error").
			Build()

		if !response.Success {
			t.Errorf("Expected success to be true after WithSuccess")
		}
		// Error fields should still be set
		if response.Error == "" {
			t.Errorf("Expected error to be preserved")
		}
	})

	t.Run("Nil metadata handling", func(t *testing.T) {
		response := NewResponseBuilder().
			WithMetadata(nil).
			Build()

		if response.Metadata != nil {
			t.Errorf("Expected nil metadata to remain nil")
		}
	})

	t.Run("Empty instructions with nil next steps", func(t *testing.T) {
		response := NewResponseBuilder().
			WithInstructions("", nil).
			Build()

		if response.Instructions != "" {
			t.Errorf("Expected empty instructions to remain empty")
		}
		if response.NextSteps != nil {
			t.Errorf("Expected nil next steps to remain nil")
		}
	})

	t.Run("Special characters in error messages", func(t *testing.T) {
		specialErr := errors.New("Error with 'quotes' and \"double quotes\" and \n newlines")
		response := NewResponseBuilder().
			WithError(specialErr, "special_error").
			Build()

		if response.Error != specialErr.Error() {
			t.Errorf("Expected error to preserve special characters")
		}
	})

	t.Run("Very long output strings", func(t *testing.T) {
		longOutput := ""
		for i := 0; i < 1000; i++ {
			longOutput += fmt.Sprintf("Line %d: This is a very long output string that tests the builder's handling of large data. ", i)
		}

		response := NewResponseBuilder().
			WithSuccess(longOutput).
			Build()

		if response.Output != longOutput {
			t.Errorf("Expected long output to be preserved completely")
		}
	})
}

// Helper function
func containsSubstring(s, substr string) bool {
	return len(substr) > 0 && len(s) >= len(substr) && (s == substr ||
		(len(s) > len(substr) && (s[:len(substr)] == substr ||
			s[len(s)-len(substr):] == substr ||
			findSubstring(s, substr) != -1)))
}

func findSubstring(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}

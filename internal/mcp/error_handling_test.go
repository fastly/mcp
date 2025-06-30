package mcp

import (
	"testing"

	"github.com/fastly/mcp/internal/types"
	"github.com/mark3labs/mcp-go/mcp"
)

func TestErrorHandling(t *testing.T) {
	tests := []struct {
		name          string
		response      interface{}
		expectIsError bool
	}{
		{
			name: "success response",
			response: types.CommandResponse{
				Success: true,
				Output:  "Service created successfully",
			},
			expectIsError: false,
		},
		{
			name: "error response",
			response: types.CommandResponse{
				Success:   false,
				Error:     "Authentication failed",
				ErrorCode: "auth_error",
			},
			expectIsError: true,
		},
		{
			name: "validation error",
			response: types.CommandResponse{
				Success:      false,
				Error:        "Invalid command",
				ErrorCode:    "validation_error",
				Instructions: "The command failed validation",
				NextSteps:    []string{"Check the command syntax"},
			},
			expectIsError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var result *mcp.CallToolResult

			// Test based on Success field for CommandResponse
			if resp, ok := tt.response.(types.CommandResponse); ok {
				if resp.Success {
					result = newSuccessResult(tt.response)
				} else {
					result = newErrorResult(tt.response)
				}
			}

			if result.IsError != tt.expectIsError {
				t.Errorf("Expected IsError=%v, got %v", tt.expectIsError, result.IsError)
			}

			// Verify content is still present
			if len(result.Content) == 0 {
				t.Error("Expected content in result")
			}
		})
	}
}

func TestSetupErrorHandling(t *testing.T) {
	// Test that handleSetupError sets IsError to true
	err := &testError{msg: "Fastly CLI not found"}
	result := handleSetupError(err, "service list")

	if !result.IsError {
		t.Error("Expected IsError=true for setup error")
	}

	// Verify content exists
	if len(result.Content) == 0 {
		t.Error("Expected content in setup error result")
	}
}

type testError struct {
	msg string
}

func (e *testError) Error() string {
	return e.msg
}

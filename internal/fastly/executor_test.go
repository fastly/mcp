package fastly

import (
	"strings"
	"testing"

	"github.com/fastly/mcp/internal/types"
)

func TestExecuteCommandWithUserReview(t *testing.T) {
	tests := []struct {
		name          string
		req           types.CommandRequest
		expectSuccess bool
		expectError   string
		expectCode    string
	}{
		{
			name: "dangerous command without user-reviewed flag",
			req: types.CommandRequest{
				Command: "service",
				Args:    []string{"delete"},
				Flags:   []types.Flag{},
			},
			expectSuccess: false,
			expectError:   "this is a dangerous operation that requires explicit human user confirmation",
			expectCode:    "user_confirmation_required",
		},
		{
			name: "dangerous command with user-reviewed flag",
			req: types.CommandRequest{
				Command: "service",
				Args:    []string{"delete"},
				Flags: []types.Flag{
					{Name: "user-reviewed"},
					{Name: "service-id", Value: "test123"},
				},
			},
			expectSuccess: false, // Will fail because service doesn't exist, but won't be blocked
			expectError:   "",    // Error will be from CLI, not our safety check
			expectCode:    "",    // Error code will be from CLI
		},
		{
			name: "safe command without user-reviewed flag",
			req: types.CommandRequest{
				Command: "service",
				Args:    []string{"list"},
				Flags:   []types.Flag{},
			},
			expectSuccess: true, // Assuming CLI is available
			expectError:   "",
			expectCode:    "",
		},
		{
			name: "create command without user-reviewed",
			req: types.CommandRequest{
				Command: "backend",
				Args:    []string{"create"},
				Flags: []types.Flag{
					{Name: "name", Value: "test-backend"},
				},
			},
			expectSuccess: false,
			expectError:   "this is a dangerous operation that requires explicit human user confirmation",
			expectCode:    "user_confirmation_required",
		},
		{
			name: "purge command without user-reviewed",
			req: types.CommandRequest{
				Command: "purge",
				Args:    []string{},
				Flags: []types.Flag{
					{Name: "all"},
				},
			},
			expectSuccess: false,
			expectError:   "this is a dangerous operation that requires explicit human user confirmation",
			expectCode:    "user_confirmation_required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Skip tests that require actual CLI execution if not available
			if err := CheckSetup(); err != nil && (tt.expectSuccess || tt.expectError == "") {
				t.Skip("Skipping test that requires Fastly CLI")
			}

			result := ExecuteCommand(tt.req)

			if tt.expectSuccess && !result.Success {
				t.Errorf("Expected success but got failure: %s", result.Error)
			}

			if !tt.expectSuccess && result.Success {
				t.Error("Expected failure but got success")
			}

			if tt.expectError != "" && !strings.Contains(result.Error, tt.expectError) {
				t.Errorf("Expected error containing '%s', got '%s'", tt.expectError, result.Error)
			}

			if tt.expectCode != "" && result.ErrorCode != tt.expectCode {
				t.Errorf("Expected error code '%s', got '%s'", tt.expectCode, result.ErrorCode)
			}

			// For dangerous commands without user-reviewed, check the instructions and next steps
			if tt.expectCode == "user_confirmation_required" {
				if !strings.Contains(result.Instructions, "DANGEROUS OPERATION") {
					t.Error("Expected instructions to contain DANGEROUS OPERATION warning")
				}
				if !strings.Contains(result.Instructions, "human user") {
					t.Error("Expected instructions to mention human user confirmation")
				}
				// Check that NextSteps mentions user-reviewed flag
				foundUserReviewed := false
				for _, step := range result.NextSteps {
					if strings.Contains(step, "user-reviewed") {
						foundUserReviewed = true
						break
					}
				}
				if !foundUserReviewed {
					t.Error("Expected NextSteps to mention user-reviewed flag")
				}
			}
		})
	}
}

func TestUserReviewedFlagFiltering(t *testing.T) {
	// This test verifies that the --user-reviewed flag is not passed to the CLI
	req := types.CommandRequest{
		Command: "service", // Use a command that supports --json flag
		Args:    []string{"list"},
		Flags: []types.Flag{
			{Name: "user-reviewed"},
			{Name: "json"},
		},
	}

	// Skip if CLI not available
	if err := CheckSetup(); err != nil {
		t.Skip("Skipping test that requires Fastly CLI")
	}

	result := ExecuteCommand(req)

	// The command should succeed
	if !result.Success {
		t.Errorf("Expected success but got failure: %s", result.Error)
	}

	// The command line should not contain --user-reviewed
	if strings.Contains(result.CommandLine, "--user-reviewed") {
		t.Error("Command line should not contain --user-reviewed flag")
	}

	// The command line should contain --json
	if !strings.Contains(result.CommandLine, "--json") {
		t.Error("Command line should contain --json flag")
	}
}

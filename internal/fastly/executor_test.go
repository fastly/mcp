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

func TestCommandSplitting(t *testing.T) {
	// This test verifies that commands with spaces are properly split
	tests := []struct {
		name            string
		req             types.CommandRequest
		expectedCommand string
		expectedArgs    []string
		expectError     bool
	}{
		{
			name: "command with space - backend list",
			req: types.CommandRequest{
				Command: "backend list",
				Flags:   []types.Flag{{Name: "service-id", Value: "test"}},
			},
			expectedCommand: "backend",
			expectedArgs:    []string{"list"},
			expectError:     false,
		},
		{
			name: "command with multiple spaces",
			req: types.CommandRequest{
				Command: "service version list",
			},
			expectedCommand: "service",
			expectedArgs:    []string{"version", "list"},
			expectError:     false,
		},
		{
			name: "single command without spaces",
			req: types.CommandRequest{
				Command: "service",
				Args:    []string{"list"},
			},
			expectedCommand: "service",
			expectedArgs:    []string{"list"},
			expectError:     false,
		},
		{
			name: "command with space and explicit args",
			req: types.CommandRequest{
				Command: "backend list",
				Args:    []string{"--verbose"},
			},
			expectedCommand: "backend",
			expectedArgs:    []string{"list", "--verbose"},
			expectError:     false,
		},
		{
			name: "invalid command after splitting",
			req: types.CommandRequest{
				Command: "invalid-command list",
			},
			expectedCommand: "invalid-command",
			expectedArgs:    []string{"list"},
			expectError:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ExecuteCommand(tt.req)

			if tt.expectError {
				if result.Success {
					t.Error("Expected command to fail due to invalid command")
				}
				if !strings.Contains(result.Error, "not available") {
					t.Errorf("Expected 'not available' error, got: %s", result.Error)
				}
			} else {
				// For valid commands, we can't easily verify the internal splitting
				// but we can check that the command doesn't fail due to validation
				if !result.Success && strings.Contains(result.Error, "not available") {
					t.Errorf("Command should have been split properly, but got validation error: %s", result.Error)
				}
			}
		})
	}
}

func TestDeniedCommands(t *testing.T) {
	// Save current global validator
	originalValidator := globalValidator
	defer func() {
		globalValidator = originalValidator
	}()

	tests := []struct {
		name        string
		req         types.CommandRequest
		expectError string
		expectCode  string
	}{
		{
			name: "denied stats realtime command",
			req: types.CommandRequest{
				Command: "stats",
				Args:    []string{"realtime"},
				Flags:   []types.Flag{},
			},
			expectError: "The 'stats realtime' command is not available",
			expectCode:  "COMMAND_NOT_AVAILABLE",
		},
		{
			name: "denied stats realtime with flags",
			req: types.CommandRequest{
				Command: "stats",
				Args:    []string{"realtime", "--service-id", "abc123"},
				Flags:   []types.Flag{{Name: "json"}},
			},
			expectError: "The 'stats realtime' command is not available",
			expectCode:  "COMMAND_NOT_AVAILABLE",
		},
		{
			name: "allowed stats historical",
			req: types.CommandRequest{
				Command: "stats",
				Args:    []string{"historical"},
				Flags:   []types.Flag{},
			},
			expectError: "", // Should not be denied
			expectCode:  "",
		},
		{
			name: "allowed stats regions",
			req: types.CommandRequest{
				Command: "stats",
				Args:    []string{"regions"},
				Flags:   []types.Flag{},
			},
			expectError: "", // Should not be denied
			expectCode:  "",
		},
		{
			name: "allowed stats alone",
			req: types.CommandRequest{
				Command: "stats",
				Args:    []string{},
				Flags:   []types.Flag{},
			},
			expectError: "", // Should not be denied
			expectCode:  "",
		},
		{
			name: "denied log-tail command",
			req: types.CommandRequest{
				Command: "log-tail",
				Args:    []string{},
				Flags:   []types.Flag{},
			},
			expectError: "The 'log-tail' command is not available",
			expectCode:  "COMMAND_NOT_AVAILABLE",
		},
		{
			name: "denied log-tail with flags",
			req: types.CommandRequest{
				Command: "log-tail",
				Args:    []string{},
				Flags:   []types.Flag{{Name: "service-id", Value: "abc123"}},
			},
			expectError: "The 'log-tail' command is not available",
			expectCode:  "COMMAND_NOT_AVAILABLE",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ExecuteCommand(tt.req)

			if tt.expectError != "" {
				// Should be denied
				if result.Success {
					t.Error("Expected command to be denied but it succeeded")
				}
				if result.Error != tt.expectError {
					t.Errorf("Expected error '%s', got '%s'", tt.expectError, result.Error)
				}
				if result.ErrorCode != tt.expectCode {
					t.Errorf("Expected code '%s', got '%s'", tt.expectCode, result.ErrorCode)
				}
			} else {
				// Should not be denied by denylist (may fail for other reasons)
				if !result.Success && result.ErrorCode == "COMMAND_NOT_AVAILABLE" {
					t.Errorf("Command should not be denied, but got: %s", result.Error)
				}
			}
		})
	}
}

func TestImprovedErrorHandling(t *testing.T) {
	tests := []struct {
		name                   string
		req                    types.CommandRequest
		checkErrorContents     bool
		expectedErrorFragments []string
		expectedErrorCode      string
	}{
		{
			name: "invalid flag error includes full output",
			req: types.CommandRequest{
				Command: "service",
				Args:    []string{"list"},
				Flags: []types.Flag{
					{Name: "invalid-flag", Value: "value"},
				},
			},
			checkErrorContents:     true,
			expectedErrorFragments: []string{"unknown long flag", "invalid-flag"},
			expectedErrorCode:      "invalid_argument",
		},
		{
			name: "missing required argument includes helpful error",
			req: types.CommandRequest{
				Command: "service",
				Args:    []string{"describe"},
				Flags:   []types.Flag{},
			},
			checkErrorContents:     true,
			expectedErrorFragments: []string{"no service id found"},
			expectedErrorCode:      "validation_error",
		},
		{
			name: "authentication error gets proper code",
			req: types.CommandRequest{
				Command: "service",
				Args:    []string{"list"},
				Flags:   []types.Flag{
					// This test assumes FASTLY_API_TOKEN is not set or invalid
					// In a real test environment, we'd mock this
				},
			},
			checkErrorContents: false,
			expectedErrorCode:  "", // May or may not fail depending on environment
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Skip tests that require actual CLI execution if not available
			if err := CheckSetup(); err != nil {
				t.Skip("Skipping test that requires Fastly CLI")
			}

			result := ExecuteCommand(tt.req)

			// If we're checking error contents, verify the command failed
			if tt.checkErrorContents {
				if result.Success {
					t.Errorf("Expected command to fail, but it succeeded")
				}

				// Check that error message contains all expected fragments
				for _, fragment := range tt.expectedErrorFragments {
					if !strings.Contains(strings.ToLower(result.Error), strings.ToLower(fragment)) {
						t.Errorf("Expected error to contain '%s', but got: %s", fragment, result.Error)
					}
				}
			}

			// Check error code if specified and command failed
			if tt.expectedErrorCode != "" && !result.Success {
				if result.ErrorCode != tt.expectedErrorCode {
					t.Errorf("Expected error code '%s', but got '%s'", tt.expectedErrorCode, result.ErrorCode)
				}
			}

			// Verify that failed commands always have instructions and next steps
			if !result.Success {
				if result.Instructions == "" {
					t.Errorf("Failed command should have instructions, but got empty string")
				}
				if len(result.NextSteps) == 0 {
					t.Errorf("Failed command should have next steps, but got none")
				}
			}
		})
	}
}

func TestTimeoutErrorHandling(t *testing.T) {
	// Test the TimeoutError function directly since we can't easily trigger real timeouts
	req := types.CommandRequest{
		Command: "stats",
		Args:    []string{"realtime"},
		Flags: []types.Flag{
			{Name: "service-id", Value: "test-service"},
		},
	}

	// Test basic timeout error
	timeoutResp := TimeoutError(req.Command, req.Args, req.Flags)

	if timeoutResp.Success {
		t.Errorf("Timeout response should indicate failure")
	}

	if timeoutResp.ErrorCode != "timeout" {
		t.Errorf("Expected error code 'timeout', got '%s'", timeoutResp.ErrorCode)
	}

	if !strings.Contains(timeoutResp.Error, "timeout") && !strings.Contains(timeoutResp.Error, "timed out") {
		t.Errorf("Expected error message to mention timeout, got: %s", timeoutResp.Error)
	}

	if timeoutResp.Instructions == "" {
		t.Errorf("Expected instructions in timeout response")
	}

	if len(timeoutResp.NextSteps) == 0 {
		t.Errorf("Expected next steps in timeout response")
	}
}

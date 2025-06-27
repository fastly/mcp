package fastly

import (
	"context"
	"strings"
	"testing"
)

func TestCommandFiltering(t *testing.T) {
	t.Run("list-commands excludes disallowed commands", func(t *testing.T) {
		// Set up mock command executor
		originalExecutor := testCommandExecutor
		testCommandExecutor = func(ctx context.Context, name string, args ...string) (string, error) {
			// Return mock Fastly help output
			return `USAGE
  fastly [<flags>] <command> [<args> ...]

COMMANDS
  acl           Manage access control lists (ACLs)
  auth-token    Manage API tokens (filtered out)
  backend       Manage service backends
  compute       Manage Compute services
  profile       Manage user profiles (filtered out)
  service       Manage Fastly services
  sso           Single sign-on operations (filtered out)

SEE ALSO
  fastly help`, nil
		}
		defer func() {
			testCommandExecutor = originalExecutor
		}()

		response := GetCommandList()

		// Check that auth-token, sso, and profile are not in the list
		for _, cmd := range response.Commands {
			if cmd.Name == "auth-token" || cmd.Name == "sso" || cmd.Name == "profile" {
				t.Errorf("Disallowed command '%s' found in command list", cmd.Name)
			}
		}

		// Check that some allowed commands are present
		foundService := false
		foundBackend := false
		for _, cmd := range response.Commands {
			if cmd.Name == "service" {
				foundService = true
			}
			if cmd.Name == "backend" {
				foundBackend = true
			}
		}

		if !foundService {
			t.Error("Expected command 'service' not found in list")
		}
		if !foundBackend {
			t.Error("Expected command 'backend' not found in list")
		}
	})
}

func TestDescribeCommandFiltering(t *testing.T) {
	tests := []struct {
		name        string
		cmdPath     []string
		expectError bool
		errorMsg    string
		mockOutput  string
	}{
		{
			name:        "allowed command",
			cmdPath:     []string{"service"},
			expectError: false,
			mockOutput: `NAME
  fastly service - Manage Fastly services

USAGE
  fastly service <command> [<args> ...]

COMMANDS
  create    Create a new service
  list      List all services`,
		},
		{
			name:        "disallowed auth-token command",
			cmdPath:     []string{"auth-token"},
			expectError: true,
			errorMsg:    "not allowed for security reasons",
		},
		{
			name:        "disallowed sso command",
			cmdPath:     []string{"sso"},
			expectError: true,
			errorMsg:    "not allowed for security reasons",
		},
		{
			name:        "disallowed profile command",
			cmdPath:     []string{"profile"},
			expectError: true,
			errorMsg:    "not allowed for security reasons",
		},
		{
			name:        "allowed service-version command",
			cmdPath:     []string{"service-version"},
			expectError: false,
			mockOutput: `NAME
  fastly service-version - Manage service versions

USAGE
  fastly service-version <command> [<args> ...]

COMMANDS
  activate    Activate a service version
  clone       Clone a service version`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set up mock command executor
			originalExecutor := testCommandExecutor
			testCommandExecutor = func(ctx context.Context, name string, args ...string) (string, error) {
				// Return mock help output for allowed commands
				if tt.mockOutput != "" {
					return tt.mockOutput, nil
				}
				return "", nil
			}
			defer func() {
				testCommandExecutor = originalExecutor
			}()

			result := DescribeCommand(tt.cmdPath)

			if tt.expectError {
				if result.Description != "Command not allowed" {
					t.Errorf("Expected 'Command not allowed' description, got '%s'", result.Description)
				}
				if !strings.Contains(result.Instructions, tt.errorMsg) {
					t.Errorf("Expected instructions to contain '%s', got '%s'", tt.errorMsg, result.Instructions)
				}
			} else {
				if result.Description == "Command not allowed" {
					t.Errorf("Command '%s' should be allowed but was blocked", strings.Join(tt.cmdPath, " "))
				}
			}
		})
	}
}

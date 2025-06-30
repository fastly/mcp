package fastly

import (
	"os"
	"strings"
	"testing"
	"time"

	"github.com/fastly/mcp/internal/version"
)

func TestRunFastlyCommand_SetsCorrectEnvironment(t *testing.T) {
	// Save original PATH
	originalPath := os.Getenv("PATH")
	defer func() {
		_ = os.Setenv("PATH", originalPath)
	}()

	// Create a mock fastly command that prints environment variables
	mockScript := `#!/bin/sh
echo "FASTLY_CLI_ADDON=$FASTLY_CLI_ADDON"
`

	// Create a temporary directory for our mock
	tmpDir := t.TempDir()
	mockPath := tmpDir + "/fastly"

	// Write mock script
	if err := os.WriteFile(mockPath, []byte(mockScript), 0o755); err != nil {
		t.Fatal(err)
	}

	// Add tmpDir to PATH
	if err := os.Setenv("PATH", tmpDir+":"+originalPath); err != nil {
		t.Fatal(err)
	}

	// Run the command
	config := CommandRunConfig{
		Command: "fastly",
		Args:    []string{"version"},
		Timeout: 5 * time.Second,
	}

	result := RunFastlyCommand(config)

	// Check that the command succeeded
	if result.Error != nil {
		t.Fatalf("Command failed: %v", result.Error)
	}

	// Verify FASTLY_CLI_ADDON contains mcp/version
	expectedValue := "mcp/" + version.GetVersion()
	if !strings.Contains(result.Stdout, "FASTLY_CLI_ADDON="+expectedValue) {
		t.Errorf("Expected FASTLY_CLI_ADDON=%s, got: %s", expectedValue, result.Stdout)
	}
}

func TestRunFastlyCommand_WithAdditionalEnv(t *testing.T) {
	// Save original PATH
	originalPath := os.Getenv("PATH")
	defer func() {
		_ = os.Setenv("PATH", originalPath)
	}()

	// Create a mock fastly command that prints environment variables
	mockScript := `#!/bin/sh
echo "FASTLY_CLI_ADDON=$FASTLY_CLI_ADDON"
echo "CUSTOM_VAR=$CUSTOM_VAR"
`

	// Create a temporary directory for our mock
	tmpDir := t.TempDir()
	mockPath := tmpDir + "/fastly"

	// Write mock script
	if err := os.WriteFile(mockPath, []byte(mockScript), 0o755); err != nil {
		t.Fatal(err)
	}

	// Add tmpDir to PATH
	if err := os.Setenv("PATH", tmpDir+":"+originalPath); err != nil {
		t.Fatal(err)
	}

	// Run the command with additional environment variables
	config := CommandRunConfig{
		Command: "fastly",
		Args:    []string{"version"},
		Timeout: 5 * time.Second,
		Env:     []string{"CUSTOM_VAR=test123"},
	}

	result := RunFastlyCommand(config)

	// Check that the command succeeded
	if result.Error != nil {
		t.Fatalf("Command failed: %v", result.Error)
	}

	// Verify FASTLY_CLI_ADDON contains mcp/version
	expectedValue := "mcp/" + version.GetVersion()
	if !strings.Contains(result.Stdout, "FASTLY_CLI_ADDON="+expectedValue) {
		t.Errorf("Expected FASTLY_CLI_ADDON=%s, got: %s", expectedValue, result.Stdout)
	}

	// Verify custom environment variable is also set
	if !strings.Contains(result.Stdout, "CUSTOM_VAR=test123") {
		t.Errorf("Expected CUSTOM_VAR=test123, got: %s", result.Stdout)
	}
}

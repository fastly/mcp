package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/fastly/mcp/internal/types"
)

// TestValidateCLIArgs tests the argument validation logic
func TestValidateCLIArgs(t *testing.T) {
	tests := []struct {
		name      string
		args      []string
		wantError bool
		errorMsg  string
	}{
		{
			name:      "No command provided",
			args:      []string{},
			wantError: true,
			errorMsg:  "no command provided",
		},
		{
			name:      "Help command",
			args:      []string{"help"},
			wantError: false,
		},
		{
			name:      "Help with extra args",
			args:      []string{"help", "extra"},
			wantError: true,
			errorMsg:  "does not accept additional arguments",
		},
		{
			name:      "List commands",
			args:      []string{"list-commands"},
			wantError: false,
		},
		{
			name:      "List commands with extra args",
			args:      []string{"list-commands", "extra"},
			wantError: true,
			errorMsg:  "does not accept additional arguments",
		},
		{
			name:      "Execute with no args",
			args:      []string{"execute"},
			wantError: true,
			errorMsg:  "requires exactly one JSON argument",
		},
		{
			name:      "Execute with one arg",
			args:      []string{"execute", `{"command":"version"}`},
			wantError: false,
		},
		{
			name:      "Execute with multiple args",
			args:      []string{"execute", `{"command":"version"}`, "extra"},
			wantError: true,
			errorMsg:  "requires exactly one JSON argument",
		},
		{
			name:      "Describe with no args",
			args:      []string{"describe"},
			wantError: true,
			errorMsg:  "requires at least one operation name",
		},
		{
			name:      "Describe with one arg",
			args:      []string{"describe", "service"},
			wantError: false,
		},
		{
			name:      "Describe with multiple args",
			args:      []string{"describe", "service", "list"},
			wantError: false,
		},
		{
			name:      "Unknown command",
			args:      []string{"unknown"},
			wantError: true,
			errorMsg:  "unknown command",
		},
		{
			name:      "--help flag",
			args:      []string{"--help"},
			wantError: false,
		},
		{
			name:      "-h flag",
			args:      []string{"-h"},
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateCLIArgs(tt.args)
			if tt.wantError {
				if err == nil {
					t.Errorf("Expected error but got none")
				} else if tt.errorMsg != "" && !strings.Contains(err.Error(), tt.errorMsg) {
					t.Errorf("Expected error containing %q, got %q", tt.errorMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
			}
		})
	}
}

// TestPrettyPrintJSON tests JSON formatting
func TestPrettyPrintJSON(t *testing.T) {
	tests := []struct {
		name     string
		input    interface{}
		expected string
	}{
		{
			name: "Simple struct",
			input: struct {
				Name  string `json:"name"`
				Value int    `json:"value"`
			}{
				Name:  "test",
				Value: 42,
			},
			expected: `{
  "name": "test",
  "value": 42
}`,
		},
		{
			name: "Command response",
			input: types.CommandResponse{
				Success:     true,
				Command:     "version",
				CommandLine: "fastly version",
				Output:      "1.0.0",
			},
			expected: `{
  "success": true,
  "output": "1.0.0",
  "command": "version",
  "command_line": "fastly version"
}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Capture stdout
			oldStdout := os.Stdout
			r, w, _ := os.Pipe()
			os.Stdout = w

			err := prettyPrintJSON(tt.input)
			if err != nil {
				os.Stdout = oldStdout
				t.Fatalf("prettyPrintJSON failed: %v", err)
			}

			_ = w.Close()
			out, _ := io.ReadAll(r)
			os.Stdout = oldStdout

			output := strings.TrimSpace(string(out))
			expected := strings.TrimSpace(tt.expected)

			if output != expected {
				t.Errorf("Output mismatch:\nExpected:\n%s\nGot:\n%s", expected, output)
			}
		})
	}
}

// Integration tests that execute the binary
// These tests build and run the actual binary to test end-to-end behavior

func TestMainIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Build the binary for testing
	binary := buildTestBinary(t)
	defer func() { _ = os.Remove(binary) }()

	tests := []struct {
		name              string
		args              []string
		expectError       bool
		expectContains    []string
		expectNotContains []string
	}{
		{
			name:        "Help command",
			args:        []string{"help"},
			expectError: false,
			expectContains: []string{
				"Fastly MCP Server",
				"Usage:",
				"CLI Commands:",
			},
		},
		{
			name:        "--help flag",
			args:        []string{"--help"},
			expectError: false,
			expectContains: []string{
				"Fastly MCP Server",
			},
		},
		{
			name:        "Unknown command",
			args:        []string{"unknown-command"},
			expectError: true,
			expectContains: []string{
				"Unknown argument 'unknown-command'",
			},
		},
		{
			name:        "Multiple --http flags",
			args:        []string{"--http", "localhost:8080", "--http", "localhost:9090"},
			expectError: true,
			expectContains: []string{
				"--http specified multiple times",
			},
		},
		{
			name:        "Multiple --sse flags",
			args:        []string{"--sse", "--sse"},
			expectError: true,
			expectContains: []string{
				"--sse specified multiple times",
			},
		},
		{
			name:        "--sse without --http",
			args:        []string{"--sse"},
			expectError: true,
			expectContains: []string{
				"--sse requires --http",
			},
		},
		{
			name:        "Multiple --sanitize flags",
			args:        []string{"--sanitize", "--sanitize"},
			expectError: true,
			expectContains: []string{
				"--sanitize specified multiple times",
			},
		},
		{
			name:        "Multiple --encrypt-tokens flags",
			args:        []string{"--encrypt-tokens", "--encrypt-tokens"},
			expectError: true,
			expectContains: []string{
				"--encrypt-tokens specified multiple times",
			},
		},
		{
			name:        "--allowed-commands without file",
			args:        []string{"--allowed-commands"},
			expectError: true,
			expectContains: []string{
				"--allowed-commands requires a file path",
			},
		},
		{
			name:        "--allowed-commands with flag as file",
			args:        []string{"--allowed-commands", "--sanitize"},
			expectError: true,
			expectContains: []string{
				"--allowed-commands requires a file path",
			},
		},
		{
			name:        "Multiple --allowed-commands flags",
			args:        []string{"--allowed-commands", "file1.txt", "--allowed-commands", "file2.txt"},
			expectError: true,
			expectContains: []string{
				"--allowed-commands specified multiple times",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := exec.Command(binary, tt.args...)
			var stdout, stderr bytes.Buffer
			cmd.Stdout = &stdout
			cmd.Stderr = &stderr

			err := cmd.Run()

			// Check error expectation
			if tt.expectError && err == nil {
				t.Errorf("Expected error but command succeeded")
			} else if !tt.expectError && err != nil {
				t.Errorf("Expected success but got error: %v\nstderr: %s", err, stderr.String())
			}

			// Combine stdout and stderr for checking
			output := stdout.String() + stderr.String()

			// Check expected content
			for _, expected := range tt.expectContains {
				if !strings.Contains(output, expected) {
					t.Errorf("Expected output to contain %q\nGot: %s", expected, output)
				}
			}

			// Check unexpected content
			for _, unexpected := range tt.expectNotContains {
				if strings.Contains(output, unexpected) {
					t.Errorf("Expected output NOT to contain %q\nGot: %s", unexpected, output)
				}
			}
		})
	}
}

// Test CLI mode commands (these will fail if Fastly CLI is not installed/authenticated)
func TestCLIModeIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Build the binary for testing
	binary := buildTestBinary(t)
	defer func() { _ = os.Remove(binary) }()

	t.Run("describe help command", func(t *testing.T) {
		cmd := exec.Command(binary, "describe")
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr

		err := cmd.Run()
		// This may fail if Fastly CLI is not set up, which is expected
		// We're mainly testing that the command is recognized and processed
		if err != nil {
			// Check if it's a setup error (expected if Fastly CLI not installed)
			output := stderr.String()
			if strings.Contains(output, "Fastly CLI is not installed") ||
				strings.Contains(output, "Authentication required") {
				t.Logf("Fastly CLI not set up - this is expected in test environment")
				return
			}
		}

		// If we get here, Fastly CLI is installed, check for proper help output
		output := stdout.String()
		var helpInfo types.HelpInfo
		if err := json.Unmarshal([]byte(output), &helpInfo); err == nil {
			// Successfully parsed as HelpInfo
			if helpInfo.Command != "describe" {
				t.Errorf("Expected command 'describe', got %q", helpInfo.Command)
			}
		}
	})

	t.Run("execute without JSON", func(t *testing.T) {
		cmd := exec.Command(binary, "execute")
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr

		err := cmd.Run()
		// Should fail due to missing JSON argument
		if err == nil {
			t.Error("Expected error for execute without JSON argument")
		}

		// Check for proper error output
		output := stdout.String() + stderr.String()
		if !strings.Contains(output, "requires exactly one JSON argument") &&
			!strings.Contains(output, "Missing JSON operation specification") {
			t.Errorf("Expected missing JSON error, got: %s", output)
		}
	})

	t.Run("execute with invalid JSON", func(t *testing.T) {
		cmd := exec.Command(binary, "execute", "not-valid-json")
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr

		err := cmd.Run()
		// May succeed or fail depending on Fastly CLI setup
		_ = err

		output := stdout.String()
		if strings.Contains(output, "Invalid JSON") {
			// Good - we got the expected error
			return
		}

		// If Fastly CLI is not set up, we might get a setup error instead
		if strings.Contains(stderr.String(), "Fastly CLI is not installed") ||
			strings.Contains(stderr.String(), "Authentication required") {
			t.Logf("Fastly CLI not set up - this is expected in test environment")
			return
		}
	})

	t.Run("list-commands with extra arguments", func(t *testing.T) {
		cmd := exec.Command(binary, "list-commands", "extra", "args")
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr

		err := cmd.Run()
		if err == nil {
			t.Error("Expected error for list-commands with extra arguments")
		}

		output := stderr.String()
		if !strings.Contains(output, "does not accept additional arguments") {
			t.Errorf("Expected argument error, got: %s", output)
		}
	})
}

// Test flag combinations with CLI commands
func TestFlagCombinationsIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	binary := buildTestBinary(t)
	defer func() { _ = os.Remove(binary) }()

	tests := []struct {
		name           string
		args           []string
		expectError    bool
		expectContains []string
	}{
		{
			name:           "CLI command with --sanitize",
			args:           []string{"--sanitize", "help"},
			expectError:    false,
			expectContains: []string{"Fastly MCP Server"},
		},
		{
			name:           "CLI command with --encrypt-tokens",
			args:           []string{"--encrypt-tokens", "help"},
			expectError:    false,
			expectContains: []string{"Fastly MCP Server"},
		},
		{
			name:           "CLI command with both flags",
			args:           []string{"--sanitize", "--encrypt-tokens", "help"},
			expectError:    false,
			expectContains: []string{"Fastly MCP Server"},
		},
		{
			name:           "Flags after command",
			args:           []string{"help", "--sanitize"},
			expectError:    false,                         // help command prints help and exits successfully
			expectContains: []string{"Fastly MCP Server"}, // Shows help output
		},
		{
			name:        "Mixed flag positions",
			args:        []string{"--sanitize", "describe", "service"},
			expectError: false, // Will fail at Fastly CLI check, not arg parsing
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := exec.Command(binary, tt.args...)
			var stdout, stderr bytes.Buffer
			cmd.Stdout = &stdout
			cmd.Stderr = &stderr

			err := cmd.Run()

			if tt.expectError && err == nil {
				t.Errorf("Expected error but command succeeded")
			}

			output := stdout.String() + stderr.String()
			for _, expected := range tt.expectContains {
				if !strings.Contains(output, expected) {
					t.Errorf("Expected output to contain %q\nGot: %s", expected, output)
				}
			}
		})
	}
}

// Test allowed commands file loading
func TestAllowedCommandsFileIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	binary := buildTestBinary(t)
	defer func() { _ = os.Remove(binary) }()

	// Create a temporary allowed commands file
	tmpFile, err := os.CreateTemp("", "allowed-commands-*.txt")
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = os.Remove(tmpFile.Name()) }()

	// Write some allowed commands
	allowedCommands := []string{
		"version",
		"service-list",
		"service-describe",
	}
	for i, cmd := range allowedCommands {
		if i > 0 {
			_, _ = fmt.Fprintln(tmpFile)
		}
		_, _ = fmt.Fprint(tmpFile, cmd)
	}
	_ = tmpFile.Close()

	t.Run("Load custom allowed commands", func(t *testing.T) {
		cmd := exec.Command(binary, "--allowed-commands", tmpFile.Name(), "help")
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr

		err := cmd.Run()
		// The command should at least parse the file successfully
		output := stderr.String()

		// Check if we got a message about loading commands
		if strings.Contains(output, "Loaded") && strings.Contains(output, "allowed commands") {
			t.Logf("Successfully loaded allowed commands")
		} else if strings.Contains(output, "Fastly CLI is not installed") {
			// This is OK - we're testing argument parsing, not Fastly CLI
			t.Logf("Fastly CLI not installed - argument parsing still worked")
		}

		// Should not have file loading errors
		if strings.Contains(output, "Error loading allowed commands") {
			t.Errorf("Failed to load allowed commands file: %s", output)
		}

		_ = err // Error is expected if Fastly CLI is not installed
	})

	t.Run("Non-existent allowed commands file", func(t *testing.T) {
		cmd := exec.Command(binary, "--allowed-commands", "/non/existent/file.txt", "help")
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr

		err := cmd.Run()
		if err == nil {
			t.Error("Expected error for non-existent allowed commands file")
		}

		output := stderr.String()
		if !strings.Contains(output, "Error loading allowed commands") {
			t.Errorf("Expected file loading error, got: %s", output)
		}
	})
}

// Helper function to build the test binary
func buildTestBinary(t *testing.T) string {
	t.Helper()

	// Create a temporary directory for the binary
	tmpDir, err := os.MkdirTemp("", "fastly-mcp-test-")
	if err != nil {
		t.Fatal(err)
	}

	binary := filepath.Join(tmpDir, "fastly-mcp-test")
	if runtime := os.Getenv("GOOS"); runtime == "windows" {
		binary += ".exe"
	}

	// Build the binary
	cmd := exec.Command("go", "build", "-o", binary, ".")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		_ = os.RemoveAll(tmpDir)
		t.Fatalf("Failed to build test binary: %v", err)
	}

	// Schedule cleanup of temp directory
	t.Cleanup(func() {
		_ = os.RemoveAll(tmpDir)
	})

	return binary
}

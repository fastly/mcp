package fastly

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"strings"
	"time"
)

// CommandRunConfig holds configuration for executing a command
type CommandRunConfig struct {
	Command string
	Args    []string
	Timeout time.Duration
	Env     []string // Additional environment variables
}

// CommandRunResult holds the result of executing a command
type CommandRunResult struct {
	Stdout   string
	Stderr   string
	Error    error
	TimedOut bool
}

// RunFastlyCommand executes a fastly command with the given configuration.
// This is a shared helper that consolidates common command execution logic.
func RunFastlyCommand(config CommandRunConfig) CommandRunResult {
	if config.Timeout == 0 {
		config.Timeout = CommandTimeout // Default timeout
	}

	ctx, cancel := context.WithTimeout(context.Background(), config.Timeout)
	defer cancel()

	// Build the command
	cmd := exec.CommandContext(ctx, config.Command, config.Args...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// Set environment with FASTLY_CLI_ADDON=mcp and any additional env vars
	env := append(os.Environ(), "FASTLY_CLI_ADDON=mcp")
	if config.Env != nil {
		env = append(env, config.Env...)
	}
	cmd.Env = env

	// Execute the command
	err := cmd.Run()

	result := CommandRunResult{
		Stdout: stdout.String(),
		Stderr: stderr.String(),
		Error:  err,
	}

	// Check if the context timed out
	if ctx.Err() == context.DeadlineExceeded {
		result.TimedOut = true
	}

	return result
}

// IsAuthenticationError checks if the error output indicates an authentication problem
func IsAuthenticationError(stdout, stderr string) bool {
	authErrorPatterns := []string{
		"no API token found",
		"unauthorized",
		"Invalid token",
		`"authorized":false`,
		"authentication failed",
		"401 Unauthorized",
	}

	combined := strings.ToLower(stdout + " " + stderr)
	for _, pattern := range authErrorPatterns {
		if strings.Contains(combined, strings.ToLower(pattern)) {
			return true
		}
	}
	return false
}

// GetErrorMessage extracts a meaningful error message from command output
func GetErrorMessage(result CommandRunResult) string {
	// Prefer stderr over stdout for error messages
	errorMsg := strings.TrimSpace(result.Stderr)
	if errorMsg == "" {
		errorMsg = strings.TrimSpace(result.Stdout)
	}

	// If still empty but there was an error, provide a generic message
	if errorMsg == "" && result.Error != nil {
		if exitErr, ok := result.Error.(*exec.ExitError); ok {
			errorMsg = "Command failed with exit code " + string(rune(exitErr.ExitCode()))
		} else {
			errorMsg = result.Error.Error()
		}
	}

	return errorMsg
}

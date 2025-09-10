package fastly

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/fastly/mcp/internal/version"
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

	// Check if FASTLY_CLI_PATH is set to use a specific binary location
	commandPath := config.Command
	if config.Command == "fastly" {
		if customPath := os.Getenv("FASTLY_CLI_PATH"); customPath != "" {
			commandPath = customPath
		}
	}

	// Build the command
	cmd := exec.CommandContext(ctx, commandPath, config.Args...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// Set environment with FASTLY_CLI_ADDON=mcp/version and any additional env vars
	versionedAddon := fmt.Sprintf("mcp/%s", version.GetVersion())
	env := append(os.Environ(),
		fmt.Sprintf("FASTLY_CLI_ADDON=%s", versionedAddon),
		fmt.Sprintf("FASTLY_USER_AGENT_EXTENSION=%s", versionedAddon))
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

	// Check for common system failures and provide clear error messages
	if err != nil {
		// Check if the error is due to the binary not being found
		if execErr, ok := err.(*exec.Error); ok {
			if execErr.Err == exec.ErrNotFound {
				// Provide a clear error message for binary not found
				if config.Command == "fastly" {
					if customPath := os.Getenv("FASTLY_CLI_PATH"); customPath != "" {
						result.Stderr = fmt.Sprintf("SYSTEM ERROR: Fastly CLI binary not found at custom path: %s\nPlease verify that FASTLY_CLI_PATH points to a valid fastly executable.", customPath)
					} else {
						currentPath := os.Getenv("PATH")
						result.Stderr = fmt.Sprintf("SYSTEM ERROR: Fastly CLI binary not found in PATH.\nCurrent PATH: %s\nPlease install the Fastly CLI or ensure it is in your PATH.", currentPath)
					}
				} else {
					result.Stderr = fmt.Sprintf("SYSTEM ERROR: Command '%s' not found.", config.Command)
				}
			} else if os.IsPermission(execErr.Err) {
				// Provide a clear error message for permission denied
				result.Stderr = fmt.Sprintf("SYSTEM ERROR: Permission denied executing '%s'.\nPlease check that the file is executable (chmod +x %s).", commandPath, commandPath)
			} else {
				// Other exec errors
				result.Stderr = fmt.Sprintf("SYSTEM ERROR: Failed to execute '%s': %v", commandPath, execErr.Err)
			}
		}
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
			errorMsg = fmt.Sprintf("Command failed with exit code %d", exitErr.ExitCode())
		} else {
			errorMsg = result.Error.Error()
		}
	}

	return errorMsg
}

package fastly

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/fastly/mcp/internal/types"
	"github.com/fastly/mcp/internal/validation"
	"github.com/fastly/mcp/internal/version"
)

// commandExecutor is a function type for executing commands.
// This abstraction allows for easy mocking in tests by replacing the executor function.
type commandExecutor func(ctx context.Context, name string, args ...string) (string, error)

// defaultCommandExecutor is the production implementation that executes real CLI commands.
// Important: The Fastly CLI outputs help text to stderr (not stdout), so we must capture
// stderr to get the help output. This is standard behavior for many CLI tools.
var defaultCommandExecutor commandExecutor = func(ctx context.Context, name string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// Set environment with FASTLY_CLI_ADDON=mcp/version and FASTLY_USER_AGENT_EXTENSION
	versionedAddon := fmt.Sprintf("mcp/%s", version.GetVersion())
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("FASTLY_CLI_ADDON=%s", versionedAddon),
		fmt.Sprintf("FASTLY_USER_AGENT_EXTENSION=%s", versionedAddon))

	err := cmd.Run()
	// Fastly outputs help to stderr
	output := stderr.String()
	if output == "" {
		output = stdout.String()
	}

	return output, err
}

// testCommandExecutor allows tests to override command execution with mock implementations.
// When set, it replaces the defaultCommandExecutor for testing purposes.
var testCommandExecutor commandExecutor

// GetCommandList returns a list of all available Fastly commands by parsing the CLI help output.
// It executes 'fastly --help' and extracts the command list, filtering out any commands
// that are not allowed by the security validator. The function handles timeouts and
// provides appropriate error responses if the CLI is not available.
func GetCommandList() types.CommandListResponse {
	ctx, cancel := context.WithTimeout(context.Background(), CommandTimeout)
	defer cancel()

	executor := defaultCommandExecutor
	if testCommandExecutor != nil {
		executor = testCommandExecutor
	}

	// Ignore error - help commands often return non-zero exit codes
	output, _ := executor(ctx, "fastly", "--help")

	if output == "" {
		return types.CommandListResponse{
			Description: "Failed to get operation list: no output",
			Commands:    []types.SubcommandInfo{},
			NextSteps: []string{
				"Check if the Fastly service is properly configured",
				"Verify that authentication is set up correctly",
			},
		}
	}

	commands := parseCommandList(output)

	return types.CommandListResponse{
		Description: "These are all available Fastly API operations. Each operation may have sub-operations and parameters.",
		Commands:    commands,
		NextSteps: []string{
			"Use the fastly_describe tool to learn more about specific operations",
			"For sub-operations, use fastly_describe with the full command path",
			"Use the fastly_execute tool to run operations with appropriate parameters",
		},
	}
}

// parseCommandList parses the command list from Fastly CLI help output.
// It extracts command names and descriptions from the COMMANDS section of the help text.
// The parser handles:
//   - Multi-line descriptions that wrap across lines
//   - Filtering out non-command lines (like usage examples)
//   - Security validation to exclude forbidden commands
//   - ANSI escape sequence removal from descriptions
//
// The help output format expected is:
//
//	COMMANDS
//	  command1    Description of command1
//	  command2    Description of command2 that might
//	              wrap to multiple lines
func parseCommandList(helpOutput string) []types.SubcommandInfo {
	var commands []types.SubcommandInfo
	lines := strings.Split(helpOutput, "\n")
	inCommands := false

	for i, line := range lines {
		if strings.TrimSpace(line) == "COMMANDS" {
			inCommands = true
			continue
		}
		if inCommands && strings.HasPrefix(line, "SEE ALSO") {
			break
		}
		if inCommands && strings.HasPrefix(line, "  ") && !strings.HasPrefix(line, "    ") {
			// Command lines start with exactly 2 spaces
			// Skip non-command lines like "fastly [<flags>]..."
			if strings.Contains(line, "[") && strings.Contains(line, "]") {
				continue
			}

			// Find where multiple spaces separate command from description
			// Look for at least 2 consecutive spaces after the command name
			idx := 2 // Start after the initial 2 spaces
			for idx < len(line) && line[idx] != ' ' {
				idx++
			}

			if idx < len(line) {
				cmd := strings.TrimSpace(line[2:idx])
				for idx < len(line) && line[idx] == ' ' {
					idx++
				}
				if idx < len(line) {
					desc := strings.TrimSpace(line[idx:])

					// Check if next lines are continuation of description
					for j := i + 1; j < len(lines); j++ {
						nextLine := lines[j]
						// Continuation lines start with many spaces (align with description)
						if len(nextLine) > 13 && strings.HasPrefix(nextLine, "             ") && strings.TrimSpace(nextLine) != "" {
							desc += " " + strings.TrimSpace(nextLine)
						} else if strings.HasPrefix(nextLine, "  ") && !strings.HasPrefix(nextLine, "    ") {
							break
						} else if strings.TrimSpace(nextLine) == "" {
							continue
						} else {
							break
						}
					}

					if cmd != "" && desc != "" && !strings.HasPrefix(cmd, "-") {
						// Only include commands that are allowed by the security validator.
						// globalValidator is a package-level variable that can be customized
						// via SetCustomValidator(), defaulting to a standard validator if nil.
						validator := globalValidator
						if validator == nil {
							validator = validation.NewValidator()
						}
						if err := validator.ValidateCommand(cmd); err == nil {
							commands = append(commands, types.SubcommandInfo{
								Name:        cmd,
								Description: CleanANSI(desc),
							})
						}
					}
				}
			}
		}
	}

	return commands
}

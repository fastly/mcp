// Package validation provides security-focused input validation for the Fastly MCP server.
package validation

import (
	"bufio"
	"fmt"
	"os"
	"regexp"
	"strings"
)

// commandFormatRegex validates command format - commands should only contain alphanumeric, hyphens, and underscores
var commandFormatRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

// deniedCommandFormatRegex validates denied command format - allows command-subcommand combinations with space
var deniedCommandFormatRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]+( +[a-zA-Z0-9_-]+)?$`)

// LoadAllowedCommandsFromFile loads a list of allowed commands from a file.
// The file should contain one command per line, with optional comments and empty lines.
//
// File format example:
//
//	# Service management commands
//	service
//	service-version
//	backend
//
//	# Monitoring commands
//	stats
//	log-tail
//
// Lines starting with # are treated as comments and ignored.
// Empty lines are also ignored.
// Commands must contain only alphanumeric characters, hyphens, and underscores.
func LoadAllowedCommandsFromFile(filename string) (map[string]bool, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to open allowed commands file: %w", err)
	}
	defer func() {
		_ = file.Close()
	}()

	allowedCommands := make(map[string]bool)
	scanner := bufio.NewScanner(file)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Validate command format (same rules as command validation)
		if len(line) > MaxCommandLength {
			return nil, fmt.Errorf("command on line %d exceeds maximum length of %d characters", lineNum, MaxCommandLength)
		}

		// Basic validation - commands should only contain alphanumeric, hyphens, and underscores
		if !commandFormatRegex.MatchString(line) {
			return nil, fmt.Errorf("invalid command format on line %d: %s", lineNum, line)
		}

		allowedCommands[line] = true
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading allowed commands file: %w", err)
	}

	if len(allowedCommands) == 0 {
		return nil, fmt.Errorf("no valid commands found in file")
	}

	return allowedCommands, nil
}

// ParseAllowedCommands parses a comma-separated list of allowed commands.
// The commands must follow the same validation rules as file-based commands:
//   - Only alphanumeric characters, hyphens, and underscores allowed
//   - Maximum length of 50 characters per command
//   - Empty commands (e.g., from "cmd1,,cmd2") are ignored
//
// Example input: "service,backend,stats,version"
// Returns a map of command names for quick lookup.
func ParseAllowedCommands(cmdList string) (map[string]bool, error) {
	if cmdList == "" {
		return nil, fmt.Errorf("command list is empty")
	}

	allowedCommands := make(map[string]bool)
	commands := strings.Split(cmdList, ",")

	for i, cmd := range commands {
		// Trim whitespace
		cmd = strings.TrimSpace(cmd)

		// Skip empty commands (from trailing commas or double commas)
		if cmd == "" {
			continue
		}

		// Validate command format
		if len(cmd) > MaxCommandLength {
			return nil, fmt.Errorf("command at position %d exceeds maximum length of %d characters", i+1, MaxCommandLength)
		}

		// Check format - commands should only contain alphanumeric, hyphens, and underscores
		if !commandFormatRegex.MatchString(cmd) {
			return nil, fmt.Errorf("invalid command format at position %d: %s", i+1, cmd)
		}

		allowedCommands[cmd] = true
	}

	if len(allowedCommands) == 0 {
		return nil, fmt.Errorf("no valid commands found in list")
	}

	return allowedCommands, nil
}

// LoadDeniedCommandsFromFile loads a list of denied command-subcommand combinations from a file.
// The file should contain one command or command-subcommand combination per line.
//
// File format example:
//
//	# Dangerous real-time operations
//	stats realtime
//
//	# Blocked individual commands
//	some-dangerous-cmd
//
// Lines starting with # are treated as comments and ignored.
// Empty lines are also ignored.
// Commands can be single commands or command-subcommand combinations separated by a space.
func LoadDeniedCommandsFromFile(filename string) (map[string]bool, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to open denied commands file: %w", err)
	}
	defer func() {
		_ = file.Close()
	}()

	deniedCommands := make(map[string]bool)
	scanner := bufio.NewScanner(file)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Validate command format
		if len(line) > MaxCommandLength*2+1 { // Allow for command + space + subcommand
			return nil, fmt.Errorf("command on line %d exceeds maximum length", lineNum)
		}

		// Validate format - commands can be single or command-subcommand
		if !deniedCommandFormatRegex.MatchString(line) {
			return nil, fmt.Errorf("invalid command format on line %d: %s", lineNum, line)
		}

		deniedCommands[line] = true
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading denied commands file: %w", err)
	}

	return deniedCommands, nil
}

// ParseDeniedCommands parses a comma-separated list of denied commands.
// Commands can be single commands or command-subcommand combinations.
//
// Example input: "stats realtime,dangerous-cmd,service delete"
// Returns a map of command/combination names for quick lookup.
func ParseDeniedCommands(cmdList string) (map[string]bool, error) {
	if cmdList == "" {
		return nil, fmt.Errorf("command list is empty")
	}

	deniedCommands := make(map[string]bool)
	commands := strings.Split(cmdList, ",")

	for i, cmd := range commands {
		// Trim whitespace
		cmd = strings.TrimSpace(cmd)

		// Skip empty commands
		if cmd == "" {
			continue
		}

		// Validate length
		if len(cmd) > MaxCommandLength*2+1 {
			return nil, fmt.Errorf("command at position %d exceeds maximum length", i+1)
		}

		// Check format
		if !deniedCommandFormatRegex.MatchString(cmd) {
			return nil, fmt.Errorf("invalid command format at position %d: %s", i+1, cmd)
		}

		deniedCommands[cmd] = true
	}

	if len(deniedCommands) == 0 {
		return nil, fmt.Errorf("no valid commands found in list")
	}

	return deniedCommands, nil
}

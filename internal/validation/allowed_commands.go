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

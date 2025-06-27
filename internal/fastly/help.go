// Package fastly provides utilities for interacting with the Fastly CLI
// and building structured responses for MCP (Model Context Protocol) tools.
package fastly

import (
	"context"
	"fmt"
	"strings"

	"github.com/fastly/mcp/internal/types"
	"github.com/fastly/mcp/internal/validation"
)

// DescribeCommand returns detailed help information for a Fastly command.
// It validates the command is allowed, executes 'fastly [command] --help',
// and parses the output into structured help information suitable for AI consumption.
// The function detects invalid commands and provides helpful error messages.
func DescribeCommand(cmdPath []string) types.HelpInfo {
	// Check if the command is allowed
	if len(cmdPath) > 0 {
		validator := globalValidator
		if validator == nil {
			validator = validation.NewValidator()
		}
		if err := validator.ValidateCommand(cmdPath[0]); err != nil {
			return types.HelpInfo{
				Command:      strings.Join(cmdPath, " "),
				Description:  "Command not allowed",
				Instructions: fmt.Sprintf("The command '%s' is not allowed for security reasons.", cmdPath[0]),
				NextSteps: []string{
					"Use the fastly_list_commands tool to see available commands",
				},
			}
		}
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), CommandTimeout)
	defer cancel()

	// Use test executor if available, otherwise use default
	executor := defaultCommandExecutor
	if testCommandExecutor != nil {
		executor = testCommandExecutor
	}

	args := append(cmdPath, "--help")
	// Ignore error - help commands often return non-zero exit codes
	output, _ := executor(ctx, "fastly", args...)

	// Check if this is an invalid command
	// When given an invalid command, Fastly returns either:
	// 1. General help (starts with "USAGE\n  fastly [<flags>]") for top-level invalid commands
	// 2. Parent command help (without the subcommand in usage) for invalid subcommands
	isGeneralHelp := strings.HasPrefix(strings.TrimSpace(output), "USAGE\n  fastly [<flags>]")

	// For subcommands, check if the output contains the full command path
	expectedUsage := fmt.Sprintf("fastly %s", strings.Join(cmdPath, " "))
	containsFullCommand := strings.Contains(output, expectedUsage)

	if output == "" || strings.Contains(output, "unknown command") || strings.Contains(output, "Unknown command") ||
		(isGeneralHelp && len(cmdPath) > 0) || (len(cmdPath) > 1 && !containsFullCommand) {
		// Provide helpful error for invalid operations
		invalidHelp := types.HelpInfo{
			Command:      strings.Join(cmdPath, " "),
			Description:  "Invalid operation",
			Instructions: fmt.Sprintf("The operation '%s' is not recognized. Please check the operation name and try again.", strings.Join(cmdPath, " ")),
			NextSteps: []string{
				"Use the fastly_list_commands tool to see all available operations",
				"Check the spelling of the operation",
				"For sub-operations, ensure the parent operation is valid first",
			},
		}

		// If this looks like it might be a subcommand, provide more specific help
		if len(cmdPath) > 1 {
			invalidHelp.NextSteps = append(invalidHelp.NextSteps,
				fmt.Sprintf("Try 'describe %s' to see if '%s' has sub-operations", cmdPath[0], cmdPath[0]))
		}

		return invalidHelp
	}

	return parseHelpOutput(strings.Join(cmdPath, " "), output)
}

// parseHelpOutput parses Fastly CLI help text into a structured format.
// It extracts:
//   - Command description
//   - Usage syntax
//   - Required and optional flags
//   - Subcommands
//   - Additional metadata
//
// The parser handles various help text formats and adds MCP-specific
// instructions and warnings for dangerous operations.
func parseHelpOutput(command string, helpText string) types.HelpInfo {
	// Clean the help text first
	helpText = CleanANSI(helpText)

	info := types.HelpInfo{
		Command: command,
	}

	lines := strings.Split(helpText, "\n")
	var currentSection string
	var usageLines []string
	var inRequiredFlags bool

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		if strings.HasPrefix(line, "USAGE") {
			currentSection = "USAGE"
			continue
		} else if strings.HasPrefix(line, "REQUIRED FLAGS") {
			currentSection = "FLAGS"
			inRequiredFlags = true
			continue
		} else if strings.HasPrefix(line, "OPTIONAL FLAGS") {
			currentSection = "FLAGS"
			inRequiredFlags = false
			continue
		} else if strings.HasPrefix(line, "FLAGS") || strings.HasPrefix(line, "GLOBAL FLAGS") {
			currentSection = "FLAGS"
			inRequiredFlags = false
			continue
		} else if strings.HasPrefix(line, "COMMANDS") || strings.HasPrefix(line, "SUBCOMMANDS") {
			currentSection = "COMMANDS"
			continue
		} else if strings.HasPrefix(line, "SEE ALSO") {
			break
		}

		switch currentSection {
		case "USAGE":
			if trimmed != "" {
				usageLines = append(usageLines, trimmed)
				// Extract the first line as syntax
				if info.UsageSyntax == "" && (strings.Contains(trimmed, "fastly") || strings.Contains(trimmed, info.Command)) {
					// Remove "fastly" prefix from usage syntax
					info.UsageSyntax = strings.Replace(trimmed, "fastly ", "", 1)
				}
			}
		case "FLAGS":
			if strings.HasPrefix(trimmed, "-") || strings.HasPrefix(trimmed, "--") {
				flag := parseFlagLine(line)
				if flag.Name != "" && ShouldIncludeFlag(flag.Name) { // Filter out global/internal flags
					if inRequiredFlags {
						info.RequiredFlags = append(info.RequiredFlags, flag)
					} else {
						info.Flags = append(info.Flags, flag)
					}
				}
			} else if len(trimmed) > 0 && len(line) > 20 && strings.Count(line[:20], " ") >= 15 {
				// This is a continuation of the previous flag's description (lots of leading spaces)
				if inRequiredFlags && len(info.RequiredFlags) > 0 {
					lastIdx := len(info.RequiredFlags) - 1
					info.RequiredFlags[lastIdx].Description += " " + trimmed
				} else if !inRequiredFlags && len(info.Flags) > 0 {
					lastIdx := len(info.Flags) - 1
					info.Flags[lastIdx].Description += " " + trimmed
				}
			}
		case "COMMANDS":
			if trimmed != "" && !strings.HasPrefix(trimmed, "-") {
				// Check if this is a command line (starts with a non-space character)
				if len(line) > 0 && line[0] != ' ' {
					continue // Skip section headers
				}

				// Check if this is a continuation of a previous description
				// Continuation lines start with many spaces (typically align with description start)
				if len(info.Subcommands) > 0 && len(line) > 13 && strings.HasPrefix(line, "             ") {
					// This is a continuation line - append to previous subcommand's description
					lastIdx := len(info.Subcommands) - 1
					info.Subcommands[lastIdx].Description += " " + trimmed
				} else {
					// This is a new command
					parts := strings.Fields(trimmed)
					if len(parts) >= 2 {
						info.Subcommands = append(info.Subcommands, types.SubcommandInfo{
							Name:        parts[0],
							Description: strings.Join(parts[1:], " "),
						})
					}
				}
			}
		default:
			if currentSection == "" && trimmed != "" && info.Description == "" {
				// First non-empty line after usage syntax is usually the description
				if len(usageLines) > 0 {
					info.Description = trimmed
				}
			}
		}
	}

	if len(usageLines) > 0 {
		// Extract description from usage if not found
		if info.Description == "" && len(usageLines) > 1 {
			for _, line := range usageLines[1:] {
				if line != "" && !strings.HasPrefix(line, "fastly") {
					info.Description = line
					break
				}
			}
		}
	}

	// Post-process to improve clarity for AI
	info = improveUsageClarity(info)

	// Add warning to description if dangerous
	if isDangerous, warningText := IsDangerousOperation(info.Command); isDangerous {
		if info.Description != "" {
			info.Description = fmt.Sprintf("⚠️ %s - %s", info.Description, warningText)
		} else {
			info.Description = fmt.Sprintf("⚠️ %s", warningText)
		}
	}

	// Add AI-friendly instructions
	info = addMCPInstructions(info)

	// Add MCP metadata
	info = addMCPMetadata(info)

	return info
}

// parseFlagLine parses a single flag line from help output.
// It extracts the flag name (long form), short form (if available),
// and description. The parser handles various flag formats:
//   - --flag-name, -f    Description of the flag
//   - --flag-name=value  Description with value placeholder
//   - -f, --flag-name    Description (short form first)
func parseFlagLine(line string) types.FlagInfo {
	flag := types.FlagInfo{}

	parts := strings.Fields(line)
	if len(parts) < 2 {
		return flag
	}

	for i, part := range parts {
		if strings.HasPrefix(part, "--") {
			flag.Name = strings.TrimPrefix(part, "--")
			flag.Name = strings.TrimSuffix(flag.Name, ",")
			flag.Name = strings.Split(flag.Name, "=")[0]
		} else if strings.HasPrefix(part, "-") && len(part) == 2 {
			flag.Short = strings.TrimPrefix(part, "-")
			flag.Short = strings.TrimSuffix(flag.Short, ",")
		}

		if (flag.Name != "" || flag.Short != "") && i+1 < len(parts) {
			desc := strings.Join(parts[i+1:], " ")
			flag.Description = strings.TrimSpace(desc)
			break
		}
	}

	return flag
}

// improveUsageClarity enhances the help information for better AI understanding.
// It:
//   - Replaces generic placeholders with specific options
//   - Generates usage examples in MCP tool format
//   - Creates fastly_describe examples for subcommands
//   - Makes the usage syntax more explicit and actionable
func improveUsageClarity(info types.HelpInfo) types.HelpInfo {
	// If we have subcommands, make the usage syntax clearer
	if len(info.Subcommands) > 0 && info.UsageSyntax != "" {
		// Replace generic [command] with more specific indication
		if strings.Contains(info.UsageSyntax, "[command]") {
			// Create a list of subcommand names
			subcommandNames := make([]string, 0, len(info.Subcommands))
			for _, sc := range info.Subcommands {
				subcommandNames = append(subcommandNames, sc.Name)
			}

			// Replace [command] with explicit options
			if len(subcommandNames) <= 6 {
				replacement := "{" + strings.Join(subcommandNames, "|") + "}"
				info.UsageSyntax = strings.Replace(info.UsageSyntax, "[command]", replacement, 1)
			} else {
				// Too many subcommands, use a descriptive placeholder
				info.UsageSyntax = strings.Replace(info.UsageSyntax, "[command]", "[SUBCOMMAND]", 1)
				// Add note about available subcommands
				info.UsageSyntax += " # SUBCOMMAND is one of: " + strings.Join(subcommandNames[:3], ", ") + ", ..."
			}
		}

		// Generate usage examples based on subcommands
		if len(info.UsageExamples) == 0 && len(info.Subcommands) > 0 {
			// Add up to 3 examples
			for i, sc := range info.Subcommands {
				if i >= 3 {
					break
				}
				// Build the proper MCP tool format
				cmdParts := strings.Fields(info.Command)
				cmdParts = append(cmdParts, sc.Name)

				exampleJSON := fmt.Sprintf("Use fastly_execute with: {\"command\":\"%s\",\"args\":%s,\"flags\":[]}",
					cmdParts[0],
					ToJSONArray(cmdParts[1:]))

				info.UsageExamples = append(info.UsageExamples, exampleJSON)
			}
		}

		// Generate usage commands for getting help on each subcommand
		if len(info.UsageCommands) == 0 && len(info.Subcommands) > 0 {
			for _, sc := range info.Subcommands {
				describeCmd := fmt.Sprintf("Use fastly_describe with command='%s %s'", info.Command, sc.Name)
				info.UsageCommands = append(info.UsageCommands, describeCmd)
			}
		}
	}

	// Clean up any remaining generic terms
	info.UsageSyntax = strings.ReplaceAll(info.UsageSyntax, "[[args] ...]", "[OPTIONS]")

	return info
}

// addMCPInstructions adds MCP-specific instructions to help information.
// It provides:
//   - Clear instructions on how to use the command with MCP tools
//   - Required flag information and examples
//   - Warnings and special handling for dangerous operations
//   - Next steps tailored to the command type (parent/executable/dangerous)
//
// For dangerous operations, it emphasizes the need for human confirmation
// and includes the --user-reviewed flag requirement.
func addMCPInstructions(info types.HelpInfo) types.HelpInfo {
	// Check if this is a dangerous operation
	isDangerous, warningText := IsDangerousOperation(info.Command)

	// Add instructions based on what the command structure looks like
	if len(info.Subcommands) > 0 {
		// This is a parent command with subcommands
		info.Instructions = fmt.Sprintf("The '%s' operation requires a subcommand. Choose one from the 'subcommands' property.", info.Command)
		info.NextSteps = []string{
			fmt.Sprintf("Use fastly_describe with command='%s [subcommand]' to learn about specific subcommands", info.Command),
			fmt.Sprintf("Use fastly_execute with command='%s' and the subcommand in args", info.Command),
			"Required flags must be included in the flags array",
		}
	} else if len(info.RequiredFlags) > 0 {
		// This is an executable command with required flags
		requiredFlagNames := make([]string, 0, len(info.RequiredFlags))
		for _, rf := range info.RequiredFlags {
			requiredFlagNames = append(requiredFlagNames, rf.Name)
		}

		baseInstructions := fmt.Sprintf("To execute this command, you MUST provide these required flags: %s", strings.Join(requiredFlagNames, ", "))
		if isDangerous {
			info.Instructions = fmt.Sprintf("⚠️ WARNING: %s. You MUST ask the human user for explicit confirmation before executing this operation.\n\n%s\n\nDANGEROUS OPERATIONS REQUIRE: Only after receiving explicit human approval, add {\"name\":\"user-reviewed\"} to the flags array.", warningText, baseInstructions)
		} else {
			info.Instructions = baseInstructions
		}

		// Build example
		exampleFlags := make([]string, 0)
		for _, rf := range info.RequiredFlags {
			exampleFlags = append(exampleFlags, fmt.Sprintf("{\"name\":\"%s\",\"value\":\"[%s_VALUE]\"}", rf.Name, strings.ToUpper(rf.Name)))
		}

		// Add user-reviewed flag to example if dangerous
		if isDangerous {
			exampleFlags = append(exampleFlags, "{\"name\":\"user-reviewed\"}")
		}

		cmdParts := strings.Fields(info.Command)
		exampleJSON := fmt.Sprintf("{\"command\":\"%s\",\"args\":%s,\"flags\":[%s]}",
			cmdParts[0],
			ToJSONArray(cmdParts[1:]),
			strings.Join(exampleFlags, ","))

		info.NextSteps = []string{
			fmt.Sprintf("Execute with: execute '%s'", exampleJSON),
			"Optional flags can be added to the flags array",
			"All flag values must be strings, even if they're numbers",
		}

		if isDangerous {
			info.NextSteps = append([]string{
				"⚠️ IMPORTANT: This is a dangerous operation that modifies or deletes resources",
				"⚠️ REQUIRED: Ask the human user to review and approve this command",
				"⚠️ Only after human approval, add {\"name\":\"user-reviewed\"} flag",
			}, info.NextSteps...)
		}
	} else {
		// This is an executable command with only optional flags
		cmdParts := strings.Fields(info.Command)

		// Build example with user-reviewed flag if dangerous
		flagsExample := "[]"
		if isDangerous {
			flagsExample = "[{\"name\":\"user-reviewed\"}]"
		}

		exampleJSON := fmt.Sprintf("{\"command\":\"%s\",\"args\":%s,\"flags\":%s}",
			cmdParts[0],
			ToJSONArray(cmdParts[1:]),
			flagsExample)

		if isDangerous {
			info.Instructions = fmt.Sprintf("⚠️ WARNING: %s. You MUST ask the human user for explicit confirmation before executing this operation.\n\nThis command can be executed with optional flags.\n\nDANGEROUS OPERATIONS REQUIRE: Only after receiving explicit human approval, add {\"name\":\"user-reviewed\"} to the flags array.", warningText)
		} else {
			info.Instructions = "This command can be executed with optional flags."
		}

		info.NextSteps = []string{
			fmt.Sprintf("Execute with: execute '%s'", exampleJSON),
			"Add any optional flags to the flags array as needed",
			"Example flag: {\"name\":\"json\"} for JSON output",
		}

		if isDangerous {
			info.NextSteps = append([]string{
				"⚠️ IMPORTANT: This is a dangerous operation that modifies or deletes resources",
				"⚠️ REQUIRED: Ask the human user to review and approve this command",
				"⚠️ Only after human approval, add {\"name\":\"user-reviewed\"} flag",
			}, info.NextSteps...)
		}
	}

	// Add time-related hints for time-sensitive commands
	cmdParts := strings.Fields(info.Command)
	if len(cmdParts) > 0 {
		baseCommand := cmdParts[0]
		switch baseCommand {
		case "stats", "log-tail", "logging":
			info.NextSteps = append(info.NextSteps,
				"💡 TIP: Use the current_time tool to generate timestamps for filtering by time range")
		case "purge":
			info.NextSteps = append(info.NextSteps,
				"💡 TIP: Use the current_time tool to record when this purge operation is initiated")
		}
	}

	return info
}

// addMCPMetadata adds category and resource type metadata to help information.
// This categorization helps AI agents understand the context and impact of commands:
//   - configuration: Service configuration commands
//   - edge-logic: ACL and dictionary management
//   - code-deployment: VCL and Compute deployment
//   - monitoring: Stats and logging
//   - security: Authentication and secrets
//   - storage: Key-value and config stores
//   - operations: Cache purging
//   - integrations: External service connections
//   - utilities: System information and tools
func addMCPMetadata(info types.HelpInfo) types.HelpInfo {
	// Extract base command for categorization
	cmdParts := strings.Fields(info.Command)
	baseCommand := ""
	if len(cmdParts) > 0 {
		baseCommand = cmdParts[0]
	}

	// Get metadata from centralized source
	cmdMetadata := GetCommandMetadata(baseCommand)
	info.Category = cmdMetadata.Category
	info.ResourceType = cmdMetadata.ResourceType

	return info
}

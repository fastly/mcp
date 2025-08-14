// Package main provides the entry point for the Fastly MCP server.
//
// This application can run in two modes:
//   - MCP Server Mode: Serves as a Model Context Protocol server that wraps the Fastly CLI,
//     allowing AI agents to interact with Fastly services through a standardized protocol.
//     Can communicate over stdio (default) or HTTP with optional SSE support.
//   - CLI Mode: Direct command-line interface for testing MCP operations without the protocol
//     overhead. Useful for debugging and manual testing.
//
// The server requires the Fastly CLI to be installed and accessible in the PATH, and proper
// authentication via FASTLY_API_TOKEN environment variable or 'fastly profile' command.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/fastly/mcp/internal/fastly"
	"github.com/fastly/mcp/internal/mcp"
	"github.com/fastly/mcp/internal/types"
	"github.com/fastly/mcp/internal/validation"
	"github.com/fastly/mcp/internal/version"
)

// main is the application entry point that determines the execution mode based on command-line arguments.
// It supports:
//   - Default: MCP server over stdio
//   - --http: MCP server over HTTP (with optional address)
//   - --sse: Use Server-Sent Events instead of StreamableHTTP (requires --http)
//   - CLI commands: list-commands, execute, describe for direct testing
func main() {
	var (
		httpAddr        string
		useSSE          bool
		showHelp        bool
		sanitize        bool
		allowedCmdsFile string
		allowedCmds     string
		deniedCmdsFile  string
		deniedCmds      string
		encryptTokens   bool
		logCommandsFile string
	)

	// Parse and validate all arguments
	// First pass: extract global flags
	args := []string{}
	for i := 1; i < len(os.Args); i++ {
		arg := os.Args[i]
		if arg == "--sanitize" {
			if sanitize {
				fmt.Fprintf(os.Stderr, "Error: --sanitize specified multiple times\n")
				os.Exit(1)
			}
			sanitize = true
			continue
		}
		if arg == "--encrypt-tokens" {
			if encryptTokens {
				fmt.Fprintf(os.Stderr, "Error: --encrypt-tokens specified multiple times\n")
				os.Exit(1)
			}
			encryptTokens = true
			continue
		}
		if arg == "--allowed-commands-file" {
			if allowedCmdsFile != "" {
				fmt.Fprintf(os.Stderr, "Error: --allowed-commands-file specified multiple times\n")
				os.Exit(1)
			}
			if i+1 < len(os.Args) && !strings.HasPrefix(os.Args[i+1], "-") {
				allowedCmdsFile = os.Args[i+1]
				i++
			} else {
				fmt.Fprintf(os.Stderr, "Error: --allowed-commands-file requires a file path\n")
				os.Exit(1)
			}
			continue
		}
		if arg == "--allowed-commands" {
			if allowedCmds != "" {
				fmt.Fprintf(os.Stderr, "Error: --allowed-commands specified multiple times\n")
				os.Exit(1)
			}
			if i+1 < len(os.Args) && !strings.HasPrefix(os.Args[i+1], "-") {
				allowedCmds = os.Args[i+1]
				i++
			} else {
				fmt.Fprintf(os.Stderr, "Error: --allowed-commands requires a comma-separated list of commands\n")
				os.Exit(1)
			}
			continue
		}
		if arg == "--denied-commands-file" {
			if deniedCmdsFile != "" {
				fmt.Fprintf(os.Stderr, "Error: --denied-commands-file specified multiple times\n")
				os.Exit(1)
			}
			if i+1 < len(os.Args) && !strings.HasPrefix(os.Args[i+1], "-") {
				deniedCmdsFile = os.Args[i+1]
				i++
			} else {
				fmt.Fprintf(os.Stderr, "Error: --denied-commands-file requires a file path\n")
				os.Exit(1)
			}
			continue
		}
		if arg == "--denied-commands" {
			if deniedCmds != "" {
				fmt.Fprintf(os.Stderr, "Error: --denied-commands specified multiple times\n")
				os.Exit(1)
			}
			if i+1 < len(os.Args) && !strings.HasPrefix(os.Args[i+1], "-") {
				deniedCmds = os.Args[i+1]
				i++
			} else {
				fmt.Fprintf(os.Stderr, "Error: --denied-commands requires a comma-separated list of commands\n")
				os.Exit(1)
			}
			continue
		}
		if arg == "--log-commands" {
			if logCommandsFile != "" {
				fmt.Fprintf(os.Stderr, "Error: --log-commands specified multiple times\n")
				os.Exit(1)
			}
			if i+1 < len(os.Args) && !strings.HasPrefix(os.Args[i+1], "-") {
				logCommandsFile = os.Args[i+1]
				i++
			} else {
				fmt.Fprintf(os.Stderr, "Error: --log-commands requires a file path\n")
				os.Exit(1)
			}
			continue
		}
		args = append(args, arg)
	}

	// Second pass: process remaining arguments
	for i := 0; i < len(args); i++ {
		arg := args[i]
		switch arg {
		case "--http":
			if httpAddr != "" {
				fmt.Fprintf(os.Stderr, "Error: --http specified multiple times\n")
				os.Exit(1)
			}
			if i+1 < len(args) && !strings.HasPrefix(args[i+1], "-") {
				httpAddr = args[i+1]
				i++
			} else {
				httpAddr = "127.0.0.1:8080"
			}
		case "--sse":
			if useSSE {
				fmt.Fprintf(os.Stderr, "Error: --sse specified multiple times\n")
				os.Exit(1)
			}
			useSSE = true
		case "help", "--help", "-h":
			showHelp = true
		case "list-commands", "execute", "describe", "version":
			// For CLI mode commands, validate all remaining arguments
			// Need to reconstruct the command args for validation
			cmdArgs := []string{arg}
			cmdArgs = append(cmdArgs, args[i+1:]...)
			if err := validateCLIArgs(cmdArgs); err != nil {
				fmt.Fprintf(os.Stderr, "Error: %v\n", err)
				os.Exit(1)
			}
			runCLIMode(sanitize, encryptTokens)
			return
		default:
			fmt.Fprintf(os.Stderr, "Error: Unknown argument '%s'\n", arg)
			fmt.Fprintln(os.Stderr, "Run 'fastly-mcp help' for usage information")
			os.Exit(1)
		}
	}

	// Check for invalid argument combinations
	if useSSE && httpAddr == "" {
		fmt.Fprintf(os.Stderr, "Error: --sse requires --http\n")
		os.Exit(1)
	}

	if showHelp {
		runCLIMode(sanitize, encryptTokens)
		return
	}

	// Set global sanitization option for MCP server
	fastly.SetSanitizationEnabled(sanitize)

	// Set global token encryption option for MCP server
	fastly.SetTokenEncryptionEnabled(encryptTokens)

	// Load custom allowed commands from file and/or inline list
	var allowedCommands map[string]bool

	// Load from file if specified
	if allowedCmdsFile != "" {
		fileCommands, err := validation.LoadAllowedCommandsFromFile(allowedCmdsFile)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error loading allowed commands from file: %v\n", err)
			os.Exit(1)
		}
		allowedCommands = fileCommands
		fmt.Fprintf(os.Stderr, "Loaded %d allowed commands from %s\n", len(fileCommands), allowedCmdsFile)
	}

	// Parse inline commands if specified
	if allowedCmds != "" {
		inlineCommands, err := validation.ParseAllowedCommands(allowedCmds)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing allowed commands: %v\n", err)
			os.Exit(1)
		}

		// Merge with existing commands (if any)
		if allowedCommands == nil {
			allowedCommands = inlineCommands
			fmt.Fprintf(os.Stderr, "Loaded %d allowed commands from command line\n", len(inlineCommands))
		} else {
			// Merge inline commands with file commands
			for cmd := range inlineCommands {
				allowedCommands[cmd] = true
			}
			fmt.Fprintf(os.Stderr, "Added %d allowed commands from command line (total: %d)\n",
				len(inlineCommands), len(allowedCommands))
		}
	}

	// Load custom denied commands from file and/or inline list
	var deniedCommands map[string]bool

	// Load from file if specified
	if deniedCmdsFile != "" {
		fileCommands, err := validation.LoadDeniedCommandsFromFile(deniedCmdsFile)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error loading denied commands from file: %v\n", err)
			os.Exit(1)
		}
		deniedCommands = fileCommands
		fmt.Fprintf(os.Stderr, "Loaded %d denied commands from %s\n", len(fileCommands), deniedCmdsFile)
	}

	// Parse inline denied commands if specified
	if deniedCmds != "" {
		inlineCommands, err := validation.ParseDeniedCommands(deniedCmds)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing denied commands: %v\n", err)
			os.Exit(1)
		}

		// Merge with existing denied commands (if any)
		if deniedCommands == nil {
			deniedCommands = inlineCommands
			fmt.Fprintf(os.Stderr, "Loaded %d denied commands from command line\n", len(inlineCommands))
		} else {
			// Merge inline commands with file commands
			for cmd := range inlineCommands {
				deniedCommands[cmd] = true
			}
			fmt.Fprintf(os.Stderr, "Added %d denied commands from command line (total: %d)\n",
				len(inlineCommands), len(deniedCommands))
		}
	}

	// Set custom validator if any commands were loaded
	if allowedCommands != nil || deniedCommands != nil {
		customValidator := validation.NewValidatorWithCommandsAndDenied(allowedCommands, deniedCommands)
		fastly.SetCustomValidator(customValidator)
	}

	// Show logging status if enabled
	if logCommandsFile != "" {
		fmt.Fprintf(os.Stderr, "Logging MCP commands to: %s\n", logCommandsFile)
	}

	if httpAddr != "" {
		addr := mcp.NormalizeAddress(httpAddr)
		mcp.RunHTTPServer(addr, useSSE, logCommandsFile)
	} else {
		runMCPServer(logCommandsFile)
	}
}

// validateCLIArgs validates arguments for CLI mode commands.
// It ensures that only expected arguments are provided for each command.
func validateCLIArgs(args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("no command provided")
	}

	command := args[0]
	switch command {
	case "help", "--help", "-h", "list-commands", "version":
		// These commands don't accept additional arguments
		if len(args) > 1 {
			return fmt.Errorf("command '%s' does not accept additional arguments", command)
		}
	case "execute":
		// Execute expects exactly one additional argument (JSON)
		if len(args) != 2 {
			return fmt.Errorf("command 'execute' requires exactly one JSON argument")
		}
	case "describe":
		// Describe expects at least one additional argument
		if len(args) < 2 {
			return fmt.Errorf("command 'describe' requires at least one operation name")
		}
		// All remaining args are part of the command path, which is valid
	default:
		return fmt.Errorf("unknown command: %s", command)
	}

	return nil
}

// runMCPServer starts the MCP server in stdio mode for communication with AI agents.
// The server handles tool requests over standard input/output using the MCP protocol.
// Setup validation is deferred to tool execution time to ensure proper JSON-RPC communication.
func runMCPServer(logCommandsFile string) {
	if err := mcp.InitServer(logCommandsFile); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start MCP server: %v\n", err)
		os.Exit(1)
	}
}

// runCLIMode handles direct command-line interface operations for testing and debugging.
// It validates the Fastly CLI setup and then processes commands like:
//   - help: Display usage information
//   - list-commands: List all available Fastly operations
//   - execute: Execute a Fastly command from JSON specification
//   - describe: Get detailed help for a specific Fastly operation
//
// This mode bypasses the MCP protocol for direct testing.
func runCLIMode(sanitize bool, encryptTokens bool) {
	// Set sanitization option for CLI mode
	fastly.SetSanitizationEnabled(sanitize)

	// Set token encryption option for CLI mode
	fastly.SetTokenEncryptionEnabled(encryptTokens)

	// Find the command after filtering out global flags first to check if it's help
	var command string
	var commandArgs []string

	for i := 1; i < len(os.Args); i++ {
		if os.Args[i] == "--sanitize" {
			continue
		}
		if os.Args[i] == "--encrypt-tokens" {
			continue
		}
		if os.Args[i] == "--allowed-commands-file" {
			if i+1 < len(os.Args) {
				i++ // Skip the file argument too
			}
			continue
		}
		if os.Args[i] == "--allowed-commands" {
			if i+1 < len(os.Args) {
				i++ // Skip the commands argument too
			}
			continue
		}
		if os.Args[i] == "--log-commands" {
			if i+1 < len(os.Args) {
				i++ // Skip the file argument too
			}
			continue
		}
		if os.Args[i] == "--denied-commands-file" {
			if i+1 < len(os.Args) {
				i++ // Skip the file argument too
			}
			continue
		}
		if os.Args[i] == "--denied-commands" {
			if i+1 < len(os.Args) {
				i++ // Skip the commands argument too
			}
			continue
		}
		if command == "" {
			command = os.Args[i]
		} else {
			commandArgs = append(commandArgs, os.Args[i])
		}
	}

	// Check if allowed and denied commands were specified in CLI mode
	// This needs to happen before help command check to ensure proper loading
	var cliAllowedCommands map[string]bool
	var cliDeniedCommands map[string]bool

	// First check for file-based allowed commands
	for i := 1; i < len(os.Args); i++ {
		if os.Args[i] == "--allowed-commands-file" && i+1 < len(os.Args) {
			allowedCmdsFile := os.Args[i+1]
			fileCommands, err := validation.LoadAllowedCommandsFromFile(allowedCmdsFile)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error loading allowed commands from file: %v\n", err)
				os.Exit(1)
			}
			cliAllowedCommands = fileCommands
			fmt.Fprintf(os.Stderr, "Loaded %d allowed commands from %s\n", len(fileCommands), allowedCmdsFile)
			break
		}
	}

	// Then check for inline allowed commands
	for i := 1; i < len(os.Args); i++ {
		if os.Args[i] == "--allowed-commands" && i+1 < len(os.Args) {
			allowedCmdsList := os.Args[i+1]
			inlineCommands, err := validation.ParseAllowedCommands(allowedCmdsList)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error parsing allowed commands: %v\n", err)
				os.Exit(1)
			}

			// Merge with existing commands (if any)
			if cliAllowedCommands == nil {
				cliAllowedCommands = inlineCommands
				fmt.Fprintf(os.Stderr, "Loaded %d allowed commands from command line\n", len(inlineCommands))
			} else {
				// Merge inline commands with file commands
				for cmd := range inlineCommands {
					cliAllowedCommands[cmd] = true
				}
				fmt.Fprintf(os.Stderr, "Added %d allowed commands from command line (total: %d)\n",
					len(inlineCommands), len(cliAllowedCommands))
			}
			break
		}
	}

	// Check for file-based denied commands
	for i := 1; i < len(os.Args); i++ {
		if os.Args[i] == "--denied-commands-file" && i+1 < len(os.Args) {
			deniedCmdsFile := os.Args[i+1]
			fileCommands, err := validation.LoadDeniedCommandsFromFile(deniedCmdsFile)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error loading denied commands from file: %v\n", err)
				os.Exit(1)
			}
			cliDeniedCommands = fileCommands
			fmt.Fprintf(os.Stderr, "Loaded %d denied commands from %s\n", len(fileCommands), deniedCmdsFile)
			break
		}
	}

	// Check for inline denied commands
	for i := 1; i < len(os.Args); i++ {
		if os.Args[i] == "--denied-commands" && i+1 < len(os.Args) {
			deniedCmdsList := os.Args[i+1]
			inlineCommands, err := validation.ParseDeniedCommands(deniedCmdsList)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error parsing denied commands: %v\n", err)
				os.Exit(1)
			}

			// Merge with existing denied commands (if any)
			if cliDeniedCommands == nil {
				cliDeniedCommands = inlineCommands
				fmt.Fprintf(os.Stderr, "Loaded %d denied commands from command line\n", len(inlineCommands))
			} else {
				// Merge inline commands with file commands
				for cmd := range inlineCommands {
					cliDeniedCommands[cmd] = true
				}
				fmt.Fprintf(os.Stderr, "Added %d denied commands from command line (total: %d)\n",
					len(inlineCommands), len(cliDeniedCommands))
			}
			break
		}
	}

	// Set custom validator if any commands were loaded
	if cliAllowedCommands != nil || cliDeniedCommands != nil {
		customValidator := validation.NewValidatorWithCommandsAndDenied(cliAllowedCommands, cliDeniedCommands)
		fastly.SetCustomValidator(customValidator)
	}

	// Handle help and version commands without requiring Fastly CLI
	if command == "help" || command == "--help" || command == "-h" {
		printUsage()
		return
	}
	if command == "version" {
		printVersion()
		return
	}
	// Validate Fastly CLI is installed and authenticated
	if err := fastly.CheckSetup(); err != nil {
		// Check if Fastly CLI is not installed
		if strings.Contains(err.Error(), "not found") {
			// Output human-friendly message for missing CLI
			fmt.Fprintf(os.Stderr, "Fastly CLI is not installed.\n\n")
			fmt.Fprintf(os.Stderr, "To install the Fastly CLI:\n")
			fmt.Fprintf(os.Stderr, "  1. Visit https://developer.fastly.com/reference/cli/\n")
			fmt.Fprintf(os.Stderr, "  2. Follow the installation instructions for your operating system\n\n")
			fmt.Fprintf(os.Stderr, "For macOS with Homebrew: brew install fastly/tap/fastly\n")
			fmt.Fprintf(os.Stderr, "For other systems: Download from https://github.com/fastly/cli/releases\n")
			os.Exit(1)
		}

		// Check if this is an authentication error
		errMsg := strings.ToLower(err.Error())
		if strings.Contains(errMsg, "not authenticated") ||
			strings.Contains(errMsg, "no api token found") ||
			strings.Contains(errMsg, "unauthorized") ||
			strings.Contains(errMsg, "invalid token") ||
			strings.Contains(err.Error(), `"authorized":false`) {
			// Output human-friendly message for authentication errors
			fmt.Fprintf(os.Stderr, "Authentication required for Fastly CLI.\n\n")
			fmt.Fprintf(os.Stderr, "Please authenticate using one of these methods:\n")
			fmt.Fprintf(os.Stderr, "  1. Run 'fastly profile create' to set up authentication\n")
			fmt.Fprintf(os.Stderr, "  2. Set the FASTLY_API_TOKEN environment variable\n\n")
			fmt.Fprintf(os.Stderr, "For more information, visit: https://developer.fastly.com/reference/cli/\n")
			os.Exit(1)
		}

		// For other errors, use JSON response
		errorResponse := types.CommandResponse{
			Success:      false,
			Error:        err.Error(),
			ErrorCode:    "setup_error",
			Command:      "startup-check",
			CommandLine:  "fastly service list --per-page 1",
			Instructions: "The Fastly service is not properly configured. Please ensure proper setup before using these tools.",
			NextSteps: []string{
				"Ensure the Fastly CLI is installed on the system",
				"Verify the FASTLY_API_TOKEN environment variable is set",
				"Check that authentication is properly configured",
				"Run 'fastly profile create' to authenticate if needed",
			},
		}

		if strings.Contains(err.Error(), "not found") {
			errorResponse.ErrorCode = "cli_not_found"
		}
		if err := prettyPrintJSON(errorResponse); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to encode error response: %v\n", err)
		}
		os.Exit(1)
	}

	if command == "" {
		printUsage()
		os.Exit(1)
	}

	switch command {
	case "list-commands":
		listCommands()
	case "execute":
		if len(commandArgs) < 1 {
			printExecuteHelp()
			os.Exit(1)
		}
		executeCommand(commandArgs[0])
	case "describe":
		if len(commandArgs) < 1 {
			printDescribeHelp()
			os.Exit(1)
		}
		describeCommand(commandArgs)
	default:
		fmt.Printf("Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

// prettyPrintJSON outputs JSON data with proper indentation for human readability
func prettyPrintJSON(data interface{}) error {
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	return encoder.Encode(data)
}

// printUsage displays comprehensive help information about the application's usage,
// including both MCP server modes and CLI testing commands with examples.
func printUsage() {
	usage := `Fastly MCP Server / CLI Interface

Usage:
  fastly-mcp                       Run as MCP server over stdio (default)
  fastly-mcp --http [addr:port]    Run as MCP server over HTTP (StreamableHTTP)
  fastly-mcp --http --sse          Run as MCP server over HTTP with SSE
  fastly-mcp <command>             Run in CLI mode with specific command

Options:
  --http [addr:port]       Start HTTP server (default: 127.0.0.1:8080)
  --sse                    Use SSE transport instead of StreamableHTTP
  --sanitize               Enable sanitization of sensitive data (PII, tokens, secrets)
  --allowed-commands-file file  Use custom allowed commands list from file
  --allowed-commands cmds  Use custom allowed commands (comma-separated list)
  --denied-commands-file file   Use custom denied commands list from file
  --denied-commands cmds   Use custom denied commands (comma-separated list)
  --encrypt-tokens         Encrypt secret tokens in tool responses (for LLM safety)
  --log-commands file      Log MCP commands to the specified file

CLI Commands:
  help            Show this help message
  version         Show the version of fastly-mcp
  list-commands   List all available Fastly operations in JSON format
  execute <json>  Execute a Fastly operation from JSON specification
  describe <cmd>  Get detailed help for a specific operation in JSON format

Example JSON for execute:
  {
    "command": "service",
    "args": ["list"],
    "flags": [
      {"name": "json", "value": ""}
    ]
  }

Example usage:
  fastly-mcp                      # Start MCP server (default)
  fastly-mcp help                 # Show this help
  fastly-mcp execute '{"command":"version","args":[]}'
  fastly-mcp describe service
  fastly-mcp list-commands
  fastly-mcp --allowed-commands-file cmds.txt execute '{"command":"version","args":[]}'
  fastly-mcp --allowed-commands service,stats,version execute '{"command":"service","args":["list"]}'
  fastly-mcp --allowed-commands-file cmds.txt --allowed-commands whoami,help # Merge both sources
  fastly-mcp --denied-commands "stats realtime,log-tail"  # Override default denied commands
  fastly-mcp --denied-commands-file denied.txt            # Load denied commands from file

Default denied commands:
  stats realtime, log-tail (real-time monitoring)
  vcl custom create/update/describe (VCL upload/download)
  vcl snippet create/update/describe (snippet upload/download)
`
	fmt.Print(usage)
}

// printVersion displays the current version of fastly-mcp
func printVersion() {
	fmt.Printf("fastly-mcp version %s\n", version.GetVersion())
}

// printExecuteHelp outputs a structured help response for the execute command,
// explaining the required JSON format and providing usage examples.
func printExecuteHelp() {
	help := types.CommandResponse{
		Success:      false,
		Error:        "Missing JSON operation specification",
		Command:      "",
		CommandLine:  "",
		Instructions: "The fastly_execute tool requires proper parameters to perform operations.",
		NextSteps: []string{
			"Provide command, args, and flags parameters",
			"Example: {\"command\":\"version\",\"args\":[],\"flags\":[]}",
			"Example: {\"command\":\"service\",\"args\":[\"list\"],\"flags\":[{\"name\":\"json\"}]}",
			"Use the fastly_list_commands tool to see available operations",
			"Use the fastly_describe tool to learn about specific operations",
		},
	}
	if err := prettyPrintJSON(help); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to encode help: %v\n", err)
	}
}

// printDescribeHelp outputs a structured help response for the describe command,
// explaining how to get detailed information about Fastly operations.
func printDescribeHelp() {
	help := types.HelpInfo{
		Command:      "describe",
		Description:  "Get detailed information about Fastly operations",
		Instructions: "The 'describe' command requires at least one operation name to describe.",
		UsageSyntax:  "describe [operation] [sub-operation...]",
		UsageExamples: []string{
			"Use fastly_describe with command='service'",
			"Use fastly_describe with command='service list'",
			"Use fastly_describe with command='backend create'",
			"Use fastly_describe with command='compute build'",
		},
		NextSteps: []string{
			"Use the fastly_list_commands tool to see all available operations",
			"Provide the operation name in the 'command' parameter",
			"For sub-operations, include the full command path (e.g., 'service list')",
		},
	}
	if err := prettyPrintJSON(help); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to encode help: %v\n", err)
	}
}

// listCommands retrieves and outputs all available Fastly commands in JSON format.
// It uses the Fastly CLI's help output to discover available operations.
func listCommands() {
	response := fastly.GetCommandList()
	if err := prettyPrintJSON(response); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to encode response: %v\n", err)
	}
}

// executeCommand parses a JSON specification and executes the corresponding Fastly CLI command.
// The JSON should contain 'command', 'args', and 'flags' fields as defined in types.CommandRequest.
// It returns a structured response with the command output or error information.
func executeCommand(jsonSpec string) {
	var req types.CommandRequest
	if err := json.Unmarshal([]byte(jsonSpec), &req); err != nil {
		response := types.CommandResponse{
			Success: false,
			Error:   fmt.Sprintf("Invalid JSON: %v", err),
		}
		if err := prettyPrintJSON(response); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to encode response: %v\n", err)
		}
		return
	}

	response := fastly.ExecuteCommand(req)
	if err := prettyPrintJSON(response); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to encode response: %v\n", err)
	}
}

// describeCommand retrieves detailed help information for a specific Fastly operation.
// The cmdPath parameter represents the command hierarchy (e.g., ["service", "list"]).
// It returns structured help information including usage, flags, and examples.
func describeCommand(cmdPath []string) {
	helpInfo := fastly.DescribeCommand(cmdPath)
	if err := prettyPrintJSON(helpInfo); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to encode help info: %v\n", err)
	}
}

// Package mcp implements the Model Context Protocol server for Fastly CLI operations.
// It provides the bridge between AI agents using the MCP protocol and the Fastly CLI,
// enabling tool-based interaction with Fastly services. The server supports multiple
// transport modes including stdio (default), HTTP with StreamableHTTP, and HTTP with SSE.
package mcp

import (
	"context"
	"fmt"
	"log"
	"net"
	"strings"
	"time"

	"github.com/fastly/mcp/internal/fastly"
	"github.com/fastly/mcp/internal/types"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// FastlyTool implements the MCP tool interface for Fastly operations.
// It provides handlers for the three core Fastly operations:
// list_commands, describe, and execute.
type FastlyTool struct {
	setupChecked bool
	setupError   error
}

// checkSetup validates the Fastly CLI setup once and caches the result.
// This ensures setup validation happens within the MCP protocol context,
// allowing proper JSON-RPC error responses instead of failing at startup.
func (ft *FastlyTool) checkSetup() error {
	if !ft.setupChecked {
		ft.setupError = fastly.CheckSetup()
		ft.setupChecked = true
	}
	return ft.setupError
}

// CreateServer creates and configures the MCP server instance with all available tools.
// It registers:
//   - fastly_list_commands: Discovers available Fastly operations
//   - fastly_describe: Provides detailed help for specific operations
//   - fastly_execute: Executes Fastly CLI commands with safety checks
//   - current_time: Utility tool for getting current time information
func CreateServer() (*server.MCPServer, error) {
	fastlyTool := &FastlyTool{}

	s := server.NewMCPServer(
		"Fastly CLI MCP Server",
		"1.0.0",
		func(s *server.MCPServer) {
			s.AddTool(mcp.Tool{
				Name:        "fastly_list_commands",
				Description: "List all available Fastly operations and commands",
				InputSchema: mcp.ToolInputSchema{
					Type:       "object",
					Properties: map[string]interface{}{},
				},
			}, fastlyTool.makeListCommandsHandler())

			s.AddTool(mcp.Tool{
				Name:        "fastly_describe",
				Description: "Get detailed information about a Fastly operation, including parameters and examples",
				InputSchema: mcp.ToolInputSchema{
					Type: "object",
					Properties: map[string]interface{}{
						"command": map[string]interface{}{
							"type":        "string",
							"description": "The Fastly command to describe (e.g., 'service', 'service list', 'backend create')",
						},
					},
					Required: []string{"command"},
				},
			}, fastlyTool.makeDescribeHandler())

			s.AddTool(mcp.Tool{
				Name:        "fastly_execute",
				Description: "Execute a Fastly operation with the specified parameters",
				InputSchema: mcp.ToolInputSchema{
					Type: "object",
					Properties: map[string]interface{}{
						"command": map[string]interface{}{
							"type":        "string",
							"description": "The Fastly command to execute (e.g., 'service', 'backend', 'acl')",
						},
						"args": map[string]interface{}{
							"type":        "array",
							"description": "Arguments for the command (e.g., ['list'], ['create'], ['delete'])",
							"items": map[string]interface{}{
								"type": "string",
							},
						},
						"flags": map[string]interface{}{
							"type":        "array",
							"description": "Command flags with optional values",
							"items": map[string]interface{}{
								"type": "object",
								"properties": map[string]interface{}{
									"name": map[string]interface{}{
										"type":        "string",
										"description": "Flag name without dashes (e.g., 'service-id', 'json')",
									},
									"value": map[string]interface{}{
										"type":        "string",
										"description": "Flag value (omit for boolean flags)",
									},
								},
								"required": []string{"name"},
							},
						},
					},
					Required: []string{"command"},
				},
			}, fastlyTool.makeExecuteHandler())

			s.AddTool(mcp.Tool{
				Name:        "current_time",
				Description: "Get current timestamp for logs, API calls, scheduling, or time-based operations. Returns Unix timestamp, ISO 8601, UTC, and local time formats. Use when: generating timestamps for API calls, time-based filtering for stats/logs, recording operation times, or calculating time windows.",
				InputSchema: mcp.ToolInputSchema{
					Type:       "object",
					Properties: map[string]interface{}{},
				},
			}, getCurrentTime)
		},
	)

	return s, nil
}

// InitServer initializes and starts the MCP server on stdio for standard input/output communication.
// This is the default mode used when the server is launched without HTTP flags.
// It enables direct communication with AI agents through stdin/stdout pipes.
func InitServer(logCommandsFile string) error {
	// Initialize command logger if specified
	if err := InitializeCommandLogger(logCommandsFile); err != nil {
		return fmt.Errorf("failed to initialize command logger: %w", err)
	}
	defer CloseCommandLogger()

	// Initialize token crypto for encrypting sensitive data in responses
	if err := InitializeTokenCrypto(fastly.GetTokenEncryptionEnabled()); err != nil {
		return fmt.Errorf("failed to initialize token crypto: %w", err)
	}

	s, err := CreateServer()
	if err != nil {
		return err
	}

	return server.ServeStdio(s)
}

// RunHTTPServer runs the MCP server in HTTP mode with either SSE or StreamableHTTP transport.
// Parameters:
//   - addr: The address to bind the HTTP server to (e.g., "127.0.0.1:8080")
//   - useSSE: If true, uses Server-Sent Events; otherwise uses StreamableHTTP
//   - logCommandsFile: If non-empty, log commands to this file
//
// The server will print connection information and wait for incoming connections.
func RunHTTPServer(addr string, useSSE bool, logCommandsFile string) {
	// Initialize command logger if specified
	if err := InitializeCommandLogger(logCommandsFile); err != nil {
		log.Fatalf("Failed to initialize command logger: %v", err)
	}
	defer CloseCommandLogger()

	// Initialize token crypto for encrypting sensitive data in responses
	if err := InitializeTokenCrypto(fastly.GetTokenEncryptionEnabled()); err != nil {
		log.Fatalf("Failed to initialize token crypto: %v", err)
	}

	mcpServer, err := CreateServer()
	if err != nil {
		log.Fatalf("Failed to create MCP server: %v", err)
	}

	var transport string
	var endpoint string

	if useSSE {
		transport = "SSE"
		endpoint = "/sse"

		sseServer := server.NewSSEServer(
			mcpServer,
			server.WithSSEEndpoint(endpoint),
			server.WithMessageEndpoint("/message"),
			server.WithBaseURL(fmt.Sprintf("http://%s", addr)),
		)

		fmt.Printf("\nFastly MCP Server running in HTTP mode with %s transport\n", transport)
		fmt.Printf("Server address: http://%s\n", addr)
		fmt.Printf("\nConfigure your AI agent with:\n")
		fmt.Printf("  URL: http://%s%s\n", addr, endpoint)
		fmt.Printf("  Transport: %s\n", transport)
		fmt.Printf("\nThe server is ready to accept connections.\n")

		if err := sseServer.Start(addr); err != nil {
			log.Fatalf("Failed to start SSE server: %v", err)
		}
	} else {
		transport = "StreamableHTTP"
		endpoint = "/mcp"

		httpServer := server.NewStreamableHTTPServer(
			mcpServer,
			server.WithEndpointPath(endpoint),
		)

		fmt.Printf("\nFastly MCP Server running in HTTP mode with %s transport\n", transport)
		fmt.Printf("Server address: http://%s\n", addr)
		fmt.Printf("\nConfigure your AI agent with:\n")
		fmt.Printf("  URL: http://%s%s\n", addr, endpoint)
		fmt.Printf("  Transport: %s\n", transport)
		fmt.Printf("\nThe server is ready to accept connections.\n")

		if err := httpServer.Start(addr); err != nil {
			log.Fatalf("Failed to start HTTP server: %v", err)
		}
	}
}

// Helper functions to convert between internal and external flag types
func convertFlags(flags []types.Flag) []Flag {
	result := make([]Flag, len(flags))
	for i, f := range flags {
		result[i] = Flag{Name: f.Name, Value: f.Value}
	}
	return result
}

func convertFlagsBack(flags []Flag) []types.Flag {
	result := make([]types.Flag, len(flags))
	for i, f := range flags {
		result[i] = types.Flag{Name: f.Name, Value: f.Value}
	}
	return result
}

// NormalizeAddress normalizes the HTTP server address to ensure a valid host:port format.
// It handles various input formats:
//   - Empty string -> "127.0.0.1:8080"
//   - ":8080" -> "127.0.0.1:8080"
//   - "localhost" -> "localhost:8080"
//   - "192.168.1.1:9000" -> unchanged
func NormalizeAddress(addr string) string {
	if addr == "" {
		return "127.0.0.1:8080"
	}

	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		// Check if it's just a port (like ":8080")
		if strings.HasPrefix(addr, ":") {
			host = "127.0.0.1"
			port = strings.TrimPrefix(addr, ":")
			return net.JoinHostPort(host, port)
		} else if !strings.Contains(addr, ":") {
			return net.JoinHostPort(addr, "8080")
		}
	}

	if host == "" {
		host = "127.0.0.1"
	}

	return net.JoinHostPort(host, port)
}

// makeListCommandsHandler creates the handler for the fastly_list_commands tool.
// This handler returns a comprehensive list of all available Fastly CLI operations
// by parsing the CLI's help output. The response includes command descriptions
// and suggested next steps for using the commands.
func (ft *FastlyTool) makeListCommandsHandler() server.ToolHandlerFunc {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		start := time.Now()
		params := request.GetArguments()

		result, err := executeWithSetupCheck(ctx, ft, "list_commands", func() (*mcp.CallToolResult, error) {
			commands := fastly.GetCommandList()

			return &mcp.CallToolResult{
				Content: []mcp.Content{
					&mcp.TextContent{
						Type: "text",
						Text: toJSON(commands),
					},
				},
			}, nil
		})

		// Log the command
		LogCommand("fastly_list_commands", params, result, err, time.Since(start))

		return result, err
	}
}

// makeDescribeHandler creates the handler for the fastly_describe tool.
// This handler provides detailed help information for a specific Fastly command,
// including usage syntax, available flags, required parameters, and examples.
// The command parameter can be a single command or a command path (e.g., "service list").
func (ft *FastlyTool) makeDescribeHandler() server.ToolHandlerFunc {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		start := time.Now()
		params := request.GetArguments()
		command, ok := params["command"].(string)
		if !ok {
			err := fmt.Errorf("command parameter must be a string")
			LogCommand("fastly_describe", params, nil, err, time.Since(start))
			return nil, err
		}

		result, err := executeWithSetupCheck(ctx, ft, "describe", func() (*mcp.CallToolResult, error) {
			// Decrypt any encrypted tokens in the command string
			if tokenCrypto != nil && tokenCrypto.Enabled {
				command = tokenCrypto.DecryptTokensInString(command)
			}

			parts := strings.Fields(command)
			helpInfo := fastly.DescribeCommand(parts)

			return &mcp.CallToolResult{
				Content: []mcp.Content{
					&mcp.TextContent{
						Type: "text",
						Text: toJSON(helpInfo),
					},
				},
			}, nil
		})

		// Log the command
		LogCommand("fastly_describe", params, result, err, time.Since(start))

		return result, err
	}
}

// makeExecuteHandler creates the handler for the fastly_execute tool.
// This handler executes actual Fastly CLI commands with proper validation:
//   - Validates required parameters and flags
//   - Checks for dangerous operations and requires --user-reviewed flag
//   - Executes commands with timeout protection
//   - Returns structured responses with output, errors, and metadata
//
// The handler enforces safety measures to prevent accidental destructive operations.
func (ft *FastlyTool) makeExecuteHandler() server.ToolHandlerFunc {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		start := time.Now()
		params := request.GetArguments()

		command, ok := params["command"].(string)
		if !ok {
			err := fmt.Errorf("command parameter must be a string")
			LogCommand("fastly_execute", params, nil, err, time.Since(start))
			return nil, err
		}

		result, err := executeWithSetupCheck(ctx, ft, "execute", func() (*mcp.CallToolResult, error) {
			// Decrypt any encrypted tokens in the command string
			if tokenCrypto != nil && tokenCrypto.Enabled {
				command = tokenCrypto.DecryptTokensInString(command)
			}

			var args []string
			if argsParam, ok := params["args"].([]interface{}); ok {
				for _, arg := range argsParam {
					if argStr, ok := arg.(string); ok {
						// Decrypt any encrypted tokens in the argument
						if tokenCrypto != nil && tokenCrypto.Enabled {
							argStr = tokenCrypto.DecryptTokensInString(argStr)
						}
						args = append(args, argStr)
					}
				}
			}

			var flags []types.Flag
			if flagsParam, ok := params["flags"].([]interface{}); ok {
				for _, flagItem := range flagsParam {
					if flagMap, ok := flagItem.(map[string]interface{}); ok {
						flag := types.Flag{}
						if name, ok := flagMap["name"].(string); ok {
							flag.Name = name
						}
						if value, ok := flagMap["value"].(string); ok {
							// Decrypt any encrypted tokens in flag values
							if tokenCrypto != nil && tokenCrypto.Enabled {
								value = tokenCrypto.DecryptTokensInString(value)
							}
							flag.Value = value
						}
						if flag.Name != "" {
							flags = append(flags, flag)
						}
					}
				}
			}

			// Apply intelligent preprocessing
			processedCmd, processedArgs, processedFlags, err := IntelligentPreprocess(command, args, convertFlags(flags))
			if err != nil {
				return nil, fmt.Errorf("preprocessing failed: %w", err)
			}

			cmdReq := types.CommandRequest{
				Command: processedCmd,
				Args:    processedArgs,
				Flags:   convertFlagsBack(processedFlags),
			}

			response := fastly.ExecuteCommand(cmdReq)

			// Extract context from the response for future use
			ExtractContext(processedCmd, processedArgs, processedFlags, response, response.Success)

			// Enhance error responses with intelligent suggestions
			if !response.Success && response.Error != "" {
				suggestions := GetSuggestions(response.Error)
				if len(suggestions) > 0 {
					response.NextSteps = append(suggestions, response.NextSteps...)
				}
			}

			return &mcp.CallToolResult{
				Content: []mcp.Content{
					&mcp.TextContent{
						Type: "text",
						Text: toJSON(response),
					},
				},
			}, nil
		})

		// Log the command
		LogCommand("fastly_execute", params, result, err, time.Since(start))

		return result, err
	}
}

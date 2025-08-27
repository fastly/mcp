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

	"github.com/fastly/mcp/internal/cache"
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
				Description: "Execute a Fastly operation. Examples: For 'service list' use {\"command\":\"service\",\"args\":[\"list\"]}. For 'backend create' use {\"command\":\"backend\",\"args\":[\"create\"]}.",
				InputSchema: mcp.ToolInputSchema{
					Type: "object",
					Properties: map[string]interface{}{
						"command": map[string]interface{}{
							"type":        "string",
							"description": "The base Fastly command (e.g., 'service', 'backend', 'acl'). Do NOT include subcommands here.",
						},
						"args": map[string]interface{}{
							"type":        "array",
							"description": "Subcommands and arguments. For 'service list', use command='service' and args=['list']. Do NOT duplicate subcommands.",
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

			// Cache retrieval tools
			s.AddTool(mcp.Tool{
				Name:        "fastly_result_read",
				Description: "Read paginated data from a cached result. Use this to retrieve portions of large command outputs.",
				InputSchema: mcp.ToolInputSchema{
					Type: "object",
					Properties: map[string]interface{}{
						"result_id": map[string]interface{}{
							"type":        "string",
							"description": "The ID of the cached result to read from",
						},
						"offset": map[string]interface{}{
							"type":        "number",
							"description": "Starting position (0-based index for arrays/lines)",
							"default":     0,
						},
						"limit": map[string]interface{}{
							"type":        "number",
							"description": "Number of items/lines to return (default: 20)",
							"default":     20,
						},
					},
					Required: []string{"result_id"},
				},
			}, makeResultReadHandler())

			s.AddTool(mcp.Tool{
				Name:        "fastly_result_query",
				Description: "Query/filter cached result data. For arrays: use 'field=value' filters. For text: searches for matching lines.",
				InputSchema: mcp.ToolInputSchema{
					Type: "object",
					Properties: map[string]interface{}{
						"result_id": map[string]interface{}{
							"type":        "string",
							"description": "The ID of the cached result to query",
						},
						"filter": map[string]interface{}{
							"type":        "string",
							"description": "Filter expression (e.g., 'name=production', 'error', 'status.code=200')",
						},
					},
					Required: []string{"result_id", "filter"},
				},
			}, makeResultQueryHandler())

			s.AddTool(mcp.Tool{
				Name:        "fastly_result_summary",
				Description: "Get a summary of cached result including metadata, structure, and statistics.",
				InputSchema: mcp.ToolInputSchema{
					Type: "object",
					Properties: map[string]interface{}{
						"result_id": map[string]interface{}{
							"type":        "string",
							"description": "The ID of the cached result to summarize",
						},
					},
					Required: []string{"result_id"},
				},
			}, makeResultSummaryHandler())

			s.AddTool(mcp.Tool{
				Name:        "fastly_result_list",
				Description: "List all currently cached results with their IDs and metadata.",
				InputSchema: mcp.ToolInputSchema{
					Type:       "object",
					Properties: map[string]interface{}{},
				},
			}, makeResultListHandler())

			s.AddPrompt(mcp.NewPrompt("system_prompt",
				mcp.WithPromptDescription("Returns the Fastly MCP system prompt that describes available tools and workflow"),
			), handleSystemPrompt)
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
			return newSuccessResult(commands), nil
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

			return newSuccessResult(helpInfo), nil
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
				suggestions := GetSuggestions(response.Error, processedCmd, processedArgs)
				if len(suggestions) > 0 {
					response.NextSteps = append(suggestions, response.NextSteps...)
				}
			}

			// Use appropriate result helper based on success status
			if response.Success {
				return newSuccessResult(response), nil
			}
			return newErrorResult(response), nil
		})

		// Log the command
		LogCommand("fastly_execute", params, result, err, time.Since(start))

		return result, err
	}
}

// makeResultReadHandler creates a handler for reading cached results.
func makeResultReadHandler() server.ToolHandlerFunc {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		params := request.GetArguments()
		resultID, ok := params["result_id"].(string)
		if !ok {
			return nil, fmt.Errorf("result_id is required")
		}

		offset := 0
		if o, ok := params["offset"].(float64); ok {
			offset = int(o)
		}

		limit := 20
		if l, ok := params["limit"].(float64); ok {
			limit = int(l)
		}

		store := cache.GetStore()
		data, err := store.Read(resultID, offset, limit)
		if err != nil {
			return newErrorResult(map[string]interface{}{
				"error": err.Error(),
			}), nil
		}

		return newSuccessResult(map[string]interface{}{
			"success": true,
			"data":    data,
			"offset":  offset,
			"limit":   limit,
		}), nil
	}
}

// makeResultQueryHandler creates a handler for querying cached results.
func makeResultQueryHandler() server.ToolHandlerFunc {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		params := request.GetArguments()
		resultID, ok := params["result_id"].(string)
		if !ok {
			return nil, fmt.Errorf("result_id is required")
		}

		filter, ok := params["filter"].(string)
		if !ok {
			return nil, fmt.Errorf("filter is required")
		}

		store := cache.GetStore()
		data, err := store.Query(resultID, filter)
		if err != nil {
			return newErrorResult(map[string]interface{}{
				"error": err.Error(),
			}), nil
		}

		return newSuccessResult(map[string]interface{}{
			"success": true,
			"filter":  filter,
			"results": data,
		}), nil
	}
}

// makeResultSummaryHandler creates a handler for getting result summaries.
func makeResultSummaryHandler() server.ToolHandlerFunc {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		params := request.GetArguments()
		resultID, ok := params["result_id"].(string)
		if !ok {
			return nil, fmt.Errorf("result_id is required")
		}

		store := cache.GetStore()
		summary, err := store.GetSummary(resultID)
		if err != nil {
			return newErrorResult(map[string]interface{}{
				"error": err.Error(),
			}), nil
		}

		return newSuccessResult(summary), nil
	}
}

// makeResultListHandler creates a handler for listing cached results.
func makeResultListHandler() server.ToolHandlerFunc {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		store := cache.GetStore()
		results := store.List()

		return newSuccessResult(map[string]interface{}{
			"success": true,
			"results": results,
			"count":   len(results),
		}), nil
	}
}

// handleSystemPrompt returns the system prompt content for Fastly MCP
func handleSystemPrompt(ctx context.Context, request mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
	systemPromptContent := `You have access to Fastly's CDN/edge platform via MCP tools that wrap the Fastly CLI.

#### Tools:
- **` + "`fastly_list_commands`" + `** - List available commands
- **` + "`fastly_describe [command]`" + `** - Get command details/parameters
- **` + "`fastly_execute`" + `** - Run commands with parameters
- **` + "`current_time`" + `** - Get timestamps

#### Cache Tools (for large outputs):
- **` + "`fastly_result_read`" + `** - Read paginated data from cached results
- **` + "`fastly_result_query`" + `** - Query/filter cached results
- **` + "`fastly_result_summary`" + `** - Get summary of cached data
- **` + "`fastly_result_list`" + `** - List all cached results

#### Core Operations:
- **Services**: Create/update/list CDN services, manage versions
- **Edge Config**: VCL, ACLs, dictionaries, Compute
- **Content**: Backends, domains, caching, purging
- **Security**: TLS, secrets, access controls
- **Monitoring**: Stats, logs, alerts

#### Critical Rules:
1. **ALWAYS use ` + "`fastly_describe`" + ` before executing any unfamiliar command**
2. **Destructive operations require ` + "`--user-reviewed: true`" + `** flag after human approval:
   - ` + "`delete`" + `, ` + "`remove`" + `, ` + "`purge`" + `, ` + "`create`" + `, ` + "`update`" + ` commands
   - Always explain impact and get human confirmation first
3. **Some commands support JSON output via an extra command parameter**
4. **Most commands need ` + "`--service-id`" + `**
5. **Clone versions before changes**
6. Use ` + "`current_time`" + ` before operations that need timestamps

#### Workflow:

~~~
# Discover
fastly_describe command="service list"

# Execute (safe)
fastly_execute command="service list" parameters={"format": "json"}

# Execute (destructive - needs human review)
fastly_execute command="cache purge" parameters={
  "service-id": "ABC123",
  "key": "/api/*",
  "user-reviewed": true
}
~~~`

	return &mcp.GetPromptResult{
		Description: "Fastly MCP system prompt describing available tools and workflow",
		Messages: []mcp.PromptMessage{
			{
				Role: mcp.RoleUser,
				Content: mcp.TextContent{
					Type: "text",
					Text: systemPromptContent,
				},
			},
		},
	}, nil
}

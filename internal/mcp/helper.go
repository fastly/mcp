// Package mcp implements the Model Context Protocol server for Fastly CLI operations.
// This file contains helper functions for error handling, token encryption, and JSON formatting.
package mcp

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/fastly/mcp/internal/crypto"
	"github.com/fastly/mcp/internal/fastly"
	"github.com/mark3labs/mcp-go/mcp"
)

// handleSetupError creates a consistent error response for setup failures across all handlers.
// It analyzes the error message to provide appropriate error codes (cli_not_found, auth_required)
// and returns a properly formatted MCP CallToolResult with the error details and IsError set to true.
func handleSetupError(err error, command string) *mcp.CallToolResult {
	errorResponse := fastly.SetupError(command, err)

	// Refine error code based on specific error
	if strings.Contains(err.Error(), "not found") {
		errorResponse.ErrorCode = "cli_not_found"
	} else if strings.Contains(err.Error(), "not authenticated") || strings.Contains(err.Error(), "Not authenticated") {
		errorResponse.ErrorCode = "auth_required"
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{
				Type: "text",
				Text: toJSON(errorResponse),
			},
		},
		IsError: true,
	}
}

// tokenCrypto is the global instance for encrypting/decrypting sensitive tokens in API responses.
// It is initialized once at server startup based on the FASTLY_TOKEN_ENCRYPTION_ENABLED setting.
var tokenCrypto *crypto.TokenCrypto

// InitializeTokenCrypto initializes the global token crypto instance.
// If enabled is true, it sets up encryption for sensitive tokens in API responses.
// This must be called once during server initialization before any tool handlers are invoked.
func InitializeTokenCrypto(enabled bool) error {
	tc, err := crypto.NewTokenCrypto(enabled)
	if err != nil {
		return err
	}
	tokenCrypto = tc
	return nil
}

// toJSON safely marshals data to JSON string with proper indentation.
// If token encryption is enabled, it automatically encrypts any sensitive tokens
// found in the JSON output before returning the string.
func toJSON(v interface{}) string {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		// Marshal error response properly instead of using string literal
		errorResp := map[string]string{"error": "Failed to marshal response"}
		if errorData, _ := json.Marshal(errorResp); errorData != nil {
			return string(errorData)
		}
		// Fallback (should never happen)
		return `{"error": "Failed to marshal response"}`
	}

	result := string(data)

	// If token encryption is enabled, encrypt tokens in the JSON output
	if tokenCrypto != nil && tokenCrypto.Enabled {
		result = tokenCrypto.EncryptTokensInString(result)
	}

	return result
}

// executeWithSetupCheck is a wrapper that validates Fastly CLI setup before executing tool handlers.
// It ensures the CLI is properly installed and configured, returning appropriate error responses
// if setup validation fails. This prevents tool execution when prerequisites are not met.
func executeWithSetupCheck(ctx context.Context, ft *FastlyTool, command string, handler func() (*mcp.CallToolResult, error)) (*mcp.CallToolResult, error) {
	if err := ft.checkSetup(); err != nil {
		return handleSetupError(err, command), nil
	}

	return handler()
}

// newErrorResult creates a properly formatted error result with IsError set to true.
// This helper ensures consistent error handling across all tool handlers.
func newErrorResult(response interface{}) *mcp.CallToolResult {
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{
				Type: "text",
				Text: toJSON(response),
			},
		},
		IsError: true,
	}
}

// newSuccessResult creates a properly formatted success result.
// This helper ensures consistent response handling across all tool handlers.
func newSuccessResult(response interface{}) *mcp.CallToolResult {
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{
				Type: "text",
				Text: toJSON(response),
			},
		},
		IsError: false,
	}
}

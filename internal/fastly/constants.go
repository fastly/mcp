// Package fastly provides functionality for executing and managing Fastly CLI commands.
package fastly

import "time"

const (
	// CommandTimeout is the maximum time a Fastly CLI command can run before being forcefully terminated.
	// This prevents commands from hanging indefinitely and ensures the MCP server remains responsive.
	CommandTimeout = 30 * time.Second

	// MaxOutputSize is the maximum size of command output to return in a single response (in bytes).
	// Outputs larger than this will be truncated to prevent memory issues and ensure reasonable response times.
	// Set to 50KB to handle most command outputs while preventing excessive memory usage.
	MaxOutputSize = 50000 // 50KB

	// MaxJSONArrayItems is the maximum number of items to return when a command outputs a JSON array.
	// This limit helps manage response size for list operations that could potentially return thousands of items.
	// When exceeded, the array is truncated and a warning is included in the response.
	MaxJSONArrayItems = 100
)

// Package types defines the data structures used for communication between the MCP server
// and the Fastly CLI. These types ensure type-safe interaction between AI agents and Fastly services.
package types

// CommandRequest represents a request to execute a Fastly CLI command.
type CommandRequest struct {
	// Command is the primary Fastly CLI command (e.g., "service", "compute", "backend")
	Command string `json:"command"`
	// Args are the subcommands and positional arguments (e.g., ["list"], ["create", "--name=example"])
	Args []string `json:"args"`
	// Flags are the command-line flags and their values
	Flags []Flag `json:"flags,omitempty"`
}

// Flag represents a command-line flag with an optional value.
type Flag struct {
	// Name is the flag name without leading dashes (e.g., "service-id", "json")
	Name string `json:"name"`
	// Value is the flag's value; empty for boolean flags
	Value string `json:"value,omitempty"`
}

// CommandResponse represents the result of executing a Fastly CLI command.
type CommandResponse struct {
	// Success indicates whether the command executed successfully
	Success bool `json:"success"`
	// Output contains the command's text output with ANSI escape sequences removed
	Output string `json:"output,omitempty"`
	// OutputJSON contains parsed JSON when the command was run with --json flag
	OutputJSON interface{} `json:"output_json,omitempty"`
	// Error contains the error message if the command failed
	Error string `json:"error,omitempty"`
	// ErrorCode provides a machine-readable error identifier
	ErrorCode string `json:"error_code,omitempty"`
	// Command is the primary command that was executed
	Command string `json:"command"`
	// CommandLine is the full command line string as executed
	CommandLine string `json:"command_line"`
	// Instructions provides AI-agent guidance for interpreting the results
	Instructions string `json:"instructions,omitempty"`
	// NextSteps suggests follow-up commands or actions
	NextSteps []string `json:"next_steps,omitempty"`
	// Pagination contains details about truncated output
	Pagination *PaginationInfo `json:"pagination,omitempty"`
	// Metadata contains additional context about the executed operation
	Metadata *OperationMetadata `json:"metadata,omitempty"`
	// ResultID is the ID of cached result when output is large
	ResultID string `json:"result_id,omitempty"`
	// Cached indicates if the result was cached due to size
	Cached bool `json:"cached,omitempty"`
	// CacheMetadata contains information about the cached result
	CacheMetadata *CacheMetadata `json:"cache_metadata,omitempty"`
	// Preview contains a small sample of cached data
	Preview interface{} `json:"preview,omitempty"`
}

// OperationMetadata describes the type and safety characteristics of an operation.
type OperationMetadata struct {
	// ResourceType identifies the affected Fastly resource (e.g., "service", "backend")
	ResourceType string `json:"resource_type,omitempty"`
	// OperationType categorizes the operation (e.g., "read", "write", "delete")
	OperationType string `json:"operation_type"`
	// IsSafe indicates whether the operation is non-destructive
	IsSafe bool `json:"is_safe"`
	// RequiresAuth indicates whether the operation requires authentication
	RequiresAuth bool `json:"requires_auth"`
}

// PaginationInfo describes output that was truncated due to size limits.
type PaginationInfo struct {
	// TotalSize is the original output size in bytes before truncation
	TotalSize int `json:"total_size"`
	// ReturnedSize is the actual returned output size in bytes
	ReturnedSize int `json:"returned_size"`
	// Truncated indicates whether the output was truncated
	Truncated bool `json:"truncated"`
	// TruncationNote provides guidance for retrieving the complete output
	TruncationNote string `json:"truncation_note,omitempty"`
}

// CacheMetadata contains information about a cached result.
type CacheMetadata struct {
	// ResultID is the unique identifier for the cached result
	ResultID string `json:"result_id"`
	// TotalSize is the size of the cached data in bytes
	TotalSize int `json:"total_size"`
	// DataType describes the type of data (json_array, json_object, text)
	DataType string `json:"data_type"`
	// TotalItems is the number of items (for arrays)
	TotalItems int `json:"total_items,omitempty"`
	// TotalLines is the number of lines (for text)
	TotalLines int `json:"total_lines,omitempty"`
}

// HelpInfo provides structured help documentation for a Fastly CLI command.
type HelpInfo struct {
	// Command is the full command string (e.g., "service list")
	Command string `json:"command"`
	// Description explains what the command does
	Description string `json:"description"`
	// UsageSyntax shows the command syntax with placeholders
	UsageSyntax string `json:"usage_syntax,omitempty"`
	// UsageExamples provides example MCP tool invocations
	UsageExamples []string `json:"usage_examples,omitempty"`
	// UsageCommands shows example raw Fastly CLI command lines
	UsageCommands []string `json:"usage_commands,omitempty"`
	// RequiredFlags lists mandatory flags for the command
	RequiredFlags []FlagInfo `json:"required_flags,omitempty"`
	// Flags lists all available flags for the command
	Flags []FlagInfo `json:"flags,omitempty"`
	// Subcommands lists available subcommands
	Subcommands []SubcommandInfo `json:"subcommands,omitempty"`
	// Instructions provides guidance for AI agents using this command
	Instructions string `json:"instructions,omitempty"`
	// NextSteps suggests related commands to try next
	NextSteps []string `json:"next_steps,omitempty"`
	// Category groups the command by functional area (e.g., "Service Management")
	Category string `json:"category,omitempty"`
	// ResourceType identifies the Fastly resource type
	ResourceType string `json:"resource_type,omitempty"`
}

// FlagInfo describes a command-line flag and its usage.
type FlagInfo struct {
	// Name is the flag's long form without dashes (e.g., "service-id")
	Name string `json:"name"`
	// Short is the single-letter flag alias without dash (e.g., "s")
	Short string `json:"short,omitempty"`
	// Description describes the flag's purpose
	Description string `json:"description"`
	// Type specifies the flag's value type (e.g., "string", "bool", "int")
	Type string `json:"type,omitempty"`
}

// SubcommandInfo describes a subcommand or top-level command.
type SubcommandInfo struct {
	// Name is the subcommand name
	Name string `json:"name"`
	// Description briefly explains what the subcommand does
	Description string `json:"description"`
}

// CommandListResponse provides a catalog of available Fastly CLI commands.
type CommandListResponse struct {
	// Description summarizes the available commands
	Description string `json:"description"`
	// Commands lists all top-level Fastly commands
	Commands []SubcommandInfo `json:"commands"`
	// NextSteps suggests how to explore and use the commands
	NextSteps []string `json:"next_steps"`
}

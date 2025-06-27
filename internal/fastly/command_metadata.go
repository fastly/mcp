// Package fastly provides functionality for executing and managing Fastly CLI commands.
package fastly

import "strings"

// CommandMetadata holds metadata about a Fastly CLI command.
type CommandMetadata struct {
	// ResourceType identifies the type of Fastly resource the command operates on
	// (e.g., "service", "acl", "dictionary", "auth")
	ResourceType string

	// Category groups commands by their functional area
	// (e.g., "configuration", "edge-logic", "security", "monitoring")
	Category string

	// RequiresAuth indicates whether the command requires authentication
	// (most commands do, except for version and some utility commands)
	RequiresAuth bool
}

// commandMetadataMap maps Fastly CLI command names to their metadata.
// This is used to categorize commands and determine their authentication requirements.
var commandMetadataMap = map[string]CommandMetadata{
	// Service management
	"service":         {ResourceType: "service", Category: "configuration", RequiresAuth: true},
	"service-version": {ResourceType: "service", Category: "configuration", RequiresAuth: true},
	"backend":         {ResourceType: "service-component", Category: "configuration", RequiresAuth: true},
	"healthcheck":     {ResourceType: "service-component", Category: "configuration", RequiresAuth: true},
	"domain":          {ResourceType: "service-component", Category: "configuration", RequiresAuth: true},

	// Edge logic
	"acl":              {ResourceType: "acl", Category: "edge-logic", RequiresAuth: true},
	"acl-entry":        {ResourceType: "acl", Category: "edge-logic", RequiresAuth: true},
	"dictionary":       {ResourceType: "dictionary", Category: "edge-logic", RequiresAuth: true},
	"dictionary-entry": {ResourceType: "dictionary", Category: "edge-logic", RequiresAuth: true},

	// Code deployment
	"vcl":     {ResourceType: "code", Category: "code-deployment", RequiresAuth: true},
	"compute": {ResourceType: "code", Category: "code-deployment", RequiresAuth: true},

	// Monitoring
	"stats":    {ResourceType: "monitoring", Category: "monitoring", RequiresAuth: true},
	"log-tail": {ResourceType: "monitoring", Category: "monitoring", RequiresAuth: true},

	// Security and auth
	"auth-token":   {ResourceType: "auth", Category: "security", RequiresAuth: true},
	"user":         {ResourceType: "auth", Category: "security", RequiresAuth: true},
	"service-auth": {ResourceType: "auth", Category: "security", RequiresAuth: true},

	// Secrets and TLS
	"secret-store":       {ResourceType: "secret", Category: "security", RequiresAuth: true},
	"secret-store-entry": {ResourceType: "secret", Category: "security", RequiresAuth: true},
	"tls-config":         {ResourceType: "secret", Category: "security", RequiresAuth: true},
	"tls-custom":         {ResourceType: "secrets", Category: "security", RequiresAuth: true},
	"tls-platform":       {ResourceType: "secrets", Category: "security", RequiresAuth: true},
	"tls-subscription":   {ResourceType: "secrets", Category: "security", RequiresAuth: true},

	// Storage
	"config-store":       {ResourceType: "key-value", Category: "storage", RequiresAuth: true},
	"config-store-entry": {ResourceType: "key-value", Category: "storage", RequiresAuth: true},
	"kv-store":           {ResourceType: "key-value", Category: "storage", RequiresAuth: true},
	"kv-store-entry":     {ResourceType: "key-value", Category: "storage", RequiresAuth: true},

	// Operations
	"purge": {ResourceType: "cache", Category: "operations", RequiresAuth: true},

	// Integrations
	"logging": {ResourceType: "log-endpoint", Category: "integrations", RequiresAuth: true},

	// Utilities
	"version": {ResourceType: "system-info", Category: "utilities", RequiresAuth: false},
	"whoami":  {ResourceType: "system-info", Category: "utilities", RequiresAuth: true},
	"pops":    {ResourceType: "system-info", Category: "utilities", RequiresAuth: true},
	"ip-list": {ResourceType: "system-info", Category: "utilities", RequiresAuth: true},
}

// GetCommandMetadata returns metadata for a given Fastly CLI command.
// If the command is not found in the metadata map, it returns a default
// metadata struct with ResourceType "unknown" and RequiresAuth set to true.
func GetCommandMetadata(command string) CommandMetadata {
	if metadata, ok := commandMetadataMap[command]; ok {
		return metadata
	}

	// Default for unknown commands
	return CommandMetadata{
		ResourceType: "unknown",
		Category:     "general",
		RequiresAuth: true,
	}
}

// operationTypeMap maps operation keywords to their types and safety status.
// The Type field indicates the nature of the operation (read, create, update, delete).
// The IsSafe field indicates whether the operation is non-destructive (read-only).
var operationTypeMap = map[string]struct {
	Type   string
	IsSafe bool
}{
	// Read operations
	"list":     {"read", true},
	"describe": {"read", true},
	"get":      {"read", true},
	"show":     {"read", true},

	// Create operations
	"create": {"create", false},
	"add":    {"create", false},
	"new":    {"create", false},

	// Update operations
	"update": {"update", false},
	"edit":   {"update", false},
	"modify": {"update", false},

	// Delete operations
	"delete":  {"delete", false},
	"remove":  {"delete", false},
	"destroy": {"delete", false},

	// Special operations
	"purge": {"purge", false},
}

// GetOperationType determines the operation type and safety status from a command and its arguments.
// It returns:
//   - operationType: The type of operation ("read", "create", "update", "delete", "purge", or "unknown")
//   - isSafe: Whether the operation is non-destructive (true for read-only operations)
//
// The function first checks if the first argument is an operation keyword,
// then checks if the command itself indicates the operation type.
func GetOperationType(command string, args []string) (operationType string, isSafe bool) {
	// Check if args contain an operation keyword
	if len(args) > 0 {
		if op, ok := operationTypeMap[args[0]]; ok {
			return op.Type, op.IsSafe
		}
	}

	// Check if the command itself indicates the operation
	if strings.Contains(command, "list") {
		return "read", true
	}

	// Commands that are always safe read operations
	safeReadCommands := map[string]bool{
		"version": true,
		"whoami":  true,
		"pops":    true,
		"ip-list": true,
	}

	if safeReadCommands[command] {
		return "read", true
	}

	return "unknown", false
}

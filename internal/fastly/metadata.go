package fastly

import (
	"github.com/fastly/mcp/internal/types"
)

// GetOperationMetadata analyzes a Fastly CLI command and returns metadata about its nature.
// It determines:
//   - ResourceType: What kind of Fastly resource is being operated on (e.g., "service", "acl", "dictionary")
//   - OperationType: The action being performed ("read", "create", "update", "delete", "purge", or "unknown")
//   - IsSafe: Whether the operation is non-destructive (true for read-only operations)
//   - RequiresAuth: Whether authentication is needed (true for most operations except version and some utilities)
//
// This metadata helps AI agents understand the impact and requirements of operations,
// allowing them to make informed decisions about command execution.
//
// Example:
//
//	metadata := GetOperationMetadata("service", []string{"list"})
//	// Returns: {ResourceType: "service", OperationType: "read", IsSafe: true, RequiresAuth: true}
func GetOperationMetadata(command string, args []string) *types.OperationMetadata {
	// Get command metadata from centralized source
	cmdMetadata := GetCommandMetadata(command)

	// Determine operation type and safety
	operationType, isSafe := GetOperationType(command, args)

	return &types.OperationMetadata{
		ResourceType:  cmdMetadata.ResourceType,
		OperationType: operationType,
		IsSafe:        isSafe,
		RequiresAuth:  cmdMetadata.RequiresAuth,
	}
}

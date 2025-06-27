package fastly

import (
	"testing"
)

func TestGetOperationMetadata(t *testing.T) {
	tests := []struct {
		name          string
		command       string
		args          []string
		expectType    string
		expectSafe    bool
		expectAuth    bool
		expectResType string
	}{
		{
			name:          "service list - safe read",
			command:       "service",
			args:          []string{"list"},
			expectType:    "read",
			expectSafe:    true,
			expectAuth:    true,
			expectResType: "service",
		},
		{
			name:          "service create - unsafe",
			command:       "service",
			args:          []string{"create"},
			expectType:    "create",
			expectSafe:    false,
			expectAuth:    true,
			expectResType: "service",
		},
		{
			name:          "version - safe no auth",
			command:       "version",
			args:          []string{},
			expectType:    "read",
			expectSafe:    true,
			expectAuth:    false,
			expectResType: "system-info", // version command is a system-info resource type
		},
		{
			name:          "purge - unsafe",
			command:       "purge",
			args:          []string{},
			expectType:    "unknown",
			expectSafe:    false,
			expectAuth:    true,
			expectResType: "cache",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GetOperationMetadata(tt.command, tt.args)

			if result.OperationType != tt.expectType {
				t.Errorf("Expected operation type %s, got %s", tt.expectType, result.OperationType)
			}
			if result.IsSafe != tt.expectSafe {
				t.Errorf("Expected IsSafe %v, got %v", tt.expectSafe, result.IsSafe)
			}
			if result.RequiresAuth != tt.expectAuth {
				t.Errorf("Expected RequiresAuth %v, got %v", tt.expectAuth, result.RequiresAuth)
			}
			if result.ResourceType != tt.expectResType {
				t.Errorf("Expected ResourceType %s, got %s", tt.expectResType, result.ResourceType)
			}
		})
	}
}

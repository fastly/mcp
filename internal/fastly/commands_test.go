package fastly

import (
	"reflect"
	"testing"

	"github.com/fastly/mcp/internal/types"
)

func TestParseCommandList(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected []types.SubcommandInfo
	}{
		{
			name: "parse basic commands",
			input: `USAGE
  fastly [<flags>] <command> [<args> ...]

COMMANDS
  acl           Manage access control lists (ACLs)
  backend       Manage service backends
  compute       Manage Compute services
  service       Manage Fastly services

SEE ALSO
  fastly help`,
			expected: []types.SubcommandInfo{
				{Name: "acl", Description: "Manage access control lists (ACLs)"},
				{Name: "backend", Description: "Manage service backends"},
				{Name: "compute", Description: "Manage Compute services"},
				{Name: "service", Description: "Manage Fastly services"},
			},
		},
		{
			name: "parse commands with multiline descriptions",
			input: `COMMANDS
  acl           Manage access control lists (ACLs) for your
                Fastly services and configurations
  backend       Manage service backends

SEE ALSO`,
			expected: []types.SubcommandInfo{
				{Name: "acl", Description: "Manage access control lists (ACLs) for your Fastly services and configurations"},
				{Name: "backend", Description: "Manage service backends"},
			},
		},
		{
			name: "skip non-command lines",
			input: `COMMANDS
  fastly [<flags>] <command>
  -h, --help    Show help
  acl           Manage ACLs
  backend       Manage backends`,
			expected: []types.SubcommandInfo{
				{Name: "acl", Description: "Manage ACLs"},
				{Name: "backend", Description: "Manage backends"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseCommandList(tt.input)
			if !reflect.DeepEqual(result, tt.expected) {
				t.Errorf("parseCommandList() = %v, want %v", result, tt.expected)
			}
		})
	}
}

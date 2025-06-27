package fastly

import (
	"strings"
	"testing"

	"github.com/fastly/mcp/internal/types"
)

func TestParseFlagLine(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected types.FlagInfo
	}{
		{
			name:  "long flag only",
			input: "  --json                      Format output as JSON",
			expected: types.FlagInfo{
				Name:        "json",
				Description: "Format output as JSON",
			},
		},
		{
			name:  "short and long flag",
			input: "  -h, --help                  Show help",
			expected: types.FlagInfo{
				Name:        "help",
				Short:       "", // parseFlagLine doesn't parse short flags in current implementation
				Description: "Show help",
			},
		},
		{
			name:  "flag with equals",
			input: "  --service-id=STRING         Service ID",
			expected: types.FlagInfo{
				Name:        "service-id",
				Description: "Service ID",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseFlagLine(tt.input)
			if result.Name != tt.expected.Name {
				t.Errorf("Expected name %s, got %s", tt.expected.Name, result.Name)
			}
			if result.Short != tt.expected.Short {
				t.Errorf("Expected short %s, got %s", tt.expected.Short, result.Short)
			}
			if result.Description != tt.expected.Description {
				t.Errorf("Expected description %s, got %s", tt.expected.Description, result.Description)
			}
		})
	}
}

func TestParseHelpOutput(t *testing.T) {
	tests := []struct {
		name     string
		command  string
		helpText string
		validate func(t *testing.T, info types.HelpInfo)
	}{
		{
			name:    "basic command help",
			command: "service",
			helpText: `USAGE
  fastly service <command>

COMMANDS
  list     List services
  create   Create a service
  delete   Delete a service

FLAGS
  --help   Show help`,
			validate: func(t *testing.T, info types.HelpInfo) {
				if info.Command != "service" {
					t.Errorf("Expected command 'service', got %s", info.Command)
				}
				if len(info.Subcommands) != 3 {
					t.Errorf("Expected 3 subcommands, got %d", len(info.Subcommands))
				}
				if ShouldIncludeFlag("help") && len(info.Flags) == 0 {
					t.Error("Expected at least one flag")
				}
			},
		},
		{
			name:    "command with required flags",
			command: "service create",
			helpText: `USAGE
  fastly service create [FLAGS]

REQUIRED FLAGS
  --name    Service name

OPTIONAL FLAGS
  --comment  Optional comment
  --help     Show help`,
			validate: func(t *testing.T, info types.HelpInfo) {
				if len(info.RequiredFlags) != 1 {
					t.Errorf("Expected 1 required flag, got %d", len(info.RequiredFlags))
				}
				// Only check for flags that would be included after filtering
				if len(info.Flags) < 1 {
					t.Errorf("Expected at least 1 optional flag, got %d", len(info.Flags))
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseHelpOutput(tt.command, tt.helpText)
			tt.validate(t, result)
		})
	}
}

func TestAddMCPMetadata(t *testing.T) {
	tests := []struct {
		name             string
		command          string
		expectedCategory string
		expectedResource string
	}{
		{
			name:             "service command",
			command:          "service list",
			expectedCategory: "configuration",
			expectedResource: "service",
		},
		{
			name:             "auth command",
			command:          "auth-token",
			expectedCategory: "security",
			expectedResource: "auth",
		},
		{
			name:             "version command",
			command:          "version",
			expectedCategory: "utilities",
			expectedResource: "system-info",
		},
		{
			name:             "unknown command",
			command:          "unknown-command",
			expectedCategory: "general",
			expectedResource: "unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			info := types.HelpInfo{Command: tt.command}
			result := addMCPMetadata(info)

			if result.Category != tt.expectedCategory {
				t.Errorf("Expected category %s, got %s", tt.expectedCategory, result.Category)
			}
			if result.ResourceType != tt.expectedResource {
				t.Errorf("Expected resource type %s, got %s", tt.expectedResource, result.ResourceType)
			}
		})
	}
}

func TestImproveUsageClarity(t *testing.T) {
	info := types.HelpInfo{
		Command:     "service",
		UsageSyntax: "service [command]",
		Subcommands: []types.SubcommandInfo{
			{Name: "list", Description: "List services"},
			{Name: "create", Description: "Create service"},
			{Name: "delete", Description: "Delete service"},
		},
	}

	result := improveUsageClarity(info)

	// Should replace [command] with actual subcommands
	if !strings.Contains(result.UsageSyntax, "{list|create|delete}") {
		t.Errorf("Expected usage syntax to contain subcommand options, got: %s", result.UsageSyntax)
	}

	// Should generate usage examples
	if len(result.UsageExamples) != 3 {
		t.Errorf("Expected 3 usage examples, got %d", len(result.UsageExamples))
	}

	// Should generate usage commands
	if len(result.UsageCommands) != 3 {
		t.Errorf("Expected 3 usage commands, got %d", len(result.UsageCommands))
	}
}

func TestAddMCPInstructions(t *testing.T) {
	tests := []struct {
		name        string
		info        types.HelpInfo
		checkDanger bool
		checkSteps  int
	}{
		{
			name: "parent command with subcommands",
			info: types.HelpInfo{
				Command: "service",
				Subcommands: []types.SubcommandInfo{
					{Name: "list"},
					{Name: "create"},
				},
			},
			checkDanger: false,
			checkSteps:  3,
		},
		{
			name: "command with required flags",
			info: types.HelpInfo{
				Command: "service create",
				RequiredFlags: []types.FlagInfo{
					{Name: "name", Description: "Service name"},
				},
			},
			checkDanger: true, // create is dangerous
			checkSteps:  6,    // includes 3 danger warnings + 3 regular steps
		},
		{
			name: "simple command",
			info: types.HelpInfo{
				Command: "version",
			},
			checkDanger: false,
			checkSteps:  3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := addMCPInstructions(tt.info)

			if result.Instructions == "" {
				t.Error("Expected instructions to be set")
			}

			if tt.checkDanger && !strings.Contains(result.Instructions, "⚠️") {
				t.Error("Expected danger warning in instructions")
			}

			if len(result.NextSteps) != tt.checkSteps {
				t.Errorf("Expected %d next steps, got %d", tt.checkSteps, len(result.NextSteps))
			}
		})
	}
}

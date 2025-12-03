package validation

import "testing"

func TestIsStreamingCommand(t *testing.T) {
	tests := []struct {
		name     string
		command  string
		args     []string
		expected bool
	}{
		{
			name:     "log-tail is streaming",
			command:  "log-tail",
			args:     []string{},
			expected: true,
		},
		{
			name:     "stats realtime is streaming",
			command:  "stats",
			args:     []string{"realtime"},
			expected: true,
		},
		{
			name:     "service list is not streaming",
			command:  "service",
			args:     []string{"list"},
			expected: false,
		},
		{
			name:     "stats without realtime is not streaming",
			command:  "stats",
			args:     []string{"historical"},
			expected: false,
		},
		{
			name:     "empty args",
			command:  "service",
			args:     []string{},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsStreamingCommand(tt.command, tt.args)
			if result != tt.expected {
				t.Errorf("IsStreamingCommand(%q, %v) = %v, want %v",
					tt.command, tt.args, result, tt.expected)
			}
		})
	}
}

func TestGetStreamingCommands(t *testing.T) {
	cmds := GetStreamingCommands()

	if !cmds["log-tail"] {
		t.Error("Expected log-tail to be in streaming commands")
	}

	if !cmds["stats realtime"] {
		t.Error("Expected 'stats realtime' to be in streaming commands")
	}

	// Verify it's a copy
	delete(cmds, "log-tail")
	cmds2 := GetStreamingCommands()
	if !cmds2["log-tail"] {
		t.Error("Deleting from copy should not affect original")
	}
}

func TestAddRemoveStreamingCommand(t *testing.T) {
	// Add a custom command
	AddStreamingCommand("custom-stream")

	if !IsStreamingCommand("custom-stream", nil) {
		t.Error("Expected custom-stream to be a streaming command after adding")
	}

	// Remove it
	RemoveStreamingCommand("custom-stream")

	if IsStreamingCommand("custom-stream", nil) {
		t.Error("Expected custom-stream to not be a streaming command after removing")
	}
}

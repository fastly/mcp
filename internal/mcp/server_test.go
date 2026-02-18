package mcp

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/fastly/mcp/internal/types"
)

func TestToJSON(t *testing.T) {
	tests := []struct {
		name  string
		input interface{}
	}{
		{
			name:  "simple struct",
			input: struct{ Name string }{Name: "test"},
		},
		{
			name: "map",
			input: map[string]interface{}{
				"key":   "value",
				"count": 42,
			},
		},
		{
			name:  "slice",
			input: []string{"a", "b", "c"},
		},
		{
			name:  "nil",
			input: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := toJSON(tt.input)

			// Should be valid JSON
			var v interface{}
			err := json.Unmarshal([]byte(result), &v)
			if err != nil {
				t.Errorf("toJSON() produced invalid JSON: %v", err)
			}

			// Should be indented (contains newlines and spaces)
			if tt.input != nil && !strings.Contains(result, "\n") {
				t.Error("toJSON() should produce indented JSON")
			}
		})
	}
}

func TestNormalizeAddress(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "empty string",
			input:    "",
			expected: "127.0.0.1:8080",
		},
		{
			name:     "port only",
			input:    ":3000",
			expected: "127.0.0.1:3000",
		},
		{
			name:     "host only",
			input:    "example.com",
			expected: "example.com:8080",
		},
		{
			name:     "full address",
			input:    "example.com:3000",
			expected: "example.com:3000",
		},
		{
			name:     "localhost with port",
			input:    "localhost:9000",
			expected: "localhost:9000",
		},
		{
			name:     "IPv4 address",
			input:    "192.168.1.1:8080",
			expected: "192.168.1.1:8080",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := NormalizeAddress(tt.input)
			if result != tt.expected {
				t.Errorf("NormalizeAddress(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestGetRawCommandOutput(t *testing.T) {
	tests := []struct {
		name     string
		response types.CommandResponse
		want     string
	}{
		{
			name: "uses plain output when present",
			response: types.CommandResponse{
				Output:     `[{"name":"svc","id":"sid"}]`,
				OutputJSON: []map[string]interface{}{{"name": "ignored"}},
			},
			want: `[{"name":"svc","id":"sid"}]`,
		},
		{
			name: "marshals output json when plain output is empty",
			response: types.CommandResponse{
				OutputJSON: []map[string]interface{}{{"name": "svc", "id": "sid"}},
			},
			want: `[{"id":"sid","name":"svc"}]`,
		},
		{
			name: "returns empty string when output json cannot be marshaled",
			response: types.CommandResponse{
				OutputJSON: map[string]interface{}{"bad": make(chan int)},
			},
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := getRawCommandOutput(tt.response)
			if got != tt.want {
				t.Fatalf("getRawCommandOutput() = %q, want %q", got, tt.want)
			}
		})
	}
}

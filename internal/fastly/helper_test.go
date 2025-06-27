package fastly

import (
	"strings"
	"testing"
)

func TestCleanANSI(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "remove ANSI escape sequences",
			input:    "\x1b[31mERROR\x1b[0m: Something went wrong",
			expected: "ERROR: Something went wrong",
		},
		{
			name:     "replace angle brackets",
			input:    "Usage: fastly \u003ccommand\u003e",
			expected: "Usage: fastly [command]",
		},
		{
			name:     "replace CLI references",
			input:    "The Fastly CLI version 1.0",
			expected: "The Fastly version 1.0",
		},
		{
			name:     "replace interactive commands",
			input:    "Run 'fastly service list' to see services",
			expected: "Use the fastly_execute tool with service list' to see services",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CleanANSI(tt.input)
			if result != tt.expected {
				t.Errorf("CleanANSI(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestToJSONArray(t *testing.T) {
	tests := []struct {
		name     string
		input    []string
		expected string
	}{
		{
			name:     "empty array",
			input:    []string{},
			expected: "[]",
		},
		{
			name:     "single item",
			input:    []string{"service"},
			expected: `["service"]`,
		},
		{
			name:     "multiple items",
			input:    []string{"service", "list", "--json"},
			expected: `["service","list","--json"]`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ToJSONArray(tt.input)
			if result != tt.expected {
				t.Errorf("ToJSONArray(%v) = %s, want %s", tt.input, result, tt.expected)
			}
		})
	}
}

func TestShouldIncludeFlag(t *testing.T) {
	tests := []struct {
		name     string
		flagName string
		expected bool
	}{
		{"include normal flag", "json", true},
		{"exclude debug flag", "debug-mode", false},
		{"exclude token flag", "token", false},
		{"exclude help flag", "help", false},
		{"include service-id flag", "service-id", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ShouldIncludeFlag(tt.flagName)
			if result != tt.expected {
				t.Errorf("ShouldIncludeFlag(%s) = %v, want %v", tt.flagName, result, tt.expected)
			}
		})
	}
}

func TestIsDangerousOperation(t *testing.T) {
	tests := []struct {
		name          string
		command       string
		expectDanger  bool
		expectWarning string
	}{
		{
			name:         "delete is dangerous",
			command:      "service delete",
			expectDanger: true,
		},
		{
			name:         "create is dangerous",
			command:      "backend create",
			expectDanger: true,
		},
		{
			name:         "list is safe",
			command:      "service list",
			expectDanger: false,
		},
		{
			name:         "describe is safe",
			command:      "service describe",
			expectDanger: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isDanger, warning := IsDangerousOperation(tt.command)
			if isDanger != tt.expectDanger {
				t.Errorf("Expected dangerous=%v, got %v", tt.expectDanger, isDanger)
			}
			if isDanger && warning == "" {
				t.Error("Expected warning text for dangerous operation")
			}
		})
	}
}

func TestTruncateOutput(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		maxSize     int
		expectTrunc bool
		expectSize  int
	}{
		{
			name:        "no truncation needed",
			input:       "Short output",
			maxSize:     100,
			expectTrunc: false,
			expectSize:  0,
		},
		{
			name:        "truncation at newline",
			input:       "Line 1\nLine 2\nLine 3\nLine 4\nLine 5",
			maxSize:     15,
			expectTrunc: true,
			expectSize:  13, // Should truncate at "Line 1\nLine 2"
		},
		{
			name:        "truncation without newline",
			input:       strings.Repeat("a", 200),
			maxSize:     100,
			expectTrunc: true,
			expectSize:  100,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, info := TruncateOutput(tt.input, tt.maxSize)

			if tt.expectTrunc {
				if info == nil {
					t.Error("Expected pagination info but got nil")
				} else if !info.Truncated {
					t.Error("Expected truncated to be true")
				} else if len(result) != tt.expectSize {
					t.Errorf("Expected result size %d, got %d", tt.expectSize, len(result))
				}
			} else {
				if info != nil {
					t.Error("Expected no pagination info but got one")
				}
				if result != tt.input {
					t.Error("Expected unchanged output")
				}
			}
		})
	}
}

func TestTruncateJSONArray(t *testing.T) {
	// Create a large array
	largeArray := make([]interface{}, 150)
	for i := range largeArray {
		largeArray[i] = map[string]interface{}{"id": i, "name": "item"}
	}

	tests := []struct {
		name        string
		input       interface{}
		expectTrunc bool
		expectSize  int
	}{
		{
			name:        "small array no truncation",
			input:       []interface{}{1, 2, 3},
			expectTrunc: false,
			expectSize:  0,
		},
		{
			name:        "large array truncated",
			input:       largeArray,
			expectTrunc: true,
			expectSize:  MaxJSONArrayItems,
		},
		{
			name:        "non-array data",
			input:       map[string]interface{}{"key": "value"},
			expectTrunc: false,
			expectSize:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, info := TruncateJSONArray(tt.input)

			if tt.expectTrunc {
				if info == nil || !info.Truncated {
					t.Error("Expected truncation but didn't get it")
				}
				if arr, ok := result.([]interface{}); ok {
					if len(arr) != tt.expectSize {
						t.Errorf("Expected size %d, got %d", tt.expectSize, len(arr))
					}
				} else {
					t.Error("Expected array result")
				}
			} else {
				if info != nil {
					t.Error("Expected no truncation info")
				}
			}
		})
	}
}

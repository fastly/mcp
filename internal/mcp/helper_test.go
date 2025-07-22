package mcp

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/fastly/mcp/internal/crypto"
	"github.com/mark3labs/mcp-go/mcp"
)

func TestHandleSetupError(t *testing.T) {
	tests := []struct {
		name             string
		err              error
		command          string
		expectedCode     string
		expectedContains []string
	}{
		{
			name:             "CLI not found error",
			err:              errors.New("fastly: command not found"),
			command:          "service list",
			expectedCode:     "cli_not_found",
			expectedContains: []string{"not found"},
		},
		{
			name:             "Auth required error - lowercase",
			err:              errors.New("Error: not authenticated"),
			command:          "service create",
			expectedCode:     "auth_required",
			expectedContains: []string{"not authenticated"},
		},
		{
			name:             "Auth required error - uppercase",
			err:              errors.New("Not authenticated. Please run 'fastly auth'"),
			command:          "domain list",
			expectedCode:     "auth_required",
			expectedContains: []string{"Not authenticated"},
		},
		{
			name:             "Generic setup error",
			err:              errors.New("Failed to initialize CLI"),
			command:          "backend list",
			expectedCode:     "setup_error",
			expectedContains: []string{"Failed to initialize"},
		},
		{
			name:             "Empty error message",
			err:              errors.New(""),
			command:          "service list",
			expectedCode:     "setup_error",
			expectedContains: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := handleSetupError(tt.err, tt.command)

			if result == nil {
				t.Fatal("Expected non-nil result")
			}

			if result == nil || len(result.Content) == 0 {
				t.Fatal("Expected content in result")
			}

			textContent, ok := result.Content[0].(*mcp.TextContent)
			if !ok {
				t.Fatal("Expected TextContent type")
			}

			// Verify error code in JSON response
			if !strings.Contains(textContent.Text, tt.expectedCode) {
				t.Errorf("Expected error code %q in response, got: %s", tt.expectedCode, textContent.Text)
			}

			// Verify error message appears
			for _, expected := range tt.expectedContains {
				if !strings.Contains(textContent.Text, expected) {
					t.Errorf("Expected response to contain %q, got: %s", expected, textContent.Text)
				}
			}

			// Verify it's valid JSON
			if !strings.HasPrefix(strings.TrimSpace(textContent.Text), "{") {
				t.Errorf("Expected JSON response, got: %s", textContent.Text)
			}
		})
	}
}

func TestInitializeTokenCrypto(t *testing.T) {
	// Save original tokenCrypto
	originalCrypto := tokenCrypto
	defer func() {
		tokenCrypto = originalCrypto
	}()

	t.Run("Initialize with encryption enabled", func(t *testing.T) {
		tokenCrypto = nil
		err := InitializeTokenCrypto(true)
		if err != nil {
			t.Fatalf("Failed to initialize token crypto: %v", err)
		}

		if tokenCrypto == nil {
			t.Error("Expected tokenCrypto to be initialized")
		}
		if !tokenCrypto.Enabled {
			t.Error("Expected token crypto to be enabled")
		}
	})

	t.Run("Initialize with encryption disabled", func(t *testing.T) {
		tokenCrypto = nil
		err := InitializeTokenCrypto(false)
		if err != nil {
			t.Fatalf("Failed to initialize token crypto: %v", err)
		}

		if tokenCrypto == nil {
			t.Error("Expected tokenCrypto to be initialized")
		}
		if tokenCrypto.Enabled {
			t.Error("Expected token crypto to be disabled")
		}
	})

	t.Run("Re-initialization replaces existing instance", func(t *testing.T) {
		// First initialization
		tokenCrypto = nil
		err := InitializeTokenCrypto(true)
		if err != nil {
			t.Fatalf("Failed first initialization: %v", err)
		}
		firstInstance := tokenCrypto

		// Second initialization
		err = InitializeTokenCrypto(false)
		if err != nil {
			t.Fatalf("Failed second initialization: %v", err)
		}

		if tokenCrypto == firstInstance {
			t.Error("Expected new instance after re-initialization")
		}
		if tokenCrypto.Enabled {
			t.Error("Expected second instance to be disabled")
		}
	})
}

func TestToJSONHelper(t *testing.T) {
	// Save original tokenCrypto
	originalCrypto := tokenCrypto
	defer func() {
		tokenCrypto = originalCrypto
	}()

	tests := []struct {
		name           string
		input          interface{}
		setupCrypto    func()
		expectedJSON   bool
		containsString string
	}{
		{
			name: "Simple struct marshaling",
			input: struct {
				Name  string `json:"name"`
				Value int    `json:"value"`
			}{
				Name:  "test",
				Value: 42,
			},
			setupCrypto: func() {
				tokenCrypto = nil
			},
			expectedJSON:   true,
			containsString: `"name": "test"`,
		},
		{
			name: "Map marshaling",
			input: map[string]interface{}{
				"status": "success",
				"count":  100,
			},
			setupCrypto: func() {
				tokenCrypto = nil
			},
			expectedJSON:   true,
			containsString: `"status": "success"`,
		},
		{
			name:  "Slice marshaling",
			input: []string{"one", "two", "three"},
			setupCrypto: func() {
				tokenCrypto = nil
			},
			expectedJSON:   true,
			containsString: `"two"`,
		},
		{
			name:  "Marshal error handling - channel type",
			input: make(chan int),
			setupCrypto: func() {
				tokenCrypto = nil
			},
			expectedJSON:   true,
			containsString: `{"error":"Failed to marshal response"}`,
		},
		{
			name:  "Empty struct",
			input: struct{}{},
			setupCrypto: func() {
				tokenCrypto = nil
			},
			expectedJSON:   true,
			containsString: `{}`,
		},
		{
			name:  "Nil input",
			input: nil,
			setupCrypto: func() {
				tokenCrypto = nil
			},
			expectedJSON:   true,
			containsString: `null`,
		},
		{
			name: "Token encryption disabled",
			input: map[string]string{
				"token": "1234567890abcdef1234567890abcdef",
			},
			setupCrypto: func() {
				tc, _ := crypto.NewTokenCrypto(false)
				tokenCrypto = tc
			},
			expectedJSON:   true,
			containsString: `"token": "1234567890abcdef1234567890abcdef"`,
		},
		{
			name: "Token encryption enabled",
			input: map[string]string{
				"token": "1234567890abcdef1234567890abcdef",
			},
			setupCrypto: func() {
				tc, _ := crypto.NewTokenCrypto(true)
				tokenCrypto = tc
			},
			expectedJSON:   true,
			containsString: `"token":`, // Should still have the key
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupCrypto()

			result := toJSON(tt.input)

			if tt.expectedJSON {
				// Check if it starts with valid JSON characters
				trimmed := strings.TrimSpace(result)
				if !strings.HasPrefix(trimmed, "{") && !strings.HasPrefix(trimmed, "[") &&
					!strings.HasPrefix(trimmed, "\"") && trimmed != "null" {
					t.Errorf("Expected valid JSON, got: %s", result)
				}
			}

			if tt.containsString != "" && !strings.Contains(result, tt.containsString) {
				t.Errorf("Expected result to contain %q, got: %s", tt.containsString, result)
			}

			// For token encryption test, verify token is modified
			if tt.name == "Token encryption enabled" && strings.Contains(result, "1234567890abcdef1234567890abcdef") {
				t.Errorf("Expected token to be encrypted, but found original token in result")
			}
		})
	}
}

func TestToJSONFormatting(t *testing.T) {
	// Test that JSON is properly indented
	input := map[string]interface{}{
		"level1": map[string]interface{}{
			"level2": "value",
		},
	}

	result := toJSON(input)

	// Check for proper indentation (2 spaces)
	if !strings.Contains(result, "\n  ") {
		t.Errorf("Expected indented JSON, got: %s", result)
	}

	// Verify multiple levels of indentation
	if !strings.Contains(result, "\n    ") {
		t.Errorf("Expected nested indentation, got: %s", result)
	}
}

func TestExecuteWithSetupCheck(t *testing.T) {
	tests := []struct {
		name          string
		setupError    error
		handlerError  error
		handlerResult *mcp.CallToolResult
		expectSetup   bool
	}{
		{
			name:       "Setup check fails",
			setupError: errors.New("CLI not found"),
			handlerResult: &mcp.CallToolResult{
				Content: []mcp.Content{
					&mcp.TextContent{Type: "text", Text: "Should not be called"},
				},
			},
			expectSetup: true,
		},
		{
			name:       "Setup check passes, handler succeeds",
			setupError: nil,
			handlerResult: &mcp.CallToolResult{
				Content: []mcp.Content{
					&mcp.TextContent{Type: "text", Text: "Handler success"},
				},
			},
			expectSetup: false,
		},
		{
			name:         "Setup check passes, handler returns error",
			setupError:   nil,
			handlerError: errors.New("Handler error"),
			expectSetup:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handlerCalled := false

			ft := &FastlyTool{
				setupChecked: true,
				setupError:   tt.setupError,
			}

			handler := func() (*mcp.CallToolResult, error) {
				handlerCalled = true
				return tt.handlerResult, tt.handlerError
			}

			result, err := executeWithSetupCheck(context.Background(), ft, "test-command", handler)

			if tt.expectSetup {
				// Should have setup error response
				if handlerCalled {
					t.Error("Handler should not be called when setup fails")
				}
				if result == nil {
					t.Fatal("Expected setup error result")
				}
				if result == nil || len(result.Content) == 0 {
					t.Fatal("Expected content in setup error result")
				}

				textContent, ok := result.Content[0].(*mcp.TextContent)
				if !ok {
					t.Fatal("Expected TextContent in setup error")
				}
				if !strings.Contains(textContent.Text, "setup_error") &&
					!strings.Contains(textContent.Text, "cli_not_found") &&
					!strings.Contains(textContent.Text, "auth_required") {
					t.Errorf("Expected setup error response, got: %s", textContent.Text)
				}
			} else {
				// Should have handler result
				if !handlerCalled {
					t.Error("Handler should be called when setup passes")
				}
				if tt.handlerError != nil {
					if err != tt.handlerError {
						t.Errorf("Expected handler error %v, got %v", tt.handlerError, err)
					}
				} else {
					if result != tt.handlerResult {
						t.Errorf("Expected handler result %v, got %v", tt.handlerResult, result)
					}
				}
			}
		})
	}
}

// Edge case tests
func TestHelperEdgeCases(t *testing.T) {
	t.Run("handleSetupError with nil error", func(t *testing.T) {
		// This shouldn't happen in practice, but test defensive programming
		// The function will panic with nil error, which is expected behavior
		// since this is a programming error that should never occur
		defer func() {
			if r := recover(); r == nil {
				t.Error("Expected handleSetupError to panic with nil error")
			}
		}()

		_ = handleSetupError(nil, "test-command")
	})

	t.Run("toJSON with very large nested structure", func(t *testing.T) {
		// Create deeply nested structure
		nested := make(map[string]interface{})
		current := nested
		for i := 0; i < 100; i++ {
			next := make(map[string]interface{})
			current[string(rune('a'+i%26))] = next
			current = next
		}
		current["value"] = "deep"

		result := toJSON(nested)
		if !strings.Contains(result, "deep") {
			t.Error("Expected deeply nested value to be preserved")
		}
	})

	t.Run("toJSON with special JSON characters", func(t *testing.T) {
		input := map[string]string{
			"quotes":    `Test with "quotes" and 'single'`,
			"newlines":  "Line1\nLine2\nLine3",
			"tabs":      "Column1\tColumn2\tColumn3",
			"backslash": `Path\to\file`,
			"unicode":   "Hello 世界 🌍",
		}

		result := toJSON(input)

		// Verify special characters are properly escaped
		if !strings.Contains(result, `\"quotes\"`) && !strings.Contains(result, `\u0022quotes\u0022`) {
			t.Error("Expected quotes to be escaped in JSON")
		}
		if !strings.Contains(result, `\n`) && !strings.Contains(result, `\\n`) {
			t.Error("Expected newlines to be represented in JSON")
		}
		if !strings.Contains(result, `\t`) && !strings.Contains(result, `\\t`) {
			t.Error("Expected tabs to be represented in JSON")
		}
		if !strings.Contains(result, "世界") {
			t.Error("Expected Unicode to be preserved")
		}
	})
}

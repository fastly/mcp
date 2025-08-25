package cache

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/fastly/mcp/internal/types"
)

func TestResultStore_Store(t *testing.T) {
	store := NewResultStore(10*time.Minute, 1*time.Hour)

	// Test storing JSON array
	jsonArray := `[{"id": 1, "name": "service1"}, {"id": 2, "name": "service2"}]`
	id := store.Store(jsonArray, "service", []string{"list"}, []types.Flag{{Name: "json"}})

	if id == "" {
		t.Fatal("Expected non-empty result ID")
	}

	result, err := store.Get(id)
	if err != nil {
		t.Fatalf("Failed to get stored result: %v", err)
	}

	if result.Metadata.DataType != "json_array" {
		t.Errorf("Expected json_array, got %s", result.Metadata.DataType)
	}

	if result.Metadata.TotalItems != 2 {
		t.Errorf("Expected 2 items, got %d", result.Metadata.TotalItems)
	}
}

func TestResultStore_Read(t *testing.T) {
	store := NewResultStore(10*time.Minute, 1*time.Hour)

	// Store a large JSON array
	var items []interface{}
	for i := 0; i < 100; i++ {
		items = append(items, map[string]interface{}{
			"id":   i,
			"name": "item" + string(rune(i)),
		})
	}

	jsonData, _ := json.Marshal(items)
	id := store.Store(string(jsonData), "test", []string{"list"}, nil)

	// Test reading with pagination
	data, err := store.Read(id, 0, 10)
	if err != nil {
		t.Fatalf("Failed to read data: %v", err)
	}

	arr, ok := data.([]interface{})
	if !ok {
		t.Fatal("Expected array data")
	}

	if len(arr) != 10 {
		t.Errorf("Expected 10 items, got %d", len(arr))
	}

	// Test reading next page
	data2, err := store.Read(id, 10, 10)
	if err != nil {
		t.Fatalf("Failed to read second page: %v", err)
	}

	arr2, ok := data2.([]interface{})
	if !ok {
		t.Fatal("Expected array data for second page")
	}

	if len(arr2) != 10 {
		t.Errorf("Expected 10 items in second page, got %d", len(arr2))
	}
}

func TestResultStore_Query(t *testing.T) {
	store := NewResultStore(10*time.Minute, 1*time.Hour)

	// Store JSON array with searchable data
	jsonArray := `[
		{"id": 1, "name": "production-service", "status": "active"},
		{"id": 2, "name": "staging-service", "status": "inactive"},
		{"id": 3, "name": "production-api", "status": "active"}
	]`

	id := store.Store(jsonArray, "service", []string{"list"}, nil)

	// Test querying by field value
	results, err := store.Query(id, "name=production")
	if err != nil {
		t.Fatalf("Failed to query: %v", err)
	}

	arr, ok := results.([]interface{})
	if !ok {
		t.Fatal("Expected array results")
	}

	if len(arr) != 2 {
		t.Errorf("Expected 2 production services, got %d", len(arr))
	}
}

func TestResultStore_TextStorage(t *testing.T) {
	store := NewResultStore(10*time.Minute, 1*time.Hour)

	// Store text output (without trailing newline)
	lines := make([]string, 100)
	for i := range lines {
		lines[i] = "Line of text"
	}
	textOutput := strings.Join(lines, "\n")
	id := store.Store(textOutput, "log", []string{"tail"}, nil)

	result, err := store.Get(id)
	if err != nil {
		t.Fatalf("Failed to get text result: %v", err)
	}

	if result.Metadata.DataType != "text" {
		t.Errorf("Expected text type, got %s", result.Metadata.DataType)
	}

	if result.Metadata.TotalLines != 100 {
		t.Errorf("Expected 100 lines, got %d", result.Metadata.TotalLines)
	}

	// Test reading lines
	data, err := store.Read(id, 0, 10)
	if err != nil {
		t.Fatalf("Failed to read lines: %v", err)
	}

	lineArr, ok := data.([]string)
	if !ok {
		t.Fatal("Expected string array for text")
	}

	if len(lineArr) != 10 {
		t.Errorf("Expected 10 lines, got %d", len(lineArr))
	}
}

func TestShouldCache(t *testing.T) {
	tests := []struct {
		name     string
		output   string
		expected bool
	}{
		{
			name:     "Small output",
			output:   "Small text",
			expected: false,
		},
		{
			name:     "Large output",
			output:   strings.Repeat("x", 11000),
			expected: true,
		},
		{
			name:     "Exactly at threshold",
			output:   strings.Repeat("x", OutputCacheThreshold),
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ShouldCache(tt.output)
			if result != tt.expected {
				t.Errorf("ShouldCache() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestGeneratePreview(t *testing.T) {
	// Test JSON array preview
	jsonArray := `[{"id": 1}, {"id": 2}, {"id": 3}, {"id": 4}, {"id": 5}, {"id": 6}]`
	var data interface{}
	if err := json.Unmarshal([]byte(jsonArray), &data); err != nil {
		t.Fatalf("Failed to unmarshal test data: %v", err)
	}

	preview := GeneratePreview(jsonArray, "json_array", data)

	if preview.Type != "json_array" {
		t.Errorf("Expected json_array type, got %s", preview.Type)
	}

	if preview.TotalItems != 6 {
		t.Errorf("Expected 6 total items, got %d", preview.TotalItems)
	}

	if !preview.Truncated {
		t.Error("Expected preview to be truncated")
	}

	items, ok := preview.FirstItems.([]interface{})
	if !ok {
		t.Fatal("Expected array in FirstItems")
	}

	if len(items) != MaxPreviewItems {
		t.Errorf("Expected %d preview items, got %d", MaxPreviewItems, len(items))
	}
}

func TestResultStore_Expiration(t *testing.T) {
	// Short TTL for testing
	store := NewResultStore(100*time.Millisecond, 50*time.Millisecond)

	id := store.Store("test data", "test", nil, nil)

	// Should exist initially
	_, err := store.Get(id)
	if err != nil {
		t.Fatal("Result should exist initially")
	}

	// Wait for expiration
	time.Sleep(200 * time.Millisecond)

	// Should be expired now
	_, err = store.Get(id)
	if err == nil {
		t.Fatal("Result should have expired")
	}
}

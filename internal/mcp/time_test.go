package mcp

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
)

func TestGetCurrentTime(t *testing.T) {
	// Test getCurrentTime function
	result, err := getCurrentTime(context.Background(), mcp.CallToolRequest{})
	if err != nil {
		t.Fatalf("getCurrentTime failed: %v", err)
	}

	if result == nil {
		t.Fatal("getCurrentTime returned nil result")
	}

	if len(result.Content) == 0 {
		t.Fatal("getCurrentTime returned empty content")
	}

	// Check that content is valid JSON
	textContent, ok := result.Content[0].(*mcp.TextContent)
	if !ok {
		t.Fatalf("Expected TextContent, got %T", result.Content[0])
	}

	var timeInfo TimeInfo
	err = json.Unmarshal([]byte(textContent.Text), &timeInfo)
	if err != nil {
		t.Fatalf("Failed to unmarshal time JSON: %v", err)
	}

	// Validate Unix timestamp is recent (within last minute)
	now := time.Now().Unix()
	if timeInfo.Unix < now-60 || timeInfo.Unix > now+1 {
		t.Errorf("Unix timestamp %d is not recent (expected close to %d)", timeInfo.Unix, now)
	}

	// Validate UnixMilli is consistent with Unix
	expectedMilli := timeInfo.Unix * 1000
	// Allow for up to 999ms difference
	if timeInfo.UnixMilli < expectedMilli || timeInfo.UnixMilli >= expectedMilli+1000 {
		t.Errorf("UnixMilli %d is not consistent with Unix %d", timeInfo.UnixMilli, timeInfo.Unix)
	}

	// Validate ISO format
	if timeInfo.ISO == "" {
		t.Error("ISO format is empty")
	}
	// Try parsing it back
	_, err = time.Parse(time.RFC3339, timeInfo.ISO)
	if err != nil {
		t.Errorf("Invalid ISO format %s: %v", timeInfo.ISO, err)
	}

	// Validate other fields are not empty
	if timeInfo.UTC == "" {
		t.Error("UTC format is empty")
	}
	if timeInfo.Local == "" {
		t.Error("Local format is empty")
	}
	if timeInfo.Timezone == "" {
		t.Error("Timezone is empty")
	}
	if timeInfo.TimeOffset == "" {
		t.Error("TimeOffset is empty")
	}
}

func TestTimeInfoJSON(t *testing.T) {
	// Test that TimeInfo can be properly marshaled to JSON
	timeInfo := TimeInfo{
		Unix:       1234567890,
		UnixMilli:  1234567890000,
		ISO:        "2009-02-13T23:31:30Z",
		UTC:        "2009-02-13 23:31:30 UTC",
		Local:      "2009-02-13 23:31:30 UTC",
		Timezone:   "UTC",
		TimeOffset: "+00:00",
	}

	data, err := json.Marshal(timeInfo)
	if err != nil {
		t.Fatalf("Failed to marshal TimeInfo: %v", err)
	}

	// Unmarshal back and verify
	var decoded TimeInfo
	err = json.Unmarshal(data, &decoded)
	if err != nil {
		t.Fatalf("Failed to unmarshal TimeInfo: %v", err)
	}

	if decoded.Unix != timeInfo.Unix {
		t.Errorf("Unix mismatch: got %d, want %d", decoded.Unix, timeInfo.Unix)
	}
	if decoded.ISO != timeInfo.ISO {
		t.Errorf("ISO mismatch: got %s, want %s", decoded.ISO, timeInfo.ISO)
	}
}

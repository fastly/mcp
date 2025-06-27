package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
)

// TimeInfo represents the current time in multiple formats for AI consumption.
// It provides various time representations to support different use cases:
type TimeInfo struct {
	// Unix is the Unix timestamp (seconds since January 1, 1970 UTC)
	Unix int64 `json:"unix"`
	// UnixMilli is the Unix timestamp in milliseconds for higher precision
	UnixMilli int64 `json:"unix_milli"`
	// ISO is the ISO 8601/RFC3339 format (e.g., "2006-01-02T15:04:05Z07:00")
	ISO string `json:"iso"`
	// UTC is the human-readable UTC time (e.g., "2006-01-02 15:04:05 UTC")
	UTC string `json:"utc"`
	// Local is the human-readable local time with timezone (e.g., "2006-01-02 15:04:05 PST")
	Local string `json:"local"`
	// Timezone is the local timezone name (e.g., "PST", "EDT")
	Timezone string `json:"timezone"`
	// TimeOffset is the timezone offset from UTC (e.g., "-08:00", "+05:30")
	TimeOffset string `json:"time_offset"`
}

// getCurrentTime handles the current_time MCP tool request.
// It returns the current time in multiple formats (Unix, ISO 8601, UTC, local)
// to support various AI agent time-related operations. This tool is useful for:
//   - Timestamp generation for logs or API calls
//   - Time zone conversions
//   - Date/time calculations
//   - Scheduling operations
func getCurrentTime(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	now := time.Now()

	zone, offset := now.Zone()
	offsetHours := offset / 3600
	offsetMinutes := (offset % 3600) / 60

	var offsetStr string
	if offset >= 0 {
		offsetStr = fmt.Sprintf("+%02d:%02d", offsetHours, offsetMinutes)
	} else {
		offsetStr = fmt.Sprintf("-%02d:%02d", -offsetHours, -offsetMinutes)
	}

	timeInfo := TimeInfo{
		Unix:       now.Unix(),
		UnixMilli:  now.UnixMilli(),
		ISO:        now.Format(time.RFC3339),
		UTC:        now.UTC().Format("2006-01-02 15:04:05 UTC"),
		Local:      now.Format("2006-01-02 15:04:05 MST"),
		Timezone:   zone,
		TimeOffset: offsetStr,
	}

	data, err := json.MarshalIndent(timeInfo, "", "  ")
	if err != nil {
		return nil, err
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{
				Type: "text",
				Text: string(data),
			},
		},
	}, nil
}

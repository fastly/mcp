// Package cache provides result caching functionality for large command outputs.
// It stores command results in memory with TTL and provides intelligent retrieval.
package cache

import (
	"time"

	"github.com/fastly/mcp/internal/types"
)

// CachedResult represents a cached command output with metadata.
type CachedResult struct {
	ID          string         `json:"id"`
	Data        interface{}    `json:"-"` // The parsed data (if JSON)
	RawOutput   string         `json:"-"` // The raw output string
	Metadata    ResultMetadata `json:"metadata"`
	CreatedAt   time.Time      `json:"created_at"`
	AccessCount int            `json:"access_count"`
	LastAccess  time.Time      `json:"last_access"`
}

// ResultMetadata contains information about the cached result.
type ResultMetadata struct {
	TotalSize    int          `json:"total_size"`    // Size in bytes
	DataType     string       `json:"data_type"`     // "json_array", "json_object", "text"
	TotalItems   int          `json:"total_items"`   // For arrays
	TotalLines   int          `json:"total_lines"`   // For text
	Command      string       `json:"command"`       // Command that generated this
	Args         []string     `json:"args"`          // Arguments used
	Flags        []types.Flag `json:"flags"`         // Flags used
	PreviewLines int          `json:"preview_lines"` // Number of lines in preview
	PreviewItems int          `json:"preview_items"` // Number of items in preview
}

// Preview represents a small sample of the cached data.
type Preview struct {
	Type       string      `json:"type"`                  // "json_array", "json_object", "text"
	FirstItems interface{} `json:"first_items,omitempty"` // For JSON arrays
	FirstLines []string    `json:"first_lines,omitempty"` // For text
	Keys       []string    `json:"keys,omitempty"`        // For JSON objects
	Sample     interface{} `json:"sample,omitempty"`      // Sample data for objects
	TotalItems int         `json:"total_items,omitempty"` // Total count
	TotalLines int         `json:"total_lines,omitempty"` // Total lines
	Truncated  bool        `json:"truncated"`             // Whether preview is truncated
}

// CachedResponse is returned when a command output is cached.
type CachedResponse struct {
	Success      bool           `json:"success"`
	ResultID     string         `json:"result_id"`
	Cached       bool           `json:"cached"`
	Metadata     ResultMetadata `json:"metadata"`
	Preview      *Preview       `json:"preview"`
	Instructions string         `json:"instructions"`
	NextSteps    []string       `json:"next_steps"`
}

// QueryRequest represents a request to query cached data.
type QueryRequest struct {
	ResultID string   `json:"result_id"`
	Filter   string   `json:"filter,omitempty"` // JSONPath or simple filter
	Query    string   `json:"query,omitempty"`  // Search query
	Fields   []string `json:"fields,omitempty"` // Fields to search in
}

// ReadRequest represents a request to read cached data.
type ReadRequest struct {
	ResultID string `json:"result_id"`
	Offset   int    `json:"offset"`
	Limit    int    `json:"limit"`
}

// Constants for cache configuration.
const (
	// DefaultCacheTTL is the default time-to-live for cached results.
	DefaultCacheTTL = 10 * time.Minute

	// DefaultCleanupInterval is how often expired entries are cleaned up.
	DefaultCleanupInterval = 1 * time.Minute

	// OutputCacheThreshold is the minimum size (in bytes) for caching.
	OutputCacheThreshold = 10000 // 10KB

	// MaxPreviewItems is the maximum number of items to include in preview.
	MaxPreviewItems = 5

	// MaxPreviewLines is the maximum number of lines to include in preview.
	MaxPreviewLines = 20

	// DefaultReadLimit is the default number of items/lines to return.
	DefaultReadLimit = 20
)

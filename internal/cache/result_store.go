package cache

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/fastly/mcp/internal/types"
)

// ResultStore manages cached command results.
type ResultStore struct {
	mu              sync.RWMutex
	results         map[string]*CachedResult
	ttl             time.Duration
	cleanupInterval time.Duration
	stopCleanup     chan bool
}

// globalStore is the singleton instance of ResultStore.
var (
	globalStore *ResultStore
	storeOnce   sync.Once
)

// GetStore returns the global ResultStore instance.
func GetStore() *ResultStore {
	storeOnce.Do(func() {
		globalStore = NewResultStore(DefaultCacheTTL, DefaultCleanupInterval)
	})
	return globalStore
}

// NewResultStore creates a new result store with the specified TTL and cleanup interval.
func NewResultStore(ttl time.Duration, cleanupInterval time.Duration) *ResultStore {
	rs := &ResultStore{
		results:         make(map[string]*CachedResult),
		ttl:             ttl,
		cleanupInterval: cleanupInterval,
		stopCleanup:     make(chan bool),
	}

	// Start cleanup goroutine
	go rs.cleanupLoop()

	return rs
}

// cleanupLoop periodically removes expired entries.
func (rs *ResultStore) cleanupLoop() {
	ticker := time.NewTicker(rs.cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rs.cleanup()
		case <-rs.stopCleanup:
			return
		}
	}
}

// cleanup removes expired entries.
func (rs *ResultStore) cleanup() {
	rs.mu.Lock()
	defer rs.mu.Unlock()

	now := time.Now()
	for id, result := range rs.results {
		if now.Sub(result.CreatedAt) > rs.ttl {
			delete(rs.results, id)
		}
	}
}

// Store caches a command output and returns its ID.
func (rs *ResultStore) Store(output string, command string, args []string, flags []types.Flag) string {
	id := generateID()

	// Parse the output to determine type and structure
	dataType, data := parseOutput(output)
	metadata := generateMetadata(output, dataType, data, command, args, flags)

	result := &CachedResult{
		ID:         id,
		Data:       data,
		RawOutput:  output,
		Metadata:   metadata,
		CreatedAt:  time.Now(),
		LastAccess: time.Now(),
	}

	rs.mu.Lock()
	rs.results[id] = result
	rs.mu.Unlock()

	return id
}

// Get retrieves a cached result by ID.
func (rs *ResultStore) Get(id string) (*CachedResult, error) {
	rs.mu.RLock()
	defer rs.mu.RUnlock()

	result, exists := rs.results[id]
	if !exists {
		return nil, fmt.Errorf("result with ID %s not found or expired", id)
	}

	// Update access info
	result.AccessCount++
	result.LastAccess = time.Now()

	return result, nil
}

// Read retrieves a portion of cached data.
func (rs *ResultStore) Read(id string, offset, limit int) (interface{}, error) {
	result, err := rs.Get(id)
	if err != nil {
		return nil, err
	}

	// Default limit if not specified
	if limit <= 0 {
		limit = DefaultReadLimit
	}

	switch result.Metadata.DataType {
	case "json_array":
		if arr, ok := result.Data.([]interface{}); ok {
			end := offset + limit
			if end > len(arr) {
				end = len(arr)
			}
			if offset >= len(arr) {
				return []interface{}{}, nil
			}
			return arr[offset:end], nil
		}

	case "json_object":
		// For objects, return the whole object (can't easily paginate)
		return result.Data, nil

	case "text":
		lines := strings.Split(result.RawOutput, "\n")
		end := offset + limit
		if end > len(lines) {
			end = len(lines)
		}
		if offset >= len(lines) {
			return []string{}, nil
		}
		return lines[offset:end], nil
	}

	return nil, fmt.Errorf("unsupported data type: %s", result.Metadata.DataType)
}

// Query searches within cached data.
func (rs *ResultStore) Query(id string, filter string) (interface{}, error) {
	result, err := rs.Get(id)
	if err != nil {
		return nil, err
	}

	switch result.Metadata.DataType {
	case "json_array":
		return rs.queryJSONArray(result.Data, filter)
	case "json_object":
		return rs.queryJSONObject(result.Data, filter)
	case "text":
		return rs.queryText(result.RawOutput, filter)
	}

	return nil, fmt.Errorf("unsupported data type for query: %s", result.Metadata.DataType)
}

// queryJSONArray filters a JSON array based on the filter string.
func (rs *ResultStore) queryJSONArray(data interface{}, filter string) (interface{}, error) {
	arr, ok := data.([]interface{})
	if !ok {
		return nil, fmt.Errorf("data is not a JSON array")
	}

	// Simple contains filter for now
	// Format: "field=value" or "field contains value"
	var results []interface{}

	if strings.Contains(filter, "=") {
		parts := strings.SplitN(filter, "=", 2)
		field := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		for _, item := range arr {
			if obj, ok := item.(map[string]interface{}); ok {
				if fieldValue, exists := obj[field]; exists {
					if fmt.Sprintf("%v", fieldValue) == value ||
						strings.Contains(fmt.Sprintf("%v", fieldValue), value) {
						results = append(results, item)
					}
				}
			}
		}
	} else {
		// Full text search
		searchTerm := strings.ToLower(filter)
		for _, item := range arr {
			itemStr := strings.ToLower(fmt.Sprintf("%v", item))
			if strings.Contains(itemStr, searchTerm) {
				results = append(results, item)
			}
		}
	}

	return results, nil
}

// queryJSONObject returns specific paths from a JSON object.
func (rs *ResultStore) queryJSONObject(data interface{}, filter string) (interface{}, error) {
	obj, ok := data.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("data is not a JSON object")
	}

	// Simple path access for now (e.g., "service.name")
	if strings.Contains(filter, ".") {
		parts := strings.Split(filter, ".")
		current := obj
		for i, part := range parts {
			if val, exists := current[part]; exists {
				if i == len(parts)-1 {
					return val, nil
				}
				if nextObj, ok := val.(map[string]interface{}); ok {
					current = nextObj
				} else {
					return nil, fmt.Errorf("path %s is not an object", strings.Join(parts[:i+1], "."))
				}
			} else {
				return nil, fmt.Errorf("path %s not found", filter)
			}
		}
	}

	// Return specific key if it exists
	if val, exists := obj[filter]; exists {
		return val, nil
	}

	return nil, fmt.Errorf("key %s not found", filter)
}

// queryText searches for lines containing the filter string.
func (rs *ResultStore) queryText(text, filter string) (interface{}, error) {
	lines := strings.Split(text, "\n")
	var results []string

	searchTerm := strings.ToLower(filter)
	for _, line := range lines {
		if strings.Contains(strings.ToLower(line), searchTerm) {
			results = append(results, line)
		}
	}

	return results, nil
}

// GetSummary returns a statistical summary of cached data.
func (rs *ResultStore) GetSummary(id string) (map[string]interface{}, error) {
	result, err := rs.Get(id)
	if err != nil {
		return nil, err
	}

	summary := map[string]interface{}{
		"id":            result.ID,
		"data_type":     result.Metadata.DataType,
		"total_size":    result.Metadata.TotalSize,
		"created_at":    result.CreatedAt,
		"access_count":  result.AccessCount,
		"ttl_remaining": rs.ttl - time.Since(result.CreatedAt),
	}

	switch result.Metadata.DataType {
	case "json_array":
		if arr, ok := result.Data.([]interface{}); ok {
			summary["total_items"] = len(arr)
			if len(arr) > 0 {
				// Get field names from first item
				if obj, ok := arr[0].(map[string]interface{}); ok {
					var fields []string
					for key := range obj {
						fields = append(fields, key)
					}
					summary["fields"] = fields
				}
			}
		}
	case "json_object":
		if obj, ok := result.Data.(map[string]interface{}); ok {
			var keys []string
			for key := range obj {
				keys = append(keys, key)
			}
			summary["keys"] = keys
		}
	case "text":
		lines := strings.Split(result.RawOutput, "\n")
		summary["total_lines"] = len(lines)
	}

	return summary, nil
}

// List returns all active cached results.
func (rs *ResultStore) List() []map[string]interface{} {
	rs.mu.RLock()
	defer rs.mu.RUnlock()

	var results []map[string]interface{}
	for _, result := range rs.results {
		results = append(results, map[string]interface{}{
			"id":            result.ID,
			"command":       result.Metadata.Command,
			"args":          result.Metadata.Args,
			"data_type":     result.Metadata.DataType,
			"size":          result.Metadata.TotalSize,
			"created_at":    result.CreatedAt,
			"ttl_remaining": rs.ttl - time.Since(result.CreatedAt),
		})
	}

	return results
}

// parseOutput determines the type of output and parses it if JSON.
func parseOutput(output string) (string, interface{}) {
	trimmed := strings.TrimSpace(output)

	if trimmed == "" {
		return "text", nil
	}

	// Try to parse as JSON
	if json.Valid([]byte(trimmed)) {
		var data interface{}
		if err := json.Unmarshal([]byte(trimmed), &data); err == nil {
			switch v := data.(type) {
			case []interface{}:
				return "json_array", v
			case map[string]interface{}:
				return "json_object", v
			default:
				return "json_other", v
			}
		}
	}

	// Default to text
	return "text", nil
}

// generateMetadata creates metadata for the cached result.
func generateMetadata(output, dataType string, data interface{}, command string, args []string, flags []types.Flag) ResultMetadata {
	metadata := ResultMetadata{
		TotalSize: len(output),
		DataType:  dataType,
		Command:   command,
		Args:      args,
		Flags:     flags,
	}

	switch dataType {
	case "json_array":
		if arr, ok := data.([]interface{}); ok {
			metadata.TotalItems = len(arr)
			metadata.PreviewItems = min(MaxPreviewItems, len(arr))
		}
	case "text":
		lines := strings.Split(output, "\n")
		metadata.TotalLines = len(lines)
		metadata.PreviewLines = min(MaxPreviewLines, len(lines))
	}

	return metadata
}

// generateID generates a unique ID for a cached result.
func generateID() string {
	bytes := make([]byte, 8)
	_, _ = rand.Read(bytes) // Ignore error as crypto/rand.Read rarely fails
	return "result_" + hex.EncodeToString(bytes)
}

// min returns the minimum of two integers.
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

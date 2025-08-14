package cache

import (
	"encoding/json"
	"strings"
)

// GeneratePreview creates a preview of the cached data.
func GeneratePreview(output string, dataType string, data interface{}) *Preview {
	switch dataType {
	case "json_array":
		return generateArrayPreview(data)
	case "json_object":
		return generateObjectPreview(data)
	default:
		return generateTextPreview(output)
	}
}

// generateArrayPreview creates a preview for JSON arrays.
func generateArrayPreview(data interface{}) *Preview {
	arr, ok := data.([]interface{})
	if !ok {
		return &Preview{
			Type:      "json_array",
			Truncated: false,
		}
	}

	previewSize := min(MaxPreviewItems, len(arr))
	preview := &Preview{
		Type:       "json_array",
		TotalItems: len(arr),
		Truncated:  len(arr) > MaxPreviewItems,
	}

	if previewSize > 0 {
		preview.FirstItems = arr[:previewSize]
	} else {
		preview.FirstItems = []interface{}{}
	}

	return preview
}

// generateObjectPreview creates a preview for JSON objects.
func generateObjectPreview(data interface{}) *Preview {
	obj, ok := data.(map[string]interface{})
	if !ok {
		return &Preview{
			Type:      "json_object",
			Truncated: false,
		}
	}

	preview := &Preview{
		Type:      "json_object",
		Keys:      make([]string, 0, len(obj)),
		Truncated: len(obj) > MaxPreviewItems,
	}

	// Collect all keys
	for key := range obj {
		preview.Keys = append(preview.Keys, key)
	}

	// Create a sample with limited items
	sample := make(map[string]interface{})
	count := 0
	for key, value := range obj {
		if count >= MaxPreviewItems {
			break
		}

		// For nested objects/arrays, just show type
		switch v := value.(type) {
		case map[string]interface{}:
			sample[key] = map[string]string{"_type": "object", "_keys": strings.Join(getObjectKeys(v), ", ")}
		case []interface{}:
			sample[key] = map[string]interface{}{"_type": "array", "_length": len(v)}
		default:
			sample[key] = value
		}
		count++
	}

	preview.Sample = sample
	return preview
}

// generateTextPreview creates a preview for text output.
func generateTextPreview(output string) *Preview {
	lines := strings.Split(output, "\n")
	previewSize := min(MaxPreviewLines, len(lines))

	preview := &Preview{
		Type:       "text",
		TotalLines: len(lines),
		Truncated:  len(lines) > MaxPreviewLines,
	}

	if previewSize > 0 {
		preview.FirstLines = lines[:previewSize]
	} else {
		preview.FirstLines = []string{}
	}

	return preview
}

// getObjectKeys returns the keys of a JSON object.
func getObjectKeys(obj map[string]interface{}) []string {
	keys := make([]string, 0, len(obj))
	for key := range obj {
		keys = append(keys, key)
	}
	return keys
}

// CreateCachedResponse creates a response for cached output.
func CreateCachedResponse(resultID string, output string, command string, args []string, flags []interface{}) CachedResponse {
	dataType, data := parseOutput(output)

	metadata := ResultMetadata{
		TotalSize: len(output),
		DataType:  dataType,
		Command:   command,
		Args:      args,
	}

	// Set type-specific metadata
	switch dataType {
	case "json_array":
		if arr, ok := data.([]interface{}); ok {
			metadata.TotalItems = len(arr)
		}
	case "text":
		lines := strings.Split(output, "\n")
		metadata.TotalLines = len(lines)
	}

	preview := GeneratePreview(output, dataType, data)

	nextSteps := []string{
		"Use fastly_result_read to get paginated data (offset/limit)",
		"Use fastly_result_query to filter/search within results",
		"Use fastly_result_summary for a statistical overview",
		"Use fastly_result_list to see all cached results",
	}

	// Add type-specific guidance
	switch dataType {
	case "json_array":
		nextSteps = append([]string{
			"Example: fastly_result_read with offset=0, limit=20 to get first 20 items",
			"Example: fastly_result_query with filter='name=production' to find specific items",
		}, nextSteps...)
	case "text":
		nextSteps = append([]string{
			"Example: fastly_result_read with offset=0, limit=50 to get first 50 lines",
			"Example: fastly_result_query with filter='error' to find lines containing 'error'",
		}, nextSteps...)
	}

	return CachedResponse{
		Success:      true,
		ResultID:     resultID,
		Cached:       true,
		Metadata:     metadata,
		Preview:      preview,
		Instructions: "Output cached due to size. Use the result_id with retrieval tools to access the full data.",
		NextSteps:    nextSteps,
	}
}

// ShouldCache determines if an output should be cached based on its size.
func ShouldCache(output string) bool {
	return len(output) > OutputCacheThreshold
}

// TruncateForPreview truncates data for safe preview generation.
func TruncateForPreview(data interface{}) interface{} {
	// Ensure preview data doesn't exceed reasonable size
	jsonBytes, err := json.Marshal(data)
	if err != nil || len(jsonBytes) <= 5000 { // 5KB max for preview
		return data
	}

	// If preview itself is too large, return minimal info
	return map[string]interface{}{
		"_truncated": true,
		"_message":   "Preview data too large. Use retrieval tools to access.",
	}
}


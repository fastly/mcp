package background

import (
	"bytes"
	"regexp"
	"sync"
)

// LineBuffer is a circular buffer that stores output lines with a maximum size limit.
// When the limit is reached, the oldest lines are discarded.
type LineBuffer struct {
	lines      []string
	totalSize  int64
	maxSize    int64
	lineCount  int64 // Total lines ever written (for indexing)
	startIndex int64 // First available line index (lines before this were discarded)
	mu         sync.RWMutex
	partial    bytes.Buffer // Holds incomplete lines
}

// NewLineBuffer creates a new line buffer with the specified maximum size.
func NewLineBuffer(maxSize int64) *LineBuffer {
	if maxSize <= 0 {
		maxSize = DefaultMaxDataSize
	}
	return &LineBuffer{
		lines:   make([]string, 0, 10000), // Pre-allocate for 10k lines
		maxSize: maxSize,
	}
}

// Write appends data to the buffer, parsing it into lines.
// Returns the number of bytes written.
func (lb *LineBuffer) Write(data []byte) (int, error) {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	lb.partial.Write(data)
	content := lb.partial.Bytes()

	// Process complete lines
	for {
		idx := bytes.IndexByte(content, '\n')
		if idx == -1 {
			break
		}

		line := string(content[:idx])
		content = content[idx+1:]
		lb.addLine(line)
	}

	// Keep remaining partial line
	lb.partial.Reset()
	lb.partial.Write(content)

	return len(data), nil
}

// Flush writes any remaining partial line as a complete line.
func (lb *LineBuffer) Flush() {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	if lb.partial.Len() > 0 {
		lb.addLine(lb.partial.String())
		lb.partial.Reset()
	}
}

// addLine adds a single line to the buffer, evicting old lines if needed.
// Must be called with lock held.
func (lb *LineBuffer) addLine(line string) {
	lineSize := int64(len(line))

	// Evict old lines if we're over the limit
	for lb.totalSize+lineSize > lb.maxSize && len(lb.lines) > 0 {
		evicted := lb.lines[0]
		lb.lines = lb.lines[1:]
		lb.totalSize -= int64(len(evicted))
		lb.startIndex++
	}

	// If a single line exceeds max size, truncate it
	if lineSize > lb.maxSize {
		line = line[:lb.maxSize]
		lineSize = lb.maxSize
	}

	lb.lines = append(lb.lines, line)
	lb.totalSize += lineSize
	lb.lineCount++
}

// Read returns lines starting at the given offset with a limit.
// Offset is absolute (based on lineCount), not relative to current buffer.
func (lb *LineBuffer) Read(offset, limit int64) ([]string, bool) {
	lb.mu.RLock()
	defer lb.mu.RUnlock()

	if limit <= 0 {
		limit = DefaultReadLimit
	}

	// Calculate buffer-relative indices
	if offset < lb.startIndex {
		offset = lb.startIndex
	}

	bufferOffset := offset - lb.startIndex
	if bufferOffset >= int64(len(lb.lines)) {
		return []string{}, false
	}

	end := bufferOffset + limit
	if end > int64(len(lb.lines)) {
		end = int64(len(lb.lines))
	}

	result := make([]string, end-bufferOffset)
	copy(result, lb.lines[bufferOffset:end])

	hasMore := end < int64(len(lb.lines))
	return result, hasMore
}

// Query searches for lines matching the pattern and returns matches.
func (lb *LineBuffer) Query(pattern string, maxResults int) ([]MatchedLine, bool) {
	lb.mu.RLock()
	defer lb.mu.RUnlock()

	if maxResults <= 0 {
		maxResults = 100
	}

	re, err := regexp.Compile(pattern)
	if err != nil {
		// Fall back to simple substring search
		return lb.substringQuery(pattern, maxResults)
	}

	var matches []MatchedLine
	truncated := false

	for i, line := range lb.lines {
		if re.MatchString(line) {
			matches = append(matches, MatchedLine{
				LineNumber: lb.startIndex + int64(i),
				Content:    line,
			})
			if len(matches) >= maxResults {
				truncated = true
				break
			}
		}
	}

	return matches, truncated
}

// substringQuery performs a simple substring search.
func (lb *LineBuffer) substringQuery(pattern string, maxResults int) ([]MatchedLine, bool) {
	var matches []MatchedLine
	truncated := false

	for i, line := range lb.lines {
		if bytes.Contains([]byte(line), []byte(pattern)) {
			matches = append(matches, MatchedLine{
				LineNumber: lb.startIndex + int64(i),
				Content:    line,
			})
			if len(matches) >= maxResults {
				truncated = true
				break
			}
		}
	}

	return matches, truncated
}

// Stats returns buffer statistics.
func (lb *LineBuffer) Stats() (totalSize int64, lineCount int64, startIndex int64, bufferLines int64) {
	lb.mu.RLock()
	defer lb.mu.RUnlock()
	return lb.totalSize, lb.lineCount, lb.startIndex, int64(len(lb.lines))
}

// TotalLines returns the total number of lines ever written.
func (lb *LineBuffer) TotalLines() int64 {
	lb.mu.RLock()
	defer lb.mu.RUnlock()
	return lb.lineCount
}

// TotalSize returns the current size in bytes.
func (lb *LineBuffer) TotalSize() int64 {
	lb.mu.RLock()
	defer lb.mu.RUnlock()
	return lb.totalSize
}

// AvailableLines returns the number of lines currently in the buffer.
func (lb *LineBuffer) AvailableLines() int64 {
	lb.mu.RLock()
	defer lb.mu.RUnlock()
	return int64(len(lb.lines))
}

// DataLimitReached returns true if the buffer has reached its maximum size.
func (lb *LineBuffer) DataLimitReached() bool {
	lb.mu.RLock()
	defer lb.mu.RUnlock()
	return lb.totalSize >= lb.maxSize
}

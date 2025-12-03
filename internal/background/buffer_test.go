package background

import (
	"strings"
	"testing"
)

func TestLineBuffer_Write(t *testing.T) {
	buf := NewLineBuffer(1000)

	n, err := buf.Write([]byte("line 1\nline 2\nline 3\n"))
	if err != nil {
		t.Fatalf("Write failed: %v", err)
	}
	if n != 21 {
		t.Errorf("Expected 21 bytes written, got %d", n)
	}

	if buf.TotalLines() != 3 {
		t.Errorf("Expected 3 lines, got %d", buf.TotalLines())
	}
}

func TestLineBuffer_PartialLine(t *testing.T) {
	buf := NewLineBuffer(1000)

	_, _ = buf.Write([]byte("partial"))
	if buf.TotalLines() != 0 {
		t.Errorf("Expected 0 lines before newline, got %d", buf.TotalLines())
	}

	_, _ = buf.Write([]byte(" line\n"))
	if buf.TotalLines() != 1 {
		t.Errorf("Expected 1 line after newline, got %d", buf.TotalLines())
	}

	lines, _ := buf.Read(0, 10)
	if len(lines) != 1 || lines[0] != "partial line" {
		t.Errorf("Expected 'partial line', got %v", lines)
	}
}

func TestLineBuffer_Flush(t *testing.T) {
	buf := NewLineBuffer(1000)

	_, _ = buf.Write([]byte("incomplete"))
	buf.Flush()

	if buf.TotalLines() != 1 {
		t.Errorf("Expected 1 line after flush, got %d", buf.TotalLines())
	}

	lines, _ := buf.Read(0, 10)
	if len(lines) != 1 || lines[0] != "incomplete" {
		t.Errorf("Expected 'incomplete', got %v", lines)
	}
}

func TestLineBuffer_MaxSize(t *testing.T) {
	buf := NewLineBuffer(50) // Small buffer for testing

	// Write more data than the buffer can hold
	for i := 0; i < 10; i++ {
		_, _ = buf.Write([]byte("this is a longer line\n"))
	}

	// Buffer should have evicted old lines
	if buf.TotalSize() > 50 {
		t.Errorf("Buffer exceeded max size: %d > 50", buf.TotalSize())
	}

	// Available lines should be less than total written
	if buf.AvailableLines() >= 10 {
		t.Errorf("Expected fewer available lines, got %d", buf.AvailableLines())
	}

	// Total lines should still reflect all written
	if buf.TotalLines() != 10 {
		t.Errorf("Expected 10 total lines, got %d", buf.TotalLines())
	}
}

func TestLineBuffer_Read_Pagination(t *testing.T) {
	buf := NewLineBuffer(10000)

	for i := 0; i < 100; i++ {
		_, _ = buf.Write([]byte("line\n"))
	}

	// Read first page
	lines, hasMore := buf.Read(0, 10)
	if len(lines) != 10 {
		t.Errorf("Expected 10 lines, got %d", len(lines))
	}
	if !hasMore {
		t.Error("Expected hasMore to be true")
	}

	// Read second page
	lines, hasMore = buf.Read(10, 10)
	if len(lines) != 10 {
		t.Errorf("Expected 10 lines, got %d", len(lines))
	}
	if !hasMore {
		t.Error("Expected hasMore to be true")
	}

	// Read last page
	lines, hasMore = buf.Read(90, 10)
	if len(lines) != 10 {
		t.Errorf("Expected 10 lines, got %d", len(lines))
	}
	if hasMore {
		t.Error("Expected hasMore to be false")
	}

	// Read beyond end
	lines, hasMore = buf.Read(100, 10)
	if len(lines) != 0 {
		t.Errorf("Expected 0 lines, got %d", len(lines))
	}
	if hasMore {
		t.Error("Expected hasMore to be false")
	}
}

func TestLineBuffer_Query_Substring(t *testing.T) {
	buf := NewLineBuffer(10000)

	_, _ = buf.Write([]byte("error: something failed\n"))
	_, _ = buf.Write([]byte("info: all good\n"))
	_, _ = buf.Write([]byte("error: another failure\n"))
	_, _ = buf.Write([]byte("debug: details\n"))

	matches, truncated := buf.Query("error", 100)
	if truncated {
		t.Error("Expected not truncated")
	}
	if len(matches) != 2 {
		t.Errorf("Expected 2 matches, got %d", len(matches))
	}
}

func TestLineBuffer_Query_Regex(t *testing.T) {
	buf := NewLineBuffer(10000)

	_, _ = buf.Write([]byte("2024-01-01 error\n"))
	_, _ = buf.Write([]byte("2024-01-02 info\n"))
	_, _ = buf.Write([]byte("2024-01-03 error\n"))

	matches, _ := buf.Query("2024-01-0[13]", 100)
	if len(matches) != 2 {
		t.Errorf("Expected 2 regex matches, got %d", len(matches))
	}
}

func TestLineBuffer_Query_MaxResults(t *testing.T) {
	buf := NewLineBuffer(10000)

	for i := 0; i < 20; i++ {
		_, _ = buf.Write([]byte("matching line\n"))
	}

	matches, truncated := buf.Query("matching", 5)
	if len(matches) != 5 {
		t.Errorf("Expected 5 matches, got %d", len(matches))
	}
	if !truncated {
		t.Error("Expected truncated to be true")
	}
}

func TestLineBuffer_DataLimitReached(t *testing.T) {
	buf := NewLineBuffer(100)

	// Fill the buffer
	for i := 0; i < 20; i++ {
		_, _ = buf.Write([]byte(strings.Repeat("x", 10) + "\n"))
	}

	if !buf.DataLimitReached() {
		t.Error("Expected DataLimitReached to be true")
	}
}

func TestLineBuffer_Stats(t *testing.T) {
	buf := NewLineBuffer(10000)

	_, _ = buf.Write([]byte("line 1\nline 2\nline 3\n"))

	totalSize, lineCount, startIndex, bufferLines := buf.Stats()

	if lineCount != 3 {
		t.Errorf("Expected lineCount 3, got %d", lineCount)
	}
	if startIndex != 0 {
		t.Errorf("Expected startIndex 0, got %d", startIndex)
	}
	if bufferLines != 3 {
		t.Errorf("Expected bufferLines 3, got %d", bufferLines)
	}
	if totalSize != 18 { // "line 1" + "line 2" + "line 3" = 6+6+6 = 18
		t.Errorf("Expected totalSize 18, got %d", totalSize)
	}
}

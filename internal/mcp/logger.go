// Package mcp provides logging functionality for MCP command requests
package mcp

import (
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
)

// CommandLogger handles logging of MCP commands to a file
type CommandLogger struct {
	file  *os.File
	mutex sync.Mutex
}

// LogEntry represents a single logged MCP command
type LogEntry struct {
	Timestamp  time.Time              `json:"timestamp"`
	Tool       string                 `json:"tool"`
	Request    map[string]interface{} `json:"request"`
	Success    bool                   `json:"success"`
	Error      string                 `json:"error,omitempty"`
	DurationMs int64                  `json:"duration_ms"`
}

var (
	commandLogger *CommandLogger
	loggerMutex   sync.Mutex
)

// InitializeCommandLogger initializes the command logger with the specified file path
func InitializeCommandLogger(filePath string) error {
	if filePath == "" {
		return nil
	}

	loggerMutex.Lock()
	defer loggerMutex.Unlock()

	// Close existing logger if any
	if commandLogger != nil {
		_ = commandLogger.Close()
	}

	file, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}

	commandLogger = &CommandLogger{
		file: file,
	}

	// Write initial log entry in human-readable format
	timestamp := time.Now().Format("2006-01-02 15:04:05.000")
	initialMsg := fmt.Sprintf("[%s] === MCP Command Logger Started (PID: %d) ===", timestamp, os.Getpid())

	if _, err := fmt.Fprintln(file, initialMsg); err != nil {
		_ = file.Close()
		commandLogger = nil
		return fmt.Errorf("failed to write initial log entry: %w", err)
	}

	return nil
}

// LogCommand logs an MCP command request and response
func LogCommand(tool string, request map[string]interface{}, response interface{}, err error, duration time.Duration) {
	if commandLogger == nil {
		return
	}

	// Determine success based on error presence
	success := err == nil

	// For successful responses, check if the response indicates failure
	if success && response != nil {
		if result, ok := response.(*mcp.CallToolResult); ok && len(result.Content) > 0 {
			if textContent, ok := result.Content[0].(*mcp.TextContent); ok {
				// Check if the response text contains success: false
				if strings.Contains(textContent.Text, `"success": false`) {
					success = false
				}
			}
		}
	}

	entry := LogEntry{
		Timestamp:  time.Now().UTC(),
		Tool:       tool,
		Request:    request,
		Success:    success,
		DurationMs: duration.Milliseconds(),
	}

	if err != nil {
		entry.Error = err.Error()
	}

	if writeErr := commandLogger.writeLog(entry); writeErr != nil {
		// Log to stderr if we can't write to the log file
		fmt.Fprintf(os.Stderr, "Failed to write to command log: %v\n", writeErr)
	}
}

// writeLog writes a human-readable log entry
func (cl *CommandLogger) writeLog(entry LogEntry) error {
	cl.mutex.Lock()
	defer cl.mutex.Unlock()

	// Format timestamp in a readable format
	timestamp := entry.Timestamp.Format("2006-01-02 15:04:05.000")

	// Format the command from the request
	command := entry.Tool
	if cmd, ok := entry.Request["command"].(string); ok {
		if args, ok := entry.Request["args"].([]interface{}); ok && len(args) > 0 {
			argStrs := make([]string, len(args))
			for i, arg := range args {
				argStrs[i] = fmt.Sprintf("%v", arg)
			}
			command = fmt.Sprintf("%s %s %s", entry.Tool, cmd, strings.Join(argStrs, " "))
		} else {
			command = fmt.Sprintf("%s %s", entry.Tool, cmd)
		}
	}

	// Build status indicator
	status := "✓"
	if !entry.Success {
		status = "✗"
	}

	// Build the log line
	logLine := fmt.Sprintf("[%s] %s %s (%dms)", timestamp, status, command, entry.DurationMs)

	// Add error details if present
	if entry.Error != "" {
		// Extract just the first line of the error for conciseness
		errorLines := strings.Split(entry.Error, "\n")
		errorMsg := strings.TrimSpace(errorLines[0])
		if len(errorMsg) > 100 {
			errorMsg = errorMsg[:97] + "..."
		}
		logLine += fmt.Sprintf(" ERROR: %s", errorMsg)
	}

	// Write the line
	_, err := fmt.Fprintln(cl.file, logLine)
	if err != nil {
		return err
	}

	// Flush to ensure data is written immediately
	return cl.file.Sync()
}

// Close closes the command logger
func (cl *CommandLogger) Close() error {
	cl.mutex.Lock()
	defer cl.mutex.Unlock()

	if cl.file != nil {
		// Write final log entry in human-readable format
		timestamp := time.Now().Format("2006-01-02 15:04:05.000")
		finalMsg := fmt.Sprintf("[%s] === MCP Command Logger Closed ===", timestamp)
		_, _ = fmt.Fprintln(cl.file, finalMsg)

		return cl.file.Close()
	}
	return nil
}

// CloseCommandLogger closes the global command logger
func CloseCommandLogger() {
	loggerMutex.Lock()
	defer loggerMutex.Unlock()

	if commandLogger != nil {
		_ = commandLogger.Close()
		commandLogger = nil
	}
}

// Package background provides support for long-running streaming commands like log-tail.
// It manages background processes, collects output with configurable size limits, and
// provides pagination for reading collected data.
package background

import (
	"time"

	"github.com/fastly/mcp/internal/types"
)

const (
	DefaultMaxDataSize    = 1 << 30 // 1 GB
	DefaultMaxJobs        = 5
	DefaultJobTimeout     = 1 * time.Hour
	DefaultCleanupAge     = 10 * time.Minute
	DefaultCleanupTick    = 1 * time.Minute
	DefaultReadLimit      = 100  // lines per read
	DefaultShutdownWait   = 5 * time.Second
)

type JobStatus string

const (
	JobStatusRunning   JobStatus = "running"
	JobStatusStopped   JobStatus = "stopped"
	JobStatusCompleted JobStatus = "completed"
	JobStatusError     JobStatus = "error"
)

// JobInfo provides a summary of a background job for listing purposes.
type JobInfo struct {
	ID           string        `json:"id"`
	Command      string        `json:"command"`
	Args         []string      `json:"args"`
	Status       JobStatus     `json:"status"`
	StartedAt    time.Time     `json:"started_at"`
	StoppedAt    *time.Time    `json:"stopped_at,omitempty"`
	Duration     time.Duration `json:"duration"`
	OutputSize   int64         `json:"output_size"`
	LineCount    int64         `json:"line_count"`
	Error        string        `json:"error,omitempty"`
	DataLimitHit bool          `json:"data_limit_hit,omitempty"`
}

// JobOutput represents paginated output from a background job.
type JobOutput struct {
	JobID      string   `json:"job_id"`
	Lines      []string `json:"lines"`
	Offset     int64    `json:"offset"`
	Limit      int64    `json:"limit"`
	TotalLines int64    `json:"total_lines"`
	HasMore    bool     `json:"has_more"`
}

// JobQueryResult represents search results from job output.
type JobQueryResult struct {
	JobID       string        `json:"job_id"`
	Pattern     string        `json:"pattern"`
	Matches     []MatchedLine `json:"matches"`
	TotalCount  int           `json:"total_count"`
	Truncated   bool          `json:"truncated,omitempty"`
}

// MatchedLine represents a line that matched a search pattern.
type MatchedLine struct {
	LineNumber int64  `json:"line_number"`
	Content    string `json:"content"`
}

// StartRequest contains parameters for starting a background job.
type StartRequest struct {
	Command string       `json:"command"`
	Args    []string     `json:"args"`
	Flags   []types.Flag `json:"flags,omitempty"`
}

// StartResponse contains the result of starting a background job.
type StartResponse struct {
	Success      bool      `json:"success"`
	JobID        string    `json:"job_id,omitempty"`
	Status       JobStatus `json:"status,omitempty"`
	Error        string    `json:"error,omitempty"`
	Instructions string    `json:"instructions,omitempty"`
}

// StopResponse contains the result of stopping a background job.
type StopResponse struct {
	Success      bool      `json:"success"`
	JobID        string    `json:"job_id"`
	Status       JobStatus `json:"status"`
	OutputSize   int64     `json:"output_size"`
	LineCount    int64     `json:"line_count"`
	Duration     string    `json:"duration"`
	Error        string    `json:"error,omitempty"`
}

// StatusResponse contains detailed status of a background job.
type StatusResponse struct {
	Success      bool       `json:"success"`
	JobID        string     `json:"job_id"`
	Command      string     `json:"command"`
	Args         []string   `json:"args"`
	Status       JobStatus  `json:"status"`
	StartedAt    time.Time  `json:"started_at"`
	StoppedAt    *time.Time `json:"stopped_at,omitempty"`
	Duration     string     `json:"duration"`
	OutputSize   int64      `json:"output_size"`
	LineCount    int64      `json:"line_count"`
	DataLimitHit bool       `json:"data_limit_hit"`
	MaxDataSize  int64      `json:"max_data_size"`
	Error        string     `json:"error,omitempty"`
}

// ListResponse contains a list of background jobs.
type ListResponse struct {
	Success bool      `json:"success"`
	Jobs    []JobInfo `json:"jobs"`
	Count   int       `json:"count"`
}

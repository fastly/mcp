package background

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/fastly/mcp/internal/types"
	"github.com/fastly/mcp/internal/version"
)

// Job represents a background streaming command.
type Job struct {
	ID        string
	Command   string
	Args      []string
	Flags     []types.Flag
	Status    JobStatus
	StartedAt time.Time
	StoppedAt *time.Time
	Error     string

	buffer     *LineBuffer
	cmd        *exec.Cmd
	cancelFunc context.CancelFunc
	done       chan struct{}
	mu         sync.RWMutex
}

// NewJob creates a new background job.
func NewJob(command string, args []string, flags []types.Flag, maxDataSize int64) *Job {
	return &Job{
		ID:        generateJobID(),
		Command:   command,
		Args:      args,
		Flags:     flags,
		Status:    JobStatusRunning,
		StartedAt: time.Now(),
		buffer:    NewLineBuffer(maxDataSize),
		done:      make(chan struct{}),
	}
}

// Start begins executing the background command.
func (j *Job) Start(ctx context.Context, timeout time.Duration) error {
	j.mu.Lock()
	defer j.mu.Unlock()

	if timeout == 0 {
		timeout = DefaultJobTimeout
	}

	// Create cancellable context
	jobCtx, cancel := context.WithTimeout(ctx, timeout)
	j.cancelFunc = cancel

	// Build the command
	fastlyPath := "fastly"
	if customPath := os.Getenv("FASTLY_CLI_PATH"); customPath != "" {
		fastlyPath = customPath
	}

	// Build argument list
	fullArgs := make([]string, 0, len(j.Args)+len(j.Flags)*2)
	fullArgs = append(fullArgs, j.Args...)
	for _, flag := range j.Flags {
		if flag.Value != "" {
			fullArgs = append(fullArgs, fmt.Sprintf("--%s=%s", flag.Name, flag.Value))
		} else {
			fullArgs = append(fullArgs, fmt.Sprintf("--%s", flag.Name))
		}
	}

	j.cmd = exec.CommandContext(jobCtx, fastlyPath, fullArgs...)

	// Set environment
	versionedAddon := fmt.Sprintf("mcp/%s", version.GetVersion())
	j.cmd.Env = append(os.Environ(),
		fmt.Sprintf("FASTLY_CLI_ADDON=%s", versionedAddon),
		fmt.Sprintf("FASTLY_USER_AGENT_EXTENSION=%s", versionedAddon))

	// Connect stdout and stderr to the buffer
	stdout, err := j.cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	stderr, err := j.cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	// Start the process
	if err := j.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start command: %w", err)
	}

	// Start goroutines to read output
	go j.readOutput(stdout, "stdout")
	go j.readOutput(stderr, "stderr")

	// Monitor process completion
	go j.monitor(jobCtx)

	return nil
}

// readOutput reads from a pipe and writes to the buffer.
func (j *Job) readOutput(r io.ReadCloser, _ string) {
	defer func() { _ = r.Close() }()

	buf := make([]byte, 4096)
	for {
		n, err := r.Read(buf)
		if n > 0 {
			_, _ = j.buffer.Write(buf[:n])
		}
		if err != nil {
			break
		}
	}
}

// monitor watches for process completion.
func (j *Job) monitor(ctx context.Context) {
	err := j.cmd.Wait()

	j.mu.Lock()
	defer j.mu.Unlock()

	// Flush any remaining partial line
	j.buffer.Flush()

	now := time.Now()
	j.StoppedAt = &now

	if ctx.Err() == context.DeadlineExceeded {
		j.Status = JobStatusError
		j.Error = "job timed out"
	} else if ctx.Err() == context.Canceled {
		j.Status = JobStatusStopped
	} else if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			// Non-zero exit code
			j.Status = JobStatusError
			j.Error = fmt.Sprintf("process exited with code %d", exitErr.ExitCode())
		} else {
			j.Status = JobStatusError
			j.Error = err.Error()
		}
	} else {
		j.Status = JobStatusCompleted
	}

	close(j.done)
}

// Stop gracefully stops the background job.
func (j *Job) Stop() error {
	j.mu.Lock()

	if j.Status != JobStatusRunning {
		j.mu.Unlock()
		return fmt.Errorf("job is not running (status: %s)", j.Status)
	}

	// Cancel the context to signal the process
	if j.cancelFunc != nil {
		j.cancelFunc()
	}

	// Get the done channel and cmd while holding the lock
	done := j.done
	cmd := j.cmd
	j.mu.Unlock()

	// Wait for completion with timeout (without holding lock)
	select {
	case <-done:
	case <-time.After(DefaultShutdownWait):
		// Force kill if graceful shutdown fails
		if cmd != nil && cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
	}

	return nil
}

// Info returns a summary of the job.
func (j *Job) Info() JobInfo {
	j.mu.RLock()
	defer j.mu.RUnlock()

	info := JobInfo{
		ID:           j.ID,
		Command:      j.Command,
		Args:         j.Args,
		Status:       j.Status,
		StartedAt:    j.StartedAt,
		StoppedAt:    j.StoppedAt,
		OutputSize:   j.buffer.TotalSize(),
		LineCount:    j.buffer.TotalLines(),
		Error:        j.Error,
		DataLimitHit: j.buffer.DataLimitReached(),
	}

	if j.StoppedAt != nil {
		info.Duration = j.StoppedAt.Sub(j.StartedAt)
	} else {
		info.Duration = time.Since(j.StartedAt)
	}

	return info
}

// Read returns paginated output from the job.
func (j *Job) Read(offset, limit int64) JobOutput {
	j.mu.RLock()
	defer j.mu.RUnlock()

	if limit <= 0 {
		limit = DefaultReadLimit
	}

	lines, hasMore := j.buffer.Read(offset, limit)

	return JobOutput{
		JobID:      j.ID,
		Lines:      lines,
		Offset:     offset,
		Limit:      limit,
		TotalLines: j.buffer.TotalLines(),
		HasMore:    hasMore,
	}
}

// Query searches the job output for matching lines.
func (j *Job) Query(pattern string, maxResults int) JobQueryResult {
	j.mu.RLock()
	defer j.mu.RUnlock()

	if maxResults <= 0 {
		maxResults = 100
	}

	matches, truncated := j.buffer.Query(pattern, maxResults)

	return JobQueryResult{
		JobID:      j.ID,
		Pattern:    pattern,
		Matches:    matches,
		TotalCount: len(matches),
		Truncated:  truncated,
	}
}

// DetailedStatus returns comprehensive status information.
func (j *Job) DetailedStatus(maxDataSize int64) StatusResponse {
	j.mu.RLock()
	defer j.mu.RUnlock()

	var duration string
	if j.StoppedAt != nil {
		duration = j.StoppedAt.Sub(j.StartedAt).String()
	} else {
		duration = time.Since(j.StartedAt).String()
	}

	return StatusResponse{
		Success:      true,
		JobID:        j.ID,
		Command:      j.Command,
		Args:         j.Args,
		Status:       j.Status,
		StartedAt:    j.StartedAt,
		StoppedAt:    j.StoppedAt,
		Duration:     duration,
		OutputSize:   j.buffer.TotalSize(),
		LineCount:    j.buffer.TotalLines(),
		DataLimitHit: j.buffer.DataLimitReached(),
		MaxDataSize:  maxDataSize,
		Error:        j.Error,
	}
}

// IsRunning returns true if the job is still running.
func (j *Job) IsRunning() bool {
	j.mu.RLock()
	defer j.mu.RUnlock()
	return j.Status == JobStatusRunning
}

// Done returns a channel that closes when the job completes.
func (j *Job) Done() <-chan struct{} {
	return j.done
}

func generateJobID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return "job_" + hex.EncodeToString(b)
}

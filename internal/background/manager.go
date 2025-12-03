package background

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/fastly/mcp/internal/types"
)

// Manager coordinates all background jobs.
type Manager struct {
	jobs        map[string]*Job
	maxJobs     int
	maxDataSize int64
	jobTimeout  time.Duration
	cleanupAge  time.Duration
	stopCleanup chan struct{}
	mu          sync.RWMutex
}

var (
	globalManager *Manager
	managerOnce   sync.Once
)

// GetManager returns the global background job manager.
func GetManager() *Manager {
	managerOnce.Do(func() {
		globalManager = NewManager(DefaultMaxJobs, DefaultMaxDataSize, DefaultJobTimeout, DefaultCleanupAge)
	})
	return globalManager
}

// NewManager creates a new job manager with the specified settings.
func NewManager(maxJobs int, maxDataSize int64, jobTimeout, cleanupAge time.Duration) *Manager {
	if maxJobs <= 0 {
		maxJobs = DefaultMaxJobs
	}
	if maxDataSize <= 0 {
		maxDataSize = DefaultMaxDataSize
	}
	if jobTimeout <= 0 {
		jobTimeout = DefaultJobTimeout
	}
	if cleanupAge <= 0 {
		cleanupAge = DefaultCleanupAge
	}

	m := &Manager{
		jobs:        make(map[string]*Job),
		maxJobs:     maxJobs,
		maxDataSize: maxDataSize,
		jobTimeout:  jobTimeout,
		cleanupAge:  cleanupAge,
		stopCleanup: make(chan struct{}),
	}

	go m.cleanupLoop()

	return m
}

// cleanupLoop periodically removes old completed/stopped jobs.
func (m *Manager) cleanupLoop() {
	ticker := time.NewTicker(DefaultCleanupTick)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.cleanup()
		case <-m.stopCleanup:
			return
		}
	}
}

// cleanup removes old completed jobs.
func (m *Manager) cleanup() {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	for id, job := range m.jobs {
		if !job.IsRunning() && job.StoppedAt != nil {
			if now.Sub(*job.StoppedAt) > m.cleanupAge {
				delete(m.jobs, id)
			}
		}
	}
}

// Start creates and starts a new background job.
func (m *Manager) Start(ctx context.Context, command string, args []string, flags []types.Flag) (*StartResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Check if we've hit the max jobs limit
	runningCount := 0
	for _, job := range m.jobs {
		if job.IsRunning() {
			runningCount++
		}
	}

	if runningCount >= m.maxJobs {
		return &StartResponse{
			Success: false,
			Error:   fmt.Sprintf("maximum number of concurrent jobs (%d) reached", m.maxJobs),
		}, nil
	}

	// Create the job
	job := NewJob(command, args, flags, m.maxDataSize)

	// Start the job
	if err := job.Start(ctx, m.jobTimeout); err != nil {
		return &StartResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	m.jobs[job.ID] = job

	return &StartResponse{
		Success: true,
		JobID:   job.ID,
		Status:  job.Status,
		Instructions: fmt.Sprintf(
			"Job started. Use fastly_background_read with job_id='%s' to read output. "+
				"Use fastly_background_stop to stop the job when done.",
			job.ID,
		),
	}, nil
}

// Stop terminates a running job.
func (m *Manager) Stop(jobID string) (*StopResponse, error) {
	m.mu.RLock()
	job, exists := m.jobs[jobID]
	m.mu.RUnlock()

	if !exists {
		return &StopResponse{
			Success: false,
			JobID:   jobID,
			Error:   "job not found",
		}, nil
	}

	if err := job.Stop(); err != nil {
		return &StopResponse{
			Success: false,
			JobID:   jobID,
			Error:   err.Error(),
		}, nil
	}

	info := job.Info()
	return &StopResponse{
		Success:    true,
		JobID:      jobID,
		Status:     info.Status,
		OutputSize: info.OutputSize,
		LineCount:  info.LineCount,
		Duration:   info.Duration.String(),
	}, nil
}

// Get retrieves a job by ID.
func (m *Manager) Get(jobID string) (*Job, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	job, exists := m.jobs[jobID]
	if !exists {
		return nil, fmt.Errorf("job not found: %s", jobID)
	}

	return job, nil
}

// List returns information about all jobs.
func (m *Manager) List() *ListResponse {
	m.mu.RLock()
	defer m.mu.RUnlock()

	jobs := make([]JobInfo, 0, len(m.jobs))
	for _, job := range m.jobs {
		jobs = append(jobs, job.Info())
	}

	return &ListResponse{
		Success: true,
		Jobs:    jobs,
		Count:   len(jobs),
	}
}

// Status returns detailed status for a job.
func (m *Manager) Status(jobID string) (*StatusResponse, error) {
	job, err := m.Get(jobID)
	if err != nil {
		return &StatusResponse{
			Success: false,
			JobID:   jobID,
			Error:   err.Error(),
		}, nil
	}

	resp := job.DetailedStatus(m.maxDataSize)
	return &resp, nil
}

// Read returns paginated output from a job.
func (m *Manager) Read(jobID string, offset, limit int64) (*JobOutput, error) {
	job, err := m.Get(jobID)
	if err != nil {
		return nil, err
	}

	output := job.Read(offset, limit)
	return &output, nil
}

// Query searches job output for matching lines.
func (m *Manager) Query(jobID string, pattern string, maxResults int) (*JobQueryResult, error) {
	job, err := m.Get(jobID)
	if err != nil {
		return nil, err
	}

	result := job.Query(pattern, maxResults)
	return &result, nil
}

// StopAll stops all running jobs. Used for graceful shutdown.
func (m *Manager) StopAll() {
	m.mu.RLock()
	jobs := make([]*Job, 0)
	for _, job := range m.jobs {
		if job.IsRunning() {
			jobs = append(jobs, job)
		}
	}
	m.mu.RUnlock()

	for _, job := range jobs {
		_ = job.Stop()
	}
}

// Shutdown stops all jobs and the cleanup goroutine.
func (m *Manager) Shutdown() {
	close(m.stopCleanup)
	m.StopAll()
}

// RunningCount returns the number of currently running jobs.
func (m *Manager) RunningCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()

	count := 0
	for _, job := range m.jobs {
		if job.IsRunning() {
			count++
		}
	}
	return count
}

// MaxDataSize returns the maximum data size per job.
func (m *Manager) MaxDataSize() int64 {
	return m.maxDataSize
}

package background

import (
	"context"
	"testing"
	"time"

	"github.com/fastly/mcp/internal/types"
)

func TestNewManager(t *testing.T) {
	m := NewManager(3, 1024, time.Hour, time.Minute)

	if m.maxJobs != 3 {
		t.Errorf("Expected maxJobs 3, got %d", m.maxJobs)
	}
	if m.maxDataSize != 1024 {
		t.Errorf("Expected maxDataSize 1024, got %d", m.maxDataSize)
	}
	if m.jobTimeout != time.Hour {
		t.Errorf("Expected jobTimeout 1h, got %v", m.jobTimeout)
	}

	m.Shutdown()
}

func TestManager_List_Empty(t *testing.T) {
	m := NewManager(5, DefaultMaxDataSize, DefaultJobTimeout, DefaultCleanupAge)
	defer m.Shutdown()

	resp := m.List()
	if !resp.Success {
		t.Error("Expected success")
	}
	if resp.Count != 0 {
		t.Errorf("Expected 0 jobs, got %d", resp.Count)
	}
}

func TestManager_StartValidation(t *testing.T) {
	m := NewManager(5, DefaultMaxDataSize, DefaultJobTimeout, DefaultCleanupAge)
	defer m.Shutdown()

	ctx := context.Background()

	// Start with a simple echo command (won't actually work but tests the flow)
	// Note: This test assumes log-tail is a valid streaming command
	resp, err := m.Start(ctx, "log-tail", []string{}, []types.Flag{
		{Name: "service-id", Value: "test123"},
	})

	// The start might fail if fastly CLI isn't installed, but that's okay for unit tests
	// We're testing the manager logic, not the CLI
	if err != nil {
		t.Logf("Start returned error (expected if CLI not installed): %v", err)
	}

	if resp == nil {
		t.Fatal("Expected non-nil response")
	}

	// If it succeeded, check the job was created
	if resp.Success {
		if resp.JobID == "" {
			t.Error("Expected non-empty job ID")
		}

		// Stop the job
		stopResp, _ := m.Stop(resp.JobID)
		if stopResp == nil {
			t.Fatal("Expected non-nil stop response")
		}
	}
}

func TestManager_MaxJobsLimit(t *testing.T) {
	m := NewManager(1, DefaultMaxDataSize, DefaultJobTimeout, DefaultCleanupAge)
	defer m.Shutdown()

	// Add a mock job directly to simulate hitting the limit
	mockJob := &Job{
		ID:        "test_job_1",
		Command:   "test",
		Status:    JobStatusRunning,
		StartedAt: time.Now(),
		buffer:    NewLineBuffer(1024),
		done:      make(chan struct{}),
	}
	m.mu.Lock()
	m.jobs[mockJob.ID] = mockJob
	m.mu.Unlock()

	ctx := context.Background()
	resp, _ := m.Start(ctx, "log-tail", []string{}, nil)

	if resp.Success {
		t.Error("Expected failure due to max jobs limit")
	}
	if resp.Error == "" {
		t.Error("Expected error message")
	}
}

func TestManager_StopNonExistent(t *testing.T) {
	m := NewManager(5, DefaultMaxDataSize, DefaultJobTimeout, DefaultCleanupAge)
	defer m.Shutdown()

	resp, _ := m.Stop("nonexistent_job")
	if resp.Success {
		t.Error("Expected failure for non-existent job")
	}
	if resp.Error == "" {
		t.Error("Expected error message")
	}
}

func TestManager_StatusNonExistent(t *testing.T) {
	m := NewManager(5, DefaultMaxDataSize, DefaultJobTimeout, DefaultCleanupAge)
	defer m.Shutdown()

	resp, _ := m.Status("nonexistent_job")
	if resp.Success {
		t.Error("Expected failure for non-existent job")
	}
}

func TestManager_ReadNonExistent(t *testing.T) {
	m := NewManager(5, DefaultMaxDataSize, DefaultJobTimeout, DefaultCleanupAge)
	defer m.Shutdown()

	_, err := m.Read("nonexistent_job", 0, 100)
	if err == nil {
		t.Error("Expected error for non-existent job")
	}
}

func TestManager_QueryNonExistent(t *testing.T) {
	m := NewManager(5, DefaultMaxDataSize, DefaultJobTimeout, DefaultCleanupAge)
	defer m.Shutdown()

	_, err := m.Query("nonexistent_job", "pattern", 100)
	if err == nil {
		t.Error("Expected error for non-existent job")
	}
}

func TestManager_RunningCount(t *testing.T) {
	m := NewManager(5, DefaultMaxDataSize, DefaultJobTimeout, DefaultCleanupAge)
	defer m.Shutdown()

	if m.RunningCount() != 0 {
		t.Errorf("Expected 0 running jobs initially, got %d", m.RunningCount())
	}

	// Add mock running job
	mockJob := &Job{
		ID:        "test_job",
		Status:    JobStatusRunning,
		StartedAt: time.Now(),
		buffer:    NewLineBuffer(1024),
		done:      make(chan struct{}),
	}
	m.mu.Lock()
	m.jobs[mockJob.ID] = mockJob
	m.mu.Unlock()

	if m.RunningCount() != 1 {
		t.Errorf("Expected 1 running job, got %d", m.RunningCount())
	}

	// Mark as stopped
	mockJob.mu.Lock()
	mockJob.Status = JobStatusStopped
	mockJob.mu.Unlock()

	if m.RunningCount() != 0 {
		t.Errorf("Expected 0 running jobs after stop, got %d", m.RunningCount())
	}
}

func TestManager_MaxDataSize(t *testing.T) {
	customSize := int64(500 * 1024 * 1024) // 500MB
	m := NewManager(5, customSize, DefaultJobTimeout, DefaultCleanupAge)
	defer m.Shutdown()

	if m.MaxDataSize() != customSize {
		t.Errorf("Expected maxDataSize %d, got %d", customSize, m.MaxDataSize())
	}
}

package fastly

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestBinarySecurityError(t *testing.T) {
	err := &BinarySecurityError{
		Path:    "/tmp/fastly",
		Issue:   "world-writable permissions",
		Details: "permissions are -rwxrwxrwx - this allows any user to modify the binary",
	}

	expected := "SYSTEM ERROR: Binary security check failed for /tmp/fastly: world-writable permissions - permissions are -rwxrwxrwx - this allows any user to modify the binary. This is a critical security issue that prevents execution of the fastly command."
	if err.Error() != expected {
		t.Errorf("BinarySecurityError.Error() = %v, want %v", err.Error(), expected)
	}
}

func TestValidateBinarySecurity_InvalidPath(t *testing.T) {
	// Test with a non-existent binary
	// Temporarily modify PATH to ensure fastly is not found
	oldPath := os.Getenv("PATH")
	oldCliPath := os.Getenv("FASTLY_CLI_PATH")
	_ = os.Setenv("PATH", "/nonexistent")
	_ = os.Setenv("FASTLY_CLI_PATH", "")
	defer func() {
		_ = os.Setenv("PATH", oldPath)
		_ = os.Setenv("FASTLY_CLI_PATH", oldCliPath)
	}()

	err := ValidateBinarySecurity()
	if err == nil {
		t.Error("ValidateBinarySecurity() expected error for non-existent binary, got nil")
	}
}

func TestValidateUnixBinarySecurity(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Skipping Unix-specific test on Windows")
	}

	// Create a temporary file
	tmpFile, err := os.CreateTemp("", "test-binary-*")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer func() { _ = os.Remove(tmpFile.Name()) }()
	_ = tmpFile.Close()

	tests := []struct {
		name    string
		perm    os.FileMode
		wantErr bool
		errMsg  string
	}{
		{"secure permissions", 0o755, false, ""},
		{"world writable", 0o777, true, "world-writable permissions"},
		{"setuid bit", 0o755 | os.ModeSetuid, false, ""}, // Now allowed
		{"setgid bit", 0o755 | os.ModeSetgid, false, ""}, // Now allowed
		{"group writable", 0o775, false, ""},             // Always allowed
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set the permissions
			if err := os.Chmod(tmpFile.Name(), tt.perm); err != nil {
				t.Fatalf("Failed to set permissions: %v", err)
			}

			// Get file info
			fileInfo, err := os.Stat(tmpFile.Name())
			if err != nil {
				t.Fatalf("Failed to stat file: %v", err)
			}

			err = validateUnixBinarySecurity(tmpFile.Name(), fileInfo)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateUnixBinarySecurity() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("validateUnixBinarySecurity() error = %v, want error containing %q", err, tt.errMsg)
			}
		})
	}
}

func TestValidateBinarySecurityWorldWritableDir(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Skipping Unix-specific test on Windows")
	}

	// Create a temporary directory
	tmpDir, err := os.MkdirTemp("", "test-dir-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer func() { _ = os.RemoveAll(tmpDir) }()

	// Create a file in the directory
	tmpFile := filepath.Join(tmpDir, "fastly")
	if err := os.WriteFile(tmpFile, []byte("#!/bin/sh\necho test"), 0o755); err != nil {
		t.Fatalf("Failed to create file: %v", err)
	}

	// Make directory world-writable without sticky bit
	if err := os.Chmod(tmpDir, 0o777); err != nil {
		t.Fatalf("Failed to chmod directory: %v", err)
	}

	// Get file info
	fileInfo, err := os.Stat(tmpFile)
	if err != nil {
		t.Fatalf("Failed to stat file: %v", err)
	}

	// This should fail because parent directory is world-writable without sticky bit
	err = validateUnixBinarySecurity(tmpFile, fileInfo)
	if err == nil {
		t.Error("validateUnixBinarySecurity() should fail for binary in world-writable directory without sticky bit")
	}
	if err != nil && !strings.Contains(err.Error(), "parent directory is world-writable without sticky bit") {
		t.Errorf("validateUnixBinarySecurity() error = %v, want error about world-writable directory without sticky bit", err)
	}
}

func TestValidateBinarySecurityStickyBitDir(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Skipping Unix-specific test on Windows")
	}

	// Create a temporary directory
	tmpDir, err := os.MkdirTemp("", "test-sticky-dir-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer func() { _ = os.RemoveAll(tmpDir) }()

	// Create a file in the directory
	tmpFile := filepath.Join(tmpDir, "fastly")
	if err := os.WriteFile(tmpFile, []byte("#!/bin/sh\necho test"), 0o755); err != nil {
		t.Fatalf("Failed to create file: %v", err)
	}

	// Make directory world-writable with sticky bit (like /tmp)
	// Use os.ModeSticky constant with permission bits
	if err := os.Chmod(tmpDir, 0o777|os.ModeSticky); err != nil {
		t.Fatalf("Failed to chmod directory: %v", err)
	}

	// Verify the sticky bit was set
	dirInfo, err := os.Stat(tmpDir)
	if err != nil {
		t.Fatalf("Failed to stat directory: %v", err)
	}
	if dirInfo.Mode()&os.ModeSticky == 0 {
		t.Logf("Warning: sticky bit was not set on %s (mode: %v)", tmpDir, dirInfo.Mode())
	}

	// Get file info
	fileInfo, err := os.Stat(tmpFile)
	if err != nil {
		t.Fatalf("Failed to stat file: %v", err)
	}

	// This should pass because sticky bit prevents unauthorized deletion
	err = validateUnixBinarySecurity(tmpFile, fileInfo)
	if err != nil {
		t.Errorf("validateUnixBinarySecurity() should pass for binary in world-writable directory with sticky bit, got error: %v", err)
	}
}

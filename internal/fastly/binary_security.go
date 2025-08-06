// Package fastly provides binary security validation to ensure the Fastly CLI
// executable hasn't been compromised or replaced with a malicious version.
package fastly

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

// BinarySecurityError represents a security validation failure for the Fastly CLI binary.
// It provides detailed information about what security check failed and why.
type BinarySecurityError struct {
	Path    string
	Issue   string
	Details string
}

func (e *BinarySecurityError) Error() string {
	return fmt.Sprintf("SYSTEM ERROR: Binary security check failed for %s: %s - %s. This is a critical security issue that prevents execution of the fastly command.", e.Path, e.Issue, e.Details)
}

// ValidateBinarySecurity performs comprehensive security checks on the fastly binary
// to ensure it hasn't been compromised. This includes:
//   - Verifying the binary exists and is executable
//   - Checking for world-writable permissions (Unix)
//   - Ensuring the binary's directory is not world-writable
//   - Validating the binary is not a symlink to an untrusted location
func ValidateBinarySecurity() error {
	var binaryPath string
	var err error

	// Check if FASTLY_CLI_PATH is set
	if customPath := os.Getenv("FASTLY_CLI_PATH"); customPath != "" {
		binaryPath = customPath
		// Verify the custom path exists
		if _, err := os.Stat(binaryPath); err != nil {
			return fmt.Errorf("SYSTEM ERROR: FASTLY_CLI_PATH binary not found at %s: %w", binaryPath, err)
		}
	} else {
		// Find the fastly binary in PATH
		binaryPath, err = exec.LookPath("fastly")
		if err != nil {
			currentPath := os.Getenv("PATH")
			return fmt.Errorf("SYSTEM ERROR: Fastly CLI binary not found in PATH (%s): %w", currentPath, err)
		}
	}

	// Resolve any symlinks to get the real path
	realPath, err := filepath.EvalSymlinks(binaryPath)
	if err != nil {
		return fmt.Errorf("failed to resolve binary path: %w", err)
	}

	// Get file info
	fileInfo, err := os.Stat(realPath)
	if err != nil {
		return fmt.Errorf("failed to stat binary: %w", err)
	}

	// Check if it's a regular file
	if !fileInfo.Mode().IsRegular() {
		return &BinarySecurityError{
			Path:    realPath,
			Issue:   "not a regular file",
			Details: fmt.Sprintf("file mode is %s", fileInfo.Mode()),
		}
	}

	// Platform-specific security checks
	if runtime.GOOS != "windows" {
		if err := validateUnixBinarySecurity(realPath, fileInfo); err != nil {
			return err
		}
	} else {
		if err := validateWindowsBinarySecurity(realPath, fileInfo); err != nil {
			return err
		}
	}

	return nil
}

// validateUnixBinarySecurity performs Unix-specific security checks on the binary.
// It validates file permissions and parent directory security to prevent tampering.
func validateUnixBinarySecurity(path string, fileInfo os.FileInfo) error {
	// Check file permissions
	mode := fileInfo.Mode()
	perm := mode.Perm()

	// Check if world-writable (other write permission)
	// This is a critical security issue that should always be blocked
	if perm&0o002 != 0 {
		return &BinarySecurityError{
			Path:    path,
			Issue:   "world-writable permissions",
			Details: fmt.Sprintf("permissions are %s - this allows any user to modify the binary. Fix with: chmod o-w %s", mode.Perm(), path),
		}
	}

	// Check parent directory permissions
	dirPath := filepath.Dir(path)
	dirInfo, err := os.Stat(dirPath)
	if err != nil {
		return fmt.Errorf("failed to stat parent directory: %w", err)
	}

	dirMode := dirInfo.Mode()
	dirPerm := dirMode.Perm()

	// Check if directory is world-writable without sticky bit
	// The sticky bit (01000) prevents users from deleting files they don't own
	// even in world-writable directories (like /tmp)
	isWorldWritable := dirPerm&0o002 != 0
	hasStickyBit := dirMode&os.ModeSticky != 0

	if isWorldWritable && !hasStickyBit {
		return &BinarySecurityError{
			Path:    dirPath,
			Issue:   "parent directory is world-writable without sticky bit",
			Details: fmt.Sprintf("directory permissions are %s - this allows any user to replace the binary. Fix with: chmod o-w %s or chmod +t %s", dirMode, dirPath, dirPath),
		}
	}

	// Intentionally not checking:
	// - setuid/setgid bits: Some legitimate tools require these for elevated operations
	// - group-writable permissions: Common and acceptable in shared development environments
	// - specific installation paths: Would be too restrictive for diverse installation methods
	// - file ownership: Package managers legitimately use various system accounts

	return nil
}

// validateWindowsBinarySecurity performs Windows-specific security checks.
// Currently limited due to the complexity of Windows ACL system.
func validateWindowsBinarySecurity(path string, fileInfo os.FileInfo) error {
	// Windows uses NTFS ACLs instead of Unix-style permissions.
	// Comprehensive ACL validation would require complex Windows-specific APIs.
	// We rely on Windows built-in security mechanisms (UAC, file system permissions)
	// rather than implementing potentially error-prone ACL checks.

	return nil
}

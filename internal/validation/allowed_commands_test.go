package validation

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Test ParseDeniedCommands
func TestParseDeniedCommands(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    map[string]bool
		wantErr bool
		errMsg  string
	}{
		{
			name:  "single command",
			input: "dangerous-cmd",
			want:  map[string]bool{"dangerous-cmd": true},
		},
		{
			name:  "command with subcommand",
			input: "stats realtime",
			want:  map[string]bool{"stats realtime": true},
		},
		{
			name:  "multiple commands",
			input: "cmd1,cmd2,cmd3",
			want:  map[string]bool{"cmd1": true, "cmd2": true, "cmd3": true},
		},
		{
			name:  "mixed commands and subcommands",
			input: "service delete,backend,stats realtime",
			want:  map[string]bool{"service delete": true, "backend": true, "stats realtime": true},
		},
		{
			name:  "with spaces around commas",
			input: "cmd1 , cmd2 , cmd3",
			want:  map[string]bool{"cmd1": true, "cmd2": true, "cmd3": true},
		},
		{
			name:  "trailing comma",
			input: "cmd1,cmd2,",
			want:  map[string]bool{"cmd1": true, "cmd2": true},
		},
		{
			name:  "leading comma",
			input: ",cmd1,cmd2",
			want:  map[string]bool{"cmd1": true, "cmd2": true},
		},
		{
			name:  "double comma",
			input: "cmd1,,cmd2",
			want:  map[string]bool{"cmd1": true, "cmd2": true},
		},
		{
			name:    "empty string",
			input:   "",
			wantErr: true,
			errMsg:  "empty",
		},
		{
			name:    "only commas",
			input:   ",,,",
			wantErr: true,
			errMsg:  "no valid commands",
		},
		{
			name:    "invalid characters",
			input:   "cmd;injection",
			wantErr: true,
			errMsg:  "invalid command format",
		},
		{
			name:    "too many spaces",
			input:   "cmd  with  spaces",
			wantErr: true,
			errMsg:  "invalid command format",
		},
		{
			name:    "too long",
			input:   strings.Repeat("a", 102), // MaxCommandLength*2+1 = 101
			wantErr: true,
			errMsg:  "exceeds maximum length",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseDeniedCommands(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseDeniedCommands() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("ParseDeniedCommands() error = %v, want error containing %q", err, tt.errMsg)
				return
			}
			if !tt.wantErr {
				if len(got) != len(tt.want) {
					t.Errorf("ParseDeniedCommands() got %d commands, want %d", len(got), len(tt.want))
				}
				for cmd := range tt.want {
					if !got[cmd] {
						t.Errorf("ParseDeniedCommands() missing command %q", cmd)
					}
				}
			}
		})
	}
}

// Test LoadDeniedCommandsFromFile
func TestLoadDeniedCommandsFromFile(t *testing.T) {
	// Create a temporary directory for test files
	tmpDir, err := os.MkdirTemp("", "denied-commands-test")
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		_ = os.RemoveAll(tmpDir)
	}()

	tests := []struct {
		name     string
		content  string
		want     map[string]bool
		wantErr  bool
		errMsg   string
		skipFile bool // Don't create file (for testing missing files)
	}{
		{
			name: "simple file",
			content: `# Comment line
dangerous-cmd
stats realtime
service delete
`,
			want: map[string]bool{
				"dangerous-cmd":  true,
				"stats realtime": true,
				"service delete": true,
			},
		},
		{
			name: "file with empty lines",
			content: `cmd1

cmd2

# Comment

cmd3`,
			want: map[string]bool{
				"cmd1": true,
				"cmd2": true,
				"cmd3": true,
			},
		},
		{
			name: "only comments and empty lines",
			content: `# Only comments
# Another comment

# More comments
`,
			want:    map[string]bool{},
			wantErr: false,
		},
		{
			name:     "non-existent file",
			skipFile: true,
			wantErr:  true,
			errMsg:   "failed to open",
		},
		{
			name: "invalid command format",
			content: `valid-cmd
invalid;cmd
another-valid`,
			wantErr: true,
			errMsg:  "invalid command format",
		},
		{
			name:    "command too long",
			content: strings.Repeat("a", 102),
			wantErr: true,
			errMsg:  "exceeds maximum length",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			filename := filepath.Join(tmpDir, tt.name+".txt")

			if !tt.skipFile {
				err := os.WriteFile(filename, []byte(tt.content), 0o644)
				if err != nil {
					t.Fatal(err)
				}
			}

			got, err := LoadDeniedCommandsFromFile(filename)
			if (err != nil) != tt.wantErr {
				t.Errorf("LoadDeniedCommandsFromFile() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("LoadDeniedCommandsFromFile() error = %v, want error containing %q", err, tt.errMsg)
				return
			}
			if !tt.wantErr && len(tt.want) > 0 {
				if len(got) != len(tt.want) {
					t.Errorf("LoadDeniedCommandsFromFile() got %d commands, want %d", len(got), len(tt.want))
				}
				for cmd := range tt.want {
					if !got[cmd] {
						t.Errorf("LoadDeniedCommandsFromFile() missing command %q", cmd)
					}
				}
			}
		})
	}
}

// Test regex patterns
func TestDeniedCommandFormatRegex(t *testing.T) {
	tests := []struct {
		input   string
		matches bool
	}{
		// Valid formats
		{"simple-command", true},
		{"cmd_with_underscore", true},
		{"cmd123", true},
		{"stats realtime", true},
		{"service-version list", true},
		{"a", true}, // Single char
		{"A-B_c", true},

		// Invalid formats
		{"", false},
		{"cmd with  double  spaces", false},
		{"cmd\ttab", false},
		{"cmd\nnewline", false},
		{"cmd;injection", false},
		{"cmd|pipe", false},
		{"cmd&background", false},
		{"$variable", false},
		{"cmd()", false},
		{" leadingspace", false},
		{"trailingspace ", false},
		{"unicode™", false},
		{"cmd/slash", false},
		{"cmd\\backslash", false},
		{"cmd.dot", false},
		{"cmd,comma", false},
		{"three part cmd", false}, // Only single space allowed
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			matches := deniedCommandFormatRegex.MatchString(tt.input)
			if matches != tt.matches {
				t.Errorf("deniedCommandFormatRegex.MatchString(%q) = %v, want %v", tt.input, matches, tt.matches)
			}
		})
	}
}

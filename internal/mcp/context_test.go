package mcp

import (
	"testing"
)

func TestHasServiceIdentification(t *testing.T) {
	tests := []struct {
		name     string
		flags    []Flag
		expected bool
	}{
		{
			name:     "has service-id",
			flags:    []Flag{{Name: "service-id", Value: "test123"}},
			expected: true,
		},
		{
			name:     "has service-name",
			flags:    []Flag{{Name: "service-name", Value: "my-service"}},
			expected: true,
		},
		{
			name:     "has service",
			flags:    []Flag{{Name: "service", Value: "test"}},
			expected: true,
		},
		{
			name:     "no service identification",
			flags:    []Flag{{Name: "version", Value: "1"}},
			expected: false,
		},
		{
			name:     "empty flags",
			flags:    []Flag{},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := hasServiceIdentification(tt.flags)
			if result != tt.expected {
				t.Errorf("hasServiceIdentification() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestValidateMutuallyExclusive(t *testing.T) {
	tests := []struct {
		name    string
		flags   []Flag
		wantErr bool
	}{
		{
			name:    "both service-id and service-name",
			flags:   []Flag{{Name: "service-id", Value: "123"}, {Name: "service-name", Value: "test"}},
			wantErr: true,
		},
		{
			name:    "only service-id",
			flags:   []Flag{{Name: "service-id", Value: "123"}},
			wantErr: false,
		},
		{
			name:    "only service-name",
			flags:   []Flag{{Name: "service-name", Value: "test"}},
			wantErr: false,
		},
		{
			name:    "neither service-id nor service-name",
			flags:   []Flag{{Name: "version", Value: "1"}},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateMutuallyExclusive(tt.flags)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateMutuallyExclusive() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestRemoveConflictingFlags(t *testing.T) {
	// Save and restore global context
	originalLastServiceID := globalContext.LastServiceID
	defer func() {
		globalContext.LastServiceID = originalLastServiceID
	}()

	tests := []struct {
		name              string
		flags             []Flag
		lastServiceID     string
		expectedFlagCount int
		shouldHaveFlag    string
		shouldNotHaveFlag string
	}{
		{
			name: "removes auto-added service-id when service-name present",
			flags: []Flag{
				{Name: "service-name", Value: "my-service"},
				{Name: "service-id", Value: "cached-id"},
			},
			lastServiceID:     "cached-id",
			expectedFlagCount: 1,
			shouldHaveFlag:    "service-name",
			shouldNotHaveFlag: "service-id",
		},
		{
			name: "keeps user-provided service-id when different from cached",
			flags: []Flag{
				{Name: "service-name", Value: "my-service"},
				{Name: "service-id", Value: "user-provided-id"},
			},
			lastServiceID:     "cached-id",
			expectedFlagCount: 1,
			shouldHaveFlag:    "service-id",
			shouldNotHaveFlag: "service-name",
		},
		{
			name: "no conflict when only service-id",
			flags: []Flag{
				{Name: "service-id", Value: "test-id"},
				{Name: "version", Value: "1"},
			},
			lastServiceID:     "cached-id",
			expectedFlagCount: 2,
			shouldHaveFlag:    "service-id",
		},
		{
			name: "no conflict when only service-name",
			flags: []Flag{
				{Name: "service-name", Value: "test-service"},
				{Name: "version", Value: "1"},
			},
			lastServiceID:     "cached-id",
			expectedFlagCount: 2,
			shouldHaveFlag:    "service-name",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			globalContext.LastServiceID = tt.lastServiceID
			result := removeConflictingFlags(tt.flags)

			if len(result) != tt.expectedFlagCount {
				t.Errorf("removeConflictingFlags() returned %d flags, want %d", len(result), tt.expectedFlagCount)
			}

			if tt.shouldHaveFlag != "" {
				found := false
				for _, flag := range result {
					if flag.Name == tt.shouldHaveFlag {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("removeConflictingFlags() should have kept flag %s", tt.shouldHaveFlag)
				}
			}

			if tt.shouldNotHaveFlag != "" {
				for _, flag := range result {
					if flag.Name == tt.shouldNotHaveFlag {
						t.Errorf("removeConflictingFlags() should have removed flag %s", tt.shouldNotHaveFlag)
					}
				}
			}
		})
	}
}

func TestRequiresVersion(t *testing.T) {
	tests := []struct {
		name     string
		cmd      string
		args     []string
		expected bool
	}{
		{
			name:     "backend create requires version",
			cmd:      "backend",
			args:     []string{"create"},
			expected: true,
		},
		{
			name:     "backend list does not require version",
			cmd:      "backend",
			args:     []string{"list"},
			expected: false,
		},
		{
			name:     "domain update requires version",
			cmd:      "domain",
			args:     []string{"update"},
			expected: true,
		},
		{
			name:     "service-version activate requires version",
			cmd:      "service-version",
			args:     []string{"activate"},
			expected: true,
		},
		{
			name:     "service-version list does not require version",
			cmd:      "service-version",
			args:     []string{"list"},
			expected: false,
		},
		{
			name:     "service command does not require version",
			cmd:      "service",
			args:     []string{"list"},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := requiresVersion(tt.cmd, tt.args)
			if result != tt.expected {
				t.Errorf("requiresVersion(%s, %v) = %v, want %v", tt.cmd, tt.args, result, tt.expected)
			}
		})
	}
}

func TestApplySmartDefaults(t *testing.T) {
	// Save and restore specific fields from global context
	originalLastServiceID := globalContext.LastServiceID
	originalActiveVersions := globalContext.ActiveVersions
	originalPreferredFormat := globalContext.PreferredFormat
	defer func() {
		globalContext.LastServiceID = originalLastServiceID
		globalContext.ActiveVersions = originalActiveVersions
		globalContext.PreferredFormat = originalPreferredFormat
	}()

	tests := []struct {
		name           string
		cmd            string
		args           []string
		inputFlags     []Flag
		lastServiceID  string
		activeVersions map[string]string
		checkFunc      func(t *testing.T, flags []Flag)
	}{
		{
			name:          "adds service-id when missing and no service-name",
			cmd:           "backend",
			args:          []string{"list"},
			inputFlags:    []Flag{},
			lastServiceID: "test-service-id",
			checkFunc: func(t *testing.T, flags []Flag) {
				if !hasFlag(flags, "service-id") {
					t.Error("Expected service-id to be added")
				}
			},
		},
		{
			name:          "does not add service-id when service-name present",
			cmd:           "backend",
			args:          []string{"list"},
			inputFlags:    []Flag{{Name: "service-name", Value: "my-service"}},
			lastServiceID: "test-service-id",
			checkFunc: func(t *testing.T, flags []Flag) {
				if hasFlag(flags, "service-id") {
					t.Error("Should not add service-id when service-name is present")
				}
			},
		},
		{
			name:       "adds version when required and service context exists",
			cmd:        "backend",
			args:       []string{"create"},
			inputFlags: []Flag{{Name: "service-id", Value: "test-id"}},
			activeVersions: map[string]string{
				"test-id": "5",
			},
			checkFunc: func(t *testing.T, flags []Flag) {
				found := false
				for _, flag := range flags {
					if flag.Name == "version" && flag.Value == "5" {
						found = true
						break
					}
				}
				if !found {
					t.Error("Expected version 5 to be added")
				}
			},
		},
		{
			name:       "adds latest version when no active version",
			cmd:        "backend",
			args:       []string{"create"},
			inputFlags: []Flag{{Name: "service-id", Value: "test-id"}},
			checkFunc: func(t *testing.T, flags []Flag) {
				found := false
				for _, flag := range flags {
					if flag.Name == "version" && flag.Value == "latest" {
						found = true
						break
					}
				}
				if !found {
					t.Error("Expected version 'latest' to be added")
				}
			},
		},
		{
			name:       "adds json flag for non-service list commands",
			cmd:        "kv-store",
			args:       []string{"list"},
			inputFlags: []Flag{},
			checkFunc: func(t *testing.T, flags []Flag) {
				if !hasFlag(flags, "json") {
					t.Error("Expected json flag to be added for list command")
				}
			},
		},
		{
			name:       "does not add json flag for service list commands",
			cmd:        "service",
			args:       []string{"list"},
			inputFlags: []Flag{},
			checkFunc: func(t *testing.T, flags []Flag) {
				if hasFlag(flags, "json") {
					t.Error("Expected json flag not to be added for service list command")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			globalContext.LastServiceID = tt.lastServiceID
			if tt.activeVersions != nil {
				globalContext.ActiveVersions = tt.activeVersions
			} else {
				globalContext.ActiveVersions = make(map[string]string)
			}

			result := applySmartDefaults(tt.cmd, tt.args, tt.inputFlags)
			if tt.checkFunc != nil {
				tt.checkFunc(t, result)
			}
		})
	}
}

func TestIntelligentPreprocess(t *testing.T) {
	// Save and restore specific fields from global context
	originalLastServiceID := globalContext.LastServiceID
	originalActiveVersions := globalContext.ActiveVersions
	originalServiceNameToID := globalContext.ServiceNameToID
	defer func() {
		globalContext.LastServiceID = originalLastServiceID
		globalContext.ActiveVersions = originalActiveVersions
		globalContext.ServiceNameToID = originalServiceNameToID
	}()

	tests := []struct {
		name          string
		cmd           string
		args          []string
		inputFlags    []Flag
		lastServiceID string
		checkFunc     func(t *testing.T, cmd string, args []string, flags []Flag, err error)
	}{
		{
			name:          "handles service-name without adding service-id",
			cmd:           "backend",
			args:          []string{"list"},
			inputFlags:    []Flag{{Name: "service-name", Value: "my-service"}},
			lastServiceID: "cached-id",
			checkFunc: func(t *testing.T, cmd string, args []string, flags []Flag, err error) {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if hasFlag(flags, "service-id") {
					t.Error("Should not have service-id when service-name is provided")
				}
				if !hasFlag(flags, "service-name") {
					t.Error("Should keep service-name")
				}
			},
		},
		{
			name:          "adds service-id when no service identification",
			cmd:           "backend",
			args:          []string{"describe"},
			inputFlags:    []Flag{},
			lastServiceID: "auto-id",
			checkFunc: func(t *testing.T, cmd string, args []string, flags []Flag, err error) {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				found := false
				for _, flag := range flags {
					if flag.Name == "service-id" && flag.Value == "auto-id" {
						found = true
						break
					}
				}
				if !found {
					t.Error("Should add service-id when no service identification is present")
				}
			},
		},
		{
			name: "removes conflicting auto-added service-id",
			cmd:  "backend",
			args: []string{"list"},
			inputFlags: []Flag{
				{Name: "service-name", Value: "my-service"},
			},
			lastServiceID: "cached-id",
			checkFunc: func(t *testing.T, cmd string, args []string, flags []Flag, err error) {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				serviceIDCount := 0
				serviceNameCount := 0
				for _, flag := range flags {
					if flag.Name == "service-id" {
						serviceIDCount++
					}
					if flag.Name == "service-name" {
						serviceNameCount++
					}
				}
				if serviceIDCount > 0 && serviceNameCount > 0 {
					t.Error("Should not have both service-id and service-name")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			globalContext.LastServiceID = tt.lastServiceID
			globalContext.ActiveVersions = make(map[string]string)
			globalContext.ServiceNameToID = make(map[string]string)

			cmd, args, flags, err := IntelligentPreprocess(tt.cmd, tt.args, tt.inputFlags)
			if tt.checkFunc != nil {
				tt.checkFunc(t, cmd, args, flags, err)
			}
		})
	}
}

func TestGetServiceIDFromFlags(t *testing.T) {
	tests := []struct {
		name     string
		flags    []Flag
		expected string
	}{
		{
			name:     "finds service-id",
			flags:    []Flag{{Name: "service-id", Value: "test-123"}},
			expected: "test-123",
		},
		{
			name:     "returns empty when no service-id",
			flags:    []Flag{{Name: "service-name", Value: "test"}},
			expected: "",
		},
		{
			name:     "returns first service-id when multiple",
			flags:    []Flag{{Name: "service-id", Value: "first"}, {Name: "service-id", Value: "second"}},
			expected: "first",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getServiceIDFromFlags(tt.flags)
			if result != tt.expected {
				t.Errorf("getServiceIDFromFlags() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestHasFlag(t *testing.T) {
	flags := []Flag{
		{Name: "service-id", Value: "123"},
		{Name: "version", Value: "1"},
	}

	tests := []struct {
		name     string
		flagName string
		expected bool
	}{
		{
			name:     "finds existing flag",
			flagName: "service-id",
			expected: true,
		},
		{
			name:     "returns false for non-existing flag",
			flagName: "service-name",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := hasFlag(flags, tt.flagName)
			if result != tt.expected {
				t.Errorf("hasFlag() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestRequiresServiceID(t *testing.T) {
	tests := []struct {
		name     string
		cmd      string
		args     []string
		expected bool
	}{
		{
			name:     "backend requires service ID",
			cmd:      "backend",
			args:     []string{"list"},
			expected: true,
		},
		{
			name:     "domain requires service ID",
			cmd:      "domain",
			args:     []string{"list"},
			expected: true,
		},
		{
			name:     "service does not require service ID",
			cmd:      "service",
			args:     []string{"list"},
			expected: false,
		},
		{
			name:     "pops does not require service ID",
			cmd:      "pops",
			args:     []string{},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := requiresServiceID(tt.cmd, tt.args)
			if result != tt.expected {
				t.Errorf("requiresServiceID(%s, %v) = %v, want %v", tt.cmd, tt.args, result, tt.expected)
			}
		})
	}
}

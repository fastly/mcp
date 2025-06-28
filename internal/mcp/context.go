// Package mcp implements context management for intelligent command preprocessing
package mcp

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"
)

// CommandContext stores reusable values from previous commands
type CommandContext struct {
	mu sync.RWMutex
	// Core identifiers that are frequently reused
	LastServiceID   string
	LastServiceName string
	LastVersion     string
	ActiveVersions  map[string]string // serviceID -> version

	// Name to ID mappings to avoid repeated lookups
	ServiceNameToID map[string]string

	// Recent command results for pattern detection
	RecentCommands []CommandRecord

	// User preferences learned from usage
	PreferredFormat string // json, table, etc
	CommonFlags     map[string][]Flag
}

type CommandRecord struct {
	Timestamp time.Time
	Command   string
	Args      []string
	Flags     []Flag
	Success   bool
	Output    interface{}
}

type Flag struct {
	Name  string
	Value string
}

var globalContext = &CommandContext{
	ServiceNameToID: make(map[string]string),
	ActiveVersions:  make(map[string]string),
	CommonFlags:     make(map[string][]Flag),
	RecentCommands:  make([]CommandRecord, 0, 100),
}

// IntelligentPreprocess enhances commands with context and smart defaults
func IntelligentPreprocess(cmd string, args []string, flags []Flag) (string, []string, []Flag, error) {
	globalContext.mu.Lock()
	defer globalContext.mu.Unlock()

	// 1. Auto-resolve service names to IDs
	flags = resolveServiceReferences(flags)

	// 2. Apply smart defaults based on command type
	flags = applySmartDefaults(cmd, args, flags)

	// 3. Inject context from previous commands
	flags = injectContextualValues(cmd, args, flags)

	// 4. Handle compound commands
	if isCompoundCommand(cmd, args) {
		return expandCompoundCommand(cmd, args, flags)
	}

	// Record this command for future context
	recordCommand(cmd, args, flags)

	return cmd, args, flags, nil
}

// ExtractContext updates context based on command results
func ExtractContext(cmd string, args []string, flags []Flag, output interface{}, success bool) {
	globalContext.mu.Lock()
	defer globalContext.mu.Unlock()

	if !success {
		return
	}

	// Extract service information from outputs
	switch cmd {
	case "service":
		if len(args) > 0 && args[0] == "list" {
			extractServiceList(output)
		}
	case "service-version":
		if len(args) > 0 && args[0] == "list" {
			extractVersionInfo(output)
		}
	}

	// Update last used values
	for _, flag := range flags {
		switch flag.Name {
		case "service-id":
			globalContext.LastServiceID = flag.Value
		case "version":
			if flag.Value != "latest" && flag.Value != "active" {
				globalContext.LastVersion = flag.Value
			}
		}
	}
}

// Helper functions

func resolveServiceReferences(flags []Flag) []Flag {
	result := make([]Flag, 0, len(flags))
	for _, flag := range flags {
		if flag.Name == "service-id" || flag.Name == "service" {
			// Check if it's a name that needs resolution
			if id, exists := globalContext.ServiceNameToID[flag.Value]; exists {
				flag.Value = id
			}
		}
		result = append(result, flag)
	}
	return result
}

func applySmartDefaults(cmd string, args []string, flags []Flag) []Flag {
	// Add JSON output for list commands if not specified
	if len(args) > 0 && args[0] == "list" && !hasFlag(flags, "json") {
		if globalContext.PreferredFormat == "json" || globalContext.PreferredFormat == "" {
			flags = append(flags, Flag{Name: "json", Value: ""})
		}
	}

	// Add service-id if missing but we have context
	if requiresServiceID(cmd, args) && !hasFlag(flags, "service-id") && globalContext.LastServiceID != "" {
		flags = append(flags, Flag{Name: "service-id", Value: globalContext.LastServiceID})
	}

	// Add version if missing but we have context
	if requiresVersion(cmd, args) && !hasFlag(flags, "version") {
		if activeVersion, exists := globalContext.ActiveVersions[globalContext.LastServiceID]; exists {
			flags = append(flags, Flag{Name: "version", Value: activeVersion})
		} else {
			flags = append(flags, Flag{Name: "version", Value: "latest"})
		}
	}

	return flags
}

func injectContextualValues(cmd string, args []string, flags []Flag) []Flag {
	// Look for patterns in recent commands
	cmdPattern := fmt.Sprintf("%s %s", cmd, strings.Join(args, " "))

	// Find common flags used with this command pattern
	if commonFlags, exists := globalContext.CommonFlags[cmdPattern]; exists {
		for _, commonFlag := range commonFlags {
			if !hasFlag(flags, commonFlag.Name) {
				flags = append(flags, commonFlag)
			}
		}
	}

	return flags
}

func isCompoundCommand(cmd string, args []string) bool {
	// Detect patterns that typically require multiple steps
	if cmd == "backend" && len(args) > 0 && args[0] == "list" {
		// If service name is provided instead of ID, it's compound
		for _, record := range globalContext.RecentCommands {
			if record.Command == "service" && strings.Contains(record.Command, "list") {
				return false // We already have service list
			}
		}
	}
	return false
}

func expandCompoundCommand(cmd string, args []string, flags []Flag) (string, []string, []Flag, error) {
	// This would expand single commands into multiple steps
	// For now, just return the original
	return cmd, args, flags, nil
}

func recordCommand(cmd string, args []string, flags []Flag) {
	record := CommandRecord{
		Timestamp: time.Now(),
		Command:   cmd,
		Args:      args,
		Flags:     flags,
	}

	globalContext.RecentCommands = append(globalContext.RecentCommands, record)

	// Keep only last 100 commands
	if len(globalContext.RecentCommands) > 100 {
		globalContext.RecentCommands = globalContext.RecentCommands[1:]
	}

	// Update common flags for this command pattern
	cmdPattern := fmt.Sprintf("%s %s", cmd, strings.Join(args, " "))
	globalContext.CommonFlags[cmdPattern] = flags
}

func extractServiceList(output interface{}) {
	// Parse service list output and update name->ID mappings
	if data, ok := output.(string); ok {
		// Try to parse as JSON
		var services []map[string]interface{}
		if err := json.Unmarshal([]byte(data), &services); err == nil {
			for _, service := range services {
				if name, ok := service["Name"].(string); ok {
					if id, ok := service["ServiceID"].(string); ok {
						globalContext.ServiceNameToID[name] = id

						// Also track active versions
						if version, ok := service["ActiveVersion"].(float64); ok {
							globalContext.ActiveVersions[id] = fmt.Sprintf("%.0f", version)
						}
					}
				}
			}
		}
	}
}

func extractVersionInfo(output interface{}) {
	// Update active version information from version list outputs
}

func hasFlag(flags []Flag, name string) bool {
	for _, flag := range flags {
		if flag.Name == name {
			return true
		}
	}
	return false
}

func requiresServiceID(cmd string, args []string) bool {
	// Commands that typically need service-id
	serviceCommands := []string{"backend", "domain", "healthcheck", "vcl", "acl", "dictionary"}
	for _, sc := range serviceCommands {
		if cmd == sc {
			return true
		}
	}
	return false
}

func requiresVersion(cmd string, args []string) bool {
	// Commands that typically need version
	versionCommands := []string{"backend", "domain", "healthcheck", "vcl"}
	for _, vc := range versionCommands {
		if cmd == vc && len(args) > 0 && args[0] != "create" {
			return true
		}
	}
	return false
}

// GetSuggestions provides intelligent suggestions based on context
func GetSuggestions(error string) []string {
	globalContext.mu.RLock()
	defer globalContext.mu.RUnlock()

	suggestions := []string{}

	if strings.Contains(error, "Cannot find service") {
		suggestions = append(suggestions, "Run 'fastly service list' to see available services")
		if globalContext.LastServiceID != "" {
			suggestions = append(suggestions, fmt.Sprintf("Try using service-id '%s' instead", globalContext.LastServiceID))
		}
	}

	if strings.Contains(error, "unexpected 'true'") {
		suggestions = append(suggestions, "For boolean flags like --json, omit the value or use empty string")
	}

	return suggestions
}

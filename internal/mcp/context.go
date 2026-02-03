// Package mcp implements context management for intelligent command preprocessing
package mcp

import (
	"encoding/json"
	"fmt"
	"regexp"
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

	// 4. Validate mutually exclusive parameters
	if err := validateMutuallyExclusive(flags); err != nil {
		// Don't fail, just remove conflicting auto-added flags
		flags = removeConflictingFlags(flags)
	}

	// 5. Handle compound commands
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
	if len(args) > 0 && args[0] == "list" && cmd != "service" && !hasFlag(flags, "json") {
		if globalContext.PreferredFormat == "json" || globalContext.PreferredFormat == "" {
			flags = append(flags, Flag{Name: "json", Value: ""})
		}
	}

	// Add service-id if missing but we have context AND no other service identification is present
	if requiresServiceID(cmd, args) && !hasServiceIdentification(flags) && globalContext.LastServiceID != "" {
		flags = append(flags, Flag{Name: "service-id", Value: globalContext.LastServiceID})
	}

	// Add version if missing but we have context
	if requiresVersion(cmd, args) && !hasFlag(flags, "version") {
		// Only add version if we have service identification
		if hasServiceIdentification(flags) {
			serviceID := getServiceIDFromFlags(flags)
			if serviceID == "" {
				serviceID = globalContext.LastServiceID
			}
			if activeVersion, exists := globalContext.ActiveVersions[serviceID]; exists {
				flags = append(flags, Flag{Name: "version", Value: activeVersion})
			} else {
				flags = append(flags, Flag{Name: "version", Value: "latest"})
			}
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
			if record.Command == "service" && len(record.Args) > 0 && record.Args[0] == "list" {
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
	versionCommands := []string{"backend", "domain", "healthcheck", "vcl", "logging", "dictionary", "acl"}
	for _, vc := range versionCommands {
		if cmd == vc && len(args) > 0 {
			// These operations require version
			switch args[0] {
			case "create", "delete", "update", "describe":
				return true
			case "list":
				return false
			}
		}
	}

	// Service version commands always need version
	if cmd == "service-version" && len(args) > 0 {
		switch args[0] {
		case "activate", "deactivate", "clone", "update", "lock":
			return true
		}
	}

	return false
}

// hasServiceIdentification checks if any service identification parameter is present
func hasServiceIdentification(flags []Flag) bool {
	for _, flag := range flags {
		if flag.Name == "service-id" || flag.Name == "service-name" || flag.Name == "service" {
			return true
		}
	}
	return false
}

// getServiceIDFromFlags extracts service ID from flags if present
func getServiceIDFromFlags(flags []Flag) string {
	for _, flag := range flags {
		if flag.Name == "service-id" {
			return flag.Value
		}
	}
	return ""
}

// validateMutuallyExclusive checks for conflicting parameters
func validateMutuallyExclusive(flags []Flag) error {
	serviceID := hasFlag(flags, "service-id")
	serviceName := hasFlag(flags, "service-name")

	if serviceID && serviceName {
		return fmt.Errorf("cannot specify both service-id and service-name")
	}

	// Future: Add other mutual exclusion checks here
	// e.g., for purge command: --all vs --key vs --url vs --file

	return nil
}

// removeConflictingFlags removes auto-added flags that conflict with user-provided ones
func removeConflictingFlags(flags []Flag) []Flag {
	var hasServiceName, hasServiceID bool
	var serviceNameIdx, serviceIDIdx = -1, -1

	// Find which service identification flags are present
	for i, flag := range flags {
		switch flag.Name {
		case "service-name":
			hasServiceName = true
			serviceNameIdx = i
		case "service-id":
			hasServiceID = true
			serviceIDIdx = i
		}
	}

	// If both are present, remove the auto-added service-id
	// (we assume service-name was user-provided and service-id was auto-added)
	if hasServiceName && hasServiceID {
		// Check if service-id matches our last cached one (likely auto-added)
		if serviceIDIdx >= 0 && flags[serviceIDIdx].Value == globalContext.LastServiceID {
			// Remove the auto-added service-id
			result := make([]Flag, 0, len(flags)-1)
			for i, flag := range flags {
				if i != serviceIDIdx {
					result = append(result, flag)
				}
			}
			return result
		}
		// If service-id doesn't match cached, remove service-name instead
		// (user might have provided service-id explicitly)
		if serviceNameIdx >= 0 {
			result := make([]Flag, 0, len(flags)-1)
			for i, flag := range flags {
				if i != serviceNameIdx {
					result = append(result, flag)
				}
			}
			return result
		}
	}

	return flags
}

// GetSuggestions provides intelligent suggestions based on context
func GetSuggestions(error string, command string, args []string) []string {
	globalContext.mu.RLock()
	defer globalContext.mu.RUnlock()

	suggestions := []string{}

	// Check for duplicate parameter patterns first
	if len(args) > 0 {
		// Check for duplicate subcommands like "service list list"
		if len(args) >= 2 && args[0] == args[1] {
			suggestions = append(suggestions, fmt.Sprintf("Duplicate subcommand detected: '%s' appears twice", args[0]))
			suggestions = append(suggestions, fmt.Sprintf("Use command='%s' with args=['%s'] instead", command, args[0]))
			return suggestions // Return early with specific suggestion
		}

		// Check if command is repeated in args like command="service" args=["service", "list"]
		if args[0] == command {
			suggestions = append(suggestions, fmt.Sprintf("Command '%s' should not be repeated in args", command))
			suggestions = append(suggestions, fmt.Sprintf("Use command='%s' with args=%v instead", command, args[1:]))
			return suggestions // Return early with specific suggestion
		}
	}

	// Boolean flag errors
	if strings.Contains(error, "unexpected 'true'") || strings.Contains(error, "unexpected 'false'") {
		suggestions = append(suggestions, "For boolean flags like --json, omit the value or use empty string")
		suggestions = append(suggestions, "Example: use '--json' instead of '--json=true'")
	}

	// Unknown flag errors
	if strings.Contains(error, "unknown flag") || strings.Contains(error, "flag provided but not defined") {
		flagMatch := extractFlagFromError(error)
		if flagMatch != "" {
			// Suggest similar flags based on common patterns
			suggestions = append(suggestions, fmt.Sprintf("Check flag spelling: '%s' might not be valid", flagMatch))
			if strings.HasPrefix(flagMatch, "-") && !strings.HasPrefix(flagMatch, "--") {
				suggestions = append(suggestions, fmt.Sprintf("Try using double dash: '--%s'", strings.TrimPrefix(flagMatch, "-")))
			}
		}
		suggestions = append(suggestions, "Use 'fastly [command] --help' to see available flags")
	}

	// Rate limit errors
	if strings.Contains(error, "429") || strings.Contains(error, "rate limit") {
		suggestions = append(suggestions, "Wait a moment before retrying the request")
		suggestions = append(suggestions, "Consider using pagination flags like --page and --per-page for list operations")
	}

	// JSON parsing errors (might indicate wrong output format)
	if strings.Contains(error, "invalid character") || strings.Contains(error, "JSON") {
		suggestions = append(suggestions, "Remove --json flag if the command doesn't support JSON output")
	}

	return suggestions
}

// extractFlagFromError attempts to extract flag name from error messages
func extractFlagFromError(error string) string {
	// Look for patterns like "unknown flag: --foo" or "flag provided but not defined: -bar"
	patterns := []string{
		"unknown flag: ([^ ]+)",
		"flag provided but not defined: ([^ ]+)",
		"unknown shorthand flag: '([^']+)'",
	}

	for _, pattern := range patterns {
		if matches := regexp.MustCompile(pattern).FindStringSubmatch(error); len(matches) > 1 {
			return matches[1]
		}
	}

	return ""
}

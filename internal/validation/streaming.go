package validation

// DefaultStreamingCommands returns the commands that can run as background/streaming jobs.
// These commands produce continuous output and run indefinitely until stopped.
func DefaultStreamingCommands() map[string]bool {
	return map[string]bool{
		"log-tail":       true,
		"stats realtime": true,
	}
}

// streamingCommands holds the list of commands allowed for background execution.
var streamingCommands = DefaultStreamingCommands()

// IsStreamingCommand checks if a command-args combination is a streaming command.
// Streaming commands can be run as background jobs via fastly_background_start.
func IsStreamingCommand(command string, args []string) bool {
	// Check the command alone first
	if streamingCommands[command] {
		return true
	}

	// Progressively check deeper command paths
	fullCommand := command
	maxDepth := 3
	for i := 0; i < len(args) && i < maxDepth; i++ {
		fullCommand += " " + args[i]
		if streamingCommands[fullCommand] {
			return true
		}
	}

	return false
}

// GetStreamingCommands returns a copy of the streaming commands map.
func GetStreamingCommands() map[string]bool {
	result := make(map[string]bool, len(streamingCommands))
	for k, v := range streamingCommands {
		result[k] = v
	}
	return result
}

// AddStreamingCommand adds a command to the streaming commands list.
func AddStreamingCommand(command string) {
	streamingCommands[command] = true
}

// RemoveStreamingCommand removes a command from the streaming commands list.
func RemoveStreamingCommand(command string) {
	delete(streamingCommands, command)
}

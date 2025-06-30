package version

// Version is the version of the MCP server
// This can be overridden at build time with:
// go build -ldflags "-X github.com/yourusername/fastly-mcp/internal/version.Version=v1.0.0"
var Version = "dev"

// GetVersion returns the current version
func GetVersion() string {
	if Version == "" {
		return "dev"
	}
	return Version
}

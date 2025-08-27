# Changelog

## [0.1.8] - 2025-08-27

### Added
- Result caching system for large command outputs (>25KB by default)
  - New MCP tools: `fastly_result_read`, `fastly_result_query`, `fastly_result_summary`, `fastly_result_list`
  - Automatic caching with unique result IDs for large responses
  - Smart preview generation (first 5 items/20 lines) for cached data
  - 10-minute TTL with automatic cleanup

### Changed
- Updated mcp-go dependency from v0.37.0 to v0.38.0
- Improved truncation instructions for AI agents when outputs are cached
- Documentation no longer suggests using `--json` flag
- Authentication documentation updated to discourage environment variable usage in favor of `fastly profile create`

## [0.1.7] - 2025-08-12

### Added
- Enhanced error reporting for command execution failures with more descriptive messages
- Improved binary validation error messages for better troubleshooting

### Changed
- Updated mcp-go dependency from v0.36.0 to v0.37.0
- Updated other dependencies: easyjson (0.7.7 → 0.9.0), spf13/cast (1.7.1 → 1.9.2)
- Validation test now uses `fastly whoami` instead of `fastly service list` for authentication checks
- Made error messages more generic and user-friendly
- Improved system failure detection and reporting in binary validation

### Fixed
- Updated all references from deprecated `fastly auth` commands to current `fastly profile` commands
- Changed authentication error messages to suggest `fastly profile create` instead of `fastly auth login`
- Removed invalid `fastly setup` command references

### Security
- Disabled VCL upload/download commands by default for security (vcl custom create/update/describe, vcl snippet create/update/describe)
- VCL list and delete commands remain available

### Documentation
- Added Qwen3-Coder to the list of recommended models in README

## [0.1.6] - 2025-08-01

### Added
- Support for denied commands via `--denied-command-file` flag
- System prompt serving capability for better AI agent integration
- Improved Windows installation instructions in documentation

### Changed
- Updated mcp-go dependency from v0.34.0 to v0.36.0
- Error messages now use "not available" instead of "not allowed" for better clarity
- Replaced `fastly auth login` references with `fastly whoami` in documentation
- Enhanced README with better documentation structure and examples

### Security
- Updated SECURITY.md with improved security reporting guidelines

## [0.1.5] - 2025-07-10

### Added
- Version command to display the current build version
- Command logging functionality for debugging and auditing
- Enhanced error handling with intelligent suggestions for common mistakes
- FASTLY_USER_AGENT_EXTENSION environment variable for better API tracking

### Changed
- Renamed `--allowed-commands` flag to `--allowed-command-file` for clarity
- Improved error messages: "not allowed" replaced with "not available" for better user experience
- Enhanced command parsing with shared logic for splitting commands into parts
- Updated documentation to recommend jan-nano-128k as a local lightweight model

### Fixed
- Command splitting edge cases to handle complex command structures properly

## [0.1.4] - 2025-06-27

### Changed
- Tweak descriptions to encourage agents to use the current_time tool

## [0.1.3] - 2025-06-24

### Added
- Friendly error message when running as CLI without authentication
- Improved test coverage with additional test cases
- Better installation documentation for Fastly CLI

### Changed
- Refactored code to reduce redundancy and improve maintainability
- Enhanced documentation with clearer instructions and better organization
- Updated model recommendations in documentation

### Fixed
- Command help is now accessible even when Fastly CLI is not configured

### Security
- Enhanced IPv6 address sanitization to better protect user privacy

## [0.1.2] - 2025-01-18

### Added
- Token encryption using FAST (Format-preserving AES-based Secure Tokenization) algorithm
- Automatic PII sanitization in command outputs
- Windows platform support
- `--allowed-commands-file` option to customize allowed command list
- Security validation for the Fastly CLI binary

### Changed
- Improved command validation and error messages
- Pretty printed JSON output in CLI mode
- Lazy validation of Fastly CLI setup (only validates when commands are executed)
- Enhanced documentation with better integration instructions

### Security
- Added multiple layers of security validation for commands
- Implemented length-preserving encryption for sensitive tokens
- Automatic removal of sensitive information from outputs
- Protection against duplicate flags and command injection

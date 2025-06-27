# Changelog

## [0.1.4] - Unreleased

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
- `--allowed-commands` option to customize allowed command list
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

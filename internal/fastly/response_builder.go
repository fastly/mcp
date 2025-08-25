// Package fastly provides utilities for interacting with the Fastly CLI
// and building structured responses for MCP (Model Context Protocol) tools.
package fastly

import (
	"fmt"

	"github.com/fastly/mcp/internal/types"
)

// ResponseBuilder helps construct CommandResponse objects with common patterns
type ResponseBuilder struct {
	response types.CommandResponse
}

// NewResponseBuilder creates a new ResponseBuilder
func NewResponseBuilder() *ResponseBuilder {
	return &ResponseBuilder{
		response: types.CommandResponse{
			Success: true,
		},
	}
}

// WithCommand sets the command details
func (b *ResponseBuilder) WithCommand(command string, args []string, flags []types.Flag) *ResponseBuilder {
	b.response.Command = command
	b.response.CommandLine = BuildCommandLine(command, args, flags)
	return b
}

// WithError sets error details
func (b *ResponseBuilder) WithError(err error, errorCode string) *ResponseBuilder {
	b.response.Success = false
	b.response.Error = err.Error()
	b.response.ErrorCode = errorCode
	return b
}

// WithInstructions adds instructions and next steps
func (b *ResponseBuilder) WithInstructions(instructions string, nextSteps []string) *ResponseBuilder {
	b.response.Instructions = instructions
	b.response.NextSteps = nextSteps
	return b
}

// Build returns the constructed response
func (b *ResponseBuilder) Build() types.CommandResponse {
	return b.response
}

// Common error response builders

// ValidationError creates a validation error response
func ValidationError(command string, err error) types.CommandResponse {
	return NewResponseBuilder().
		WithCommand(command, nil, nil).
		WithError(err, "validation_error").
		WithInstructions("The command is not available.", []string{
			"Check that the command is available",
			"Use fastly_list_commands to see available commands",
		}).
		Build()
}

// SetupError creates a setup error response
func SetupError(command string, err error) types.CommandResponse {
	return NewResponseBuilder().
		WithCommand(command, nil, nil).
		WithError(err, "setup_error").
		WithInstructions("The Fastly CLI is not properly set up.", []string{
			"Ensure the Fastly CLI is installed and in your PATH",
			"Check that FASTLY_API_TOKEN is set or run 'fastly profile create' to authenticate",
			"Visit https://www.fastly.com/documentation/reference/cli/ for installation instructions",
		}).
		Build()
}

// UserConfirmationError creates a user confirmation required error
func UserConfirmationError(command string, args []string, flags []types.Flag) types.CommandResponse {
	return NewResponseBuilder().
		WithCommand(command, args, flags).
		WithError(fmt.Errorf("this is a dangerous operation that requires explicit human user confirmation"), "user_confirmation_required").
		WithInstructions("This command performs a destructive operation and requires explicit user review.", []string{
			"Review the command carefully to ensure it's what you intend",
			"Add the '--user-reviewed' flag to proceed with the operation",
			"Example: add {\"name\": \"user-reviewed\"} to the flags array",
		}).
		Build()
}

// TimeoutError creates a timeout error response
func TimeoutError(command string, args []string, flags []types.Flag) types.CommandResponse {
	return NewResponseBuilder().
		WithCommand(command, args, flags).
		WithError(fmt.Errorf("command execution timed out after 30 seconds"), "timeout").
		WithInstructions("The command took too long to execute.", []string{
			"Try running the command with fewer results or a more specific filter",
			"Check your network connection",
			"If the problem persists, run the command directly in the CLI",
		}).
		Build()
}

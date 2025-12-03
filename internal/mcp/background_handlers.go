package mcp

import (
	"context"
	"fmt"
	"time"

	"github.com/fastly/mcp/internal/background"
	"github.com/fastly/mcp/internal/fastly"
	"github.com/fastly/mcp/internal/types"
	"github.com/fastly/mcp/internal/validation"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// makeBackgroundStartHandler creates a handler for starting background streaming commands.
func (ft *FastlyTool) makeBackgroundStartHandler() mcp.ToolHandler {
	return func(ctx context.Context, request *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		start := time.Now()
		params := getArguments(request)

		command, ok := params["command"].(string)
		if !ok || command == "" {
			err := fmt.Errorf("command parameter is required")
			LogCommand("fastly_background_start", params, nil, err, time.Since(start))
			return nil, err
		}

		result, err := executeWithSetupCheck(ctx, ft, "background_start", func() (*mcp.CallToolResult, error) {
			// Decrypt any encrypted tokens in the command string
			if tokenCrypto != nil && tokenCrypto.Enabled {
				command = tokenCrypto.DecryptTokensInString(command)
			}

			var args []string
			if argsParam, ok := params["args"].([]interface{}); ok {
				for _, arg := range argsParam {
					if argStr, ok := arg.(string); ok {
						if tokenCrypto != nil && tokenCrypto.Enabled {
							argStr = tokenCrypto.DecryptTokensInString(argStr)
						}
						args = append(args, argStr)
					}
				}
			}

			var flags []types.Flag
			if flagsParam, ok := params["flags"].([]interface{}); ok {
				for _, flagItem := range flagsParam {
					if flagMap, ok := flagItem.(map[string]interface{}); ok {
						flag := types.Flag{}
						if name, ok := flagMap["name"].(string); ok {
							flag.Name = name
						}
						if value, ok := flagMap["value"].(string); ok {
							if tokenCrypto != nil && tokenCrypto.Enabled {
								value = tokenCrypto.DecryptTokensInString(value)
							}
							flag.Value = value
						}
						if flag.Name != "" {
							flags = append(flags, flag)
						}
					}
				}
			}

			// Validate that this is a streaming command
			if !validation.IsStreamingCommand(command, args) {
				return newErrorResult(background.StartResponse{
					Success: false,
					Error: fmt.Sprintf("'%s' is not a streaming command. Use fastly_execute for regular commands. "+
						"Streaming commands: log-tail, stats realtime", buildCommandString(command, args)),
				}), nil
			}

			// Validate the command is allowed
			validator := fastly.GetValidator()
			if err := validator.ValidateCommand(command); err != nil {
				return newErrorResult(background.StartResponse{
					Success: false,
					Error:   err.Error(),
				}), nil
			}
			if err := validator.ValidateArgs(args); err != nil {
				return newErrorResult(background.StartResponse{
					Success: false,
					Error:   err.Error(),
				}), nil
			}

			// Start the background job
			manager := background.GetManager()
			resp, err := manager.Start(ctx, command, args, flags)
			if err != nil {
				return newErrorResult(background.StartResponse{
					Success: false,
					Error:   err.Error(),
				}), nil
			}

			if resp.Success {
				return newSuccessResult(resp), nil
			}
			return newErrorResult(resp), nil
		})

		LogCommand("fastly_background_start", params, result, err, time.Since(start))
		return result, err
	}
}

// makeBackgroundStopHandler creates a handler for stopping background jobs.
func makeBackgroundStopHandler() mcp.ToolHandler {
	return func(ctx context.Context, request *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		start := time.Now()
		params := getArguments(request)

		jobID, ok := params["job_id"].(string)
		if !ok || jobID == "" {
			err := fmt.Errorf("job_id parameter is required")
			LogCommand("fastly_background_stop", params, nil, err, time.Since(start))
			return nil, err
		}

		manager := background.GetManager()
		resp, err := manager.Stop(jobID)
		if err != nil {
			result := newErrorResult(background.StopResponse{
				Success: false,
				JobID:   jobID,
				Error:   err.Error(),
			})
			LogCommand("fastly_background_stop", params, result, err, time.Since(start))
			return result, nil
		}

		var result *mcp.CallToolResult
		if resp.Success {
			result = newSuccessResult(resp)
		} else {
			result = newErrorResult(resp)
		}

		LogCommand("fastly_background_stop", params, result, nil, time.Since(start))
		return result, nil
	}
}

// makeBackgroundListHandler creates a handler for listing background jobs.
func makeBackgroundListHandler() mcp.ToolHandler {
	return func(ctx context.Context, request *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		start := time.Now()
		params := getArguments(request)

		manager := background.GetManager()
		resp := manager.List()

		result := newSuccessResult(resp)
		LogCommand("fastly_background_list", params, result, nil, time.Since(start))
		return result, nil
	}
}

// makeBackgroundStatusHandler creates a handler for getting job status.
func makeBackgroundStatusHandler() mcp.ToolHandler {
	return func(ctx context.Context, request *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		start := time.Now()
		params := getArguments(request)

		jobID, ok := params["job_id"].(string)
		if !ok || jobID == "" {
			err := fmt.Errorf("job_id parameter is required")
			LogCommand("fastly_background_status", params, nil, err, time.Since(start))
			return nil, err
		}

		manager := background.GetManager()
		resp, err := manager.Status(jobID)
		if err != nil {
			result := newErrorResult(background.StatusResponse{
				Success: false,
				JobID:   jobID,
				Error:   err.Error(),
			})
			LogCommand("fastly_background_status", params, result, err, time.Since(start))
			return result, nil
		}

		var result *mcp.CallToolResult
		if resp.Success {
			result = newSuccessResult(resp)
		} else {
			result = newErrorResult(resp)
		}

		LogCommand("fastly_background_status", params, result, nil, time.Since(start))
		return result, nil
	}
}

// makeBackgroundReadHandler creates a handler for reading job output.
func makeBackgroundReadHandler() mcp.ToolHandler {
	return func(ctx context.Context, request *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		start := time.Now()
		params := getArguments(request)

		jobID, ok := params["job_id"].(string)
		if !ok || jobID == "" {
			err := fmt.Errorf("job_id parameter is required")
			LogCommand("fastly_background_read", params, nil, err, time.Since(start))
			return nil, err
		}

		offset := int64(0)
		if o, ok := params["offset"].(float64); ok {
			offset = int64(o)
		}

		limit := int64(background.DefaultReadLimit)
		if l, ok := params["limit"].(float64); ok {
			limit = int64(l)
		}

		manager := background.GetManager()
		output, err := manager.Read(jobID, offset, limit)
		if err != nil {
			result := newErrorResult(map[string]interface{}{
				"success": false,
				"job_id":  jobID,
				"error":   err.Error(),
			})
			LogCommand("fastly_background_read", params, result, err, time.Since(start))
			return result, nil
		}

		result := newSuccessResult(map[string]interface{}{
			"success":     true,
			"job_id":      output.JobID,
			"lines":       output.Lines,
			"offset":      output.Offset,
			"limit":       output.Limit,
			"total_lines": output.TotalLines,
			"has_more":    output.HasMore,
		})

		LogCommand("fastly_background_read", params, result, nil, time.Since(start))
		return result, nil
	}
}

// makeBackgroundQueryHandler creates a handler for searching job output.
func makeBackgroundQueryHandler() mcp.ToolHandler {
	return func(ctx context.Context, request *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		start := time.Now()
		params := getArguments(request)

		jobID, ok := params["job_id"].(string)
		if !ok || jobID == "" {
			err := fmt.Errorf("job_id parameter is required")
			LogCommand("fastly_background_query", params, nil, err, time.Since(start))
			return nil, err
		}

		pattern, ok := params["pattern"].(string)
		if !ok || pattern == "" {
			err := fmt.Errorf("pattern parameter is required")
			LogCommand("fastly_background_query", params, nil, err, time.Since(start))
			return nil, err
		}

		maxResults := 100
		if m, ok := params["max_results"].(float64); ok {
			maxResults = int(m)
		}

		manager := background.GetManager()
		queryResult, err := manager.Query(jobID, pattern, maxResults)
		if err != nil {
			result := newErrorResult(map[string]interface{}{
				"success": false,
				"job_id":  jobID,
				"error":   err.Error(),
			})
			LogCommand("fastly_background_query", params, result, err, time.Since(start))
			return result, nil
		}

		result := newSuccessResult(map[string]interface{}{
			"success":     true,
			"job_id":      queryResult.JobID,
			"pattern":     queryResult.Pattern,
			"matches":     queryResult.Matches,
			"total_count": queryResult.TotalCount,
			"truncated":   queryResult.Truncated,
		})

		LogCommand("fastly_background_query", params, result, nil, time.Since(start))
		return result, nil
	}
}

// buildCommandString builds a display string from command and args.
func buildCommandString(command string, args []string) string {
	if len(args) == 0 {
		return command
	}
	return command + " " + args[0]
}

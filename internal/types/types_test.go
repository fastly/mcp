package types

import (
	"encoding/json"
	"testing"
)

func TestCommandRequestJSON(t *testing.T) {
	req := CommandRequest{
		Command: "service",
		Args:    []string{"list"},
		Flags: []Flag{
			{Name: "json"},
			{Name: "service-id", Value: "abc123"},
		},
	}

	data, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("Failed to marshal CommandRequest: %v", err)
	}

	var decoded CommandRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal CommandRequest: %v", err)
	}

	if decoded.Command != req.Command {
		t.Errorf("Command mismatch: %s != %s", decoded.Command, req.Command)
	}
	if len(decoded.Args) != len(req.Args) {
		t.Errorf("Args length mismatch: %d != %d", len(decoded.Args), len(req.Args))
	}
	if len(decoded.Flags) != len(req.Flags) {
		t.Errorf("Flags length mismatch: %d != %d", len(decoded.Flags), len(req.Flags))
	}
}

func TestCommandResponseJSON(t *testing.T) {
	resp := CommandResponse{
		Success:     true,
		Command:     "service list",
		CommandLine: "fastly service list --json",
		Output:      "[]",
		Metadata: &OperationMetadata{
			ResourceType:  "service",
			OperationType: "read",
			IsSafe:        true,
			RequiresAuth:  true,
		},
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("Failed to marshal CommandResponse: %v", err)
	}

	var decoded CommandResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal CommandResponse: %v", err)
	}

	if decoded.Success != resp.Success {
		t.Errorf("Success mismatch: %v != %v", decoded.Success, resp.Success)
	}
	if decoded.Command != resp.Command {
		t.Errorf("Command mismatch: %s != %s", decoded.Command, resp.Command)
	}
	if decoded.Metadata == nil || decoded.Metadata.ResourceType != resp.Metadata.ResourceType {
		t.Error("Metadata not properly marshaled/unmarshaled")
	}
}

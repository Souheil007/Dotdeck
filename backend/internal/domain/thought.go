package domain

import (
	"time"
)

// ThoughtEvent represents a recorded analytical step or milestone from a cloud agent.
type ThoughtEvent struct {
	ID              string      `json:"id"`
	WorkspaceID     string      `json:"workspace_id"`
	AgentID         string      `json:"agent_id"`
	RunID           string      `json:"run_id"`
	StepIndex       int         `json:"step_index"`
	ReasoningTrace  string      `json:"reasoning_trace"`
	NextPlannedStep string      `json:"next_planned_step"`
	ToolCalled      string      `json:"tool_called,omitempty"`
	ToolPayload     interface{} `json:"tool_payload,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
}

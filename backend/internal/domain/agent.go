// Package domain defines core entities, enums, and domain boundaries
// for the Dotdeck cloud agent orchestration platform.
package domain

import (
	"time"
)

// AgentStatus represents the active lifecycle or execution state of a cloud agent.
type AgentStatus string

const (
	// StatusUnpaired indicates the agent blueprint has been created but has not yet called initialize().
	StatusUnpaired AgentStatus = "unpaired"

	// StatusResting indicates the agent is idle in vendor cloud standby awaiting schedule or prompt.
	StatusResting AgentStatus = "resting"

	// StatusScheduled indicates the agent is sleeping until a designated cron interval.
	StatusScheduled AgentStatus = "scheduled"

	// StatusWorking indicates the agent is actively executing reasoning steps or tool calls.
	StatusWorking AgentStatus = "working"

	// StatusBlockedOnUser indicates the agent is paused in HoldEngine waiting for human authority.
	StatusBlockedOnUser AgentStatus = "blocked_on_user"

	// StatusFailed indicates the agent's last execution run terminated with an error.
	StatusFailed AgentStatus = "failed"
)

// Provider identifies the proprietary cloud vendor hosting the agent VM.
type Provider string

const (
	// ProviderOpenAIDot identifies an OpenAI Cloud Computer agent.
	ProviderOpenAIDot Provider = "openai_dot"

	// ProviderGrokBot identifies an xAI Grok Cloud Computer agent.
	ProviderGrokBot Provider = "grok_bot"

	// ProviderMetaMuse identifies a Meta Muse Secure VM agent.
	ProviderMetaMuse Provider = "meta_muse"

	// ProviderClaude identifies an Anthropic Claude Cloud Agent.
	ProviderClaude Provider = "claude"
)

// Agent represents an autonomous cloud agent entity managed on the visual canvas.
type Agent struct {
	ID             string      `json:"id"`
	WorkspaceID    string      `json:"workspace_id"`
	Token          string      `json:"token"`
	Name           string      `json:"name"`
	Provider       Provider    `json:"provider"`
	Goal           string      `json:"goal"`
	ScheduleCron   string      `json:"schedule_cron"`
	AuthorityRules []string    `json:"authority_rules"`
	Status         AgentStatus `json:"status"`
	PositionX      float64     `json:"position_x"`
	PositionY      float64     `json:"position_y"`
	LastHeartbeat  *time.Time  `json:"last_heartbeat,omitempty"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

// Edge represents a directed communication link connecting two agent nodes on the canvas.
type Edge struct {
	ID            string    `json:"id"`
	WorkspaceID   string    `json:"workspace_id"`
	SourceAgentID string    `json:"source_agent_id"`
	TargetAgentID string    `json:"target_agent_id"`
	ToolName      string    `json:"tool_name"`
	CreatedAt     time.Time `json:"created_at"`
}

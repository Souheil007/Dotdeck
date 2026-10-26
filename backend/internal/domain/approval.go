package domain

import (
	"time"
)

// ApprovalStatus represents the resolution state of a human authority request.
type ApprovalStatus string

const (
	// ApprovalStatusPending indicates the question is currently awaiting operator response.
	ApprovalStatusPending ApprovalStatus = "pending"

	// ApprovalStatusApproved indicates the operator authorized the action.
	ApprovalStatusApproved ApprovalStatus = "approved"

	// ApprovalStatusRejected indicates the operator denied the proposed action.
	ApprovalStatusRejected ApprovalStatus = "rejected"

	// ApprovalStatusTimedOut indicates the 45s hold deadline elapsed without human intervention.
	ApprovalStatusTimedOut ApprovalStatus = "timed_out"
)

// ApprovalRequest holds the decision payload emitted by a paused cloud agent.
type ApprovalRequest struct {
	ID             string         `json:"id"`
	WorkspaceID    string         `json:"workspace_id"`
	AgentID        string         `json:"agent_id"`
	Question       string         `json:"question"`
	Options        []string       `json:"options"`
	ReasoningTrace string         `json:"reasoning_trace"`
	Status         ApprovalStatus `json:"status"`
	CreatedAt      time.Time      `json:"created_at"`
}

// DecisionResult represents the human operator's verdict and feedback.
type DecisionResult struct {
	Approved   bool      `json:"approved"`
	Answer     string    `json:"answer"`
	OperatorID string    `json:"operator_id"`
	ResolvedAt time.Time `json:"resolved_at"`
}

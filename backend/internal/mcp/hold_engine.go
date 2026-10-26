// Package mcp implements the multi-tenant Model Context Protocol switchboard
// connecting closed cloud agents to the Dotdeck orchestration graph.
package mcp

import (
	"context"
	"errors"
	"sync"
	"time"
)

var (
	// ErrApprovalTimeout occurs when no operator claims or resolves an agent request within the deadline.
	ErrApprovalTimeout = errors.New("approval request timed out waiting for human operator")

	// ErrApprovalNotFound indicates the requested approval identifier does not exist or has already been completed.
	ErrApprovalNotFound = errors.New("approval request not found or already closed")

	// ErrAlreadyClaimed indicates another teammate is currently authoring a response.
	ErrAlreadyClaimed = errors.New("approval request is currently locked by another operator")
)

// DecisionRequest holds the payload emitted by a paused cloud agent.
type DecisionRequest struct {
	ID             string    `json:"id"`
	WorkspaceID    string    `json:"workspace_id"`
	AgentID        string    `json:"agent_id"`
	Question       string    `json:"question"`
	Options        []string  `json:"options"`
	ReasoningTrace string    `json:"reasoning_trace"`
	CreatedAt      time.Time `json:"created_at"`
}

// DecisionResult represents the human operator's verdict and feedback.
type DecisionResult struct {
	Approved   bool      `json:"approved"`
	Answer     string    `json:"answer"`
	OperatorID string    `json:"operator_id"`
	ResolvedAt time.Time `json:"resolved_at"`
}

type pendingSlot struct {
	req      DecisionRequest
	replyCh  chan DecisionResult
	claimed  string
	expireAt time.Time
}

// HoldEngine manages synchronous pause-and-answer channels for cloud agent tool calls.
type HoldEngine struct {
	mu      sync.RWMutex
	pending map[string]*pendingSlot
}

// NewHoldEngine initializes an in-memory holding registry for interactive tool calls.
func NewHoldEngine() *HoldEngine {
	return &HoldEngine{
		pending: make(map[string]*pendingSlot),
	}
}

// Hold registers a decision request and pauses the caller until resolved, cancelled, or timed out.
//
// The default ceiling is 45 seconds to safely precede cloud provider tool-call deadlines.
func (h *HoldEngine) Hold(ctx context.Context, req DecisionRequest, timeout time.Duration) (*DecisionResult, error) {
	if timeout <= 0 {
		timeout = 45 * time.Second
	}

	replyCh := make(chan DecisionResult, 1)
	slot := &pendingSlot{
		req:      req,
		replyCh:  replyCh,
		expireAt: time.Now().Add(timeout),
	}

	h.mu.Lock()
	h.pending[req.ID] = slot
	h.mu.Unlock()

	defer func() {
		h.mu.Lock()
		delete(h.pending, req.ID)
		h.mu.Unlock()
	}()

	select {
	case res := <-replyCh:
		return &res, nil
	case <-time.After(timeout):
		return nil, ErrApprovalTimeout
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// Resolve delivers the operator verdict to the waiting agent channel.
func (h *HoldEngine) Resolve(id string, result DecisionResult) error {
	h.mu.RLock()
	slot, exists := h.pending[id]
	h.mu.RUnlock()

	if !exists {
		return ErrApprovalNotFound
	}

	result.ResolvedAt = time.Now()
	select {
	case slot.replyCh <- result:
		return nil
	default:
		return ErrApprovalNotFound
	}
}

// Claim marks an in-flight approval request as locked by a specific operator to prevent double-replies.
func (h *HoldEngine) Claim(id, operatorID string) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	slot, exists := h.pending[id]
	if !exists {
		return ErrApprovalNotFound
	}
	if slot.claimed != "" && slot.claimed != operatorID {
		return ErrAlreadyClaimed
	}

	slot.claimed = operatorID
	return nil
}

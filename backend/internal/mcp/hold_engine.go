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

type pendingHoldSlot struct {
	request        DecisionRequest
	replyChannel   chan DecisionResult
	claimedBy      string
	expirationTime time.Time
}

// ResolutionPublisher abstracts publishing resolution events to an external cluster mesh (e.g., Redis).
type ResolutionPublisher interface {
	PublishResolution(publishContext context.Context, approvalID string, result DecisionResult) error
}

// HoldEngine manages synchronous pause-and-answer channels for cloud agent tool calls.
type HoldEngine struct {
	engineMutex sync.RWMutex
	pendingMap  map[string]*pendingHoldSlot
	publisher   ResolutionPublisher
}

// NewHoldEngine initializes an in-memory holding registry for interactive tool calls.
func NewHoldEngine() *HoldEngine {
	return &HoldEngine{
		pendingMap: make(map[string]*pendingHoldSlot),
	}
}

// SetPublisher attaches an external resolution mesh publisher (e.g., Redis Pub/Sub adapter).
func (engine *HoldEngine) SetPublisher(publisher ResolutionPublisher) {
	engine.engineMutex.Lock()
	defer engine.engineMutex.Unlock()
	engine.publisher = publisher
}

// Hold registers a decision request and pauses the caller until resolved, cancelled, or timed out.
//
// The default ceiling is 45 seconds to safely precede cloud provider tool-call deadlines.
func (engine *HoldEngine) Hold(streamContext context.Context, request DecisionRequest, timeout time.Duration) (*DecisionResult, error) {
	if timeout <= 0 {
		timeout = 45 * time.Second
	}

	replyChannel := make(chan DecisionResult, 1)
	slotInstance := &pendingHoldSlot{
		request:        request,
		replyChannel:   replyChannel,
		expirationTime: time.Now().Add(timeout),
	}

	engine.engineMutex.Lock()
	engine.pendingMap[request.ID] = slotInstance
	engine.engineMutex.Unlock()

	defer func() {
		engine.engineMutex.Lock()
		delete(engine.pendingMap, request.ID)
		engine.engineMutex.Unlock()
	}()

	select {
	case outcome := <-replyChannel:
		return &outcome, nil
	case <-time.After(timeout):
		return nil, ErrApprovalTimeout
	case <-streamContext.Done():
		return nil, streamContext.Err()
	}
}

// Resolve delivers the operator verdict to the waiting agent channel, forwarding to Redis if configured.
func (engine *HoldEngine) Resolve(approvalID string, result DecisionResult) error {
	result.ResolvedAt = time.Now().UTC()

	engine.engineMutex.RLock()
	slotInstance, existsLocally := engine.pendingMap[approvalID]
	publisherInstance := engine.publisher
	engine.engineMutex.RUnlock()

	if existsLocally {
		select {
		case slotInstance.replyChannel <- result:
			if publisherInstance != nil {
				publishContext, cancelPublish := context.WithTimeout(context.Background(), 3*time.Second)
				defer cancelPublish()
				_ = publisherInstance.PublishResolution(publishContext, approvalID, result)
			}
			return nil
		default:
			return ErrApprovalNotFound
		}
	}

	// If slot is not held on this node, but publisher is configured, publish across cluster
	if publisherInstance != nil {
		publishContext, cancelPublish := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancelPublish()
		return publisherInstance.PublishResolution(publishContext, approvalID, result)
	}

	return ErrApprovalNotFound
}

// ResolveLocal unblocks a locally held channel without re-publishing to the cluster mesh.
func (engine *HoldEngine) ResolveLocal(approvalID string, result DecisionResult) error {
	engine.engineMutex.RLock()
	slotInstance, existsLocally := engine.pendingMap[approvalID]
	engine.engineMutex.RUnlock()

	if !existsLocally {
		return ErrApprovalNotFound
	}

	select {
	case slotInstance.replyChannel <- result:
		return nil
	default:
		return ErrApprovalNotFound
	}
}

// Claim marks an in-flight approval request as locked by a specific operator to prevent double-replies.
func (engine *HoldEngine) Claim(approvalID, operatorID string) error {
	engine.engineMutex.Lock()
	defer engine.engineMutex.Unlock()

	slotInstance, exists := engine.pendingMap[approvalID]
	if !exists {
		return ErrApprovalNotFound
	}
	if slotInstance.claimedBy != "" && slotInstance.claimedBy != operatorID {
		return ErrAlreadyClaimed
	}

	slotInstance.claimedBy = operatorID
	return nil
}

// ReleaseClaim clears an operator's edit lock if they cancel or close the review drawer.
func (engine *HoldEngine) ReleaseClaim(approvalID, operatorID string) error {
	engine.engineMutex.Lock()
	defer engine.engineMutex.Unlock()

	slotInstance, exists := engine.pendingMap[approvalID]
	if !exists {
		return ErrApprovalNotFound
	}
	if slotInstance.claimedBy == operatorID {
		slotInstance.claimedBy = ""
	}
	return nil
}

// IsPending checks whether a given approval identifier is actively held on this node.
func (engine *HoldEngine) IsPending(approvalID string) bool {
	engine.engineMutex.RLock()
	defer engine.engineMutex.RUnlock()

	_, exists := engine.pendingMap[approvalID]
	return exists
}

package mcp

import (
	"context"
	"testing"
	"time"
)

// TestHoldEngineResolve verifies that an approval request is unblocked immediately
// when an operator delivers a verdict within the timeout window.
func TestHoldEngineResolve(testingT *testing.T) {
	engine := NewHoldEngine()
	req := DecisionRequest{
		ID:          "test-approval-1",
		WorkspaceID: "ws-test",
		AgentID:     "agent-test",
		Question:    "Deploy to production?",
	}

	go func() {
		time.Sleep(50 * time.Millisecond)
		err := engine.Resolve("test-approval-1", DecisionResult{
			Approved:   true,
			Answer:     "Ship it",
			OperatorID: "operator-alex",
		})
		if err != nil {
			testingT.Errorf("expected clean resolve, got %v", err)
		}
	}()

	res, err := engine.Hold(context.Background(), req, 1*time.Second)
	if err != nil {
		testingT.Fatalf("unexpected hold error: %v", err)
	}

	if !res.Approved {
		testingT.Errorf("expected approved = true")
	}
	if res.Answer != "Ship it" {
		testingT.Errorf("expected answer 'Ship it', got %s", res.Answer)
	}
}

// TestHoldEngineTimeout verifies that an approval times out cleanly if no operator answers.
func TestHoldEngineTimeout(testingT *testing.T) {
	engine := NewHoldEngine()
	req := DecisionRequest{
		ID:          "test-approval-timeout",
		WorkspaceID: "ws-test",
		AgentID:     "agent-test",
		Question:    "Should I delete old logs?",
	}

	_, err := engine.Hold(context.Background(), req, 50*time.Millisecond)
	if err != ErrApprovalTimeout {
		testingT.Errorf("expected ErrApprovalTimeout, got %v", err)
	}
}

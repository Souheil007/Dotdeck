// Package mcp provides unit tests validating the multi-tenant JSON-RPC 2.0 switchboard.
package mcp

import (
	"context"
	"testing"
	"time"
)

// TestHoldEngineResolve_Inline verifies that an approval request is unblocked immediately
// when an operator delivers a verdict within the timeout window.
func TestHoldEngineResolve_Inline(testingTarget *testing.T) {
	holdEngine := NewHoldEngine()
	decisionRequest := DecisionRequest{
		ID:          "test-approval-1",
		WorkspaceID: "ws-test",
		AgentID:     "agent-test",
		Question:    "Deploy to production?",
	}

	go func() {
		time.Sleep(20 * time.Millisecond)
		resolveError := holdEngine.Resolve("test-approval-1", DecisionResult{
			Approved:   true,
			Answer:     "Ship it",
			OperatorID: "operator-alex",
		})
		if resolveError != nil {
			testingTarget.Errorf("expected clean resolve, got %v", resolveError)
		}
	}()

	decisionOutcome, holdError := holdEngine.Hold(context.Background(), decisionRequest, 1*time.Second)
	if holdError != nil {
		testingTarget.Fatalf("unexpected hold error: %v", holdError)
	}

	if !decisionOutcome.Approved {
		testingTarget.Errorf("expected approved = true")
	}
	if decisionOutcome.Answer != "Ship it" {
		testingTarget.Errorf("expected answer 'Ship it', got %s", decisionOutcome.Answer)
	}
}

// TestHoldEngineTimeout verifies that an approval times out cleanly if no operator answers.
func TestHoldEngineTimeout(testingTarget *testing.T) {
	holdEngine := NewHoldEngine()
	decisionRequest := DecisionRequest{
		ID:          "test-approval-timeout",
		WorkspaceID: "ws-test",
		AgentID:     "agent-test",
		Question:    "Should I delete old logs?",
	}

	_, holdError := holdEngine.Hold(context.Background(), decisionRequest, 30*time.Millisecond)
	if holdError != ErrApprovalTimeout {
		testingTarget.Errorf("expected ErrApprovalTimeout, got %v", holdError)
	}
}

// TestHoldEngineClaimAndRelease verifies multi-operator concurrency locks on pending decisions.
func TestHoldEngineClaimAndRelease(testingTarget *testing.T) {
	holdEngine := NewHoldEngine()
	decisionRequest := DecisionRequest{
		ID:          "test-approval-lock",
		WorkspaceID: "ws-test",
		AgentID:     "agent-test",
		Question:    "Rotate API keys?",
	}

	go func() {
		_, _ = holdEngine.Hold(context.Background(), decisionRequest, 1*time.Second)
	}()

	// Wait briefly for slot registration
	time.Sleep(10 * time.Millisecond)

	// Operator 1 claims the request
	claimError1 := holdEngine.Claim(decisionRequest.ID, "operator-alice")
	if claimError1 != nil {
		testingTarget.Fatalf("expected alice to claim cleanly, got: %v", claimError1)
	}

	// Operator 2 attempts to claim while locked
	claimError2 := holdEngine.Claim(decisionRequest.ID, "operator-bob")
	if claimError2 != ErrAlreadyClaimed {
		testingTarget.Fatalf("expected ErrAlreadyClaimed for bob, got: %v", claimError2)
	}

	// Operator 1 releases claim
	releaseError := holdEngine.ReleaseClaim(decisionRequest.ID, "operator-alice")
	if releaseError != nil {
		testingTarget.Fatalf("expected alice to release claim cleanly, got: %v", releaseError)
	}

	// Operator 2 can now claim
	claimError3 := holdEngine.Claim(decisionRequest.ID, "operator-bob")
	if claimError3 != nil {
		testingTarget.Fatalf("expected bob to claim successfully after release, got: %v", claimError3)
	}

	// Resolve the hold
	_ = holdEngine.Resolve(decisionRequest.ID, DecisionResult{Approved: true})
}

// TestHoldEngineResolveLocal verifies local unblocking without re-publishing to cluster mesh.
func TestHoldEngineResolveLocal(testingTarget *testing.T) {
	holdEngine := NewHoldEngine()
	decisionRequest := DecisionRequest{
		ID:          "test-approval-local",
		WorkspaceID: "ws-test",
		AgentID:     "agent-test",
		Question:    "Run database backup?",
	}

	go func() {
		time.Sleep(15 * time.Millisecond)
		resolveError := holdEngine.ResolveLocal(decisionRequest.ID, DecisionResult{
			Approved:   true,
			Answer:     "Backup started",
			OperatorID: "operator-charlie",
		})
		if resolveError != nil {
			testingTarget.Errorf("expected clean ResolveLocal, got %v", resolveError)
		}
	}()

	decisionOutcome, holdError := holdEngine.Hold(context.Background(), decisionRequest, 1*time.Second)
	if holdError != nil {
		testingTarget.Fatalf("unexpected hold error: %v", holdError)
	}

	if decisionOutcome.Answer != "Backup started" {
		testingTarget.Errorf("expected 'Backup started', got %q", decisionOutcome.Answer)
	}

	notFoundError := holdEngine.ResolveLocal("non-existent-id", DecisionResult{})
	if notFoundError != ErrApprovalNotFound {
		testingTarget.Errorf("expected ErrApprovalNotFound, got %v", notFoundError)
	}
}

type mockResolutionPublisher struct {
	publishedID     string
	publishedResult DecisionResult
}

func (mockPub *mockResolutionPublisher) PublishResolution(publishContext context.Context, approvalID string, result DecisionResult) error {
	mockPub.publishedID = approvalID
	mockPub.publishedResult = result
	return nil
}

// TestHoldEngineCrossNodeMesh simulates a multi-node deployment where Node 1 holds the agent,
// an operator submits resolution to Node 2, and the event travels via the cluster mesh.
func TestHoldEngineCrossNodeMesh(testingTarget *testing.T) {
	node1Engine := NewHoldEngine()
	node2Engine := NewHoldEngine()

	mockPublisher := &mockResolutionPublisher{}
	node2Engine.SetPublisher(mockPublisher)

	decisionRequest := DecisionRequest{
		ID:          "test-approval-cross-node",
		WorkspaceID: "ws-test",
		AgentID:     "agent-held-on-node-1",
		Question:    "Scale cluster to 10 pods?",
	}

	go func() {
		// Wait for Node 1 to hold the channel
		time.Sleep(20 * time.Millisecond)

		// Operator sends resolve to Node 2 (which does not hold it locally)
		resolveError := node2Engine.Resolve(decisionRequest.ID, DecisionResult{
			Approved:   true,
			Answer:     "Scaled",
			OperatorID: "operator-ops",
		})
		if resolveError != nil {
			testingTarget.Errorf("expected node 2 to resolve via publisher, got: %v", resolveError)
		}

		// Simulate Redis subscription delivery to Node 1
		if mockPublisher.publishedID == decisionRequest.ID {
			_ = node1Engine.ResolveLocal(mockPublisher.publishedID, mockPublisher.publishedResult)
		}
	}()

	decisionOutcome, holdError := node1Engine.Hold(context.Background(), decisionRequest, 1*time.Second)
	if holdError != nil {
		testingTarget.Fatalf("node 1 hold failed: %v", holdError)
	}

	if !decisionOutcome.Approved || decisionOutcome.Answer != "Scaled" {
		testingTarget.Errorf("expected approved with 'Scaled', got %+v", decisionOutcome)
	}
}

// TestHoldEngineIsPending validates status tracking for pending hold slots.
func TestHoldEngineIsPending(testingTarget *testing.T) {
	holdEngine := NewHoldEngine()
	decisionRequest := DecisionRequest{
		ID:          "test-approval-pending-check",
		WorkspaceID: "ws-test",
		AgentID:     "agent-test",
		Question:    "Pending check question",
	}

	if holdEngine.IsPending(decisionRequest.ID) {
		testingTarget.Errorf("expected IsPending to be false before hold")
	}

	go func() {
		_, _ = holdEngine.Hold(context.Background(), decisionRequest, 200*time.Millisecond)
	}()

	time.Sleep(10 * time.Millisecond)

	if !holdEngine.IsPending(decisionRequest.ID) {
		testingTarget.Errorf("expected IsPending to be true while holding")
	}

	_ = holdEngine.Resolve(decisionRequest.ID, DecisionResult{Approved: true})
	time.Sleep(10 * time.Millisecond)

	if holdEngine.IsPending(decisionRequest.ID) {
		testingTarget.Errorf("expected IsPending to be false after resolve")
	}
}

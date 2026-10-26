// Package handlers provides unit tests validating HTTP REST controllers.
package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Souheil007/Dotdeck/backend/internal/api/middleware"
	"github.com/Souheil007/Dotdeck/backend/internal/domain"
	"github.com/Souheil007/Dotdeck/backend/internal/mcp"
)

type mockApprovalBroadcaster struct {
	broadcastEvents []string
}

func (broadcaster *mockApprovalBroadcaster) Broadcast(workspaceID, eventType string, payload interface{}) {
	broadcaster.broadcastEvents = append(broadcaster.broadcastEvents, eventType)
}

type mockApprovalRepository struct {
	resolveFunc func(requestContext context.Context, approvalID string, decision domain.DecisionResult) (*domain.ApprovalRequest, error)
}

func (repo *mockApprovalRepository) ResolveApproval(requestContext context.Context, approvalID string, decision domain.DecisionResult) (*domain.ApprovalRequest, error) {
	if repo.resolveFunc != nil {
		return repo.resolveFunc(requestContext, approvalID, decision)
	}
	return &domain.ApprovalRequest{
		ID:     approvalID,
		Status: domain.ApprovalStatusApproved,
	}, nil
}

// TestApprovalHandlerClaim_SuccessAndConflict validates locking and conflict handling.
func TestApprovalHandlerClaim_SuccessAndConflict(testingTarget *testing.T) {
	holdEngine := mcp.NewHoldEngine()
	broadcaster := &mockApprovalBroadcaster{}
	approvalHandler := NewApprovalHandler(holdEngine)
	approvalHandler.SetBroadcaster(broadcaster)

	approvalIdentifier := "test-approval-claim-1"
	decisionRequest := mcp.DecisionRequest{
		ID:          approvalIdentifier,
		WorkspaceID: "ws-test",
		AgentID:     "agent-test",
		Question:    "Deploy to production?",
	}

	go func() {
		_, _ = holdEngine.Hold(context.Background(), decisionRequest, 1*time.Second)
	}()
	time.Sleep(10 * time.Millisecond)

	// Operator 1 claims the question
	payloadAlice := ApprovalClaimPayload{
		ApprovalID:  approvalIdentifier,
		WorkspaceID: "ws-test",
	}
	serializedAlice, _ := json.Marshal(payloadAlice)

	httpRequestAlice := httptest.NewRequest(http.MethodPost, "/api/v1/approvals/claim", bytes.NewReader(serializedAlice))
	httpRequestAlice = httpRequestAlice.WithContext(middleware.WithUserContext(httpRequestAlice.Context(), "user-alice", "Alice", "operator"))
	recorderAlice := httptest.NewRecorder()

	approvalHandler.Claim(recorderAlice, httpRequestAlice)

	if recorderAlice.Code != http.StatusOK {
		testingTarget.Fatalf("expected HTTP 200 for Alice claim, got %d: %s", recorderAlice.Code, recorderAlice.Body.String())
	}

	// Operator 2 attempts to claim while held by Alice
	payloadBob := ApprovalClaimPayload{
		ApprovalID:  approvalIdentifier,
		WorkspaceID: "ws-test",
	}
	serializedBob, _ := json.Marshal(payloadBob)

	httpRequestBob := httptest.NewRequest(http.MethodPost, "/api/v1/approvals/claim", bytes.NewReader(serializedBob))
	httpRequestBob = httpRequestBob.WithContext(middleware.WithUserContext(httpRequestBob.Context(), "user-bob", "Bob", "operator"))
	recorderBob := httptest.NewRecorder()

	approvalHandler.Claim(recorderBob, httpRequestBob)

	if recorderBob.Code != http.StatusConflict {
		testingTarget.Fatalf("expected HTTP 409 Conflict for Bob claim, got %d: %s", recorderBob.Code, recorderBob.Body.String())
	}
}

// TestApprovalHandlerReleaseClaim validates unlock and notification fan-out.
func TestApprovalHandlerReleaseClaim(testingTarget *testing.T) {
	holdEngine := mcp.NewHoldEngine()
	broadcaster := &mockApprovalBroadcaster{}
	approvalHandler := NewApprovalHandler(holdEngine)
	approvalHandler.SetBroadcaster(broadcaster)

	approvalIdentifier := "test-approval-release-1"
	decisionRequest := mcp.DecisionRequest{
		ID:          approvalIdentifier,
		WorkspaceID: "ws-test",
		AgentID:     "agent-test",
		Question:    "Restart node?",
	}

	go func() {
		_, _ = holdEngine.Hold(context.Background(), decisionRequest, 1*time.Second)
	}()
	time.Sleep(10 * time.Millisecond)

	_ = holdEngine.Claim(approvalIdentifier, "user-alice")

	payloadRelease := ApprovalClaimPayload{
		ApprovalID:  approvalIdentifier,
		WorkspaceID: "ws-test",
	}
	serializedRelease, _ := json.Marshal(payloadRelease)

	httpRequestRelease := httptest.NewRequest(http.MethodPost, "/api/v1/approvals/release-claim", bytes.NewReader(serializedRelease))
	httpRequestRelease = httpRequestRelease.WithContext(middleware.WithUserContext(httpRequestRelease.Context(), "user-alice", "Alice", "operator"))
	recorderRelease := httptest.NewRecorder()

	approvalHandler.ReleaseClaim(recorderRelease, httpRequestRelease)

	if recorderRelease.Code != http.StatusOK {
		testingTarget.Fatalf("expected HTTP 200 for release, got %d", recorderRelease.Code)
	}

	// Verify Bob can now claim
	claimErrorBob := holdEngine.Claim(approvalIdentifier, "user-bob")
	if claimErrorBob != nil {
		testingTarget.Fatalf("expected Bob to claim after Alice released, got: %v", claimErrorBob)
	}
}

// TestApprovalHandlerResolve_Inline validates synchronous unblocking within the 45-second window.
func TestApprovalHandlerResolve_Inline(testingTarget *testing.T) {
	holdEngine := mcp.NewHoldEngine()
	approvalHandler := NewApprovalHandler(holdEngine)

	approvalIdentifier := "test-approval-inline-1"
	decisionRequest := mcp.DecisionRequest{
		ID:          approvalIdentifier,
		WorkspaceID: "ws-test",
		AgentID:     "agent-test",
		Question:    "Grant IAM role?",
	}

	channelDone := make(chan *mcp.DecisionResult, 1)
	go func() {
		decisionOutcome, holdError := holdEngine.Hold(context.Background(), decisionRequest, 1*time.Second)
		if holdError == nil {
			channelDone <- decisionOutcome
		}
	}()
	time.Sleep(15 * time.Millisecond)

	payloadResolve := ApprovalResolvePayload{
		ApprovalID: approvalIdentifier,
		Approved:   true,
		Answer:     "Role granted",
	}
	serializedResolve, _ := json.Marshal(payloadResolve)

	httpRequestResolve := httptest.NewRequest(http.MethodPost, "/api/v1/approvals/resolve", bytes.NewReader(serializedResolve))
	httpRequestResolve = httpRequestResolve.WithContext(middleware.WithUserContext(httpRequestResolve.Context(), "user-alice", "Alice", "operator"))
	recorderResolve := httptest.NewRecorder()

	approvalHandler.Resolve(recorderResolve, httpRequestResolve)

	if recorderResolve.Code != http.StatusOK {
		testingTarget.Fatalf("expected HTTP 200, got %d: %s", recorderResolve.Code, recorderResolve.Body.String())
	}

	select {
	case outcome := <-channelDone:
		if !outcome.Approved || outcome.Answer != "Role granted" {
			testingTarget.Errorf("unexpected held outcome: %+v", outcome)
		}
	case <-time.After(100 * time.Millisecond):
		testingTarget.Fatalf("timed out waiting for held agent to unblock")
	}
}

// TestApprovalHandlerResolve_ConflictDoubleApproval validates that concurrent resolutions fail atomically.
func TestApprovalHandlerResolve_ConflictDoubleApproval(testingTarget *testing.T) {
	holdEngine := mcp.NewHoldEngine()
	mockRepo := &mockApprovalRepository{}
	approvalHandler := NewApprovalHandler(holdEngine)
	approvalHandler.SetRepository(mockRepo)

	approvalIdentifier := "test-approval-double-1"
	decisionRequest := mcp.DecisionRequest{
		ID:          approvalIdentifier,
		WorkspaceID: "ws-test",
		AgentID:     "agent-test",
		Question:    "Execute order 66?",
	}

	go func() {
		_, _ = holdEngine.Hold(context.Background(), decisionRequest, 1*time.Second)
	}()
	time.Sleep(10 * time.Millisecond)

	resolvedOnce := false
	mockRepo.resolveFunc = func(requestContext context.Context, approvalID string, decision domain.DecisionResult) (*domain.ApprovalRequest, error) {
		if resolvedOnce {
			return nil, errors.New("already resolved or 0 rows updated")
		}
		resolvedOnce = true
		return &domain.ApprovalRequest{ID: approvalID, Status: domain.ApprovalStatusApproved}, nil
	}

	payloadResolve := ApprovalResolvePayload{
		ApprovalID: approvalIdentifier,
		Approved:   true,
		Answer:     "Confirmed",
	}
	serializedResolve, _ := json.Marshal(payloadResolve)

	// First operator resolve succeeds
	httpRequest1 := httptest.NewRequest(http.MethodPost, "/api/v1/approvals/resolve", bytes.NewReader(serializedResolve))
	recorder1 := httptest.NewRecorder()
	approvalHandler.Resolve(recorder1, httpRequest1)

	if recorder1.Code != http.StatusOK {
		testingTarget.Fatalf("expected HTTP 200 for first resolve, got %d", recorder1.Code)
	}

	// Second operator resolve fails with HTTP 409 Conflict
	httpRequest2 := httptest.NewRequest(http.MethodPost, "/api/v1/approvals/resolve", bytes.NewReader(serializedResolve))
	recorder2 := httptest.NewRecorder()
	approvalHandler.Resolve(recorder2, httpRequest2)

	if recorder2.Code != http.StatusConflict {
		testingTarget.Fatalf("expected HTTP 409 Conflict for double approval, got %d: %s", recorder2.Code, recorder2.Body.String())
	}
}

// TestApprovalHandlerResolve_AsynchronousPastDeadline validates resolving an approval after the 45s hold window.
func TestApprovalHandlerResolve_AsynchronousPastDeadline(testingTarget *testing.T) {
	holdEngine := mcp.NewHoldEngine()
	mockRepo := &mockApprovalRepository{}
	approvalHandler := NewApprovalHandler(holdEngine)
	approvalHandler.SetRepository(mockRepo)

	// Approval is NOT held in holdEngine (timed out or node restarted)
	mockRepo.resolveFunc = func(requestContext context.Context, approvalID string, decision domain.DecisionResult) (*domain.ApprovalRequest, error) {
		return &domain.ApprovalRequest{
			ID:     approvalID,
			Status: domain.ApprovalStatusApproved,
		}, nil
	}

	payloadResolve := ApprovalResolvePayload{
		ApprovalID: "expired-approval-id",
		Approved:   true,
		Answer:     "Late human answer",
	}
	serializedResolve, _ := json.Marshal(payloadResolve)

	httpRequest := httptest.NewRequest(http.MethodPost, "/api/v1/approvals/resolve", bytes.NewReader(serializedResolve))
	recorder := httptest.NewRecorder()

	approvalHandler.Resolve(recorder, httpRequest)

	if recorder.Code != http.StatusOK {
		testingTarget.Fatalf("expected HTTP 200 for async resolve, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var responseEnvelope struct {
		Success bool                    `json:"success"`
		Data    ApprovalResolveResponse `json:"data"`
	}
	if decodeError := json.Unmarshal(recorder.Body.Bytes(), &responseEnvelope); decodeError != nil {
		testingTarget.Fatalf("failed to decode response: %v", decodeError)
	}

	if responseEnvelope.Data.Status != "resolved_asynchronously" {
		testingTarget.Errorf("expected status 'resolved_asynchronously', got %q", responseEnvelope.Data.Status)
	}
}

type mockApprovalWakeDispatcher struct {
	wokenAgentID string
	wokenPrompt  string
}

func (dispatcher *mockApprovalWakeDispatcher) WakeAgentByID(requestContext context.Context, agentID, promptText string) error {
	dispatcher.wokenAgentID = agentID
	dispatcher.wokenPrompt = promptText
	return nil
}

// TestApprovalHandlerResolve_LateApprovalWakesAgent validates that late resolution triggers the wake-up bridge.
func TestApprovalHandlerResolve_LateApprovalWakesAgent(testingTarget *testing.T) {
	holdEngine := mcp.NewHoldEngine()
	mockRepo := &mockApprovalRepository{}
	mockWake := &mockApprovalWakeDispatcher{}

	approvalHandler := NewApprovalHandler(holdEngine)
	approvalHandler.SetRepository(mockRepo)
	approvalHandler.SetWakeDispatcher(mockWake)

	expiredApprovalID := "expired-approval-456"
	targetAgentID := "agent-789"
	mockRepo.resolveFunc = func(requestContext context.Context, approvalID string, decision domain.DecisionResult) (*domain.ApprovalRequest, error) {
		return &domain.ApprovalRequest{
			ID:       approvalID,
			AgentID:  targetAgentID,
			Question: "Deploy to production cluster?",
			Status:   domain.ApprovalStatusApproved,
		}, nil
	}

	payloadResolve := ApprovalResolvePayload{
		ApprovalID: expiredApprovalID,
		Approved:   true,
		Answer:     "Deploy approved by Alex",
	}
	serializedResolve, _ := json.Marshal(payloadResolve)

	httpRequest := httptest.NewRequest(http.MethodPost, "/api/v1/approvals/resolve", bytes.NewReader(serializedResolve))
	recorder := httptest.NewRecorder()

	approvalHandler.Resolve(recorder, httpRequest)

	if recorder.Code != http.StatusOK {
		testingTarget.Fatalf("expected HTTP 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	if mockWake.wokenAgentID != targetAgentID {
		testingTarget.Errorf("expected woken agent ID %q, got %q", targetAgentID, mockWake.wokenAgentID)
	}

	expectedSubstring := "Deploy to production cluster?"
	if !strings.Contains(mockWake.wokenPrompt, expectedSubstring) {
		testingTarget.Errorf("expected wake prompt to contain %q, got %q", expectedSubstring, mockWake.wokenPrompt)
	}
}

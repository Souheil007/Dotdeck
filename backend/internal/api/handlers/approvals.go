// Package handlers provides HTTP REST controllers handling incoming client requests.
package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/Souheil007/Dotdeck/backend/internal/api/middleware"
	"github.com/Souheil007/Dotdeck/backend/internal/domain"
	"github.com/Souheil007/Dotdeck/backend/internal/mcp"
	"github.com/Souheil007/Dotdeck/backend/pkg/response"
)

// ApprovalRepository abstracts atomic persistence for approval lifecycle states.
type ApprovalRepository interface {
	ResolveApproval(requestContext context.Context, approvalID string, decision domain.DecisionResult) (*domain.ApprovalRequest, error)
}

// ApprovalWakeDispatcher abstracts waking sleeping agents when approvals resolve after timeouts.
type ApprovalWakeDispatcher interface {
	WakeAgentByID(requestContext context.Context, agentID, promptText string) error
}

// LockManager abstracts distributed concurrency locks for pending approvals.
type LockManager interface {
	TryClaimLock(claimContext context.Context, approvalID, operatorID string, lockDuration time.Duration) (bool, error)
	ReleaseClaimLock(releaseContext context.Context, approvalID, operatorID string) error
}

// ApprovalHandler processes human-in-the-loop decisions submitted from the visual canvas.
type ApprovalHandler struct {
	holdEngine     *mcp.HoldEngine
	repository     ApprovalRepository
	broadcaster    mcp.EventBroadcaster
	lockManager    LockManager
	wakeDispatcher ApprovalWakeDispatcher
}

// NewApprovalHandler constructs an approval decision controller.
func NewApprovalHandler(holdEngine *mcp.HoldEngine) *ApprovalHandler {
	return &ApprovalHandler{holdEngine: holdEngine}
}

// SetRepository binds a persistence repository for atomic database resolution.
func (handler *ApprovalHandler) SetRepository(repository ApprovalRepository) {
	handler.repository = repository
}

// SetBroadcaster binds a real-time event broadcaster for lock notification fan-out.
func (handler *ApprovalHandler) SetBroadcaster(broadcaster mcp.EventBroadcaster) {
	handler.broadcaster = broadcaster
}

// SetLockManager binds an optional distributed lock manager (e.g. RedisHoldAdapter).
func (handler *ApprovalHandler) SetLockManager(lockManager LockManager) {
	handler.lockManager = lockManager
}

// SetWakeDispatcher binds an outbound bridge dispatcher for waking sleeping agents on late approvals.
func (handler *ApprovalHandler) SetWakeDispatcher(wakeDispatcher ApprovalWakeDispatcher) {
	handler.wakeDispatcher = wakeDispatcher
}

// ApprovalClaimPayload defines the request body for locking an approval while authoring an answer.
type ApprovalClaimPayload struct {
	ApprovalID  string `json:"approval_id"`
	WorkspaceID string `json:"workspace_id"`
}

// Claim attempts to acquire an exclusive lock on a pending question to prevent teammate double-replies.
func (handler *ApprovalHandler) Claim(writer http.ResponseWriter, request *http.Request) {
	var payload ApprovalClaimPayload
	if decodeError := json.NewDecoder(request.Body).Decode(&payload); decodeError != nil || payload.ApprovalID == "" {
		response.Error(writer, http.StatusBadRequest, "invalid request payload")
		return
	}

	operatorIdentifier := middleware.GetUserID(request.Context())
	if operatorIdentifier == "" {
		operatorIdentifier = "anonymous-operator"
	}
	operatorName := middleware.GetUserName(request.Context())
	if operatorName == "" {
		operatorName = operatorIdentifier
	}

	if handler.lockManager != nil {
		acquired, lockError := handler.lockManager.TryClaimLock(request.Context(), payload.ApprovalID, operatorIdentifier, 45*time.Second)
		if lockError != nil {
			response.Error(writer, http.StatusInternalServerError, "failed to acquire distributed lock")
			return
		}
		if !acquired {
			response.Error(writer, http.StatusConflict, "approval request is currently locked by another operator")
			return
		}
	}

	claimError := handler.holdEngine.Claim(payload.ApprovalID, operatorIdentifier)
	if claimError != nil && claimError != mcp.ErrApprovalNotFound {
		if claimError == mcp.ErrAlreadyClaimed {
			response.Error(writer, http.StatusConflict, "approval request is currently locked by another operator")
			return
		}
		response.Error(writer, http.StatusNotFound, claimError.Error())
		return
	}

	if handler.broadcaster != nil && payload.WorkspaceID != "" {
		handler.broadcaster.Broadcast(payload.WorkspaceID, "QUESTION_LOCKED", map[string]string{
			"approval_id": payload.ApprovalID,
			"user_id":     operatorIdentifier,
			"user_name":   operatorName,
		})
	}

	response.JSON(writer, http.StatusOK, map[string]interface{}{
		"status":      "claimed",
		"approval_id": payload.ApprovalID,
		"operator_id": operatorIdentifier,
	})
}

// ReleaseClaim clears an operator's edit lock if they cancel or dismiss the review drawer.
func (handler *ApprovalHandler) ReleaseClaim(writer http.ResponseWriter, request *http.Request) {
	var payload ApprovalClaimPayload
	if decodeError := json.NewDecoder(request.Body).Decode(&payload); decodeError != nil || payload.ApprovalID == "" {
		response.Error(writer, http.StatusBadRequest, "invalid request payload")
		return
	}

	operatorIdentifier := middleware.GetUserID(request.Context())
	if operatorIdentifier == "" {
		operatorIdentifier = "anonymous-operator"
	}

	if handler.lockManager != nil {
		_ = handler.lockManager.ReleaseClaimLock(request.Context(), payload.ApprovalID, operatorIdentifier)
	}

	_ = handler.holdEngine.ReleaseClaim(payload.ApprovalID, operatorIdentifier)

	if handler.broadcaster != nil && payload.WorkspaceID != "" {
		handler.broadcaster.Broadcast(payload.WorkspaceID, "QUESTION_UNLOCKED", map[string]string{
			"approval_id": payload.ApprovalID,
			"user_id":     operatorIdentifier,
		})
	}

	response.JSON(writer, http.StatusOK, map[string]interface{}{
		"status":      "released",
		"approval_id": payload.ApprovalID,
	})
}

// ApprovalResolvePayload defines the request body for human operator approval decisions.
type ApprovalResolvePayload struct {
	ApprovalID string `json:"approval_id"`
	Approved   bool   `json:"approved"`
	Answer     string `json:"answer"`
}

// ApprovalResolveResponse encapsulates the resolution status and applied decision.
type ApprovalResolveResponse struct {
	Status     string             `json:"status"`
	ApprovalID string             `json:"approval_id"`
	Decision   mcp.DecisionResult `json:"decision"`
}

// Resolve applies the human operator's choice to a pending approval and unblocks the agent.
func (handler *ApprovalHandler) Resolve(writer http.ResponseWriter, request *http.Request) {
	var payload ApprovalResolvePayload
	if decodeError := json.NewDecoder(request.Body).Decode(&payload); decodeError != nil {
		response.Error(writer, http.StatusBadRequest, "invalid request payload")
		return
	}

	operatorIdentifier := middleware.GetUserID(request.Context())
	if operatorIdentifier == "" {
		operatorIdentifier = "anonymous-operator"
	}

	decision := mcp.DecisionResult{
		Approved:   payload.Approved,
		Answer:     payload.Answer,
		OperatorID: operatorIdentifier,
		ResolvedAt: time.Now().UTC(),
	}

	// If database repository is attached, perform atomic database state update first
	var resolvedApproval *domain.ApprovalRequest
	if handler.repository != nil {
		domainDecision := domain.DecisionResult{
			Approved:   decision.Approved,
			Answer:     decision.Answer,
			OperatorID: decision.OperatorID,
			ResolvedAt: decision.ResolvedAt,
		}

		updatedRecord, updateError := handler.repository.ResolveApproval(request.Context(), payload.ApprovalID, domainDecision)
		if updateError != nil {
			response.Error(writer, http.StatusConflict, "approval request already resolved or not found")
			return
		}
		resolvedApproval = updatedRecord
	}

	// Unblock the held in-memory or Redis-backed channel
	if resolveError := handler.holdEngine.Resolve(payload.ApprovalID, decision); resolveError != nil {
		// If already resolved in database or held channel timed out, report status
		if resolveError == mcp.ErrApprovalNotFound && handler.repository != nil {
			// Resolved asynchronously past 45s deadline; wake sleeping agent via bridge
			if handler.wakeDispatcher != nil && resolvedApproval != nil {
				wakePrompt := formatApprovalWakePrompt(resolvedApproval.Question, decision.Approved, decision.Answer)
				_ = handler.wakeDispatcher.WakeAgentByID(request.Context(), resolvedApproval.AgentID, wakePrompt)
			}

			response.JSON(writer, http.StatusOK, ApprovalResolveResponse{
				Status:     "resolved_asynchronously",
				ApprovalID: payload.ApprovalID,
				Decision:   decision,
			})
			return
		}
		response.Error(writer, http.StatusGone, resolveError.Error())
		return
	}

	response.JSON(writer, http.StatusOK, ApprovalResolveResponse{
		Status:     "resolved",
		ApprovalID: payload.ApprovalID,
		Decision:   decision,
	})
}

func formatApprovalWakePrompt(questionText string, isApproved bool, answerText string) string {
	verdict := "approved"
	if !isApproved {
		verdict = "rejected"
	}
	return fmt.Sprintf("Human operator %s your request (%q). Decision: %s", verdict, questionText, answerText)
}

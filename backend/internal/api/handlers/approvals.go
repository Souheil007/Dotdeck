// Package handlers provides HTTP REST controllers handling incoming client requests.
package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/Souheil007/Dotdeck/backend/internal/api/middleware"
	"github.com/Souheil007/Dotdeck/backend/internal/mcp"
	"github.com/Souheil007/Dotdeck/backend/pkg/response"
)

// ApprovalHandler processes human-in-the-loop decisions submitted from the visual canvas.
type ApprovalHandler struct {
	holdEngine *mcp.HoldEngine
}

// NewApprovalHandler constructs an approval decision controller.
func NewApprovalHandler(holdEngine *mcp.HoldEngine) *ApprovalHandler {
	return &ApprovalHandler{holdEngine: holdEngine}
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

	if resolveError := handler.holdEngine.Resolve(payload.ApprovalID, decision); resolveError != nil {
		response.Error(writer, http.StatusGone, resolveError.Error())
		return
	}

	response.JSON(writer, http.StatusOK, ApprovalResolveResponse{
		Status:     "resolved",
		ApprovalID: payload.ApprovalID,
		Decision:   decision,
	})
}

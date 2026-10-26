package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/Souheil007/Dotdeck/backend/internal/api/middleware"
	"github.com/Souheil007/Dotdeck/backend/internal/mcp"
)

// ApprovalHandler processes human-in-the-loop decisions submitted from the visual canvas.
type ApprovalHandler struct {
	holdEngine *mcp.HoldEngine
}

// NewApprovalHandler constructs an approval decision controller.
func NewApprovalHandler(holdEngine *mcp.HoldEngine) *ApprovalHandler {
	return &ApprovalHandler{holdEngine: holdEngine}
}

// Resolve applies the human operator's choice to a pending approval and unblocks the agent.
func (h *ApprovalHandler) Resolve(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ApprovalID string `json:"approval_id"`
		Approved   bool   `json:"approved"`
		Answer     string `json:"answer"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	operatorID := middleware.GetUserID(r.Context())
	if operatorID == "" {
		operatorID = "anonymous-operator"
	}

	decision := mcp.DecisionResult{
		Approved:   body.Approved,
		Answer:     body.Answer,
		OperatorID: operatorID,
		ResolvedAt: time.Now().UTC(),
	}

	if err := h.holdEngine.Resolve(body.ApprovalID, decision); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusGone)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":      "resolved",
		"approval_id": body.ApprovalID,
		"decision":    decision,
	})
}

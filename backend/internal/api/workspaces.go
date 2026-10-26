// Package api provides HTTP REST routing and request handlers for the Dotdeck platform.
package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// Workspace models a shared collaborative board containing agents and edges.
type Workspace struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	CreatedAt time.Time `json:"created_at"`
}

// WorkspaceMember represents an assigned human collaborator and their permission role.
type WorkspaceMember struct {
	ID          string    `json:"id"`
	WorkspaceID string    `json:"workspace_id"`
	UserID      string    `json:"user_id"`
	Email       string    `json:"email"`
	Role        string    `json:"role"`
	CreatedAt   time.Time `json:"created_at"`
}

// WorkspaceHandler manages workspace creation, members, and sharing invitations.
type WorkspaceHandler struct{}

// NewWorkspaceHandler constructs a new HTTP controller for workspace operations.
func NewWorkspaceHandler() *WorkspaceHandler {
	return &WorkspaceHandler{}
}

// Create handles requests to initialize a new workspace for collaborative agent boards.
func (h *WorkspaceHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	ws := Workspace{
		ID:        uuid.New().String(),
		Name:      body.Name,
		Slug:      body.Slug,
		CreatedAt: time.Now().UTC(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(ws)
}

// Invite adds or updates an invited teammate's role within the target workspace.
func (h *WorkspaceHandler) Invite(w http.ResponseWriter, r *http.Request) {
	var body struct {
		WorkspaceID string `json:"workspace_id"`
		Email       string `json:"email"`
		Role        string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	member := WorkspaceMember{
		ID:          uuid.New().String(),
		WorkspaceID: body.WorkspaceID,
		UserID:      uuid.New().String(),
		Email:       body.Email,
		Role:        body.Role,
		CreatedAt:   time.Now().UTC(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(member)
}

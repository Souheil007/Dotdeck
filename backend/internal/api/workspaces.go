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
func (handler *WorkspaceHandler) Create(writer http.ResponseWriter, request *http.Request) {
	var body struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}
	if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
		http.Error(writer, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	ws := Workspace{
		ID:        uuid.New().String(),
		Name:      body.Name,
		Slug:      body.Slug,
		CreatedAt: time.Now().UTC(),
	}

	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(http.StatusCreated)
	json.NewEncoder(writer).Encode(ws)
}

// Invite adds or updates an invited teammate's role within the target workspace.
func (handler *WorkspaceHandler) Invite(writer http.ResponseWriter, request *http.Request) {
	var body struct {
		WorkspaceID string `json:"workspace_id"`
		Email       string `json:"email"`
		Role        string `json:"role"`
	}
	if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
		http.Error(writer, `{"error":"invalid request payload"}`, http.StatusBadRequest)
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

	writer.Header().Set("Content-Type", "application/json")
	json.NewEncoder(writer).Encode(member)
}

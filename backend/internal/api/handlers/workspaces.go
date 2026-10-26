// Package handlers provides HTTP REST controllers handling incoming client requests.
package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/Souheil007/Dotdeck/backend/internal/domain"
	"github.com/Souheil007/Dotdeck/backend/pkg/response"
)

// WorkspaceHandler manages workspace creation, members, and sharing invitations.
type WorkspaceHandler struct{}

// NewWorkspaceHandler constructs a new HTTP controller for workspace operations.
func NewWorkspaceHandler() *WorkspaceHandler {
	return &WorkspaceHandler{}
}

// Create handles requests to initialize a new workspace for collaborative agent boards.
func (handler *WorkspaceHandler) Create(writer http.ResponseWriter, request *http.Request) {
	var requestBody struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}
	if decodeError := json.NewDecoder(request.Body).Decode(&requestBody); decodeError != nil {
		response.Error(writer, http.StatusBadRequest, "invalid request payload")
		return
	}

	workspace := domain.Workspace{
		ID:        uuid.New().String(),
		Name:      requestBody.Name,
		Slug:      requestBody.Slug,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	response.JSON(writer, http.StatusCreated, workspace)
}

// Invite adds or updates an invited teammate's role within the target workspace.
func (handler *WorkspaceHandler) Invite(writer http.ResponseWriter, request *http.Request) {
	var requestBody struct {
		WorkspaceID string      `json:"workspace_id"`
		Email       string      `json:"email"`
		Role        domain.Role `json:"role"`
	}
	if decodeError := json.NewDecoder(request.Body).Decode(&requestBody); decodeError != nil {
		response.Error(writer, http.StatusBadRequest, "invalid request payload")
		return
	}

	member := domain.WorkspaceMember{
		ID:          uuid.New().String(),
		WorkspaceID: requestBody.WorkspaceID,
		UserID:      uuid.New().String(),
		Email:       requestBody.Email,
		Role:        requestBody.Role,
		CreatedAt:   time.Now().UTC(),
	}

	response.JSON(writer, http.StatusOK, member)
}

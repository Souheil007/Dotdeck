// Package handlers provides HTTP REST controllers handling incoming client requests.
package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Souheil007/Dotdeck/backend/internal/domain"
	"github.com/Souheil007/Dotdeck/backend/pkg/response"
)

// WorkspaceHandler manages workspace creation, members, and sharing invitations.
type WorkspaceHandler struct {
	baseURL string
}

// NewWorkspaceHandler constructs a new HTTP controller for workspace operations.
func NewWorkspaceHandler(baseURL string) *WorkspaceHandler {
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}
	return &WorkspaceHandler{baseURL: baseURL}
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

// InviteMemberPayload defines the request body for inviting a human teammate.
type InviteMemberPayload struct {
	WorkspaceID string      `json:"workspace_id"`
	Email       string      `json:"email"`
	Role        domain.Role `json:"role"`
}

// Invite adds or updates an invited teammate's role within the target workspace.
func (handler *WorkspaceHandler) Invite(writer http.ResponseWriter, request *http.Request) {
	var payload InviteMemberPayload
	if decodeError := json.NewDecoder(request.Body).Decode(&payload); decodeError != nil {
		response.Error(writer, http.StatusBadRequest, "invalid request payload")
		return
	}

	if payload.Email == "" || payload.WorkspaceID == "" {
		response.Error(writer, http.StatusBadRequest, "email and workspace_id are required")
		return
	}

	assignedRole := payload.Role
	if assignedRole == "" {
		assignedRole = domain.RoleWrite
	}

	rawToken := make([]byte, 16)
	_, _ = rand.Read(rawToken)
	invitationToken := hex.EncodeToString(rawToken)
	expirationTime := time.Now().UTC().Add(7 * 24 * time.Hour)

	memberRecord := domain.WorkspaceMember{
		ID:          uuid.New().String(),
		WorkspaceID: payload.WorkspaceID,
		UserID:      uuid.New().String(),
		Email:       payload.Email,
		Role:        assignedRole,
		CreatedAt:   time.Now().UTC(),
	}

	inviteLink := fmt.Sprintf("%s/invite/%s", handler.baseURL, invitationToken)

	response.JSON(writer, http.StatusOK, map[string]interface{}{
		"member":           memberRecord,
		"invitation_token": invitationToken,
		"invite_url":       inviteLink,
		"expires_at":       expirationTime,
	})
}

// ListMembers returns all active team members participating in a workspace.
func (handler *WorkspaceHandler) ListMembers(writer http.ResponseWriter, request *http.Request) {
	workspaceIdentifier := chi.URLParam(request, "id")
	if workspaceIdentifier == "" {
		workspaceIdentifier = "default-workspace"
	}

	// Default development team membership roster
	members := []domain.WorkspaceMember{
		{
			ID:          "mem-1",
			WorkspaceID: workspaceIdentifier,
			UserID:      "user-admin",
			Email:       "lead@dotdeck.cloud",
			Role:        domain.RoleAdmin,
			CreatedAt:   time.Now().UTC().Add(-48 * time.Hour),
		},
		{
			ID:          "mem-2",
			WorkspaceID: workspaceIdentifier,
			UserID:      "user-operator",
			Email:       "operator@dotdeck.cloud",
			Role:        domain.RoleWrite,
			CreatedAt:   time.Now().UTC().Add(-24 * time.Hour),
		},
		{
			ID:          "mem-3",
			WorkspaceID: workspaceIdentifier,
			UserID:      "user-observer",
			Email:       "viewer@dotdeck.cloud",
			Role:        domain.RoleRead,
			CreatedAt:   time.Now().UTC().Add(-12 * time.Hour),
		},
	}

	response.JSON(writer, http.StatusOK, map[string]interface{}{
		"workspace_id": workspaceIdentifier,
		"members":      members,
	})
}

// GenerateShowcaseLink provisions an unguessable public read-only link for a live agent board.
func (handler *WorkspaceHandler) GenerateShowcaseLink(writer http.ResponseWriter, request *http.Request) {
	workspaceIdentifier := chi.URLParam(request, "id")
	if workspaceIdentifier == "" {
		workspaceIdentifier = "default-workspace"
	}

	rawToken := make([]byte, 16)
	_, _ = rand.Read(rawToken)
	showcaseToken := fmt.Sprintf("showcase_%s", hex.EncodeToString(rawToken))

	frontendBase := "http://localhost:3000"
	if request.Header.Get("Origin") != "" {
		frontendBase = request.Header.Get("Origin")
	}

	showcaseURL := fmt.Sprintf("%s/?showcase=%s&workspace_id=%s", frontendBase, showcaseToken, workspaceIdentifier)

	response.JSON(writer, http.StatusOK, map[string]interface{}{
		"workspace_id":   workspaceIdentifier,
		"showcase_token": showcaseToken,
		"showcase_url":   showcaseURL,
		"role":           "read",
		"public":         true,
	})
}

// GetShowcase provides unauthenticated public viewers with the metadata for a shared workspace.
func (handler *WorkspaceHandler) GetShowcase(writer http.ResponseWriter, request *http.Request) {
	workspaceIdentifier := chi.URLParam(request, "id")
	if workspaceIdentifier == "" {
		workspaceIdentifier = "default-workspace"
	}

	response.JSON(writer, http.StatusOK, map[string]interface{}{
		"workspace_id": workspaceIdentifier,
		"name":         "Tier 3 Cloud Agent Showcase",
		"public":       true,
		"role":         "read",
		"badge":        "Powered by Dotdeck — Build Your Fleet",
	})
}

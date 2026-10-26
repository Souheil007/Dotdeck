package domain

import (
	"time"
)

// Role defines the authorization tier of an operator within a workspace.
type Role string

const (
	// RoleAdmin grants full mutation, invitation, integration, and deletion rights.
	RoleAdmin Role = "admin"

	// RoleWrite grants operational rights: create agents, wire edges, answer approvals, and chat.
	RoleWrite Role = "write"

	// RoleRead grants read-only observation rights without action capability.
	RoleRead Role = "read"
)

// Workspace models a shared collaborative board containing agents and edges.
type Workspace struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// WorkspaceMember represents an assigned human collaborator and their permission role.
type WorkspaceMember struct {
	ID          string    `json:"id"`
	WorkspaceID string    `json:"workspace_id"`
	UserID      string    `json:"user_id"`
	Email       string    `json:"email"`
	Role        Role      `json:"role"`
	CreatedAt   time.Time `json:"created_at"`
}

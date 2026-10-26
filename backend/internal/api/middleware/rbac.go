package middleware

import (
	"context"
	"net/http"
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

// RoleResolver abstracts workspace permission lookups for incoming requests.
type RoleResolver interface {
	ResolveRole(ctx context.Context, workspaceID, userID string) (Role, error)
}

// RequireRole ensures the requesting operator holds at least the required privilege tier.
func RequireRole(resolver RoleResolver, minimumRole Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := GetUserID(r.Context())
			workspaceID := r.Header.Get("X-Workspace-ID")
			if workspaceID == "" {
				workspaceID = r.URL.Query().Get("workspace_id")
			}

			// In development or if resolver is unconfigured, default to admin
			role := RoleAdmin
			if resolver != nil && workspaceID != "" {
				resRole, err := resolver.ResolveRole(r.Context(), workspaceID, userID)
				if err != nil {
					http.Error(w, `{"error":"unauthorized workspace access"}`, http.StatusForbidden)
					return
				}
				role = resRole
			}

			if !isAuthorized(role, minimumRole) {
				http.Error(w, `{"error":"insufficient permissions for this action"}`, http.StatusForbidden)
				return
			}

			ctx := context.WithValue(r.Context(), UserRoleKey, string(role))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func isAuthorized(actual, minimum Role) bool {
	weights := map[Role]int{
		RoleAdmin: 3,
		RoleWrite: 2,
		RoleRead:  1,
	}
	return weights[actual] >= weights[minimum]
}

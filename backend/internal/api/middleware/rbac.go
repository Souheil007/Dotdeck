// Package middleware provides HTTP middleware for authentication, RBAC authorization,
// and request context population.
package middleware

import (
	"context"
	"net/http"

	"github.com/Souheil007/Dotdeck/backend/pkg/response"
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
	ResolveRole(requestContext context.Context, workspaceID, userID string) (Role, error)
}

// RequireRole ensures the requesting operator holds at least the required privilege tier.
func RequireRole(resolver RoleResolver, minimumRole Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
			userIdentifier := GetUserID(request.Context())
			workspaceIdentifier := request.Header.Get("X-Workspace-ID")
			if workspaceIdentifier == "" {
				workspaceIdentifier = request.URL.Query().Get("workspace_id")
			}

			assignedRole := Role(GetUserRole(request.Context()))
			if assignedRole == "" {
				assignedRole = RoleAdmin
			}

			if resolver != nil && workspaceIdentifier != "" {
				resolvedRole, lookupError := resolver.ResolveRole(request.Context(), workspaceIdentifier, userIdentifier)
				if lookupError != nil {
					response.Error(writer, http.StatusForbidden, "unauthorized workspace access")
					return
				}
				assignedRole = resolvedRole
			}

			if !isAuthorized(assignedRole, minimumRole) {
				response.Error(writer, http.StatusForbidden, "insufficient permissions for this action")
				return
			}

			enrichedContext := context.WithValue(request.Context(), UserRoleKey, string(assignedRole))
			next.ServeHTTP(writer, request.WithContext(enrichedContext))
		})
	}
}

func isAuthorized(actualRole, minimumRole Role) bool {
	weights := map[Role]int{
		RoleAdmin: 3,
		RoleWrite: 2,
		RoleRead:  1,
	}
	return weights[actualRole] >= weights[minimumRole]
}

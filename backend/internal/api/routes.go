// Package api registers REST routes, versioned subrouters, and endpoint handlers for Dotdeck.
package api

import (
	"github.com/go-chi/chi/v5"

	"github.com/Souheil007/Dotdeck/backend/internal/api/handlers"
	"github.com/Souheil007/Dotdeck/backend/internal/api/middleware"
)

// RouterConfig bundles the controllers required to register API endpoints.
type RouterConfig struct {
	WorkspaceHandler *handlers.WorkspaceHandler
	AgentHandler     *handlers.AgentHandler
	ApprovalHandler  *handlers.ApprovalHandler
}

// RegisterRoutes attaches versioned REST API routes and authentication middleware to the provided router.
func RegisterRoutes(rootRouter chi.Router, config RouterConfig) {
	rootRouter.Route("/api/v1", func(apiRouter chi.Router) {
		apiRouter.Use(middleware.Authenticate)

		// Public & Showcase endpoints (accessible without mutation roles)
		apiRouter.Get("/workspaces/{id}/showcase", config.WorkspaceHandler.GetShowcase)
		apiRouter.Post("/workspaces/{id}/showcase-link", config.WorkspaceHandler.GenerateShowcaseLink)

		// Workspace Administration (Admin role required)
		apiRouter.Group(func(adminRouter chi.Router) {
			adminRouter.Use(middleware.RequireRole(nil, middleware.RoleAdmin))
			adminRouter.Post("/workspaces", config.WorkspaceHandler.Create)
			adminRouter.Post("/workspaces/invite", config.WorkspaceHandler.Invite)
			adminRouter.Get("/workspaces/{id}/members", config.WorkspaceHandler.ListMembers)
		})

		// Operations & Agent Orchestration (Write role required)
		apiRouter.Group(func(writeRouter chi.Router) {
			writeRouter.Use(middleware.RequireRole(nil, middleware.RoleWrite))
			writeRouter.Post("/agents", config.AgentHandler.Create)
			writeRouter.Post("/agents/edges", config.AgentHandler.ConnectEdge)
			writeRouter.Post("/agents/{id}/steer", config.AgentHandler.Steer)
			writeRouter.Post("/approvals/claim", config.ApprovalHandler.Claim)
			writeRouter.Post("/approvals/release-claim", config.ApprovalHandler.ReleaseClaim)
			writeRouter.Post("/approvals/resolve", config.ApprovalHandler.Resolve)
		})
	})
}

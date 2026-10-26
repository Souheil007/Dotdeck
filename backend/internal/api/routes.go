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

		// Workspace management routes
		apiRouter.Post("/workspaces", config.WorkspaceHandler.Create)
		apiRouter.Post("/workspaces/invite", config.WorkspaceHandler.Invite)

		// Agent provisioning and canvas graph wiring routes
		apiRouter.Post("/agents", config.AgentHandler.Create)
		apiRouter.Post("/agents/edges", config.AgentHandler.ConnectEdge)

		// Human-in-the-loop approval decision routes
		apiRouter.Post("/approvals/resolve", config.ApprovalHandler.Resolve)
	})
}

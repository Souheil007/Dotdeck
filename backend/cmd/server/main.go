// Package main serves as the primary runtime entrypoint for the Dotdeck
// agent orchestration switchboard.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/Souheil007/Dotdeck/backend/internal/api"
	"github.com/Souheil007/Dotdeck/backend/internal/api/middleware"
	"github.com/Souheil007/Dotdeck/backend/internal/mcp"
	"github.com/Souheil007/Dotdeck/backend/internal/observability"
	"github.com/Souheil007/Dotdeck/backend/internal/store"
	"github.com/Souheil007/Dotdeck/backend/internal/ws"
)

func main() {
	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "development"
	}

	logger := observability.InitLogger(env)
	slog.SetDefault(logger)

	// Initialize Observability subsystem (Prometheus, OTel, Sentry)
	observability.InitMetrics()
	_, tracerCleanup := observability.InitTracer()
	sentryCleanup := observability.InitSentry(os.Getenv("SENTRY_DSN"), env)
	defer sentryCleanup()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	baseURL := os.Getenv("APP_BASE_URL")
	if baseURL == "" {
		baseURL = fmt.Sprintf("http://localhost:%s", port)
	}

	// Initialize core engine components
	memStore := store.NewMemoryStore()
	holdEngine := mcp.NewHoldEngine()
	wsHub := ws.NewHub()
	go wsHub.Run()

	mcpServer := mcp.NewServer(memStore, holdEngine, wsHub)
	workspaceHandler := api.NewWorkspaceHandler()
	agentHandler := api.NewAgentHandler(baseURL)
	approvalHandler := api.NewApprovalHandler(holdEngine)

	r := chi.NewRouter()

	// Global HTTP middleware
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Workspace-ID", "X-User-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"healthy","service":"dotdeck-switchboard"}`))
	})

	// Prometheus Metrics Endpoint
	r.Handle("/metrics", observability.Handler())

	// MCP Multi-Tenant Endpoint (/mcp/{token})
	r.Mount("/mcp", http.StripPrefix("/mcp", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.URL.Path = "/mcp" + r.URL.Path
		mcpServer.ServeHTTP(w, r)
	})))

	// Real-Time Multiplayer WebSocket Endpoint
	r.Get("/ws", func(w http.ResponseWriter, r *http.Request) {
		userID := r.URL.Query().Get("user_id")
		userName := r.URL.Query().Get("user_name")
		workspaceID := r.URL.Query().Get("workspace_id")
		role := r.URL.Query().Get("role")

		if userID == "" {
			userID = "dev-user"
		}
		if userName == "" {
			userName = "Alex"
		}
		if workspaceID == "" {
			workspaceID = "default-workspace"
		}
		if role == "" {
			role = "write"
		}

		wsHub.ServeWebSocket(w, r, userID, userName, role, workspaceID)
	})

	// REST API v1
	r.Route("/api/v1", func(apiRouter chi.Router) {
		apiRouter.Use(middleware.Authenticate)

		// Workspaces
		apiRouter.Post("/workspaces", workspaceHandler.Create)
		apiRouter.Post("/workspaces/invite", workspaceHandler.Invite)

		// Agents & Canvas Edges
		apiRouter.Post("/agents", agentHandler.Create)
		apiRouter.Post("/agents/edges", agentHandler.ConnectEdge)

		// Human Approvals
		apiRouter.Post("/approvals/resolve", approvalHandler.Resolve)
	})

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		slog.Info("Dotdeck switchboard listening", "port", port, "url", baseURL)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("Shutting down Dotdeck server gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	defer tracerCleanup(ctx)

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("forced server shutdown", "error", err)
	}
	slog.Info("Server stopped cleanly")
}

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
	"github.com/Souheil007/Dotdeck/backend/internal/api/handlers"
	"github.com/Souheil007/Dotdeck/backend/internal/mcp"
	"github.com/Souheil007/Dotdeck/backend/internal/observability"
	"github.com/Souheil007/Dotdeck/backend/internal/store"
	"github.com/Souheil007/Dotdeck/backend/internal/websocket"
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
	websocketHub := websocket.NewHub()
	go websocketHub.Run()

	mcpServer := mcp.NewServer(memStore, holdEngine, websocketHub)
	workspaceHandler := handlers.NewWorkspaceHandler()
	agentHandler := handlers.NewAgentHandler(baseURL)
	approvalHandler := handlers.NewApprovalHandler(holdEngine)

	router := chi.NewRouter()

	// Global HTTP middleware
	router.Use(chimiddleware.RequestID)
	router.Use(chimiddleware.RealIP)
	router.Use(chimiddleware.Logger)
	router.Use(chimiddleware.Recoverer)
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Workspace-ID", "X-User-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	router.Get("/health", func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		writer.Write([]byte(`{"status":"healthy","service":"dotdeck-switchboard"}`))
	})

	// Prometheus Metrics Endpoint
	router.Handle("/metrics", observability.Handler())

	// MCP Multi-Tenant Endpoint (/mcp/{token})
	router.Mount("/mcp", http.StripPrefix("/mcp", http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		request.URL.Path = "/mcp" + request.URL.Path
		mcpServer.ServeHTTP(writer, request)
	})))

	// Real-Time Multiplayer WebSocket Endpoint
	router.Get("/ws", func(writer http.ResponseWriter, request *http.Request) {
		userID := request.URL.Query().Get("user_id")
		userName := request.URL.Query().Get("user_name")
		workspaceID := request.URL.Query().Get("workspace_id")
		role := request.URL.Query().Get("role")

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

		websocketHub.ServeWebSocket(writer, request, userID, userName, role, workspaceID)
	})

	// Register versioned REST API routes
	api.RegisterRoutes(router, api.RouterConfig{
		WorkspaceHandler: workspaceHandler,
		AgentHandler:     agentHandler,
		ApprovalHandler:  approvalHandler,
	})

	serverInstance := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		slog.Info("Dotdeck switchboard listening", "port", port, "url", baseURL)
		if serveError := serverInstance.ListenAndServe(); serveError != nil && serveError != http.ErrServerClosed {
			slog.Error("server failed", "error", serveError)
			os.Exit(1)
		}
	}()

	quitSignal := make(chan os.Signal, 1)
	signal.Notify(quitSignal, syscall.SIGINT, syscall.SIGTERM)
	<-quitSignal

	slog.Info("Shutting down Dotdeck server gracefully...")
	shutdownContext, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()
	defer tracerCleanup(shutdownContext)

	if shutdownError := serverInstance.Shutdown(shutdownContext); shutdownError != nil {
		slog.Error("forced server shutdown", "error", shutdownError)
	}
	slog.Info("Server stopped cleanly")
}

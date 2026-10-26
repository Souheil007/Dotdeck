// Package observability provides structured logging, Prometheus metrics,
// OpenTelemetry distributed tracing, and Sentry error tracking for the Dotdeck switchboard.
package observability

import (
	"context"
	"log/slog"
	"os"
)

type logContextKey string

const (
	// TraceIDKey identifies the distributed tracing correlation ID.
	TraceIDKey logContextKey = "trace_id"

	// WorkspaceIDKey identifies the tenant workspace ID in log events.
	WorkspaceIDKey logContextKey = "workspace_id"

	// AgentIDKey identifies the target cloud agent ID in log events.
	AgentIDKey logContextKey = "agent_id"
)

// InitLogger configures the global slog logger with JSON formatting in production
// and colorized, human-readable text output in local development.
func InitLogger(env string) *slog.Logger {
	var handler slog.Handler
	opts := &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}

	if env == "production" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	logger := slog.New(handler)
	slog.SetDefault(logger)
	return logger
}

// WithContext returns a contextual logger enriched with workspace, agent, and trace IDs.
func WithContext(ctx context.Context) *slog.Logger {
	logger := slog.Default()
	if traceID, ok := ctx.Value(TraceIDKey).(string); ok && traceID != "" {
		logger = logger.With("trace_id", traceID)
	}
	if workspaceID, ok := ctx.Value(WorkspaceIDKey).(string); ok && workspaceID != "" {
		logger = logger.With("workspace_id", workspaceID)
	}
	if agentID, ok := ctx.Value(AgentIDKey).(string); ok && agentID != "" {
		logger = logger.With("agent_id", agentID)
	}
	return logger
}

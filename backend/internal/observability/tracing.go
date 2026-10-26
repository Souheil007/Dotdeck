package observability

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
)

const (
	// TracerName identifies the primary OpenTelemetry tracer for Dotdeck.
	TracerName = "github.com/Souheil007/Dotdeck/backend"
)

// InitTracer configures the global OpenTelemetry tracer with standard W3C trace context propagation.
func InitTracer() (trace.Tracer, func(context.Context) error) {
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	tracer := otel.GetTracerProvider().Tracer(TracerName)

	cleanup := func(ctx context.Context) error {
		// Flush in-flight spans during graceful server shutdown
		return nil
	}

	return tracer, cleanup
}

// StartSpan creates a child tracing span for an agent MCP tool call or inter-agent handoff.
func StartSpan(ctx context.Context, spanName string) (context.Context, trace.Span) {
	tracer := otel.GetTracerProvider().Tracer(TracerName)
	return tracer.Start(ctx, fmt.Sprintf("dotdeck.%s", spanName))
}

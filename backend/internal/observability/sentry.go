package observability

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
)

// InitSentry initializes crash reporting and unhandled panic alerting.
//
// If dsn is empty, Sentry remains disabled in development mode without error.
func InitSentry(dsn, env string) func() {
	if dsn == "" {
		return func() {}
	}

	err := sentry.Init(sentry.ClientOptions{
		Dsn:              dsn,
		Environment:      env,
		TracesSampleRate: 0.2,
		AttachStacktrace: true,
	})
	if err != nil {
		slog.Warn("Failed to initialize Sentry error reporting", "error", err)
		return func() {}
	}

	return func() {
		sentry.Flush(2 * time.Second)
	}
}

// SentryMiddleware returns an HTTP middleware wrapping request handlers to capture panics.
func SentryMiddleware() func(http.Handler) http.Handler {
	sentryHandler := sentryhttp.New(sentryhttp.Options{
		Repanic: true,
	})
	return sentryHandler.Handle
}

// CaptureError sends a non-fatal error event to Sentry with attached context attributes.
func CaptureError(err error, tags map[string]string) {
	if err == nil {
		return
	}
	sentry.WithScope(func(scope *sentry.Scope) {
		for k, v := range tags {
			scope.SetTag(k, v)
		}
		sentry.CaptureException(err)
	})
}

package observability

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// TestMetricsHandler verifies that the Prometheus metrics endpoint responds with HTTP 200
// and exposes Dotdeck custom metric names.
func TestMetricsHandler(testingT *testing.T) {
	metrics := InitMetrics()
	metrics.HeldApprovalsActive.WithLabelValues("ws-test").Set(3)
	metrics.WSConnectedClients.WithLabelValues("ws-test").Set(5)

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rec := httptest.NewRecorder()

	Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		testingT.Fatalf("expected HTTP 200 from /metrics, got %d", rec.Code)
	}

	body := rec.Body.String()
	if !strings.Contains(body, "dotdeck_active_held_approvals") {
		testingT.Errorf("expected metric 'dotdeck_active_held_approvals' in output")
	}
	if !strings.Contains(body, "dotdeck_ws_connected_clients") {
		testingT.Errorf("expected metric 'dotdeck_ws_connected_clients' in output")
	}
}

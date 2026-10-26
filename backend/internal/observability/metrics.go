package observability

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Metrics maintains application-level Prometheus metric collectors.
type Metrics struct {
	MCPRequestsTotal       *prometheus.CounterVec
	HeldApprovalsActive    *prometheus.GaugeVec
	ApprovalHoldDuration   *prometheus.HistogramVec
	WSConnectedClients     *prometheus.GaugeVec
	RunawayLoopBlocksTotal *prometheus.CounterVec
}

var (
	defaultMetrics *Metrics
)

// InitMetrics registers all custom Prometheus metrics into the default registry.
func InitMetrics() *Metrics {
	if defaultMetrics != nil {
		return defaultMetrics
	}

	defaultMetrics = &Metrics{
		MCPRequestsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "dotdeck_mcp_requests_total",
				Help: "Total count of incoming MCP JSON-RPC tool calls from cloud agents.",
			},
			[]string{"provider", "method", "tool"},
		),
		HeldApprovalsActive: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "dotdeck_active_held_approvals",
				Help: "Current count of agent tool calls paused awaiting human operator decisions.",
			},
			[]string{"workspace_id"},
		),
		ApprovalHoldDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "dotdeck_approval_hold_duration_seconds",
				Help:    "Latency in seconds from agent tool pause until human operator resolution.",
				Buckets: []float64{1, 5, 10, 20, 30, 45, 60, 120, 300},
			},
			[]string{"workspace_id", "outcome"},
		),
		WSConnectedClients: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "dotdeck_ws_connected_clients",
				Help: "Number of active real-time WebSocket clients connected to a workspace board.",
			},
			[]string{"workspace_id"},
		),
		RunawayLoopBlocksTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "dotdeck_runaway_loop_blocks_total",
				Help: "Total count of inter-agent messages blocked by the cyclic loop firewall.",
			},
			[]string{"workspace_id", "source_agent"},
		),
	}

	return defaultMetrics
}

// GetMetrics returns the global metric registry instance.
func GetMetrics() *Metrics {
	if defaultMetrics == nil {
		return InitMetrics()
	}
	return defaultMetrics
}

// Handler returns an HTTP handler serving Prometheus format metrics at /metrics.
func Handler() http.Handler {
	return promhttp.Handler()
}

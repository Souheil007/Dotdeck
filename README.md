# Dotdeck

> **Cross-Vendor Agent Orchestration & Command Hub**  
> Visual topology map, real-time thought inspector, and multiplayer control plane for Tier 3 closed cloud agents (OpenAI Dots, Grok Bots, Meta Muse, Claude Cloud Agents).

---

## Architecture Overview

Dotdeck operates as the vendor-neutral switchboard above proprietary cloud AI agents:

```
 [ OpenAI Dot ]                [ Grok Bot ]                 [ Meta Muse ]
 (Cloud Computer)              (Cloud Computer)             (Muse Secure VM)
       │                             │                            │
       └──────────────┬──────────────┴──────────────┬─────────────┘
                      │  Outbound: MCP Tool Calls (Thoughts, Questions, Handoffs)
                      │  Inbound: Held Responses (45s Channels) & Wake-up Triggers
                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      GO BACKEND (THE SWITCHBOARD)                        │
│                                                                          │
│  ┌──────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │ Multi-Tenant MCP Hub │  │ Agent-to-Agent     │  │ Hold Engine      │  │
│  │ (/mcp/{agent_token}) │  │ Mailbox Router     │  │ (45s Paused Tool)│  │
│  └──────────┬───────────┘  └─────────┬──────────┘  └────────┬─────────┘  │
│             └────────────────────────┼──────────────────────┘            │
│                                      ▼                                   │
│                        WebSocket Event Broadcaster                       │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   VISUALIZER FRONTEND (React Flow)                       │
│  • Visual Node Graph (Live edges & animated packet flow)                 │
│  • State Badges: [Resting] [Working] [Scheduled] [Blocked on Human]      │
│  • Slide-Out Inspector: Live Thought Ticker, Chat & Human Approvals      │
│  • Multi-user presence cursors & optimistic locking                      │
└──────────────────────────────────────────────────────────────────────────┘
```

Detailed architecture specifications and design rationale are available in [docs/architecture/overview.md](docs/architecture/overview.md) and [docs/architecture/tier3-switchboard-concept.md](docs/architecture/tier3-switchboard-concept.md).

---

## Repository Structure

Dotdeck follows a domain-driven, repository-pattern Go layout with strict separation of concerns:

```
Dotdeck/
├── AGENTS.md                         # Agent instructions & workspace context
├── STANDARDS.md                      # Code quality rules, docstring requirements & conventions
├── docker-compose.yml                # Full-stack composition (Postgres, Redis, App, Monitoring)
├── Makefile                          # Development workflow automation
│
├── .agents/rules/                    # Non-negotiable engineering standards
│   ├── coding-standards.md           # Zero single-char variables, Google docstrings, Conventional Commits
│   └── plan-standards.md             # Multi-step plan generation guidelines
│
├── plans/                            # Sequential engineering execution plans (01-10)
│   ├── README.md                     # Roadmap index & dependency graph
│   ├── plan-01-database-persistence-and-migrations.md
│   └── ...
│
├── docs/                             # Architecture specifications & decisions
│   ├── architecture/                 # System topologies & sequence diagrams
│   └── decisions/                    # Architectural Decision Records (ADR 0001-0003)
│
├── deploy/                           # Deployment manifests & monitoring configs
│   └── monitoring/                   # Prometheus config & pre-built Grafana dashboard
│
├── tests/                            # Black-box E2E suites & simulation harnesses
│   ├── fixtures/                     # Mock MCP JSON-RPC payloads
│   └── e2e/agent_simulator.go        # Headless cloud agent simulator
│
├── backend/                          # Go backend switchboard
│   ├── cmd/
│   │   ├── server/main.go            # Primary runtime entrypoint & dependency injection
│   │   └── migrate/main.go           # PostgreSQL schema migration runner CLI
│   ├── internal/
│   │   ├── domain/                   # Pure business entities (Agent, Workspace, Approval, Thought)
│   │   ├── api/                      # REST API routing & subrouters
│   │   │   ├── handlers/             # HTTP controllers (Workspaces, Agents, Approvals)
│   │   │   ├── middleware/           # Context authentication & RBAC policy enforcement
│   │   │   └── routes.go             # API route registration
│   │   ├── mcp/                      # JSON-RPC 2.0 multi-tenant switchboard & HoldEngine
│   │   ├── websocket/                # Real-time WebSocket room broadcaster & presence hub
│   │   ├── bridge/                   # Outbound wake-up bridges (Slack, Webhooks, Email)
│   │   ├── store/                    # Database migrations & sqlc persistence repository
│   │   └── observability/            # slog logging, Prometheus /metrics, OTel tracing & Sentry
│   ├── pkg/
│   │   └── response/                 # Standardized JSON response envelopes
│   ├── test/integration/             # Internal subsystem integration tests
│   ├── go.mod
│   └── sqlc.yaml
│
└── frontend/                         # React 19 + TypeScript visualizer
    ├── src/
    │   ├── components/
    │   │   ├── canvas/               # React Flow visualizer & live pulse edges
    │   │   ├── inspector/            # Slide-out thought stream & approval drawer
    │   │   └── modals/               # Agent pairing wizard & multiplayer sharing
    │   ├── store/                    # Zustand state management
    │   └── hooks/                    # WebSocket & presence hooks
    ├── package.json
    └── tsconfig.json
```

---

## Observability & Monitoring

Dotdeck includes built-in observability for production monitoring:

| Component | Technology | Endpoint / Artifact |
| :--- | :--- | :--- |
| **Structured Logs** | `log/slog` (JSON in prod, Text in dev) | Standard Out / Grafana Loki |
| **Metrics** | Prometheus Go Client | `GET /metrics` |
| **Distributed Tracing** | OpenTelemetry Go SDK | Tempo / Jaeger exporter |
| **Crash & Error Alerts** | Sentry Go SDK | Automatic panic recovery & report |
| **Dashboards** | Grafana | [`deploy/monitoring/grafana-dashboards/dotdeck-overview.json`](deploy/monitoring/grafana-dashboards/dotdeck-overview.json) |

---

## Quick Start

### 1. Prerequisites
- **Go**: 1.25+
- **Node.js**: 20+
- **PostgreSQL**: 16+ (or run via Docker Compose)
- **Redis**: 7+ (optional for pub/sub scaling)

### 2. Full-Stack with Docker Compose
Starts PostgreSQL, Redis, Backend, Frontend, Prometheus, and Grafana:
```bash
docker compose up -d
```
- Frontend UI: `http://localhost:3000`
- Backend API: `http://localhost:8080`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (Credentials: `admin` / `admin`)

### 3. Local Development

#### Backend
```bash
cd backend
go run cmd/server/main.go
```
Run database migrations:
```bash
go run cmd/migrate/main.go -direction=up
```
Run test suite:
```bash
go test -v ./... ./test/integration/...
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Cloud Agent Fleet Simulator
Simulate an end-to-end multi-agent workflow (OpenAI Dot & Grok Bot pairing, real-time reasoning emission, hold-and-resolve human approval, and dynamic peer delegation):
```bash
cd backend
go run test/simulator/main.go
```

---

## Engineering Standards & Plans
- **Coding Standards**: See [STANDARDS.md](STANDARDS.md) and [.agents/rules/coding-standards.md](.agents/rules/coding-standards.md) (Google-style docstrings, zero single-character variable rule, Conventional Commits 1.0.0).
- **Implementation Plans**: See [plans/README.md](plans/README.md) for the 10-phase roadmap from database persistence through production verification.
- **Architectural Decision Records**: See [docs/decisions/](docs/decisions/).

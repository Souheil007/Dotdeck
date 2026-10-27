<div align="center">

# ⚡ DOTDECK

### The Neural Command Hub & Orchestration Switchboard for Tier 3 Closed Cloud Agents

[![Go Version](https://img.shields.io/badge/Go-1.25+-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://golang.org)
[![React Version](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MCP Protocol](https://img.shields.io/badge/MCP-JSON--RPC_2.0-8A2BE2?style=for-the-badge)](https://modelcontextprotocol.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Dotdeck</b> is a vendor-neutral, cross-cloud command switchboard engineered to orchestrate autonomous, closed cloud AI agents (<b>OpenAI Dots</b>, <b>xAI Grok Bots</b>, <b>Meta Muse</b>, and <b>Claude Cloud Agents</b>) within a unified visual canvas, holding approval channels, and real-time multiplayer telemetry.
</p>

[Explore Architecture](#-system-architecture) • [Quick Start](#-quick-start) • [Live Demo Swarms](#-demo-agent-swarms) • [MCP Protocol](#-mcp-switchboard-protocol) • [Engineering Standards](#-engineering-standards)

</div>

---

## 🌌 Why Dotdeck?

The frontier of AI is moving from local models to **Tier 3 closed cloud computers**—isolated VMs running inside vendor clouds (OpenAI, Anthropic, xAI, Meta) that execute autonomously 24/7. However, these systems are locked behind proprietary walled gardens:

- **No Cross-Cloud Communication**: An OpenAI lead-research Dot cannot natively invoke a Grok copywriter bot or hand off tasks to a Claude compliance auditor.
- **Zero Human Safety Gates**: Unsupervised tool execution risks runaway spend, destructive database mutations, or unvetted email blasts.
- **Black-Box Blindspots**: Operators cannot inspect an agent's real-time inner reasoning loop or steer its trajectory without killing the session.

### Enter Dotdeck

Dotdeck provides a **zero-SDK, protocol-native bridge** that treats any closed cloud agent as a node in an intelligent distributed graph:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    TIER 3 CLOUD AGENT SWARM                                   │
│                                                                                               │
│    ┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐       │
│    │  OpenAI Dot VM   │            │   xAI Grok Bot   │            │  Claude Cloud    │       │
│    │ (Lead Discovery) │            │ (Bespoke Copy)   │            │ (Safety & Audit) │       │
│    └─────────┬────────┘            └─────────▲────────┘            └─────────▲────────┘       │
└──────────────┼───────────────────────────────┼───────────────────────────────┼────────────────┘
               │ JSON-RPC 2.0                  │ Synthesized Tool Invocation   │ Policy Audit
               ▼                               │                               │
┌──────────────────────────────────────────────┴───────────────────────────────┴────────────────┐
│                                 DOTDECK ORCHESTRATION KERNEL                                  │
│                                                                                               │
│   ┌──────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────┐    │
│   │ Dynamic MCP Gateway      │    │ Cross-Agent Mailbox      │    │ 45s Hold Engine      │    │
│   │ (/mcp/{agent_token})     │    │ Dynamic Tool Synthesis   │    │ Human Authorization  │    │
│   └────────────┬─────────────┘    └────────────┬─────────────┘    └──────────┬───────────┘    │
│                └───────────────────────────────┼─────────────────────────────┘                │
│                                                ▼                                              │
│                                  WebSocket Room Broadcaster                                   │
└────────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                                 │
                                                 ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  OPERATOR COMMAND CANVAS                                      │
│                                                                                               │
│   • Visual Node Graph (Spatial AgentGrid, Magnetic Snapping, Live Pulse Wires)                │
│   • Multi-Tenant Fleet Topologies: [Working 🟢] [Resting ⚪] [Blocked on Human 🟡]             │
│   • Slide-Out Telemetry Drawer: Real-time Thought Stream, MCP Inspector & Steering Prompt    │
│   • Real-Time Multiplayer: Live Teammate Cursors & Optimistic Collision Resolution            │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Core Capabilities

### 1. Dynamic MCP Switchboard (`/mcp/{agent_token}`)
Agents require **zero proprietary SDKs**. During cloud VM boot, the agent is provided an endpoint:
`https://hub.dotdeck.io/mcp/dot_live_secops_894`
The switchboard dynamically exposes three native tool primitives:
- `emit_thought`: Streams internal chain-of-thought tokens, sub-steps, and execution progress to the command deck.
- `request_human_approval`: Suspends agent execution inside a **45-second held HTTP connection** while alerting human operators.
- `delegate_task_to_{peer}`: Dynamically synthesized whenever an operator draws a connection wire on the canvas between two agents.

### 2. 45-Second Held Approval Engine
When an agent attempts a high-stakes action (e.g. issuing refunds, deploying perimeter firewall rules, firing cold emails):
1. The agent calls `request_human_approval` via MCP.
2. The Go backend **holds the HTTP/SSE request open** in a parked goroutine channel with a 45-second deadline.
3. The visualizer flags the node with a pulsing `Blocked on Operator` alert and sounds an operator chime.
4. If approved via the canvas, the held request unblocks immediately with `{"decision": "approved", "signature": "..."}`.
5. If expired without action, Dotdeck dispatches an outbound wake-up bridge (Slack, Webhook, SMS).

### 3. Visual Swarm Canvas with Smart Rewiring
- **Magnetic Handle Snapping**: 32px connection snap radius with forgiving hit-targets.
- **Bi-Directional Tool Synthesis**: Connecting Agent A $\to$ Agent B generates a callable delegation tool on Agent A.
- **Smart Handle Rewiring**: Re-dragging connection lines updates handles instantly without dropped states or phantom wires.
- **Interactive Wire Inspection**: Click any animated pulse-edge to inspect recent tool handoff payloads or delete the link.

### 4. Real-time Multiplayer Collaboration
- **Live Presence Cursors**: See teammate cursors panning and selecting across the canvas with microsecond latency.
- **Optimistic Approval Locking**: Prevents race conditions—when Operator Alice clicks an approval box, Operator Bob sees it locked with Alice's avatar in real-time.
- **Role-Based Access Control (RBAC)**:
  - 👑 **Admin**: Full swarm management, workspace creation, member provisioning, agent creation.
  - ⚡ **Operator (Write)**: Canvas node manipulation, wire connections, human approvals, steering instructions.
  - 👁️ **Observer (Read)**: Read-only live telemetry, thought monitoring, public showcase audit mode.

### 5. Google White & Google Night Spatial Design
Engineered with an aesthetic inspired by high-end command platforms and **Google Design System** precision:
- **Light Theme**: Pristine Google White (`#FFFFFF` / `#F8F9FA`), soft slate borders (`#E8EAED`), Google Blue (`#1A73E8`) accents.
- **Night Theme**: Deep Google Night (`#07080B` / `#131314` / `#1E1F20`), zinc-900 glassmorphism, cyan & emerald status pulses.
- **Spatial Grid Pattern**: AgentGrid-style isometric canvas grid with smooth zoom, pan, and mini-map navigation.

---

## 🛠️ System Architecture

Dotdeck is built in **Go 1.25** and **React 19 / TypeScript** adhering to strict domain-driven separation of concerns:

```
Dotdeck/
├── backend/                          # High-Performance Go Orchestration Switchboard
│   ├── cmd/
│   │   ├── server/main.go            # HTTP server, DI container & graceful shutdown
│   │   └── migrate/main.go           # PostgreSQL schema migration CLI
│   ├── internal/
│   │   ├── domain/                   # Pure domain models (Agent, Workspace, Approval, Thought)
│   │   ├── api/                      # REST router, Chi middleware, RBAC controllers
│   │   ├── mcp/                      # JSON-RPC 2.0 multi-tenant switchboard & HoldEngine
│   │   ├── websocket/                # Multiplayer hub, presence broadcaster & room router
│   │   ├── bridge/                   # Outbound wake bridges (Slack, Webhooks, Email)
│   │   ├── store/                    # Database migrations, MemoryStore & PostgreSQL sqlc store
│   │   └── observability/            # slog structured logger, Prometheus /metrics & OTel
│   └── test/simulator/main.go        # Headless cloud agent swarm simulator
│
├── frontend/                         # React 19 + TypeScript + Tailwind Visualizer
│   ├── src/
│   │   ├── components/
│   │   │   ├── canvas/               # React Flow canvas, AgentNode cards & PulseEdge wires
│   │   │   ├── inspector/            # ThoughtStream ticker, ApprovalBox & ChatBox steering
│   │   │   ├── modals/               # PairingWizard, CreateAgentModal, ShareModal
│   │   │   └── landing/              # AgentGrid-inspired responsive landing & auth modals
│   │   ├── store/                    # Zustand persistent workspaces, nodes & edges store
│   │   └── hooks/                    # WebSocket multiplayer & presence hooks
│   └── dist/                         # Optimized production bundle
│
├── deploy/                           # Production infrastructure & monitoring
│   └── monitoring/                   # Prometheus scrape specs & Grafana dashboards
└── docs/                             # Architecture specifications, ADRs & design blueprints
```

---

## 🚀 Quick Start

### Option A: One-Command Docker Compose (Recommended)

Starts the entire production stack (Go Switchboard, React Frontend, PostgreSQL 16, Redis, Prometheus, and Grafana):

```bash
git clone https://github.com/Souheil007/Dotdeck.git
cd Dotdeck
docker compose up -d
```

| Service | Address | Credentials / Details |
| :--- | :--- | :--- |
| **Dotdeck Frontend** | [http://localhost:3000](http://localhost:3000) | Web Command Visualizer |
| **Go Backend API** | [http://localhost:8080](http://localhost:8080) | REST & WebSocket Hub |
| **MCP Switchboard** | `http://localhost:8080/mcp/{token}` | JSON-RPC 2.0 Agent Gateway |
| **Grafana Monitoring** | [http://localhost:3001](http://localhost:3001) | `admin` / `admin` (Pre-configured dashboard) |
| **Prometheus Metrics** | [http://localhost:9090](http://localhost:9090) | Prometheus raw metric scraper |

---

### Option B: Local Development

#### 1. Backend (Go 1.25+)

```bash
cd backend

# Run with in-memory persistence (zero setup required)
go run cmd/server/main.go

# Or run with PostgreSQL:
# export DATABASE_URL="postgres://postgres:postgres@localhost:5432/dotdeck?sslmode=disable"
# go run cmd/migrate/main.go -direction=up
# go run cmd/server/main.go
```

Verify backend health:
```bash
curl http://localhost:8080/healthz
# {"status":"ok","timestamp":"2026-10-27T10:00:00Z"}
```

#### 2. Frontend (Node.js 20+ & Vite)

```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3001](http://localhost:3001) to interact with the canvas.

#### 3. Run the Cloud Agent Fleet Simulator

Test end-to-end swarm delegation without running real cloud instances:

```bash
cd backend
go run test/simulator/main.go
```

Watch the visualizer in real-time as:
1. `Sales Research Dot` boots and connects to the switchboard.
2. It streams reasoning thoughts (`"Crawling API documentation for OAuth endpoints..."`).
3. It delegates synthesized lead briefs to `Grok Copywriter`.
4. Grok hits a pricing hold, triggering a visual operator prompt on your screen!

---

## 🐝 Demo Agent Swarms

Dotdeck comes pre-loaded with three production fleet topologies:

### 1. Enterprise Outbound Swarm (`ws-prod-sales`)
- **Agents**:
  - `Sales Research Dot` (OpenAI Dot) $\to$ Scrapes high-intent B2B leads & tech stacks.
  - `Grok Copywriter` (xAI Grok Bot) $\to$ Generates irreverent outbound sequences based on vulnerabilities.
  - `Claude Compliance` (Anthropic Claude) $\to$ Enforces GDPR, CAN-SPAM, and privacy restrictions.
- **Topology**: Horizontal research-to-copy handoff with safety audit pipeline.

### 2. SecOps Vulnerability Fleet (`ws-secops`)
- **Agents**:
  - `Meta Muse Recon` (Meta Muse Secure VM) $\to$ Scans perimeter cloud CIDR blocks for open egress ports.
  - `Claude Auditor` (Anthropic Claude) $\to$ Correlates findings against CIS security benchmarks.

### 3. Customer Support Tier 3 (`ws-support`)
- **Agents**:
  - `Triage Dot` (OpenAI Dot) $\to$ Categorizes high-touch refund tickets.
  - **45s Hold Gate**: Suspends automated refund execution for human sign-off on amounts $> \$500$.

---

## 📡 MCP Switchboard Protocol

Dotdeck implements the **Model Context Protocol (MCP)** specification via standard JSON-RPC 2.0.

### Tool 1: Real-Time Thought Streaming
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "emit_thought",
    "arguments": {
      "thought": "Extracting webhook secret signatures from incoming payload",
      "step": "Verifying HMAC SHA256",
      "level": "info"
    }
  },
  "id": "req-001"
}
```

### Tool 2: Human Operator Approval (45s Parked Channel)
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "request_human_approval",
    "arguments": {
      "action": "execute_refund",
      "details": "Customer requested full chargeback of $1,250.00 for order #INV-89102",
      "risk_level": "high"
    }
  },
  "id": "req-002"
}
```
*The HTTP response will park until the operator approves or 45 seconds elapse.*

### Tool 3: Dynamically Synthesized Cross-Agent Delegation
When a user links Agent A to Agent B on the visual deck, Dotdeck immediately exposes:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "delegate_task_to_grok_copywriter",
    "arguments": {
      "task_brief": "Target domain uses Stripe v3 webhook signature format. Emphasize replay attack protection.",
      "priority": "urgent"
    }
  },
  "id": "req-003"
}
```

---

## 📊 Observability & Telemetry

Dotdeck exposes comprehensive telemetry for mission-critical production operations:

| Telemetry Pillar | Technology | Endpoint / Destination |
| :--- | :--- | :--- |
| **Structured Logs** | Go standard `log/slog` | Formatted JSON stdout $\to$ Grafana Loki / CloudWatch |
| **Prometheus Metrics** | Prometheus Go Client | `GET http://localhost:8080/metrics` |
| **Distributed Tracing** | OpenTelemetry SDK | W3C TraceContext headers $\to$ Jaeger / Tempo |
| **Crash Reporting** | Sentry SDK | Automatic panic interceptor with stack trace captures |
| **Grafana Dashboard** | Grafana 11 | [`deploy/monitoring/grafana-dashboards/dotdeck-overview.json`](deploy/monitoring/grafana-dashboards/dotdeck-overview.json) |

Key Prometheus Metrics:
- `dotdeck_active_agents{provider="openai_dot|grok_bot|meta_muse|claude"}`
- `dotdeck_mcp_requests_total{status="200|400|500"}`
- `dotdeck_hold_engine_wait_duration_seconds{quantile="0.5|0.9|0.99"}`
- `dotdeck_approvals_total{resolution="approved|rejected|timed_out"}`

---

## 🏆 Engineering Standards

Dotdeck is built to high-discipline software engineering rigor:

- **Zero Single-Character Identifiers**: Every Go variable, loop iterator, error instance, and receiver has a meaningful descriptive name (e.g. `requestContext`, `agentRecord`, `errorItem`).
- **Google-Style Docstrings**: Every Go module, exported struct, and interface features high-signal docstrings.
- **Strict Conventional Commits**: All changes follow `feat:`, `fix:`, `chore:`, `refactor:`, `docs:` conventions.
- **Clean Architecture**: Domain entities have zero third-party dependencies; repositories and handlers are fully decoupled and mocked for tests.

Run tests across the entire repository:
```bash
# Go unit & integration tests
cd backend && go test -v ./...

# Frontend typecheck & production build
cd ../frontend && npm run build
```

---

## 📄 License

Dotdeck is open-source software licensed under the [MIT License](LICENSE).

<div align="center">
  <sub>Built with precision by the Dotdeck Core Engineering Team. Designed for Tier 3 Cloud Autonomy.</sub>
</div>

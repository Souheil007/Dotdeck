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
                      │  Inbound: Held Responses & Slack/Email Wake-up Triggers
                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      GO BACKEND (THE SWITCHBOARD)                        │
│                                                                          │
│  ┌──────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │ Multi-Tenant MCP Hub │  │ Agent-to-Agent     │  │ State & Schedule │  │
│  │ (/mcp/{agent_token}) │  │ Mailbox Router     │  │ Engine           │  │
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
│  • State Badges: [Resting] [Working] [Scheduled] [Needs Input]           │
│  • Slide-Out Inspector: Thought Timeline, Chat & Approvals               │
└──────────────────────────────────────────────────────────────────────────┘
```

## Repository Structure

```
Dotdeck/
├── STANDARDS.md                      # Code quality rules, docstring requirements & conventions
├── docker-compose.yml                # Local services (PostgreSQL, Redis, Backend, Frontend)
├── Makefile                          # Development workflow scripts
├── backend/                          # Go backend switchboard
│   ├── cmd/server/main.go            # Service entrypoint & DI wiring
│   ├── internal/
│   │   ├── api/                      # HTTP handlers & RBAC middleware
│   │   ├── mcp/                      # Multi-tenant MCP endpoint & held approval channels
│   │   ├── ws/                       # Multiplayer WebSocket room hub & presence
│   │   ├── bridge/                   # Wake-up triggers (Slack, Webhook, Email)
│   │   └── store/                    # Database migrations & sqlc queries
│   ├── go.mod
│   └── sqlc.yaml
└── frontend/                         # React + TypeScript visualizer
    ├── src/
    │   ├── components/
    │   │   ├── canvas/               # React Flow visualizer & live pulse edges
    │   │   ├── inspector/            # Slide-out thought stream & approval drawer
    │   │   └── modals/               # Agent pairing wizard & multiplayer sharing
    │   ├── store/                    # Zustand stores
    │   └── hooks/                    # WebSocket & presence hooks
    ├── package.json
    └── tsconfig.json
```

## Quick Start

### 1. Prerequisites
- Go 1.25+
- Node.js 20+
- PostgreSQL 16+ (or run via Docker)

### 2. Run with Docker Compose
```bash
docker compose up -d
```

### 3. Local Development
```bash
# Backend
cd backend
go run cmd/server/main.go

# Frontend
cd frontend
npm install
npm run dev
```

For engineering guidelines, docstrings, and naming standards, consult [STANDARDS.md](file:///C:/GithubProjects/Dotdeck/STANDARDS.md).

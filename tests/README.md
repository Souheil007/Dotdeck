# Dotdeck Test Suite & Verification Harness

This directory contains integration, end-to-end (E2E), and plan-verification tests for Dotdeck.

---

## Test Taxonomy

```
Dotdeck/
├── backend/internal/*/*_test.go    # Unit tests colocated with package source code
├── tests/
│   ├── integration/                # Multi-component integration tests (MCP + Hold + REST + WS)
│   ├── e2e/                        # End-to-end mock cloud agent fleet simulation
│   └── fixtures/                   # Deterministic test payloads, bootstrap prompts, MCP frames
```

---

## Running Tests

### 1. Run All Tests
```bash
# Run all Go tests across internal packages and integration suites
cd backend
go test -v ./... ../tests/integration/...
```

### 2. Run with Race Detection
```bash
cd backend
go test -race ./... ../tests/integration/...
```

### 3. Run E2E Agent Simulation
```bash
# Spins up simulated OpenAI Dots and Grok Bots against a running Dotdeck server
go run tests/e2e/simulator.go --url http://localhost:8080 --token <agent_token>
```

---

## Plan Verification Map

Every plan in [`plans/`](file:///C:/GithubProjects/Dotdeck/plans/) specifies deterministic verification tests that must pass before marking the plan `Completed [x]`:

| Plan # | Plan Name | Verification Target |
| :---: | :--- | :--- |
| **01** | Database Persistence & Migrations | `backend/internal/store/postgres_test.go` |
| **02** | Multi-Tenant MCP Switchboard | `tests/integration/mcp_switchboard_test.go` |
| **03** | Hold Engine & Approval Loop | `backend/internal/mcp/hold_engine_test.go` + `tests/integration/hold_approval_test.go` |
| **04** | Outbound Wake-Up Bridges | `backend/internal/bridge/slack_test.go` + `backend/internal/bridge/webhook_test.go` |
| **05** | Multiplayer WebSocket Engine | `tests/integration/ws_multiplayer_test.go` |
| **06** | React Flow Visual Canvas | `frontend/src/components/canvas/__tests__/AgentCanvas.test.tsx` |
| **07** | Slide-Out Inspector | `frontend/src/components/inspector/__tests__/InspectorDrawer.test.tsx` |
| **08** | Pairing Wizard & Blueprints | `tests/integration/agent_pairing_test.go` |
| **09** | Workspace Collaboration & RBAC | `tests/integration/rbac_permissions_test.go` |
| **10** | E2E Hardening & Loop Guardrails | `tests/e2e/simulator.go` + `tests/integration/runaway_loop_test.go` |

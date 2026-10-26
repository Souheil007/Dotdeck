# Plan 10: End-to-End Verification & Production Hardening

**Status:** Completed [x]

## Objective
Perform end-to-end integration testing simulating multi-vendor cloud agent fleets, validate the full Docker Compose stack, enforce safety guardrails against runaway agent loops, and ensure production readiness.

---

## Deliverables

- [x] **1. Mock Cloud Agent Fleet Simulator (`backend/test/simulator/main.go`)**
  - [x] Simulate an OpenAI Dot client pairing with `/mcp/{token}`.
  - [x] Emulate realistic multi-step reasoning traces and tool calls.
  - [x] Trigger an `ask_human_question` approval pause and wait for the operator response.
  - [x] Invoke `delegate_task_to_grok_bot` to trigger simulated inter-agent handoffs.

- [x] **2. End-to-End Automated Integration Test (`backend/test/integration/e2e_full_lifecycle_test.go`)**
  - [x] Test entire lifecycle in a single automated test run:
    1. Create workspace & provision 2 agent nodes.
    2. Wire an edge between Agent A and Agent B.
    3. Simulate Agent A pairing and reporting thought steps.
    4. Simulate Agent A requesting human approval; verify HoldEngine holds connection.
    5. Resolve approval via REST API; verify Agent A receives inline response within 100ms.
    6. Simulate Agent A delegating task to Agent B; verify WebSocket handoff packet.
    7. Simulate Agent A sleeping; dispatch direct chat prompt and verify wake-up bridge fires.

- [x] **3. Runaway Loop Guardrails & Rate Limiting**
  - [x] Implement global loop detector: block agents from messaging peers more than 5 times in 10 minutes without human interaction.
  - [x] Implement IP and token rate-limiting on MCP endpoints.
  - [x] Sanitize and enforce size limits on thought payloads and artifacts (512 KB max).

- [x] **4. Production Docker Compose & Environment Validation**
  - [x] Execute `docker compose config` and verify all containers reach healthy status.
  - [x] Validate reverse proxy routing for API, WebSockets, and frontend SPA.
  - [x] Verify zero memory leaks or unclosed database connections under concurrent mock agents.

---

## Definition of Done (DoD)
1. `backend/test/simulator` executes the entire multi-agent workflow against a running Dotdeck server and passes 100%.
2. `docker compose config` validates PostgreSQL, Redis, Backend, and Frontend cleanly with healthy status flags.
3. Rapid cyclic delegation between two agents is caught by the loop detector and halted with a `RATE_LIMIT_GUARD` alert on the canvas.
4. All unit, integration, and E2E test suites pass with zero race conditions.

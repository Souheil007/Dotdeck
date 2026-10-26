# Plan 02: Multi-Tenant MCP Switchboard

**Status:** Completed [x]

## Objective
Build the multi-tenant Model Context Protocol endpoint (`/mcp/{agent_token}`) compliant with the standard MCP specification, supporting dynamic tool synthesis reflecting visual canvas connections and mandatory telemetry injection.

---

## Deliverables

- [x] **1. JSON-RPC 2.0 Protocol Engine (`backend/internal/mcp/server.go`)**
  - [x] Implement RFC-compliant JSON-RPC 2.0 over HTTP POST and Server-Sent Events (SSE).
  - [x] Handle `initialize` handshake, broadcasting connection online events to the canvas.
  - [x] Support `tools/list` with dynamic schema assembly based on active canvas edges.
  - [x] Support `tools/call` with strict argument validation and standard error codes (`RPCParseError`, `RPCInvalidRequest`, `RPCMethodNotFound`, `RPCInvalidParams`).

- [x] **2. Dynamic Delegation Tool Synthesizer (`backend/internal/mcp/tools.go`)**
  - [x] Query outbound canvas edges for the requesting agent.
  - [x] Dynamically inject `delegate_task_to_<peer_name>` tools into the agent's MCP schema.
  - [x] Enforce mandatory `current_reasoning_trace` and `instructions` in all delegation payloads.

- [x] **3. Telemetry & Piggybacked Thought Ingestion**
  - [x] Provide `report_thought_step` tool schema requiring `reasoning_trace` and `next_planned_step`.
  - [x] Persist incoming traces into `thought_events` table and forward to WebSocket broadcasters.
  - [x] Extract reasoning metadata from any operational tool call to prevent blind spots with forgetful LLMs.

- [x] **4. Cloud Provider Compatibility Layer**
  - [x] Validate compatibility with OpenAI Cloud Computer / Dots MCP clients.
  - [x] Validate compatibility with Grok Cloud Computer / Bot tool callers.
  - [x] Provide fallback web-applet / webhook check-in endpoints (`POST /mcp/{token}/checkin`) for browser-only agents (e.g., Meta Muse).

---

## Definition of Done (DoD)
1. [x] Automated curl and mock agent tests successfully run `initialize`, `tools/list`, and `tools/call`.
2. [x] Adding a directed edge between Agent A and Agent B immediately exposes `delegate_task_to_agent_b` in Agent A's `tools/list`.
3. [x] Invoking `report_thought_step` updates the agent status to `working` and emits a `THOUGHT_STEP_EMITTED` WebSocket packet.
4. [x] Comprehensive unit test suite validates malformed JSON, invalid tokens, and missing parameters.

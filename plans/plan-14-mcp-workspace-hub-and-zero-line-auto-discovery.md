# Plan 14: Workspace Hub MCP Endpoint & Zero-Line Agent Auto-Discovery

**Status:** Completed [x]

---

## Objective
Eliminate all duplicate configuration friction between Dotdeck and closed vendor clouds (xAI Grok, OpenAI Custom GPTs, Anthropic Claude). Provide a single **Workspace Hub MCP Endpoint** (`/mcp/ws/{workspace_id}`) where any closed cloud agent connecting via standard MCP `initialize` is automatically identified via **Method A (MCP Handshake Identity)**, auto-provisioned, and materialized live on the switchboard canvas with **ZERO extra lines of prompt boilerplate**.

---

## Architectural Pillars

```
 ┌────────────────────────────────────────────────────────┐
 │            VENDOR CLOUD (Grok, Claude, OpenAI)         │
 │   User sets prompt: "Check last 5 emails for urgency"  │
 │   MCP Connector URL: https://.../mcp/ws/ws-sales       │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼ POST /mcp/ws/{workspace_id}
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                      DOTDECK SWITCHBOARD (GO BACKEND)                        │
 │                                                                              │
 │  1. Route Match: Detects /mcp/ws/{workspace_id} or /mcp/ws/{ws}/{agent_name} │
 │  2. Inspects "initialize" Handshake:                                         │
 │     • Extracts params.clientInfo.name (e.g. "grok-email-viewer")             │
 │     • Detects provider vendor from clientInfo / User-Agent                   │
 │  3. Auto-Provisions Agent Record in Memory/Disk Store                        │
 │  4. Broadcasts AGENT_CREATED to Workspace WebSocket Stream                   │
 │  5. Injects Self-Instructing Tool Descriptions (Zero-Line Protocol)          │
 │  6. Serves prompts/list & prompts/get ("dotdeck_governance_protocol")        │
 └──────────────────────────────────────┬───────────────────────────────────────┘
                                        │
                                        ▼ WebSocket Event
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                       REACT FLOW SWITCHBOARD CANVAS                          │
 │                                                                              │
 │  • Node automatically materializes in real-time with vendor badge            │
 │  • Auto-names to "Grok Email Viewer" (or URL custom alias)                   │
 │  • Transitions directly to Resting / Working with no manual pairing wizard   │
 │  • Ready for drag-and-drop wiring to peer agents                             │
 └──────────────────────────────────────────────────────────────────────────────┘
```

---

## Deliverables

### Phase 1: Go Switchboard Workspace Hub Routing (`backend/internal/mcp/`)
- [x] **1.1 Workspace Hub URL Parser**: Enhance `server.go` to route `/mcp/ws/{workspace_id}` and `/mcp/ws/{workspace_id}/{agent_name}` alongside existing `/mcp/{token}` paths.
- [x] **1.2 Method A Auto-Discovery Engine**:
  - In `handleMethod` for `"initialize"`, detect if running in workspace-hub mode.
  - Parse `params.clientInfo.name` (e.g., `"grok"`, `"grok-email-viewer"`, `"claude"`).
  - Infer vendor provider (`grok_bot`, `openai_dot`, `claude`, `meta_muse`) from client info or user agent.
  - Provision or resolve the agent record in `repository.CreateAgent`.
  - Broadcast `AGENT_CREATED` and `AGENT_STATE_CHANGED` over WebSockets to the active workspace.
- [x] **1.3 Self-Instructing MCP Tool Schemas**:
  - Refine tool descriptions in `tools.go` for `report_thought_step`, `ask_human_question`, and `complete_task` with authoritative instructions so models invoke them spontaneously without manual prompt boilerplate.
- [x] **1.4 MCP Prompts Specification Implementation**:
  - Support `prompts/list` returning `dotdeck_governance_protocol`.
  - Support `prompts/get` returning full operational telemetry and delegation directives.

### Phase 2: Frontend Real-Time Materialization (`frontend/src/`)
- [x] **2.1 Live Agent Auto-Spawn Listener**:
  - In `useMultiplayerWebSocket.ts`, handle `AGENT_CREATED` event by automatically adding the newly discovered node to canvas state if not already present.
- [x] **2.2 Workspace Hub Top Bar Action**:
  - In `App.tsx`, add a one-click **"Fleet MCP Hub"** button next to the workspace switcher so operators can copy `https://.../mcp/ws/{workspace_id}` in one click.
- [x] **2.3 Auto-Focus and Placement**:
  - Automatically place auto-discovered nodes gracefully on the canvas and trigger a subtle pulse animation on entry.
- [x] **2.4 Pairing Wizard Hub Guidance**:
  - In `PairingWizard.tsx`, provide direct guidance and one-click copy for the Zero-Line Fleet Hub URL alternative.

### Phase 3: Verification & Integration Testing
- [x] **3.1 Backend Test Suite**:
  - Add unit tests in `backend/internal/mcp/` testing `/mcp/ws/{workspace_id}` handshake and auto-discovery (`TestWorkspaceHub_AutoDiscovery`).
- [x] **3.2 Zero-Line Mock Simulation**:
  - Simulate a Grok agent connecting with `params.clientInfo = {"name": "grok-email-viewer"}` and verify node auto-creation, tool listing, thought reporting, and task completion.
- [x] **3.3 Production Build**:
  - Rebuilt backend binary and frontend bundle; verified zero regression.

---

## Definition of Done (DoD)
1. Operators can copy a single Fleet MCP URL (`/mcp/ws/{workspace_id}`) from the Dotdeck cockpit.
2. In Grok or Claude, adding this URL as an MCP connector and running `initialize` automatically creates and displays the agent node on the canvas.
3. The model receives self-instructing tool descriptions that enforce `report_thought_step`, `ask_human_question`, and `complete_task` without requiring long copied prompt blocks.
4. All unit tests pass and code strictly adheres to Google-style docstrings and project guidelines.

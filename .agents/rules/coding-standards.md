# Agent Rule: Dotdeck Code Quality & Docstring Standards

This workspace enforces strict engineering standards across backend (Go 1.25+) and frontend (React 19 + TypeScript).

## 1. Golang Google-Style Docstrings (Mandatory)
Every package, exported struct, interface, and public function/method in Go must include a **Google Style Docstring**:
- **Format**: Concise, high-signal, short.
- **Strict Prohibition**: Never write redundant parameter restatements (e.g., forbidden: `UserID is the ID of the user`). State preconditions, side effects, failure modes, or non-obvious design choices.
- **Package Comments**: Every package must have a top-level package docstring in at least one file explaining its role in the Dotdeck switchboard.

```go
// Package holdengine coordinates in-flight approval requests between cloud agents
// and human operators connected via WebSockets.
package holdengine

// Hold registers a decision request and pauses the caller until resolved, cancelled, or timed out.
//
// The default ceiling is 45 seconds to safely precede cloud provider tool-call deadlines.
func (h *HoldEngine) Hold(ctx context.Context, req DecisionRequest, timeout time.Duration) (*DecisionResult, error) { ... }
```

## 2. Naming Conventions
- **Go Packages**: Short, lowercase, single-word, no underscores or mixedCaps (`mcp`, `ws`, `bridge`, `store`, `api`).
- **Go Structs & Interfaces**: PascalCase (`AgentContext`, `EventBroadcaster`, `HoldEngine`).
- **Go Methods / Functions**: PascalCase for exported, camelCase for internal.
- **Go Sentinel Errors**: `Err` prefix (`ErrApprovalTimeout`, `ErrAlreadyClaimed`).
- **TypeScript**: PascalCase components and interfaces (`AgentNode.tsx`, `PulseEdge.tsx`), camelCase custom hooks (`useMultiplayerWS.ts`), stores (`useWorkspaceStore.ts`).
- **Database**: Lowercase plural `snake_case` tables (`workspaces`, `agents`, `agent_edges`, `thought_events`, `approvals`).
- **WebSocket Events**: Screaming snake_case (`AGENT_STATE_CHANGED`, `THOUGHT_STEP_EMITTED`, `APPROVAL_REQUESTED`, `PRESENCE_SYNC`).
- **MCP Tools**: Lowercase snake_case (`report_thought_step`, `ask_human_question`, `delegate_task_*`).

## 3. Tier 3 Closed Cloud Architecture Guarantees
- Dotdeck operates strictly as a switchboard / control plane above closed cloud VMs (OpenAI Dots, Grok Bots, Meta Muse, Claude Cloud Agents).
- Never attempt to run agent weights locally or spawn local POSIX PTYs for cloud agents.
- All inter-agent routing tools must enforce piggybacked telemetry fields: `current_reasoning_trace` and `next_planned_step`.
- Approval windows are bounded by a 45-second timer before falling back to async wake-up queues.
- Multiplayer operations must be concurrency-safe with non-blocking WebSocket fanouts and optimistic locks on approval actions.

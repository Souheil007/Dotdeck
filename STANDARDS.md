# Dotdeck Engineering Standards & Architecture Guide

This document establishes the mandatory engineering standards, naming conventions, docstring specifications, and architectural principles for the **Dotdeck** codebase.

---

## 1. Documentation & Google-Style Docstrings

All Golang packages, exported structs, interfaces, and public functions/methods **must** include Google-style docstrings.

### 1.1 Core Principles
- **Concise & High-Signal**: State purpose, operational caveats, and non-obvious behavior.
- **Zero Redundancy**: Do not restate parameter names or type signatures verbatim (e.g., avoid `UserID is the ID of the user`). Focus on preconditions, side effects, ownership, and failure modes.
- **Package Comments**: Every package must have a top-level package docstring in at least one file explaining its role within the Dotdeck switchboard.

### 1.2 Golang Docstring Format

```go
// Package holdengine manages held HTTP/SSE connections for synchronous
// human-in-the-loop decisions across cloud agent tool calls.
package holdengine

// Engine coordinates in-flight approval requests between cloud agents
// and human operators connected via WebSockets.
type Engine struct {
    // ...
}

// RequestDecision registers an agent approval request and pauses execution
// until a human operator responds, the context is cancelled, or the timeout elapses.
//
// Returns ErrApprovalTimeout if no operator claims or answers the request
// within the allocated window.
func (e *Engine) RequestDecision(ctx context.Context, req ApprovalRequest) (*DecisionResponse, error) {
    // ...
}
```

### 1.3 TypeScript / React Docstring Format
Exported components, custom hooks, and shared utilities must include JSDoc comments describing props, edge cases, and multiplayer behavior.

```typescript
/**
 * Renders an interactive agent card on the React Flow canvas with real-time
 * pulse badges reflecting agent execution states (Resting, Scheduled, Working, Blocked).
 */
export function AgentNode({ data, selected }: AgentNodeProps): JSX.Element {
    // ...
}
```

---

## 2. Naming Conventions

Consistency across backend, frontend, database, and MCP boundaries is critical for reliable cross-vendor orchestration.

### 2.1 The Explicit & Non-Confusing Naming Rule (Mandatory)
- **High-Clarity Naming**: Every module, struct, interface, function, and variable name must be clear, unambiguous, understandable, and self-documenting. Never use cryptic abbreviations or vague names.
- **Strict Prohibition of Single-Character Names**: 
  - **NEVER** use single-character identifiers for variables, function arguments, loop counters, struct receivers, or imported packages.
  - Forbidden: `w`, `r`, `e`, `c`, `s`, `h`, `p`, `n`, `i`, `x`, `y`, `m`, `t`.
  - Required Replacements:
    - HTTP handler writer: `responseWriter` or `writer` (never `w`).
    - HTTP handler request: `request` (never `r`).
    - Struct receivers: `engine`, `hub`, `server`, `store`, `client`, `bridge` (never `e`, `h`, `s`, `c`, `b`).
    - Loop & iteration variables: `node`, `edge`, `cursor`, `index`, `step` (never `n`, `e`, `c`, `i`, `s`).
    - Events & Errors: `event`, `err` (never `e`).
    - Coordinates: `coordX`, `coordY` or `positionX`, `positionY` (never `x`, `y`).

### 2.2 Backend (Go)

| Category | Convention | Examples | Anti-patterns |
| :--- | :--- | :--- | :--- |
| **Packages** | Short, lowercase, single-word, no underscores | `holdengine`, `store`, `bridge`, `ws` | `hold_engine`, `agentUtils` |
| **Exported Types** | PascalCase, descriptive nouns | `AgentNode`, `ApprovalRequest`, `WorkspaceHub` | `AgentNodeStruct`, `IApproval` |
| **Interfaces** | PascalCase; `-er` suffix for single methods | `Router`, `Broadcaster`, `WakeUpBridge` | `IAgentManager` |
| **Methods / Funcs** | PascalCase (exported), camelCase (unexported) | `DispatchEvent`, `resolveHandoff` | `Dispatch_Event`, `Get_Data` |
| **Errors** | `Err` prefix, PascalCase | `ErrApprovalTimeout`, `ErrAgentNotFound` | `AgentTimeoutError` |
| **Constants / Enums**| PascalCase | `StateResting`, `StateWorking`, `RoleAdmin` | `STATE_RESTING`, `kState` |
| **Receiver Names** | Full descriptive noun matching the type | `(engine *HoldEngine)`, `(hub *Hub)`, `(store *MemoryStore)` | `(e *HoldEngine)`, `(h *Hub)`, `(this *Hub)` |
| **Variables & Args** | Descriptive names, minimum 2 characters | `responseWriter`, `request`, `timeout`, `agentID` | `w`, `r`, `t`, `id`, `p` |

### 2.3 Frontend (TypeScript & React)

| Category | Convention | Examples | Anti-patterns |
| :--- | :--- | :--- | :--- |
| **Components** | PascalCase `.tsx` | `AgentCanvas.tsx`, `ThoughtStream.tsx`, `PulseEdge.tsx` | `agentCanvas.tsx` |
| **Custom Hooks** | `use` prefix, camelCase `.ts` | `useMultiplayerWS.ts`, `useAgentHandoff.ts` | `MultiplayerWS.ts` |
| **Stores** | `use` prefix + `Store`, camelCase `.ts`| `useWorkspaceStore.ts`, `useApprovalStore.ts` | `workspaceStore.ts` |
| **Utilities** | kebab-case or camelCase `.ts` | `format-duration.ts`, `crypto.ts` | `Utils.ts` |
| **Types / Interfaces** | PascalCase, no `I` prefix | `AgentPayload`, `CanvasEdgeData`, `ThoughtStep` | `IAgentPayload` |
| **Iteration & Events**| Full descriptive nouns | `nodes.map((node) => ...)` / `(event) => ...` | `nodes.map((n) => ...)` / `(e) => ...` |
| **Coordinates** | Descriptive positions | `coordX`, `coordY`, `clientX`, `clientY` | `x`, `y` |

### 2.4 Database (PostgreSQL & SQLC)

- **Tables**: Lowercase, plural, snake_case (`workspaces`, `workspace_members`, `agents`, `agent_edges`, `thought_events`, `approvals`).
- **Columns**: Lowercase, singular, snake_case (`id`, `workspace_id`, `created_at`, `current_state`).
- **Foreign Keys**: Target singular table name + `_id` (`workspace_id`, `source_agent_id`, `target_agent_id`).
- **Indexes**: `idx_<table_name>_<column_name>` (`idx_thought_events_agent_id`).

### 2.5 Real-Time & Protocol Names

- **WebSocket Events**: Screaming snake_case (`AGENT_STATE_CHANGED`, `THOUGHT_EMITTED`, `APPROVAL_REQUESTED`, `PRESENCE_SYNC`).
- **MCP Tool Names**: Lowercase snake_case (`report_thought_step`, `ask_human_question`, `delegate_task`).

---

## 3. Architecture & Code Quality Principles

Dotdeck acts as the vendor-neutral control plane for Tier 3 closed cloud agents (OpenAI Dots, Grok Bots, Meta Muse, Claude Cloud Agents). Because we do not own the proprietary cloud VMs, our architecture operates as a high-concurrency event switchboard.

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

### 3.1 Layered & Modular Design
1. **Entrypoint (`cmd/server/main.go`)**: Responsible purely for environment parsing, database connection pooling, service wiring, and graceful shutdown on `os.Interrupt` / `SIGTERM`.
2. **API Layer (`internal/api`)**: Handles HTTP routing, input validation, authentication, and workspace RBAC enforcement. Handlers delegate business logic to domain packages.
3. **MCP Switchboard (`internal/mcp`)**: Manages dynamic per-agent tool endpoints over HTTP/SSE. Generates dynamic schemas reflecting canvas connections.
4. **WebSocket Hub (`internal/ws`)**: Isolates multiplayer rooms per workspace. Broadcasts state updates, thought streams, cursor positions, and optimistic approval locks.
5. **Bridge Engine (`internal/bridge`)**: Dispatches outbound triggers (Slack threads, inbound webhooks, email endpoints) to wake resting cloud agents.
6. **Persistence Layer (`internal/store`)**: Uses PostgreSQL with pure SQL queries managed via `sqlc`. Zero ORM reflection overhead.

### 3.2 Concurrency & Goroutine Safety
- **Context Propagation**: Every database call, HTTP handler, background task, and channel operation must accept and honor `context.Context`.
- **No Goroutine Leaks**: Every goroutine spawned must be bounded by a lifecycle owner (e.g., worker pool or context cancellation).
- **Non-Blocking WebSocket Fanout**: Outbound client writes must use buffered channels. If a slow client channel fills up, disconnect that client rather than stalling other workspace peers.
- **Thread-Safe Memory Stores**: Protect all in-memory registries (active MCP sessions, approval channels, presence rooms) using fine-grained `sync.RWMutex` or atomic operations.

### 3.3 Dynamic MCP Tooling & Telemetry Injection
- **Connection-Driven Tools**: When an edge is created between Agent A and Agent B on the visual canvas, the MCP registry must dynamically synthesize `delegate_task_to_<agent_b>` in Agent A's schema.
- **Piggybacked Thought Capture**: To avoid relying on forgetful LLMs calling optional status tools, every inter-agent routing and approval tool enforces:
  - `current_reasoning_trace` (string, required)
  - `next_planned_step` (string, required)
- **45-Second Approval Window**:
  - Hold the agent's MCP HTTP connection open for up to 45 seconds awaiting human action.
  - If unanswered at 45s, return a `QUEUED_FOR_REVIEW` payload instructing the agent to suspend execution.
  - When the human approves later via the UI, fire an outbound wake-up via `internal/bridge`.

### 3.4 Multi-Tenancy & RBAC Enforcement
- **Tenant Isolation**: Every database query, cache key, and WebSocket channel is scoped by `workspace_id`.
- **Role Hierarchy**:
  - `Admin`: Full workspace ownership, member invites, billing, API keys, and deletion.
  - `Operator / Write`: Create/edit agents, connect edges, answer approvals, trigger wake-up chats.
  - `Observer / Read`: View canvas topology, inspect thoughts and artifacts in real time. All mutation and approval actions disabled.
- **Approval Race Protection**: Use atomic database state transitions (`UPDATE approvals SET status = 'RESOLVED' WHERE id = $1 AND status = 'PENDING'`) combined with real-time UI typing locks to eliminate double-approval conflicts.

### 3.5 Frontend Architecture & React Flow Rules
- **State Partitioning**: Canvas topology, live cursor presence, and inspector state reside in modular Zustand stores.
- **Selective Re-rendering**: Use React Flow's node data memoization. Updating a single node's thought ticker must not trigger a full canvas re-render.
- **Virtualized Thought Feed**: Use `@tanstack/react-virtual` for thought history drawers to guarantee 60fps rendering across runs with tens of thousands of steps.

### 3.6 Error Handling & Structured Logging
- Use standard Go `log/slog` with JSON formatting in production and text formatting in local development.
- Always wrap low-level errors with contextual operation descriptions:
  ```go
  if err := s.db.RecordThought(ctx, payload); err != nil {
      return fmt.Errorf("recording agent thought step: %w", err)
  }
  ```
- Expose sanitized, human-readable error messages over HTTP and WebSocket protocols; never leak raw database connection strings or stack traces.

---

## 4. Git Commit Message Standards (Conventional Commits)

Dotdeck strictly adheres to the **Conventional Commits 1.0.0** specification. Clear, structured commit messages ensure readable change histories, automated changelog generation, and precise semantic versioning.

### 4.1 Structure
```
<type>(<scope>): <short imperative description>

[optional body explaining context, rationale, or breaking changes]

[optional footer(s), e.g., Closes #123]
```

### 4.2 Allowed Types

| Type | When to Use | Example |
| :--- | :--- | :--- |
| `feat` | New user-facing or agent-facing functionality | `feat(mcp): synthesize dynamic delegation tools from canvas edges` |
| `fix` | Bug fixes in code, protocols, or UI | `fix(hold): prevent double-approval race on simultaneous clicks` |
| `docs` | Documentation, plans, ADRs, or guides only | `docs(decisions): add ADR for Tier 3 closed cloud orchestration` |
| `test` | Adding or refactoring unit, integration, or E2E tests | `test(ws): add concurrent client broadcast stress tests` |
| `refactor`| Code change that neither fixes a bug nor adds a feature | `refactor(store): migrate in-memory mocks to pgx repository` |
| `perf` | Performance improvements | `perf(canvas): memoize AgentNode props to prevent full canvas re-renders` |
| `chore` | Build tasks, configs, dependency updates, tooling | `chore(deps): bump coder/websocket to v1.8.12` |
| `ci` | Continuous Integration / deployment scripts | `ci(github): add automated go test workflow` |

### 4.3 Comprehensive Scopes Taxonomy

Scopes are grouped by architectural layer. Choose the most specific scope applicable:

- **Backend Core**: `mcp`, `hold`, `ws`, `presence`, `bridge`, `api`, `store`, `auth`, `observability`
- **Frontend & UI**: `canvas`, `nodes`, `edges`, `inspector`, `stream`, `approval`, `chat`, `modals`, `state`
- **Agents & Providers**: `agent`, `workspace`, `openai`, `grok`, `claude`, `muse`
- **DevOps & Quality**: `docker`, `deploy`, `tests`, `simulator`, `docs`, `plans`, `deps`, `ci`

> [!TIP]
> Scope is **optional** for repo-wide changes (e.g., `chore: update root license`). For changes tightly spanning two areas, compound scopes like `feat(nodes/edges): ...` or `fix(auth/api): ...` are permitted.

### 4.4 Golden Rules
1. **Imperative mood**: Use `"add"`, `"implement"`, `"fix"`, `"prevent"`, NOT `"added"`, `"fixing"`, or `"adds"`.
2. **No trailing period**: Keep the subject line concise (under 72 characters).
3. **Lowercase subject**: Do not capitalize the first letter after the colon.
4. **Link references**: Reference issue or plan numbers in the body or footer when applicable.


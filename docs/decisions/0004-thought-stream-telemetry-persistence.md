# ADR 0004: Dual-Tier Telemetry Persistence & On-Demand REST History Backfill

- **Status:** Accepted
- **Date:** 2026-10-28
- **Context:** Resolving how agent thought streams are persisted, synchronized, and retrieved across browser refreshes, offline periods, and multiplayer fleet collaboration.

---

## Context & Problem Statement

Tier 3 closed cloud agents (OpenAI Dots, Grok Bots, Meta Muse VMs, Claude Cloud Agents) emit fine-grained analytical milestones and reasoning deductions via the `report_thought_step` MCP tool. Workspace operators monitor these streams in real-time on the Dotdeck canvas.

Two naive persistence approaches present severe failure modes:

1. **Client-Only Persistence (`localStorage`)**:
   - If telemetry is only cached in the operator's browser storage, the historical trace is lost whenever:
     - The operator closes their laptop while background agents continue running 24/7 in the cloud ("The Laptop Closed Problem").
     - A teammate joins the fleet or an operator opens Dotdeck on a second device or incognito tab.
     - Browser storage or cache is cleared.
2. **WebSocket Full-Dump on Connect**:
   - If the backend replays the complete thought history for every agent across an entire fleet whenever a WebSocket client connects, initial page load latency spikes and megabytes of JSON are transmitted for agents the operator may never inspect.

---

## Decision

We adopt a **Dual-Tier Hybrid Persistence Architecture**:

### 1. Live Streaming Tier (WebSockets)
- Active cloud agents broadcast reasoning events (`THOUGHT_STEP_EMITTED`) through the Go Switchboard WebSocket Hub.
- Events are dispatched in real-time strictly to clients subscribed to that agent's `workspace_id`.
- The frontend store records incoming frames and immediately renders phosphor-glow pulse badges on canvas nodes.

### 2. Server-Side Ground Truth (Storage Engine)
- Every emitted thought step is immediately written to backend storage:
  - **Local Development**: In-memory ring buffer with thread-safe mutex locking (`MemoryStore.RecordThought`).
  - **Production**: Partitioned PostgreSQL table (`thought_events`) organized into monthly range partitions (`thought_events_YYYYMM`).

### 3. Local Client Resilience (`localStorage` Partialize)
- The active client cache (`thoughts`, `approvals`, `workspaceId`) is saved into browser `localStorage` using Zustand's `persist` middleware.
- Survives instant browser refreshes (F5) without blank screen flicker or redundant network roundtrips.
- Strict workspace ID synchronization guarantees that WebSocket rooms match the active canvas view on rehydration.

### 4. On-Demand REST History Backfill (`GET /api/v1/agents/{id}/thoughts`)
- When an operator clicks an agent node to open the Inspector Drawer, the frontend queries `GET /api/v1/agents/{id}/thoughts`.
- Fetched historical milestones are merged and deduplicated with locally cached steps.
- Solves the offline/laptop-closed gap with zero bandwidth overhead on initial page load.

---

## Comparison Matrix

| Failure Mode | Pure `localStorage` | Pure WebSocket Full-Dump | Dotdeck Dual-Tier (ADR 0004) |
| :--- | :--- | :--- | :--- |
| **Agent runs while laptop is asleep** | ❌ Thoughts lost forever | ⚠️ Megabytes dumped on wake | ✅ Backfilled on-demand when clicked |
| **New teammate joins workspace** | ❌ Teammate sees 0 thoughts | ⚠️ Network spike on connection | ✅ Fetched seamlessly on-demand |
| **Page Refresh (F5)** | ✅ Preserved locally | ⚠️ WebSocket reconnect delay | ✅ Instant render from local cache |
| **Initial Page Load Performance** | ✅ Lightweight | ❌ Bloated by multi-agent history | ✅ Fast initial load; paginated REST |

---

## Consequences

- **Positive:**
  - Absolute data durability: background cloud agents running 24/7 never lose telemetry.
  - Multi-user consistency: teammates joining a workspace instantly view identical thought logs.
  - Scalable bandwidth: initial page load only downloads canvas topology; historical telemetry is lazy-loaded on demand.
  - Seamless developer experience: local development uses `MemoryStore` with zero external dependencies, while production routes to partitioned PostgreSQL.
- **Negative:**
  - Requires maintaining both a WebSocket event schema and a corresponding REST retrieval endpoint.
  - Frontend deduplication logic must guard against race conditions between REST backfills and concurrent live WebSocket frames.

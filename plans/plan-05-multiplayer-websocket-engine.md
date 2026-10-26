# Plan 05: Multiplayer WebSocket Engine

**Status:** Upcoming [ ]

## Objective
Implement high-throughput real-time multiplayer synchronization using `coder/websocket`, providing isolated rooms per workspace, non-blocking broadcast fan-outs, live cursor presence tracking, and optimistic question locks.

---

## Deliverables

- [ ] **1. Room Router & Hub Architecture (`backend/internal/websocket/hub.go`)**
  - [ ] Implement isolated client registration grouped strictly by `workspace_id`.
  - [ ] Implement non-blocking broadcast ring: drop slow clients rather than stalling peer broadcasts.
  - [ ] Provide 30-second ping/pong keepalive tickers for persistent connection health.

- [ ] **2. Live Canvas Presence (`backend/internal/websocket/presence.go`)**
  - [ ] Track real-time coordinates `(x, y)`, display names, and assigned avatar colors per user.
  - [ ] Broadcast `PRESENCE_SYNC` events with throttled client movement updates.
  - [ ] Clean up disconnected user cursors immediately upon socket termination.

- [ ] **3. Question Locking & Anti-Collision**
  - [ ] Implement `LOCK_QUESTION` handler when an operator clicks into an approval box.
  - [ ] Broadcast `QUESTION_LOCKED` to all workspace peers: `"Sarah is currently reviewing..."`.
  - [ ] Implement `UNLOCK_QUESTION` on submit, cancel, or socket disconnect.

- [ ] **4. Robust Frontend Client Hook (`frontend/src/hooks/useMultiplayerWebSocket.ts`)**
  - [ ] Implement exponential backoff auto-reconnect logic on socket drop.
  - [ ] Synchronize incoming messages directly into the Zustand `useWorkspaceStore`.
  - [ ] Expose throttled `sendCursor(x, y)` and question lock/unlock actions.

---

## Definition of Done (DoD)
1. WebSocket integration tests verify concurrent clients in the same workspace receive broadcast events.
2. Clients in different workspaces never receive events across tenant boundaries.
3. Rapid cursor movements from 5 concurrent simulated users stream at 60fps without socket stalls.
4. Disconnecting a client immediately cleans up its cursor and releases any held question locks.

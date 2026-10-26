# Plan 05: Multiplayer WebSocket Engine

**Status:** Upcoming [ ]

## Objective
Implement high-throughput real-time multiplayer synchronization using `coder/websocket`, providing isolated rooms per workspace, Redis Pub/Sub cross-node event mesh, non-blocking broadcast fan-outs, live cursor presence tracking, and optimistic question locks.

---

## Deliverables

- [ ] **1. Room Router & Hub Architecture (`backend/internal/websocket/hub.go`)**
  - [ ] Implement isolated client registration grouped strictly by `workspace_id`.
  - [ ] Implement non-blocking broadcast ring: drop slow clients (128-buffer full) rather than stalling peer broadcasts.
  - [ ] Provide 30-second ping/pong keepalive tickers for persistent connection health.

- [ ] **2. Redis Pub/Sub Cluster Mesh (`backend/internal/websocket/redis_hub_adapter.go`)**
  - [ ] Subscribe Go switchboard nodes to Redis channel `workspace:{id}:events`.
  - [ ] When Node 1 broadcasts a state change, forward to Redis so Node 2 and Node 3 broadcast to their local connected browser clients.
  - [ ] Enable horizontal cluster scaling behind an AWS Application Load Balancer without sticky session constraints.

- [ ] **3. Live Canvas Presence (`backend/internal/websocket/presence.go`)**
  - [ ] Track real-time coordinates `(x, y)`, display names, and assigned avatar colors per user.
  - [ ] Broadcast `PRESENCE_SYNC` events with throttled client movement updates (10 Hz).
  - [ ] Clean up disconnected user cursors immediately upon socket termination.

- [ ] **4. Question Locking & Anti-Collision**
  - [ ] Implement `LOCK_QUESTION` handler when an operator clicks into an approval box.
  - [ ] Broadcast `QUESTION_LOCKED` to all workspace peers: `"Sarah is currently reviewing..."`.
  - [ ] Implement `UNLOCK_QUESTION` on submit, cancel, or socket disconnect.

- [ ] **5. Robust Frontend Client Hook (`frontend/src/hooks/useMultiplayerWebSocket.ts`)**
  - [ ] Implement exponential backoff auto-reconnect logic on socket drop.
  - [ ] Synchronize incoming messages directly into the Zustand `useWorkspaceStore`.
  - [ ] Expose throttled `sendCursor(coordinateX, coordinateY)` and question lock/unlock actions.

---

## Definition of Done (DoD)
1. WebSocket integration tests verify concurrent clients in the same workspace receive broadcast events within 15ms.
2. Cross-node cluster tests verify an event emitted on Node 1 arrives at a client connected to Node 2 via Redis Pub/Sub.
3. Clients in different workspaces never receive events across tenant boundaries.
4. Rapid cursor movements from 5 concurrent simulated users stream at 60fps without socket stalls.
5. Disconnecting a client immediately cleans up its cursor and releases any held question locks.

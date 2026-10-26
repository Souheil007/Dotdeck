# Plan 05: Multiplayer WebSocket Engine

**Status:** Completed [x]

## Objective
Implement high-throughput real-time multiplayer synchronization using `coder/websocket`, providing isolated rooms per workspace, Redis Pub/Sub cross-node event mesh, non-blocking broadcast fan-outs, live cursor presence tracking, and optimistic question locks.

---

## Deliverables

- [x] **1. Room Router & Hub Architecture (`backend/internal/websocket/hub.go`)**
  - [x] Implement isolated client registration grouped strictly by `workspace_id`.
  - [x] Implement non-blocking broadcast ring: drop slow clients (128-buffer full) rather than stalling peer broadcasts.
  - [x] Provide 30-second ping/pong keepalive tickers for persistent connection health.

- [x] **2. Redis Pub/Sub Cluster Mesh (`backend/internal/websocket/redis_hub_adapter.go`)**
  - [x] Subscribe Go switchboard nodes to Redis channel `workspace:{id}:events`.
  - [x] When Node 1 broadcasts a state change, forward to Redis so Node 2 and Node 3 broadcast to their local connected browser clients.
  - [x] Enable horizontal cluster scaling behind an AWS Application Load Balancer without sticky session constraints.

- [x] **3. Live Canvas Presence (`backend/internal/websocket/presence.go`)**
  - [x] Track real-time coordinates `(x, y)`, display names, and assigned avatar colors per user.
  - [x] Broadcast `PRESENCE_SYNC` events with throttled client movement updates (10 Hz).
  - [x] Clean up disconnected user cursors immediately upon socket termination.

- [x] **4. Question Locking & Anti-Collision**
  - [x] Implement `LOCK_QUESTION` handler when an operator clicks into an approval box.
  - [x] Broadcast `QUESTION_LOCKED` to all workspace peers: `"Sarah is currently reviewing..."`.
  - [x] Implement `UNLOCK_QUESTION` on submit, cancel, or socket disconnect.

- [x] **5. Robust Frontend Client Hook (`frontend/src/hooks/useMultiplayerWebSocket.ts`)**
  - [x] Implement exponential backoff auto-reconnect logic on socket drop.
  - [x] Synchronize incoming messages directly into the Zustand `useWorkspaceStore`.
  - [x] Expose throttled `sendCursor(coordinateX, coordinateY)` and question lock/unlock actions.

---

## Definition of Done (DoD)
1. WebSocket integration tests verify concurrent clients in the same workspace receive broadcast events within 15ms (`TestMultiplayerWebSocketIntegration` passed).
2. Cross-node cluster tests verify an event emitted on Node 1 arrives at a client connected to Node 2 via Redis Pub/Sub (`TestHubClusterMeshCrossNodeBroadcast` passed).
3. Clients in different workspaces never receive events across tenant boundaries (`TestHubWorkspaceIsolation` passed).
4. Rapid cursor movements from concurrent simulated users stream without socket stalls (`TestMultiplayerWebSocketIntegration` passed).
5. Disconnecting a client immediately cleans up its cursor and releases any held question locks (`TestHubPresenceLeaveAndUnlockOnDisconnect` passed).

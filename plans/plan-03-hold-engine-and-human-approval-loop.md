# Plan 03: Hold Engine & Human Approval Loop

**Status:** Upcoming [ ]

## Objective
Implement the synchronous pause-and-answer channel architecture (`HoldEngine`) with a 45-second timeout, multi-operator concurrency locks, Redis cross-node resolution mesh, and graceful fallback to asynchronous review queues when approvals exceed provider limits.

---

## Deliverables

- [ ] **1. Synchronous Channel Coordinator (`backend/internal/mcp/hold_engine.go`)**
  - [ ] Implement `Hold(ctx, req, timeout)` holding cloud agent HTTP/SSE tool connections open for up to 45 seconds.
  - [ ] Implement `Resolve(id, result)` pushing human decisions into awaiting channels.
  - [ ] Guarantee thread safety via fine-grained `sync.RWMutex` and atomic slot eviction.

- [ ] **2. Redis Pub/Sub Cross-Node Resolution Mesh (`backend/internal/mcp/redis_hold_adapter.go`)**
  - [ ] Enable horizontal switchboard clustering: when an agent is held on Node 1, and an operator submits resolution to Node 2, publish `approval:resolved:{id}` to Redis.
  - [ ] Node 1 consumes the Redis event and unblocks its waiting in-memory channel in < 5ms.
  - [ ] Fall back cleanly to local in-memory channel resolution when Redis is unconfigured (development mode).

- [ ] **3. Concurrency & Double-Approval Protection**
  - [ ] Implement `Claim(approvalID, operatorID)` with Redis distributed lock (`lock:approval:{id}`) to lock a question while typing a reply.
  - [ ] Enforce database-level atomic transitions: `UPDATE approvals SET status = 'approved', resolved_by = $2, answer = $3, resolved_at = NOW() WHERE id = $1 AND status = 'pending'`.
  - [ ] Broadcast `QUESTION_LOCKED` and `QUESTION_UNLOCKED` events over WebSockets to show teammate typing indicators.

- [ ] **4. 45-Second Graceful Timeout Fallback**
  - [ ] Detect when no operator claims or answers a request within 45 seconds.
  - [ ] Return a structured JSON-RPC response to the cloud agent:
    ```json
    { "status": "queued_for_review", "message": "Approval queued. Please sleep; Dotdeck will wake you upon human decision." }
    ```
  - [ ] Transition agent state badge to `resting` on the visual canvas.
  - [ ] Queue outbound alert to configured wake-up bridges (Slack/webhook).

- [ ] **5. Decision REST API Handler (`backend/internal/api/handlers/approvals.go`)**
  - [ ] Implement `POST /api/v1/approvals/resolve` accepting `approved: boolean` and `answer: string`.
  - [ ] Enforce workspace RBAC policy (`RequireRole(RoleWrite)`).
  - [ ] Deliver immediate inline response if within 45s, or queue outbound wake-up bridge trigger if past 45s.
  - [ ] Return standardized response via `pkg/response`.

---

## Definition of Done (DoD)
1. Unit tests pass verifying instant inline resolution within 50ms.
2. Cross-node test verifies an approval submitted to a mock secondary node successfully unblocks a held channel on the primary node via Redis Pub/Sub.
3. Timeout test passes verifying agent receives clean `queued_for_review` payload after 45s without hung goroutines.
4. Attempting simultaneous approvals from two operators resolves exactly once and returns `HTTP 409 Conflict` to the second operator.

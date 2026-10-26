# Plan 03: Hold Engine & Human Approval Loop

**Status:** Upcoming [ ]

## Objective
Implement the synchronous pause-and-answer channel architecture (`HoldEngine`) with a 45-second timeout, multi-operator concurrency locks, and graceful fallback to asynchronous review queues when approvals exceed provider limits.

---

## Deliverables

- [ ] **1. Synchronous Channel Coordinator (`backend/internal/mcp/hold_engine.go`)**
  - [ ] Implement `Hold(ctx, req, timeout)` holding cloud agent HTTP/SSE tool connections open for up to 45 seconds.
  - [ ] Implement `Resolve(id, result)` pushing human decisions into awaiting channels.
  - [ ] Guarantee thread safety via fine-grained `sync.RWMutex` and atomic slot eviction.

- [ ] **2. Concurrency & Double-Approval Protection**
  - [ ] Implement `Claim(approvalID, operatorID)` to allow operators to lock a question while typing a reply.
  - [ ] Enforce database-level atomic transitions: `UPDATE approvals SET status = 'approved' WHERE id = $1 AND status = 'pending'`.
  - [ ] Broadcast `QUESTION_LOCKED` and `QUESTION_UNLOCKED` events over WebSockets to show teammate typing indicators.

- [ ] **3. 45-Second Graceful Timeout Fallback**
  - [ ] Detect when no operator claims or answers a request within 45 seconds.
  - [ ] Return a structured JSON-RPC response to the cloud agent:
    ```json
    { "status": "queued_for_review", "message": "Approval queued. Please sleep; Dotdeck will wake you upon human decision." }
    ```
  - [ ] Transition agent state badge to `resting` on the visual canvas.

- [ ] **4. Decision API Handler (`backend/internal/api/approvals.go`)**
  - [ ] Implement `POST /api/v1/approvals/resolve` accepting `approved: boolean` and `answer: string`.
  - [ ] Restrict resolution rights to operators with `write` or `admin` roles in the workspace.
  - [ ] Deliver immediate inline response if within 45s, or queue outbound wake-up bridge trigger if past 45s.

---

## Definition of Done (DoD)
1. Unit tests pass verifying instant inline resolution within 100ms.
2. Timeout test passes verifying agent receives clean `queued_for_review` payload after 45s without hung goroutines.
3. Attempting simultaneous approvals from two operators resolves exactly once and returns `ErrAlreadyClaimed` to the second operator.

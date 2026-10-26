# Plan 04: Outbound Wake-Up Bridges

**Status:** Completed [x]

## Objective
Build outbound wake-up bridge connectors (Slack threads, HMAC-signed webhooks, and email triggers) to wake sleeping cloud agents when human decisions or steering prompts are dispatched from the Dotdeck canvas.

---

## Deliverables

- [x] **1. Slack Thread Wake-Up Connector (`backend/internal/bridge/slack.go`)**
  - [x] Support Slack incoming webhooks and bot tokens for channel/thread notifications.
  - [x] Implement `WakeAgent(ctx, agentName, prompt)` formatting rich Slack blocks with agent context.
  - [x] Provide configurable thread reply mapping to wake Dots/Bots listening in dedicated Slack channels.

- [x] **2. HMAC-Signed Webhook Dispatcher (`backend/internal/bridge/webhook.go`)**
  - [x] Format structured JSON envelopes with timestamp, event type, and payload.
  - [x] Compute `X-Dotdeck-Signature` using SHA-256 HMAC for payload verification.
  - [x] Implement exponential backoff and retry policy (up to 3 attempts) for transient endpoint failures.

- [x] **3. Late Approval Wake-Up Trigger**
  - [x] Wire `POST /api/v1/approvals/resolve` to check if the held MCP connection had already timed out.
  - [x] If timed out, automatically trigger the agent's configured wake-up bridge (Slack or webhook) with the human's approved answer.

- [x] **4. Direct Steering REST API (`backend/internal/api/handlers/agents.go` & `routes.go`)**
  - [x] Implement `POST /api/v1/agents/{id}/steer` accepting operator instructions from the chat inspector.
  - [x] Dispatch prompt through the wake-up bridge to wake the target agent immediately.
  - [x] Record human steering message in audit logs.
  - [x] Return standardized JSON via `pkg/response`.

---

## Definition of Done (DoD)
1. Unit tests verify `WakeAgent` generates valid JSON payloads and signs requests with HMAC-SHA256 headers (`TestWebhookBridgeHMACSignature` passed).
2. Resolving an expired approval automatically fires a simulated wake-up webhook to the agent's callback URL (`TestApprovalHandlerResolve_LateApprovalWakesAgent` passed).
3. Chatting with a resting agent from the inspector dispatches an outbound wake-up request within 500ms (`TestAgentHandlerSteer_Success` passed in 0.00s).

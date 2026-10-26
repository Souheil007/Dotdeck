# Dotdeck System Architecture Overview

Dotdeck is a vendor-neutral cross-vendor orchestration and command hub for Tier 3 closed cloud agents (OpenAI Dots, Grok Bots, Meta Muse, and Claude Cloud Agents).

---

## 1. High-Level Architecture

```
 [ OpenAI Dot ]                [ Grok Bot ]                 [ Meta Muse ]
 (Cloud Computer)              (Cloud Computer)             (Muse Secure VM)
       │                             │                            │
       └──────────────┬──────────────┴──────────────┬─────────────┘
                      │  1. Outbound: MCP Tool Calls (Thoughts, Questions, Handoffs)
                      │  2. Inbound: Held Responses & Slack/Email Wake-up Triggers
                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       GO BACKEND ("THE SWITCHBOARD")                     │
│                                                                          │
│  ┌──────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │ Multi-Tenant MCP Hub │  │ Agent-to-Agent     │  │ State & Schedule │  │
│  │ (/mcp/{agent_token}) │  │ Mailbox Router     │  │ Engine           │  │
│  └──────────┬───────────┘  └─────────┬──────────┘  └────────┬─────────┘  │
│             └────────────────────────┼──────────────────────┘            │
│                                      ▼                                   │
│                     [ WebSocket Event Broadcaster ]                      │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     VISUALIZER FRONTEND (React Flow)                     │
│  • Visual Node Graph (Live edges showing Agent A messaging Agent B)      │
│  • Node Badges: [Resting] [Working] [Scheduled] [Needs Input]            │
│  • Click Node -> Slide-out Inspector: Thought Timeline, Chat & Approvals │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### 2.1 Multi-Tenant MCP Switchboard (`internal/mcp`)
- Serves dynamic tool schemas at `/mcp/{agent_token}` over JSON-RPC 2.0 (Streamable HTTP / SSE).
- Dynamically discovers canvas connections between agents and injects `delegate_task_to_<peer>` tools.
- Enforces mandatory `current_reasoning_trace` and `next_planned_step` fields inside operational tools to capture continuous thought telemetry.

### 2.2 Synchronous Hold Engine (`internal/mcp/hold_engine.go`)
- Coordinates human-in-the-loop decisions across cloud agent tool calls (`ask_human_question`).
- Pauses the inbound HTTP/SSE connection for up to **45 seconds** awaiting an operator's click or instruction.
- If the deadline expires without human response, returns a clean `QUEUED_FOR_REVIEW` payload instructing the agent to suspend execution until woken via external bridges.

### 2.3 Outbound Wake-Up Bridges (`internal/bridge`)
- Wakes sleeping agents when human operators send direct instructions or resolve delayed approvals.
- Connects to Slack channels/threads, HMAC-signed webhooks, and email triggers.

### 2.4 Multiplayer Real-Time Engine (`internal/websocket`)
- Built on `coder/websocket` for context cancellation safety and high-concurrency fan-out.
- Tracks live operator cursor positions `(x, y)` and provides visual avatar stacks.
- Broadcasts optimistic question locks (`LOCK_QUESTION`) to prevent double-approval conflicts.

---

## 3. Data Flow: Cross-Vendor Delegation Lifecycle

```
[Agent A: OpenAI Dot]
   │
   │ 1. Calls delegate_task_to_grok_bot(payload, reasoning_trace)
   ▼
[Go MCP Switchboard]
   │
   │ 2. Validates edge in database
   │ 3. Stores thought event & broadcasts HANDOFF_EMITTED over WebSocket
   │ 4. Dispatches wake-up trigger to Grok Bot via Slack/Webhook Bridge
   ▼
[React Flow Canvas]
   │
   │ 5. Animates glowing packet traveling along edge wire between A and B
   ▼
[Agent B: Grok Bot]
   │
   │ 6. Wakes up, fetches handoff artifact, and reports first thought step
   ▼
[Go Switchboard -> Canvas]
   │
   │ 7. Node B switches to Emerald Pulsing [Working] state
```

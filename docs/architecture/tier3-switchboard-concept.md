# Tier 3 Closed Cloud Agent Orchestration Concept

This document details the core architectural rationale behind **Dotdeck**'s exclusive focus on Tier 3 Closed Cloud / SaaS Agents.

---

## 1. The Agent Taxonomy

| Tier | Category | Examples | Execution Environment | Dotdeck Scope |
| :--- | :--- | :--- | :--- | :---: |
| **Tier 1** | Local CLI Agents | Claude Code, Cursor, Aider | Local developer machine (POSIX PTY) | ❌ Excluded |
| **Tier 2** | Self-Hosted Open Models | Ollama, vLLM, DeepSeek locally | User Docker / Kubernetes clusters | ❌ Excluded |
| **Tier 3** | **Closed Cloud / SaaS Agents** | **OpenAI Dots, Grok Bots, Meta Muse, Claude** | **Vendor Cloud Computer / Secure VMs** | ✅ **100% Core Focus** |

---

## 2. Why Focusing Exclusively on Tier 3 is a Strategic Superpower

### 2.1 Eliminating Local POSIX PTY Headaches
Managing local terminal processes (Tier 1) requires handling Windows ConPTY quirks, zombie processes, VT100 terminal emulation, Docker daemon crashes, and operating system permission boundaries. 

By eliminating local PTYs, the Go backend becomes a **Cross-Vendor Agent Command Hub**—essentially *"Slack + Linear + Visual Node Graph for Cloud AI Teammates."*

### 2.2 Ultra-Low Infrastructure Cost (90%+ SaaS Margins)
Because heavy LLM inference and agent VM compute execute inside the user's proprietary OpenAI, xAI, or Anthropic subscriptions, Dotdeck incurs **zero LLM inference costs**. 

A single Go instance handles thousands of concurrent workspaces by passing lightweight JSON-RPC packets, holding Go channels open, and synchronizing WebSockets.

### 2.3 True Cross-Vendor Neutrality
OpenAI will never build a visual dashboard to manage xAI Grok Bots. Anthropic will never build a canvas to monitor Meta Muse. Dotdeck occupies the neutral high ground—the single pane of glass teams keep open all day.

---

## 3. Engineering Around Proprietary Cloud Walls

Because vendors do not provide public `POST /api/create-dot` APIs to spawn VMs, we engineer around their proprietary walls using two universal primitives:

### 3.1 The "Blueprint & 1-Click Bootstrap"
1. Users design an agent node visually on the Dotdeck canvas (Goal, Schedule, Rules, Peer Wires).
2. Go generates a **unique MCP URL** (`https://hub.dotdeck.io/mcp/ag_89f2a`) and an **8-part Bootstrap Prompt**.
3. The user pastes this prompt once into their OpenAI Dot or Grok Bot.
4. The agent fires `mcp.initialize()`, immediately "pairing" with the platform and illuminating the canvas node from gray to green.

### 3.2 The 45-Second Held Response Loop
When an agent reaches an authority boundary and calls `ask_human_question(question, reasoning)`:
1. Go holds the HTTP/SSE connection open via an in-memory channel.
2. The React UI displays an inline approval alert.
3. If an operator clicks [Approve] within 45 seconds, the response returns inline in the tool-call body without interrupting the agent's turn.
4. If 45 seconds pass without human action, Go returns a `QUEUED_FOR_REVIEW` payload instructing the agent to pause. Once the human answers later, Dotdeck wakes the agent via Slack or webhook triggers.

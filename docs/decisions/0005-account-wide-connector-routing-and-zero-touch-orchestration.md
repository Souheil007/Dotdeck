# ADR 0005: Account-Wide Connector Routing and Zero-Touch Multi-Agent Orchestration

- **Status:** Accepted
- **Date:** 2026-10-28
- **Context:** Resolving connector collisions in account-wide AI platforms (xAI Grok, OpenAI GPTs) and defining zero-touch orchestration patterns without API token lock-in.

---

## Context & Problem Statement

Tier 3 Closed Cloud Agent platforms (such as xAI Grok and OpenAI Custom GPTs) register custom MCP connectors at the **account level**, rather than scoping them per bot. 

If an operator creates 5 Grok bots and registers 5 separate Dotdeck MCP endpoints, every single bot on the account inherits all 5 connectors simultaneously, resulting in a **$5 \times N$ tool explosion**. Every bot's context window becomes polluted with duplicate tool definitions (`complete_task`, `fetch_pipeline_deliverable`), leading to severe tool selection collisions and hallucinations.

Furthermore, operators require mechanisms to chain agents autonomously across proprietary vendor clouds without incurring high developer API token fees.

---

## Decision

1. **Single Workspace Hub per Vendor Account**:
   - Operators install **only 1 MCP connector per workspace** in their vendor account:
     `https://<domain>/mcp/ws/{workspace_id}`
   - Every connected bot sees **exactly 1 set of 4 tools** (`report_thought_step`, `ask_human_question`, `complete_task`, `fetch_pipeline_deliverable`).

2. **Dual-Path Disambiguation Architecture**:
   - **Cross-Vendor Partitioning**: When requests arrive from different platforms (e.g. OpenAI vs. xAI vs. Claude), Dotdeck automatically infers the vendor from client headers (`inferProvider`) and routes traffic to the matching agent node.
   - **Intra-Account `agent_name` Resolution**: When multiple bots share the same vendor account, tools accept an optional `agent_name` parameter. Each bot is instructed in its prompt to declare its canvas name. Dotdeck matches `agent_name` against the workspace graph at runtime, routing deliverables and thoughts to the exact canvas node.

3. **Pure-MCP Zero-Touch Execution**:
   - Deliverable handoffs across canvas edges are executed via standard MCP JSON-RPC without requiring developer API keys.
   - Downstream agents retrieve upstream artifacts using `fetch_pipeline_deliverable`.
   - Downstream idle states are governed by a 60-second inactivity timer returning agents from `working` to `resting`.

---

## Consequences

### Positive
- **Zero Tool Explosion**: Eliminates duplicate tool definitions in agent context windows; tool count remains constant at 4.
- **Zero API Inference Costs**: Users orchestrate external cloud subscriptions they already pay for (ChatGPT Plus/Pro, Grok on X, Claude Pro) without per-token charges.
- **Full Security Boundary**: Provides human-in-the-loop held approval gating and token scoping that closed cloud vendors natively lack.
- **Deterministic DAG Execution**: Agents receive clean, versioned deliverable payloads rather than noisy conversational chat banter.

### Negative
- Multi-bot intra-account setups require a one-line system prompt instruction specifying the bot's `agent_name`.
- Fully automated zero-touch execution across consumer web tabs relies on held MCP polling loops, browser sidecar relays, or asynchronous Slack/webhook bridges.

# ADR 0002: Dynamic MCP Tool Synthesis & Held Approval Channels

- **Status:** Accepted
- **Date:** 2026-10-26
- **Context:** Deciding how cloud agents request human approval and delegate tasks across visual edges.

## Context & Problem Statement
Closed cloud agents enforce strict tool-call timeouts (typically 60 to 120 seconds). If an agent pauses to ask a human operator for approval, a traditional polling queue requires the agent to end its turn and be woken up later. However, if the operator answers quickly (within seconds), interrupting the turn adds unnecessary latency and token churn.

## Decision
1. Implement a **45-second held Go channel (`HoldEngine`)**:
   - If the operator responds within 45s, return the human verdict inline directly inside the tool response.
   - If 45s elapses, return `QUEUED_FOR_REVIEW` and transition the agent to resting.
2. Synthesize dynamic MCP tools from canvas edges:
   - When Edge(A → B) is created, dynamically inject `delegate_task_to_b` into Agent A's schema.

## Consequences
- **Positive:**
  - Fast decisions (<45s) execute inline with near-zero latency.
  - Safe against cloud provider HTTP request timeouts.
  - Visual wires directly control what tools the cloud agent is allowed to invoke.
- **Negative:**
  - Requires in-memory holding registry (`HoldEngine`) with fine-grained mutex concurrency controls.

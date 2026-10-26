# ADR 0001: Exclusively Orchestrate Tier 3 Closed Cloud Agents

- **Status:** Accepted
- **Date:** 2026-10-26
- **Context:** Deciding scope between local CLI agents (PTYs) vs. proprietary cloud agents.

## Context & Problem Statement
Early agent management prototypes attempted to manage local terminal PTYs (Claude Code, Cursor CLI) alongside cloud agents. This required handling Windows ConPTY emulation bugs, OS zombie processes, and complex Docker socket mounting, which fragmented engineering focus and bloated infrastructure costs.

## Decision
Dotdeck focuses **100% exclusively on Tier 3 Closed Cloud / SaaS Agents** (OpenAI Dots, Grok Bots, Meta Muse, and Claude Cloud Agents). 

We do not own the execution VMs. We provide an MCP Switchboard and Webhook Bridge that agents connect to over the internet.

## Consequences
- **Positive:**
  - 90% reduction in OS-specific bugs (no POSIX/Windows terminal handling).
  - High SaaS margins: Zero LLM token inference cost or GPU hosting cost.
  - Clear market positioning as the neutral "Switzerland of Cloud Agents".
- **Negative:**
  - Cannot programmatically provision new cloud VMs via REST APIs; requires a 60-second copy-paste pairing step.
  - Relies on external agent VMs maintaining network connectivity to the switchboard.

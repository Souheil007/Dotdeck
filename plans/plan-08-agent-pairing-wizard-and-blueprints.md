# Plan 08: Agent Pairing Wizard & Blueprints

**Status:** Completed [x]

## Objective
Build the 60-second "Blueprint-to-Paired" onboarding wizard, generating tailored bootstrap instruction prompts and unique MCP endpoints for OpenAI Dots, Grok Bots, Meta Muse, and Claude Cloud Agents.

---

## Deliverables

- [x] **1. Agent Creation Modal (`frontend/src/components/modals/CreateAgentModal.tsx`)**
  - [x] Canvas button to add new agent node with provider selection (OpenAI Dot, Grok Bot, Meta Muse, Claude).
  - [x] Configure Goal, Schedule (e.g., cron or "Every day at 9 AM"), and Authority Rules.
  - [x] Call `POST /api/v1/agents` to provision the database record and token.

- [x] **2. Vendor-Specific Bootstrap Prompt Generator (`backend/internal/api/handlers/agents.go`)**
  - [x] Generate prompt tailored to the provider's instruction format:
    - OpenAI Dots: 8-part instruction framework (Goal, Scope, Standards, Authority, Telemetry).
    - Grok Bots: Cloud Computer instructions with tool-calling conventions.
    - Claude / Meta Muse: Check-in portal URL and email/webhook instructions.
  - [x] Embed the unique `/mcp/{token}` endpoint and mandatory telemetry rules.

- [x] **3. 3-Step Pairing Wizard Modal (`frontend/src/components/modals/PairingWizard.tsx`)**
  - [x] Step 1: One-click "Copy MCP URL" button with clipboard feedback.
  - [x] Step 2: One-click "Copy Bootstrap Prompt" with syntax-highlighted preview.
  - [x] Step 3: Live pulsing listener waiting for incoming `mcp.initialize()` from the cloud provider.

- [x] **4. Instant Heartbeat Transition**
  - [x] When the cloud agent calls `initialize()`, Go backend flips status to `resting` and broadcasts `AGENT_STATE_CHANGED`.
  - [x] UI plays a pulse/confetti animation, turns the node border green/emerald, and closes the wizard.

---

## Definition of Done (DoD)
1. Creating an agent generates a cryptographically secure token and valid MCP endpoint.
2. Pasting the bootstrap prompt and URL into a simulated agent triggers `initialize()` and transitions the UI node to green within 1 second.
3. Clipboard copy works reliably across all modern browsers.

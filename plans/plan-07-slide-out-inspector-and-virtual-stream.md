# Plan 07: Slide-Out Inspector & Virtual Stream

**Status:** Upcoming [ ]

## Objective
Create the slide-out inspector drawer featuring a virtualized step-by-step reasoning feed, interactive approval resolution cards with operator locking, and direct wake-up chat steering.

---

## Deliverables

- [ ] **1. Slide-Out Inspector Drawer (`frontend/src/components/inspector/InspectorDrawer.tsx`)**
  - [ ] Implement responsive right-side drawer keeping the canvas visible on the left.
  - [ ] Support tabbed switching between `Thought Stream` and `Approvals`.
  - [ ] Display live agent status badge, provider details, and quick close toggle.

- [ ] **2. Virtualized Reasoning Stream (`frontend/src/components/inspector/ThoughtStream.tsx`)**
  - [ ] Integrate `@tanstack/react-virtual` for DOM recycling across thousands of historical steps.
  - [ ] Render step index, timestamp, formatted analytical hypothesis, and next planned action.
  - [ ] Group thoughts by execution run with expandable collapsible run headers.

- [ ] **3. Interactive Approval Resolution Box (`frontend/src/components/inspector/ApprovalBox.tsx`)**
  - [ ] Display question, rationale, and clickable quick-choice option pills.
  - [ ] Display operator locking indicator: `"Sarah is reviewing this approval"`.
  - [ ] Provide one-click `[Approve]`, `[Reject]`, and custom modified instruction inputs.
  - [ ] Wire submit button to call `POST /api/v1/approvals/resolve`.

- [ ] **4. Direct Steering Chat Box (`frontend/src/components/inspector/ChatBox.tsx`)**
  - [ ] Text bar allowing operators with `write` role to dispatch prompts directly to agents.
  - [ ] Show loading state and dispatch confirmations.
  - [ ] Disable input when in read-only observer mode.

---

## Definition of Done (DoD)
1. Virtualized thought feed scrolls smoothly with 5,000+ historical thought events without frame drops.
2. Clicking an approval choice resolves the request and unblocks the agent within 200ms.
3. Teammate typing indicator renders on other operators' screens when a user focuses the reply input.
4. Read-only users see approval and chat controls disabled with clear informational badges.

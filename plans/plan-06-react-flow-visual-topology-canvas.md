# Plan 06: React Flow Visual Topology Canvas

**Status:** Upcoming [ ]

## Objective
Build the interactive React Flow visual canvas (`@xyflow/react`) featuring Living Node cards with 5 distinct execution states, real-time thought tickers, animated pulse edges, and drag-and-drop cross-vendor tool wiring.

---

## Deliverables

- [ ] **1. Living Node Component (`frontend/src/components/canvas/nodes/AgentNode.tsx`)**
  - [ ] Implement 5 distinct visual state rings:
    - `unpaired`: Dashed gray border with quick "Pair Agent" button.
    - `resting`: Dim blue ring showing last run result and next schedule.
    - `scheduled`: Cyan border with countdown timer pill.
    - `working`: Pulsing emerald border with live streaming thought ticker directly on the card.
    - `blocked_on_user`: Flashing amber ring with inline approval alert badge.
    - `failed`: Rose border with error indicator.
  - [ ] Support provider iconography (OpenAI Dot, Grok Bot, Meta Muse, Claude).
  - [ ] Render input/output connection handles with snap-to-grid alignment.

- [ ] **2. Animated Packet Edge (`frontend/src/components/canvas/edges/PulseEdge.tsx`)**
  - [ ] Render smooth Bezier curves with animated SVG dash arrays showing active packet flow.
  - [ ] Render centered clickable "Handoff Pill" displaying the generated tool name.
  - [ ] Clicking the pill opens a preview of the structured JSON artifacts passed between the agents.

- [ ] **3. Canvas Interaction & Dynamic Wiring (`frontend/src/components/canvas/AgentCanvas.tsx`)**
  - [ ] Wire React Flow `onConnect` to call backend `POST /api/v1/agents/edges`.
  - [ ] Update source agent's dynamic MCP tool schema immediately upon edge connection.
  - [ ] Support multi-selection, panning, zooming, and mini-map navigation.

- [ ] **4. Auto-Layout / Tidy Canvas Engine**
  - [ ] Integrate Dagre or ELK auto-layout algorithm for one-click hierarchy organization.
  - [ ] Persist node `(position_x, position_y)` updates to backend via debounced position API.

---

## Definition of Done (DoD)
1. Canvas smoothly renders 20+ interconnected agent nodes and edges at 60fps.
2. Dragging a wire from Agent A to Agent B fires `POST /api/v1/agents/edges` and renders an animated `PulseEdge`.
3. Emitting a thought event immediately illuminates the target node with a pulsing emerald ring and updates its ticker.
4. Canvas state persists across browser page reloads.

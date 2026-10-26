# Plan 09: Workspace Collaboration & RBAC

**Status:** Upcoming [ ]

## Objective
Implement multi-user workspace collaboration with granular Role-Based Access Control (`Admin`, `Operator / Write`, `Observer / Read`) and viral public read-only showcase links.

---

## Deliverables

- [ ] **1. RBAC Middleware & Security Enforcement (`backend/internal/api/middleware/rbac.go`)**
  - [ ] Enforce permission hierarchy: `Admin` > `Write` > `Read`.
  - [ ] Protect mutation routes (`POST /agents`, `POST /agents/edges`, `POST /approvals/resolve`) behind `RequireRole(RoleWrite)`.
  - [ ] Protect member management and billing routes behind `RequireRole(RoleAdmin)`.

- [ ] **2. Teammate Invitation & Member Management (`backend/internal/api/handlers/workspaces.go`)**
  - [ ] Implement `POST /api/v1/workspaces/invite` assigning email and role.
  - [ ] Generate invitation tokens with expiration.
  - [ ] List active members with roles in workspace settings.
  - [ ] Return standardized JSON via `pkg/response`.

- [ ] **3. UI Permission Gating**
  - [ ] Adapt canvas for read-only observers: disable node dragging, connection wire drawing, and deletion.
  - [ ] Lock approval resolution buttons and direct chat inputs for read-only users.
  - [ ] Display current role badge (`[👑 Admin]`, `[⚡ Operator]`, `[👁️ Observer]`) in navbar.

- [ ] **4. Public Read-Only Showcase Links**
  - [ ] Implement `POST /api/v1/workspaces/{id}/showcase-link` generating an unguessable read-only link.
  - [ ] Support unauthenticated public viewers to watch live 24/7 agent operations.
  - [ ] Render a sleek `"Powered by Dotdeck — Build Your Fleet"` badge in the bottom-left corner driving viral signups.

---

## Definition of Done (DoD)
1. Requests from a `read` role token to `POST /approvals/resolve` are rejected with HTTP 403 Forbidden.
2. Opening a public showcase link loads the live canvas and streams real-time agent thoughts without requiring login.
3. Observers cannot move nodes or resolve approvals on the canvas.

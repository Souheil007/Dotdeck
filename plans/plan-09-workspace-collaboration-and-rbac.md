# Plan 09: Workspace Collaboration & RBAC

**Status:** Completed [x]

## Objective
Implement multi-user workspace collaboration with granular Role-Based Access Control (`Admin`, `Operator / Write`, `Observer / Read`) and viral public read-only showcase links.

---

## Deliverables

- [x] **1. RBAC Middleware & Security Enforcement (`backend/internal/api/middleware/rbac.go`)**
  - [x] Enforce permission hierarchy: `Admin` > `Write` > `Read`.
  - [x] Protect mutation routes (`POST /agents`, `POST /agents/edges`, `POST /approvals/resolve`) behind `RequireRole(RoleWrite)`.
  - [x] Protect member management and billing routes behind `RequireRole(RoleAdmin)`.

- [x] **2. Teammate Invitation & Member Management (`backend/internal/api/handlers/workspaces.go`)**
  - [x] Implement `POST /api/v1/workspaces/invite` assigning email and role.
  - [x] Generate invitation tokens with expiration.
  - [x] List active members with roles in workspace settings.
  - [x] Return standardized JSON via `pkg/response`.

- [x] **3. UI Permission Gating**
  - [x] Adapt canvas for read-only observers: disable node dragging, connection wire drawing, and deletion.
  - [x] Lock approval resolution buttons and direct chat inputs for read-only users.
  - [x] Display current role badge (`[👑 Admin]`, `[⚡ Operator]`, `[👁️ Observer]`) in navbar.

- [x] **4. Public Read-Only Showcase Links**
  - [x] Implement `POST /api/v1/workspaces/{id}/showcase-link` generating an unguessable read-only link.
  - [x] Support unauthenticated public viewers to watch live 24/7 agent operations.
  - [x] Render a sleek `"Powered by Dotdeck — Build Your Fleet"` badge in the bottom-left corner driving viral signups.

---

## Definition of Done (DoD)
1. Requests from a `read` role token to `POST /approvals/resolve` are rejected with HTTP 403 Forbidden.
2. Opening a public showcase link loads the live canvas and streams real-time agent thoughts without requiring login.
3. Observers cannot move nodes or resolve approvals on the canvas.

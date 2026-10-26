# Plan 01: Database Persistence & Migrations

**Status:** Upcoming [ ]

## Objective
Establish production-grade PostgreSQL persistence using `jackc/pgx/v5` and `sqlc` to reliably store multi-tenant workspaces, members, agents, canvas edges, thought streams, and pending approvals.

---

## Deliverables

- [ ] **1. Migration Runner (`backend/cmd/migrate/main.go`)**
  - [ ] Implement command-line migration tool supporting `up` and `down` commands.
  - [ ] Execute idempotent SQL migrations from `backend/internal/store/migrations/`.
  - [ ] Track applied migration versions in a `schema_migrations` table.

- [ ] **2. Connection Pool Management (`backend/internal/store/db.go`)**
  - [ ] Configure `pgxpool.Pool` with connection limits, idle timeouts, and automatic retry.
  - [ ] Expose health check function validating database connectivity.
  - [ ] Bind pool lifecycle to context cancellation for graceful shutdown.

- [ ] **3. SQLC Code Generation**
  - [ ] Generate 100% type-safe Go structs and query interfaces using `sqlc generate`.
  - [ ] Validate queries across:
    - `workspaces.sql` (CRUD, slugs, members)
    - `agents.sql` (CRUD, status transitions, position coordinates, canvas edges)
    - `thoughts.sql` (time-ordered milestone ingestion and pagination)
    - `approvals.sql` (atomic status updates and pending review queues)

- [ ] **4. Postgres Repository Implementation (`backend/internal/store/postgres.go`)**
  - [ ] Implement `mcp.AgentRepository` backed by generated sqlc queries.
  - [ ] Enforce workspace tenant boundaries across all database queries.
  - [ ] Replace temporary in-memory store in `cmd/server/main.go` when `DATABASE_URL` is configured.

---

## Definition of Done (DoD)
1. `go run cmd/migrate/main.go up` runs cleanly against a fresh PostgreSQL instance and creates all tables.
2. `sqlc generate` runs without warnings and emits type-safe Go interfaces into `backend/internal/store/db/`.
3. Unit and integration tests verify agent status transitions, thought logging, and approval updates persist reliably.
4. Server boots cleanly with database connectivity validated via the `/health` endpoint.

# Plan 01: Database Persistence & Migrations

**Status:** Upcoming [ ]

## Objective
Establish production-grade PostgreSQL persistence using `jackc/pgx/v5` and `sqlc` to reliably store multi-tenant workspaces, members, agents, canvas edges, pending approvals, and high-throughput monthly range-partitioned thought streams.

---

## Deliverables

- [ ] **1. Migration Runner (`backend/cmd/migrate/main.go`)**
  - [ ] Implement command-line migration tool supporting `up` and `down` commands with `-database-url` and `-steps`.
  - [ ] Execute idempotent SQL migrations from `backend/internal/store/migrations/`.
  - [ ] Track applied migration versions in a `schema_migrations` tracking table.

- [ ] **2. Monthly Range Partitioning & Schema Migrations (`backend/internal/store/migrations/`)**
  - [ ] Migration `000001_create_workspaces.up.sql` (`workspaces`, `workspace_members`).
  - [ ] Migration `000002_create_agents.up.sql` (`agents`, `agent_edges`).
  - [ ] Migration `000003_create_approvals.up.sql` (`approvals` with pending index).
  - [ ] Migration `000004_create_thought_events_partitioned.up.sql`:
    - Native PostgreSQL monthly range partitioning on `created_at` with composite primary key `(created_at, id)`.
    - Auto-provision current and subsequent 2 months partitions (`thought_events_YYYY_MM`).
    - Create composite indexes on `(workspace_id, created_at DESC)` and `(agent_id, created_at DESC)`.

- [ ] **3. Connection Pool Management (`backend/internal/store/db.go`)**
  - [ ] Configure `pgxpool.Pool` with connection limits (max 50, min 10), 30s idle timeouts, and automatic retry.
  - [ ] Expose health check function validating database connectivity.
  - [ ] Bind pool lifecycle to context cancellation for graceful shutdown.

- [ ] **4. SQLC Code Generation (`sqlc.yaml` & `backend/internal/store/queries/`)**
  - [ ] Generate 100% type-safe Go structs and query interfaces into `backend/internal/store/db/`.
  - [ ] Validate queries across:
    - `workspaces.sql` (CRUD, slugs, members, invitations)
    - `agents.sql` (CRUD, status transitions, position coordinates, canvas edges)
    - `thoughts.sql` (time-ordered milestone ingestion and pagination)
    - `approvals.sql` (atomic status updates and pending review queues)

- [ ] **5. Postgres Repository Implementation (`backend/internal/store/postgres.go`)**
  - [ ] Implement `mcp.AgentRepository` and store interfaces backed by generated sqlc queries.
  - [ ] Enforce workspace tenant boundaries across all database queries.
  - [ ] Map pure domain entities from `backend/internal/domain/`.
  - [ ] Replace temporary in-memory store in `cmd/server/main.go` when `DATABASE_URL` is configured.

---

## Definition of Done (DoD)
1. `go run cmd/migrate/main.go -direction=up` runs cleanly against PostgreSQL and provisions all tables including partitions.
2. `sqlc generate` runs without warnings and emits type-safe Go interfaces into `backend/internal/store/db/`.
3. Unit and integration tests verify agent status transitions, thought logging, and approval updates persist reliably.
4. Server boots cleanly with database connectivity validated via the `/health` endpoint.

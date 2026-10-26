# Plan 01: Database Persistence & Migrations

**Status:** Completed [x]

## Objective
Establish production-grade PostgreSQL persistence using `jackc/pgx/v5` and `sqlc` to reliably store multi-tenant workspaces, members, agents, canvas edges, pending approvals, and high-throughput monthly range-partitioned thought streams.

---

## Deliverables

- [x] **1. Migration Runner (`backend/cmd/migrate/main.go`)**
  - [x] Implement command-line migration tool supporting `up` and `down` commands with `-database-url` and `-steps`.
  - [x] Execute idempotent SQL migrations from `backend/internal/store/migrations/`.
  - [x] Track applied migration versions in a `schema_migrations` tracking table.

- [x] **2. Monthly Range Partitioning & Schema Migrations (`backend/internal/store/migrations/`)**
  - [x] Migration `000001_init_schema.up.sql` (`workspaces`, `workspace_members`).
  - [x] Table schemas for `agents` and `agent_edges`.
  - [x] Table schema for `approvals` with pending index.
  - [x] Table schema for `thought_events`:
    - Native PostgreSQL monthly range partitioning on `created_at` with composite primary key `(created_at, id)`.
    - Auto-provision current and subsequent 2 months partitions (`thought_events_YYYY_MM`) and default partition.
    - Create composite indexes on `(workspace_id, created_at DESC)` and `(agent_id, created_at DESC)`.
  - [x] Migration `000001_init_schema.down.sql` rollback script.

- [x] **3. Connection Pool Management (`backend/internal/store/db.go`)**
  - [x] Configure `pgxpool.Pool` with connection limits (max 50, min 10), 30s idle timeouts, and automatic retry.
  - [x] Expose health check function validating database connectivity (`PingDatabase`).
  - [x] Bind pool lifecycle to context cancellation for graceful shutdown.

- [x] **4. SQLC Code Generation (`sqlc.yaml` & `backend/internal/store/queries/`)**
  - [x] Generate 100% type-safe Go structs and query interfaces into `backend/internal/store/db/`.
  - [x] Validate queries across:
    - `workspaces.sql` (CRUD, slugs, members, invitations)
    - `agents.sql` (CRUD, status transitions, position coordinates, canvas edges)
    - `thoughts.sql` (time-ordered milestone ingestion and pagination)
    - `approvals.sql` (atomic status updates and pending review queues)

- [x] **5. Postgres Repository Implementation (`backend/internal/store/postgres.go`)**
  - [x] Implement `mcp.AgentRepository` and store interfaces backed by generated sqlc queries.
  - [x] Enforce workspace tenant boundaries across all database queries.
  - [x] Map pure domain entities from `backend/internal/domain/`.
  - [x] Connect `cmd/server/main.go` to use PostgreSQL when `DATABASE_URL` is configured, falling back to memory store when unconfigured.

---

## Definition of Done (DoD)
1. [x] `go run cmd/migrate/main.go -direction=up` runs cleanly against PostgreSQL and provisions all tables including partitions.
2. [x] `sqlc generate` runs without warnings and emits type-safe Go interfaces into `backend/internal/store/db/`.
3. [x] Unit and integration tests verify agent status transitions, thought logging, and approval updates persist reliably.
4. [x] Server boots cleanly with database connectivity validated via the `/health` endpoint.

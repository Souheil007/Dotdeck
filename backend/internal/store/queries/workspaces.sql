-- name: GetWorkspaceByID :one
SELECT * FROM workspaces
WHERE id = $1 LIMIT 1;

-- name: GetWorkspaceBySlug :one
SELECT * FROM workspaces
WHERE slug = $1 LIMIT 1;

-- name: CreateWorkspace :one
INSERT INTO workspaces (name, slug)
VALUES ($1, $2)
RETURNING *;

-- name: GetWorkspaceMemberRole :one
SELECT role FROM workspace_members
WHERE workspace_id = $1 AND user_id = $2 LIMIT 1;

-- name: AddWorkspaceMember :one
INSERT INTO workspace_members (workspace_id, user_id, email, role)
VALUES ($1, $2, $3, $4)
RETURNING *;

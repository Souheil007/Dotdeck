-- name: ListAgentsByWorkspace :many
SELECT * FROM agents
WHERE workspace_id = $1
ORDER BY created_at ASC;

-- name: GetAgentByID :one
SELECT * FROM agents
WHERE id = $1 LIMIT 1;

-- name: GetAgentByToken :one
SELECT * FROM agents
WHERE token = $1 LIMIT 1;

-- name: CreateAgent :one
INSERT INTO agents (
    workspace_id, token, name, provider, goal, schedule_cron, authority_rules, status, position_x, position_y
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
) RETURNING *;

-- name: UpdateAgentStatus :exec
UPDATE agents
SET status = $2, last_heartbeat = NOW(), updated_at = NOW()
WHERE id = $1;

-- name: UpdateAgentPosition :exec
UPDATE agents
SET position_x = $2, position_y = $3, updated_at = NOW()
WHERE id = $1;

-- name: ListEdgesByWorkspace :many
SELECT * FROM agent_edges
WHERE workspace_id = $1;

-- name: CreateEdge :one
INSERT INTO agent_edges (workspace_id, source_agent_id, target_agent_id, tool_name)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: DeleteEdge :exec
DELETE FROM agent_edges
WHERE workspace_id = $1 AND source_agent_id = $2 AND target_agent_id = $3;

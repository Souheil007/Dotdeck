-- name: RecordThoughtEvent :one
INSERT INTO thought_events (
    workspace_id, agent_id, run_id, step_index, reasoning_trace, next_planned_step, tool_called, tool_payload
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;

-- name: ListThoughtsByAgent :many
SELECT * FROM thought_events
WHERE agent_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListRecentThoughtsByWorkspace :many
SELECT * FROM thought_events
WHERE workspace_id = $1
ORDER BY created_at DESC
LIMIT $2;

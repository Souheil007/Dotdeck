-- name: CreateApproval :one
INSERT INTO approvals (workspace_id, agent_id, question, options, status)
VALUES ($1, $2, $3, $4, 'pending')
RETURNING *;

-- name: GetApprovalByID :one
SELECT * FROM approvals
WHERE id = $1 LIMIT 1;

-- name: ResolveApproval :one
UPDATE approvals
SET status = $2, resolved_by = $3, resolved_answer = $4, resolved_at = NOW()
WHERE id = $1 AND status = 'pending'
RETURNING *;

-- name: ListPendingApprovals :many
SELECT * FROM approvals
WHERE workspace_id = $1 AND status = 'pending'
ORDER BY created_at ASC;

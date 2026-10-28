// Package store provides PostgreSQL persistence repositories backing Dotdeck.
package store

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Souheil007/Dotdeck/backend/internal/domain"
	"github.com/Souheil007/Dotdeck/backend/internal/mcp"
	"github.com/Souheil007/Dotdeck/backend/internal/store/db"
)

// PostgresStore implements mcp.AgentRepository and enterprise persistence backed by PostgreSQL and sqlc.
type PostgresStore struct {
	pool         *pgxpool.Pool
	queries      *db.Queries
	deliverables sync.Map
}

// NewPostgresStore constructs a repository backed by a pgxpool connection pool.
func NewPostgresStore(databasePool *pgxpool.Pool) *PostgresStore {
	return &PostgresStore{
		pool:    databasePool,
		queries: db.New(databasePool),
	}
}

// GetAgentByToken satisfies mcp.AgentRepository, retrieving agent context by pairing token.
func (store *PostgresStore) GetAgentByToken(token string) (*mcp.AgentContext, error) {
	lookupContext, cancelLookup := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelLookup()

	agentRecord, queryError := store.queries.GetAgentByToken(lookupContext, token)
	if queryError != nil {
		return nil, queryError
	}

	return &mcp.AgentContext{
		ID:          uuidToString(agentRecord.ID),
		WorkspaceID: uuidToString(agentRecord.WorkspaceID),
		Name:        agentRecord.Name,
		Provider:    agentRecord.Provider,
		Goal:        agentRecord.Goal,
		Status:      agentRecord.Status,
	}, nil
}

// GetOutboundEdges satisfies mcp.AgentRepository, resolving target tool links for an agent.
func (store *PostgresStore) GetOutboundEdges(agentID string) ([]mcp.EdgeContext, error) {
	lookupContext, cancelLookup := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelLookup()

	agentUUID, parseError := stringToUUID(agentID)
	if parseError != nil {
		return nil, parseError
	}

	agentRecord, queryError := store.queries.GetAgentByID(lookupContext, agentUUID)
	if queryError != nil {
		return nil, queryError
	}

	edgeRecords, edgesError := store.queries.ListEdgesByWorkspace(lookupContext, agentRecord.WorkspaceID)
	if edgesError != nil {
		return nil, edgesError
	}

	var outboundEdges []mcp.EdgeContext
	for _, edge := range edgeRecords {
		if uuidToString(edge.SourceAgentID) == agentID {
			targetAgent, targetError := store.queries.GetAgentByID(lookupContext, edge.TargetAgentID)
			if targetError == nil {
				outboundEdges = append(outboundEdges, mcp.EdgeContext{
					TargetAgentID:       uuidToString(edge.TargetAgentID),
					TargetAgentName:     targetAgent.Name,
					TargetAgentGoal:     targetAgent.Goal,
					TargetAgentProvider: string(targetAgent.Provider),
					ToolName:            edge.ToolName,
				})
			}
		}
	}

	return outboundEdges, nil
}

// UpdateStatus satisfies mcp.AgentRepository, updating the agent's state badge and heartbeat.
func (store *PostgresStore) UpdateStatus(agentID, status string) error {
	updateContext, cancelUpdate := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelUpdate()

	agentUUID, parseError := stringToUUID(agentID)
	if parseError != nil {
		return parseError
	}

	return store.queries.UpdateAgentStatus(updateContext, db.UpdateAgentStatusParams{
		ID:     agentUUID,
		Status: status,
	})
}

// RecordThought satisfies mcp.AgentRepository, saving an analytical step into the partitioned stream.
func (store *PostgresStore) RecordThought(agentID string, step int, trace, nextStep, tool string, payload interface{}) error {
	recordContext, cancelRecord := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelRecord()

	agentUUID, parseError := stringToUUID(agentID)
	if parseError != nil {
		return parseError
	}

	agentRecord, queryError := store.queries.GetAgentByID(recordContext, agentUUID)
	if queryError != nil {
		return queryError
	}

	var serializedPayload []byte
	if payload != nil {
		serializedPayload, _ = json.Marshal(payload)
	}

	_, insertError := store.queries.RecordThoughtEvent(recordContext, db.RecordThoughtEventParams{
		WorkspaceID:     agentRecord.WorkspaceID,
		AgentID:         agentUUID,
		RunID:           uuid.New().String(),
		StepIndex:       int32(step),
		ReasoningTrace:  trace,
		NextPlannedStep: nextStep,
		ToolCalled:      tool,
		ToolPayload:     serializedPayload,
	})

	return insertError
}

// GetThoughts retrieves historical analytical milestones recorded for an agent.
func (store *PostgresStore) GetThoughts(requestContext context.Context, agentID string) ([]domain.ThoughtEvent, error) {
	agentUUID, parseError := stringToUUID(agentID)
	if parseError != nil {
		return nil, parseError
	}

	thoughtRows, queryError := store.queries.ListThoughtsByAgent(requestContext, db.ListThoughtsByAgentParams{
		AgentID: agentUUID,
		Limit:   50,
		Offset:  0,
	})
	if queryError != nil {
		return nil, queryError
	}

	resultEvents := make([]domain.ThoughtEvent, len(thoughtRows))
	for index, thoughtRow := range thoughtRows {
		resultEvents[index] = domain.ThoughtEvent{
			ID:              uuidToString(thoughtRow.ID),
			WorkspaceID:     uuidToString(thoughtRow.WorkspaceID),
			AgentID:         uuidToString(thoughtRow.AgentID),
			RunID:           thoughtRow.RunID,
			StepIndex:       int(thoughtRow.StepIndex),
			ReasoningTrace:  thoughtRow.ReasoningTrace,
			NextPlannedStep: thoughtRow.NextPlannedStep,
			ToolCalled:      thoughtRow.ToolCalled,
			CreatedAt:       thoughtRow.CreatedAt.Time,
		}
	}

	return resultEvents, nil
}

// GetAgentByID fetches a single agent by its UUID primary key.
func (store *PostgresStore) GetAgentByID(requestContext context.Context, agentID string) (*domain.Agent, error) {
	agentUUID, parseError := stringToUUID(agentID)
	if parseError != nil {
		return nil, parseError
	}

	agentRecord, queryError := store.queries.GetAgentByID(requestContext, agentUUID)
	if queryError != nil {
		return nil, queryError
	}

	var rulesList []string
	if len(agentRecord.AuthorityRules) > 0 {
		_ = json.Unmarshal(agentRecord.AuthorityRules, &rulesList)
	}

	var heartbeat *time.Time
	if agentRecord.LastHeartbeat.Valid {
		heartbeat = &agentRecord.LastHeartbeat.Time
	}

	resultAgent := domain.Agent{
		ID:             uuidToString(agentRecord.ID),
		WorkspaceID:    uuidToString(agentRecord.WorkspaceID),
		Token:          agentRecord.Token,
		Name:           agentRecord.Name,
		Provider:       domain.Provider(agentRecord.Provider),
		Goal:           agentRecord.Goal,
		ScheduleCron:   agentRecord.ScheduleCron,
		AuthorityRules: rulesList,
		Status:         domain.AgentStatus(agentRecord.Status),
		PositionX:      agentRecord.PositionX,
		PositionY:      agentRecord.PositionY,
		LastHeartbeat:  heartbeat,
		CreatedAt:      agentRecord.CreatedAt.Time,
		UpdatedAt:      agentRecord.UpdatedAt.Time,
	}

	return &resultAgent, nil
}

// CreateAgent persists a new cloud agent record to the database.
func (store *PostgresStore) CreateAgent(requestContext context.Context, agent domain.Agent) (*domain.Agent, error) {
	workspaceUUID, parseWorkspaceError := stringToUUID(agent.WorkspaceID)
	if parseWorkspaceError != nil {
		return nil, parseWorkspaceError
	}

	rulesJSON, marshalError := json.Marshal(agent.AuthorityRules)
	if marshalError != nil {
		return nil, marshalError
	}

	createdRow, insertError := store.queries.CreateAgent(requestContext, db.CreateAgentParams{
		WorkspaceID:    workspaceUUID,
		Token:          agent.Token,
		Name:           agent.Name,
		Provider:       string(agent.Provider),
		Goal:           agent.Goal,
		ScheduleCron:   agent.ScheduleCron,
		AuthorityRules: rulesJSON,
		Status:         string(agent.Status),
		PositionX:      agent.PositionX,
		PositionY:      agent.PositionY,
	})
	if insertError != nil {
		return nil, insertError
	}

	resultAgent := domain.Agent{
		ID:             uuidToString(createdRow.ID),
		WorkspaceID:    uuidToString(createdRow.WorkspaceID),
		Token:          createdRow.Token,
		Name:           createdRow.Name,
		Provider:       domain.Provider(createdRow.Provider),
		Goal:           createdRow.Goal,
		ScheduleCron:   createdRow.ScheduleCron,
		AuthorityRules: agent.AuthorityRules,
		Status:         domain.AgentStatus(createdRow.Status),
		PositionX:      createdRow.PositionX,
		PositionY:      createdRow.PositionY,
		CreatedAt:      createdRow.CreatedAt.Time,
		UpdatedAt:      createdRow.UpdatedAt.Time,
	}

	return &resultAgent, nil
}

// CreateEdge wires two agents together in the database.
func (store *PostgresStore) CreateEdge(requestContext context.Context, edge domain.Edge) (*domain.Edge, error) {
	workspaceUUID, parseWorkspaceError := stringToUUID(edge.WorkspaceID)
	if parseWorkspaceError != nil {
		return nil, parseWorkspaceError
	}
	sourceUUID, parseSourceError := stringToUUID(edge.SourceAgentID)
	if parseSourceError != nil {
		return nil, parseSourceError
	}
	targetUUID, parseTargetError := stringToUUID(edge.TargetAgentID)
	if parseTargetError != nil {
		return nil, parseTargetError
	}

	createdRow, insertError := store.queries.CreateEdge(requestContext, db.CreateEdgeParams{
		WorkspaceID:   workspaceUUID,
		SourceAgentID: sourceUUID,
		TargetAgentID: targetUUID,
		ToolName:      edge.ToolName,
	})
	if insertError != nil {
		return nil, insertError
	}

	resultEdge := domain.Edge{
		ID:            uuidToString(createdRow.ID),
		WorkspaceID:   uuidToString(createdRow.WorkspaceID),
		SourceAgentID: uuidToString(createdRow.SourceAgentID),
		TargetAgentID: uuidToString(createdRow.TargetAgentID),
		ToolName:      createdRow.ToolName,
		CreatedAt:     createdRow.CreatedAt.Time,
	}

	return &resultEdge, nil
}

// DeleteEdge removes a directed edge between two agents in postgres.
func (store *PostgresStore) DeleteEdge(requestContext context.Context, workspaceID, sourceAgentID, targetAgentID string) error {
	workspaceUUID, parseWorkspaceError := stringToUUID(workspaceID)
	if parseWorkspaceError != nil {
		return parseWorkspaceError
	}
	sourceUUID, parseSourceError := stringToUUID(sourceAgentID)
	if parseSourceError != nil {
		return parseSourceError
	}
	targetUUID, parseTargetError := stringToUUID(targetAgentID)
	if parseTargetError != nil {
		return parseTargetError
	}

	return store.queries.DeleteEdge(requestContext, db.DeleteEdgeParams{
		WorkspaceID:   workspaceUUID,
		SourceAgentID: sourceUUID,
		TargetAgentID: targetUUID,
	})
}

// CreateApproval records a pending human approval decision payload.
func (store *PostgresStore) CreateApproval(requestContext context.Context, approval domain.ApprovalRequest) (*domain.ApprovalRequest, error) {
	workspaceUUID, parseWorkspaceError := stringToUUID(approval.WorkspaceID)
	if parseWorkspaceError != nil {
		return nil, parseWorkspaceError
	}
	agentUUID, parseAgentError := stringToUUID(approval.AgentID)
	if parseAgentError != nil {
		return nil, parseAgentError
	}

	optionsJSON, marshalError := json.Marshal(approval.Options)
	if marshalError != nil {
		return nil, marshalError
	}

	createdRow, insertError := store.queries.CreateApproval(requestContext, db.CreateApprovalParams{
		WorkspaceID:    workspaceUUID,
		AgentID:        agentUUID,
		Question:       approval.Question,
		Options:        optionsJSON,
		ReasoningTrace: approval.ReasoningTrace,
	})
	if insertError != nil {
		return nil, insertError
	}

	resultApproval := domain.ApprovalRequest{
		ID:             uuidToString(createdRow.ID),
		WorkspaceID:    uuidToString(createdRow.WorkspaceID),
		AgentID:        uuidToString(createdRow.AgentID),
		Question:       createdRow.Question,
		Options:        approval.Options,
		ReasoningTrace: createdRow.ReasoningTrace,
		Status:         domain.ApprovalStatus(createdRow.Status),
		CreatedAt:      createdRow.CreatedAt.Time,
	}

	return &resultApproval, nil
}

// ResolveApproval atomically transitions a pending approval to approved or rejected.
func (store *PostgresStore) ResolveApproval(requestContext context.Context, approvalID string, decision domain.DecisionResult) (*domain.ApprovalRequest, error) {
	approvalUUID, parseError := stringToUUID(approvalID)
	if parseError != nil {
		return nil, parseError
	}

	statusString := "rejected"
	if decision.Approved {
		statusString = "approved"
	}

	resolvedRow, updateError := store.queries.ResolveApproval(requestContext, db.ResolveApprovalParams{
		ID:         approvalUUID,
		Status:     statusString,
		ResolvedBy: pgtype.Text{String: decision.OperatorID, Valid: decision.OperatorID != ""},
		Answer:     pgtype.Text{String: decision.Answer, Valid: decision.Answer != ""},
	})
	if updateError != nil {
		return nil, updateError
	}

	var optionsList []string
	if len(resolvedRow.Options) > 0 {
		_ = json.Unmarshal(resolvedRow.Options, &optionsList)
	}

	resultApproval := domain.ApprovalRequest{
		ID:             uuidToString(resolvedRow.ID),
		WorkspaceID:    uuidToString(resolvedRow.WorkspaceID),
		AgentID:        uuidToString(resolvedRow.AgentID),
		Question:       resolvedRow.Question,
		Options:        optionsList,
		ReasoningTrace: resolvedRow.ReasoningTrace,
		Status:         domain.ApprovalStatus(resolvedRow.Status),
		CreatedAt:      resolvedRow.CreatedAt.Time,
	}

	return &resultApproval, nil
}

// RecordApproval persists an incoming approval question emitted by a cloud agent.
func (store *PostgresStore) RecordApproval(workspaceID, agentID, question string, options []string, trace string) (string, error) {
	createdApproval, createError := store.CreateApproval(context.Background(), domain.ApprovalRequest{
		WorkspaceID:    workspaceID,
		AgentID:        agentID,
		Question:       question,
		Options:        options,
		ReasoningTrace: trace,
		Status:         domain.ApprovalStatusPending,
	})
	if createError != nil {
		return "", createError
	}
	return createdApproval.ID, nil
}

// DeleteAgent satisfies AgentSteeringRepository, deleting an agent and cascading removal of edges and traces.
func (store *PostgresStore) DeleteAgent(requestContext context.Context, agentID string) error {
	agentUUID, parseError := stringToUUID(agentID)
	if parseError != nil {
		return parseError
	}

	deleteContext, cancelDelete := context.WithTimeout(requestContext, 5*time.Second)
	defer cancelDelete()

	_, execError := store.pool.Exec(deleteContext, "DELETE FROM agents WHERE id = $1", agentUUID)
	return execError
}

func uuidToString(sourceUUID pgtype.UUID) string {
	if !sourceUUID.Valid {
		return ""
	}
	parsedUUID, formatError := uuid.FromBytes(sourceUUID.Bytes[:])
	if formatError != nil {
		return ""
	}
	return parsedUUID.String()
}

func stringToUUID(sourceString string) (pgtype.UUID, error) {
	parsedUUID, parseError := uuid.Parse(sourceString)
	if parseError != nil {
		return pgtype.UUID{}, fmt.Errorf("invalid UUID string %q: %w", sourceString, parseError)
	}
	return pgtype.UUID{
		Bytes: parsedUUID,
		Valid: true,
	}, nil
}

// SavePipelineDeliverable buffers an inbound artifact for an agent wired downstream.
func (store *PostgresStore) SavePipelineDeliverable(targetAgentID string, deliverable mcp.PipelineDeliverable) error {
	store.deliverables.Store(targetAgentID, deliverable)
	return nil
}

// GetLatestPipelineDeliverable retrieves the latest buffered deliverable routed to the agent.
func (store *PostgresStore) GetLatestPipelineDeliverable(agentID string) (*mcp.PipelineDeliverable, error) {
	if rawVal, found := store.deliverables.Load(agentID); found {
		if deliverable, ok := rawVal.(mcp.PipelineDeliverable); ok {
			return &deliverable, nil
		}
	}
	return nil, nil
}

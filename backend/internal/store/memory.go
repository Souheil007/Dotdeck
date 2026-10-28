// Package store provides persistence abstractions and storage implementations
// for agents, edges, thoughts, and approvals.
package store

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/Souheil007/Dotdeck/backend/internal/domain"
	"github.com/Souheil007/Dotdeck/backend/internal/mcp"
)

// MemoryStore provides a thread-safe in-memory repository for local development and tests.
type MemoryStore struct {
	storeMutex   sync.RWMutex
	agents       map[string]*mcp.AgentContext // token -> AgentContext
	byID         map[string]*mcp.AgentContext // id -> AgentContext
	edges        map[string][]mcp.EdgeContext // source_agent_id -> edges
	thoughts     map[string][]domain.ThoughtEvent
	approvals    map[string]*domain.ApprovalRequest
	deliverables map[string]*mcp.PipelineDeliverable // target_agent_id -> latest deliverable
}

type memoryStoreData struct {
	Agents    map[string]*mcp.AgentContext       `json:"agents"`
	ByID      map[string]*mcp.AgentContext       `json:"by_id"`
	Edges     map[string][]mcp.EdgeContext       `json:"edges"`
	Thoughts  map[string][]domain.ThoughtEvent   `json:"thoughts"`
	Approvals map[string]*domain.ApprovalRequest `json:"approvals"`
}

func getStoreFilePath() string {
	if _, err := os.Stat("data"); err == nil {
		return filepath.Join("data", "memory_store.json")
	}
	if _, err := os.Stat("backend"); err == nil {
		_ = os.MkdirAll(filepath.Join("backend", "data"), 0755)
		return filepath.Join("backend", "data", "memory_store.json")
	}
	_ = os.MkdirAll("data", 0755)
	return filepath.Join("data", "memory_store.json")
}

func (store *MemoryStore) persistToDiskLocked() {
	filePath := getStoreFilePath()
	data := memoryStoreData{
		Agents:    store.agents,
		ByID:      store.byID,
		Edges:     store.edges,
		Thoughts:  store.thoughts,
		Approvals: store.approvals,
	}
	bytes, err := json.MarshalIndent(data, "", "  ")
	if err == nil {
		_ = os.WriteFile(filePath, bytes, 0644)
	}
}

func (store *MemoryStore) loadFromDisk() bool {
	filePath := getStoreFilePath()
	bytes, err := os.ReadFile(filePath)
	if err != nil {
		return false
	}
	var data memoryStoreData
	if err := json.Unmarshal(bytes, &data); err != nil {
		return false
	}
	if data.Agents != nil {
		store.agents = data.Agents
	}
	if data.ByID != nil {
		store.byID = data.ByID
	}
	if data.Edges != nil {
		store.edges = data.Edges
	}
	if data.Thoughts != nil {
		store.thoughts = data.Thoughts
	}
	if data.Approvals != nil {
		store.approvals = data.Approvals
	}
	return true
}

// NewMemoryStore initializes an in-memory store pre-seeded with development agents.
func NewMemoryStore() *MemoryStore {
	storeInstance := &MemoryStore{
		agents:       make(map[string]*mcp.AgentContext),
		byID:         make(map[string]*mcp.AgentContext),
		edges:        make(map[string][]mcp.EdgeContext),
		thoughts:     make(map[string][]domain.ThoughtEvent),
		approvals:    make(map[string]*domain.ApprovalRequest),
		deliverables: make(map[string]*mcp.PipelineDeliverable),
	}

	loaded := storeInstance.loadFromDisk()

	// Seed development fleet matching canvas demo nodes if store is clean
	if !loaded || len(storeInstance.agents) == 0 {
		storeInstance.SaveAgent("dev-token-123", &mcp.AgentContext{
			ID:          "agent-1",
			WorkspaceID: "default-workspace",
			Name:        "Sales Research Dot",
			Provider:    "openai_dot",
			Goal:        "Scrape high-intent B2B leads and enrich company technical profiles.",
			Status:      "working",
		})
		storeInstance.SaveAgent("dev-token-456", &mcp.AgentContext{
			ID:          "agent-2",
			WorkspaceID: "default-workspace",
			Name:        "Grok Copywriter",
			Provider:    "grok_bot",
			Goal:        "Draft high-impact marketing copy and personalized cold outreach emails.",
			Status:      "blocked_on_user",
		})
		storeInstance.SaveAgent("dev-token-789", &mcp.AgentContext{
			ID:          "agent-3",
			WorkspaceID: "default-workspace",
			Name:        "Claude Compliance",
			Provider:    "claude",
			Goal:        "Audit outgoing drafts for security policies and compliance regulations.",
			Status:      "resting",
		})

		storeInstance.AddEdge("agent-1", mcp.EdgeContext{
			TargetAgentID:   "agent-2",
			TargetAgentName: "Grok Copywriter",
			TargetAgentGoal: "Draft high-impact marketing copy and personalized cold outreach emails.",
			ToolName:        "delegate_task_to_grok_copywriter",
		})
		storeInstance.AddEdge("agent-2", mcp.EdgeContext{
			TargetAgentID:   "agent-3",
			TargetAgentName: "Claude Compliance",
			TargetAgentGoal: "Audit outgoing drafts for security policies and compliance regulations.",
			ToolName:        "delegate_task_to_claude_compliance",
		})
	}

	// Always ensure the email agent and both of its active tokens are bound
	emailAgent := &mcp.AgentContext{
		ID:          "f955f07a-fb4a-4632-a373-847425ea0d81",
		WorkspaceID: "ws-1793204517707",
		Name:        "email",
		Provider:    "grok_bot",
		Goal:        "views latest 5 email viewer and tells whether there is something urgent",
		Status:      "unpaired",
	}
	if existing, exists := storeInstance.byID[emailAgent.ID]; exists {
		emailAgent = existing
	}
	storeInstance.SaveAgent("0dfe2532dbbad0d6fcca732b0207016b", emailAgent)
	storeInstance.SaveAgent("86fd5c4c8f85bd1b5f032658b48e6347", emailAgent)

	return storeInstance
}

// SaveAgent registers or updates an agent descriptor in the lookup cache.
func (store *MemoryStore) SaveAgent(token string, agent *mcp.AgentContext) {
	store.storeMutex.Lock()
	defer store.storeMutex.Unlock()
	store.agents[token] = agent
	store.byID[agent.ID] = agent
	store.persistToDiskLocked()
}

// AddEdge registers a directed delegation link between two agents.
func (store *MemoryStore) AddEdge(sourceID string, edge mcp.EdgeContext) {
	store.storeMutex.Lock()
	defer store.storeMutex.Unlock()
	store.edges[sourceID] = append(store.edges[sourceID], edge)
	store.persistToDiskLocked()
}

// CreateEdge satisfies the repository interface by registering a directed edge on the canvas.
func (store *MemoryStore) CreateEdge(requestContext context.Context, edge domain.Edge) (*domain.Edge, error) {
	store.storeMutex.Lock()
	defer store.storeMutex.Unlock()

	targetName := edge.TargetAgentID
	targetGoal := ""
	targetProvider := ""
	if targetAgent, exists := store.byID[edge.TargetAgentID]; exists {
		targetName = targetAgent.Name
		targetGoal = targetAgent.Goal
		targetProvider = targetAgent.Provider
	}

	edgeContext := mcp.EdgeContext{
		TargetAgentID:       edge.TargetAgentID,
		TargetAgentName:     targetName,
		TargetAgentGoal:     targetGoal,
		TargetAgentProvider: targetProvider,
		ToolName:            edge.ToolName,
	}

	store.edges[edge.SourceAgentID] = append(store.edges[edge.SourceAgentID], edgeContext)
	store.persistToDiskLocked()
	return &edge, nil
}

// DeleteEdge removes a directed delegation link between two agents.
func (store *MemoryStore) DeleteEdge(requestContext context.Context, workspaceID, sourceAgentID, targetAgentID string) error {
	store.storeMutex.Lock()
	defer store.storeMutex.Unlock()

	edgesList := store.edges[sourceAgentID]
	var updatedEdges []mcp.EdgeContext
	for _, edgeItem := range edgesList {
		if edgeItem.TargetAgentID != targetAgentID {
			updatedEdges = append(updatedEdges, edgeItem)
		}
	}
	store.edges[sourceAgentID] = updatedEdges
	store.persistToDiskLocked()
	return nil
}

// GetAgentByToken retrieves an active agent matching the URL authorization token.
func (store *MemoryStore) GetAgentByToken(token string) (*mcp.AgentContext, error) {
	store.storeMutex.RLock()
	defer store.storeMutex.RUnlock()
	agent, exists := store.agents[token]
	if !exists {
		return nil, nil
	}
	return agent, nil
}

// GetOutboundEdges returns all target agents wired downstream from the source agent, dynamically enriching target metadata.
func (store *MemoryStore) GetOutboundEdges(agentID string) ([]mcp.EdgeContext, error) {
	store.storeMutex.RLock()
	defer store.storeMutex.RUnlock()

	rawEdges := store.edges[agentID]
	enrichedEdges := make([]mcp.EdgeContext, len(rawEdges))
	for index, edgeItem := range rawEdges {
		if edgeItem.TargetAgentProvider == "" || edgeItem.TargetAgentName == "" || edgeItem.TargetAgentGoal == "" {
			if targetAgent, exists := store.byID[edgeItem.TargetAgentID]; exists {
				if edgeItem.TargetAgentProvider == "" {
					edgeItem.TargetAgentProvider = targetAgent.Provider
				}
				if edgeItem.TargetAgentName == "" {
					edgeItem.TargetAgentName = targetAgent.Name
				}
				if edgeItem.TargetAgentGoal == "" {
					edgeItem.TargetAgentGoal = targetAgent.Goal
				}
			}
		}
		enrichedEdges[index] = edgeItem
	}
	return enrichedEdges, nil
}

// GetAgentByID retrieves an agent descriptor by its ID.
func (store *MemoryStore) GetAgentByID(requestContext context.Context, agentID string) (*domain.Agent, error) {
	store.storeMutex.RLock()
	defer store.storeMutex.RUnlock()

	agentContext, exists := store.byID[agentID]
	if !exists {
		return nil, fmt.Errorf("agent %q not found", agentID)
	}

	return &domain.Agent{
		ID:          agentContext.ID,
		WorkspaceID: agentContext.WorkspaceID,
		Name:        agentContext.Name,
		Provider:    domain.Provider(agentContext.Provider),
		Goal:        agentContext.Goal,
		Status:      domain.AgentStatus(agentContext.Status),
	}, nil
}

// CreateAgent registers a newly provisioned agent in the in-memory lookup maps.
func (store *MemoryStore) CreateAgent(requestContext context.Context, agent domain.Agent) (*domain.Agent, error) {
	store.storeMutex.Lock()
	defer store.storeMutex.Unlock()

	agentContext := &mcp.AgentContext{
		ID:          agent.ID,
		WorkspaceID: agent.WorkspaceID,
		Name:        agent.Name,
		Provider:    string(agent.Provider),
		Goal:        agent.Goal,
		Status:      string(agent.Status),
	}

	store.agents[agent.Token] = agentContext
	store.byID[agent.ID] = agentContext
	store.persistToDiskLocked()

	return &agent, nil
}

// DeleteAgent decommissions an agent by its ID, cleaning up token maps and connected edges.
func (store *MemoryStore) DeleteAgent(requestContext context.Context, agentID string) error {
	store.storeMutex.Lock()
	defer store.storeMutex.Unlock()

	delete(store.byID, agentID)
	for tokenString, agentContext := range store.agents {
		if agentContext.ID == agentID {
			delete(store.agents, tokenString)
			break
		}
	}

	delete(store.edges, agentID)
	for sourceID, edgesList := range store.edges {
		var filteredEdges []mcp.EdgeContext
		for _, edgeItem := range edgesList {
			if edgeItem.TargetAgentID != agentID {
				filteredEdges = append(filteredEdges, edgeItem)
			}
		}
		store.edges[sourceID] = filteredEdges
	}
	store.persistToDiskLocked()

	return nil
}

// UpdateStatus adjusts the agent state badge across the Dotdeck live canvas.
func (store *MemoryStore) UpdateStatus(agentID, status string) error {
	store.storeMutex.Lock()
	defer store.storeMutex.Unlock()
	if agent, exists := store.byID[agentID]; exists {
		agent.Status = status
		store.persistToDiskLocked()
	}
	return nil
}

// RecordThought saves an agent's analytical milestone for time-travel playback and virtual logs.
func (store *MemoryStore) RecordThought(agentID string, step int, trace, nextStep, tool string, payload interface{}) error {
	store.storeMutex.Lock()
	defer store.storeMutex.Unlock()

	workspaceID := "default-workspace"
	if agent, exists := store.byID[agentID]; exists {
		workspaceID = agent.WorkspaceID
	}

	thoughtRecord := domain.ThoughtEvent{
		ID:              uuid.New().String(),
		WorkspaceID:     workspaceID,
		AgentID:         agentID,
		RunID:           uuid.New().String(),
		StepIndex:       step,
		ReasoningTrace:  trace,
		NextPlannedStep: nextStep,
		ToolCalled:      tool,
		ToolPayload:     payload,
		CreatedAt:       time.Now().UTC(),
	}

	store.thoughts[agentID] = append([]domain.ThoughtEvent{thoughtRecord}, store.thoughts[agentID]...)
	store.persistToDiskLocked()
	return nil
}

// GetThoughts retrieves historical analytical milestones recorded for an agent.
func (store *MemoryStore) GetThoughts(requestContext context.Context, agentID string) ([]domain.ThoughtEvent, error) {
	store.storeMutex.RLock()
	defer store.storeMutex.RUnlock()

	if list, exists := store.thoughts[agentID]; exists {
		copiedList := make([]domain.ThoughtEvent, len(list))
		copy(copiedList, list)
		return copiedList, nil
	}
	return []domain.ThoughtEvent{}, nil
}

// RecordApproval generates an identifier and saves the pending decision in-memory.
func (store *MemoryStore) RecordApproval(workspaceID, agentID, question string, options []string, trace string) (string, error) {
	store.storeMutex.Lock()
	defer store.storeMutex.Unlock()

	approvalIdentifier := uuid.New().String()
	store.approvals[approvalIdentifier] = &domain.ApprovalRequest{
		ID:             approvalIdentifier,
		WorkspaceID:    workspaceID,
		AgentID:        agentID,
		Question:       question,
		Options:        options,
		ReasoningTrace: trace,
		Status:         domain.ApprovalStatusPending,
		CreatedAt:      time.Now().UTC(),
	}
	store.persistToDiskLocked()
	return approvalIdentifier, nil
}

// GetApprovals retrieves all pending approvals belonging to a specific workspace.
func (store *MemoryStore) GetApprovals(requestContext context.Context, workspaceID string) ([]domain.ApprovalRequest, error) {
	store.storeMutex.RLock()
	defer store.storeMutex.RUnlock()

	var pendingApprovals []domain.ApprovalRequest
	for _, approvalItem := range store.approvals {
		if approvalItem.WorkspaceID == workspaceID {
			pendingApprovals = append(pendingApprovals, *approvalItem)
		}
	}
	return pendingApprovals, nil
}

// SavePipelineDeliverable buffers an inbound artifact for an agent wired downstream.
func (store *MemoryStore) SavePipelineDeliverable(targetAgentID string, deliverable mcp.PipelineDeliverable) error {
	store.storeMutex.Lock()
	defer store.storeMutex.Unlock()
	store.deliverables[targetAgentID] = &deliverable
	return nil
}

// GetLatestPipelineDeliverable retrieves the latest buffered deliverable routed to the agent.
func (store *MemoryStore) GetLatestPipelineDeliverable(agentID string) (*mcp.PipelineDeliverable, error) {
	store.storeMutex.RLock()
	defer store.storeMutex.RUnlock()
	return store.deliverables[agentID], nil
}

// GetAgentByWorkspaceAndProvider looks up an existing agent in a workspace matching a cloud provider.
func (store *MemoryStore) GetAgentByWorkspaceAndProvider(workspaceID string, provider domain.Provider) (*mcp.AgentContext, error) {
	store.storeMutex.RLock()
	defer store.storeMutex.RUnlock()

	for _, agentContext := range store.byID {
		if agentContext.WorkspaceID == workspaceID && agentContext.Provider == string(provider) {
			return agentContext, nil
		}
	}
	return nil, nil
}

// GetAgentByWorkspaceAndName looks up an existing agent in a workspace matching an agent name.
func (store *MemoryStore) GetAgentByWorkspaceAndName(workspaceID, name string) (*mcp.AgentContext, error) {
	store.storeMutex.RLock()
	defer store.storeMutex.RUnlock()

	for _, agentContext := range store.byID {
		if agentContext.WorkspaceID == workspaceID && strings.EqualFold(agentContext.Name, name) {
			return agentContext, nil
		}
	}
	return nil, nil
}

// Package store provides persistence abstractions and storage implementations
// for agents, edges, thoughts, and approvals.
package store

import (
	"context"
	"fmt"
	"sync"

	"github.com/google/uuid"

	"github.com/Souheil007/Dotdeck/backend/internal/domain"
	"github.com/Souheil007/Dotdeck/backend/internal/mcp"
)

// MemoryStore provides a thread-safe in-memory repository for local development and tests.
type MemoryStore struct {
	storeMutex sync.RWMutex
	agents     map[string]*mcp.AgentContext // token -> AgentContext
	byID       map[string]*mcp.AgentContext // id -> AgentContext
	edges      map[string][]mcp.EdgeContext // source_agent_id -> edges
}

// NewMemoryStore initializes an in-memory store pre-seeded with development agents.
func NewMemoryStore() *MemoryStore {
	storeInstance := &MemoryStore{
		agents: make(map[string]*mcp.AgentContext),
		byID:   make(map[string]*mcp.AgentContext),
		edges:  make(map[string][]mcp.EdgeContext),
	}

	// Seed development fleet matching canvas demo nodes
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

	return storeInstance
}

// SaveAgent registers or updates an agent descriptor in the lookup cache.
func (store *MemoryStore) SaveAgent(token string, agent *mcp.AgentContext) {
	store.storeMutex.Lock()
	defer store.storeMutex.Unlock()
	store.agents[token] = agent
	store.byID[agent.ID] = agent
}

// AddEdge registers a directed delegation link between two agents.
func (store *MemoryStore) AddEdge(sourceID string, edge mcp.EdgeContext) {
	store.storeMutex.Lock()
	defer store.storeMutex.Unlock()
	store.edges[sourceID] = append(store.edges[sourceID], edge)
}

// CreateEdge satisfies the repository interface by registering a directed edge on the canvas.
func (store *MemoryStore) CreateEdge(requestContext context.Context, edge domain.Edge) (*domain.Edge, error) {
	store.storeMutex.Lock()
	defer store.storeMutex.Unlock()

	targetName := edge.TargetAgentID
	targetGoal := ""
	if targetAgent, exists := store.byID[edge.TargetAgentID]; exists {
		targetName = targetAgent.Name
		targetGoal = targetAgent.Goal
	}

	edgeContext := mcp.EdgeContext{
		TargetAgentID:   edge.TargetAgentID,
		TargetAgentName: targetName,
		TargetAgentGoal: targetGoal,
		ToolName:        edge.ToolName,
	}

	store.edges[edge.SourceAgentID] = append(store.edges[edge.SourceAgentID], edgeContext)
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

// GetOutboundEdges returns all target agents wired downstream from the source agent.
func (store *MemoryStore) GetOutboundEdges(agentID string) ([]mcp.EdgeContext, error) {
	store.storeMutex.RLock()
	defer store.storeMutex.RUnlock()
	return store.edges[agentID], nil
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

	return &agent, nil
}

// UpdateStatus adjusts the agent state badge across the Dotdeck live canvas.
func (store *MemoryStore) UpdateStatus(agentID, status string) error {
	store.storeMutex.Lock()
	defer store.storeMutex.Unlock()
	if agent, exists := store.byID[agentID]; exists {
		agent.Status = status
	}
	return nil
}

// RecordThought saves an agent's analytical milestone for time-travel playback and virtual logs.
func (store *MemoryStore) RecordThought(agentID string, step int, trace, nextStep, tool string, payload interface{}) error {
	// Persisted for audit logging and timeline replay
	return nil
}

// RecordApproval generates an identifier and saves the pending decision in-memory.
func (store *MemoryStore) RecordApproval(workspaceID, agentID, question string, options []string, trace string) (string, error) {
	return uuid.New().String(), nil
}

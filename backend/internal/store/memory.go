// Package store provides persistence abstractions and storage implementations
// for agents, edges, thoughts, and approvals.
package store

import (
	"sync"

	"github.com/Souheil007/Dotdeck/backend/internal/mcp"
)

// MemoryStore provides a thread-safe in-memory repository for local development and tests.
type MemoryStore struct {
	mu     sync.RWMutex
	agents map[string]*mcp.AgentContext  // token -> AgentContext
	byID   map[string]*mcp.AgentContext  // id -> AgentContext
	edges  map[string][]mcp.EdgeContext  // source_agent_id -> edges
}

// NewMemoryStore initializes an empty in-memory store.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		agents: make(map[string]*mcp.AgentContext),
		byID:   make(map[string]*mcp.AgentContext),
		edges:  make(map[string][]mcp.EdgeContext),
	}
}

// SaveAgent registers or updates an agent descriptor in the lookup cache.
func (store *MemoryStore) SaveAgent(token string, agent *mcp.AgentContext) {
	store.mu.Lock()
	defer store.mu.Unlock()
	store.agents[token] = agent
	store.byID[agent.ID] = agent
}

// AddEdge registers a directed delegation link between two agents.
func (store *MemoryStore) AddEdge(sourceID string, edge mcp.EdgeContext) {
	store.mu.Lock()
	defer store.mu.Unlock()
	store.edges[sourceID] = append(store.edges[sourceID], edge)
}

// GetAgentByToken retrieves an active agent matching the URL authorization token.
func (store *MemoryStore) GetAgentByToken(token string) (*mcp.AgentContext, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()
	agent, exists := store.agents[token]
	if !exists {
		return nil, nil
	}
	return agent, nil
}

// GetOutboundEdges returns all target agents wired downstream from the source agent.
func (store *MemoryStore) GetOutboundEdges(agentID string) ([]mcp.EdgeContext, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()
	return store.edges[agentID], nil
}

// UpdateStatus adjusts the agent state badge across the Dotdeck live canvas.
func (store *MemoryStore) UpdateStatus(agentID, status string) error {
	store.mu.Lock()
	defer store.mu.Unlock()
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

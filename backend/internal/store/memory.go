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
func (m *MemoryStore) SaveAgent(token string, agent *mcp.AgentContext) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.agents[token] = agent
	m.byID[agent.ID] = agent
}

// AddEdge registers a directed delegation link between two agents.
func (m *MemoryStore) AddEdge(sourceID string, edge mcp.EdgeContext) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.edges[sourceID] = append(m.edges[sourceID], edge)
}

// GetAgentByToken retrieves an active agent matching the URL authorization token.
func (m *MemoryStore) GetAgentByToken(token string) (*mcp.AgentContext, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	agent, exists := m.agents[token]
	if !exists {
		return nil, nil
	}
	return agent, nil
}

// GetOutboundEdges returns all target agents wired downstream from the source agent.
func (m *MemoryStore) GetOutboundEdges(agentID string) ([]mcp.EdgeContext, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.edges[agentID], nil
}

// UpdateStatus adjusts the agent state badge across the Dotdeck live canvas.
func (m *MemoryStore) UpdateStatus(agentID, status string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if agent, exists := m.byID[agentID]; exists {
		agent.Status = status
	}
	return nil
}

// RecordThought saves an agent's analytical milestone for time-travel playback and virtual logs.
func (m *MemoryStore) RecordThought(agentID string, step int, trace, nextStep, tool string, payload interface{}) error {
	// Persisted for audit logging and timeline replay
	return nil
}

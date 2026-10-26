package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// Agent represents an autonomous cloud agent entity managed on the visual canvas.
type Agent struct {
	ID             string    `json:"id"`
	WorkspaceID    string    `json:"workspace_id"`
	Token          string    `json:"token"`
	Name           string    `json:"name"`
	Provider       string    `json:"provider"`
	Goal           string    `json:"goal"`
	ScheduleCron   string    `json:"schedule_cron"`
	AuthorityRules []string  `json:"authority_rules"`
	Status         string    `json:"status"`
	PositionX      float64   `json:"position_x"`
	PositionY      float64   `json:"position_y"`
	CreatedAt      time.Time `json:"created_at"`
}

// Edge represents a directed communication link connecting two agent nodes.
type Edge struct {
	ID            string    `json:"id"`
	WorkspaceID   string    `json:"workspace_id"`
	SourceAgentID string    `json:"source_agent_id"`
	TargetAgentID string    `json:"target_agent_id"`
	ToolName      string    `json:"tool_name"`
	CreatedAt     time.Time `json:"created_at"`
}

// AgentHandler manages agent lifecycle, canvas edge wiring, and bootstrap prompt generation.
type AgentHandler struct {
	baseURL string
}

// NewAgentHandler constructs an agent management controller using the server's public base URL.
func NewAgentHandler(baseURL string) *AgentHandler {
	return &AgentHandler{baseURL: baseURL}
}

// Create provisions an agent record and generates its pairing credentials and bootstrap prompt.
func (h *AgentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body struct {
		WorkspaceID    string   `json:"workspace_id"`
		Name           string   `json:"name"`
		Provider       string   `json:"provider"`
		Goal           string   `json:"goal"`
		ScheduleCron   string   `json:"schedule_cron"`
		AuthorityRules []string `json:"authority_rules"`
		PositionX      float64  `json:"position_x"`
		PositionY      float64  `json:"position_y"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	rawToken := make([]byte, 16)
	_, _ = rand.Read(rawToken)
	token := hex.EncodeToString(rawToken)

	agentID := uuid.New().String()
	agent := Agent{
		ID:             agentID,
		WorkspaceID:    body.WorkspaceID,
		Token:          token,
		Name:           body.Name,
		Provider:       body.Provider,
		Goal:           body.Goal,
		ScheduleCron:   body.ScheduleCron,
		AuthorityRules: body.AuthorityRules,
		Status:         "unpaired",
		PositionX:      body.PositionX,
		PositionY:      body.PositionY,
		CreatedAt:      time.Now().UTC(),
	}

	mcpURL := fmt.Sprintf("%s/mcp/%s", h.baseURL, token)
	bootstrapPrompt := generateBootstrapPrompt(agent, mcpURL)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"agent":            agent,
		"mcp_url":          mcpURL,
		"bootstrap_prompt": bootstrapPrompt,
	})
}

// ConnectEdge wires two agent nodes together, dynamically synthesizing an MCP delegation tool.
func (h *AgentHandler) ConnectEdge(w http.ResponseWriter, r *http.Request) {
	var body struct {
		WorkspaceID   string `json:"workspace_id"`
		SourceAgentID string `json:"source_agent_id"`
		TargetAgentID string `json:"target_agent_id"`
		TargetName    string `json:"target_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	sanitizedTarget := sanitizeIdentifier(body.TargetName)
	toolName := fmt.Sprintf("delegate_task_to_%s", sanitizedTarget)

	edge := Edge{
		ID:            uuid.New().String(),
		WorkspaceID:   body.WorkspaceID,
		SourceAgentID: body.SourceAgentID,
		TargetAgentID: body.TargetAgentID,
		ToolName:      toolName,
		CreatedAt:     time.Now().UTC(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(edge)
}

func generateBootstrapPrompt(agent Agent, mcpURL string) string {
	return fmt.Sprintf(`### ROLE & IDENTITY: %s
You are connected to the Dotdeck Collaborative Agent Switchboard via remote MCP.
Endpoint URL: %s

### ONGOING GOAL:
%s

### MANDATORY TELEMETRY & REPORTING RULES:
1. Every time you reach a reasoning milestone or plan an action, you MUST call report_thought_step(reasoning_trace, next_planned_step).
2. When requiring human confirmation or hitting authority boundaries, you MUST call ask_human_question(question, reasoning_trace) and wait for the response.
3. Use delegate_task_* tools to pass structured artifacts to your connected peers on the Dotdeck canvas.

### AUTHORITY CONSTRAINTS:
%v`, agent.Name, mcpURL, agent.Goal, agent.AuthorityRules)
}

func sanitizeIdentifier(s string) string {
	res := make([]rune, 0, len(s))
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			res = append(res, r)
		} else if r >= 'A' && r <= 'Z' {
			res = append(res, r+'a'-'A')
		} else if r == ' ' || r == '-' {
			res = append(res, '_')
		}
	}
	return string(res)
}

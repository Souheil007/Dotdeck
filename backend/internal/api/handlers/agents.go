// Package handlers provides HTTP REST controllers handling incoming client requests.
package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Souheil007/Dotdeck/backend/internal/api/middleware"
	"github.com/Souheil007/Dotdeck/backend/internal/domain"
	"github.com/Souheil007/Dotdeck/backend/internal/mcp"
	"github.com/Souheil007/Dotdeck/backend/pkg/response"
)

// AgentSteeringRepository abstracts persistence operations required for operator steering.
type AgentSteeringRepository interface {
	GetAgentByID(requestContext context.Context, agentID string) (*domain.Agent, error)
	UpdateStatus(agentID, status string) error
	RecordThought(agentID string, step int, trace, nextStep, tool string, payload interface{}) error
}

// AgentWakeDispatcher abstracts outbound wake-up bridge dispatching.
type AgentWakeDispatcher interface {
	WakeAgent(requestContext context.Context, agent *domain.Agent, promptText string) error
}

// AgentHandler manages agent lifecycle, canvas edge wiring, and bootstrap prompt generation.
type AgentHandler struct {
	baseURL        string
	repository     AgentSteeringRepository
	wakeDispatcher AgentWakeDispatcher
	broadcaster    mcp.EventBroadcaster
}

// NewAgentHandler constructs an agent management controller using the server's public base URL.
func NewAgentHandler(baseURL string) *AgentHandler {
	return &AgentHandler{baseURL: baseURL}
}

// SetRepository binds a persistence repository for agent lookups and state updates.
func (handler *AgentHandler) SetRepository(repository AgentSteeringRepository) {
	handler.repository = repository
}

// SetWakeDispatcher binds an outbound wake-up dispatcher for directing sleeping agents.
func (handler *AgentHandler) SetWakeDispatcher(wakeDispatcher AgentWakeDispatcher) {
	handler.wakeDispatcher = wakeDispatcher
}

// SetBroadcaster binds a real-time event broadcaster for canvas event updates.
func (handler *AgentHandler) SetBroadcaster(broadcaster mcp.EventBroadcaster) {
	handler.broadcaster = broadcaster
}

// AgentCreatePayload defines the request body for creating a new cloud agent node.
type AgentCreatePayload struct {
	WorkspaceID    string          `json:"workspace_id"`
	Name           string          `json:"name"`
	Provider       domain.Provider `json:"provider"`
	Goal           string          `json:"goal"`
	ScheduleCron   string          `json:"schedule_cron"`
	AuthorityRules []string        `json:"authority_rules"`
	PositionX      float64         `json:"position_x"`
	PositionY      float64         `json:"position_y"`
}

// AgentCreateResponse encapsulates the created agent along with connection metadata.
type AgentCreateResponse struct {
	Agent           domain.Agent `json:"agent"`
	McpURL          string       `json:"mcp_url"`
	BootstrapPrompt string       `json:"bootstrap_prompt"`
}

// Create provisions an agent record and generates its pairing credentials and bootstrap prompt.
func (handler *AgentHandler) Create(writer http.ResponseWriter, request *http.Request) {
	var payload AgentCreatePayload
	if decodeError := json.NewDecoder(request.Body).Decode(&payload); decodeError != nil {
		response.Error(writer, http.StatusBadRequest, "invalid request payload")
		return
	}

	rawToken := make([]byte, 16)
	_, _ = rand.Read(rawToken)
	tokenString := hex.EncodeToString(rawToken)

	agentIdentifier := uuid.New().String()
	nowTimestamp := time.Now().UTC()
	agentRecord := domain.Agent{
		ID:             agentIdentifier,
		WorkspaceID:    payload.WorkspaceID,
		Token:          tokenString,
		Name:           payload.Name,
		Provider:       payload.Provider,
		Goal:           payload.Goal,
		ScheduleCron:   payload.ScheduleCron,
		AuthorityRules: payload.AuthorityRules,
		Status:         domain.StatusUnpaired,
		PositionX:      payload.PositionX,
		PositionY:      payload.PositionY,
		CreatedAt:      nowTimestamp,
		UpdatedAt:      nowTimestamp,
	}

	mcpEndpointURL := fmt.Sprintf("%s/mcp/%s", handler.baseURL, tokenString)
	promptText := generateBootstrapPrompt(agentRecord, mcpEndpointURL)

	response.JSON(writer, http.StatusCreated, AgentCreateResponse{
		Agent:           agentRecord,
		McpURL:          mcpEndpointURL,
		BootstrapPrompt: promptText,
	})
}

// EdgeConnectPayload defines the request body for connecting two agent nodes on the canvas.
type EdgeConnectPayload struct {
	WorkspaceID   string `json:"workspace_id"`
	SourceAgentID string `json:"source_agent_id"`
	TargetAgentID string `json:"target_agent_id"`
	TargetName    string `json:"target_name"`
}

// ConnectEdge wires two agent nodes together, dynamically synthesizing an MCP delegation tool.
func (handler *AgentHandler) ConnectEdge(writer http.ResponseWriter, request *http.Request) {
	var payload EdgeConnectPayload
	if decodeError := json.NewDecoder(request.Body).Decode(&payload); decodeError != nil {
		response.Error(writer, http.StatusBadRequest, "invalid request payload")
		return
	}

	sanitizedTarget := sanitizeIdentifier(payload.TargetName)
	synthesizedToolName := fmt.Sprintf("delegate_task_to_%s", sanitizedTarget)

	edgeRecord := domain.Edge{
		ID:            uuid.New().String(),
		WorkspaceID:   payload.WorkspaceID,
		SourceAgentID: payload.SourceAgentID,
		TargetAgentID: payload.TargetAgentID,
		ToolName:      synthesizedToolName,
		CreatedAt:     time.Now().UTC(),
	}

	response.JSON(writer, http.StatusCreated, edgeRecord)
}

// AgentSteerPayload defines the operator instruction dispatched to steer a cloud agent.
type AgentSteerPayload struct {
	Prompt string `json:"prompt"`
}

// Steer dispatches real-time human operator instructions to wake and redirect a sleeping agent.
func (handler *AgentHandler) Steer(writer http.ResponseWriter, request *http.Request) {
	agentIdentifier := chi.URLParam(request, "id")
	if agentIdentifier == "" {
		response.Error(writer, http.StatusBadRequest, "missing agent identifier")
		return
	}

	var payload AgentSteerPayload
	if decodeError := json.NewDecoder(request.Body).Decode(&payload); decodeError != nil || payload.Prompt == "" {
		response.Error(writer, http.StatusBadRequest, "invalid request payload: prompt is required")
		return
	}

	operatorIdentifier := middleware.GetUserID(request.Context())
	if operatorIdentifier == "" {
		operatorIdentifier = "anonymous-operator"
	}

	var targetAgent *domain.Agent
	if handler.repository != nil {
		agentRecord, lookupError := handler.repository.GetAgentByID(request.Context(), agentIdentifier)
		if lookupError != nil || agentRecord == nil {
			response.Error(writer, http.StatusNotFound, "agent not found")
			return
		}
		targetAgent = agentRecord
	} else {
		targetAgent = &domain.Agent{
			ID:   agentIdentifier,
			Name: agentIdentifier,
		}
	}

	// Dispatch outbound wake-up through configured bridge
	if handler.wakeDispatcher != nil {
		if wakeError := handler.wakeDispatcher.WakeAgent(request.Context(), targetAgent, payload.Prompt); wakeError != nil {
			response.Error(writer, http.StatusBadGateway, fmt.Sprintf("failed to wake agent: %v", wakeError))
			return
		}
	}

	// Update status and record human steering thought in timeline
	if handler.repository != nil {
		_ = handler.repository.UpdateStatus(agentIdentifier, "working")
		_ = handler.repository.RecordThought(
			agentIdentifier,
			0,
			payload.Prompt,
			"Executing human steering instructions",
			"human_steering",
			map[string]interface{}{"steered_by": operatorIdentifier},
		)
	}

	if handler.broadcaster != nil {
		workspaceIdentifier := targetAgent.WorkspaceID
		if workspaceIdentifier == "" {
			workspaceIdentifier = "default"
		}
		handler.broadcaster.Broadcast(workspaceIdentifier, "AGENT_STEERED", map[string]interface{}{
			"agent_id":   agentIdentifier,
			"prompt":     payload.Prompt,
			"steered_by": operatorIdentifier,
			"timestamp":  time.Now().UTC(),
		})
	}

	response.JSON(writer, http.StatusOK, map[string]interface{}{
		"status":   "steered",
		"agent_id": agentIdentifier,
		"prompt":   payload.Prompt,
	})
}

func generateBootstrapPrompt(agent domain.Agent, mcpEndpointURL string) string {
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
%v`, agent.Name, mcpEndpointURL, agent.Goal, agent.AuthorityRules)
}

func sanitizeIdentifier(inputIdentifier string) string {
	cleanedRunes := make([]rune, 0, len(inputIdentifier))
	for _, charRune := range inputIdentifier {
		if (charRune >= 'a' && charRune <= 'z') || (charRune >= '0' && charRune <= '9') {
			cleanedRunes = append(cleanedRunes, charRune)
		} else if charRune >= 'A' && charRune <= 'Z' {
			cleanedRunes = append(cleanedRunes, charRune+'a'-'A')
		} else if charRune == ' ' || charRune == '-' {
			cleanedRunes = append(cleanedRunes, '_')
		}
	}
	return string(cleanedRunes)
}

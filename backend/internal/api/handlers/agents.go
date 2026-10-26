// Package handlers provides HTTP REST controllers handling incoming client requests.
package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Souheil007/Dotdeck/backend/internal/api/middleware"
	"github.com/Souheil007/Dotdeck/backend/internal/domain"
	"github.com/Souheil007/Dotdeck/backend/internal/mcp"
	"github.com/Souheil007/Dotdeck/backend/pkg/response"
)

// AgentSteeringRepository abstracts persistence operations required for agent creation and operator steering.
type AgentSteeringRepository interface {
	GetAgentByID(requestContext context.Context, agentID string) (*domain.Agent, error)
	CreateAgent(requestContext context.Context, agent domain.Agent) (*domain.Agent, error)
	CreateEdge(requestContext context.Context, edge domain.Edge) (*domain.Edge, error)
	DeleteEdge(requestContext context.Context, workspaceID, sourceAgentID, targetAgentID string) error
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

	if handler.repository != nil {
		createdRecord, createError := handler.repository.CreateAgent(request.Context(), agentRecord)
		if createError == nil && createdRecord != nil {
			agentRecord = *createdRecord
		}
	}

	if handler.broadcaster != nil {
		handler.broadcaster.Broadcast(payload.WorkspaceID, "AGENT_CREATED", agentRecord)
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

	if handler.repository != nil {
		createdEdge, createError := handler.repository.CreateEdge(request.Context(), edgeRecord)
		if createError == nil && createdEdge != nil {
			edgeRecord = *createdEdge
		}
	}

	response.JSON(writer, http.StatusCreated, edgeRecord)
}

// EdgeDisconnectPayload defines the payload for tearing down a canvas link.
type EdgeDisconnectPayload struct {
	WorkspaceID   string `json:"workspace_id"`
	SourceAgentID string `json:"source_agent_id"`
	TargetAgentID string `json:"target_agent_id"`
}

// DisconnectEdge removes a canvas edge between two agent nodes and tears down the synthesized tool.
func (handler *AgentHandler) DisconnectEdge(writer http.ResponseWriter, request *http.Request) {
	var payload EdgeDisconnectPayload
	if decodeError := json.NewDecoder(request.Body).Decode(&payload); decodeError != nil {
		response.Error(writer, http.StatusBadRequest, "invalid request payload")
		return
	}

	if handler.repository != nil {
		_ = handler.repository.DeleteEdge(request.Context(), payload.WorkspaceID, payload.SourceAgentID, payload.TargetAgentID)
	}

	response.JSON(writer, http.StatusOK, map[string]string{
		"status": "disconnected",
		"source": payload.SourceAgentID,
		"target": payload.TargetAgentID,
	})
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
	switch agent.Provider {
	case domain.ProviderOpenAIDot:
		return generateOpenAIDotPrompt(agent, mcpEndpointURL)
	case domain.ProviderGrokBot:
		return generateGrokBotPrompt(agent, mcpEndpointURL)
	case domain.ProviderMetaMuse:
		return generateMetaMusePrompt(agent, mcpEndpointURL)
	case domain.ProviderClaude:
		return generateClaudePrompt(agent, mcpEndpointURL)
	default:
		return generateDefaultPrompt(agent, mcpEndpointURL)
	}
}

func formatAuthorityRules(rulesList []string) string {
	if len(rulesList) == 0 {
		return "None specified. Request human approval for any high-impact actions."
	}
	var formattedBuilder strings.Builder
	for ruleIndex, ruleItem := range rulesList {
		formattedBuilder.WriteString(fmt.Sprintf("%d. %s\n", ruleIndex+1, ruleItem))
	}
	return formattedBuilder.String()
}

func generateOpenAIDotPrompt(agent domain.Agent, endpointURL string) string {
	return fmt.Sprintf(`### 1. IDENTITY & ROLE
You are %s, an autonomous cloud agent orchestrated via the Dotdeck Switchboard.
You operate as a closed cloud worker paired into a real-time collaborative fleet.

### 2. CORE OBJECTIVE
%s

### 3. OPERATING SCOPE & BOUNDARIES
Execute your mission using available remote tools. Respect all security perimeters and authority gates.

### 4. OUTPUT & REASONING STANDARDS
Deliver clear, high-signal artifacts. Document hypotheses and deductions step-by-step.

### 5. REMOTE MCP SWITCHBOARD ENDPOINT
Connect your Model Context Protocol client to:
%s

### 6. MANDATORY TELEMETRY STANDARD
At every reasoning milestone or before executing tool invocations, you MUST call:
report_thought_step(reasoning_trace, next_planned_step)

### 7. HUMAN-IN-THE-LOOP AUTHORITY RULES
You MUST suspend execution and invoke human review via ask_human_question(question, reasoning_trace) whenever you encounter:
%s

### 8. MULTI-AGENT CANVAS COLLABORATION
When delegating work to peers on the Dotdeck canvas, invoke the synthesized delegate_task_* tools. Provide structured payloads and concise context.`,
		agent.Name,
		agent.Goal,
		endpointURL,
		formatAuthorityRules(agent.AuthorityRules),
	)
}

func generateGrokBotPrompt(agent domain.Agent, endpointURL string) string {
	return fmt.Sprintf(`### GROK CLOUD COMPUTER AGENT DIRECTIVE: %s

## PRIMARY OBJECTIVE:
%s

## REMOTE MCP SWITCHBOARD ENDPOINT:
%s

## EXECUTION & REASONING PROTOCOL:
1. Initialize your session by calling initialize() immediately upon start.
2. Every analytical breakthrough or planned sub-step MUST be broadcast using report_thought_step(reasoning_trace, next_planned_step).
3. If an action crosses the following authority constraints, you MUST halt and call ask_human_question(question, reasoning_trace):
%s
4. Use delegate_task_* tools to route structured payloads to downstream connected canvas agents.`,
		agent.Name,
		agent.Goal,
		endpointURL,
		formatAuthorityRules(agent.AuthorityRules),
	)
}

func generateMetaMusePrompt(agent domain.Agent, endpointURL string) string {
	return fmt.Sprintf(`### META MUSE SECURE VM DIRECTIVE: %s

## MISSION:
%s

## SWITCHBOARD ENDPOINT:
%s

## CHECK-IN WEBHOOK FALLBACK:
If MCP SSE streaming is unavailable in your environment, submit thought updates and state changes via POST to:
%s/checkin

## AUTHORITY CONSTRAINTS:
%s

## COLLABORATION INSTRUCTIONS:
Emit report_thought_step telemetry before running complex routines. Escalate edge cases to workspace operators using ask_human_question.`,
		agent.Name,
		agent.Goal,
		endpointURL,
		endpointURL,
		formatAuthorityRules(agent.AuthorityRules),
	)
}

func generateClaudePrompt(agent domain.Agent, endpointURL string) string {
	return fmt.Sprintf(`### ANTHROPIC CLAUDE SYSTEM PROMPT: %s

You are operating within the Dotdeck Tier 3 Closed Cloud Switchboard.
Remote MCP Endpoint: %s

## CORE MISSION & GOAL:
%s

## MANDATORY BEHAVIORAL CONSTRAINTS:
1. Always maintain high reasoning density and telemetry transparency.
2. Emit intermediate deduction milestones using report_thought_step(reasoning_trace, next_planned_step).
3. Whenever an action conflicts with the following authority boundary, trigger ask_human_question(question, reasoning_trace) and wait for human operator sign-off (up to 45 seconds synchronous hold):
%s
4. Dispatch tasks across the canvas topology using available dynamic delegate_task_* tools.`,
		agent.Name,
		endpointURL,
		agent.Goal,
		formatAuthorityRules(agent.AuthorityRules),
	)
}

func generateDefaultPrompt(agent domain.Agent, endpointURL string) string {
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
%s`,
		agent.Name,
		endpointURL,
		agent.Goal,
		formatAuthorityRules(agent.AuthorityRules),
	)
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

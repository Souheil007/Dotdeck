// Package mcp implements the multi-tenant Model Context Protocol switchboard
// connecting closed cloud agents to the Dotdeck orchestration graph.
package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/Souheil007/Dotdeck/backend/internal/domain"
)

// Standard JSON-RPC 2.0 error codes.
const (
	RPCParseError     = -32700
	RPCInvalidRequest = -32600
	RPCMethodNotFound = -32601
	RPCInvalidParams  = -32602
	RPCInternalError  = -32603
)

// EventBroadcaster delivers real-time notifications to connected workspace clients.
type EventBroadcaster interface {
	Broadcast(workspaceID, eventType string, payload interface{})
}

// PipelineDeliverable represents an artifact or deliverable auto-forwarded across canvas edges.
type PipelineDeliverable struct {
	SourceAgentID   string    `json:"source_agent_id"`
	SourceAgentName string    `json:"source_agent_name"`
	Summary         string    `json:"summary"`
	Deliverable     string    `json:"deliverable"`
	Timestamp       time.Time `json:"timestamp"`
}

// AgentRepository abstracts agent lookup and edge resolution for dynamic tooling.
type AgentRepository interface {
	GetAgentByToken(token string) (*AgentContext, error)
	GetOutboundEdges(agentID string) ([]EdgeContext, error)
	UpdateStatus(agentID, status string) error
	RecordThought(agentID string, step int, trace, nextStep, tool string, payload interface{}) error
	RecordApproval(workspaceID, agentID, question string, options []string, trace string) (string, error)
	CreateAgent(ctx context.Context, agent domain.Agent) (*domain.Agent, error)
	SavePipelineDeliverable(targetAgentID string, deliverable PipelineDeliverable) error
	GetLatestPipelineDeliverable(agentID string) (*PipelineDeliverable, error)
}

// AgentContext contains core metadata required to serve an agent's MCP session.
type AgentContext struct {
	ID          string
	WorkspaceID string
	Name        string
	Provider    string
	Goal        string
	Status      string
}

// EdgeContext defines a directed communication link to another agent on the canvas.
type EdgeContext struct {
	TargetAgentID       string
	TargetAgentName     string
	TargetAgentGoal     string
	TargetAgentProvider string
	ToolName            string
}

// JSONRPCRequest represents a standardized JSON-RPC 2.0 incoming payload.
type JSONRPCRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      interface{}     `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

// RPCErrorDetail describes a JSON-RPC 2.0 error body.
type RPCErrorDetail struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// JSONRPCResponse standardizes outbound responses adhering to JSON-RPC 2.0.
type JSONRPCResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      interface{}     `json:"id"`
	Result  interface{}     `json:"result,omitempty"`
	Error   *RPCErrorDetail `json:"error,omitempty"`
}

type sseSession struct {
	sessionID string
	messages  chan JSONRPCResponse
}

// MaxPayloadBytes limits incoming request bodies to 512 KB to prevent payload exhaustion attacks.
const MaxPayloadBytes = 512 * 1024

// Server handles inbound JSON-RPC 2.0 over HTTP and Server-Sent Events (SSE) for cloud agents.
type Server struct {
	repository        AgentRepository
	holdEngine        *HoldEngine
	broadcaster       EventBroadcaster
	sessionLock       sync.RWMutex
	sessions          map[string]*sseSession
	delegationLock    sync.Mutex
	delegationHistory map[string][]time.Time
	idleTimerLock     sync.Mutex
	idleTimers        map[string]*time.Timer
}

// NewServer configures an MCP endpoint dispatcher for registered cloud agents.
func NewServer(repository AgentRepository, holdEngine *HoldEngine, broadcaster EventBroadcaster) *Server {
	return &Server{
		repository:        repository,
		holdEngine:        holdEngine,
		broadcaster:       broadcaster,
		sessions:          make(map[string]*sseSession),
		delegationHistory: make(map[string][]time.Time),
		idleTimers:        make(map[string]*time.Timer),
	}
}

// resetIdleTimer starts or resets the 60-second inactivity timer that transitions working agents back to resting.
func (server *Server) resetIdleTimer(agentContext *AgentContext) {
	server.idleTimerLock.Lock()
	defer server.idleTimerLock.Unlock()

	if existingTimer, timerFound := server.idleTimers[agentContext.ID]; timerFound && existingTimer != nil {
		existingTimer.Stop()
	}

	server.idleTimers[agentContext.ID] = time.AfterFunc(60*time.Second, func() {
		_ = server.repository.UpdateStatus(agentContext.ID, "resting")
		server.broadcaster.Broadcast(agentContext.WorkspaceID, "AGENT_STATE_CHANGED", map[string]interface{}{
			"agent_id": agentContext.ID,
			"status":   "resting",
		})
	})
}

// stopIdleTimer cancels any active inactivity timer for the designated agent.
func (server *Server) stopIdleTimer(agentID string) {
	server.idleTimerLock.Lock()
	defer server.idleTimerLock.Unlock()

	if activeTimer, timerFound := server.idleTimers[agentID]; timerFound && activeTimer != nil {
		activeTimer.Stop()
		delete(server.idleTimers, agentID)
	}
}

// ServeHTTP routes incoming agent requests identified by the agent URL token or workspace hub path.
func (server *Server) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	pathSuffix := strings.TrimPrefix(request.URL.Path, "/mcp/")
	pathSuffix = strings.TrimSpace(pathSuffix)
	if pathSuffix == "" {
		http.Error(writer, `{"jsonrpc":"2.0","error":{"code":-32600,"message":"missing agent token or workspace id"}}`, http.StatusUnauthorized)
		return
	}

	pathSegments := strings.Split(pathSuffix, "/")
	if len(pathSegments) > 0 && pathSegments[0] == "ws" {
		server.handleWorkspaceHub(writer, request, pathSegments)
		return
	}

	tokenString := pathSegments[0]
	actionSubpath := ""
	if len(pathSegments) > 1 {
		actionSubpath = pathSegments[1]
	}

	agentContext, lookupError := server.repository.GetAgentByToken(tokenString)
	if lookupError != nil || agentContext == nil {
		http.Error(writer, `{"jsonrpc":"2.0","error":{"code":-32600,"message":"unrecognized or expired agent token"}}`, http.StatusNotFound)
		return
	}

	// Protect against payload exhaustion attacks
	request.Body = http.MaxBytesReader(writer, request.Body, MaxPayloadBytes)

	// Handle Webhook Check-in fallback for browser or webhook-only agents (e.g. Meta Muse)
	if actionSubpath == "checkin" && request.Method == http.MethodPost {
		server.handleCheckinWebhook(writer, request, agentContext)
		return
	}

	// Handle Server-Sent Events (SSE) connection negotiation
	if actionSubpath == "sse" || strings.Contains(request.Header.Get("Accept"), "text/event-stream") {
		server.handleSSEStream(writer, request, tokenString, agentContext)
		return
	}

	// Handle GET discovery check
	if request.Method == http.MethodGet {
		writer.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(writer).Encode(map[string]interface{}{
			"status":   "active",
			"agent_id": agentContext.ID,
			"name":     agentContext.Name,
			"protocol": "mcp-2024-11-05",
			"vendor":   agentContext.Provider,
		})
		return
	}

	if request.Method != http.MethodPost {
		http.Error(writer, `{"jsonrpc":"2.0","error":{"code":-32600,"message":"method not allowed"}}`, http.StatusMethodNotAllowed)
		return
	}

	var rpcRequest JSONRPCRequest
	if decodeError := json.NewDecoder(request.Body).Decode(&rpcRequest); decodeError != nil {
		writer.Header().Set("Content-Type", "application/json")
		writer.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(writer).Encode(JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      nil,
			Error: &RPCErrorDetail{
				Code:    RPCParseError,
				Message: "invalid JSON payload received",
			},
		})
		return
	}

	if rpcRequest.JSONRPC != "2.0" {
		writer.Header().Set("Content-Type", "application/json")
		writer.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(writer).Encode(JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Error: &RPCErrorDetail{
				Code:    RPCInvalidRequest,
				Message: "invalid jsonrpc version; must be '2.0'",
			},
		})
		return
	}

	rpcResponse := server.handleMethod(request, agentContext, rpcRequest)

	sessionQueryID := request.URL.Query().Get("session_id")
	if sessionQueryID != "" {
		server.sessionLock.RLock()
		activeSession, sessionExists := server.sessions[sessionQueryID]
		server.sessionLock.RUnlock()

		if sessionExists {
			select {
			case activeSession.messages <- rpcResponse:
				writer.WriteHeader(http.StatusAccepted)
				return
			default:
				// Fall through to synchronous return if channel buffer is full
			}
		}
	}

	writer.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(writer).Encode(rpcResponse)
}

func (server *Server) handleSSEStream(writer http.ResponseWriter, request *http.Request, tokenString string, agentContext *AgentContext) {
	flusher, flusherSupported := writer.(http.Flusher)
	if !flusherSupported {
		http.Error(writer, "Streaming unsupported by client", http.StatusInternalServerError)
		return
	}

	sessionIdentifier := uuid.New().String()
	sessionInstance := &sseSession{
		sessionID: sessionIdentifier,
		messages:  make(chan JSONRPCResponse, 64),
	}

	server.sessionLock.Lock()
	server.sessions[sessionIdentifier] = sessionInstance
	server.sessionLock.Unlock()

	defer func() {
		server.sessionLock.Lock()
		delete(server.sessions, sessionIdentifier)
		server.sessionLock.Unlock()
	}()

	writer.Header().Set("Content-Type", "text/event-stream")
	writer.Header().Set("Cache-Control", "no-cache")
	writer.Header().Set("Connection", "keep-alive")
	writer.Header().Set("X-Accel-Buffering", "no")

	postEndpoint := fmt.Sprintf("/mcp/%s?session_id=%s", tokenString, sessionIdentifier)
	fmt.Fprintf(writer, "event: endpoint\ndata: %s\n\n", postEndpoint)
	flusher.Flush()

	requestContext := request.Context()
	for {
		select {
		case <-requestContext.Done():
			return
		case outboundResponse := <-sessionInstance.messages:
			responseBytes, marshalError := json.Marshal(outboundResponse)
			if marshalError == nil {
				fmt.Fprintf(writer, "event: message\ndata: %s\n\n", string(responseBytes))
				flusher.Flush()
			}
		}
	}
}

func (server *Server) handleCheckinWebhook(writer http.ResponseWriter, request *http.Request, agentContext *AgentContext) {
	var payload struct {
		Status          string      `json:"status"`
		ReasoningTrace  string      `json:"reasoning_trace"`
		NextPlannedStep string      `json:"next_planned_step"`
		ToolCalled      string      `json:"tool_called"`
		PayloadData     interface{} `json:"payload"`
	}

	if decodeError := json.NewDecoder(request.Body).Decode(&payload); decodeError != nil {
		http.Error(writer, `{"error":"invalid checkin body"}`, http.StatusBadRequest)
		return
	}

	targetStatus := payload.Status
	if targetStatus == "" {
		targetStatus = "working"
	}

	_ = server.repository.UpdateStatus(agentContext.ID, targetStatus)
	if payload.ReasoningTrace != "" {
		_ = server.repository.RecordThought(agentContext.ID, 0, payload.ReasoningTrace, payload.NextPlannedStep, payload.ToolCalled, payload.PayloadData)
		server.broadcaster.Broadcast(agentContext.WorkspaceID, "THOUGHT_STEP_EMITTED", map[string]interface{}{
			"id":                uuid.New().String(),
			"agent_id":          agentContext.ID,
			"reasoning_trace":   payload.ReasoningTrace,
			"next_planned_step": payload.NextPlannedStep,
			"tool_called":       payload.ToolCalled,
			"timestamp":         time.Now().UTC(),
		})
	}

	server.broadcaster.Broadcast(agentContext.WorkspaceID, "AGENT_STATE_CHANGED", map[string]interface{}{
		"agent_id": agentContext.ID,
		"status":   targetStatus,
	})

	writer.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(writer).Encode(map[string]interface{}{
		"status":   "acknowledged",
		"agent_id": agentContext.ID,
	})
}

func formatDisplayName(rawName string) string {
	cleaned := strings.ReplaceAll(rawName, "-", " ")
	cleaned = strings.ReplaceAll(cleaned, "_", " ")
	words := strings.Fields(cleaned)
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + strings.ToLower(w[1:])
		}
	}
	formatted := strings.Join(words, " ")
	if formatted == "" {
		return "Cloud Agent"
	}
	if len(words) == 1 && (strings.EqualFold(words[0], "Grok") || strings.EqualFold(words[0], "Claude") || strings.EqualFold(words[0], "Dot") || strings.EqualFold(words[0], "Chatgpt") || strings.EqualFold(words[0], "Openai")) {
		return formatted + " Agent"
	}
	return formatted
}

func inferProvider(name, userAgent string) domain.Provider {
	lower := strings.ToLower(name + " " + userAgent)
	if strings.Contains(lower, "claude") || strings.Contains(lower, "anthropic") {
		return domain.ProviderClaude
	}
	if strings.Contains(lower, "gpt") || strings.Contains(lower, "openai") || strings.Contains(lower, "chatgpt") || strings.Contains(lower, "dot") {
		return domain.ProviderOpenAIDot
	}
	if strings.Contains(lower, "muse") || strings.Contains(lower, "meta") {
		return domain.ProviderMetaMuse
	}
	return domain.ProviderGrokBot
}

// isVendorVerificationProbe checks whether an incoming MCP handshake is an automated infrastructure
// healthcheck, schema validator, or connector registration probe from a vendor platform (e.g. xAI Grok).
func isVendorVerificationProbe(name, userAgent string) bool {
	lowerName := strings.ToLower(name)
	lowerUA := strings.ToLower(userAgent)

	probeKeywords := []string{
		"connector",
		"validator",
		"inspector",
		"probe",
		"healthcheck",
		"test-client",
		"schema-check",
	}

	for _, keyword := range probeKeywords {
		if strings.Contains(lowerName, keyword) || strings.Contains(lowerUA, keyword) {
			return true
		}
	}
	return false
}

// handleWorkspaceHub enables zero-line auto-discovery for cloud agents connecting to /mcp/ws/{workspace_id}.
func (server *Server) handleWorkspaceHub(writer http.ResponseWriter, request *http.Request, pathSegments []string) {
	workspaceID := "default-workspace"
	if len(pathSegments) > 1 && strings.TrimSpace(pathSegments[1]) != "" {
		workspaceID = strings.TrimSpace(pathSegments[1])
	}
	customAlias := ""
	if len(pathSegments) > 2 && strings.TrimSpace(pathSegments[2]) != "" {
		customAlias = strings.TrimSpace(pathSegments[2])
	}

	if request.Method == http.MethodGet {
		writer.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(writer).Encode(map[string]interface{}{
			"status":       "active",
			"workspace_id": workspaceID,
			"mode":         "workspace_hub",
			"protocol":     "mcp-2024-11-05",
		})
		return
	}

	if request.Method != http.MethodPost {
		http.Error(writer, `{"jsonrpc":"2.0","error":{"code":-32600,"message":"method not allowed"}}`, http.StatusMethodNotAllowed)
		return
	}

	request.Body = http.MaxBytesReader(writer, request.Body, MaxPayloadBytes)
	var rpcRequest JSONRPCRequest
	if decodeError := json.NewDecoder(request.Body).Decode(&rpcRequest); decodeError != nil {
		writer.Header().Set("Content-Type", "application/json")
		writer.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(writer).Encode(JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      nil,
			Error: &RPCErrorDetail{
				Code:    RPCParseError,
				Message: "invalid JSON payload received",
			},
		})
		return
	}

	clientName := customAlias
	if rpcRequest.Method == "initialize" {
		var initPayload struct {
			ClientInfo struct {
				Name    string `json:"name"`
				Version string `json:"version"`
			} `json:"clientInfo"`
		}
		_ = json.Unmarshal(rpcRequest.Params, &initPayload)
		if clientName == "" {
			clientName = initPayload.ClientInfo.Name
		}
	}

	// If the incoming client identifier is an internal vendor probe (e.g. connectors-manager, grok-validator),
	// normalize it to the primary vendor identity (e.g. "grok") so that the operator sees exactly ONE clean
	// "Grok Agent" node created upon connection, rather than confusing internal microservice names or nothing at all.
	if isVendorVerificationProbe(clientName, request.UserAgent()) {
		if strings.Contains(strings.ToLower(clientName+" "+request.UserAgent()), "claude") {
			clientName = "claude"
		} else if strings.Contains(strings.ToLower(clientName+" "+request.UserAgent()), "openai") || strings.Contains(strings.ToLower(clientName+" "+request.UserAgent()), "gpt") {
			clientName = "chatgpt"
		} else {
			clientName = "grok"
		}
	}

	if clientName == "" {
		lowerUA := strings.ToLower(request.UserAgent())
		if strings.Contains(lowerUA, "openai") || strings.Contains(lowerUA, "gpt") {
			clientName = "chatgpt"
		} else if strings.Contains(lowerUA, "claude") || strings.Contains(lowerUA, "anthropic") {
			clientName = "claude"
		} else {
			clientName = "grok"
		}
	}

	// Determine deterministic hub token and display name for actual agent
	var hubToken string
	var displayName string
	if customAlias != "" {
		displayName = formatDisplayName(customAlias)
		cleanedAlias := strings.ToLower(customAlias)
		cleanedAlias = strings.ReplaceAll(cleanedAlias, " ", "_")
		cleanedAlias = strings.ReplaceAll(cleanedAlias, "-", "_")
		hubToken = fmt.Sprintf("hub_%s_%s", workspaceID, cleanedAlias)
	} else if clientName != "" && !strings.EqualFold(clientName, "grok") && !strings.EqualFold(clientName, "claude") {
		displayName = formatDisplayName(clientName)
		hubToken = fmt.Sprintf("hub_%s_agent", workspaceID)
	} else {
		// Single fleet agent endpoint /mcp/ws/{workspace_id}
		hubToken = fmt.Sprintf("hub_%s_agent", workspaceID)
		displayName = formatDisplayName(clientName)
	}

	provider := inferProvider(displayName, request.UserAgent())

	agentContext, _ := server.repository.GetAgentByToken(hubToken)
	if agentContext == nil {
		agentID := uuid.New().String()
		agentRecord := domain.Agent{
			ID:          agentID,
			WorkspaceID: workspaceID,
			Token:       hubToken,
			Name:        displayName,
			Provider:    provider,
			Goal:        "Autonomous cloud agent connected via Fleet Hub.",
			Status:      domain.StatusResting,
		}
		_, _ = server.repository.CreateAgent(request.Context(), agentRecord)
		if server.broadcaster != nil {
			server.broadcaster.Broadcast(workspaceID, "AGENT_CREATED", agentRecord)
			server.broadcaster.Broadcast(workspaceID, "AGENT_STATE_CHANGED", map[string]interface{}{
				"agent_id": agentID,
				"status":   "resting",
			})
		}
		agentContext = &AgentContext{
			ID:          agentID,
			WorkspaceID: workspaceID,
			Name:        displayName,
			Provider:    string(provider),
			Goal:        agentRecord.Goal,
			Status:      "resting",
		}
	}

	rpcResponse := server.handleMethod(request, agentContext, rpcRequest)
	writer.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(writer).Encode(rpcResponse)
}

func (server *Server) handleMethod(request *http.Request, agentContext *AgentContext, rpcRequest JSONRPCRequest) JSONRPCResponse {
	switch rpcRequest.Method {
	case "initialize":
		server.stopIdleTimer(agentContext.ID)
		_ = server.repository.UpdateStatus(agentContext.ID, "resting")
		server.broadcaster.Broadcast(agentContext.WorkspaceID, "AGENT_STATE_CHANGED", map[string]interface{}{
			"agent_id": agentContext.ID,
			"status":   "resting",
		})
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result: map[string]interface{}{
				"protocolVersion": "2024-11-05",
				"serverInfo": map[string]string{
					"name":    "dotdeck-switchboard",
					"version": "1.0.0",
				},
				"capabilities": map[string]interface{}{
					"tools":   map[string]bool{"listChanged": true},
					"prompts": map[string]bool{"listChanged": true},
				},
				"instructions": "You are connected to the Dotdeck Swarm Cockpit. " +
					"You MUST invoke report_thought_step to stream intermediate deduction steps, " +
					"ask_human_question before critical mutations, and " +
					"you MUST invoke complete_task to deliver your final findings on the canvas.",
			},
		}

	case "ping":
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result:  map[string]interface{}{},
		}

	case "notifications/initialized", "initialized":
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result:  map[string]interface{}{"status": "acknowledged"},
		}

	case "notifications/cancelled":
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result:  map[string]interface{}{"status": "acknowledged"},
		}

	case "resources/list":
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result:  map[string]interface{}{"resources": []interface{}{}},
		}

	case "resources/templates/list":
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result:  map[string]interface{}{"resourceTemplates": []interface{}{}},
		}

	case "prompts/list":
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result: map[string]interface{}{
				"prompts": []map[string]interface{}{
					{
						"name":        "dotdeck_governance_protocol",
						"description": "Standard operational protocol for autonomous cloud agents connected to Dotdeck",
						"arguments":   []interface{}{},
					},
				},
			},
		}

	case "prompts/get":
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result: map[string]interface{}{
				"description": "Standard Dotdeck operational directives",
				"messages": []map[string]interface{}{
					{
						"role": "user",
						"content": map[string]interface{}{
							"type": "text",
							"text": "CRITICAL DOTDECK PROTOCOL:\n" +
								"1. Stream your reasoning traces via report_thought_step.\n" +
								"2. Pause for operator approval via ask_human_question before irreversible actions.\n" +
								"3. Announce turn/task completion via complete_task(summary).\n" +
								"4. Delegate downstream work via delegate_task_* tools.",
						},
					},
				},
			},
		}

	case "logging/setLevel":
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result:  map[string]interface{}{},
		}

	case "tools/list":
		edges, queryError := server.repository.GetOutboundEdges(agentContext.ID)
		if queryError != nil {
			edges = nil
		}
		toolsList := []ToolDefinition{
			BuildTelemetryTool(),
			BuildHumanApprovalTool(),
			BuildTaskCompletionTool(),
			BuildPipelineIngestionTool(),
		}
		for _, edge := range edges {
			toolsList = append(toolsList, BuildDelegationTool(edge.TargetAgentName, edge.TargetAgentGoal, edge.TargetAgentProvider, edge.ToolName))

			providerSlug := getProviderSlug(edge.TargetAgentProvider)
			if providerSlug != "" && !strings.Contains(edge.ToolName, providerSlug) {
				aliasToolName := fmt.Sprintf("delegate_task_to_%s", providerSlug)
				toolsList = append(toolsList, BuildDelegationTool(edge.TargetAgentName, edge.TargetAgentGoal, edge.TargetAgentProvider, aliasToolName))
			}
		}
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result:  map[string]interface{}{"tools": toolsList},
		}

	case "tools/call":
		return server.handleToolCall(request, agentContext, rpcRequest)

	default:
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Error: &RPCErrorDetail{
				Code:    RPCMethodNotFound,
				Message: fmt.Sprintf("method %q is not supported", rpcRequest.Method),
			},
		}
	}
}

type toolCallArguments struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments"`
}

func (server *Server) handleToolCall(request *http.Request, agentContext *AgentContext, rpcRequest JSONRPCRequest) JSONRPCResponse {
	var callArguments toolCallArguments
	if decodeError := json.Unmarshal(rpcRequest.Params, &callArguments); decodeError != nil || callArguments.Name == "" {
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Error: &RPCErrorDetail{
				Code:    RPCInvalidParams,
				Message: "invalid or missing tool call parameters",
			},
		}
	}

	switch callArguments.Name {
	case "report_thought_step":
		reasoningTrace, _ := callArguments.Arguments["reasoning_trace"].(string)
		nextPlannedStep, _ := callArguments.Arguments["next_planned_step"].(string)

		if reasoningTrace == "" {
			return JSONRPCResponse{
				JSONRPC: "2.0",
				ID:      rpcRequest.ID,
				Error: &RPCErrorDetail{
					Code:    RPCInvalidParams,
					Message: "missing required argument: reasoning_trace",
				},
			}
		}

		stepNumber := 0
		if rawStep, stepExists := callArguments.Arguments["step_index"].(float64); stepExists {
			stepNumber = int(rawStep)
		}

		_ = server.repository.UpdateStatus(agentContext.ID, "working")
		server.resetIdleTimer(agentContext)
		_ = server.repository.RecordThought(agentContext.ID, stepNumber, reasoningTrace, nextPlannedStep, callArguments.Name, nil)

		server.broadcaster.Broadcast(agentContext.WorkspaceID, "THOUGHT_STEP_EMITTED", map[string]interface{}{
			"id":                uuid.New().String(),
			"agent_id":          agentContext.ID,
			"step_index":        stepNumber,
			"reasoning_trace":   reasoningTrace,
			"next_planned_step": nextPlannedStep,
			"timestamp":         time.Now().UTC(),
		})

		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result:  map[string]interface{}{"status": "acknowledged"},
		}

	case "complete_task":
		server.stopIdleTimer(agentContext.ID)
		summaryText, _ := callArguments.Arguments["summary"].(string)
		deliverableText, _ := callArguments.Arguments["deliverable"].(string)

		if summaryText == "" {
			return JSONRPCResponse{
				JSONRPC: "2.0",
				ID:      rpcRequest.ID,
				Error: &RPCErrorDetail{
					Code:    RPCInvalidParams,
					Message: "missing required argument: summary",
				},
			}
		}

		_ = server.repository.UpdateStatus(agentContext.ID, "resting")
		_ = server.repository.RecordThought(agentContext.ID, 0, summaryText, "Task completed", callArguments.Name, map[string]interface{}{
			"deliverable": deliverableText,
		})

		server.broadcaster.Broadcast(agentContext.WorkspaceID, "TASK_COMPLETED", map[string]interface{}{
			"agent_id":    agentContext.ID,
			"summary":     summaryText,
			"deliverable": deliverableText,
			"timestamp":   time.Now().UTC(),
		})

		server.broadcaster.Broadcast(agentContext.WorkspaceID, "AGENT_STATE_CHANGED", map[string]interface{}{
			"agent_id": agentContext.ID,
			"status":   "resting",
		})

		// Automatically route completed deliverable downstream across canvas edges
		outboundEdges, queryError := server.repository.GetOutboundEdges(agentContext.ID)
		if queryError == nil && len(outboundEdges) > 0 {
			for _, edge := range outboundEdges {
				deliverableRecord := PipelineDeliverable{
					SourceAgentID:   agentContext.ID,
					SourceAgentName: agentContext.Name,
					Summary:         summaryText,
					Deliverable:     deliverableText,
					Timestamp:       time.Now().UTC(),
				}
				_ = server.repository.SavePipelineDeliverable(edge.TargetAgentID, deliverableRecord)

				ingressReasoning := fmt.Sprintf("Pipeline deliverable automatically routed from %s (%s): %s", agentContext.Name, FormatProviderVendor(agentContext.Provider), summaryText)
				_ = server.repository.RecordThought(edge.TargetAgentID, 0, ingressReasoning, "Awaiting turn or downstream processing", "pipeline_ingress", map[string]interface{}{
					"source_agent_id":   agentContext.ID,
					"source_agent_name": agentContext.Name,
					"summary":           summaryText,
					"deliverable":       deliverableText,
				})

				_ = server.repository.UpdateStatus(edge.TargetAgentID, "working")

				server.broadcaster.Broadcast(agentContext.WorkspaceID, "HANDOFF_EMITTED", map[string]interface{}{
					"source_agent_id": agentContext.ID,
					"target_agent_id": edge.TargetAgentID,
					"tool_called":     "complete_task",
					"instructions":    fmt.Sprintf("Pipeline deliverable automatically routed from %s: %s", agentContext.Name, summaryText),
					"payload":         deliverableText,
					"reasoning_trace": summaryText,
					"timestamp":       time.Now().UTC(),
				})

				server.broadcaster.Broadcast(agentContext.WorkspaceID, "AGENT_STATE_CHANGED", map[string]interface{}{
					"agent_id": edge.TargetAgentID,
					"status":   "working",
				})
			}
		}

		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result: map[string]interface{}{
				"status":  "completed",
				"message": "Task completion recorded. Output automatically routed downstream across canvas edges.",
			},
		}

	case "fetch_pipeline_deliverable":
		deliverable, lookupError := server.repository.GetLatestPipelineDeliverable(agentContext.ID)
		if lookupError != nil || deliverable == nil {
			return JSONRPCResponse{
				JSONRPC: "2.0",
				ID:      rpcRequest.ID,
				Result: map[string]interface{}{
					"status":  "empty",
					"message": "No upstream deliverables currently in your pipeline inbox. Upstream connected peers have not called complete_task yet.",
				},
			}
		}

		_ = server.repository.RecordThought(agentContext.ID, 0, fmt.Sprintf("Ingested upstream deliverable from %s: %s", deliverable.SourceAgentName, deliverable.Summary), "Processing pipeline deliverable payload", "fetch_pipeline_deliverable", deliverable.Deliverable)
		server.broadcaster.Broadcast(agentContext.WorkspaceID, "THOUGHT_STEP_EMITTED", map[string]interface{}{
			"agent_id":          agentContext.ID,
			"reasoning_trace":   fmt.Sprintf("Ingested upstream deliverable from %s: %s", deliverable.SourceAgentName, deliverable.Summary),
			"next_planned_step": "Processing pipeline deliverable payload",
			"tool_called":       "fetch_pipeline_deliverable",
			"timestamp":         time.Now().UTC(),
		})

		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result: map[string]interface{}{
				"status":      "received",
				"from_agent":  deliverable.SourceAgentName,
				"summary":     deliverable.Summary,
				"deliverable": deliverable.Deliverable,
				"timestamp":   deliverable.Timestamp,
			},
		}

	case "ask_human_question":
		questionText, _ := callArguments.Arguments["question"].(string)
		reasoningTrace, _ := callArguments.Arguments["reasoning_trace"].(string)

		if questionText == "" {
			return JSONRPCResponse{
				JSONRPC: "2.0",
				ID:      rpcRequest.ID,
				Error: &RPCErrorDetail{
					Code:    RPCInvalidParams,
					Message: "missing required argument: question",
				},
			}
		}

		var optionsList []string
		if rawOptions, optionsExist := callArguments.Arguments["options"].([]interface{}); optionsExist {
			for _, optionItem := range rawOptions {
				if stringOption, isString := optionItem.(string); isString {
					optionsList = append(optionsList, stringOption)
				}
			}
		}

		server.stopIdleTimer(agentContext.ID)
		approvalIdentifier := uuid.New().String()
		if recordedID, recordError := server.repository.RecordApproval(agentContext.WorkspaceID, agentContext.ID, questionText, optionsList, reasoningTrace); recordError == nil && recordedID != "" {
			approvalIdentifier = recordedID
		}
		_ = server.repository.UpdateStatus(agentContext.ID, "blocked_on_user")

		server.broadcaster.Broadcast(agentContext.WorkspaceID, "APPROVAL_REQUESTED", map[string]interface{}{
			"approval_id":     approvalIdentifier,
			"agent_id":        agentContext.ID,
			"question":        questionText,
			"options":         optionsList,
			"reasoning_trace": reasoningTrace,
			"status":          "pending",
		})

		decisionRequest := DecisionRequest{
			ID:             approvalIdentifier,
			WorkspaceID:    agentContext.WorkspaceID,
			AgentID:        agentContext.ID,
			Question:       questionText,
			Options:        optionsList,
			ReasoningTrace: reasoningTrace,
			CreatedAt:      time.Now().UTC(),
		}

		decisionOutcome, holdError := server.holdEngine.Hold(request.Context(), decisionRequest, 45*time.Second)
		if holdError != nil {
			_ = server.repository.UpdateStatus(agentContext.ID, "resting")
			return JSONRPCResponse{
				JSONRPC: "2.0",
				ID:      rpcRequest.ID,
				Result: map[string]interface{}{
					"status":  "queued_for_review",
					"message": "Human operator review pending. Task queued; Dotdeck will wake you upon human decision.",
				},
			}
		}

		_ = server.repository.UpdateStatus(agentContext.ID, "working")
		server.resetIdleTimer(agentContext)
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result: map[string]interface{}{
				"status":      "approved",
				"user_answer": decisionOutcome.Answer,
				"approved_by": decisionOutcome.OperatorID,
			},
		}

	default:
		// Check for dynamic cross-agent delegation tools: delegate_task_to_<peer>
		if strings.HasPrefix(callArguments.Name, "delegate_task_") {
			// Enforce runaway cyclic loop guardrail
			if server.CheckDelegationLoop(agentContext.ID) {
				_ = server.repository.UpdateStatus(agentContext.ID, "blocked_on_user")
				server.broadcaster.Broadcast(agentContext.WorkspaceID, "RATE_LIMIT_GUARD", map[string]interface{}{
					"agent_id":    agentContext.ID,
					"tool_called": callArguments.Name,
					"reason":      "Runaway cyclic delegation loop detected (exceeded 5 delegations within 10m window without human review). Execution suspended.",
					"timestamp":   time.Now().UTC(),
				})
				return JSONRPCResponse{
					JSONRPC: "2.0",
					ID:      rpcRequest.ID,
					Error: &RPCErrorDetail{
						Code:    RPCInvalidRequest,
						Message: "Runaway delegation loop detected: agent exceeded 5 peer handoffs without operator interaction. Guardrail activated.",
					},
				}
			}

			reasoningTrace, _ := callArguments.Arguments["current_reasoning_trace"].(string)
			instructionsText, _ := callArguments.Arguments["instructions"].(string)
			artifactPayload := callArguments.Arguments["payload"]

			if instructionsText == "" {
				return JSONRPCResponse{
					JSONRPC: "2.0",
					ID:      rpcRequest.ID,
					Error: &RPCErrorDetail{
						Code:    RPCInvalidParams,
						Message: "missing required argument: instructions",
					},
				}
			}

			// Enforce mandatory piggybacked thought ingestion
			if reasoningTrace != "" {
				_ = server.repository.RecordThought(agentContext.ID, 0, reasoningTrace, "Dispatching task delegation", callArguments.Name, artifactPayload)
				server.broadcaster.Broadcast(agentContext.WorkspaceID, "THOUGHT_STEP_EMITTED", map[string]interface{}{
					"agent_id":          agentContext.ID,
					"reasoning_trace":   reasoningTrace,
					"next_planned_step": "Dispatching task delegation to peer",
					"tool_called":       callArguments.Name,
					"timestamp":         time.Now().UTC(),
				})
			}

			server.broadcaster.Broadcast(agentContext.WorkspaceID, "HANDOFF_EMITTED", map[string]interface{}{
				"source_agent_id": agentContext.ID,
				"tool_called":     callArguments.Name,
				"instructions":    instructionsText,
				"payload":         artifactPayload,
				"reasoning_trace": reasoningTrace,
				"timestamp":       time.Now().UTC(),
			})

			return JSONRPCResponse{
				JSONRPC: "2.0",
				ID:      rpcRequest.ID,
				Result: map[string]interface{}{
					"status":  "handoff_queued",
					"message": "Delegation artifact dispatched via Dotdeck collaborative switchboard.",
				},
			}
		}

		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Error: &RPCErrorDetail{
				Code:    RPCMethodNotFound,
				Message: fmt.Sprintf("unknown tool %q", callArguments.Name),
			},
		}
	}
}

// CheckDelegationLoop inspects recent delegation frequency and halts runaway cyclic messaging.
func (server *Server) CheckDelegationLoop(agentID string) bool {
	server.delegationLock.Lock()
	defer server.delegationLock.Unlock()

	currentTime := time.Now().UTC()
	windowCutoff := currentTime.Add(-10 * time.Minute)

	var recentEvents []time.Time
	for _, timestampItem := range server.delegationHistory[agentID] {
		if timestampItem.After(windowCutoff) {
			recentEvents = append(recentEvents, timestampItem)
		}
	}

	if len(recentEvents) >= 5 {
		server.delegationHistory[agentID] = recentEvents
		return true
	}

	server.delegationHistory[agentID] = append(recentEvents, currentTime)
	return false
}

// ResetDelegationHistory clears the runaway counter after a human operator intervenes.
func (server *Server) ResetDelegationHistory(agentID string) {
	server.delegationLock.Lock()
	defer server.delegationLock.Unlock()
	delete(server.delegationHistory, agentID)
}

// getProviderSlug derives a normalized short vendor token for dynamic delegation aliasing.
func getProviderSlug(rawProvider string) string {
	switch strings.ToLower(rawProvider) {
	case "openai_dot", "chatgpt", "openai":
		return "chatgpt"
	case "grok_bot", "grok", "xai":
		return "grok"
	case "claude", "anthropic":
		return "claude"
	case "meta_muse", "muse", "meta":
		return "muse"
	default:
		return ""
	}
}

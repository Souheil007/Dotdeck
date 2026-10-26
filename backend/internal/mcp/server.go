// Package mcp implements the multi-tenant Model Context Protocol switchboard
// connecting closed cloud agents to the Dotdeck orchestration graph.
package mcp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
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

// AgentRepository abstracts agent lookup and edge resolution for dynamic tooling.
type AgentRepository interface {
	GetAgentByToken(token string) (*AgentContext, error)
	GetOutboundEdges(agentID string) ([]EdgeContext, error)
	UpdateStatus(agentID, status string) error
	RecordThought(agentID string, step int, trace, nextStep, tool string, payload interface{}) error
	RecordApproval(workspaceID, agentID, question string, options []string, trace string) (string, error)
}

// AgentContext contains core metadata required to serve an agent's MCP session.
type AgentContext struct {
	ID          string
	WorkspaceID string
	Name        string
	Provider    string
	Status      string
}

// EdgeContext defines a directed communication link to another agent on the canvas.
type EdgeContext struct {
	TargetAgentID   string
	TargetAgentName string
	ToolName        string
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
}

// NewServer configures an MCP endpoint dispatcher for registered cloud agents.
func NewServer(repository AgentRepository, holdEngine *HoldEngine, broadcaster EventBroadcaster) *Server {
	return &Server{
		repository:        repository,
		holdEngine:        holdEngine,
		broadcaster:       broadcaster,
		sessions:          make(map[string]*sseSession),
		delegationHistory: make(map[string][]time.Time),
	}
}

// ServeHTTP routes incoming agent requests identified by the agent URL token.
func (server *Server) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	pathSuffix := strings.TrimPrefix(request.URL.Path, "/mcp/")
	pathSuffix = strings.TrimSpace(pathSuffix)
	if pathSuffix == "" {
		http.Error(writer, `{"jsonrpc":"2.0","error":{"code":-32600,"message":"missing agent token"}}`, http.StatusUnauthorized)
		return
	}

	pathSegments := strings.Split(pathSuffix, "/")
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

func (server *Server) handleMethod(request *http.Request, agentContext *AgentContext, rpcRequest JSONRPCRequest) JSONRPCResponse {
	switch rpcRequest.Method {
	case "initialize":
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
					"tools": map[string]bool{"listChanged": true},
				},
			},
		}

	case "ping":
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
		}
		for _, edge := range edges {
			toolsList = append(toolsList, BuildDelegationTool(edge.TargetAgentName, edge.ToolName))
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
		_ = server.repository.RecordThought(agentContext.ID, stepNumber, reasoningTrace, nextPlannedStep, callArguments.Name, nil)

		server.broadcaster.Broadcast(agentContext.WorkspaceID, "THOUGHT_STEP_EMITTED", map[string]interface{}{
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

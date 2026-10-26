package mcp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
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

// Server handles inbound JSON-RPC over HTTP/SSE for cloud agents.
type Server struct {
	repo        AgentRepository
	holdEngine  *HoldEngine
	broadcaster EventBroadcaster
}

// NewServer configures an MCP endpoint dispatcher for registered cloud agents.
func NewServer(repo AgentRepository, holdEngine *HoldEngine, broadcaster EventBroadcaster) *Server {
	return &Server{
		repo:        repo,
		holdEngine:  holdEngine,
		broadcaster: broadcaster,
	}
}

// JSONRPCRequest represents a standardized JSON-RPC 2.0 incoming payload.
type JSONRPCRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      interface{}     `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params"`
}

// JSONRPCResponse standardizes outbound responses adhering to JSON-RPC 2.0.
type JSONRPCResponse struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   interface{} `json:"error,omitempty"`
}

// ServeHTTP routes incoming agent requests identified by the agent URL token.
func (server *Server) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	token := strings.TrimPrefix(request.URL.Path, "/mcp/")
	token = strings.TrimSpace(token)
	if token == "" {
		http.Error(writer, `{"error":"missing agent token"}`, http.StatusUnauthorized)
		return
	}

	agent, err := server.repo.GetAgentByToken(token)
	if err != nil || agent == nil {
		http.Error(writer, `{"error":"unrecognized or expired agent token"}`, http.StatusNotFound)
		return
	}

	if request.Method == http.MethodGet {
		writer.Header().Set("Content-Type", "application/json")
		json.NewEncoder(writer).Encode(map[string]interface{}{
			"status":   "active",
			"agent_id": agent.ID,
			"name":     agent.Name,
			"protocol": "mcp-2024-11-05",
		})
		return
	}

	var rpcRequest JSONRPCRequest
	if err := json.NewDecoder(request.Body).Decode(&rpcRequest); err != nil {
		http.Error(writer, `{"error":"malformed json payload"}`, http.StatusBadRequest)
		return
	}

	writer.Header().Set("Content-Type", "application/json")
	resp := server.handleMethod(request, agent, rpcRequest)
	json.NewEncoder(writer).Encode(resp)
}

func (server *Server) handleMethod(request *http.Request, agent *AgentContext, rpcRequest JSONRPCRequest) JSONRPCResponse {
	switch rpcRequest.Method {
	case "initialize":
		_ = server.repo.UpdateStatus(agent.ID, "resting")
		server.broadcaster.Broadcast(agent.WorkspaceID, "AGENT_STATE_CHANGED", map[string]interface{}{
			"agent_id": agent.ID,
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

	case "tools/list":
		edges, _ := server.repo.GetOutboundEdges(agent.ID)
		tools := []ToolDefinition{
			BuildTelemetryTool(),
			BuildHumanApprovalTool(),
		}
		for _, edge := range edges {
			tools = append(tools, BuildDelegationTool(edge.TargetAgentName, edge.ToolName))
		}
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result:  map[string]interface{}{"tools": tools},
		}

	case "tools/call":
		return server.handleToolCall(request, agent, rpcRequest)

	default:
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Error:   map[string]interface{}{"code": -32601, "message": "method not supported"},
		}
	}
}

type toolCallParams struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments"`
}

func (server *Server) handleToolCall(request *http.Request, agent *AgentContext, rpcRequest JSONRPCRequest) JSONRPCResponse {
	var params toolCallParams
	if err := json.Unmarshal(rpcRequest.Params, &params); err != nil {
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Error:   map[string]interface{}{"code": -32602, "message": "invalid arguments"},
		}
	}

	switch params.Name {
	case "report_thought_step":
		trace, _ := params.Arguments["reasoning_trace"].(string)
		nextStep, _ := params.Arguments["next_planned_step"].(string)

		_ = server.repo.UpdateStatus(agent.ID, "working")
		_ = server.repo.RecordThought(agent.ID, 0, trace, nextStep, params.Name, nil)

		server.broadcaster.Broadcast(agent.WorkspaceID, "THOUGHT_STEP_EMITTED", map[string]interface{}{
			"agent_id":          agent.ID,
			"reasoning_trace":   trace,
			"next_planned_step": nextStep,
			"timestamp":         time.Now().UTC(),
		})

		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result:  map[string]interface{}{"status": "acknowledged"},
		}

	case "ask_human_question":
		question, _ := params.Arguments["question"].(string)
		trace, _ := params.Arguments["reasoning_trace"].(string)

		decisionID := uuid.New().String()
		_ = server.repo.UpdateStatus(agent.ID, "blocked_on_user")

		server.broadcaster.Broadcast(agent.WorkspaceID, "APPROVAL_REQUESTED", map[string]interface{}{
			"approval_id":     decisionID,
			"agent_id":        agent.ID,
			"question":        question,
			"reasoning_trace": trace,
			"status":          "pending",
		})

		decReq := DecisionRequest{
			ID:             decisionID,
			WorkspaceID:    agent.WorkspaceID,
			AgentID:        agent.ID,
			Question:       question,
			ReasoningTrace: trace,
			CreatedAt:      time.Now(),
		}

		result, err := server.holdEngine.Hold(request.Context(), decReq, 45*time.Second)
		if err != nil {
			_ = server.repo.UpdateStatus(agent.ID, "resting")
			return JSONRPCResponse{
				JSONRPC: "2.0",
				ID:      rpcRequest.ID,
				Result: map[string]interface{}{
					"status":  "queued_for_review",
					"message": "Human operator review pending. Task queued; you will be awoken upon decision.",
				},
			}
		}

		_ = server.repo.UpdateStatus(agent.ID, "working")
		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Result: map[string]interface{}{
				"status":      "approved",
				"user_answer": result.Answer,
				"approved_by": result.OperatorID,
			},
		}

	default:
		// Check for dynamic cross-agent delegation
		if strings.HasPrefix(params.Name, "delegate_task_") {
			trace, _ := params.Arguments["current_reasoning_trace"].(string)
			instructions, _ := params.Arguments["instructions"].(string)

			server.broadcaster.Broadcast(agent.WorkspaceID, "HANDOFF_EMITTED", map[string]interface{}{
				"source_agent_id": agent.ID,
				"tool_called":     params.Name,
				"instructions":    instructions,
				"reasoning_trace": trace,
				"timestamp":       time.Now().UTC(),
			})

			return JSONRPCResponse{
				JSONRPC: "2.0",
				ID:      rpcRequest.ID,
				Result: map[string]interface{}{
					"status":  "handoff_queued",
					"message": fmt.Sprintf("Delegation dispatched via Dotdeck switchboard."),
				},
			}
		}

		return JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      rpcRequest.ID,
			Error:   map[string]interface{}{"code": -32601, "message": "unknown tool"},
		}
	}
}

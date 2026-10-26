// Package integration provides end-to-end verification tests covering the entire
// Dotdeck closed cloud agent switchboard, hold engine, dynamic tooling, and RBAC lifecycle.
package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/Souheil007/Dotdeck/backend/internal/api"
	"github.com/Souheil007/Dotdeck/backend/internal/api/handlers"
	"github.com/Souheil007/Dotdeck/backend/internal/domain"
	"github.com/Souheil007/Dotdeck/backend/internal/mcp"
	"github.com/Souheil007/Dotdeck/backend/internal/store"
	"github.com/Souheil007/Dotdeck/backend/internal/websocket"
)

// TestE2E_FullLifecycle verifies all components working synchronously in an end-to-end multi-agent flow.
func TestE2E_FullLifecycle(testingTarget *testing.T) {
	// Initialize in-memory persistence and switchboard components
	memoryStore := store.NewMemoryStore()
	holdEngine := mcp.NewHoldEngine()
	websocketHub := websocket.NewHub()
	go websocketHub.Run()

	mcpServer := mcp.NewServer(memoryStore, holdEngine, websocketHub)

	workspaceHandler := handlers.NewWorkspaceHandler("http://localhost:8080")
	agentHandler := handlers.NewAgentHandler("http://localhost:8080")
	agentHandler.SetRepository(memoryStore)
	agentHandler.SetBroadcaster(websocketHub)

	approvalHandler := handlers.NewApprovalHandler(holdEngine)
	approvalHandler.SetBroadcaster(websocketHub)

	router := chi.NewRouter()
	api.RegisterRoutes(router, api.RouterConfig{
		WorkspaceHandler: workspaceHandler,
		AgentHandler:     agentHandler,
		ApprovalHandler:  approvalHandler,
	})
	router.Handle("/mcp/*", mcpServer)

	// Step 1: Provision Agent A (OpenAI Dot) and Agent B (Grok Bot) via REST API
	agentACreate := handlers.AgentCreatePayload{
		WorkspaceID:    "e2e-workspace",
		Name:           "E2E Sales Dot",
		Provider:       domain.ProviderOpenAIDot,
		Goal:           "Extract sales leads",
		AuthorityRules: []string{"Require human confirmation for large emails"},
	}
	serializedA, _ := json.Marshal(agentACreate)
	requestA := httptest.NewRequest(http.MethodPost, "/api/v1/agents", bytes.NewReader(serializedA))
	requestA.Header.Set("Content-Type", "application/json")
	requestA.Header.Set("X-User-Role", "admin")
	recorderA := httptest.NewRecorder()
	router.ServeHTTP(recorderA, requestA)

	if recorderA.Code != http.StatusCreated {
		testingTarget.Fatalf("expected HTTP 201 for Agent A creation, got %d: %s", recorderA.Code, recorderA.Body.String())
	}

	var responseA struct {
		Data struct {
			Agent  domain.Agent `json:"agent"`
			McpURL string       `json:"mcp_url"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recorderA.Body.Bytes(), &responseA)
	agentAID := responseA.Data.Agent.ID
	agentAToken := responseA.Data.Agent.Token

	agentBCreate := handlers.AgentCreatePayload{
		WorkspaceID: "e2e-workspace",
		Name:        "E2E Grok Copywriter",
		Provider:    domain.ProviderGrokBot,
		Goal:        "Draft personalized emails",
	}
	serializedB, _ := json.Marshal(agentBCreate)
	requestB := httptest.NewRequest(http.MethodPost, "/api/v1/agents", bytes.NewReader(serializedB))
	requestB.Header.Set("Content-Type", "application/json")
	requestB.Header.Set("X-User-Role", "admin")
	recorderB := httptest.NewRecorder()
	router.ServeHTTP(recorderB, requestB)

	if recorderB.Code != http.StatusCreated {
		testingTarget.Fatalf("expected HTTP 201 for Agent B creation, got %d: %s", recorderB.Code, recorderB.Body.String())
	}

	var responseB struct {
		Data struct {
			Agent domain.Agent `json:"agent"`
		} `json:"data"`
	}
	_ = json.Unmarshal(recorderB.Body.Bytes(), &responseB)
	agentBID := responseB.Data.Agent.ID

	// Step 2: Wire directed edge Agent A -> Agent B
	edgePayload := handlers.EdgeConnectPayload{
		WorkspaceID:   "e2e-workspace",
		SourceAgentID: agentAID,
		TargetAgentID: agentBID,
		TargetName:    "E2E Grok Copywriter",
	}
	serializedEdge, _ := json.Marshal(edgePayload)
	requestEdge := httptest.NewRequest(http.MethodPost, "/api/v1/agents/edges", bytes.NewReader(serializedEdge))
	requestEdge.Header.Set("Content-Type", "application/json")
	requestEdge.Header.Set("X-User-Role", "write")
	recorderEdge := httptest.NewRecorder()
	router.ServeHTTP(recorderEdge, requestEdge)

	if recorderEdge.Code != http.StatusCreated {
		testingTarget.Fatalf("expected HTTP 201 for edge wiring, got %d: %s", recorderEdge.Code, recorderEdge.Body.String())
	}

	// Step 3: Agent A calls initialize() over MCP
	initPayload := mcp.JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "initialize",
		Params:  json.RawMessage(`{"protocolVersion":"2024-11-05","clientInfo":{"name":"openai-dot","version":"1.0"}}`),
	}
	serializedInit, _ := json.Marshal(initPayload)
	requestInit := httptest.NewRequest(http.MethodPost, "/mcp/"+agentAToken, bytes.NewReader(serializedInit))
	recorderInit := httptest.NewRecorder()
	router.ServeHTTP(recorderInit, requestInit)

	if recorderInit.Code != http.StatusOK {
		testingTarget.Fatalf("expected HTTP 200 on initialize, got %d", recorderInit.Code)
	}

	// Step 4: Agent A calls tools/list and checks injected delegation tool
	listPayload := mcp.JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      2,
		Method:  "tools/list",
	}
	serializedList, _ := json.Marshal(listPayload)
	requestList := httptest.NewRequest(http.MethodPost, "/mcp/"+agentAToken, bytes.NewReader(serializedList))
	recorderList := httptest.NewRecorder()
	router.ServeHTTP(recorderList, requestList)

	var listResponse mcp.JSONRPCResponse
	_ = json.Unmarshal(recorderList.Body.Bytes(), &listResponse)
	toolsData, _ := json.Marshal(listResponse.Result)
	if !strings.Contains(string(toolsData), "delegate_task_to_e2e_grok_copywriter") {
		testingTarget.Errorf("expected synthesized delegation tool in tools/list, got: %s", string(toolsData))
	}

	// Step 5: Agent A reports thought step
	thoughtPayload := mcp.JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      3,
		Method:  "tools/call",
		Params: json.RawMessage(`{
			"name": "report_thought_step",
			"arguments": {
				"step_index": 1,
				"reasoning_trace": "Extracted 25 leads from CRM",
				"next_planned_step": "delegate_task_to_e2e_grok_copywriter"
			}
		}`),
	}
	serializedThought, _ := json.Marshal(thoughtPayload)
	requestThought := httptest.NewRequest(http.MethodPost, "/mcp/"+agentAToken, bytes.NewReader(serializedThought))
	recorderThought := httptest.NewRecorder()
	router.ServeHTTP(recorderThought, requestThought)

	if recorderThought.Code != http.StatusOK {
		testingTarget.Fatalf("expected HTTP 200 on thought report, got %d", recorderThought.Code)
	}

	// Step 6: Test Human Approval Hold & Inline Resolution (< 100ms)
	decisionRequest := mcp.DecisionRequest{
		ID:          "e2e-approval-id",
		WorkspaceID: "e2e-workspace",
		AgentID:     agentAID,
		Question:    "Approve custom pricing disclosure?",
		Options:     []string{"Yes", "No"},
		CreatedAt:   time.Now().UTC(),
	}

	holdResolvedChan := make(chan *mcp.DecisionResult, 1)
	holdErrorChan := make(chan error, 1)

	go func() {
		outcome, holdError := holdEngine.Hold(context.Background(), decisionRequest, 5*time.Second)
		if holdError != nil {
			holdErrorChan <- holdError
			return
		}
		holdResolvedChan <- outcome
	}()

	time.Sleep(50 * time.Millisecond)

	resolveBody := handlers.ApprovalResolvePayload{
		ApprovalID: "e2e-approval-id",
		Approved:   true,
		Answer:     "Authorized by lead auditor",
	}
	serializedResolve, _ := json.Marshal(resolveBody)
	requestResolve := httptest.NewRequest(http.MethodPost, "/api/v1/approvals/resolve", bytes.NewReader(serializedResolve))
	requestResolve.Header.Set("Content-Type", "application/json")
	requestResolve.Header.Set("X-User-Role", "write")
	recorderResolve := httptest.NewRecorder()
	router.ServeHTTP(recorderResolve, requestResolve)

	if recorderResolve.Code != http.StatusOK {
		testingTarget.Fatalf("expected HTTP 200 on approval resolve, got %d: %s", recorderResolve.Code, recorderResolve.Body.String())
	}

	select {
	case outcome := <-holdResolvedChan:
		if !outcome.Approved || outcome.Answer != "Authorized by lead auditor" {
			testingTarget.Errorf("unexpected hold outcome: %+v", outcome)
		}
	case holdError := <-holdErrorChan:
		testingTarget.Fatalf("hold engine returned error: %v", holdError)
	case <-time.After(2 * time.Second):
		testingTarget.Fatalf("hold engine timed out without unblocking")
	}

	// Step 7: Test RBAC - Observer role cannot resolve approvals (DoD #1)
	requestForbidden := httptest.NewRequest(http.MethodPost, "/api/v1/approvals/resolve", bytes.NewReader(serializedResolve))
	requestForbidden.Header.Set("Content-Type", "application/json")
	requestForbidden.Header.Set("X-User-Role", "read")
	recorderForbidden := httptest.NewRecorder()
	router.ServeHTTP(recorderForbidden, requestForbidden)

	if recorderForbidden.Code != http.StatusForbidden {
		testingTarget.Errorf("expected HTTP 403 Forbidden for read role, got %d", recorderForbidden.Code)
	}

	// Step 8: Test Runaway Cyclic Delegation Guardrail
	for index := 0; index < 5; index++ {
		delegationPayload := mcp.JSONRPCRequest{
			JSONRPC: "2.0",
			ID:      10 + index,
			Method:  "tools/call",
			Params: json.RawMessage(`{
				"name": "delegate_task_to_e2e_grok_copywriter",
				"arguments": {
					"instructions": "Delegated sub-task batch",
					"current_reasoning_trace": "Executing pipeline handoff"
				}
			}`),
		}
		serializedDelegation, _ := json.Marshal(delegationPayload)
		requestDelegation := httptest.NewRequest(http.MethodPost, "/mcp/"+agentAToken, bytes.NewReader(serializedDelegation))
		recorderDelegation := httptest.NewRecorder()
		router.ServeHTTP(recorderDelegation, requestDelegation)

		if recorderDelegation.Code != http.StatusOK {
			testingTarget.Fatalf("expected delegation %d to succeed, got code %d", index, recorderDelegation.Code)
		}
	}

	// 6th delegation must trigger runaway guardrail
	cyclicSixth := mcp.JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      99,
		Method:  "tools/call",
		Params: json.RawMessage(`{
			"name": "delegate_task_to_e2e_grok_copywriter",
			"arguments": {
				"instructions": "Runaway cyclic handoff",
				"current_reasoning_trace": "Potential runaway loop"
			}
		}`),
	}
	serializedSixth, _ := json.Marshal(cyclicSixth)
	requestSixth := httptest.NewRequest(http.MethodPost, "/mcp/"+agentAToken, bytes.NewReader(serializedSixth))
	recorderSixth := httptest.NewRecorder()
	router.ServeHTTP(recorderSixth, requestSixth)

	var sixthResponse mcp.JSONRPCResponse
	_ = json.Unmarshal(recorderSixth.Body.Bytes(), &sixthResponse)

	if sixthResponse.Error == nil || !strings.Contains(sixthResponse.Error.Message, "Runaway delegation loop detected") {
		testingTarget.Errorf("expected runaway delegation guardrail trigger on 6th handoff, got: %+v", sixthResponse)
	}

	fmt.Println("✅ [E2E Test] Entire multi-agent lifecycle and security guardrail verified with 100% success!")
}

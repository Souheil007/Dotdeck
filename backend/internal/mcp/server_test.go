// Package mcp provides unit tests validating the multi-tenant JSON-RPC 2.0 switchboard.
package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Souheil007/Dotdeck/backend/internal/domain"
)

type mockBroadcaster struct {
	events []string
}

func (broadcaster *mockBroadcaster) Broadcast(workspaceID, eventType string, payload interface{}) {
	broadcaster.events = append(broadcaster.events, eventType)
}

type mockAgentRepository struct {
	agents  map[string]*AgentContext
	edges   map[string][]EdgeContext
	status  map[string]string
	thought []string
}

func newMockRepository() *mockAgentRepository {
	return &mockAgentRepository{
		agents: make(map[string]*AgentContext),
		edges:  make(map[string][]EdgeContext),
		status: make(map[string]string),
	}
}

func (repository *mockAgentRepository) GetAgentByToken(token string) (*AgentContext, error) {
	agentContext, exists := repository.agents[token]
	if !exists {
		return nil, nil
	}
	return agentContext, nil
}

func (repository *mockAgentRepository) GetOutboundEdges(agentID string) ([]EdgeContext, error) {
	return repository.edges[agentID], nil
}

func (repository *mockAgentRepository) UpdateStatus(agentID, status string) error {
	repository.status[agentID] = status
	return nil
}

func (repository *mockAgentRepository) RecordThought(agentID string, step int, trace, nextStep, tool string, payload interface{}) error {
	repository.thought = append(repository.thought, trace)
	return nil
}

func (repository *mockAgentRepository) RecordApproval(workspaceID, agentID, question string, options []string, trace string) (string, error) {
	return "mock-approval-id", nil
}

func (repository *mockAgentRepository) CreateAgent(ctx context.Context, agent domain.Agent) (*domain.Agent, error) {
	repository.agents[agent.Token] = &AgentContext{
		ID:          agent.ID,
		WorkspaceID: agent.WorkspaceID,
		Name:        agent.Name,
		Provider:    string(agent.Provider),
		Goal:        agent.Goal,
		Status:      string(agent.Status),
	}
	return &agent, nil
}

// TestMCPServerInitialize validates the JSON-RPC 2.0 initialize handshake.
func TestMCPServerInitialize(testingT *testing.T) {
	mockRepo := newMockRepository()
	agentToken := "valid-agent-token-123"
	mockRepo.agents[agentToken] = &AgentContext{
		ID:          "agent-id-1",
		WorkspaceID: "ws-1",
		Name:        "Data Analyzer Dot",
		Provider:    "openai_dot",
		Status:      "unpaired",
	}

	broadcaster := &mockBroadcaster{}
	holdEngine := NewHoldEngine()
	mcpServer := NewServer(mockRepo, holdEngine, broadcaster)

	requestBody := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "initialize",
		"params": map[string]interface{}{
			"protocolVersion": "2024-11-05",
			"clientInfo": map[string]string{
				"name":    "openai-dot-client",
				"version": "1.0",
			},
		},
	}
	serializedBytes, _ := json.Marshal(requestBody)

	request := httptest.NewRequest(http.MethodPost, "/mcp/"+agentToken, bytes.NewReader(serializedBytes))
	recorder := httptest.NewRecorder()

	mcpServer.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		testingT.Fatalf("expected HTTP 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var rpcResponse JSONRPCResponse
	if decodeError := json.Unmarshal(recorder.Body.Bytes(), &rpcResponse); decodeError != nil {
		testingT.Fatalf("failed to decode response: %v", decodeError)
	}

	if rpcResponse.Error != nil {
		testingT.Fatalf("expected nil error, got code %d: %s", rpcResponse.Error.Code, rpcResponse.Error.Message)
	}

	resultMap, isMap := rpcResponse.Result.(map[string]interface{})
	if !isMap || resultMap["protocolVersion"] != "2024-11-05" {
		testingT.Errorf("expected protocolVersion 2024-11-05, got %v", resultMap["protocolVersion"])
	}

	if mockRepo.status["agent-id-1"] != "resting" {
		testingT.Errorf("expected status 'resting', got %q", mockRepo.status["agent-id-1"])
	}
}

// TestMCPServerToolsList verifies standard tools and dynamic edge synthesis.
func TestMCPServerToolsList(testingT *testing.T) {
	mockRepo := newMockRepository()
	agentToken := "source-agent-token"
	sourceAgentID := "source-id"
	mockRepo.agents[agentToken] = &AgentContext{
		ID:          sourceAgentID,
		WorkspaceID: "ws-1",
		Name:        "Researcher Dot",
		Provider:    "openai_dot",
		Status:      "resting",
	}
	mockRepo.edges[sourceAgentID] = []EdgeContext{
		{
			TargetAgentID:   "target-id",
			TargetAgentName: "Writer Grok Bot",
			TargetAgentGoal: "Compose high-converting sales copy",
			ToolName:        "delegate_task_to_writer_grok_bot",
		},
	}

	broadcaster := &mockBroadcaster{}
	holdEngine := NewHoldEngine()
	mcpServer := NewServer(mockRepo, holdEngine, broadcaster)

	requestBody := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      2,
		"method":  "tools/list",
	}
	serializedBytes, _ := json.Marshal(requestBody)

	request := httptest.NewRequest(http.MethodPost, "/mcp/"+agentToken, bytes.NewReader(serializedBytes))
	recorder := httptest.NewRecorder()

	mcpServer.ServeHTTP(recorder, request)

	var rpcResponse struct {
		JSONRPC string `json:"jsonrpc"`
		Result  struct {
			Tools []ToolDefinition `json:"tools"`
		} `json:"result"`
	}
	_ = json.Unmarshal(recorder.Body.Bytes(), &rpcResponse)

	foundTelemetry := false
	foundApproval := false
	foundDelegation := false

	for _, toolItem := range rpcResponse.Result.Tools {
		switch toolItem.Name {
		case "report_thought_step":
			foundTelemetry = true
		case "ask_human_question":
			foundApproval = true
		case "delegate_task_to_writer_grok_bot":
			foundDelegation = true
			if !strings.Contains(toolItem.Description, "Compose high-converting sales copy") {
				testingT.Errorf("expected tool description to contain peer goal, got: %q", toolItem.Description)
			}
		}
	}

	if !foundTelemetry || !foundApproval || !foundDelegation {
		testingT.Errorf("expected all 3 tools, got telemetry=%v, approval=%v, delegation=%v", foundTelemetry, foundApproval, foundDelegation)
	}
}

// TestMCPServerReportThoughtStep validates analytical trace ingestion and broadcasting.
func TestMCPServerReportThoughtStep(testingT *testing.T) {
	mockRepo := newMockRepository()
	agentToken := "telemetry-token"
	agentID := "agent-telemetry-id"
	mockRepo.agents[agentToken] = &AgentContext{
		ID:          agentID,
		WorkspaceID: "ws-1",
		Name:        "Finance Dot",
		Provider:    "openai_dot",
		Status:      "resting",
	}

	broadcaster := &mockBroadcaster{}
	holdEngine := NewHoldEngine()
	mcpServer := NewServer(mockRepo, holdEngine, broadcaster)

	requestBody := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      3,
		"method":  "tools/call",
		"params": map[string]interface{}{
			"name": "report_thought_step",
			"arguments": map[string]interface{}{
				"reasoning_trace":   "Calculated Q3 MRR growth at +14.2%.",
				"next_planned_step": "Draft leadership memo.",
				"step_index":        1,
			},
		},
	}
	serializedBytes, _ := json.Marshal(requestBody)

	request := httptest.NewRequest(http.MethodPost, "/mcp/"+agentToken, bytes.NewReader(serializedBytes))
	recorder := httptest.NewRecorder()

	mcpServer.ServeHTTP(recorder, request)

	if mockRepo.status[agentID] != "working" {
		testingT.Errorf("expected status 'working', got %q", mockRepo.status[agentID])
	}

	if len(mockRepo.thought) != 1 || mockRepo.thought[0] != "Calculated Q3 MRR growth at +14.2%." {
		testingT.Errorf("expected thought recorded, got %v", mockRepo.thought)
	}

	foundBroadcast := false
	for _, eventType := range broadcaster.events {
		if eventType == "THOUGHT_STEP_EMITTED" {
			foundBroadcast = true
		}
	}
	if !foundBroadcast {
		testingT.Errorf("expected THOUGHT_STEP_EMITTED broadcast event")
	}
}

// TestMCPServerCompleteTask validates that complete_task records the summary and transitions the agent to resting.
func TestMCPServerCompleteTask(testingT *testing.T) {
	mockRepo := newMockRepository()
	agentToken := "complete-token"
	agentID := "agent-completer"
	mockRepo.agents[agentToken] = &AgentContext{
		ID:          agentID,
		WorkspaceID: "ws-1",
		Name:        "Summary Bot",
		Provider:    "grok_bot",
		Status:      "working",
	}

	broadcaster := &mockBroadcaster{}
	holdEngine := NewHoldEngine()
	mcpServer := NewServer(mockRepo, holdEngine, broadcaster)

	requestBody := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      4,
		"method":  "tools/call",
		"params": map[string]interface{}{
			"name": "complete_task",
			"arguments": map[string]interface{}{
				"summary":     "Delivered concise 3-bullet summary of eXalt candidate notification.",
				"deliverable": "Detailed markdown deliverable content.",
			},
		},
	}
	serializedBytes, _ := json.Marshal(requestBody)

	request := httptest.NewRequest(http.MethodPost, "/mcp/"+agentToken, bytes.NewReader(serializedBytes))
	recorder := httptest.NewRecorder()

	mcpServer.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		testingT.Fatalf("expected HTTP 200, got %d", recorder.Code)
	}

	if mockRepo.status[agentID] != "resting" {
		testingT.Errorf("expected status 'resting', got %q", mockRepo.status[agentID])
	}

	foundTaskCompleted := false
	foundStateChanged := false
	for _, eventType := range broadcaster.events {
		if eventType == "TASK_COMPLETED" {
			foundTaskCompleted = true
		}
		if eventType == "AGENT_STATE_CHANGED" {
			foundStateChanged = true
		}
	}

	if !foundTaskCompleted {
		testingT.Errorf("expected TASK_COMPLETED broadcast event")
	}
	if !foundStateChanged {
		testingT.Errorf("expected AGENT_STATE_CHANGED broadcast event")
	}
}

// TestMCPServerPiggybackedDelegation validates that dynamic delegation captures reasoning traces.
func TestMCPServerPiggybackedDelegation(testingT *testing.T) {
	mockRepo := newMockRepository()
	agentToken := "delegation-token"
	agentID := "agent-delegator"
	mockRepo.agents[agentToken] = &AgentContext{
		ID:          agentID,
		WorkspaceID: "ws-1",
		Name:        "Lead Qualifier Dot",
		Provider:    "openai_dot",
		Status:      "working",
	}

	broadcaster := &mockBroadcaster{}
	holdEngine := NewHoldEngine()
	mcpServer := NewServer(mockRepo, holdEngine, broadcaster)

	requestBody := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      4,
		"method":  "tools/call",
		"params": map[string]interface{}{
			"name": "delegate_task_to_closer_bot",
			"arguments": map[string]interface{}{
				"instructions":            "Send pricing sheet to enterprise prospect.",
				"current_reasoning_trace": "Prospect passed BANT qualification criteria.",
				"payload": map[string]interface{}{
					"lead_score": 98,
				},
			},
		},
	}
	serializedBytes, _ := json.Marshal(requestBody)

	request := httptest.NewRequest(http.MethodPost, "/mcp/"+agentToken, bytes.NewReader(serializedBytes))
	recorder := httptest.NewRecorder()

	mcpServer.ServeHTTP(recorder, request)

	if len(mockRepo.thought) != 1 || mockRepo.thought[0] != "Prospect passed BANT qualification criteria." {
		testingT.Errorf("expected piggybacked thought recorded, got %v", mockRepo.thought)
	}

	foundHandoff := false
	for _, eventType := range broadcaster.events {
		if eventType == "HANDOFF_EMITTED" {
			foundHandoff = true
		}
	}
	if !foundHandoff {
		testingT.Errorf("expected HANDOFF_EMITTED broadcast event")
	}
}

// TestMCPServerErrorCodes verifies standard JSON-RPC 2.0 error responses.
func TestMCPServerErrorCodes(testingT *testing.T) {
	mockRepo := newMockRepository()
	agentToken := "error-token"
	mockRepo.agents[agentToken] = &AgentContext{
		ID:          "agent-error",
		WorkspaceID: "ws-1",
		Name:        "Error Dot",
		Provider:    "openai_dot",
		Status:      "resting",
	}

	broadcaster := &mockBroadcaster{}
	holdEngine := NewHoldEngine()
	mcpServer := NewServer(mockRepo, holdEngine, broadcaster)

	// Case 1: Malformed JSON -> RPCParseError (-32700)
	badJSONRequest := httptest.NewRequest(http.MethodPost, "/mcp/"+agentToken, strings.NewReader("{not valid json"))
	badJSONRecorder := httptest.NewRecorder()
	mcpServer.ServeHTTP(badJSONRecorder, badJSONRequest)

	var parseErrorResponse JSONRPCResponse
	_ = json.Unmarshal(badJSONRecorder.Body.Bytes(), &parseErrorResponse)
	if parseErrorResponse.Error == nil || parseErrorResponse.Error.Code != RPCParseError {
		testingT.Errorf("expected error code %d, got %v", RPCParseError, parseErrorResponse.Error)
	}

	// Case 2: Unknown method -> RPCMethodNotFound (-32601)
	unknownMethodRequest := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      10,
		"method":  "unsupported_method",
	}
	methodBytes, _ := json.Marshal(unknownMethodRequest)
	unknownMethodHTTP := httptest.NewRequest(http.MethodPost, "/mcp/"+agentToken, bytes.NewReader(methodBytes))
	unknownMethodRecorder := httptest.NewRecorder()
	mcpServer.ServeHTTP(unknownMethodRecorder, unknownMethodHTTP)

	var methodErrorResponse JSONRPCResponse
	_ = json.Unmarshal(unknownMethodRecorder.Body.Bytes(), &methodErrorResponse)
	if methodErrorResponse.Error == nil || methodErrorResponse.Error.Code != RPCMethodNotFound {
		testingT.Errorf("expected error code %d, got %v", RPCMethodNotFound, methodErrorResponse.Error)
	}

	// Case 3: Missing required tool argument -> RPCInvalidParams (-32602)
	invalidParamsRequest := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      11,
		"method":  "tools/call",
		"params": map[string]interface{}{
			"name": "report_thought_step",
			"arguments": map[string]interface{}{
				"next_planned_step": "Missing reasoning_trace",
			},
		},
	}
	paramsBytes, _ := json.Marshal(invalidParamsRequest)
	invalidParamsHTTP := httptest.NewRequest(http.MethodPost, "/mcp/"+agentToken, bytes.NewReader(paramsBytes))
	invalidParamsRecorder := httptest.NewRecorder()
	mcpServer.ServeHTTP(invalidParamsRecorder, invalidParamsHTTP)

	var paramsErrorResponse JSONRPCResponse
	_ = json.Unmarshal(invalidParamsRecorder.Body.Bytes(), &paramsErrorResponse)
	if paramsErrorResponse.Error == nil || paramsErrorResponse.Error.Code != RPCInvalidParams {
		testingT.Errorf("expected error code %d, got %v", RPCInvalidParams, paramsErrorResponse.Error)
	}
}

// TestMCPServerCheckinWebhook validates the fallback webhook for Meta Muse and web-applet agents.
func TestMCPServerCheckinWebhook(testingT *testing.T) {
	mockRepo := newMockRepository()
	agentToken := "muse-token"
	agentID := "agent-muse"
	mockRepo.agents[agentToken] = &AgentContext{
		ID:          agentID,
		WorkspaceID: "ws-1",
		Name:        "Meta Muse Assistant",
		Provider:    "meta_muse",
		Status:      "resting",
	}

	broadcaster := &mockBroadcaster{}
	holdEngine := NewHoldEngine()
	mcpServer := NewServer(mockRepo, holdEngine, broadcaster)

	checkinPayload := map[string]interface{}{
		"status":            "working",
		"reasoning_trace":   "Processing user interface survey results.",
		"next_planned_step": "Synthesize sentiment report.",
		"tool_called":       "sentiment_analyzer",
	}
	serializedBytes, _ := json.Marshal(checkinPayload)

	request := httptest.NewRequest(http.MethodPost, "/mcp/"+agentToken+"/checkin", bytes.NewReader(serializedBytes))
	recorder := httptest.NewRecorder()

	mcpServer.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		testingT.Fatalf("expected HTTP 200, got %d", recorder.Code)
	}

	if mockRepo.status[agentID] != "working" {
		testingT.Errorf("expected status 'working', got %q", mockRepo.status[agentID])
	}

	if len(mockRepo.thought) != 1 || mockRepo.thought[0] != "Processing user interface survey results." {
		testingT.Errorf("expected thought recorded via checkin, got %v", mockRepo.thought)
	}
}

// TestMCPServerSSEEndpointEmission validates that SSE connection negotiation emits the post endpoint.
func TestMCPServerSSEEndpointEmission(testingT *testing.T) {
	mockRepo := newMockRepository()
	agentToken := "sse-agent-token"
	mockRepo.agents[agentToken] = &AgentContext{
		ID:          "agent-sse-id",
		WorkspaceID: "ws-1",
		Name:        "Claude Cloud Agent",
		Provider:    "claude",
		Status:      "resting",
	}

	broadcaster := &mockBroadcaster{}
	holdEngine := NewHoldEngine()
	mcpServer := NewServer(mockRepo, holdEngine, broadcaster)

	requestContext, cancelRequest := context.WithCancel(context.Background())
	request := httptest.NewRequest(http.MethodGet, "/mcp/"+agentToken+"/sse", nil).WithContext(requestContext)
	request.Header.Set("Accept", "text/event-stream")

	recorder := httptest.NewRecorder()

	doneChan := make(chan struct{})
	go func() {
		mcpServer.ServeHTTP(recorder, request)
		close(doneChan)
	}()

	time.Sleep(50 * time.Millisecond)
	cancelRequest()
	<-doneChan

	responseBody := recorder.Body.String()
	if !strings.Contains(responseBody, "event: endpoint") || !strings.Contains(responseBody, "/mcp/"+agentToken+"?session_id=") {
		testingT.Errorf("expected SSE stream to emit endpoint event with session_id, got: %s", responseBody)
	}
}

// TestMCPServerRunawayDelegationGuardrail validates that cyclic delegations beyond 5 times in 10 minutes trigger RATE_LIMIT_GUARD.
func TestMCPServerRunawayDelegationGuardrail(testingTarget *testing.T) {
	mockRepo := newMockRepository()
	agentToken := "delegation-loop-token"
	agentID := "agent-loop-source"
	mockRepo.agents[agentToken] = &AgentContext{
		ID:          agentID,
		WorkspaceID: "ws-loop",
		Name:        "Looper Dot",
		Provider:    "openai_dot",
		Status:      "working",
	}

	broadcaster := &mockBroadcaster{}
	holdEngine := NewHoldEngine()
	mcpServer := NewServer(mockRepo, holdEngine, broadcaster)

	// First 5 delegations should succeed (status: handoff_queued)
	for iterationIndex := 0; iterationIndex < 5; iterationIndex++ {
		payload := JSONRPCRequest{
			JSONRPC: "2.0",
			ID:      iterationIndex + 1,
			Method:  "tools/call",
			Params: json.RawMessage(`{
				"name": "delegate_task_to_peer",
				"arguments": {
					"instructions": "Process cyclic batch data",
					"current_reasoning_trace": "Iteration delegation step"
				}
			}`),
		}

		serializedPayload, _ := json.Marshal(payload)
		request := httptest.NewRequest(http.MethodPost, "/mcp/"+agentToken, bytes.NewReader(serializedPayload))
		recorder := httptest.NewRecorder()

		mcpServer.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			testingTarget.Fatalf("expected HTTP 200 on iteration %d, got %d", iterationIndex, recorder.Code)
		}

		var rpcResponse JSONRPCResponse
		_ = json.Unmarshal(recorder.Body.Bytes(), &rpcResponse)
		if rpcResponse.Error != nil {
			testingTarget.Fatalf("expected success on iteration %d, got error: %v", iterationIndex, rpcResponse.Error.Message)
		}
	}

	// The 6th delegation within the window MUST be blocked by the runaway loop guardrail
	payloadSixth := JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      6,
		Method:  "tools/call",
		Params: json.RawMessage(`{
			"name": "delegate_task_to_peer",
			"arguments": {
				"instructions": "Exceeding limit batch",
				"current_reasoning_trace": "Blocked iteration"
			}
		}`),
	}

	serializedSixth, _ := json.Marshal(payloadSixth)
	requestSixth := httptest.NewRequest(http.MethodPost, "/mcp/"+agentToken, bytes.NewReader(serializedSixth))
	recorderSixth := httptest.NewRecorder()

	mcpServer.ServeHTTP(recorderSixth, requestSixth)

	var rpcResponseSixth JSONRPCResponse
	_ = json.Unmarshal(recorderSixth.Body.Bytes(), &rpcResponseSixth)

	if rpcResponseSixth.Error == nil {
		testingTarget.Fatalf("expected 6th delegation to trigger runaway loop error, got success: %v", rpcResponseSixth.Result)
	}

	if !strings.Contains(rpcResponseSixth.Error.Message, "Runaway delegation loop detected") {
		testingTarget.Errorf("expected error message to mention runaway loop, got: %s", rpcResponseSixth.Error.Message)
	}

	// Verify RATE_LIMIT_GUARD was broadcasted to canvas
	foundGuardEvent := false
	for _, eventItem := range broadcaster.events {
		if eventItem == "RATE_LIMIT_GUARD" {
			foundGuardEvent = true
			break
		}
	}

	if !foundGuardEvent {
		testingTarget.Errorf("expected RATE_LIMIT_GUARD event broadcasted to canvas, events were: %v", broadcaster.events)
	}

	// Verify agent status flipped to blocked_on_user
	if mockRepo.status[agentID] != "blocked_on_user" {
		testingTarget.Errorf("expected agent status blocked_on_user, got: %s", mockRepo.status[agentID])
	}
}

// TestWorkspaceHub_AutoDiscovery validates that cloud agents connecting to the workspace hub
// endpoint (/mcp/ws/{workspace_id}) are automatically discovered, provisioned, and initialized.
func TestWorkspaceHub_AutoDiscovery(testingTarget *testing.T) {
	mockRepo := newMockRepository()
	broadcaster := &mockBroadcaster{}
	holdEngine := NewHoldEngine()
	mcpServer := NewServer(mockRepo, holdEngine, broadcaster)

	requestBody := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "initialize",
		"params": map[string]interface{}{
			"protocolVersion": "2024-11-05",
			"clientInfo": map[string]string{
				"name":    "grok-email-viewer",
				"version": "1.0",
			},
		},
	}
	serializedBytes, _ := json.Marshal(requestBody)

	request := httptest.NewRequest(http.MethodPost, "/mcp/ws/ws-test-hub", bytes.NewReader(serializedBytes))
	recorder := httptest.NewRecorder()

	mcpServer.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		testingTarget.Fatalf("expected HTTP 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var rpcResponse JSONRPCResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &rpcResponse); err != nil {
		testingTarget.Fatalf("failed to parse JSON-RPC response: %v", err)
	}

	resultMap, ok := rpcResponse.Result.(map[string]interface{})
	if !ok {
		testingTarget.Fatalf("expected result object in response, got %v", rpcResponse.Result)
	}

	instructions, ok := resultMap["instructions"].(string)
	if !ok || !strings.Contains(instructions, "Dotdeck Swarm Cockpit") {
		testingTarget.Errorf("expected autonomous protocol instructions in initialize result, got: %v", instructions)
	}

	// Verify agent auto-provisioned in mockRepo
	if len(mockRepo.agents) != 1 {
		testingTarget.Fatalf("expected 1 agent auto-provisioned, found %d", len(mockRepo.agents))
	}

	var discoveredAgent *AgentContext
	for _, a := range mockRepo.agents {
		discoveredAgent = a
		break
	}

	if discoveredAgent.Name != "Grok Email Viewer" {
		testingTarget.Errorf("expected formatted name 'Grok Email Viewer', got: %s", discoveredAgent.Name)
	}

	if discoveredAgent.Provider != "grok_bot" {
		testingTarget.Errorf("expected provider 'grok_bot', got: %s", discoveredAgent.Provider)
	}

	if discoveredAgent.WorkspaceID != "ws-test-hub" {
		testingTarget.Errorf("expected workspace ID 'ws-test-hub', got: %s", discoveredAgent.WorkspaceID)
	}

	// Verify AGENT_CREATED was broadcasted
	createdFound := false
	for _, event := range broadcaster.events {
		if event == "AGENT_CREATED" {
			createdFound = true
			break
		}
	}
	if !createdFound {
		testingTarget.Errorf("expected AGENT_CREATED event broadcasted, got: %v", broadcaster.events)
	}

	// Test prompts/list
	promptsListReq := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      2,
		"method":  "prompts/list",
		"params":  map[string]interface{}{},
	}
	listBytes, _ := json.Marshal(promptsListReq)
	reqList := httptest.NewRequest(http.MethodPost, "/mcp/ws/ws-test-hub", bytes.NewReader(listBytes))
	recList := httptest.NewRecorder()
	mcpServer.ServeHTTP(recList, reqList)

	var listResp JSONRPCResponse
	_ = json.Unmarshal(recList.Body.Bytes(), &listResp)
	listMap, _ := listResp.Result.(map[string]interface{})
	promptsArr, ok := listMap["prompts"].([]interface{})
	if !ok || len(promptsArr) == 0 {
		testingTarget.Errorf("expected non-empty prompts array from prompts/list, got: %v", listResp.Result)
	}

	// Test prompts/get
	promptsGetReq := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      3,
		"method":  "prompts/get",
		"params": map[string]interface{}{
			"name": "dotdeck_governance_protocol",
		},
	}
	getBytes, _ := json.Marshal(promptsGetReq)
	reqGet := httptest.NewRequest(http.MethodPost, "/mcp/ws/ws-test-hub", bytes.NewReader(getBytes))
	recGet := httptest.NewRecorder()
	mcpServer.ServeHTTP(recGet, reqGet)

	var getResp JSONRPCResponse
	_ = json.Unmarshal(recGet.Body.Bytes(), &getResp)
	getMap, _ := getResp.Result.(map[string]interface{})
	messagesArr, ok := getMap["messages"].([]interface{})
	if !ok || len(messagesArr) == 0 {
		testingTarget.Errorf("expected messages array in prompts/get result, got: %v", getResp.Result)
	}
}

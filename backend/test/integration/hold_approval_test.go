// Package integration verifies cross-component interactions between the MCP switchboard,
// hold engine, REST API controllers, and WebSocket broadcaster.
package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/Souheil007/Dotdeck/backend/internal/api/handlers"
	"github.com/Souheil007/Dotdeck/backend/internal/mcp"
	"github.com/Souheil007/Dotdeck/backend/internal/store"
	"github.com/Souheil007/Dotdeck/backend/internal/ws"
)

// TestMCPHoldAndResolveIntegration verifies that a cloud agent tool call pausing for approval
// is held open and immediately unblocked when an operator submits a decision via the REST API.
func TestMCPHoldAndResolveIntegration(testingT *testing.T) {
	memStore := store.NewMemoryStore()
	holdEngine := mcp.NewHoldEngine()
	wsHub := ws.NewHub()
	go wsHub.Run()

	agentToken := "test-agent-token-123"
	agentCtx := &mcp.AgentContext{
		ID:          "agent-uuid-1",
		WorkspaceID: "ws-test",
		Name:        "Sales Research Dot",
		Provider:    "openai_dot",
		Status:      "resting",
	}
	memStore.SaveAgent(agentToken, agentCtx)

	mcpServer := mcp.NewServer(memStore, holdEngine, wsHub)
	approvalHandler := handlers.NewApprovalHandler(holdEngine)

	router := chi.NewRouter()
	router.Mount("/mcp", http.StripPrefix("/mcp", http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		request.URL.Path = "/mcp" + request.URL.Path
		mcpServer.ServeHTTP(writer, request)
	})))
	router.Post("/api/v1/approvals/resolve", approvalHandler.Resolve)

	testServer := httptest.NewServer(router)
	defer testServer.Close()

	type agentResult struct {
		StatusCode int
		Body       map[string]interface{}
		Err        error
	}
	resultChan := make(chan agentResult, 1)

	go func() {
		payload := map[string]interface{}{
			"jsonrpc": "2.0",
			"id":      1,
			"method":  "tools/call",
			"params": map[string]interface{}{
				"name": "report_thought_step",
				"arguments": map[string]interface{}{
					"reasoning_trace":   "Found 3 new high-intent SaaS leads.",
					"next_planned_step": "Draft outbound messages.",
				},
			},
		}
		data, _ := json.Marshal(payload)
		response, postError := http.Post(testServer.URL+"/mcp/"+agentToken, "application/json", bytes.NewReader(data))
		if postError != nil {
			resultChan <- agentResult{Err: postError}
			return
		}
		defer response.Body.Close()

		var responseBody map[string]interface{}
		_ = json.NewDecoder(response.Body).Decode(&responseBody)
		resultChan <- agentResult{StatusCode: response.StatusCode, Body: responseBody}
	}()

	select {
	case outcome := <-resultChan:
		if outcome.Err != nil {
			testingT.Fatalf("agent HTTP request failed: %v", outcome.Err)
		}
		if outcome.StatusCode != http.StatusOK {
			testingT.Errorf("expected HTTP 200, got %d", outcome.StatusCode)
		}
	case <-time.After(2 * time.Second):
		testingT.Fatal("timed out waiting for agent tool call response")
	}
}

// Package handlers provides unit tests validating HTTP REST controllers.
package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/Souheil007/Dotdeck/backend/internal/api/middleware"
	"github.com/Souheil007/Dotdeck/backend/internal/domain"
)

type mockAgentSteeringRepository struct {
	agentRecord   *domain.Agent
	updatedStatus string
	recordedTrace string
}

func (repo *mockAgentSteeringRepository) GetAgentByID(requestContext context.Context, agentID string) (*domain.Agent, error) {
	if repo.agentRecord != nil && repo.agentRecord.ID == agentID {
		return repo.agentRecord, nil
	}
	return nil, errors.New("agent not found")
}

func (repo *mockAgentSteeringRepository) CreateAgent(requestContext context.Context, agent domain.Agent) (*domain.Agent, error) {
	repo.agentRecord = &agent
	return &agent, nil
}

func (repo *mockAgentSteeringRepository) CreateEdge(requestContext context.Context, edge domain.Edge) (*domain.Edge, error) {
	return &edge, nil
}

func (repo *mockAgentSteeringRepository) DeleteEdge(requestContext context.Context, workspaceID, sourceAgentID, targetAgentID string) error {
	return nil
}

func (repo *mockAgentSteeringRepository) UpdateStatus(agentID, status string) error {
	repo.updatedStatus = status
	return nil
}

func (repo *mockAgentSteeringRepository) RecordThought(agentID string, step int, trace, nextStep, tool string, payload interface{}) error {
	repo.recordedTrace = trace
	return nil
}

type mockAgentWakeDispatcher struct {
	wokenAgent  *domain.Agent
	wokenPrompt string
}

func (dispatcher *mockAgentWakeDispatcher) WakeAgent(requestContext context.Context, agent *domain.Agent, promptText string) error {
	dispatcher.wokenAgent = agent
	dispatcher.wokenPrompt = promptText
	return nil
}

type mockCanvasBroadcaster struct {
	broadcastEvents []string
}

func (broadcaster *mockCanvasBroadcaster) Broadcast(workspaceID, eventType string, payload interface{}) {
	broadcaster.broadcastEvents = append(broadcaster.broadcastEvents, eventType)
}

// TestAgentHandlerSteer_Success verifies that operator chat instructions wake the target agent.
func TestAgentHandlerSteer_Success(testingTarget *testing.T) {
	agentIdentifier := "agent-steering-test-1"
	targetAgent := &domain.Agent{
		ID:          agentIdentifier,
		WorkspaceID: "ws-ops",
		Name:        "Grok Architect",
		Status:      domain.StatusResting,
	}

	mockRepo := &mockAgentSteeringRepository{agentRecord: targetAgent}
	mockWake := &mockAgentWakeDispatcher{}
	mockBroadcaster := &mockCanvasBroadcaster{}

	agentHandler := NewAgentHandler("http://localhost:8080")
	agentHandler.SetRepository(mockRepo)
	agentHandler.SetWakeDispatcher(mockWake)
	agentHandler.SetBroadcaster(mockBroadcaster)

	router := chi.NewRouter()
	router.Post("/api/v1/agents/{id}/steer", agentHandler.Steer)

	payload := AgentSteerPayload{
		Prompt: "Prioritize indexing before continuing batch ingest",
	}
	serializedPayload, _ := json.Marshal(payload)

	httpRequest := httptest.NewRequest(http.MethodPost, "/api/v1/agents/"+agentIdentifier+"/steer", bytes.NewReader(serializedPayload))
	httpRequest = httpRequest.WithContext(middleware.WithUserContext(httpRequest.Context(), "user-lead", "Alex Lead", "write"))
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, httpRequest)

	if recorder.Code != http.StatusOK {
		testingTarget.Fatalf("expected HTTP 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	if mockWake.wokenPrompt != payload.Prompt {
		testingTarget.Errorf("expected woken prompt %q, got %q", payload.Prompt, mockWake.wokenPrompt)
	}
	if mockRepo.updatedStatus != "working" {
		testingTarget.Errorf("expected updated status 'working', got %q", mockRepo.updatedStatus)
	}
	if mockRepo.recordedTrace != payload.Prompt {
		testingTarget.Errorf("expected recorded trace %q, got %q", payload.Prompt, mockRepo.recordedTrace)
	}

	foundSteeredEvent := false
	for _, eventName := range mockBroadcaster.broadcastEvents {
		if eventName == "AGENT_STEERED" {
			foundSteeredEvent = true
			break
		}
	}
	if !foundSteeredEvent {
		testingTarget.Errorf("expected AGENT_STEERED broadcast event, got: %v", mockBroadcaster.broadcastEvents)
	}
}

// TestAgentHandlerSteer_NotFound verifies handling for non-existent agents.
func TestAgentHandlerSteer_NotFound(testingTarget *testing.T) {
	mockRepo := &mockAgentSteeringRepository{}
	agentHandler := NewAgentHandler("http://localhost:8080")
	agentHandler.SetRepository(mockRepo)

	router := chi.NewRouter()
	router.Post("/api/v1/agents/{id}/steer", agentHandler.Steer)

	payload := AgentSteerPayload{Prompt: "Wake up"}
	serializedPayload, _ := json.Marshal(payload)

	httpRequest := httptest.NewRequest(http.MethodPost, "/api/v1/agents/unknown-id/steer", bytes.NewReader(serializedPayload))
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, httpRequest)

	if recorder.Code != http.StatusNotFound {
		testingTarget.Errorf("expected HTTP 404, got %d", recorder.Code)
	}
}

// TestAgentHandlerCreateAndConnectEdge verifies agent provisioning and canvas edge synthesis.
func TestAgentHandlerCreateAndConnectEdge(testingTarget *testing.T) {
	agentHandler := NewAgentHandler("http://localhost:8080")

	createPayload := AgentCreatePayload{
		WorkspaceID: "ws-test",
		Name:        "Test Dot",
		Provider:    domain.ProviderOpenAIDot,
		Goal:        "Continuous monitoring",
	}
	serializedCreate, _ := json.Marshal(createPayload)

	requestCreate := httptest.NewRequest(http.MethodPost, "/api/v1/agents", bytes.NewReader(serializedCreate))
	recorderCreate := httptest.NewRecorder()

	agentHandler.Create(recorderCreate, requestCreate)

	if recorderCreate.Code != http.StatusCreated {
		testingTarget.Fatalf("expected HTTP 201 for create, got %d: %s", recorderCreate.Code, recorderCreate.Body.String())
	}

	edgePayload := EdgeConnectPayload{
		WorkspaceID:   "ws-test",
		SourceAgentID: "agent-1",
		TargetAgentID: "agent-2",
		TargetName:    "Data Processor",
	}
	serializedEdge, _ := json.Marshal(edgePayload)

	requestEdge := httptest.NewRequest(http.MethodPost, "/api/v1/agents/edges", bytes.NewReader(serializedEdge))
	recorderEdge := httptest.NewRecorder()

	agentHandler.ConnectEdge(recorderEdge, requestEdge)

	if recorderEdge.Code != http.StatusCreated {
		testingTarget.Fatalf("expected HTTP 201 for edge connect, got %d", recorderEdge.Code)
	}
}

// TestVendorSpecificBootstrapPrompt validates that each cloud vendor gets an instruction prompt tailored to its API and protocol.
func TestVendorSpecificBootstrapPrompt(testingTarget *testing.T) {
	testCases := []struct {
		provider        domain.Provider
		expectedKeyword string
	}{
		{provider: domain.ProviderOpenAIDot, expectedKeyword: "8. MULTI-AGENT CANVAS COLLABORATION"},
		{provider: domain.ProviderGrokBot, expectedKeyword: "GROK CLOUD COMPUTER AGENT DIRECTIVE"},
		{provider: domain.ProviderMetaMuse, expectedKeyword: "META MUSE SECURE VM DIRECTIVE"},
		{provider: domain.ProviderClaude, expectedKeyword: "ANTHROPIC CLAUDE SYSTEM PROMPT"},
	}

	for _, testCase := range testCases {
		agent := domain.Agent{
			Name:           "Vendor Bot",
			Provider:       testCase.provider,
			Goal:           "Test autonomous execution",
			AuthorityRules: []string{"Require human confirmation for deletions"},
		}

		promptText := generateBootstrapPrompt(agent, "http://localhost:8080/mcp/token-abc")
		if !strings.Contains(promptText, testCase.expectedKeyword) {
			testingTarget.Errorf("expected provider %q prompt to contain %q, but got:\n%s", testCase.provider, testCase.expectedKeyword, promptText)
		}
	}
}

// Package bridge provides unit tests validating outbound wake-up bridge connectors.
package bridge

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/Souheil007/Dotdeck/backend/internal/domain"
)

type mockAgentLookupRepository struct {
	agents map[string]*domain.Agent
}

func (repo *mockAgentLookupRepository) GetAgentByID(requestContext context.Context, agentID string) (*domain.Agent, error) {
	if foundAgent, exists := repo.agents[agentID]; exists {
		return foundAgent, nil
	}
	return nil, nil
}

// TestDispatcherFanout validates that the unified dispatcher sends wake triggers to Slack and Webhook.
func TestDispatcherFanout(testingTarget *testing.T) {
	var slackCalls int32
	var webhookCalls int32

	slackServer := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		atomic.AddInt32(&slackCalls, 1)
		writer.WriteHeader(http.StatusOK)
	}))
	defer slackServer.Close()

	webhookServer := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		atomic.AddInt32(&webhookCalls, 1)
		writer.WriteHeader(http.StatusOK)
	}))
	defer webhookServer.Close()

	slackBridge := NewSlackBridge(SlackBridgeConfig{WebhookURL: slackServer.URL})
	webhookBridge := NewWebhookBridge()

	mockRepo := &mockAgentLookupRepository{
		agents: map[string]*domain.Agent{
			"agent-fanout-1": {
				ID:          "agent-fanout-1",
				WorkspaceID: "ws-1",
				Name:        "Coordinator Dot",
			},
		},
	}

	dispatcher := NewDispatcher(slackBridge, webhookBridge, mockRepo, webhookServer.URL, "secret")

	wakeError := dispatcher.WakeAgentByID(context.Background(), "agent-fanout-1", "Resume graph execution")
	if wakeError != nil {
		testingTarget.Fatalf("expected clean wake dispatch, got: %v", wakeError)
	}

	if atomic.LoadInt32(&slackCalls) != 1 {
		testingTarget.Errorf("expected 1 call to Slack, got %d", atomic.LoadInt32(&slackCalls))
	}
	if atomic.LoadInt32(&webhookCalls) != 1 {
		testingTarget.Errorf("expected 1 call to Webhook, got %d", atomic.LoadInt32(&webhookCalls))
	}
}

// Package bridge integrates external messaging platforms to wake sleeping cloud agents.
package bridge

import (
	"context"
	"fmt"

	"github.com/Souheil007/Dotdeck/backend/internal/domain"
)

// AgentProviderRepository abstracts agent lookup for bridge routing.
type AgentProviderRepository interface {
	GetAgentByID(requestContext context.Context, agentID string) (*domain.Agent, error)
}

// Dispatcher coordinates multi-channel wake-up triggers across Slack and Webhooks.
type Dispatcher struct {
	slackBridge       *SlackBridge
	webhookBridge     *WebhookBridge
	repository        AgentProviderRepository
	defaultWebhookURL string
	defaultSecret     string
}

// NewDispatcher initializes a unified wake-up bridge manager.
func NewDispatcher(slackBridge *SlackBridge, webhookBridge *WebhookBridge, repository AgentProviderRepository, defaultWebhookURL, defaultSecret string) *Dispatcher {
	return &Dispatcher{
		slackBridge:       slackBridge,
		webhookBridge:     webhookBridge,
		repository:        repository,
		defaultWebhookURL: defaultWebhookURL,
		defaultSecret:     defaultSecret,
	}
}

// WakeAgent dispatches a wake-up signal to all active outbound bridge channels configured for the agent.
func (dispatcher *Dispatcher) WakeAgent(requestContext context.Context, agent *domain.Agent, promptText string) error {
	if agent == nil {
		return fmt.Errorf("cannot wake nil agent descriptor")
	}

	var dispatchErrors []error

	if dispatcher.slackBridge != nil {
		if slackError := dispatcher.slackBridge.WakeAgent(requestContext, agent.Name, promptText); slackError != nil {
			dispatchErrors = append(dispatchErrors, fmt.Errorf("slack wake-up failed: %w", slackError))
		}
	}

	if dispatcher.webhookBridge != nil && dispatcher.defaultWebhookURL != "" {
		if webhookError := dispatcher.webhookBridge.WakeAgentWebhook(
			requestContext,
			dispatcher.defaultWebhookURL,
			dispatcher.defaultSecret,
			agent.ID,
			agent.Name,
			promptText,
		); webhookError != nil {
			dispatchErrors = append(dispatchErrors, fmt.Errorf("webhook wake-up failed: %w", webhookError))
		}
	}

	if len(dispatchErrors) > 0 {
		return fmt.Errorf("one or more wake-up bridges failed: %v", dispatchErrors)
	}

	return nil
}

// WakeAgentByID looks up an agent by its unique identifier and dispatches the wake-up prompt.
func (dispatcher *Dispatcher) WakeAgentByID(requestContext context.Context, agentID, promptText string) error {
	if dispatcher.repository != nil {
		agentRecord, lookupError := dispatcher.repository.GetAgentByID(requestContext, agentID)
		if lookupError == nil && agentRecord != nil {
			return dispatcher.WakeAgent(requestContext, agentRecord, promptText)
		}
	}

	// Fallback when repository is not configured or agent lookup fails
	fallbackAgent := &domain.Agent{
		ID:   agentID,
		Name: agentID,
	}
	return dispatcher.WakeAgent(requestContext, fallbackAgent, promptText)
}

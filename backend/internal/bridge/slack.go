// Package bridge integrates external messaging platforms to wake sleeping cloud agents.
package bridge

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// SlackBridgeConfig bundles configuration parameters for communicating with Slack.
type SlackBridgeConfig struct {
	WebhookURL string `json:"webhook_url"`
	BotToken   string `json:"bot_token"`
	Channel    string `json:"channel"`
	ThreadTS   string `json:"thread_ts"`
}

// SlackBridge posts rich Block Kit wake-up triggers and operator approval notices to Slack.
type SlackBridge struct {
	config     SlackBridgeConfig
	httpClient *http.Client
}

// NewSlackBridge initializes a Slack notification client with a 10-second timeout.
func NewSlackBridge(config SlackBridgeConfig) *SlackBridge {
	return &SlackBridge{
		config:     config,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// WakeAgent notifies a Slack channel or thread to wake a sleeping agent with operator instructions.
func (bridgeInstance *SlackBridge) WakeAgent(requestContext context.Context, agentName, promptText string) error {
	return bridgeInstance.WakeAgentWithThread(requestContext, agentName, promptText, bridgeInstance.config.Channel, bridgeInstance.config.ThreadTS)
}

// WakeAgentWithThread dispatches a rich Slack Block Kit notification into a designated channel and thread.
func (bridgeInstance *SlackBridge) WakeAgentWithThread(requestContext context.Context, agentName, promptText, channelIdentifier, threadTimestamp string) error {
	destinationURL := bridgeInstance.config.WebhookURL
	useBotAPI := bridgeInstance.config.BotToken != ""

	if destinationURL == "" && bridgeInstance.config.BotToken != "" {
		destinationURL = "https://slack.com/api/chat.postMessage"
	}

	if destinationURL == "" {
		// No Slack endpoint configured; graceful no-op
		return nil
	}

	timestampFormatted := time.Now().UTC().Format(time.RFC3339)
	fallbackSummary := fmt.Sprintf("⚡ Dotdeck Wake-Up: Operator prompt for %s: %s", agentName, promptText)

	blocksList := []map[string]interface{}{
		{
			"type": "header",
			"text": map[string]interface{}{
				"type":  "plain_text",
				"text":  "⚡ Dotdeck Agent Wake-Up",
				"emoji": true,
			},
		},
		{
			"type": "section",
			"fields": []map[string]interface{}{
				{
					"type": "mrkdwn",
					"text": fmt.Sprintf("*Agent:*\n%s", agentName),
				},
				{
					"type": "mrkdwn",
					"text": fmt.Sprintf("*Dispatched At:*\n%s", timestampFormatted),
				},
			},
		},
		{
			"type": "section",
			"text": map[string]interface{}{
				"type": "mrkdwn",
				"text": fmt.Sprintf("*Operator Instructions:*\n> %s", promptText),
			},
		},
	}

	payloadMap := map[string]interface{}{
		"text":   fallbackSummary,
		"blocks": blocksList,
	}

	if channelIdentifier != "" {
		payloadMap["channel"] = channelIdentifier
	}
	if threadTimestamp != "" {
		payloadMap["thread_ts"] = threadTimestamp
	}

	serializedBytes, marshalError := json.Marshal(payloadMap)
	if marshalError != nil {
		return fmt.Errorf("failed to marshal Slack payload: %w", marshalError)
	}

	httpRequest, createError := http.NewRequestWithContext(requestContext, http.MethodPost, destinationURL, bytes.NewReader(serializedBytes))
	if createError != nil {
		return fmt.Errorf("failed to create Slack HTTP request: %w", createError)
	}

	httpRequest.Header.Set("Content-Type", "application/json")
	if useBotAPI {
		httpRequest.Header.Set("Authorization", fmt.Sprintf("Bearer %s", bridgeInstance.config.BotToken))
	}

	httpResponse, dispatchError := bridgeInstance.httpClient.Do(httpRequest)
	if dispatchError != nil {
		return fmt.Errorf("failed to dispatch Slack notification: %w", dispatchError)
	}
	defer httpResponse.Body.Close()

	if httpResponse.StatusCode >= 300 {
		return fmt.Errorf("slack endpoint returned HTTP %d", httpResponse.StatusCode)
	}

	return nil
}

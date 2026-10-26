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

// SlackBridge posts wake-up triggers and operator approval notices to Slack threads.
type SlackBridge struct {
	webhookURL string
	httpClient *http.Client
}

// NewSlackBridge initializes a Slack notification client with a 10-second timeout.
func NewSlackBridge(webhookURL string) *SlackBridge {
	return &SlackBridge{
		webhookURL: webhookURL,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// WakeAgent notifies a Slack channel to wake a sleeping agent with new instructions.
func (bridge *SlackBridge) WakeAgent(ctx context.Context, agentName, prompt string) error {
	if bridge.webhookURL == "" {
		return nil
	}

	payload := map[string]interface{}{
		"text": fmt.Sprintf("⚡ *Dotdeck Wake-Up*: Human operator dispatched new instructions to *%s*:\n> %s", agentName, prompt),
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshalling slack wake-up: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, bridge.webhookURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("building slack request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := bridge.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("posting slack notification: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("slack returned non-200 code: %d", resp.StatusCode)
	}
	return nil
}

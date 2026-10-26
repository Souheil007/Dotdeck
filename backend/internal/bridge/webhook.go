package bridge

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// WebhookBridge dispatches signed event envelopes to user-configured webhook destinations.
type WebhookBridge struct {
	httpClient *http.Client
}

// NewWebhookBridge initializes an outbound dispatcher for custom webhooks.
func NewWebhookBridge() *WebhookBridge {
	return &WebhookBridge{
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// Dispatch posts a signed JSON payload to an external agent wake-up or audit endpoint.
func (w *WebhookBridge) Dispatch(ctx context.Context, endpoint, secret string, eventType string, data interface{}) error {
	envelope := map[string]interface{}{
		"event":     eventType,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"data":      data,
	}

	body, err := json.Marshal(envelope)
	if err != nil {
		return fmt.Errorf("marshalling webhook envelope: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("building webhook request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if secret != "" {
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write(body)
		signature := hex.EncodeToString(mac.Sum(nil))
		req.Header.Set("X-Dotdeck-Signature", signature)
	}

	resp, err := w.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("executing webhook post: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("webhook endpoint returned failure status: %d", resp.StatusCode)
	}
	return nil
}

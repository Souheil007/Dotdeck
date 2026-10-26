// Package bridge integrates external messaging platforms to wake sleeping cloud agents.
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

// WebhookEnvelope defines the structured payload format dispatched to external agent endpoints.
type WebhookEnvelope struct {
	Event     string      `json:"event"`
	Timestamp string      `json:"timestamp"`
	Data      interface{} `json:"data"`
}

// AgentWakePayload defines the data structure sent to wake a sleeping cloud agent.
type AgentWakePayload struct {
	AgentID   string `json:"agent_id"`
	AgentName string `json:"agent_name"`
	Prompt    string `json:"prompt"`
}

// WebhookBridge dispatches signed event envelopes to user-configured webhook destinations with retries.
type WebhookBridge struct {
	httpClient *http.Client
	maxRetries int
	baseDelay  time.Duration
}

// NewWebhookBridge initializes an outbound dispatcher for custom webhooks with a 10-second timeout.
func NewWebhookBridge() *WebhookBridge {
	return &WebhookBridge{
		httpClient: &http.Client{Timeout: 10 * time.Second},
		maxRetries: 3,
		baseDelay:  100 * time.Millisecond,
	}
}

// SetRetryPolicy configures the maximum attempts and base exponential delay for testing or tuning.
func (bridgeInstance *WebhookBridge) SetRetryPolicy(maxRetries int, baseDelay time.Duration) {
	if maxRetries > 0 {
		bridgeInstance.maxRetries = maxRetries
	}
	if baseDelay > 0 {
		bridgeInstance.baseDelay = baseDelay
	}
}

// ComputeSignature calculates the HMAC-SHA256 signature hex string for the provided payload and secret.
func ComputeSignature(payloadBytes []byte, secretKey string) string {
	hashSigner := hmac.New(sha256.New, []byte(secretKey))
	hashSigner.Write(payloadBytes)
	return hex.EncodeToString(hashSigner.Sum(nil))
}

// Dispatch posts a signed JSON payload with exponential backoff retries for transient failures.
func (bridgeInstance *WebhookBridge) Dispatch(requestContext context.Context, endpointURL, signingSecret, eventType string, dataPayload interface{}) error {
	if endpointURL == "" {
		return nil
	}

	envelope := WebhookEnvelope{
		Event:     eventType,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Data:      dataPayload,
	}

	serializedBytes, marshalError := json.Marshal(envelope)
	if marshalError != nil {
		return fmt.Errorf("failed to marshal webhook envelope: %w", marshalError)
	}

	var lastError error
	currentDelay := bridgeInstance.baseDelay

	for attemptIndex := 1; attemptIndex <= bridgeInstance.maxRetries; attemptIndex++ {
		select {
		case <-requestContext.Done():
			return requestContext.Err()
		default:
		}

		httpRequest, createError := http.NewRequestWithContext(requestContext, http.MethodPost, endpointURL, bytes.NewReader(serializedBytes))
		if createError != nil {
			return fmt.Errorf("failed to build webhook request: %w", createError)
		}

		httpRequest.Header.Set("Content-Type", "application/json")
		if signingSecret != "" {
			signatureHeader := ComputeSignature(serializedBytes, signingSecret)
			httpRequest.Header.Set("X-Dotdeck-Signature", signatureHeader)
		}

		httpResponse, executeError := bridgeInstance.httpClient.Do(httpRequest)
		if executeError != nil {
			lastError = fmt.Errorf("attempt %d network error: %w", attemptIndex, executeError)
		} else {
			responseCode := httpResponse.StatusCode
			httpResponse.Body.Close()

			if responseCode < 300 {
				return nil
			}

			lastError = fmt.Errorf("attempt %d returned HTTP %d", attemptIndex, responseCode)
			// Non-retryable client errors (e.g., 400 Bad Request, 401 Unauthorized, 404 Not Found)
			if responseCode >= 400 && responseCode < 500 && responseCode != http.StatusTooManyRequests {
				return lastError
			}
		}

		// If more retries remain, back off exponentially
		if attemptIndex < bridgeInstance.maxRetries {
			select {
			case <-requestContext.Done():
				return requestContext.Err()
			case <-time.After(currentDelay):
				currentDelay *= 2
			}
		}
	}

	return fmt.Errorf("webhook failed after %d attempts: %w", bridgeInstance.maxRetries, lastError)
}

// WakeAgentWebhook posts a signed wake-up notification specifically for a designated cloud agent.
func (bridgeInstance *WebhookBridge) WakeAgentWebhook(requestContext context.Context, endpointURL, signingSecret, agentID, agentName, promptText string) error {
	payload := AgentWakePayload{
		AgentID:   agentID,
		AgentName: agentName,
		Prompt:    promptText,
	}
	return bridgeInstance.Dispatch(requestContext, endpointURL, signingSecret, "agent.wakeup", payload)
}

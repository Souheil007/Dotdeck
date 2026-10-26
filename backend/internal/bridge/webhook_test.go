// Package bridge provides unit tests validating outbound wake-up bridge connectors.
package bridge

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

// TestWebhookBridgeHMACSignature verifies payload signing adhering to HMAC-SHA256 standards.
func TestWebhookBridgeHMACSignature(testingTarget *testing.T) {
	secretKey := "super-secret-hmac-key"
	var receivedSignature string
	var receivedBodyBytes []byte

	mockServer := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		receivedSignature = request.Header.Get("X-Dotdeck-Signature")
		var readError error
		receivedBodyBytes, readError = io.ReadAll(request.Body)
		if readError != nil {
			writer.WriteHeader(http.StatusBadRequest)
			return
		}
		writer.WriteHeader(http.StatusOK)
	}))
	defer mockServer.Close()

	webhookBridge := NewWebhookBridge()
	wakeError := webhookBridge.WakeAgentWebhook(
		context.Background(),
		mockServer.URL,
		secretKey,
		"agent-123",
		"Meta Muse Agent",
		"Approve build sequence",
	)
	if wakeError != nil {
		testingTarget.Fatalf("expected clean webhook dispatch, got: %v", wakeError)
	}

	expectedSignature := ComputeSignature(receivedBodyBytes, secretKey)
	if receivedSignature != expectedSignature {
		testingTarget.Errorf("signature mismatch: expected %q, got %q", expectedSignature, receivedSignature)
	}

	var envelope WebhookEnvelope
	if decodeError := json.Unmarshal(receivedBodyBytes, &envelope); decodeError != nil {
		testingTarget.Fatalf("failed to unmarshal envelope: %v", decodeError)
	}

	if envelope.Event != "agent.wakeup" {
		testingTarget.Errorf("expected event 'agent.wakeup', got %q", envelope.Event)
	}
}

// TestWebhookBridgeExponentialBackoff validates retry logic and eventual success.
func TestWebhookBridgeExponentialBackoff(testingTarget *testing.T) {
	var totalAttempts int32

	mockServer := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		currentAttempt := atomic.AddInt32(&totalAttempts, 1)
		if currentAttempt < 3 {
			writer.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		writer.WriteHeader(http.StatusOK)
	}))
	defer mockServer.Close()

	webhookBridge := NewWebhookBridge()
	webhookBridge.SetRetryPolicy(3, 10*time.Millisecond)

	wakeError := webhookBridge.Dispatch(
		context.Background(),
		mockServer.URL,
		"secret",
		"agent.wakeup",
		map[string]string{"prompt": "Retry test"},
	)
	if wakeError != nil {
		testingTarget.Fatalf("expected eventual success on attempt 3, got error: %v", wakeError)
	}

	if atomic.LoadInt32(&totalAttempts) != 3 {
		testingTarget.Errorf("expected exactly 3 attempts, got %d", atomic.LoadInt32(&totalAttempts))
	}
}

// TestWebhookBridgeNonRetryableClientError validates immediate termination on 400 Bad Request.
func TestWebhookBridgeNonRetryableClientError(testingTarget *testing.T) {
	var totalAttempts int32

	mockServer := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		atomic.AddInt32(&totalAttempts, 1)
		writer.WriteHeader(http.StatusBadRequest)
	}))
	defer mockServer.Close()

	webhookBridge := NewWebhookBridge()
	webhookBridge.SetRetryPolicy(3, 10*time.Millisecond)

	wakeError := webhookBridge.Dispatch(
		context.Background(),
		mockServer.URL,
		"secret",
		"agent.wakeup",
		map[string]string{"prompt": "Bad request test"},
	)
	if wakeError == nil {
		testingTarget.Fatalf("expected error for HTTP 400 response, got nil")
	}

	if atomic.LoadInt32(&totalAttempts) != 1 {
		testingTarget.Errorf("expected non-retryable 400 to execute exactly 1 attempt, got %d", atomic.LoadInt32(&totalAttempts))
	}
}

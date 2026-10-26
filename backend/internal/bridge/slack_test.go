// Package bridge provides unit tests validating outbound wake-up bridge connectors.
package bridge

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestSlackBridgeWakeAgent validates rich Block Kit payload creation and delivery.
func TestSlackBridgeWakeAgent(testingTarget *testing.T) {
	var capturedPayload map[string]interface{}

	mockServer := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		bodyBytes, readError := io.ReadAll(request.Body)
		if readError != nil {
			writer.WriteHeader(http.StatusBadRequest)
			return
		}
		_ = json.Unmarshal(bodyBytes, &capturedPayload)
		writer.WriteHeader(http.StatusOK)
	}))
	defer mockServer.Close()

	bridgeConfig := SlackBridgeConfig{
		WebhookURL: mockServer.URL,
		Channel:    "C123456",
		ThreadTS:   "1700000000.123456",
	}
	slackBridge := NewSlackBridge(bridgeConfig)

	wakeError := slackBridge.WakeAgent(context.Background(), "Analytics Dot", "Resume data ingestion")
	if wakeError != nil {
		testingTarget.Fatalf("expected clean wake dispatch, got error: %v", wakeError)
	}

	if capturedPayload["channel"] != "C123456" {
		testingTarget.Errorf("expected channel 'C123456', got %v", capturedPayload["channel"])
	}
	if capturedPayload["thread_ts"] != "1700000000.123456" {
		testingTarget.Errorf("expected thread_ts '1700000000.123456', got %v", capturedPayload["thread_ts"])
	}

	blocksList, blocksExist := capturedPayload["blocks"].([]interface{})
	if !blocksExist || len(blocksList) < 3 {
		testingTarget.Fatalf("expected at least 3 Block Kit blocks, got %v", blocksList)
	}
}

// TestSlackBridgeBotToken validates that bot tokens set the Authorization Bearer header.
func TestSlackBridgeBotToken(testingTarget *testing.T) {
	var capturedAuthHeader string

	mockServer := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		capturedAuthHeader = request.Header.Get("Authorization")
		writer.WriteHeader(http.StatusOK)
	}))
	defer mockServer.Close()

	bridgeConfig := SlackBridgeConfig{
		WebhookURL: mockServer.URL,
		BotToken:   "xoxb-secret-bot-token",
		Channel:    "C_GENERAL",
	}
	slackBridge := NewSlackBridge(bridgeConfig)

	// Explicit call using the mock destination with bot token
	wakeError := slackBridge.WakeAgentWithThread(context.Background(), "Grok Researcher", "Check arxiv updates", "C_GENERAL", "")
	if wakeError != nil {
		testingTarget.Fatalf("unexpected wake error: %v", wakeError)
	}

	if capturedAuthHeader != "Bearer xoxb-secret-bot-token" {
		testingTarget.Errorf("expected Bearer token header, got %q", capturedAuthHeader)
	}
}

// TestSlackBridgeFailureStatusCode validates error detection on non-200 responses.
func TestSlackBridgeFailureStatusCode(testingTarget *testing.T) {
	mockServer := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.WriteHeader(http.StatusInternalServerError)
	}))
	defer mockServer.Close()

	bridgeConfig := SlackBridgeConfig{
		WebhookURL: mockServer.URL,
	}
	slackBridge := NewSlackBridge(bridgeConfig)

	wakeError := slackBridge.WakeAgent(context.Background(), "Test Agent", "Hello")
	if wakeError == nil {
		testingTarget.Errorf("expected error for HTTP 500 response, got nil")
	}
}

// Package integration provides end-to-end integration tests for Dotdeck.
package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	coderws "github.com/coder/websocket"

	"github.com/Souheil007/Dotdeck/backend/internal/websocket"
)

// TestMultiplayerWebSocketIntegration verifies end-to-end WebSocket connection, presence sync,
// and high-frequency cursor streaming across multiple concurrent clients.
func TestMultiplayerWebSocketIntegration(testingTarget *testing.T) {
	hubInstance := websocket.NewHub()
	go hubInstance.Run()

	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		userID := request.URL.Query().Get("user_id")
		userName := request.URL.Query().Get("user_name")
		workspaceID := request.URL.Query().Get("workspace_id")
		role := request.URL.Query().Get("role")

		hubInstance.ServeWebSocket(writer, request, userID, userName, role, workspaceID)
	}))
	defer server.Close()

	websocketURL := "ws" + strings.TrimPrefix(server.URL, "http")

	clientContext, cancelClient := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelClient()

	// Connect Client 1 (Alice)
	urlAlice := fmt.Sprintf("%s?user_id=alice&user_name=Alice&workspace_id=ws-test-room&role=write", websocketURL)
	connectionAlice, _, dialErrorAlice := coderws.Dial(clientContext, urlAlice, nil)
	if dialErrorAlice != nil {
		testingTarget.Fatalf("failed to connect alice: %v", dialErrorAlice)
	}
	defer connectionAlice.Close(coderws.StatusNormalClosure, "done")

	// Connect Client 2 (Bob)
	urlBob := fmt.Sprintf("%s?user_id=bob&user_name=Bob&workspace_id=ws-test-room&role=write", websocketURL)
	connectionBob, _, dialErrorBob := coderws.Dial(clientContext, urlBob, nil)
	if dialErrorBob != nil {
		testingTarget.Fatalf("failed to connect bob: %v", dialErrorBob)
	}
	defer connectionBob.Close(coderws.StatusNormalClosure, "done")

	time.Sleep(20 * time.Millisecond)

	// Alice sends a cursor move action
	cursorPayload := map[string]interface{}{
		"type": "CURSOR_MOVE",
		"payload": map[string]interface{}{
			"position_x": 150.5,
			"position_y": 275.0,
		},
	}
	serializedCursor, _ := json.Marshal(cursorPayload)

	writeError := connectionAlice.Write(clientContext, coderws.MessageText, serializedCursor)
	if writeError != nil {
		testingTarget.Fatalf("alice failed to write cursor: %v", writeError)
	}

	// Bob should receive Alice's PRESENCE_SYNC event within 50ms
	readContext, cancelRead := context.WithTimeout(clientContext, 500*time.Millisecond)
	defer cancelRead()

	messageType, messageBytes, readError := connectionBob.Read(readContext)
	if readError != nil {
		testingTarget.Fatalf("bob failed to read presence message: %v", readError)
	}

	if messageType != coderws.MessageText {
		testingTarget.Errorf("expected text frame, got %v", messageType)
	}

	var parsedEnvelope struct {
		Type    string           `json:"type"`
		Payload websocket.Cursor `json:"payload"`
	}
	if decodeError := json.Unmarshal(messageBytes, &parsedEnvelope); decodeError != nil {
		testingTarget.Fatalf("failed to parse message from alice: %v", decodeError)
	}

	if parsedEnvelope.Type != "PRESENCE_SYNC" {
		testingTarget.Errorf("expected PRESENCE_SYNC, got %q", parsedEnvelope.Type)
	}
	if parsedEnvelope.Payload.UserID != "alice" {
		testingTarget.Errorf("expected user_id alice, got %q", parsedEnvelope.Payload.UserID)
	}
	if parsedEnvelope.Payload.PositionX != 150.5 {
		testingTarget.Errorf("expected position_x 150.5, got %f", parsedEnvelope.Payload.PositionX)
	}

	// Test rapid concurrent streaming: 5 clients sending cursor movements concurrently
	var waitGroup sync.WaitGroup
	for clientIndex := 1; clientIndex <= 3; clientIndex++ {
		waitGroup.Add(1)
		currentClientIndex := clientIndex
		go func() {
			defer waitGroup.Done()
			clientURL := fmt.Sprintf("%s?user_id=sim-%d&user_name=SimUser&workspace_id=ws-test-room&role=write", websocketURL, currentClientIndex)
			simConn, _, simDialErr := coderws.Dial(clientContext, clientURL, nil)
			if simDialErr != nil {
				return
			}
			defer simConn.Close(coderws.StatusNormalClosure, "sim done")

			for burstIndex := 0; burstIndex < 10; burstIndex++ {
				moveBytes, _ := json.Marshal(map[string]interface{}{
					"type": "CURSOR_MOVE",
					"payload": map[string]interface{}{
						"position_x": float64(burstIndex * 10),
						"position_y": float64(burstIndex * 20),
					},
				})
				_ = simConn.Write(clientContext, coderws.MessageText, moveBytes)
				time.Sleep(5 * time.Millisecond)
			}
		}()
	}

	waitGroup.Wait()
}

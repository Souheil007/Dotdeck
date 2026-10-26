// Package websocket provides unit tests validating the real-time multiplayer engine.
package websocket

import (
	"context"
	"testing"
	"time"
)

// TestHubWorkspaceIsolation verifies that clients in different workspaces never receive events across tenant boundaries.
func TestHubWorkspaceIsolation(testingTarget *testing.T) {
	hubInstance := NewHub()
	go hubInstance.Run()

	clientAlpha := &Client{
		UserID:      "user-alpha",
		UserName:    "Alpha User",
		WorkspaceID: "ws-alpha",
		sendChannel: make(chan OutboundMessage, 16),
	}
	clientBeta := &Client{
		UserID:      "user-beta",
		UserName:    "Beta User",
		WorkspaceID: "ws-beta",
		sendChannel: make(chan OutboundMessage, 16),
	}

	hubInstance.Register(clientAlpha)
	hubInstance.Register(clientBeta)
	time.Sleep(15 * time.Millisecond)

	// Broadcast an event strictly to ws-alpha
	hubInstance.Broadcast("ws-alpha", "AGENT_STATE_CHANGED", map[string]string{
		"agent_id": "agent-1",
		"status":   "working",
	})

	select {
	case messageReceived := <-clientAlpha.sendChannel:
		if messageReceived.Type != "AGENT_STATE_CHANGED" {
			testingTarget.Errorf("expected AGENT_STATE_CHANGED, got %q", messageReceived.Type)
		}
	case <-time.After(50 * time.Millisecond):
		testingTarget.Fatalf("timed out waiting for message on clientAlpha")
	}

	// Ensure clientBeta received nothing
	select {
	case messageReceived := <-clientBeta.sendChannel:
		testingTarget.Fatalf("clientBeta received cross-tenant message: %+v", messageReceived)
	case <-time.After(20 * time.Millisecond):
		// Expected: no cross-tenant leakage
	}
}

// TestHubSlowClientDropped verifies that a full buffer drops messages without stalling peer broadcasts.
func TestHubSlowClientDropped(testingTarget *testing.T) {
	hubInstance := NewHub()
	go hubInstance.Run()

	slowClient := &Client{
		UserID:      "user-slow",
		UserName:    "Slow User",
		WorkspaceID: "ws-shared",
		sendChannel: make(chan OutboundMessage, 2), // Small buffer to saturate
	}
	fastClient := &Client{
		UserID:      "user-fast",
		UserName:    "Fast User",
		WorkspaceID: "ws-shared",
		sendChannel: make(chan OutboundMessage, 16),
	}

	hubInstance.Register(slowClient)
	hubInstance.Register(fastClient)
	time.Sleep(15 * time.Millisecond)

	// Fill slow client buffer
	slowClient.sendChannel <- OutboundMessage{Type: "DUMMY_1"}
	slowClient.sendChannel <- OutboundMessage{Type: "DUMMY_2"}

	// Broadcast another message: slow client should be dropped without blocking fast client
	broadcastCompleted := make(chan bool, 1)
	go func() {
		hubInstance.Broadcast("ws-shared", "AGENT_PING", map[string]string{"ping": "pong"})
		broadcastCompleted <- true
	}()

	select {
	case <-broadcastCompleted:
		// Broadcast returned non-blocking
	case <-time.After(50 * time.Millisecond):
		testingTarget.Fatalf("broadcast stalled on slow client")
	}

	select {
	case messageReceived := <-fastClient.sendChannel:
		if messageReceived.Type != "AGENT_PING" {
			testingTarget.Errorf("expected AGENT_PING, got %q", messageReceived.Type)
		}
	case <-time.After(50 * time.Millisecond):
		testingTarget.Fatalf("fast client never received broadcast message")
	}
}

// TestHubPresenceLeaveAndUnlockOnDisconnect verifies that unregistering releases locks and notifies peers.
func TestHubPresenceLeaveAndUnlockOnDisconnect(testingTarget *testing.T) {
	hubInstance := NewHub()
	go hubInstance.Run()

	operatorClient := &Client{
		UserID:      "operator-sarah",
		UserName:    "Sarah",
		WorkspaceID: "ws-approval",
		sendChannel: make(chan OutboundMessage, 16),
	}
	peerClient := &Client{
		UserID:      "peer-alex",
		UserName:    "Alex",
		WorkspaceID: "ws-approval",
		sendChannel: make(chan OutboundMessage, 16),
	}

	hubInstance.Register(operatorClient)
	hubInstance.Register(peerClient)
	time.Sleep(15 * time.Millisecond)

	// Operator locks an approval question
	approvalIdentifier := "approval-999"
	hubInstance.presenceTracker.TryLockApproval(approvalIdentifier, operatorClient.UserID)

	// Operator disconnects
	hubInstance.Unregister(operatorClient)
	time.Sleep(25 * time.Millisecond)

	receivedEvents := make(map[string]bool)
	for index := 0; index < 2; index++ {
		select {
		case messageReceived := <-peerClient.sendChannel:
			receivedEvents[messageReceived.Type] = true
		case <-time.After(50 * time.Millisecond):
		}
	}

	if !receivedEvents["PRESENCE_LEAVE"] {
		testingTarget.Errorf("expected peer to receive PRESENCE_LEAVE event")
	}
	if !receivedEvents["QUESTION_UNLOCKED"] {
		testingTarget.Errorf("expected peer to receive QUESTION_UNLOCKED event upon disconnect")
	}
}

type mockHubPublisher struct {
	publishedWorkspaceID string
	publishedEventType   string
	publishedPayload     interface{}
}

func (mockPub *mockHubPublisher) PublishBroadcast(publishContext context.Context, workspaceID, eventType string, payload interface{}) error {
	mockPub.publishedWorkspaceID = workspaceID
	mockPub.publishedEventType = eventType
	mockPub.publishedPayload = payload
	return nil
}

// TestHubClusterMeshCrossNodeBroadcast verifies that cross-node events route cleanly via Redis mesh.
func TestHubClusterMeshCrossNodeBroadcast(testingTarget *testing.T) {
	node1Hub := NewHub()
	go node1Hub.Run()

	node2Hub := NewHub()
	go node2Hub.Run()

	mockPublisher := &mockHubPublisher{}
	node1Hub.SetPublisher(mockPublisher)

	clientOnNode2 := &Client{
		UserID:      "client-on-node-2",
		UserName:    "Node 2 Client",
		WorkspaceID: "ws-mesh",
		sendChannel: make(chan OutboundMessage, 16),
	}
	node2Hub.Register(clientOnNode2)
	time.Sleep(15 * time.Millisecond)

	// Node 1 broadcasts event
	node1Hub.Broadcast("ws-mesh", "THOUGHT_STEP_EMITTED", map[string]string{
		"reasoning_trace": "Executing query plan",
	})

	if mockPublisher.publishedEventType != "THOUGHT_STEP_EMITTED" {
		testingTarget.Fatalf("expected publisher to receive event, got: %q", mockPublisher.publishedEventType)
	}

	// Simulate Redis subscriber delivering to Node 2
	node2Hub.BroadcastLocal(mockPublisher.publishedWorkspaceID, mockPublisher.publishedEventType, mockPublisher.publishedPayload)

	select {
	case messageReceived := <-clientOnNode2.sendChannel:
		if messageReceived.Type != "THOUGHT_STEP_EMITTED" {
			testingTarget.Errorf("expected THOUGHT_STEP_EMITTED on node 2 client, got: %q", messageReceived.Type)
		}
	case <-time.After(50 * time.Millisecond):
		testingTarget.Fatalf("client on node 2 never received cross-node message")
	}
}

// Package websocket implements real-time multiplayer synchronization, presence tracking,
// and thought streaming over WebSockets using the coder/websocket protocol.
package websocket

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	coderws "github.com/coder/websocket"
)

// Hub routes real-time events to connected clients grouped strictly by workspace ID.
type Hub struct {
	hubMutex        sync.RWMutex
	workspaceRooms  map[string]map[*Client]bool
	presenceTracker *PresenceTracker
	registerQueue   chan *Client
	unregisterQueue chan *Client
	publisher       BroadcastPublisher
}

// NewHub constructs an empty room router for workspace collaboration.
func NewHub() *Hub {
	return &Hub{
		workspaceRooms:  make(map[string]map[*Client]bool),
		presenceTracker: NewPresenceTracker(),
		registerQueue:   make(chan *Client),
		unregisterQueue: make(chan *Client),
	}
}

// SetPublisher binds an external cluster mesh adapter (e.g. Redis Pub/Sub) for multi-node distribution.
func (hubInstance *Hub) SetPublisher(publisher BroadcastPublisher) {
	hubInstance.hubMutex.Lock()
	defer hubInstance.hubMutex.Unlock()
	hubInstance.publisher = publisher
}

// Run executes the hub event loop processing client connections and disconnections.
func (hubInstance *Hub) Run() {
	for {
		select {
		case clientInstance := <-hubInstance.registerQueue:
			hubInstance.hubMutex.Lock()
			roomClients, exists := hubInstance.workspaceRooms[clientInstance.WorkspaceID]
			if !exists {
				roomClients = make(map[*Client]bool)
				hubInstance.workspaceRooms[clientInstance.WorkspaceID] = roomClients
			}
			roomClients[clientInstance] = true
			hubInstance.hubMutex.Unlock()

			// Send snapshot of current cursors to the newly registered client
			activeCursors := hubInstance.presenceTracker.GetWorkspaceCursors(clientInstance.WorkspaceID)
			if len(activeCursors) > 0 {
				select {
				case clientInstance.sendChannel <- OutboundMessage{Type: "PRESENCE_SNAPSHOT", Payload: activeCursors}:
				default:
				}
			}

		case clientInstance := <-hubInstance.unregisterQueue:
			hubInstance.hubMutex.Lock()
			if roomClients, exists := hubInstance.workspaceRooms[clientInstance.WorkspaceID]; exists {
				if _, registered := roomClients[clientInstance]; registered {
					delete(roomClients, clientInstance)
					close(clientInstance.sendChannel)
				}
				if len(roomClients) == 0 {
					delete(hubInstance.workspaceRooms, clientInstance.WorkspaceID)
				}
			}
			hubInstance.hubMutex.Unlock()

			// Remove presence and release any held question locks
			unlockedApprovals := hubInstance.presenceTracker.RemoveUser(clientInstance.WorkspaceID, clientInstance.UserID)

			// Notify workspace peers of user departure
			hubInstance.Broadcast(clientInstance.WorkspaceID, "PRESENCE_LEAVE", map[string]string{
				"user_id": clientInstance.UserID,
			})

			// Broadcast unlock event for every approval question that was released
			for _, approvalID := range unlockedApprovals {
				hubInstance.Broadcast(clientInstance.WorkspaceID, "QUESTION_UNLOCKED", map[string]string{
					"approval_id": approvalID,
					"user_id":     clientInstance.UserID,
				})
			}
		}
	}
}

// Register adds a new client to the hub's pending registration pipeline.
func (hubInstance *Hub) Register(clientInstance *Client) {
	hubInstance.registerQueue <- clientInstance
}

// Unregister schedules client removal and stream teardown.
func (hubInstance *Hub) Unregister(clientInstance *Client) {
	hubInstance.unregisterQueue <- clientInstance
}

// Broadcast dispatches an event across the cluster mesh (if configured) and to local workspace clients.
func (hubInstance *Hub) Broadcast(workspaceID, eventType string, payload interface{}) {
	hubInstance.hubMutex.RLock()
	publisherInstance := hubInstance.publisher
	hubInstance.hubMutex.RUnlock()

	if publisherInstance != nil {
		publishContext, cancelPublish := context.WithTimeout(context.Background(), 3*time.Second)
		_ = publisherInstance.PublishBroadcast(publishContext, workspaceID, eventType, payload)
		cancelPublish()
	}

	hubInstance.BroadcastLocal(workspaceID, eventType, payload)
}

// BroadcastLocal dispatches an event strictly to local clients connected to this switchboard node.
func (hubInstance *Hub) BroadcastLocal(workspaceID, eventType string, payload interface{}) {
	hubInstance.hubMutex.RLock()
	roomClients, exists := hubInstance.workspaceRooms[workspaceID]
	hubInstance.hubMutex.RUnlock()

	if !exists {
		return
	}

	outboundMessage := OutboundMessage{
		Type:    eventType,
		Payload: payload,
	}

	hubInstance.hubMutex.RLock()
	defer hubInstance.hubMutex.RUnlock()

	for clientInstance := range roomClients {
		select {
		case clientInstance.sendChannel <- outboundMessage:
		default:
			// Buffer full: drop slow client to avoid stalling the broadcast ring
		}
	}
}

// HandleClientMessage dispatches client actions like cursor movement or question locking.
func (hubInstance *Hub) HandleClientMessage(clientInstance *Client, inboundMessage InboundMessage) {
	switch inboundMessage.Type {
	case "CURSOR_MOVE":
		var cursorPosition Cursor
		if decodeError := json.Unmarshal(inboundMessage.Payload, &cursorPosition); decodeError == nil {
			cursorPosition.UserID = clientInstance.UserID
			cursorPosition.UserName = clientInstance.UserName
			hubInstance.presenceTracker.UpdateCursor(clientInstance.WorkspaceID, cursorPosition)
			hubInstance.Broadcast(clientInstance.WorkspaceID, "PRESENCE_SYNC", cursorPosition)
		}

	case "LOCK_QUESTION":
		var payload struct {
			ApprovalID string `json:"approval_id"`
		}
		if decodeError := json.Unmarshal(inboundMessage.Payload, &payload); decodeError == nil && clientInstance.Role != "read" {
			if hubInstance.presenceTracker.TryLockApproval(payload.ApprovalID, clientInstance.UserID) {
				hubInstance.Broadcast(clientInstance.WorkspaceID, "QUESTION_LOCKED", map[string]string{
					"approval_id": payload.ApprovalID,
					"user_id":     clientInstance.UserID,
					"user_name":   clientInstance.UserName,
				})
			}
		}

	case "UNLOCK_QUESTION":
		var payload struct {
			ApprovalID string `json:"approval_id"`
		}
		if decodeError := json.Unmarshal(inboundMessage.Payload, &payload); decodeError == nil {
			hubInstance.presenceTracker.ReleaseApproval(payload.ApprovalID, clientInstance.UserID)
			hubInstance.Broadcast(clientInstance.WorkspaceID, "QUESTION_UNLOCKED", map[string]string{
				"approval_id": payload.ApprovalID,
				"user_id":     clientInstance.UserID,
			})
		}
	}
}

// ServeWebSocket upgrades the incoming HTTP connection and launches client read and write pumps.
func (hubInstance *Hub) ServeWebSocket(writer http.ResponseWriter, request *http.Request, userID, userName, role, workspaceID string) {
	connection, upgradeError := coderws.Accept(writer, request, &coderws.AcceptOptions{
		OriginPatterns: []string{"*"},
	})
	if upgradeError != nil {
		return
	}

	clientInstance := NewClient(hubInstance, connection, userID, userName, role, workspaceID)
	hubInstance.Register(clientInstance)

	requestContext := request.Context()
	go clientInstance.WritePump(requestContext)
	clientInstance.ReadPump(requestContext)
}

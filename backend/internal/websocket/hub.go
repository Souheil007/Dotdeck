// Package websocket implements real-time multiplayer synchronization, presence tracking,
// and thought streaming over WebSockets using the coder/websocket protocol.
package websocket

import (
	"encoding/json"
	"net/http"
	"sync"

	coderws "github.com/coder/websocket"
)

// Hub routes real-time events to connected clients grouped by workspace ID.
type Hub struct {
	mutex            sync.RWMutex
	workspaceRooms   map[string]map[*Client]bool
	presenceTracker  *PresenceTracker
	registerQueue    chan *Client
	unregisterQueue  chan *Client
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

// Run executes the hub event loop processing client connections and disconnections.
func (hub *Hub) Run() {
	for {
		select {
		case client := <-hub.registerQueue:
			hub.mutex.Lock()
			roomClients, exists := hub.workspaceRooms[client.WorkspaceID]
			if !exists {
				roomClients = make(map[*Client]bool)
				hub.workspaceRooms[client.WorkspaceID] = roomClients
			}
			roomClients[client] = true
			hub.mutex.Unlock()

		case client := <-hub.unregisterQueue:
			hub.mutex.Lock()
			if roomClients, exists := hub.workspaceRooms[client.WorkspaceID]; exists {
				if _, registered := roomClients[client]; registered {
					delete(roomClients, client)
					close(client.sendChannel)
				}
				if len(roomClients) == 0 {
					delete(hub.workspaceRooms, client.WorkspaceID)
				}
			}
			hub.mutex.Unlock()
			hub.presenceTracker.RemoveUser(client.WorkspaceID, client.UserID)
		}
	}
}

// Register adds a new client to the hub's pending registration pipeline.
func (hub *Hub) Register(client *Client) {
	hub.registerQueue <- client
}

// Unregister schedules client removal and stream teardown.
func (hub *Hub) Unregister(client *Client) {
	hub.unregisterQueue <- client
}

// Broadcast dispatches an event to every active client in the specified workspace.
func (hub *Hub) Broadcast(workspaceID, eventType string, payload interface{}) {
	hub.mutex.RLock()
	roomClients, exists := hub.workspaceRooms[workspaceID]
	hub.mutex.RUnlock()

	if !exists {
		return
	}

	outboundMessage := OutboundMessage{
		Type:    eventType,
		Payload: payload,
	}

	hub.mutex.RLock()
	defer hub.mutex.RUnlock()
	for client := range roomClients {
		select {
		case client.sendChannel <- outboundMessage:
		default:
			// Buffer full: drop slow client to avoid stalling the broadcast ring
		}
	}
}

// HandleClientMessage dispatches client actions like cursor movement or question locking.
func (hub *Hub) HandleClientMessage(client *Client, inboundMessage InboundMessage) {
	switch inboundMessage.Type {
	case "CURSOR_MOVE":
		var cursorPosition Cursor
		if decodeError := json.Unmarshal(inboundMessage.Payload, &cursorPosition); decodeError == nil {
			cursorPosition.UserID = client.UserID
			cursorPosition.UserName = client.UserName
			hub.presenceTracker.UpdateCursor(client.WorkspaceID, cursorPosition)
			hub.Broadcast(client.WorkspaceID, "PRESENCE_SYNC", cursorPosition)
		}

	case "LOCK_QUESTION":
		var payload struct {
			ApprovalID string `json:"approval_id"`
		}
		if decodeError := json.Unmarshal(inboundMessage.Payload, &payload); decodeError == nil && client.Role != "read" {
			if hub.presenceTracker.TryLockApproval(payload.ApprovalID, client.UserID) {
				hub.Broadcast(client.WorkspaceID, "QUESTION_LOCKED", map[string]string{
					"approval_id": payload.ApprovalID,
					"user_id":     client.UserID,
					"user_name":   client.UserName,
				})
			}
		}

	case "UNLOCK_QUESTION":
		var payload struct {
			ApprovalID string `json:"approval_id"`
		}
		if decodeError := json.Unmarshal(inboundMessage.Payload, &payload); decodeError == nil {
			hub.presenceTracker.ReleaseApproval(payload.ApprovalID, client.UserID)
			hub.Broadcast(client.WorkspaceID, "QUESTION_UNLOCKED", map[string]string{
				"approval_id": payload.ApprovalID,
				"user_id":     client.UserID,
			})
		}
	}
}

// ServeWebSocket upgrades the HTTP connection and starts client pumps.
func (hub *Hub) ServeWebSocket(writer http.ResponseWriter, request *http.Request, userID, userName, role, workspaceID string) {
	connection, upgradeError := coderws.Accept(writer, request, &coderws.AcceptOptions{
		OriginPatterns: []string{"*"},
	})
	if upgradeError != nil {
		return
	}

	client := NewClient(hub, connection, userID, userName, role, workspaceID)
	hub.Register(client)

	requestContext := request.Context()
	go client.WritePump(requestContext)
	client.ReadPump(requestContext)
}

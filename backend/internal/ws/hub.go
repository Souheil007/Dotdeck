package ws

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/coder/websocket"
)

// Hub routes real-time events to connected clients grouped by workspace ID.
type Hub struct {
	mu         sync.RWMutex
	rooms      map[string]map[*Client]bool
	presence   *PresenceTracker
	register   chan *Client
	unregister chan *Client
}

// NewHub constructs an empty room router for workspace collaboration.
func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]map[*Client]bool),
		presence:   NewPresenceTracker(),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run executes the hub event loop processing client connections and disconnections.
func (hub *Hub) Run() {
	for {
		select {
		case client := <-hub.register:
			hub.mu.Lock()
			room, exists := hub.rooms[client.WorkspaceID]
			if !exists {
				room = make(map[*Client]bool)
				hub.rooms[client.WorkspaceID] = room
			}
			room[client] = true
			hub.mu.Unlock()

		case client := <-hub.unregister:
			hub.mu.Lock()
			if room, exists := hub.rooms[client.WorkspaceID]; exists {
				if _, ok := room[client]; ok {
					delete(room, client)
					close(client.send)
				}
				if len(room) == 0 {
					delete(hub.rooms, client.WorkspaceID)
				}
			}
			hub.mu.Unlock()
			hub.presence.RemoveUser(client.WorkspaceID, client.UserID)
		}
	}
}

// Register adds a new client to the hub's pending registration pipeline.
func (hub *Hub) Register(client *Client) {
	hub.register <- client
}

// Unregister schedules client removal and stream teardown.
func (hub *Hub) Unregister(client *Client) {
	hub.unregister <- client
}

// Broadcast dispatches an event to every active client in the specified workspace.
func (hub *Hub) Broadcast(workspaceID, eventType string, payload interface{}) {
	hub.mu.RLock()
	room, exists := hub.rooms[workspaceID]
	hub.mu.RUnlock()

	if !exists {
		return
	}

	msg := OutboundMessage{
		Type:    eventType,
		Payload: payload,
	}

	hub.mu.RLock()
	defer hub.mu.RUnlock()
	for client := range room {
		select {
		case client.send <- msg:
		default:
			// Buffer full: drop slow client to avoid stalling the broadcast ring
		}
	}
}

// HandleClientMessage dispatches client actions like cursor movement or question locking.
func (hub *Hub) HandleClientMessage(client *Client, msg InboundMessage) {
	switch msg.Type {
	case "CURSOR_MOVE":
		var cur Cursor
		if err := json.Unmarshal(msg.Payload, &cur); err == nil {
			cur.UserID = client.UserID
			cur.UserName = client.UserName
			hub.presence.UpdateCursor(client.WorkspaceID, cur)
			hub.Broadcast(client.WorkspaceID, "PRESENCE_SYNC", cur)
		}

	case "LOCK_QUESTION":
		var payload struct {
			ApprovalID string `json:"approval_id"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err == nil && client.Role != "read" {
			if hub.presence.TryLockApproval(payload.ApprovalID, client.UserID) {
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
		if err := json.Unmarshal(msg.Payload, &payload); err == nil {
			hub.presence.ReleaseApproval(payload.ApprovalID, client.UserID)
			hub.Broadcast(client.WorkspaceID, "QUESTION_UNLOCKED", map[string]string{
				"approval_id": payload.ApprovalID,
				"user_id":     client.UserID,
			})
		}
	}
}

// ServeWebSocket upgrades the HTTP connection and starts client pumps.
func (hub *Hub) ServeWebSocket(writer http.ResponseWriter, request *http.Request, userID, userName, role, workspaceID string) {
	conn, err := websocket.Accept(writer, request, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"},
	})
	if err != nil {
		return
	}

	client := NewClient(hub, conn, userID, userName, role, workspaceID)
	hub.Register(client)

	ctx := request.Context()
	go client.WritePump(ctx)
	client.ReadPump(ctx)
}

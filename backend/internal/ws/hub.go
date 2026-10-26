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
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			room, exists := h.rooms[client.WorkspaceID]
			if !exists {
				room = make(map[*Client]bool)
				h.rooms[client.WorkspaceID] = room
			}
			room[client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if room, exists := h.rooms[client.WorkspaceID]; exists {
				if _, ok := room[client]; ok {
					delete(room, client)
					close(client.send)
				}
				if len(room) == 0 {
					delete(h.rooms, client.WorkspaceID)
				}
			}
			h.mu.Unlock()
			h.presence.RemoveUser(client.WorkspaceID, client.UserID)
		}
	}
}

// Register adds a new client to the hub's pending registration pipeline.
func (h *Hub) Register(c *Client) {
	h.register <- c
}

// Unregister schedules client removal and stream teardown.
func (h *Hub) Unregister(c *Client) {
	h.unregister <- c
}

// Broadcast dispatches an event to every active client in the specified workspace.
func (h *Hub) Broadcast(workspaceID, eventType string, payload interface{}) {
	h.mu.RLock()
	room, exists := h.rooms[workspaceID]
	h.mu.RUnlock()

	if !exists {
		return
	}

	msg := OutboundMessage{
		Type:    eventType,
		Payload: payload,
	}

	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range room {
		select {
		case client.send <- msg:
		default:
			// Buffer full: drop slow client to avoid stalling the broadcast ring
		}
	}
}

// HandleClientMessage dispatches client actions like cursor movement or question locking.
func (h *Hub) HandleClientMessage(c *Client, msg InboundMessage) {
	switch msg.Type {
	case "CURSOR_MOVE":
		var cur Cursor
		if err := json.Unmarshal(msg.Payload, &cur); err == nil {
			cur.UserID = c.UserID
			cur.UserName = c.UserName
			h.presence.UpdateCursor(c.WorkspaceID, cur)
			h.Broadcast(c.WorkspaceID, "PRESENCE_SYNC", cur)
		}

	case "LOCK_QUESTION":
		var p struct {
			ApprovalID string `json:"approval_id"`
		}
		if err := json.Unmarshal(msg.Payload, &p); err == nil && c.Role != "read" {
			if h.presence.TryLockApproval(p.ApprovalID, c.UserID) {
				h.Broadcast(c.WorkspaceID, "QUESTION_LOCKED", map[string]string{
					"approval_id": p.ApprovalID,
					"user_id":     c.UserID,
					"user_name":   c.UserName,
				})
			}
		}

	case "UNLOCK_QUESTION":
		var p struct {
			ApprovalID string `json:"approval_id"`
		}
		if err := json.Unmarshal(msg.Payload, &p); err == nil {
			h.presence.ReleaseApproval(p.ApprovalID, c.UserID)
			h.Broadcast(c.WorkspaceID, "QUESTION_UNLOCKED", map[string]string{
				"approval_id": p.ApprovalID,
				"user_id":     c.UserID,
			})
		}
	}
}

// ServeWebSocket upgrades the HTTP connection and starts client pumps.
func (h *Hub) ServeWebSocket(w http.ResponseWriter, r *http.Request, userID, userName, role, workspaceID string) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"},
	})
	if err != nil {
		return
	}

	client := NewClient(h, conn, userID, userName, role, workspaceID)
	h.Register(client)

	ctx := r.Context()
	go client.WritePump(ctx)
	client.ReadPump(ctx)
}

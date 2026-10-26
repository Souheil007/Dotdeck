package ws

import (
	"context"
	"encoding/json"
	"time"

	"github.com/coder/websocket"
)

// InboundMessage represents an action received from the frontend canvas.
type InboundMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// OutboundMessage represents an event dispatched to connected canvas clients.
type OutboundMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// Client represents an active operator connection bound to a specific workspace room.
type Client struct {
	UserID      string
	UserName    string
	Role        string
	WorkspaceID string
	conn        *websocket.Conn
	send        chan OutboundMessage
	hub         *Hub
}

// NewClient constructs an active client descriptor ready for read and write pumping.
func NewClient(hub *Hub, conn *websocket.Conn, userID, userName, role, workspaceID string) *Client {
	return &Client{
		UserID:      userID,
		UserName:    userName,
		Role:        role,
		WorkspaceID: workspaceID,
		conn:        conn,
		send:        make(chan OutboundMessage, 128),
		hub:         hub,
	}
}

// ReadPump reads incoming messages from the WebSocket connection until closed.
func (c *Client) ReadPump(ctx context.Context) {
	defer func() {
		c.hub.Unregister(c)
		c.conn.Close(websocket.StatusNormalClosure, "disconnecting")
	}()

	for {
		_, data, err := c.conn.Read(ctx)
		if err != nil {
			break
		}

		var msg InboundMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			continue
		}

		c.hub.HandleClientMessage(c, msg)
	}
}

// WritePump flushes queued outbound messages down the WebSocket stream.
func (c *Client) WritePump(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close(websocket.StatusNormalClosure, "writing finished")
	}()

	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				return
			}
			data, err := json.Marshal(msg)
			if err != nil {
				continue
			}

			writeCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
			err = c.conn.Write(writeCtx, websocket.MessageText, data)
			cancel()
			if err != nil {
				return
			}

		case <-ticker.C:
			pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
			err := c.conn.Ping(pingCtx)
			cancel()
			if err != nil {
				return
			}

		case <-ctx.Done():
			return
		}
	}
}

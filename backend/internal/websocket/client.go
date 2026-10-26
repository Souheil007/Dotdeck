// Package websocket implements real-time multiplayer synchronization, presence tracking,
// and thought streaming over WebSockets using the coder/websocket protocol.
package websocket

import (
	"context"
	"encoding/json"
	"time"

	coderws "github.com/coder/websocket"
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
	connection  *coderws.Conn
	sendChannel chan OutboundMessage
	hub         *Hub
}

// NewClient constructs an active client descriptor ready for read and write pumping.
func NewClient(hub *Hub, connection *coderws.Conn, userID, userName, role, workspaceID string) *Client {
	return &Client{
		UserID:      userID,
		UserName:    userName,
		Role:        role,
		WorkspaceID: workspaceID,
		connection:  connection,
		sendChannel: make(chan OutboundMessage, 128),
		hub:         hub,
	}
}

// ReadPump reads incoming messages from the WebSocket connection until closed.
func (client *Client) ReadPump(streamContext context.Context) {
	defer func() {
		client.hub.Unregister(client)
		client.connection.Close(coderws.StatusNormalClosure, "disconnecting")
	}()

	for {
		messageType, payloadBytes, readError := client.connection.Read(streamContext)
		if readError != nil || messageType != coderws.MessageText {
			break
		}

		var inboundMessage InboundMessage
		if unmarshalError := json.Unmarshal(payloadBytes, &inboundMessage); unmarshalError != nil {
			continue
		}

		client.hub.HandleClientMessage(client, inboundMessage)
	}
}

// WritePump flushes queued outbound messages down the WebSocket stream.
func (client *Client) WritePump(streamContext context.Context) {
	pingTicker := time.NewTicker(30 * time.Second)
	defer func() {
		pingTicker.Stop()
		client.connection.Close(coderws.StatusNormalClosure, "writing finished")
	}()

	for {
		select {
		case outboundMessage, channelOpen := <-client.sendChannel:
			if !channelOpen {
				return
			}
			serializedPayload, marshalError := json.Marshal(outboundMessage)
			if marshalError != nil {
				continue
			}

			writeContext, cancelWrite := context.WithTimeout(streamContext, 5*time.Second)
			writeError := client.connection.Write(writeContext, coderws.MessageText, serializedPayload)
			cancelWrite()
			if writeError != nil {
				return
			}

		case <-pingTicker.C:
			pingContext, cancelPing := context.WithTimeout(streamContext, 5*time.Second)
			pingError := client.connection.Ping(pingContext)
			cancelPing()
			if pingError != nil {
				return
			}

		case <-streamContext.Done():
			return
		}
	}
}

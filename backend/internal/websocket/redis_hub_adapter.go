// Package websocket implements real-time multiplayer synchronization, presence tracking,
// and thought streaming over WebSockets using the coder/websocket protocol.
package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/redis/go-redis/v9"
)

// BroadcastPublisher abstracts broadcasting canvas events across cluster nodes.
type BroadcastPublisher interface {
	PublishBroadcast(publishContext context.Context, workspaceID, eventType string, payload interface{}) error
}

// RedisHubAdapter coordinates real-time event synchronization across multiple switchboard instances.
type RedisHubAdapter struct {
	redisClient *redis.Client
}

// NewRedisHubAdapter constructs a Redis-backed multi-node synchronization adapter.
func NewRedisHubAdapter(redisClient *redis.Client) *RedisHubAdapter {
	return &RedisHubAdapter{
		redisClient: redisClient,
	}
}

// PublishBroadcast publishes an event to the Redis workspace channel for multi-node distribution.
func (adapter *RedisHubAdapter) PublishBroadcast(publishContext context.Context, workspaceID, eventType string, payload interface{}) error {
	envelope := map[string]interface{}{
		"type":    eventType,
		"payload": payload,
	}

	serializedBytes, marshalError := json.Marshal(envelope)
	if marshalError != nil {
		return fmt.Errorf("failed to marshal cluster broadcast payload: %w", marshalError)
	}

	channelName := fmt.Sprintf("workspace:%s:events", workspaceID)
	return adapter.redisClient.Publish(publishContext, channelName, serializedBytes).Err()
}

// StartListening subscribes to cross-node workspace channels and delivers events to local clients.
func (adapter *RedisHubAdapter) StartListening(listenerContext context.Context, hub *Hub) {
	pubsubSubscription := adapter.redisClient.PSubscribe(listenerContext, "workspace:*:events")

	go func() {
		defer pubsubSubscription.Close()

		channelMessages := pubsubSubscription.Channel()
		for {
			select {
			case <-listenerContext.Done():
				return
			case messageItem, channelOpen := <-channelMessages:
				if !channelOpen {
					return
				}

				// Channel format: workspace:<workspace_id>:events
				channelParts := strings.Split(messageItem.Channel, ":")
				if len(channelParts) < 3 {
					continue
				}
				workspaceIdentifier := channelParts[1]

				var messageEnvelope struct {
					Type    string          `json:"type"`
					Payload json.RawMessage `json:"payload"`
				}

				if decodeError := json.Unmarshal([]byte(messageItem.Payload), &messageEnvelope); decodeError != nil {
					continue
				}

				hub.BroadcastLocal(workspaceIdentifier, messageEnvelope.Type, messageEnvelope.Payload)
			}
		}
	}()
}

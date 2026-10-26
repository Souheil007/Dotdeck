// Package mcp implements the multi-tenant Model Context Protocol switchboard
// connecting closed cloud agents to the Dotdeck orchestration graph.
package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisHoldAdapter coordinates cross-node approval resolution and distributed question locking.
type RedisHoldAdapter struct {
	redisClient *redis.Client
}

// NewRedisHoldAdapter constructs a Redis-backed mesh adapter for HoldEngine cluster sync.
func NewRedisHoldAdapter(redisClient *redis.Client) *RedisHoldAdapter {
	return &RedisHoldAdapter{
		redisClient: redisClient,
	}
}

// PublishResolution broadcasts an approval resolution payload to all cluster switchboard nodes.
func (adapter *RedisHoldAdapter) PublishResolution(publishContext context.Context, approvalID string, result DecisionResult) error {
	serializedBytes, marshalError := json.Marshal(result)
	if marshalError != nil {
		return fmt.Errorf("failed to marshal decision result: %w", marshalError)
	}

	channelName := fmt.Sprintf("approval:resolved:%s", approvalID)
	return adapter.redisClient.Publish(publishContext, channelName, serializedBytes).Err()
}

// StartListening subscribes to cross-node resolution channels and delivers verdicts to locally held agents.
func (adapter *RedisHoldAdapter) StartListening(listenerContext context.Context, holdEngine *HoldEngine) {
	pubsubSubscription := adapter.redisClient.PSubscribe(listenerContext, "approval:resolved:*")

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

				// Channel format: approval:resolved:<approval_id>
				channelParts := strings.Split(messageItem.Channel, ":")
				if len(channelParts) < 3 {
					continue
				}
				approvalIdentifier := channelParts[2]

				var decisionOutcome DecisionResult
				if decodeError := json.Unmarshal([]byte(messageItem.Payload), &decisionOutcome); decodeError != nil {
					continue
				}

				// If this node holds the agent channel locally, unblock it immediately
				if holdEngine.IsPending(approvalIdentifier) {
					_ = holdEngine.ResolveLocal(approvalIdentifier, decisionOutcome)
				}
			}
		}
	}()
}

// TryClaimLock attempts to acquire an exclusive distributed lock on a pending question.
func (adapter *RedisHoldAdapter) TryClaimLock(claimContext context.Context, approvalID, operatorID string, lockDuration time.Duration) (bool, error) {
	if lockDuration <= 0 {
		lockDuration = 45 * time.Second
	}

	lockKey := fmt.Sprintf("lock:approval:%s", approvalID)
	acquired, lockError := adapter.redisClient.SetNX(claimContext, lockKey, operatorID, lockDuration).Result()
	if lockError != nil {
		return false, fmt.Errorf("failed to claim distributed approval lock: %w", lockError)
	}

	return acquired, nil
}

// ReleaseClaimLock clears the distributed lock if held by the specified operator.
func (adapter *RedisHoldAdapter) ReleaseClaimLock(releaseContext context.Context, approvalID, operatorID string) error {
	lockKey := fmt.Sprintf("lock:approval:%s", approvalID)

	luaReleaseScript := `
		if redis.call("get", KEYS[1]) == ARGV[1] then
			return redis.call("del", KEYS[1])
		else
			return 0
		end
	`
	return adapter.redisClient.Eval(releaseContext, luaReleaseScript, []string{lockKey}, operatorID).Err()
}

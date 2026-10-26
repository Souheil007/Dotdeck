// Package ws implements real-time multiplayer synchronization and live canvas
// presence over WebSockets using the coder/websocket protocol.
package ws

import (
	"sync"
	"time"
)

// Cursor represents an operator's real-time coordinate position on the canvas.
type Cursor struct {
	UserID    string    `json:"user_id"`
	UserName  string    `json:"user_name"`
	Color     string    `json:"color"`
	PositionX float64   `json:"position_x"`
	PositionY float64   `json:"position_y"`
	UpdatedAt time.Time `json:"updated_at"`
}

// PresenceTracker stores ephemeral user positions and edit locks per workspace.
type PresenceTracker struct {
	mu      sync.RWMutex
	cursors map[string]map[string]Cursor // workspace_id -> user_id -> Cursor
	locks   map[string]string            // approval_id -> user_id
}

// NewPresenceTracker initializes the in-memory cursor and lock cache.
func NewPresenceTracker() *PresenceTracker {
	return &PresenceTracker{
		cursors: make(map[string]map[string]Cursor),
		locks:   make(map[string]string),
	}
}

// UpdateCursor saves the latest screen coordinates for an operator in a workspace.
func (tracker *PresenceTracker) UpdateCursor(workspaceID string, cursor Cursor) {
	tracker.mu.Lock()
	defer tracker.mu.Unlock()

	room, exists := tracker.cursors[workspaceID]
	if !exists {
		room = make(map[string]Cursor)
		tracker.cursors[workspaceID] = room
	}
	cursor.UpdatedAt = time.Now()
	room[cursor.UserID] = cursor
}

// RemoveUser cleans up cursor coordinates and released locks when an operator disconnects.
func (tracker *PresenceTracker) RemoveUser(workspaceID, userID string) {
	tracker.mu.Lock()
	defer tracker.mu.Unlock()

	if room, exists := tracker.cursors[workspaceID]; exists {
		delete(room, userID)
		if len(room) == 0 {
			delete(tracker.cursors, workspaceID)
		}
	}

	for approvalID, lockedBy := range tracker.locks {
		if lockedBy == userID {
			delete(tracker.locks, approvalID)
		}
	}
}

// TryLockApproval grants an exclusive question-editing lock to prevent duplicate human replies.
func (tracker *PresenceTracker) TryLockApproval(approvalID, userID string) bool {
	tracker.mu.Lock()
	defer tracker.mu.Unlock()

	holder, held := tracker.locks[approvalID]
	if held && holder != userID {
		return false
	}
	tracker.locks[approvalID] = userID
	return true
}

// ReleaseApproval clears the edit lock on an answered or dismissed approval question.
func (tracker *PresenceTracker) ReleaseApproval(approvalID, userID string) {
	tracker.mu.Lock()
	defer tracker.mu.Unlock()

	if holder, held := tracker.locks[approvalID]; held && holder == userID {
		delete(tracker.locks, approvalID)
	}
}

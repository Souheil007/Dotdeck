// Package websocket implements real-time multiplayer synchronization, presence tracking,
// and thought streaming over WebSockets using the coder/websocket protocol.
package websocket

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
	trackerMutex sync.RWMutex
	cursorCache  map[string]map[string]Cursor // workspace_id -> user_id -> Cursor
	lockCache    map[string]string            // approval_id -> user_id
}

// NewPresenceTracker initializes the in-memory cursor and lock cache.
func NewPresenceTracker() *PresenceTracker {
	return &PresenceTracker{
		cursorCache: make(map[string]map[string]Cursor),
		lockCache:   make(map[string]string),
	}
}

// UpdateCursor saves the latest screen coordinates for an operator in a workspace.
func (tracker *PresenceTracker) UpdateCursor(workspaceID string, cursor Cursor) {
	tracker.trackerMutex.Lock()
	defer tracker.trackerMutex.Unlock()

	workspaceCursors, exists := tracker.cursorCache[workspaceID]
	if !exists {
		workspaceCursors = make(map[string]Cursor)
		tracker.cursorCache[workspaceID] = workspaceCursors
	}
	cursor.UpdatedAt = time.Now()
	workspaceCursors[cursor.UserID] = cursor
}

// RemoveUser cleans up cursor coordinates and released locks when an operator disconnects.
func (tracker *PresenceTracker) RemoveUser(workspaceID, userID string) {
	tracker.trackerMutex.Lock()
	defer tracker.trackerMutex.Unlock()

	if workspaceCursors, exists := tracker.cursorCache[workspaceID]; exists {
		delete(workspaceCursors, userID)
		if len(workspaceCursors) == 0 {
			delete(tracker.cursorCache, workspaceID)
		}
	}

	for approvalID, lockedByUserID := range tracker.lockCache {
		if lockedByUserID == userID {
			delete(tracker.lockCache, approvalID)
		}
	}
}

// TryLockApproval grants an exclusive question-editing lock to prevent duplicate human replies.
func (tracker *PresenceTracker) TryLockApproval(approvalID, userID string) bool {
	tracker.trackerMutex.Lock()
	defer tracker.trackerMutex.Unlock()

	holderUserID, isHeld := tracker.lockCache[approvalID]
	if isHeld && holderUserID != userID {
		return false
	}
	tracker.lockCache[approvalID] = userID
	return true
}

// ReleaseApproval clears the edit lock on an answered or dismissed approval question.
func (tracker *PresenceTracker) ReleaseApproval(approvalID, userID string) {
	tracker.trackerMutex.Lock()
	defer tracker.trackerMutex.Unlock()

	if holderUserID, isHeld := tracker.lockCache[approvalID]; isHeld && holderUserID == userID {
		delete(tracker.lockCache, approvalID)
	}
}

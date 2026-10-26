// Package websocket implements real-time multiplayer synchronization, presence tracking,
// and thought streaming over WebSockets using the coder/websocket protocol.
package websocket

import (
	"sync"
	"time"
)

var defaultAvatarColors = []string{
	"#3b82f6", // Blue
	"#10b981", // Emerald
	"#f59e0b", // Amber
	"#ef4444", // Red
	"#8b5cf6", // Purple
	"#ec4899", // Pink
	"#06b6d4", // Cyan
	"#84cc16", // Lime
}

// AssignUserColor deterministically selects a vibrant avatar color from a user identifier.
func AssignUserColor(userID string) string {
	hashValue := 0
	for _, runeValue := range userID {
		hashValue = int(runeValue) + ((hashValue << 5) - hashValue)
	}
	if hashValue < 0 {
		hashValue = -hashValue
	}
	return defaultAvatarColors[hashValue%len(defaultAvatarColors)]
}

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
	if cursor.Color == "" {
		cursor.Color = AssignUserColor(cursor.UserID)
	}
	cursor.UpdatedAt = time.Now().UTC()
	workspaceCursors[cursor.UserID] = cursor
}

// RemoveUser cleans up cursor coordinates and releases locks when an operator disconnects,
// returning the list of approval IDs that were unblocked.
func (tracker *PresenceTracker) RemoveUser(workspaceID, userID string) []string {
	tracker.trackerMutex.Lock()
	defer tracker.trackerMutex.Unlock()

	if workspaceCursors, exists := tracker.cursorCache[workspaceID]; exists {
		delete(workspaceCursors, userID)
		if len(workspaceCursors) == 0 {
			delete(tracker.cursorCache, workspaceID)
		}
	}

	var unlockedApprovals []string
	for approvalID, lockedByUserID := range tracker.lockCache {
		if lockedByUserID == userID {
			delete(tracker.lockCache, approvalID)
			unlockedApprovals = append(unlockedApprovals, approvalID)
		}
	}

	return unlockedApprovals
}

// GetWorkspaceCursors returns snapshot copies of all active cursors in a workspace.
func (tracker *PresenceTracker) GetWorkspaceCursors(workspaceID string) []Cursor {
	tracker.trackerMutex.RLock()
	defer tracker.trackerMutex.RUnlock()

	workspaceCursors, exists := tracker.cursorCache[workspaceID]
	if !exists {
		return nil
	}

	cursorList := make([]Cursor, 0, len(workspaceCursors))
	for _, cursorInstance := range workspaceCursors {
		cursorList = append(cursorList, cursorInstance)
	}
	return cursorList
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

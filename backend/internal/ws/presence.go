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
	X         float64   `json:"x"`
	Y         float64   `json:"y"`
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
func (p *PresenceTracker) UpdateCursor(workspaceID string, cursor Cursor) {
	p.mu.Lock()
	defer p.mu.Unlock()

	room, exists := p.cursors[workspaceID]
	if !exists {
		room = make(map[string]Cursor)
		p.cursors[workspaceID] = room
	}
	cursor.UpdatedAt = time.Now()
	room[cursor.UserID] = cursor
}

// RemoveUser cleans up cursor coordinates and released locks when an operator disconnects.
func (p *PresenceTracker) RemoveUser(workspaceID, userID string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if room, exists := p.cursors[workspaceID]; exists {
		delete(room, userID)
		if len(room) == 0 {
			delete(p.cursors, workspaceID)
		}
	}

	for approvalID, lockedBy := range p.locks {
		if lockedBy == userID {
			delete(p.locks, approvalID)
		}
	}
}

// TryLockApproval grants an exclusive question-editing lock to prevent duplicate human replies.
func (p *PresenceTracker) TryLockApproval(approvalID, userID string) bool {
	p.mu.Lock()
	defer p.mu.Unlock()

	holder, held := p.locks[approvalID]
	if held && holder != userID {
		return false
	}
	p.locks[approvalID] = userID
	return true
}

// ReleaseApproval clears the edit lock on an answered or dismissed approval question.
func (p *PresenceTracker) ReleaseApproval(approvalID, userID string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if holder, held := p.locks[approvalID]; held && holder == userID {
		delete(p.locks, approvalID)
	}
}

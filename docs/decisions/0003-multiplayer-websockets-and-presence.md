# ADR 0003: Multiplayer Architecture Using coder/websocket

- **Status:** Accepted
- **Date:** 2026-10-26
- **Context:** Selecting real-time WebSocket protocol and concurrency model for multiplayer collaboration.

## Context & Problem Statement
Dotdeck workspaces are collaborative ("Figma for Agents"). Multiple teammates view the same canvas, move nodes, answer agent questions, and inspect live thought streams. The WebSocket server must support room isolation, high-frequency cursor broadcasting, and strict cancellation safety.

## Decision
Adopt `github.com/coder/websocket` (formerly `nhooyr.io/websocket`) over `gorilla/websocket`:
1. Native `context.Context` integration for guaranteed cancellation and leak prevention.
2. Room router isolating events strictly by `workspace_id`.
3. Non-blocking fan-out: buffer full clients are disconnected rather than blocking workspace peers.
4. Optimistic question locking (`LOCK_QUESTION`) to eliminate double-approval races between operators.

## Consequences
- **Positive:**
  - Modern, concurrency-safe Go implementation without goroutine leaks.
  - Zero double-approval race conditions in production.
  - Smooth 60fps cursor presence and state synchronization.
- **Negative:**
  - In a multi-server deployment, requires a Redis Pub/Sub adapter to sync room messages across instances.

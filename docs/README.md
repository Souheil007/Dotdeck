# Dotdeck Technical Documentation

Welcome to the **Dotdeck** architecture and engineering documentation hub.

---

## Documentation Structure

```
Dotdeck/docs/
├── architecture/                     # System design, topologies, and concepts
│   ├── overview.md                   # Full system architecture & data flows
│   └── tier3-switchboard-concept.md  # Tier 3 Closed Cloud Agent orchestration mechanics
│
└── decisions/                        # Architecture Decision Records (ADRs)
    ├── 0001-tier3-closed-cloud-orchestration.md
    ├── 0002-mcp-and-held-approval-channels.md
    └── 0003-multiplayer-websockets-and-presence.md
```

---

## Key Guides & Reading Order

1. **[System Architecture Overview](file:///C:/GithubProjects/Dotdeck/docs/architecture/overview.md)**: Deep dive into the Go Switchboard, React Flow canvas, held HTTP/SSE approval channels, and multiplayer WebSockets.
2. **[Tier 3 Closed Cloud Agent Concept](file:///C:/GithubProjects/Dotdeck/docs/architecture/tier3-switchboard-concept.md)**: Why we focus exclusively on closed cloud agents (OpenAI Dots, Grok Bots, Meta Muse, Claude), how we engineer around proprietary VM walls, and why dropping local PTYs is a major strategic win.
3. **[Architecture Decision Records (ADRs)](file:///C:/GithubProjects/Dotdeck/docs/decisions/)**: Immutable log of key architectural decisions, rationale, trade-offs, and consequences.

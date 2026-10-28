# Dotdeck Technical Documentation

Welcome to the **Dotdeck** architecture and engineering documentation hub.

---

## Documentation Structure

```
Dotdeck/docs/
├── platform-guide-and-use-cases.md   # Complete platform guide, why Dotdeck, capabilities & 8 enterprise use cases
├── product-overview.md               # SaaS capabilities, features & user value proposition
├── agent-steering-mechanics.md       # Runtime human-in-the-loop steering & outbound bridges
├── held-approval-channels.md         # 45-second synchronous hold engine & human authority gating
├── architecture/                     # System design, topologies, and concepts
│   ├── database-schema-and-entities.md # Relational ERD, domain class diagram & table specs
│   ├── system-design-specification.md # Production-grade system design (capacity, QPS, DDL, trade-offs)
│   ├── overview.md                   # Full system architecture & data flows
│   ├── tier3-switchboard-concept.md  # Tier 3 Closed Cloud Agent orchestration mechanics
│   └── multi-agent-orchestration-and-routing.md # Cross-vendor routing, connector isolation & zero-touch execution
│
└── decisions/                        # Architecture Decision Records (ADRs)
    ├── 0001-tier3-closed-cloud-orchestration.md
    ├── 0002-mcp-and-held-approval-channels.md
    ├── 0003-multiplayer-websockets-and-presence.md
    ├── 0004-thought-stream-telemetry-persistence.md
    └── 0005-account-wide-connector-routing-and-zero-touch-orchestration.md
```

---

## Key Guides & Reading Order

1. **[Platform Guide & Enterprise Use Cases](file:///C:/GithubProjects/Dotdeck/docs/platform-guide-and-use-cases.md)**: The comprehensive guide on why Dotdeck exists, what capabilities were previously impossible, exact architecture features, step-by-step user journey, and 8 exhaustive real-world enterprise use cases.
2. **[Product Overview & SaaS Value Proposition](file:///C:/GithubProjects/Dotdeck/docs/product-overview.md)**: What Dotdeck offers to operators, engineers, and enterprise AI teams (capabilities matrix, before-vs-after comparison, and key user experiences).
3. **[Multi-Agent Orchestration, Connector Routing & Zero-Touch Execution](file:///C:/GithubProjects/Dotdeck/docs/architecture/multi-agent-orchestration-and-routing.md)**: How Dotdeck coordinates Tier 3 closed cloud agents, avoids the $5 \times N$ connector explosion trap on platforms with account-wide tools (Grok, ChatGPT), resolves dynamic `agent_name` parameters, and executes zero-touch pipelines without API keys.
4. **[Database Schema & Entity Relationship Specification](file:///C:/GithubProjects/Dotdeck/docs/architecture/database-schema-and-entities.md)**: Relational ERD, Go domain class diagram, state machine, and exhaustive specifications for all PostgreSQL tables and monthly range partitions.
5. **[System Design Specification](file:///C:/GithubProjects/Dotdeck/docs/architecture/system-design-specification.md)**: Production-grade architectural blueprint, quantitative back-of-the-envelope capacity estimations, PostgreSQL monthly partitioned DDL, Redis cross-node hold synchronization, and failure mode mitigations.
6. **[System Architecture Overview](file:///C:/GithubProjects/Dotdeck/docs/architecture/overview.md)**: Deep dive into the Go Switchboard, React Flow canvas, held HTTP/SSE approval channels, and multiplayer WebSockets.
7. **[Tier 3 Closed Cloud Agent Concept](file:///C:/GithubProjects/Dotdeck/docs/architecture/tier3-switchboard-concept.md)**: Why we focus exclusively on closed cloud agents (OpenAI Dots, Grok Bots, Meta Muse, Claude), how we engineer around proprietary VM walls, and why dropping local PTYs is a major strategic win.
8. **[Agent Steering Mechanics & Runtime Guidance](file:///C:/GithubProjects/Dotdeck/docs/agent-steering-mechanics.md)**: Mid-flight pilot control vs. chat, preset directives, and dual delivery patterns (Outbound Webhooks vs. Inbound MCP Tool Injection).
9. **[45-Second Held Approval Channels & Authority Gating](file:///C:/GithubProjects/Dotdeck/docs/held-approval-channels.md)**: Synchronous HTTP hold engine, gateway timeout pre-emption, Redis cluster resolution, and multi-operator claim locking.
10. **[Architecture Decision Records (ADRs)](file:///C:/GithubProjects/Dotdeck/docs/decisions/)**: Immutable log of key architectural decisions, rationale, trade-offs, and consequences.

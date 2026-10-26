# Dotdeck Agent Instructions & Workspace Context

Dotdeck is a vendor-neutral cross-vendor orchestration and command hub for Tier 3 closed cloud agents (OpenAI Dots, Grok Bots, Meta Muse, Claude Cloud Agents).

## Primary Rule Sources
- **Coding Standards**: See [.agents/rules/coding-standards.md](file:///C:/GithubProjects/Dotdeck/.agents/rules/coding-standards.md) and [STANDARDS.md](file:///C:/GithubProjects/Dotdeck/STANDARDS.md).
- **Plan Standards**: See [.agents/rules/plan-standards.md](file:///C:/GithubProjects/Dotdeck/.agents/rules/plan-standards.md).

## Non-Negotiable Engineering Rules
1. **Google-Style Docstrings**: Every Go module, exported struct, interface, and public function must have concise, high-signal Google-style docstrings. Never write redundant restatements of parameter names.
2. **Naming Conventions**: Strict Go (`camelCase`/`PascalCase`), TypeScript React, and database snake_case conventions.
3. **Architecture Scope**: Tier 3 closed cloud agents only. We orchestrate via dynamic MCP endpoints (`/mcp/{agent_token}`), held approval channels, and asynchronous wake-up bridges (Slack/Webhooks).

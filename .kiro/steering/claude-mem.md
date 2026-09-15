---
inclusion: always
---

# Claude-Mem — Persistent Memory Across Sessions

Claude-Mem captures what happens during sessions (decisions, bugfixes, file edits, observations), compresses it with AI, and injects relevant context back into future sessions. It runs a local worker service with SQLite + vector search.

## MCP Tools

Use these tools to query memory from past sessions:

| Tool | What it does |
|------|-------------|
| `search` | Search the memory index by full-text query. Filters: type, date, project. Returns compact index with IDs. |
| `timeline` | Get chronological context around a specific observation or query. |
| `get_observations` | Fetch full observation details by IDs. Always batch multiple IDs in one call. |

## 3-Layer Workflow (token-efficient)

Always follow this pattern — never call `get_observations` without searching first:

```
1. search(query="...", limit=10)          → compact index, ~50-100 tokens/result
2. timeline(query="...")                  → chronological context if needed
3. get_observations(ids=[123, 456])       → full details for relevant IDs only
```

This saves ~10x tokens vs fetching everything upfront.

## Example Queries

```
search(query="authentication bug", type="bugfix", limit=10)
search(query="database schema", type="decision", limit=5)
search(query="wayfinder building component", limit=10)
timeline(query="last session")
get_observations(ids=[42, 87, 103])
```

### Observation Types
- `bugfix` — bugs that were fixed
- `decision` — implementation decisions made
- `security_alert` — security-related findings
- `sensitive` — sensitive observations (awareness push)

## Privacy Tags

Wrap content you don't want stored in memory:
```
<private>
This won't be captured by claude-mem
</private>
```

## Setup — One-time Install

claude-mem needs to be installed and its worker started before the MCP tools are available.

**Step 1 — Install:**
```powershell
npx claude-mem install
```
This sets up the worker service, SQLite database, and prompts for a memory provider (free 30-day trial, or use your own API key).

**Step 2 — Add MCP server in Kiro:**

Open Kiro Settings → MCP Servers → Add Server manually:
```json
{
  "claude-mem": {
    "command": "npx",
    "args": ["claude-mem", "mcp"]
  }
}
```

**Step 3 — Verify:**

Type `search(query="test")` in chat. If the MCP server is connected, it will respond.

## How Memory is Captured

Claude-mem automatically captures observations when the worker is running:
- File edits, git operations, bugfixes
- Decisions and user corrections
- Security alerts and sensitive findings

Observations from previous sessions are injected back into new sessions as relevant context — you don't need to ask.

## Configuration

Settings live at `~/.claude-mem/settings.json` (auto-created on first run). Configurable: AI model, worker port, data directory, log level, context injection behaviour.

## Requirements

- Node.js 20.0.0 or higher
- Bun (auto-installed by claude-mem if missing)

Source: [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) — adapted for Kiro.

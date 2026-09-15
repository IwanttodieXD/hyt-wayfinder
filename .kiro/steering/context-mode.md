---
inclusion: always
---

# Context-Mode Routing Rules

Context-mode is an MCP server that protects your context window by sandboxing large tool outputs. Raw data from shell commands, file reads, and web fetches stays out of context — only the result summary enters.

## When to Use Context-Mode Tools

Use `ctx_execute` instead of running shell commands directly when the output could be large:

| Instead of... | Use... |
|--------------|--------|
| Running a shell command that dumps logs | `ctx_execute("shell", "your command")` |
| Reading many files to count/analyse them | `ctx_execute("javascript", "fs script that logs only the result")` |
| Fetching a web page to extract info | `ctx_fetch_and_index(url)` then `ctx_search(query)` |
| Searching large codebases | `ctx_execute("shell", "rg pattern . --stats-only")` |

## The Core Principle

**The LLM should program the analysis, not compute it.**

Instead of reading 50 files into context to count functions:
```javascript
// ctx_execute("javascript", ...)
const files = fs.readdirSync('src').filter(f => f.endsWith('.ts'));
files.forEach(f => console.log(f + ': ' + require('fs').readFileSync('src/'+f,'utf8').split('\n').length + ' lines'));
```
One script replaces ten tool calls and saves 100x context.

## Available Tools

| Tool | What it does |
|------|-------------|
| `ctx_execute` | Run code in a sandbox (JS, TS, Python, Shell, Ruby, Go + more). Only stdout enters context. |
| `ctx_batch_execute` | Run multiple commands or queries in one call. Use for batching. |
| `ctx_execute_file` | Process a file in sandbox — raw content never enters context. |
| `ctx_fetch_and_index` | Fetch a URL, index it. Raw page never enters context. |
| `ctx_index` | Index a local file/directory into the knowledge base. |
| `ctx_search` | Search previously indexed content. |
| `ctx_stats` | Show context savings, call counts, session statistics. |
| `ctx_doctor` | Diagnose runtimes, hooks, versions. |

## 3-Layer Search Workflow (token-efficient)

1. `ctx_search(query)` — get compact index with IDs (~50-100 tokens/result)
2. Review index, identify relevant IDs
3. `ctx_execute` a targeted script to fetch only what's needed

Saves ~10x tokens vs reading full documents.

## Session Commands

Type these in chat at any time:
- `ctx stats` — see context savings this session
- `ctx doctor` — diagnose if tools are connected
- `ctx search [query]` — search indexed content
- `ctx index [path]` — index a file or directory

## Setup Status

context-mode requires the npm package to be installed globally:
```
npm install -g context-mode
```

Then add it as an MCP server in Kiro: Settings → MCP Servers → Add Server:
- Name: `context-mode`
- Command: `context-mode`

Hooks are already configured at `.kiro/hooks/context-mode-pretooluse.json` and `.kiro/hooks/context-mode-posttooluse.json`.

Source: [mksglu/context-mode](https://github.com/mksglu/context-mode) — adapted for Kiro.

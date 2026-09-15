# GSD — Git. Ship. Done.

A lightweight meta-prompting, context engineering, and spec-driven development framework. GSD prevents context rot — the silent quality degradation that happens as an AI fills its context window — by running heavy work in focused subagents while keeping the main session lean.

## The Phase Loop

Every milestone repeats the same five-step loop:

```
DISCUSS → PLAN → EXECUTE → VERIFY → SHIP
```

| Phase | What Happens | Output |
|-------|-------------|--------|
| **Discuss** | Capture implementation decisions before anything is planned | Decision log, scope boundaries |
| **Plan** | Research, decompose, verify the plan fits a single context window | PLAN.md with tasks |
| **Execute** | Run plans in parallel waves; each executor starts with a clean context | Working code |
| **Verify** | Walk through what was built; diagnose and fix before declaring done | Fix list or ✅ |
| **Ship** | Create the PR, archive the phase, repeat for the next milestone | Merged PR, updated STATE.md |

## Core Principles

### 1. Context is your most valuable resource
Heavy research, planning, and execution run in **fresh-context subagents**. The main session stays lean. Never let a single session balloon into a context graveyard.

### 2. One phase at a time
Complete each phase fully before moving on. Skipping Verify to ship faster is how bugs reach production.

### 3. Parallel execution, sequential phases
Within Execute, tasks can run in parallel waves. But phases (Discuss → Plan → Execute) are sequential — each feeds the next.

### 4. Artifacts survive session boundaries
`STATE.md` and `CONTEXT.md` are your memory between sessions. Keep them current. They are what lets a fresh session pick up exactly where the last one ended.

## Phase Playbooks

### DISCUSS
Before writing any plan:
- What are we building and why?
- What are the constraints? (time, tech, backwards compat)
- What decisions have already been made?
- What are the riskiest unknowns?

Output: a short decision log. If you can't explain what you're building in 3 sentences, you're not ready to plan.

### PLAN
- Break the work into tasks that fit in a single subagent context (~200k tokens)
- Each task should be independently executable
- Identify dependencies between tasks
- Estimate: what can run in parallel?
- Verify the plan makes sense before executing

Output: `PLAN.md` with numbered tasks, dependencies, and acceptance criteria per task.

### EXECUTE
- Each executor gets: the task, relevant context, acceptance criteria
- Executors do NOT see the full plan — only their task
- Keep executors focused: one task, one output
- If a task is too large, split it in PLAN first

Wave structure example:
```
Wave 1 (parallel): Task 1, Task 2, Task 3  ← no dependencies between them
Wave 2 (parallel): Task 4, Task 5          ← depend on Wave 1
Wave 3 (sequential): Task 6               ← depends on Task 4 specifically
```

### VERIFY
Walk through what was built:
- Does it match the acceptance criteria?
- Does it work end-to-end?
- Are there regressions?
- What did the executor miss or misinterpret?

If issues are found: generate a fix plan and execute it before declaring the phase done. Never skip Verify.

### SHIP
- Create the PR with a summary of what was built and what was tested
- Archive the phase: move PLAN.md to `phases/phase-N.md`
- Update STATE.md with current status
- Repeat from DISCUSS for the next milestone

## STATE.md Format

Keep a `STATE.md` at the project root to survive session boundaries:

```markdown
# Project State

## Current Phase
[Discuss / Plan / Execute / Verify / Ship]

## Active Milestone
[What we're building right now]

## Completed Phases
- Phase 1: [description] — shipped [date]

## Key Decisions
- [decision]: [rationale]

## Open Questions
- [question]: [who owns it]

## Next Actions
- [ ] [task]
```

## CONTEXT.md Format

Keep a `CONTEXT.md` for subagents — the minimum context they need to do their task:

```markdown
# Context for [Task Name]

## What we're building
[2–3 sentences]

## Relevant files
- [path]: [what it does]

## Constraints
- [constraint]

## Acceptance criteria
- [ ] [criterion]
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Fix |
|-------------|-------------|-----|
| One giant session | Context rot degrades quality silently | Run heavy work in subagents |
| Skipping Discuss | Builds the wrong thing efficiently | 10 min of discussion prevents hours of rework |
| Skipping Verify | Bugs reach production | Always walk through before shipping |
| Vague acceptance criteria | Executor doesn't know what "done" means | Write criteria before executing |
| No STATE.md | Next session starts from scratch | Update STATE.md at the end of every phase |
| Parallel phases | Dependencies cause conflicts | Phases are sequential; tasks within Execute can be parallel |

## Starting a New Project

```
1. Create STATE.md with the project goal
2. DISCUSS: capture decisions and constraints
3. PLAN: break into tasks with acceptance criteria
4. EXECUTE: run in waves
5. VERIFY: walk through the output
6. SHIP: PR + archive + update STATE.md
7. Repeat from step 2 for the next milestone
```

## Onboarding an Existing Codebase

```
1. Run context-gathering to understand the current state
2. Write STATE.md capturing what exists and what's broken/missing
3. DISCUSS: what's the first milestone?
4. Proceed with the normal phase loop
```

Source: [open-gsd/gsd-core](https://github.com/open-gsd/gsd-core) — adapted for Kiro steering format.

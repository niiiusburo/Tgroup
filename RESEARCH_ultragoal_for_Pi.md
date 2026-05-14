# Research: Ultragoal for Codex → Adaptability for Pi

## What Ultragoal Is

**ultragoal** is a canonical skill in [`oh-my-codex`](https://github.com/Yeachan-Heo/oh-my-codex) (OMX), a workflow layer for OpenAI Codex CLI.

It turns a project brief into durable, repo-native artifacts and drives a multi-goal plan safely through Codex's limited goal-mode tools.

### Artifacts (repo-native, no Codex state required)
- `.omx/ultragoal/brief.md` — original brief
- `.omx/ultragoal/goals.json` — ordered plan with G001/G002 stories, status, attempts, evidence
- `.omx/ultragoal/ledger.jsonl` — append-only audit trail

### Codex Goal Mode (the part that is Codex-specific)
Codex exposes three model tools:
- `get_goal` — read active thread goal
- `create_goal` — start one objective per thread
- `update_goal` — mark existing goal complete

One Codex thread = one active goal max. No reset/new-goal surface exists for replacing a completed goal in the same thread.

### How Ultragoal Works Around Codex Limitations

**Aggregate mode (default since v0.17):**
- One Codex objective covers the *entire* ultragoal run
- OMX tracks G001/G002 story progress in its own `goals.json` / `ledger.jsonl`
- Intermediate stories: do NOT call `update_goal`; checkpoint with `active` Codex snapshot
- Final story only: run quality gate (ai-slop-cleaner → verification → $code-review), then `update_goal({status:"complete"})`

**Per-story mode (legacy):**
- One fresh Codex thread per story
- Handles "completed goal blocks `create_goal`" by recording `--status blocked` and switching threads

### Team Integration
OMX `team` spawns N worker instances in tmux panes, each running their own Codex/Claude/Gemini CLI process in isolated git worktrees. Ultragoal remains leader-owned; workers execute in parallel and return evidence.

---

## Pi Architecture Assessment

### What Pi Has
- **Sessions**: JSONL files with tree structure (branching, forking, cloning)
- **SDK**: `createAgentSession()`, `AgentSessionRuntime` for programmatic multi-session
- **CLI**: `pi --session <id>`, `pi --fork <id>`, `pi -c` (continue), `pi /new`, `pi /clone`
- **Extensions**: TypeScript modules that can add custom tools, commands, sub-agents
- **Philosophy**: "No sub-agents built-in — spawn pi instances via tmux, or build your own with extensions"

### What Pi Does NOT Have
- **No goal-mode tools**. There is no `get_goal` / `create_goal` / `update_goal` model tool surface.
- **No per-thread objective tracking**. Pi sessions track messages, not goals.
- **No built-in multi-agent orchestration**. This is explicitly left to extensions or external spawning.

### Relevant Pi SDK APIs
```typescript
// In-memory or persistent sessions
const { session } = await createAgentSession({
  sessionManager: SessionManager.create(process.cwd()),
});

// Runtime for new/resume/fork/switch
const runtime = await createAgentSessionRuntime(createRuntime, { cwd, sessionManager });
await runtime.newSession();
await runtime.switchSession(sessionFile);
await runtime.dispose();
```

---

## Verdict: Can Ultragoal Be Adapted for Pi?

**Yes, but with architectural changes.** The file-based plan/ledger system is 100% portable. The Codex goal-mode integration must be reimagined.

### What Translates Directly
| Ultragoal Concept | Pi Equivalent |
|---|---|
| `brief.md` | Same — write to `.pi/ultragoal/brief.md` |
| `goals.json` | Same — write to `.pi/ultragoal/goals.json` |
| `ledger.jsonl` | Same — write to `.pi/ultragoal/ledger.jsonl` |
| `omx ultragoal create-goals` | Same — parse brief, derive candidates, write artifacts |
| `omx ultragoal complete-goals` | Same — read plan, mark next story `in_progress`, print handoff |
| `omx ultragoal checkpoint` | Same — update goal status, append ledger entry |
| Quality gates (ai-slop-cleaner, verification, $code-review) | Same — these are OMX skills, not Codex-specific |

### What Must Change
| Codex-Only Concept | Pi Adaptation |
|---|---|
| `get_goal` / `create_goal` / `update_goal` | **Remove entirely.** In Pi, there is no thread-level goal state to reconcile. |
| Aggregate Codex objective | **Replace with Pi session objective.** Use a single Pi session for the whole run, or use the SDK to manage session context. |
| Per-story Codex thread | **Replace with Pi session-per-story.** Use `pi --fork` or SDK `runtime.newSession()` for each story. |
| `--codex-goal-json` reconciliation | **Replace with session snapshot.** Checkpoint could include `pi --session <id>` or session file path as evidence. |
| Legacy blocked goal (completed thread goal) | **Not applicable.** Pi has no "completed goal blocks new goal" constraint. |

### Recommended Pi Adaptation Design

#### Option A: Single Pi Session (Simplest)
- One Pi session runs the whole ultragoal
- Leader agent reads `.pi/ultragoal/goals.json` and works stories sequentially
- No multi-instance spawning needed
- Checkpoints are just file writes
- **Downside**: No parallel story execution

#### Option B: Pi Session-per-Story (Medium)
- For each story, spawn a fresh Pi session via SDK or CLI (`pi --fork <prev_session>`)
- Each session gets the story objective as its initial prompt
- Leader monitors session output and checkpoints on completion
- **Downside**: SDK `createAgentSession` is programmatic Node.js; orchestrating from *within* a running Pi session would need an extension or external script

#### Option C: Tmux-Spawning Extension (Matches OMX Team)
- Build a Pi extension that spawns N `pi` CLI processes in tmux panes (mirroring OMX team)
- Each worker gets its own session, worktree, and `AGENTS.md` overlay
- Leader Pi instance manages the ultragoal plan/ledger
- **Downside**: Requires building a Pi extension; Pi's extension API is powerful but this is non-trivial

#### Option D: Pi-as-Leader + External Orchestrator (Most Robust)
- Keep ultragoal as a standalone Node.js CLI tool (like `omx ultragoal`)
- It manages `.pi/ultragoal/` artifacts
- For execution, it shells out to `pi -p "<objective>"` or uses the SDK
- This is closest to how OMX works: OMX is a CLI wrapper around Codex

### Critical Gaps to Solve

1. **No goal reconciliation**: Pi has no `get_goal` JSON to validate against. The checkpoint system would need to trust the agent's self-reporting or run verification commands.

2. **Session isolation**: Pi sessions share the same working directory by default. For parallel workers, git worktrees (as OMX does) or temp directories would be needed.

3. **No built-in worker skill**: OMX workers load a `worker/SKILL.md` that teaches them the mailbox/inbox protocol. Pi would need an equivalent skill or extension.

4. **Token/cost tracking**: Codex goal mode tracks token budgets per goal. Pi tracks session tokens but not per-goal. This would need to be manual or extension-based.

---

## Recommended Next Steps

If the goal is to bring ultragoal-style durable multi-goal planning to Pi:

1. **Fork the artifact system**: Port `artifacts.ts` and `cli/ultragoal.ts` to a new tool (e.g., `pi-goal` or `ultragoal-pi`). Remove all Codex goal reconciliation logic.

2. **Simplify checkpoints**: Drop `--codex-goal-json` and `--quality-gate-json` (or make them optional evidence attachments). A checkpoint is just `{goalId, status, evidence, timestamp}`.

3. **Add Pi session awareness**: Include `piSessionId` or `piSessionFile` in checkpoint evidence so a human or script can correlate ledger entries with actual Pi sessions.

4. **Defer multi-instance spawning**: Start with Option A (single session). Only build tmux/SDK spawning (Option B/C) after the core artifact system works.

5. **Build as Pi extension or standalone CLI**: A standalone CLI that writes `.pi/ultragoal/` files and shells out to `pi` is the lowest-friction path. A Pi extension would be more integrated but requires learning the ExtensionAPI.

---

## Source Repositories

- **Canonical**: https://github.com/Yeachan-Heo/oh-my-codex
  - `skills/ultragoal/SKILL.md` — skill spec
  - `src/ultragoal/artifacts.ts` — plan/ledger logic
  - `src/cli/ultragoal.ts` — CLI surface
  - `src/goal-workflows/codex-goal-snapshot.ts` — Codex-specific reconciliation
  - `src/team/runtime.ts` + `src/team/tmux-session.ts` — multi-instance spawning

- **Docs fork with deeper rationale**: https://github.com/ZechenLiu001/oh-my-codex-teams/blob/main/docs/ultragoal.md

---

*Research date: 2026-05-14*
*Method: DuckDuckGo HTML scrape (curl + regex on `class="result__a"`) → GitHub Raw file fetch*

# Agent Safety Protocol

> Rules for parallel AI agents so they don't overwrite each other's work.

## 1. Lock File Convention

Before starting work, create `.agent-lock` in the worktree root:

```yaml
agent_id: AGENT_1
dispatched_at: 2026-04-18T14:30:00Z
task: "Fix payment allocation bug"
affected_domains:
  - payments-deposits
  - customers-partners
branch: core-pillars-infra
worktree: /Users/thuanle/Documents/TamTMV/Tgroup/.worktrees/core-pillars-infra
```

If `.agent-lock` exists and domains overlap, STOP and report conflict.

## 2. Branch Naming

Use ephemeral branches off `ai-develop`:

```
ai-develop-feat/<domain>-<seq>
```

Examples:
- `ai-develop-feat/payment-fix-001`
- `ai-develop-feat/customer-crud-002`

## 3. Merge Gate

No agent merges its own branch. Orchestrator MUST:
1. Verify CI passes
2. Verify product-map/ updated if schema/API/permission changed
3. Run `bash -n scripts/deploy-tbot.sh` if deploy files changed
4. Fast-forward merge to `ai-develop`

## 4. Shared Memory Sync

After finishing, run:
```bash
bash scripts/sync-claude-mem.sh
```

## 5. Worktree Safety

- Each major initiative gets its own worktree
- Never edit `main` or `ai-develop` directly
- Commit frequently with atomic messages
- Never force-push

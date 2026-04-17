# Live Update PRD — Open Questions Tracker

- **Companion to:** `2026-04-17-live-update-prd.md`
- **Worktree:** `.claude/worktrees/live-update/`
- **Last updated:** 2026-04-17
- **Status:** **ALL RESOLVED** — PRD approved, proceeding to implementation plan.

Running record of every question asked during the PRD review and the final decisions. No outstanding items.

---

## Decided (all 11)

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| Q1 | PRD overall verdict? | **APPROVE** | PRD is thorough, gaps are evidenced, three-phase rollout is sensible, success criteria are measurable. No blocking issues. |
| Q2 | On "Update Now", wipe `localStorage`? | **Wipe only on critical** | Non-critical updates preserve in-progress draft state, filters, prefs. Critical updates (`severity: "critical"` in CHANGELOG) wipe everything. |
| Q3 | Pre-commit bump-check hook location? | **Repo root** | Husky installs at root with a path filter on `website/src/**` and `website/public/**`. Catches every commit regardless of cwd. |
| Q4 | Telemetry endpoint location? | **Reuse existing `tdental-api` route** | Fewer files, lower ops cost. Accepts that business endpoint rate limits are shared. New DB table `version_events` lands inside the existing router. |
| Q5 | Flow preference — brainstorm gate or skip to plan? | **Skip gate, write plan now** | Spec is detailed enough; go straight to implementation task list. |
| Q6 | `severity: "critical"` countdown duration? | **Keep 10s** | Middle ground — not too hostile, not too long. |
| Q7 | Critical modal: blocking vs banner? | **Blocking modal** | User wants forced enforcement for critical severity; banner is too easy to ignore. |
| Q8 | Polling interval? | **Keep 5 min** | Explicitly out of scope in PRD; telemetry will tell us if it needs changing later. |
| Q9 | CI gate behavior on release commits? | **Skip release-only commits** | Gate ignores commits whose only changes are `package.json` + `CHANGELOG.json` (+ `version.json`). Avoids circular bump requirement. |
| Q10 | Rollback / downgrade handling? | **Treat any mismatch as "update available"** | Comparison should be `!==` (commit hash) rather than `<`. Cheap and correct. |
| Q-bonus | Add `window.__TG_VERSION__` for console debugging? | **Yes** | Trivial, zero cost. |

---

## Outstanding

_(none — all resolved)_

---

## How to use this file

1. **You** read the PRD + this file, scribble answers inline or tell me in chat.
2. **I** update the "Decided" table and move entries out of "Outstanding".
3. Once all "Outstanding" rows are resolved, PRD is approved → commit PRD + this file → bump version + CHANGELOG → invoke `writing-plans` skill to generate the full implementation task list.

---

## Links

- PRD: [`2026-04-17-live-update-prd.md`](./2026-04-17-live-update-prd.md)
- Branch: `worktree-live-update`
- Worktree path: `/Users/thuanle/Documents/TamTMV/Tgroup/.claude/worktrees/live-update`

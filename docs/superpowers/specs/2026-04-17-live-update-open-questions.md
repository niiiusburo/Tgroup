# Live Update PRD — Open Questions Tracker

- **Companion to:** `2026-04-17-live-update-prd.md`
- **Worktree:** `.claude/worktrees/live-update/`
- **Last updated:** 2026-04-17

Running record of every question asked during the PRD review, your answers, and what is still outstanding. Update this file as decisions are made.

---

## Decided

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| Q2 | On "Update Now", wipe `localStorage`? | **Wipe only on critical** | Non-critical updates preserve in-progress draft state, filters, prefs. Critical updates (schema-breaking, `severity: "critical"` in CHANGELOG) wipe everything. |
| Q3 | Pre-commit bump-check hook location? | **Repo root** | Husky installs at root with a path filter on `website/src/**` and `website/public/**`. Catches every commit regardless of cwd. |
| Q4 | Telemetry endpoint location? | **Reuse existing `tdental-api` route** | Fewer files, lower ops cost. Accepts that business endpoint rate limits are shared. New DB table `version_events` still lands, just inside the existing router. |
| Q-bonus | Add `window.__TG_VERSION__` for console debugging? | **Yes (auto-decided)** | Trivial, zero cost. |

---

## Outstanding

| # | Question | Status | Notes |
|---|----------|--------|-------|
| Q1 | PRD overall verdict — approve / revise / redirect? | **APPROVE** | PRD is thorough, gaps are evidenced, three-phase rollout is sensible, success criteria are measurable. No blocking issues. |
| Q5 | Flow preference — brainstorm flow (PRD → approve → plan) or skip gate and dump full implementation task list now? | **Skip gate, write plan now** | Spec is detailed enough; moving straight to implementation task list. |

---

## Questions you may want to think about before approval

These weren't in the original PRD open-questions section but came up while reviewing the investigation output. Answer if/when relevant.

| # | Question | Why it matters |
|---|----------|----------------|
| Q6 | `severity: "critical"` 10-second countdown — is 10s the right number, or should it be 5s / 30s / "immediate"? | **Keep 10s.** Middle ground; not too hostile, not too long. |
| Q7 | Should the critical-severity modal block interaction (overlay, disabled inputs) or just show a banner with countdown? | **Blocking modal.** User wants forced enforcement for critical severity; banner is too easy to ignore. |
| Q8 | Polling interval — keep 5 min, or change to 1 min / 2 min / 10 min? | **Keep 5 min.** Explicitly out of scope in PRD; telemetry will tell us if it needs changing later. |
| Q9 | CI gate behavior on merge commits from `chore(release):` bumps themselves — should the gate skip commits whose only changes are `package.json` + `CHANGELOG.json`? | **Yes, skip release-only commits.** Gate ignores commits whose only changes are `package.json` + `CHANGELOG.json` (+ `version.json`). Avoids circular bump requirement. |
| Q10 | What happens if a user is on version N and version N+1 is deployed, then rolled back to N before they see the update prompt? Do we need a "downgrade" signal? | **Treat any mismatch as "update available."** Comparison should be `!==` (commit hash) rather than `<`. Cheap and correct. |

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

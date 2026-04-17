# PRD — Live Update System (Fix Once and For All)

- **Date:** 2026-04-17
- **Worktree / branch:** `worktree-live-update`
- **Baseline version:** 0.16.5
- **Owner:** TGroup frontend
- **Status:** Draft — awaiting approval

---

## 1. Problem

The app has a "Update Now" button (`VersionDisplay` → `useVersionCheck.applyUpdate()`) that is supposed to force every user onto the latest deployed bundle. In practice users still report seeing stale code after clicking it, and the release-notes pipeline is entirely manual — a dev can ship a frontend change without bumping the version or writing a CHANGELOG entry, which silently disables the update path for that deploy.

**Core asks from the user:**

1. The button, when clicked, must bust the browser cache **100%** of the time.
2. Every frontend deploy must flow through this button — no silent updates, no stale clients.
3. Every version bump must ship with a CHANGELOG entry. No exceptions.
4. One source of truth, enforced by tooling, not convention.

---

## 2. Goals / Non-Goals

### Goals

- G1. Clicking "Update Now" guarantees the next page load is served fresh from origin (HTML, assets, version.json, CHANGELOG.json).
- G2. A non-dismissible modal appears when the deployed version mismatches the running version. Dev can choose `severity: "critical"` to block use until updated.
- G3. `git push` → CI → Docker build → nginx serve pipeline cannot produce a production build whose `package.json` version or `CHANGELOG.json` top entry has not moved since the previous `main` commit touching `website/`.
- G4. Telemetry proves the button actually worked: we log version-before/version-after on the next session start.
- G5. Clear contract between build and runtime: `version.json` is the one source of truth; `index.html`, hashed assets, and `CHANGELOG.json` must all be coherent with it.

### Non-Goals

- Adding a Service Worker / PWA shell. The repo has no SW today; we keep it that way and rely on HTTP cache-control only.
- Turning the "Update Now" flow into a background auto-update. The user explicitly wants it user-triggered (with a critical-severity override).
- Migrating off nginx or docker-compose.
- Fixing unrelated caching for API responses (that's a backend concern).

---

## 3. Current State — Gaps Found

Citations are to files in this worktree (`.claude/worktrees/live-update/`), mirrored from `main` at commit `c86054ea`.

| # | Gap | Evidence | Severity |
|---|-----|----------|----------|
| G-1 | `ReleaseNotesModal` fetches `/CHANGELOG.json` without a cache-busting query param or `cache: 'no-store'` | `website/src/components/shared/VersionDisplay.tsx:62` | HIGH |
| G-2 | `CHANGELOG.json` has no explicit nginx `Cache-Control` — browser/intermediate defaults apply | `nginx.conf:~34–46` (only `index.html` and `version.json` are covered) | HIGH |
| G-3 | `applyUpdate()` calls deprecated `window.location.reload(true)`; the boolean is silently ignored in Chrome/Firefox/Safari | `website/src/hooks/useVersionCheck.ts:539` | MEDIUM |
| G-4 | `HEAD` request with `no-store` headers before reload is a no-op for HTML document cache | `website/src/hooks/useVersionCheck.ts:518–527` | MEDIUM |
| G-5 | `clearAllCaches()` fires `unregister()` + `caches.delete()` in parallel but doesn't `await` them before reload; fallback `location.href` path (line 541) can fire before they settle | `website/src/hooks/useVersionCheck.ts:246–264, 536–542` | MEDIUM |
| G-6 | `index.html` carries `<meta http-equiv="Cache-Control">`; browsers ignore this when an HTTP header is present, and it creates false confidence | `website/index.html:7–9` | LOW |
| G-7 | Version + CHANGELOG bumps are manual and un-enforced — a developer can merge a `feat:` or `fix:` PR touching `website/` without updating either | `CLAUDE.md` (explicit "MANDATORY" but no gate), `.github/workflows/ci.yml` (no release gate) | HIGH |
| G-8 | No release tag is created; `chore(release): X.Y.Z` commits exist but no `vX.Y.Z` git tag | last 10 commits in `git log` | LOW |
| G-9 | No telemetry — we cannot tell from logs whether the "Update Now" button actually moved a user from old → new version | codebase-wide grep, no event emitted in `applyUpdate` | MEDIUM |
| G-10 | Polling is 5 min fixed; no server-driven invalidation. A breaking API change has up to 5 min of stale-client exposure | `useVersionCheck.ts:284` | LOW |

---

## 4. Proposed Design

Three surfaces: **Runtime (button + hook)**, **Delivery (nginx + build)**, **Process (CI + tooling)**.

### 4.1 Runtime changes — make the button bulletproof

Rewrite `applyUpdate()` so the sequence is:

1. Persist `returnPath` in `sessionStorage`.
2. `await Promise.allSettled([...sw.unregister(), ...caches.delete()])` — actually wait.
3. Emit a `version_update_initiated` telemetry event with `{ from, to, trigger: 'button' | 'critical_modal', timestamp }`.
4. Build the new URL: same path, query string gets `?_v=<serverCommitHash>` (not `Date.now()` — using the target commit makes it debuggable).
5. `window.location.replace(newUrl)` — does not add a history entry and bypasses bfcache.
6. Drop the deprecated `reload(true)` and the HEAD preflight entirely.

Also:
- Fix `ReleaseNotesModal` fetch: `fetch('/CHANGELOG.json?v=' + latestCommit, { cache: 'no-store' })`.
- Remove `<meta http-equiv="Cache-Control">` from `index.html` — rely on server headers only.
- On app boot, if `JUST_UPDATED_KEY` is set and the running version matches `TARGET_VERSION_KEY`, emit `version_update_succeeded` telemetry and clear the keys. If mismatch, emit `version_update_failed` with the actual vs expected versions.

### 4.2 Critical-severity modal

`CHANGELOG.json` entries gain an optional field:

```json
{ "version": "1.2.0", "severity": "critical", "forceUpdate": true, ... }
```

When `useVersionCheck` sees a newer version with `severity === 'critical'`, it shows a non-dismissible full-screen modal with a 10-second countdown, then auto-triggers `applyUpdate()`. This is the enforcement lever: breaking changes ship with `severity: critical` and no user can stay on the old client.

### 4.3 Delivery — close the cache holes

`nginx.conf` additions:

```nginx
location = /CHANGELOG.json {
  add_header Cache-Control "no-store, no-cache, must-revalidate" always;
  add_header Pragma "no-cache" always;
  expires -1;
}
# And confirm the existing /version.json + / (index.html) blocks are identical.
```

Switch `index.html` from `no-store` → `no-cache`. `no-cache` still forces revalidation but allows a cheap 304 via ETag, saving ~30ms per page load. Hashed `/assets/*` stay `public, max-age=31536000, immutable`.

### 4.4 Process — enforce bump + CHANGELOG on every frontend change

Three layers, each catches what the previous one misses:

1. **Pre-commit hook** (Husky) — if any file under `website/src/` or `website/public/` (excluding CHANGELOG/version files) is staged, require `website/package.json` version to differ from `origin/main` AND require `website/public/CHANGELOG.json` to be staged with a new top entry matching the new version. Exits non-zero with a clear message otherwise.
2. **CI gate** (`.github/workflows/pr-checks.yml`) — same check, re-run server-side so a dev can't `--no-verify` their way out. Runs on PRs targeting `ai-develop` and `main`.
3. **Post-merge tagger** (`.github/workflows/release-tag.yml`) — on merge to `main`, if the merge commit bumps `package.json` version, automatically create a `v<version>` git tag and push it. No human action required.

A helper script `scripts/bump-version.mjs` turns this into a one-liner for devs:

```
node scripts/bump-version.mjs patch "Fix calendar filter persistence"
# - bumps package.json (patch/minor/major or explicit x.y.z)
# - prepends a stub CHANGELOG.json entry with today's date + current git HEAD
# - stages both files
```

### 4.5 Telemetry

Add a tiny endpoint `POST /api/telemetry/version` on the backend (separate micro-ticket, but specced here). Client posts `{ event, from, to, trigger, timestamp, userAgent }`. Events: `version_update_initiated`, `version_update_succeeded`, `version_update_failed`, `version_update_dismissed`. Store in a `version_events` table. Dashboard query: "what % of users on an old version clicked Update Now in the last 24h, and of those, what % actually landed on the new version?"

### 4.6 Rollout

Ship in three ordered phases so a bug in one doesn't brick the next:

- **Phase 1 — Runtime + Delivery (0.17.0):** the button fixes + nginx CHANGELOG header. Backwards compatible with the current version file format.
- **Phase 2 — Enforcement (0.17.1):** pre-commit hook, CI gate, auto-tag. Merged once Phase 1 has been running in production for at least 48h.
- **Phase 3 — Telemetry (0.18.0):** backend endpoint + dashboard. Needs a DB migration, so it goes in its own release.

Each phase gets its own CHANGELOG entry and version bump, which is itself a dogfood test of the enforcement.

---

## 5. Success Criteria

- S1. Manual test: deploy v(N), open in Safari + Chrome + Firefox, then deploy v(N+1) with `severity: "critical"`. Within 5 minutes + 10s countdown, all three browsers are running v(N+1) without any manual reload. Repeat with private-browsing windows and with a simulated slow 3G connection.
- S2. Manual test: in a fresh browser profile, deploy v(N), then deploy v(N+1) (non-critical). The "Update Available" card appears within 5 min; clicking it leads to v(N+1) on the next paint. No "hard refresh" ever required.
- S3. CI test: open a PR that touches `website/src/pages/Overview.tsx` without bumping `package.json`. PR check fails with message naming `scripts/bump-version.mjs`.
- S4. CI test: open a PR that bumps `package.json` but forgets to update `CHANGELOG.json`. PR check fails.
- S5. Observability: dashboard shows ≥95% `version_update_succeeded` rate over a 7-day window for non-critical updates, ≥99% for critical updates.
- S6. No regression: Lighthouse "best practices" score on the homepage does not drop; page load time does not increase by more than 30ms (ETag revalidation overhead).

---

## 6. Risks & Mitigations

- **R1. `location.replace` + query string does not evict a doc cached by an intermediate proxy.** Mitigation: nginx already sends `no-cache` for `/` and `/index.html`; verify in prod with `curl -I`.
- **R2. Pre-commit hook annoys the team.** Mitigation: `bump-version.mjs` is a single command; CI gate is the real enforcement, hook is convenience.
- **R3. Critical modal abuse — devs mark trivial changes critical, users get modal fatigue.** Mitigation: CHANGELOG schema lint rejects `severity: critical` without an accompanying `reason` field; code review guideline documented in CLAUDE.md.
- **R4. Telemetry endpoint becomes a DoS vector.** Mitigation: rate-limit to 10 events per IP per minute; accept fire-and-forget (client doesn't block reload on a failed post).
- **R5. nginx config drift between `nginx.conf` in repo and whatever is actually running on VPS.** Mitigation: Phase 1 ships a smoke test — CI curls the staging URL and asserts response headers. Production deploy gated on staging pass.

---

## 7. Open Questions — RESOLVED (2026-04-17)

All PRD open questions have been answered. Full decision log with rationale in companion file [`2026-04-17-live-update-open-questions.md`](./2026-04-17-live-update-open-questions.md). Summary:

- **Q1 localStorage on update** → **Wipe only on critical.** Non-critical updates preserve state; `severity: "critical"` wipes everything.
- **Q2 Pre-commit hook location** → **Repo root** with path filter on `website/src/**` and `website/public/**`.
- **Q3 Telemetry endpoint** → **Reuse existing `tdental-api` route** (no new sub-router). New DB table `version_events` still lands.
- **Q4 `window.__TG_VERSION__`** → **Yes**, add it.

Additional decisions captured during review (from the tracker):

- **Q6 Critical countdown** → keep 10s.
- **Q7 Critical modal** → blocking (overlay + disabled inputs), not a banner.
- **Q8 Polling interval** → keep 5 min; revisit via telemetry.
- **Q9 CI gate on release commits** → skip commits whose only changes are `package.json` + `CHANGELOG.json` + `version.json`.
- **Q10 Downgrade / rollback** → compare commit hash with `!==` (any mismatch triggers "update available"), not `<`.

---

## 8. Out of Scope (explicitly)

- Introducing Vite PWA / Workbox.
- Changing the polling interval below 5 minutes.
- Auto-deploy on `main` merge (currently manual SSH + `docker-compose pull`; keep manual until Phase 3 lands).
- Migrating `CHANGELOG.json` to `CHANGELOG.md` + conventional-changelog tooling. Later.

---

## 9. Release-Notes Entry For This PRD Itself

Per user mandate ("every bump gotta note the change"), this PRD being merged is itself a bump-worthy change:

- Version: `0.17.0-rc1`
- Date: 2026-04-17
- Highlights: "Worktree `live-update` initiated. PRD drafted to fix the update button + enforce release notes end-to-end. No runtime behavior changes yet."
- Section: "Docs" → "Add `docs/superpowers/specs/2026-04-17-live-update-prd.md`"

The bump + CHANGELOG entry will land in the same commit as this PRD file, once approved.

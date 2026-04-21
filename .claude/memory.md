# Shared Session Memory — Tgroup (Claude-Mem Bridge)

> Auto-generated from claude-mem DB (`~/.claude-mem/claude-mem.db`)  
> Last sync: 2026-04-20 19:34:45  
> Project: Tgroup | Sessions tracked: 148

---

## 🔥 Recent Observations

> *Previous observations were truncated during auto-sync and have been removed to save tokens. Run `./scripts/sync-claude-mem.sh` to regenerate from the claude-mem DB if needed.*


---

## 📋 Recent Session Summaries

### Docs refactor committed
- **Request:** Commit and deploy CLAUDE.md documentation refactoring with modular context files
- **Completed:** Committed as `0df54bf5` (9 files, +423/−405). Documentation now consists of 116-line `CLAUDE.md` index plus 8 modular context files.
- **Next steps:** Audit dirty worktrees and create checkpoint wip: commits.

### Docs refactor staged
- **Request:** Split CLAUDE.md into modular context files and clean up unused language rules
- **Completed:** Refactored from 498 lines to 116 lines (77% reduction).
- **Next steps:** User review pending.

### Hook optimization
- **Request:** Investigate and optimize Claude hook configuration (21 tools loading)
- **Completed:** Final config: 18 total hooks. Created `~/.claude/rules/llm-provider-config.md` and `~/.claude/rules/macos-platform.md`.
- **Next steps:** User decision on removing 5 dead superset-notify hooks and consolidating GSD workflow guards.


---

## 🔌 Local Development Ports (Standardized)

> **Last unified:** 2026-04-21 — All configs now use **5175** for the Vite dev server.

| Service | Port | Config Source |
|---------|------|---------------|
| **Frontend (Vite dev)** | **`5175`** | `website/vite.config.ts` (strictPort), `scripts/dev-e2e.sh` |
| **API (Express/Node)** | **`3002`** | `api/.env` (`PORT=3002`) |
| **PostgreSQL (Docker)** | **`55433`** | `docker-compose.yml` (host→container `5432`) |
| **CompreFace** | **`8000`** | `docker-compose.yml` |
| **Nginx (Docker web)** | **`5175`** | `docker-compose.yml` (production) |

### Quick Access
- App: `http://localhost:5175`
- API: `http://localhost:3002/api`
- DB (Docker): `postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo`
- DB (Homebrew): `postgresql://postgres:postgres@127.0.0.1:5433/tdental_demo`

### Files that were fixed (5174 → 5175)
- `scripts/dev-e2e.sh`
- `website/playwright.config.ts`
- `website/playwright.smoke.config.ts`
- `website/e2e-full-both.config.ts`
- `website/e2e/*.spec.ts` (bulk migration of all E2E tests)
- `website/src/__tests__/useVersionCheck.test.ts`

**Note:** `api/src/server.js` CORS `ALLOWED_ORIGINS` includes `https://nk.2checkin.com`, `https://www.nk.2checkin.com`, `localhost:5175`, and `76.13.16.68:5175`. The `DEV_ORIGIN` regex still allows any `localhost:517x` for local flexibility. **Production domain is `nk.2checkin.com`.**

---

> 💡 Tip: Run `./scripts/sync-claude-mem.sh` to refresh this file from the latest claude-mem data.

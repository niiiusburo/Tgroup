# TGroup — TG Clinic Dashboard

## Shared Session Memory (READ FIRST)

At the start of EVERY session, read `.claude/memory.md` for the latest shared context synced from claude-mem. This file contains recent work, deployment status, and architecture notes that bridge Claude IDE and this agent session.

## Release Notes (MANDATORY)

Every time you bump the version or deploy a new build, you MUST update `website/public/CHANGELOG.json`:

1. Add a new entry at the TOP of the JSON array with:
   - `version`: the new semver version
   - `date`: today's date (YYYY-MM-DD)
   - `commit`: the git commit hash
   - `highlights`: one-line summary
   - `sections`: array of `{ title, items[] }` — use titles like "New Features", "Bug Fixes", "Removed", "Testing"
2. Bump the version in `website/package.json`
3. The VersionDisplay component (dev only) shows a "Release Notes" link in the tooltip that opens a modal reading from `/CHANGELOG.json`

## Admin Login Credentials

**For Playwright E2E tests and browser testing, always use:**
- Email: `tg@clinic.vn`
- Password: `123456`

Do NOT use old admin emails or any other email. This is the only admin account.

## Obsidian Brain

At session start, read project context from local Obsidian vault:
- `./notes/📋\ TGroup\ Project\ Overview.md` — Architecture, pages, tech stack
- `./notes/🏗️\ Architecture.md` — Detailed component architecture
- `./notes/📊\ Features\ Status.md` — All features tracker
- `./notes/🚀\ Deployment\ Guide.md` — VPS deploy workflow, Docker setup
- `./notes/💾\ Database\ Schema.md` — Database tables and relationships
- `./notes/🗓️\ YYYY-MM-DD.md` — Daily session notes

## Environment Config

Vite loads env files by priority: `.env.{mode}.local` > `.env.{mode}` > `.env.local` > `.env`

| File | Purpose | Committed? |
|------|---------|-----------|
| `website/.env` | Shared keys (Google API key) | Yes |
| `website/.env.development` | Local dev: `VITE_API_URL=http://localhost:3002/api` | Yes |
| `website/.env.production` | VPS build: `VITE_API_URL=/api` (nginx proxies) | Yes |
| `website/.env.local` | Personal overrides (gitignored) | No |

**Rule:** Never hardcode IPs in committed env files. VPS IP is set via `docker-compose.yml` build arg `VITE_API_URL`.

## Dev Server

```bash
cd website && npx vite --port 5174
# Open http://localhost:5174
# Uses .env.development → API at localhost:3002
```

## Backend API

The Node/Express API lives at `api/src/server.js` and reads `api/.env` (points to Homebrew Postgres on port 5433). See `.claude/CONTEXT/database.md` for details on the two Postgres instances and `.claude/CONTEXT/reference-sites.md` for the endpoint table.

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/api && node src/server.js
# Runs on http://localhost:3002
```

There is also a dockerized copy (container `tgroup-api`, also on port 3002) reading from Docker Postgres `tgroup-db` on 55433. Only one of {local node, docker tgroup-api} can bind 3002 at a time.

## Database

Connection URL: `postgresql://postgres:postgres@127.0.0.1:5433/tdental_demo` (Homebrew native — what local API uses).

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo
```

> ⚠️ Second Postgres on port **55433** is a Docker container used by docker-compose — NOT the same data. See `.claude/CONTEXT/database.md` for full details, demo data tables, doctor roster, and restore commands.

## GitHub

- **Repo:** `niiiusburo/Tgroup`
- **Branch:** `ai-develop`
- **Push:** `git push origin ai-develop`

## VPS Access

```
ssh root@76.13.16.68
# Password stored in 1Password / local secrets — do NOT commit to this file
```

**Backend Location:** `/root/tdental-api/`
**Start Command:** `cd /root/tdental-api && pm2 start src/server.js --name tdental-api`

## Key Architecture Decisions

1. **Global LocationFilter** — `contexts/LocationContext.tsx` syncs "All Locations" dropdown across 7 pages (Overview, Customers, Calendar, Appointments, Employees, Services, Payment)
2. **@crossref comments** — Every component has `@crossref:used-in[...]` and `@crossref:uses[...]` comments tracking where it's used across the codebase
3. **tgclinic-api backend** — Express server queries demo DB with `search_path=dbo`
4. **SQL views for missing tables** — 11 views created so the API routes work against the 3-table demo DB
5. **Auto-Update Version System** — App detects new deployments and prompts users to refresh (see `.claude/CONTEXT/version-system.md`)
6. **20 features** split across 5 categories: setup, dashboard, customers, services, admin

## Extended Context

Load on demand — these are NOT auto-loaded:

- `.claude/CONTEXT/project-map.md` — full `Tgroup/` directory tree
- `.claude/CONTEXT/database.md` — two Postgres instances, demo data, 19-doctor roster, locations, migrations, restore commands
- `.claude/CONTEXT/version-system.md` — version bump mandate, build process, auto-update flow
- `.claude/CONTEXT/layout-lock.md` — `⚠️ LAYOUT LOCK` convention and agent rules
- `.claude/CONTEXT/modular-card-scrolling.md` — independent card scrolling pattern + TODO list of forms to migrate
- `.claude/CONTEXT/feature-status.md` — what's wired to the real DB vs still mock
- `.claude/CONTEXT/mcp-code-review-graph.md` — when to use graph MCP tools before Grep/Glob/Read
- `.claude/CONTEXT/reference-sites.md` — legacy/local/VPS URLs and full API endpoint table

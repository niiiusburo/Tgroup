# 01 — Repository Map

**Baseline:** `22d691535` · website `0.32.59` · api `1.2.2`  
**Source:** R1 §2 + spot checks on this worktree.

---

## 1. Packages and apps

| Package | Path | Runtime? | Entry | Version |
|---|---|---|---|---|
| Website | `website/` | Yes | `src/main.tsx` → `App.tsx` | 0.32.59 |
| API | `api/` | Yes | `src/server.js` | 1.2.2 |
| Contracts | `contracts/` | Build-time / shared Zod | `index.ts` → dist | — |
| Face service | `face-service/` | Optional | `main.py` FastAPI | — |
| Hermes | `hermes/` | Ops observer | `hermes.py` + flows | — |
| Product-map | `product-map/` | Governance (not runtime) | domains/contracts | — |
| Docs | `docs/` | Governance | ADRs, invariants, runbooks | — |
| Blueprint / frontend-truth | `blueprint/`, `frontend-truth/` | Non-runtime artifacts | — | — |
| Scripts | `scripts/` | Ops CLI | deploy, e2e, imports, repairs | — |

---

## 2. Top-level layout

```text
tgroup/
├── website/                 # React 18 + Vite 5 + TS
├── api/                     # Express 5 CommonJS + PostgreSQL
├── contracts/               # @tgroup/contracts Zod
├── product-map/             # domain/schema/permission authority
├── docs/                    # ADRs, invariants, runbooks, this audit package
├── scripts/                 # deploy, e2e, governance, imports
├── face-service/            # local embeddings (YuNet+SFace)
├── hermes/                  # external site observer
├── blueprint/ frontend-truth/
├── notes/ reports/ testsprite_tests/
├── docker-compose.yml
├── nginx.conf / nginx.docker.conf
├── Dockerfile.api / Dockerfile.web
└── AGENTS.md ARCHITECTURE.md DESIGN.md BEHAVIOR.md DECISIONS.md
```

---

## 3. Runtime topology

```text
Browser → Nginx → static web build
                → /api → Express API :3002 → PostgreSQL 16 (dbo / tdental_demo)
                                      -.-> face-service / CompreFace (optional)
                                      -.-> Hosoonline (optional)
                                      -.-> Lark webhook (optional)
Hermes (ops) → live site + Telegram (credential fields present in tracked map)
```

**Local ports** (`docs/runbooks/PORTS.md`): website `5175`, API `3002`, face host `8001`, CompreFace host `8002`, Postgres compose `127.0.0.1:55433→5432`.

**Production surface (docs):** `https://nk.2checkin.com` (+ NK2/NK3 siblings in deploy preflight).

---

## 4. Layer direction (ARCHITECTURE.md)

```text
L5 Pages/routes → L4 Domain UI/handlers → L3 hooks/middleware/services
→ L2 API clients/db → L1 contracts/types/product-map → L0 runtime/libs
```

Rule: FE components must not `fetch` directly; use `website/src/lib/api/*`.

---

## 5. Data access (baseline truth)

| Claim | Baseline reality |
|---|---|
| Single dental DB pool | **Confirmed** — `api/src/db.js` single `Pool`, `search_path=dbo` |
| Dual-DB LOB (`getDb`, cosmetic pool) | **Absent** — no `api/src/db/index.js`, no `requireLobScope` |
| Migration 047 LOB | **Absent** from `api/migrations/` |
| Partners SMI | **Confirmed** — customers + employees share `dbo.partners` |

---

## 6. Docker services

| Service | Role |
|---|---|
| `db` | postgres:16-alpine |
| `api` | Dockerfile.api |
| `web` | static frontend |
| `face-service` | local embeddings |
| `compreface-*` | optional face provider |

---

## 7. Infra / CI surfaces

| Surface | Path | Notes |
|---|---|---|
| Deploy | `scripts/deploy-tbot.sh`, `deploy-build-args.sh`, `deploy-preflight.js` | Preflight INV-022 local discipline |
| Nginx | `nginx.conf`, `nginx.docker.conf` | **No** export 300s timeouts on baseline (AUD nginx finding) |
| CI | `.github/workflows/ci.yml`, `pr-checks.yml` | FE-heavy; api full suite not blocking |
| Husky | `.husky/pre-commit` | docs + website version |

---

## 8. Generated / non-source boundaries

- `contracts/dist/`, `website/dist/`, `node_modules/`
- `.env` (names in `.env.example` only)
- Playwright reports, local `reports/` dumps
- Uploads under feedback static path

---

## 9. External systems

| System | Direction | Optional? |
|---|---|---|
| PostgreSQL | API ↔ DB | Required |
| Google Places | API → Google | Optional key |
| Hosoonline | API → third party | Optional |
| Face-service / CompreFace | API → local/docker | Optional product-wise; health may 503 |
| Lark | API → webhook | Optional |
| Hermes → live site / Telegram | Ops outbound | Ops tool; tracked secrets lead |

---

## 10. What is **not** on this baseline

- Cosmetic LOB dual-DB runtime, CTV portal pages, earnings/commissionEngine (D13)
- Mounted legacy `account.js` / `session.js` / `services.js` (files exist, unmounted)
- Dedicated `/investor/*` portal (same-portal investor model only)

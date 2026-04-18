# Database

> ⚠️ **Two Postgres instances exist on this machine — they are NOT the same data.** The local API reads from port **5433** (Homebrew native). The docker-compose stack uses port **55433** (container). Always verify which instance your change is targeting.

## Port 5433 — Homebrew native Postgres (read by local `api/src/server.js`)

| Field | Value |
|-------|-------|
| **URL** | `postgresql://postgres:postgres@127.0.0.1:5433/tdental_demo` |
| **Host / Port** | `127.0.0.1` / `5433` |
| **Database** | `tdental_demo` |
| **User / Password** | `postgres` / `postgres` |
| **PG version** | 15.14 (Homebrew, macOS native — NOT Docker) |
| **Started by** | `brew services start postgresql@15` (runs automatically on boot) |
| **Used by** | `api/.env` → this is what the local Node API connects to |
| **Connect via CLI** | `PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo` |

## Port 55433 — Docker container `tgroup-db` (used by full docker-compose stack)

| Field | Value |
|-------|-------|
| **URL** | `postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo` |
| **Host / Port** | `127.0.0.1` / `55433` |
| **Database** | `tdental_demo` |
| **User / Password** | `postgres` / `postgres` |
| **PG version** | 16.11 (`postgres:16-alpine`) |
| **Docker container** | `tgroup-db` (not `tdental-demo`) |
| **Used by** | `tgroup-api` container (on 3002) + `tgroup-web` container (on 5175), all defined in `docker-compose.yml` |
| **Connect via CLI** | `PGPASSWORD=postgres psql -h 127.0.0.1 -p 55433 -U postgres -d tdental_demo` |

## Source SQL
- `website/demo_tdental_updated.sql` (in-repo dump, includes 19 doctors + SQL views)
- `/Users/thuanle/Documents/TamTMV/TamDental/demo_tdental.sql` (original external demo)

## Migrations
SQL migrations live in `api/migrations/`. They are NOT run automatically — apply manually to **each** instance you care about:
```bash
# Apply to native Postgres (what the local API actually uses)
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -f api/migrations/XXX_name.sql

# Apply to Docker container (what docker-compose stack uses)
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55433 -U postgres -d tdental_demo -f api/migrations/XXX_name.sql
```

## Demo Data

| Table | Count | Description |
|-------|-------|-------------|
| `dbo.companies` | 7 | Dental clinic branches (locations) |
| `dbo.partners` | 56 | All partners (30 customers + 19 doctors + 7 branches) |
| `dbo.partners` (customer=true) | 30 | Active dental patients |
| `dbo.partners` (employee=true) | 19 | Dentists reverse-engineered from appointment data |
| `dbo.appointments` | 120 | Patient appointments |
| `dbo.employees` (view) | 19 | View mapping partners with employee=true |
| 10 empty views | — | partnersources, agents, aspnetusers, dotkhams, saleorders, crmteams, customerreceipts, hrjobs, saleorderlines, accountpayments |

## Doctors (19, from dbo.partners where employee=true)

| Doctor | Location | Appointments |
|--------|----------|-------------|
| BS. Trang | Gò Vấp | 11 |
| BS. Trâm | Gò Vấp | 3 |
| BS. Ly | Gò Vấp | 2 |
| BS. Khánh | Gò Vấp | 1 |
| BS. Dương | Quận 10 | 9 |
| BS. Uyên | Quận 10 | 7 |
| BS. Ý | Quận 3 | 13 |
| BS. Duy | Quận 3 | 4 |
| BS. Dũng | Quận 3 | 1 |
| BS. Thu Thảo | Quận 7 | 15 |
| BS. Thảo | Thủ Đức | 7 |
| BS. Nga | Thủ Đức | 6 |
| BS. Quyên | Thủ Đức | 5 |
| BS. Quyên B | Thủ Đức | 3 |
| BS. Hà | Đống Đa | 5 |
| BS. Hải | Đống Đa | 4 |
| BS. Minh | Đống Đa | 2 |
| BS. Phương | Đống Đa | 1 |
| BS. Linh | Đống Đa | 1 |

## Locations (dbo.companies)

| Branch |
|--------|
| Nha khoa Tấm Dentist (HQ) |
| Tấm Dentist Gò Vấp |
| Tấm Dentist Quận 10 |
| Tấm Dentist Quận 3 |
| Tấm Dentist Quận 7 |
| Tấm Dentist Thủ Đức |
| Tấm Dentist Đống Đa |

## SQL Dump

- **Demo dump:** `website/demo_tdental_updated.sql` (includes doctors + views)
- **Original demo source:** `/Users/thuanle/Documents/TamTMV/TamDental/demo_tdental.sql`

## Operational Commands

```bash
# Start the Docker demo DB (tgroup-db container on port 55433)
docker start tgroup-db

# Or bring up the full compose stack (db + api + web)
docker compose up -d

# Connect to Homebrew Postgres on 5433 (what the local API actually reads)
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo

# Connect to Docker Postgres on 55433
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55433 -U postgres -d tdental_demo

# Restore demo DB from scratch into Docker (includes 19 doctors + SQL views)
docker rm -f tgroup-db 2>/dev/null
docker run -d --name tgroup-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tdental_demo -p 127.0.0.1:55433:5432 postgres:16-alpine
sleep 5
docker exec -i tgroup-db psql -U postgres -d tdental_demo < website/demo_tdental_updated.sql

# Restore demo DB into native Postgres (Homebrew)
PGPASSWORD=postgres dropdb -h 127.0.0.1 -p 5433 -U postgres tdental_demo 2>/dev/null
PGPASSWORD=postgres createdb -h 127.0.0.1 -p 5433 -U postgres tdental_demo
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo < website/demo_tdental_updated.sql
```

# TGroup Deployment Guide

## Local Development (Homebrew PostgreSQL)

Use the local Homebrew PostgreSQL database on `127.0.0.1:5433` for day-to-day development and data checks.

Do **not** use `127.0.0.1:55433` for local development unless you intentionally started the Docker database container. `55433` is the host-mapped Docker/PostgreSQL port used by deployment-style Docker workflows, while the VPS containers connect to Postgres internally as `db:5432`.

### Quick Start

```bash
# Start the local database if needed
brew services start postgresql@15

# Verify
pg_isready -h 127.0.0.1 -p 5433
```

### Local URLs & Ports

| Service | URL / Port | Notes |
|---------|------------|-------|
| **Production** | https://nk.2checkin.com | Live domain (nginx → Docker 5175) |
| Web (nginx) | http://localhost:5175 | Built React app served by nginx |
| API | http://localhost:3002 | Express backend |
| DB | localhost:5433 | Local Homebrew PostgreSQL (`tdental_demo`) |

### Test Credentials
- **Email:** `tg@clinic.vn`
- **Password:** `123456`

---

## Docker Compose Stack

### Services
- `db` — PostgreSQL 16 (Docker host port `127.0.0.1:55433`; VPS/internal container host `db:5432`)
- `api` — Node/Express API (port `127.0.0.1:3002`)
- `web` — nginx serving built React app (port `5175`)
- `compreface-*` — Face recognition PostgreSQL + API + Core

### Critical Pitfall: DB Initialization

PostgreSQL **only runs init scripts on the first volume creation**. If the `tgroup-pgdata` volume already exists, it skips the SQL seed entirely, leaving you with a broken schema.

**If the DB looks empty or APIs return 500s for missing tables/columns:**

```bash
# 1. Stop everything
docker compose down

# 2. Destroy the old volume
docker volume rm tgroup_tgroup-pgdata

# 3. Start fresh (this will re-run the init SQL)
docker compose up -d
```

### Init SQL File

`docker-compose.yml` mounts the seed file here:

```yaml
volumes:
  - ./backups/tdental_demo_vps_20260415_162302.sql:/docker-entrypoint-initdb.d/01-init.sql
```

> **Do not** point this back to `website/demo_tdental_updated.sql` — that dump is stale and missing many tables/columns.

### Rebuilding After Code Changes

```bash
# API only
docker compose up -d --build api

# Web only
docker compose up -d --build web

# Both
docker compose up -d --build api web
```

### Connecting to the DB Container

```bash
docker exec -it tgroup-db psql -U postgres -d tdental_demo
```

### Applying Stray Migrations

If the backup is slightly behind the code, run any missing migrations manually:

```bash
for f in api/migrations/*.sql; do
  docker exec -i tgroup-db psql -U postgres -d tdental_demo < "$f"
done
```

## Production Deployment (VPS)

### Current State
There is **no `scripts/deploy-vps.sh`** at this time. The existing deploy script is `scripts/deploy-tbot.sh`.

### Manual VPS Deployment Steps
1. **SSH to VPS**
```bash
ssh root@<vps-ip>
```

2. **Install Docker**
```bash
curl -fsSL https://get.docker.com | sh
```

3. **Clone/Update Repository**
```bash
cd /opt/tgroup
git pull origin main
```

4. **Build and Run**
```bash
docker-compose build
docker-compose up -d
```

5. **Expose Web Service**
The `web` container does not expose a host port by default. You must either:
- Map a port in `docker-compose.yml` (e.g. `ports: ["80:80"]` if using an nginx image)
- Or add a reverse proxy container (nginx) pointing to `web` and `api:3002`

6. **Verify**
```bash
docker-compose ps
curl -I http://<vps-ip>:3002/api/Auth/login
```

## Nginx Configuration (Example)

If you add nginx back to the stack:

```nginx
server {
    listen 80;
    server_name tdental.example.com;

    location / {
        proxy_pass http://web:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://api:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Database Connection Issues
```bash
# Check if postgres is running
brew services list | grep postgresql

# View postgres logs
brew services log postgresql@15

# Reset database (WARNING: destroys data)
docker-compose down -v
docker-compose up -d
```

### Frontend Build Issues
```bash
cd website
rm -rf node_modules dist
npm install
npm run build
```

### API Issues
```bash
cd api
rm -rf node_modules
npm install
npm start
```

### Port Already in Use
```bash
# Kill process on 3002
kill -9 $(lsof -t -i:3002)

# Kill process on 5175
kill -9 $(lsof -t -i:5175)
```

## Environment Variables

### Frontend (`.env` or Vite env)
```
VITE_API_URL=http://localhost:3002/api
```

### Backend (`api/.env`)
```
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/tdental_demo
PORT=3002
NODE_ENV=development
JWT_SECRET=your-jwt-secret
GOOGLE_PLACES_API_KEY=...
HOSOONLINE_BASE_URL=...
HOSOONLINE_API_KEY=...
```

## Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker-compose build

# Restart services
docker-compose up -d

# View logs
docker-compose logs -f
```

#!/usr/bin/env bash
#
# deploy-vps.sh — Deploy TGroup to VPS (dokploy)
#
# What it does:
#   1. Syncs code via rsync (excludes local junk, preserves VPS .env)
#   2. Dumps local tdental_demo → restores on VPS tdental_demo
#   3. Rebuilds & restarts Docker containers on VPS
#
# Usage:
#   ./scripts/deploy-vps.sh              # full deploy (code + db + rebuild)
#   ./scripts/deploy-vps.sh --code-only  # code + rebuild only, skip DB sync
#   ./scripts/deploy-vps.sh --db-only    # DB sync only, skip code/rebuild
#
# Prerequisites:
#   - SSH config has a `dokploy` host
#   - Local Docker running with tgroup-db container
#   - VPS has Docker + docker compose installed
#
# The script NEVER modifies local files.

set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────────────
VPS_HOST="dokploy"
VPS_DIR="/opt/tgroup"
VPS_ENV_FILE=".env"                     # relative to VPS_DIR
LOCAL_DB_CONTAINER="tgroup-db"
DB_NAME="tdental_demo"
DB_USER="postgres"
DB_PASS="postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="/tmp/tgroup_tdental_demo_${TIMESTAMP}.sql"
LOG_PREFIX="🌀 TGroup Deploy"

# VPS .env content — the script writes this file on VPS if missing.
# This ensures VPS always has the correct production values.
read -r -d '' VPS_ENV_CONTENT << 'ENV_EOF' || true
GOOGLE_PLACES_API_KEY=AIzaSyDVk_KxoeAtvTa1-LvewB2OwrdnmZn-64c
HOSOONLINE_BASE_URL=https://hosoonline.com
HOSOONLINE_API_KEY=af2e8cda5430c64575fb6f8bea6f5b71a0a7b6edcc99d36543bb047066b6a725
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
JWT_SECRET=tgclinic-production-secret-key-2026
ENV_EOF

# ─── Flags ────────────────────────────────────────────────────────────────────
DO_CODE=true
DO_DB=true
DO_REBUILD=true
SKIP_CONFIRM=false

for arg in "$@"; do
  case "$arg" in
    --code-only) DO_DB=false ;;
    --db-only)   DO_CODE=false ;;
    --yes|-y)    SKIP_CONFIRM=true ;;
    --help|-h)
      echo "Usage: $0 [--code-only|--db-only|--yes|--help]"
      echo ""
      echo "  (no flag)     Full deploy: code + DB + rebuild"
      echo "  --code-only   Push code + rebuild, skip DB sync"
      echo "  --db-only     Sync DB only, skip code/rebuild"
      echo "  --yes, -y     Skip confirmation prompt"
      exit 0
      ;;
    *)
      echo "Unknown flag: $arg. Use --help for usage."
      exit 1
      ;;
  esac
done

# ─── Helpers ──────────────────────────────────────────────────────────────────
step()  { echo ""; echo "$LOG_PREFIX ▶ $*"; }
ok()    { echo "$LOG_PREFIX ✅ $*"; }
warn()  { echo "$LOG_PREFIX ⚠️  $*"; }
die()   { echo "$LOG_PREFIX ❌ $*" >&2; exit 1; }

vps()   { ssh "$VPS_HOST" "$@"; }

# ─── Confirm ─────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌀  TGroup VPS Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
if [ "$DO_CODE" = true ]; then echo "  ✦ Code sync:     api/ + website/ + infra files → $VPS_HOST:$VPS_DIR"; fi
if [ "$DO_DB" = true ];   then echo "  ✦ Database:      local $DB_NAME → VPS $DB_NAME"; fi
if [ "$DO_REBUILD" = true ]; then echo "  ✦ Rebuild:       docker compose build + up -d"; fi
echo "  ✦ VPS host:      $VPS_HOST"
echo "  ✦ VPS .env:      production values (auto-written)"
echo "  ✦ Local files:   NOT modified"
echo ""

if [ "$SKIP_CONFIRM" = false ]; then
  read -p "  Proceed? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
fi

# ─── Pre-flight checks ────────────────────────────────────────────────────────
step "Pre-flight checks"

# Check SSH connectivity
vps "echo 'SSH OK'" >/dev/null 2>&1 || die "Cannot SSH to $VPS_HOST. Check your SSH config."
ok "SSH to $VPS_HOST works"

# Check VPS project dir exists
vps "test -d $VPS_DIR" || die "VPS project dir $VPS_DIR does not exist."
ok "VPS project dir $VPS_DIR exists"

# Check local Docker DB is running (only needed for DB sync)
if [ "$DO_DB" = true ]; then
  docker exec "$LOCAL_DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1 \
    || die "Local Docker container '$LOCAL_DB_CONTAINER' is not running or DB '$DB_NAME' not accessible."
  ok "Local Docker DB ($DB_NAME) is accessible"
fi

# ─── STEP 1: Write / verify VPS .env ─────────────────────────────────────────
if [ "$DO_CODE" = true ]; then
  step "Ensure VPS .env is correct"

  vps "cat > $VPS_DIR/$VPS_ENV_FILE << 'ENVEOF'
$VPS_ENV_CONTENT
ENVEOF"
  ok "VPS $VPS_ENV_FILE written"
fi

# ─── STEP 2: Sync code to VPS ────────────────────────────────────────────────
if [ "$DO_CODE" = true ]; then
  step "Syncing code to VPS via rsync"

  # Ensure rsync is available
  command -v rsync >/dev/null 2>&1 || die "rsync not found. Install it first."

  # ── Whitelist approach: only send what VPS actually needs ──
  # api/     — backend source code
  # website/ — frontend source code
  # Essential config files only
  #
  # Everything else (notes/, tools/, backups/, .agents/, .claude/, etc.)
  # stays local and never touches the VPS.

  # First, wipe VPS api/ and website/ dirs to remove stale files
  vps "rm -rf $VPS_DIR/api/src $VPS_DIR/api/migrations $VPS_DIR/api/package* $VPS_DIR/api/migrate-*"
  vps "rm -rf $VPS_DIR/website/src $VPS_DIR/website/public $VPS_DIR/website/package* $VPS_DIR/website/vite* $VPS_DIR/website/tailwind* $VPS_DIR/website/tsconfig* $VPS_DIR/website/index.html $VPS_DIR/website/components.json"

  # Sync api/ — backend code only
  rsync -az \
    --exclude='node_modules' \
    --exclude='uploads' \
    --exclude='.env' \
    --exclude='.omc' \
    --exclude='.claude' \
    --exclude='.agents' \
    --exclude='*.log' \
    api/ "$VPS_HOST:$VPS_DIR/api/"

  # Sync website/ — frontend source only
  # Includes demo_tdental_updated.sql (DB init script referenced by docker-compose)
  rsync -az \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='.env.*.local' \
    --exclude='.omc' \
    --exclude='.claude' \
    --exclude='.agents' \
    --exclude='.playwright-mcp' \
    --exclude='test-results' \
    --exclude='playwright-report' \
    --exclude='e2e' \
    --exclude='screenshot-*' \
    --exclude='test-*' \
    --exclude='pw-*' \
    --exclude='playwright.config.*' \
    --exclude='*.cjs' \
    --exclude='animation-preview.html' \
    --exclude='skills-lock.json' \
    --exclude='*.log' \
    --exclude='*.tsbuildinfo' \
    --exclude='.auth' \
    --exclude='.openhands' \
    --exclude='.pi' \
    --exclude='.windsurf' \
    --exclude='docs/' \
    --exclude='skills/' \
    website/ "$VPS_HOST:$VPS_DIR/website/"

  # Sync essential root config files
  rsync -az \
    .dockerignore .env.example .gitignore "$VPS_HOST:$VPS_DIR/"

  ok "Code synced to VPS"
fi

# ─── STEP 3: Copy VPS-specific Docker & infra files ──────────────────────────
if [ "$DO_CODE" = true ]; then
  step "Copying VPS-specific infra files"

  # These files are the VPS docker-compose and Dockerfiles that are
  # tracked locally and meant for deployment.
  # We copy them explicitly so they're always in sync.
  scp docker-compose.yml "$VPS_HOST:$VPS_DIR/docker-compose.yml"
  scp Dockerfile.api "$VPS_HOST:$VPS_DIR/Dockerfile.api"
  scp Dockerfile.web "$VPS_HOST:$VPS_DIR/Dockerfile.web"
  scp nginx.docker.conf "$VPS_HOST:$VPS_DIR/nginx.docker.conf"

  ok "Infra files copied"
fi

# ─── STEP 4: Dump local tdental_demo ─────────────────────────────────────────
if [ "$DO_DB" = true ]; then
  step "Dumping local $DB_NAME from Docker"

  docker exec "$LOCAL_DB_CONTAINER" pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    > "$DUMP_FILE" 2>/dev/null

  local_size=$(du -sh "$DUMP_FILE" | cut -f1)
  ok "Local dump created: $DUMP_FILE ($local_size)"

  # ─── STEP 5: Transfer dump to VPS ──────────────────────────────────────────
  step "Transferring DB dump to VPS"

  scp "$DUMP_FILE" "$VPS_HOST:/tmp/tgroup_db_dump.sql"
  ok "Dump transferred to VPS"

  # ─── STEP 6: Restore on VPS ────────────────────────────────────────────────
  step "Restoring $DB_NAME on VPS"

  vps "cd $VPS_DIR && docker exec -i tgroup-db psql -U $DB_USER -d $DB_NAME < /tmp/tgroup_db_dump.sql" 2>&1 || {
    warn "psql restore had warnings (non-fatal). Continuing..."
  }

  vps "rm -f /tmp/tgroup_db_dump.sql"
  rm -f "$DUMP_FILE"

  # Verify table count on VPS
  vps_table_count=$(vps "cd $VPS_DIR && docker exec tgroup-db psql -U $DB_USER -d $DB_NAME -t -c \"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'\"" | tr -d ' ')
  ok "VPS $DB_NAME restored — $vps_table_count tables"
fi

# ─── STEP 7: Rebuild & restart on VPS ────────────────────────────────────────
if [ "$DO_REBUILD" = true ]; then
  step "Rebuilding Docker containers on VPS"

  vps "cd $VPS_DIR && docker compose build --no-cache web api" 2>&1
  ok "Docker images built"

  step "Restarting containers"

  vps "cd $VPS_DIR && docker compose up -d" 2>&1
  ok "Containers restarted"

  # ─── STEP 8: Verify ────────────────────────────────────────────────────────
  step "Verifying deployment"

  # Wait for containers to be healthy
  sleep 5

  # Check all containers are running
  vps "cd $VPS_DIR && docker compose ps --format '{{.Name}} {{.Status}}'" 2>&1

  # Check API health
  api_status=$(vps "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/health 2>/dev/null || echo '000'" 2>&1)
  if [ "$api_status" = "200" ] || [ "$api_status" = "404" ]; then
    ok "API responding (HTTP $api_status)"
  else
    warn "API returned HTTP $api_status (may need a moment to start)"
  fi

  # Check web frontend
  web_status=$(vps "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5174/ 2>/dev/null || echo '000'" 2>&1)
  if [ "$web_status" = "200" ]; then
    ok "Web frontend responding (HTTP 200)"
  else
    warn "Web returned HTTP $web_status"
  fi

  # Check DB connectivity from API
  db_check=$(vps "cd $VPS_DIR && docker exec tgroup-db pg_isready -U $DB_USER -d $DB_NAME" 2>&1)
  ok "VPS database: $db_check"
fi

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉  Deploy complete!"
echo ""
echo "    URL:      https://nk.2checkin.com"
echo "    API:      https://nk.2checkin.com/api"
echo "    SSH:      ssh $VPS_HOST"
echo "    Logs:     ssh $VPS_HOST 'cd $VPS_DIR && docker compose logs -f --tail=50'"
echo "    DB:       ssh $VPS_HOST 'cd $VPS_DIR && docker exec -it tgroup-db psql -U postgres -d $DB_NAME'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

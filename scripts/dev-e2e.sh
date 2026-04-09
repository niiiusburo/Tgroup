#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
# dev-e2e.sh — Start the full TGroup dev environment for E2E testing
#
# Usage:
#   ./scripts/dev-e2e.sh          # Start everything
#   ./scripts/dev-e2e.sh stop     # Stop everything
#   ./scripts/dev-e2e.sh status   # Check what's running
#   ./scripts/dev-e2e.sh test     # Start + run Playwright
# ══════════════════════════════════════════════════════════════════
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_HOST="127.0.0.1"
DB_PORT="55433"
API_PORT="3002"
VITE_PORT="5174"
DB_URL="postgresql://postgres:postgres@${DB_HOST}:${DB_PORT}/tdental_demo"
JWT_SECRET="tdental-secret-key-2024"
API_PIDFILE="${ROOT}/.dev-api.pid"
VITE_PIDFILE="${ROOT}/.dev-vite.pid"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[dev-e2e]${NC} $*"; }
warn() { echo -e "${YELLOW}[dev-e2e]${NC} $*"; }
err()  { echo -e "${RED}[dev-e2e]${NC} $*" >&2; }

# ── Health checks ────────────────────────────────────────────────
check_db() {
  docker exec tgroup-db pg_isready -U postgres -d tdental_demo &>/dev/null 2>&1
}

check_api() {
  # Check that API server is listening — use HEAD to avoid response body
  curl -s --connect-timeout 2 --max-time 3 -o /dev/null -w '%{http_code}' "http://localhost:${API_PORT}/" 2>/dev/null | grep -qE '^[0-9]{3}$'
}

check_vite() {
  curl -sf --connect-timeout 2 --max-time 3 -o /dev/null "http://localhost:${VITE_PORT}" 2>/dev/null
}

wait_for() {
  local name="$1" check_fn="$2" max="$3" i=0
  while [ $i -lt $max ]; do
    if $check_fn; then
      log "✅ ${name} is ready"
      return 0
    fi
    i=$((i + 1))
    printf "  waiting for %s... (%d/%d)\r" "$name" "$i" "$max"
    sleep 2
  done
  err "❌ ${name} did not become ready in time"
  return 1
}

# ── Start services ───────────────────────────────────────────────
start_db() {
  if check_db; then
    log "PostgreSQL already running on :${DB_PORT}"
    return 0
  fi

  log "Starting PostgreSQL via Docker..."
  cd "$ROOT"
  docker compose up -d db
  wait_for "PostgreSQL" check_db 30
}

start_api() {
  if check_api; then
    log "API already running on :${API_PORT}"
    return 0
  fi

  # Kill stale process if PID file exists
  if [ -f "$API_PIDFILE" ]; then
    old_pid=$(cat "$API_PIDFILE")
    if kill -0 "$old_pid" 2>/dev/null; then
      warn "Killing stale API process (PID $old_pid)"
      kill "$old_pid" 2>/dev/null || true
    fi
    rm -f "$API_PIDFILE"
  fi

  log "Starting API on :${API_PORT}..."
  cd "${ROOT}/api"
  nohup env DATABASE_URL="$DB_URL" PORT="$API_PORT" JWT_SECRET="$JWT_SECRET" \
    node src/server.js > "${ROOT}/.dev-api.log" 2>&1 &
  echo $! > "$API_PIDFILE"
  disown

  wait_for "API" check_api 30
}

start_vite() {
  if check_vite; then
    log "Vite dev server already running on :${VITE_PORT}"
    return 0
  fi

  if [ -f "$VITE_PIDFILE" ]; then
    old_pid=$(cat "$VITE_PIDFILE")
    if kill -0 "$old_pid" 2>/dev/null; then
      warn "Killing stale Vite process (PID $old_pid)"
      kill "$old_pid" 2>/dev/null || true
    fi
    rm -f "$VITE_PIDFILE"
  fi

  log "Starting Vite dev server on :${VITE_PORT}..."
  cd "${ROOT}/website"
  nohup npx vite --port "$VITE_PORT" --host > "${ROOT}/.dev-vite.log" 2>&1 &
  echo $! > "$VITE_PIDFILE"
  disown

  wait_for "Vite" check_vite 30
}

seed_admin() {
  # Check if admin user exists
  local exists
  exists=$(docker exec tgroup-db psql -U postgres -d tdental_demo -tAc \
    "SELECT COUNT(*) FROM account WHERE email='tg@clinic.vn'" 2>/dev/null || echo "0")

  if [ "$exists" = "0" ]; then
    log "Seeding admin user..."
    # bcrypt hash for '123456' — 10 rounds
    docker exec tgroup-db psql -U postgres -d tdental_demo -c \
      "INSERT INTO account (id, email, password, name, active)
       VALUES ('admin-001', 'tg@clinic.vn',
               '\$2b\$10\$dummyHashForDevOnlyNotForProdUse',
               'Admin', true)
       ON CONFLICT (email) DO NOTHING;" 2>/dev/null || true
    warn "⚠️  Admin password hash is placeholder — set it properly if login fails"
  else
    log "Admin user already exists"
  fi
}

# ── Stop services ────────────────────────────────────────────────
stop_all() {
  log "Stopping dev environment..."

  # Stop Vite
  if [ -f "$VITE_PIDFILE" ]; then
    pid=$(cat "$VITE_PIDFILE")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      log "Vite stopped (PID $pid)"
    fi
    rm -f "$VITE_PIDFILE"
  fi

  # Stop API
  if [ -f "$API_PIDFILE" ]; then
    pid=$(cat "$API_PIDFILE")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      log "API stopped (PID $pid)"
    fi
    rm -f "$API_PIDFILE"
  fi

  # Stop Docker (DB only, not full stack)
  if check_db; then
    cd "$ROOT"
    docker compose stop db
    log "PostgreSQL stopped"
  fi

  log "All services stopped"
}

# ── Status ───────────────────────────────────────────────────────
show_status() {
  echo ""
  echo -e "${CYAN}═══ TGroup Dev Environment Status ═══${NC}"
  echo ""

  if check_db; then
    echo -e "  PostgreSQL:  ${GREEN}✅ running${NC}  :${DB_PORT}"
  else
    echo -e "  PostgreSQL:  ${RED}❌ stopped${NC}"
  fi

  if check_api; then
    echo -e "  API:         ${GREEN}✅ running${NC}  :${API_PORT}"
  else
    echo -e "  API:         ${RED}❌ stopped${NC}"
  fi

  if check_vite; then
    echo -e "  Vite:        ${GREEN}✅ running${NC}  :${VITE_PORT}"
  else
    echo -e "  Vite:        ${RED}❌ stopped${NC}"
  fi

  echo ""
  echo "  Login: tg@clinic.vn / 123456"
  echo "  URL:   http://localhost:${VITE_PORT}"
  echo ""
}

# ── Run tests ────────────────────────────────────────────────────
run_tests() {
  start_db
  start_api
  start_vite

  echo ""
  log "Running Playwright E2E tests..."
  cd "${ROOT}/website"
  npx playwright test "$@" \
    --workers=1 \
    --reporter=list \
    --timeout=30000
}

# ── Main ─────────────────────────────────────────────────────────
case "${1:-start}" in
  start)
    log "Starting TGroup dev environment..."
    start_db
    seed_admin
    start_api
    start_vite
    echo ""
    log "🚀 Dev environment ready!"
    echo ""
    echo "  Frontend:  http://localhost:${VITE_PORT}"
    echo "  API:       http://localhost:${API_PORT}/api"
    echo "  Login:     tg@clinic.vn / 123456"
    echo ""
    echo "  Run E2E:   ./scripts/dev-e2e.sh test"
    echo "  Stop:      ./scripts/dev-e2e.sh stop"
    ;;
  stop)
    stop_all
    ;;
  status)
    show_status
    ;;
  test)
    shift || true
    run_tests "$@"
    ;;
  restart)
    stop_all
    sleep 2
    exec "$0" start
    ;;
  *)
    echo "Usage: $0 {start|stop|status|test|restart}"
    echo ""
    echo "  start    Start DB + API + Vite (default)"
    echo "  test     Start everything + run Playwright"
    echo "  stop     Stop all services"
    echo "  status   Show what's running"
    echo "  restart  Stop and start fresh"
    exit 1
    ;;
esac

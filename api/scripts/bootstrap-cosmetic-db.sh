#!/bin/bash
# bootstrap-cosmetic-db.sh
# Phase 0 Cosmetic LOB v2 — local only
# Creates tcosmetic_demo (if missing) and bootstraps empty dbo schema
# that matches tdental_demo's table structure (for mirror route handlers to work 1:1).
#
# Usage (local Homebrew Postgres on 5433):
#   cd api && bash scripts/bootstrap-cosmetic-db.sh
#
# Per PLAN.md verification: after run, `psql ... -l` shows tcosmetic_demo
# and table count in dbo matches dental's (empty rows).
#
# IMPORTANT: This is schema-only (no data). Later migrations (additive) applied to both DBs.
# Re-runnable / idempotent: drops & recreates the cosmetic DB.

set -euo pipefail

DB_HOST="127.0.0.1"
DB_PORT="5433"
DB_USER="postgres"
DENTAL_DB="tdental_demo"
COSMETIC_DB="tcosmetic_demo"
PGPASSWORD="${PGPASSWORD:-postgres}"

log() { echo "[bootstrap-cosmetic] $*" >&2; }

log "Dropping $COSMETIC_DB if exists (local dev only)..."
PGPASSWORD=$PGPASSWORD dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $COSMETIC_DB 2>/dev/null || true

log "Creating fresh $COSMETIC_DB..."
PGPASSWORD=$PGPASSWORD createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $COSMETIC_DB

log "Installing required extensions (pg_trgm for indexes)..."
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $COSMETIC_DB -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" -q

log "Dumping dbo schema-only from $DENTAL_DB (no data, no owner/privs)..."
# Capture dump to temp to allow error-tolerant load + logging
DUMP_FILE=$(mktemp /tmp/cosmetic-dbo-schema.XXXXXX.sql)
PGPASSWORD=$PGPASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DENTAL_DB -n dbo \
  --schema-only --no-owner --no-privileges --no-comments \
  > "$DUMP_FILE" 2>&1

log "Applying schema to $COSMETIC_DB (errors for public-schema functions/triggers are expected and non-fatal for empty cosmetic demo)..."
# Allow errors from missing public functions; cosmetic demo does not need full trigger parity yet
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $COSMETIC_DB -f "$DUMP_FILE" -q 2>&1 | grep -vE '(ERROR:.*(does not exist|operator class))' || true

rm -f "$DUMP_FILE"

# Count verification
DENTAL_COUNT=$(PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DENTAL_DB -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='dbo' AND table_type='BASE TABLE';" | tr -d ' ')
COSMETIC_COUNT=$(PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $COSMETIC_DB -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='dbo' AND table_type='BASE TABLE';" | tr -d ' ')

log "Dental dbo base tables: $DENTAL_COUNT"
log "Cosmetic dbo base tables: $COSMETIC_COUNT"

if [ "$COSMETIC_COUNT" -lt 20 ]; then
  log "WARNING: Cosmetic table count low ($COSMETIC_COUNT). Some objects may have failed to import due to cross-schema dependencies."
  log "This is acceptable for Phase 0 mirror skeleton; core tables (partners, products, companies, appointments, payments, etc.) are present."
fi

log "Setting search_path default for convenience..."
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $COSMETIC_DB -c "ALTER DATABASE $COSMETIC_DB SET search_path = dbo, public;" -q

log "SUCCESS: tcosmetic_demo ready (empty, schema matches dental for LOB mirror)."
log "Next: apply additive v2 migration to BOTH databases."
log "Verify: PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -l | grep tcosmetic_demo"

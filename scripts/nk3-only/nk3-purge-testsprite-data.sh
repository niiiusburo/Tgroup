#!/usr/bin/env bash
# Purge TEST_SPRITE / TESTSPRITE test data from the NK3 staging DBs.
#
# The TestSprite suite (testsprite_tests/) creates marker-named customers and
# employees on tmv.2checkin.com every mutation run. This script soft-deletes
# them (isdeleted=true, active=false) in BOTH NK3 databases — mirroring the
# app's own delete semantics, so no FK risk and fully reversible.
#
# NK3 ONLY. Target VPS/container/DB names are pinned; NK production
# (nk.2checkin.com / tdental_demo) is structurally unreachable from here.
#
# Usage:
#   bash scripts/nk3-only/nk3-purge-testsprite-data.sh                 # dry-run (default)
#   bash scripts/nk3-only/nk3-purge-testsprite-data.sh --apply --confirm PURGE_NK3_TESTSPRITE
#
# @crossref:domain[cosmetic-clients ctv]
# @crossref:used-in[NK3 staging maintenance; testsprite_tests suite hygiene]
# @crossref:uses[product-map/schema-map.md (dbo.partners SMI); testsprite_tests/_helpers.py TEST_MARKER]

set -euo pipefail

NK3_VPS="root@76.13.16.68"
DB_CONTAINER="tgroup-db"
DBS=("tdental_nk3" "tcosmetic_nk3")
CONFIRM_TOKEN="PURGE_NK3_TESTSPRITE"

# Marker-named, non-CTV, not already soft-deleted.
MATCH="(name ILIKE 'TEST_SPRITE%' OR name ILIKE 'TESTSPRITE%')
       AND COALESCE(is_ctv, false) = false
       AND COALESCE(isdeleted, false) = false"

APPLY=false
CONFIRM=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY=true ;;
    --dry-run) APPLY=false ;;
    --confirm) shift; CONFIRM="${1:-}" ;;
    -h|--help)
      sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
  shift
done

if $APPLY && [[ "$CONFIRM" != "$CONFIRM_TOKEN" ]]; then
  echo "Apply requires: --confirm $CONFIRM_TOKEN" >&2
  exit 1
fi

psql_db() {
  local db="$1"
  ssh "$NK3_VPS" docker exec -i "$DB_CONTAINER" \
    psql -U postgres -X -v ON_ERROR_STOP=1 -tA -d "$db" -f -
}

echo "=== NK3 TEST_SPRITE purge — $($APPLY && echo APPLY || echo DRY-RUN) — $(date -u +%FT%TZ) ==="

total=0
for db in "${DBS[@]}"; do
  echo
  echo "--- $db ---"
  counts=$(psql_db "$db" <<SQL
SELECT count(*) FILTER (WHERE customer)  AS customers,
       count(*) FILTER (WHERE employee)  AS employees,
       count(*)                          AS total
FROM dbo.partners
WHERE $MATCH;
SQL
)
  IFS='|' read -r n_cust n_emp n_total <<< "$counts"
  echo "matching rows: total=$n_total (customers=$n_cust, employees=$n_emp)"
  total=$((total + n_total))

  if [[ "$n_total" == "0" ]]; then
    continue
  fi

  echo "sample:"
  psql_db "$db" <<SQL
SELECT '  ' || left(id::text, 8) || '  ' || coalesce(name,'?')
       || '  cust=' || customer || ' emp=' || employee
       || '  created=' || to_char(datecreated, 'YYYY-MM-DD')
FROM dbo.partners
WHERE $MATCH
ORDER BY datecreated DESC
LIMIT 10;
SQL

  if $APPLY; then
    updated=$(psql_db "$db" <<SQL
WITH purged AS (
  UPDATE dbo.partners
  SET isdeleted = true, active = false, lastupdated = now()
  WHERE $MATCH
  RETURNING id
)
SELECT count(*) FROM purged;
SQL
)
    echo "soft-deleted: $updated rows in $db"
  fi
done

echo
if $APPLY; then
  echo "DONE — purged across both DBs."
else
  echo "DRY-RUN — $total rows would be soft-deleted. Re-run with:"
  echo "  bash $0 --apply --confirm $CONFIRM_TOKEN"
fi

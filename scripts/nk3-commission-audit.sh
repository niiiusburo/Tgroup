#!/bin/bash
# @crossref:domain[earnings-commissions]
# @crossref:used-in[VPS cron (nightly), docs/runbooks/VERIFICATION.md]
# @crossref:uses[product-map/domains/earnings-commissions.yaml, docs/TEST-MATRIX.md]
#
# NK3 commission-attribution night guard (owner decision 2026-06-10, Q2 = option 1).
# Verifies the invariant "a service with no CTV attached must carry zero ACTIVE
# commission" plus related earnings hygiene on BOTH NK3 databases, and alerts the
# project Telegram chat when anything is wrong. Silent when clean.
#
# Install (VPS): cp to /opt/tgroup/scripts/, ensure /opt/tgroup/scripts/telegram.env
# contains TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (chmod 600), then cron:
#   0 18 * * * /opt/tgroup/scripts/nk3-commission-audit.sh >> /opt/tgroup/backups/nk3-commission-audit.log 2>&1
# (18:00 UTC = 01:00 Asia/Ho_Chi_Minh)
#
# Usage: nk3-commission-audit.sh [--test]   (--test sends a test alert and exits)
set -uo pipefail

DB_CONTAINER="${TGROUP_DB_CONTAINER:-tgroup-db}"
DBS=(tdental_nk3 tcosmetic_nk3)
ENV_FILE="${TELEGRAM_ENV_FILE:-/opt/tgroup/scripts/telegram.env}"

[[ -f "$ENV_FILE" ]] && . "$ENV_FILE"

send_telegram() {
  local text="$1"
  if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${TELEGRAM_CHAT_ID:-}" ]]; then
    echo "WARN: TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID unset — alert NOT sent: $text" >&2
    return 1
  fi
  curl -fsS -m 15 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${text}" \
    --data-urlencode "disable_web_page_preview=true" > /dev/null
}

if [[ "${1:-}" == "--test" ]]; then
  send_telegram "[NK3 commission audit] test alert — the night guard pipeline works ($(date -u +%FT%TZ))" \
    && echo "test alert sent" || echo "test alert FAILED"
  exit 0
fi

psql_one() { # db, sql -> single value (empty on error, marker on failure)
  docker exec "$DB_CONTAINER" psql -U postgres -d "$1" -tAc "$2" 2>/dev/null
}

PROBLEMS=()

for DB in "${DBS[@]}"; do
  # 1) ACTIVE (non-reversed) net earnings on service lines whose saleorder has NO CTV.
  V1=$(psql_one "$DB" "
    SELECT COUNT(*) FROM (
      SELECT e.service_line_id
      FROM dbo.earnings e
      JOIN dbo.saleorderlines sl ON sl.id = e.service_line_id
      JOIN dbo.saleorders so ON so.id = sl.orderid
      WHERE so.ctv_id IS NULL AND e.status <> 'reversed'
      GROUP BY e.service_line_id
      HAVING SUM(e.amount) <> 0
    ) v;")
  # 2) ACTIVE earnings paid to recipients that are not CTVs.
  V2=$(psql_one "$DB" "
    SELECT COUNT(*) FROM dbo.earnings e
    JOIN dbo.partners p ON p.id = e.recipient_partner_id
    WHERE e.status <> 'reversed' AND COALESCE(p.is_ctv, false) = false;")
  # 3) ACTIVE earnings with no service-line linkage (untraceable money).
  V3=$(psql_one "$DB" "
    SELECT COUNT(*) FROM dbo.earnings
    WHERE service_line_id IS NULL AND status <> 'reversed';")

  if [[ -z "$V1" || -z "$V2" || -z "$V3" ]]; then
    PROBLEMS+=("${DB}: audit query FAILED (db/container unreachable?)")
    continue
  fi
  [[ "$V1" != "0" ]] && PROBLEMS+=("${DB}: ${V1} service line(s) with ACTIVE earnings but NO CTV on the service")
  [[ "$V2" != "0" ]] && PROBLEMS+=("${DB}: ${V2} ACTIVE earnings row(s) paid to a non-CTV recipient")
  [[ "$V3" != "0" ]] && PROBLEMS+=("${DB}: ${V3} ACTIVE earnings row(s) with no service line")
done

STAMP="$(date -u +%FT%TZ)"
if (( ${#PROBLEMS[@]} > 0 )); then
  MSG="[NK3 commission audit] VIOLATIONS at ${STAMP}:"
  for p in "${PROBLEMS[@]}"; do MSG+=$'\n'"- ${p}"; done
  MSG+=$'\n'"Rule: services without a CTV must produce zero commission. Audit SQL: scripts/nk3-commission-audit.sh"
  echo "$MSG"
  send_telegram "$MSG"
  exit 2
fi
echo "${STAMP} commission audit clean (${DBS[*]})"

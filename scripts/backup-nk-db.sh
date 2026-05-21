#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/tgroup}"
DB_CONTAINER="${TGROUP_DB_CONTAINER:-tgroup-db}"
DB_NAME="${TGROUP_DB_NAME:-tdental_demo}"
DB_USER="${TGROUP_DB_USER:-postgres}"
BACKUP_DIR="${TGROUP_DB_BACKUP_DIR:-${APP_DIR}/backups/nk-db-daily}"
RETENTION="${TGROUP_DB_BACKUP_RETENTION:-3}"
STAMP="$(TZ=Asia/Ho_Chi_Minh date +%Y%m%d_%H%M%S)"
TARGET="${BACKUP_DIR}/nk-${DB_NAME}-${STAMP}.dump"
TMP_TARGET="${TARGET}.tmp"

if ! [[ "${RETENTION}" =~ ^[0-9]+$ ]] || [ "${RETENTION}" -lt 1 ]; then
  echo "Invalid TGROUP_DB_BACKUP_RETENTION=${RETENTION}; expected a positive integer." >&2
  exit 2
fi

mkdir -p "${BACKUP_DIR}"

if ! docker inspect "${DB_CONTAINER}" >/dev/null 2>&1; then
  echo "Database container not found: ${DB_CONTAINER}" >&2
  exit 3
fi

docker exec "${DB_CONTAINER}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null
docker exec "${DB_CONTAINER}" pg_dump \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  > "${TMP_TARGET}"

if [ ! -s "${TMP_TARGET}" ]; then
  rm -f "${TMP_TARGET}"
  echo "Backup failed: empty dump file." >&2
  exit 4
fi

mv "${TMP_TARGET}" "${TARGET}"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${TARGET}" > "${TARGET}.sha256"
else
  shasum -a 256 "${TARGET}" > "${TARGET}.sha256"
fi

find "${BACKUP_DIR}" -maxdepth 1 -type f -name "nk-${DB_NAME}-*.dump" -exec basename {} \; \
  | sort -r \
  | awk -v keep="${RETENTION}" 'NR > keep { print }' \
  | while IFS= read -r old_backup; do
      rm -f "${BACKUP_DIR}/${old_backup}" "${BACKUP_DIR}/${old_backup}.sha256"
    done

retained_count="$(find "${BACKUP_DIR}" -maxdepth 1 -type f -name "nk-${DB_NAME}-*.dump" | wc -l | tr -d ' ')"
backup_size="$(du -h "${TARGET}" | awk '{ print $1 }')"

echo "created=${TARGET} size=${backup_size} retained=${retained_count}"

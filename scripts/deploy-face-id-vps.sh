#!/usr/bin/env bash
# Guided VPS deploy for the Face ID 0.29.0 fix bundle.
#
# This is a RUNBOOK, not a fire-and-forget script. It asks for confirmation at
# each phase so you can stop and inspect. Run it as:
#
#     ssh root@76.13.16.68 'bash -s' < scripts/deploy-face-id-vps.sh
#
# or copy it to the VPS and run interactively:
#
#     scp scripts/deploy-face-id-vps.sh root@76.13.16.68:/tmp/
#     ssh root@76.13.16.68 'bash /tmp/deploy-face-id-vps.sh'
#
# Prerequisites checked here:
#   - tdental-api repo at /root/tdental-api/ on `ai-develop` (or whichever branch
#     contains commit bbdfc8b0 fix(face-id): wire embedding pipeline...)
#   - docker available (for face-service container)
#   - pm2 managing the API process named `tdental-api`
#   - Postgres reachable from the VPS using the prod DATABASE_URL

set -euo pipefail

REPO=/root/tdental-api
API_PM2_NAME=tdental-api
PROD_HEALTH_URL=https://nk.2checkin.com/api/health
LOCAL_HEALTH_URL=http://127.0.0.1:3002/api/health
FACE_HEALTH_URL=http://127.0.0.1:8001/health

confirm() {
  read -rp "$1 [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || { echo "aborted at: $1"; exit 1; }
}

echo
echo "==[ Phase 0 — preflight ]==============================================="
[ -d "$REPO" ] || { echo "ERR: $REPO not found"; exit 1; }
cd "$REPO"
echo "current branch: $(git rev-parse --abbrev-ref HEAD)"
echo "current commit: $(git rev-parse --short HEAD)"
echo "expected commit on top of branch contains: bbdfc8b0 fix(face-id)..."
git log --oneline -3
confirm "is this the right branch + commit?"

echo
echo "==[ Phase 1 — pull latest ]============================================="
git fetch origin
echo "behind/ahead of origin:"
git rev-list --left-right --count HEAD...@{u} || true
confirm "git pull --ff-only?"
git pull --ff-only

echo
echo "==[ Phase 2 — migration 046 (idempotent — uses IF NOT EXISTS) ]========="
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f "$REPO/api/.env" ]; then
    set +u; set -a; . "$REPO/api/.env"; set +a; set -u
  fi
fi
[ -n "${DATABASE_URL:-}" ] || { echo "ERR: DATABASE_URL not set and api/.env missing"; exit 1; }
echo "DATABASE_URL host: $(echo "$DATABASE_URL" | sed -E 's#^postgres(ql)?://[^@]*@([^/]+)/.*$#\2#')"
confirm "apply api/src/db/migrations/046_customer_face_embeddings.sql?"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f api/src/db/migrations/046_customer_face_embeddings.sql
psql "$DATABASE_URL" -c "\d dbo.customer_face_embeddings" | head -5

echo
echo "==[ Phase 3 — face-service container ]=================================="
echo "current containers matching 'face':"
docker ps -a --filter name=face --format '{{.Names}}\t{{.Status}}' || true
confirm "(re)build and start face-service via docker compose?"
docker compose build face-service
docker compose up -d face-service
sleep 4
echo "face-service health:"
curl -fsS -m 5 "$FACE_HEALTH_URL" && echo

echo
echo "==[ Phase 4 — API env + pm2 restart ]==================================="
if ! grep -q '^FACE_SERVICE_URL=' "$REPO/api/.env" 2>/dev/null; then
  echo "FACE_SERVICE_URL not in api/.env — appending http://127.0.0.1:8001"
  confirm "append FACE_SERVICE_URL=http://127.0.0.1:8001 to api/.env?"
  printf '\n# Face ID — node API talks to face-service container\nFACE_SERVICE_URL=http://127.0.0.1:8001\n' >> "$REPO/api/.env"
else
  echo "FACE_SERVICE_URL already set:"
  grep '^FACE_SERVICE_URL=' "$REPO/api/.env"
fi
confirm "pm2 restart $API_PM2_NAME?"
pm2 restart "$API_PM2_NAME" --update-env
sleep 3

echo
echo "==[ Phase 5 — local smoke check on the VPS ]============================"
curl -fsS -m 5 "$LOCAL_HEALTH_URL" && echo
echo
echo "expected: status=healthy, checks.db=true, checks.faceService=true"
confirm "did the local /api/health show faceService=true?"

echo
echo "==[ Phase 6 — public smoke check ]======================================"
echo "fetching $PROD_HEALTH_URL ..."
curl -fsS -m 8 "$PROD_HEALTH_URL" && echo
echo
echo "==[ done ]=============================================================="
echo "next: run the webcam UAT against https://nk.2checkin.com — see"
echo "      'Webcam UAT checklist' in docs or PR description."

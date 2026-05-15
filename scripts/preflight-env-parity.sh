#!/usr/bin/env bash
#
# preflight-env-parity.sh — block a regression deploy.
#
# WHY THIS EXISTS
#   On 2026-05-15 we discovered NK2 staging had been forked off an older NK
#   snapshot and was missing ~2 days of NK production work: migrations 047–050,
#   PaymentProofModal, legacy flat report exports, useTodayServices, etc. The
#   regression went undetected because NK2 deploys as a `scp/rsync` copy with
#   no git history, so `git status` cannot warn anyone. This preflight makes
#   that class of bug impossible to ship silently.
#
# WHAT IT DOES
#   Before any deploy to nk or nk2, this script:
#     1. SSHes to the VPS and reads both /opt/tgroup (nk) and /opt/tgroup-staging/app (nk2).
#     2. Diffs the LOCAL working tree against BOTH environments.
#     3. HARD FAILS if the OTHER environment has files the local tree does not.
#        That is the smoking gun for a regression (we'd be deploying a tree
#        that lost work the peer already has).
#     4. WARNS on file-level content differences and migrations directory drift.
#     5. Prints applied vs pending DB migrations on the shared tdental_demo DB.
#
# HOW TO USE
#   From the repo root, before EVERY deploy:
#
#       bash scripts/preflight-env-parity.sh nk     # deploying to prod
#       bash scripts/preflight-env-parity.sh nk2    # deploying to staging
#
#   Exit codes:
#     0  Safe to deploy (no regressions, no critical drift)
#     1  REGRESSION: peer env has files this tree is missing. Investigate before deploy.
#     2  Usage / SSH / environment error.
#
#   If you need to override (rare — e.g. deliberately removing a file), set
#   PREFLIGHT_ALLOW_REGRESSION=1 in the env. This is logged.
#
# WHERE TO WIRE IT
#   - Manually: run it before every `docker compose up -d --build` and every rsync.
#   - Recommended: prepend the command to any future deploy wrapper script.
#   - The runbook (docs/runbooks/DEPLOYMENT.md) step 0 should be "run this script".
#
# DEPENDENCIES
#   bash 4+, ssh, rsync, awk. No node/python required.
#
# Author: introduced by the NK→NK2 merge incident, 2026-05-15.

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────
VPS_HOST="${PREFLIGHT_VPS_HOST:-root@76.13.16.68}"
NK_PATH="/opt/tgroup"
NK2_PATH="/opt/tgroup-staging/app"
DB_CONTAINER="tgroup-db"
DB_NAME="tdental_demo"

# Things we deliberately do NOT diff (build artifacts, VPS-only state, secrets).
EXCLUDES=(
  '.git'
  'node_modules'
  '.vite'
  'dist'
  '*.tsbuildinfo'
  'test-results'
  'playwright-report'
  '.worktrees'
  '.cache'
  'coverage'
  '.pi/handoffs'
  '.planning/STATE.md'
  '.agents/live-site.env'
  '.env'
  '.env.*'
  'backups'
  '.deploy-stashed-untracked-*'
  'LOCAL'
  '.deploy-stashed-untracked-*'
  '.git-rewrite'
  '.kilocode'
  '.ruff_cache'
  '.mypy_cache'
  '.pytest_cache'
  '.claude/memory.md'
  '.claude/projects'
  '.claude/skills'
  '.omc'
  '.playwright-mcp'
  '.testsprite'
  'testsprite_tests'
  'screenshots'
  '*.screenshot.png'
  '/*.png'
  '/*.jpg'
  '/*.jpeg'
  '/*.webm'
  '/*.mp4'
  '/*.gif'
  '*.cjs'
  'design.md'
  'animation-preview.html'
  'reports/deploy-*.log'
  'logs'
  '*.bak'
  '*.tgz'
)

# ─── Args ───────────────────────────────────────────────────────────────────
TARGET="${1:-}"
case "$TARGET" in
  nk)  TARGET_PATH="$NK_PATH"  ; PEER_LABEL="nk2" ; PEER_PATH="$NK2_PATH" ;;
  nk2) TARGET_PATH="$NK2_PATH" ; PEER_LABEL="nk"  ; PEER_PATH="$NK_PATH"  ;;
  *)   echo "Usage: $0 {nk|nk2}" >&2 ; exit 2 ;;
esac

# ─── Helpers ────────────────────────────────────────────────────────────────
red()   { printf '\033[31m%s\033[0m\n' "$*" ; }
green() { printf '\033[32m%s\033[0m\n' "$*" ; }
amber() { printf '\033[33m%s\033[0m\n' "$*" ; }
bold()  { printf '\033[1m%s\033[0m\n' "$*" ; }

# Build rsync --exclude args.
rsync_excludes() {
  local out=""
  for e in "${EXCLUDES[@]}"; do out+="--exclude=$e " ; done
  echo "$out"
}

# Diff local working tree against a remote tree via rsync --dry-run.
# Outputs three sections:
#   LOCAL_ONLY  files present locally, absent on remote
#   REMOTE_ONLY files present on remote, absent locally  (this is the regression case)
#   DIFFER      files present on both but contents differ
diff_against_remote() {
  local remote_path="$1"
  local label="$2"
  local tmp ; tmp="$(mktemp -d)"

  # Remote-only: ssh + find files missing locally.
  # We use rsync --dry-run with itemize-changes from BOTH directions.
  rsync -an --itemize-changes $(rsync_excludes) ./ "${VPS_HOST}:${remote_path}/" 2>/dev/null \
    | awk '$1 ~ /^[<>ch.][f]/ { print }' > "$tmp/local_to_remote.itemize" || true

  rsync -an --itemize-changes $(rsync_excludes) "${VPS_HOST}:${remote_path}/" ./ 2>/dev/null \
    | awk '$1 ~ /^[<>ch.][f]/ { print }' > "$tmp/remote_to_local.itemize" || true

  # Anything rsync would CREATE on remote = local-only (or content differs).
  awk '$1 ~ /^>f\+\+\+/   { print $2 }' "$tmp/local_to_remote.itemize" | LC_ALL=C sort -u > "$tmp/local_only"
  # Anything rsync would CREATE locally = remote-only.
  awk '$1 ~ /^>f\+\+\+/   { print $2 }' "$tmp/remote_to_local.itemize" | LC_ALL=C sort -u > "$tmp/remote_only"
  # Content differences appear with checksum/size flags.
  awk '$1 ~ /^>f[^+]/     { print $2 }' "$tmp/local_to_remote.itemize" | LC_ALL=C sort -u > "$tmp/differ"

  echo "$tmp"
}

# ─── Header ─────────────────────────────────────────────────────────────────
bold "═══ Preflight: parity check before deploying to ${TARGET} ═══"
echo "VPS:           $VPS_HOST"
echo "Deploy target: $TARGET ($TARGET_PATH)"
echo "Peer env:      $PEER_LABEL ($PEER_PATH)"
echo "Local cwd:     $(pwd)"
echo ""

# Sanity: we should be at the repo root.
if [[ ! -f "package.json" && ! -d "website" && ! -d "api" ]]; then
  red "ERROR: run this from the monorepo root (expected package.json + website/ + api/)."
  exit 2
fi

# Sanity: SSH reachable.
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$VPS_HOST" "true" 2>/dev/null; then
  red "ERROR: cannot SSH to $VPS_HOST (BatchMode). Check your key + agent."
  exit 2
fi

# ─── Step 1: diff local vs target ───────────────────────────────────────────
bold "Step 1/3 — diff local tree vs deploy target ($TARGET)"
TARGET_DIFF="$(diff_against_remote "$TARGET_PATH" "$TARGET")"
target_local_only=$(wc -l < "$TARGET_DIFF/local_only" | tr -d ' ')
target_remote_only=$(wc -l < "$TARGET_DIFF/remote_only" | tr -d ' ')
target_differ=$(wc -l < "$TARGET_DIFF/differ" | tr -d ' ')

echo "  files local has, $TARGET does not:  $target_local_only  (these will be CREATED on deploy)"
echo "  files $TARGET has, local does not:  $target_remote_only  (will be DELETED on deploy if using --delete)"
echo "  files that differ in content:       $target_differ  (will be OVERWRITTEN on deploy)"
echo ""

# ─── Step 2: diff local vs PEER (the critical check) ────────────────────────
bold "Step 2/3 — diff local tree vs peer env ($PEER_LABEL)"
PEER_DIFF="$(diff_against_remote "$PEER_PATH" "$PEER_LABEL")"
peer_remote_only=$(wc -l < "$PEER_DIFF/remote_only" | tr -d ' ')
peer_local_only=$(wc -l < "$PEER_DIFF/local_only" | tr -d ' ')

echo "  files $PEER_LABEL has, local does not: $peer_remote_only  ← REGRESSION RISK"
echo "  files local has, $PEER_LABEL does not: $peer_local_only  (this is the new work peer will get later)"
echo ""

# ─── Step 3: migration-specific check ───────────────────────────────────────
bold "Step 3/3 — migration directory check"
for migdir in "api/migrations" "api/src/db/migrations"; do
  if [[ -d "$migdir" ]]; then
    local_mig=$(ls "$migdir" 2>/dev/null | sort)
    peer_mig=$(ssh "$VPS_HOST" "ls $PEER_PATH/$migdir 2>/dev/null" | sort)
    missing_from_local=$(comm -13 <(echo "$local_mig") <(echo "$peer_mig"))
    if [[ -n "$missing_from_local" ]]; then
      amber "  $migdir — peer ($PEER_LABEL) has migrations local does NOT:"
      echo "$missing_from_local" | sed 's/^/    /'
    else
      green "  $migdir — local has all peer's migrations ✓"
    fi
  fi
done
echo ""

# Quick applied-migrations probe.
amber "  applied-migrations probe (shared $DB_NAME):"
ssh "$VPS_HOST" "docker exec $DB_CONTAINER psql -U postgres -d $DB_NAME -tA -c \"
  SELECT 'payment_proofs.confirmed_at: ' || CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='dbo' AND table_name='payment_proofs' AND column_name='confirmed_at') THEN 'present' ELSE 'MISSING' END
  UNION ALL SELECT 'payment.confirm grant: ' || COALESCE(STRING_AGG(pg.name, ','), 'NONE') FROM dbo.group_permissions gp JOIN dbo.permission_groups pg ON pg.id = gp.group_id WHERE gp.permission='payment.confirm'
  UNION ALL SELECT 'customers.hard_delete grant: ' || COALESCE(STRING_AGG(pg.name, ','), 'NONE') FROM dbo.group_permissions gp JOIN dbo.permission_groups pg ON pg.id = gp.group_id WHERE gp.permission='customers.hard_delete'
\"" 2>/dev/null | sed 's/^/    /'
echo ""

# ─── Verdict ────────────────────────────────────────────────────────────────
bold "═══ Verdict ═══"
EXIT_CODE=0

if [[ "$peer_remote_only" -gt 0 ]]; then
  red   "REGRESSION DETECTED — $PEER_LABEL has $peer_remote_only file(s) the local tree is missing."
  echo  "First 20 missing-from-local files:"
  head -20 "$PEER_DIFF/remote_only" | sed 's/^/  /'
  echo  ""
  echo  "Full list at: $PEER_DIFF/remote_only"
  echo  ""
  if [[ "${PREFLIGHT_ALLOW_REGRESSION:-0}" == "1" ]]; then
    amber "PREFLIGHT_ALLOW_REGRESSION=1 set — proceeding despite regression. This will be logged."
    logger -t preflight-env-parity "OVERRIDE: deployed $TARGET despite $peer_remote_only files missing vs $PEER_LABEL by ${USER:-unknown}" 2>/dev/null || true
  else
    red "BLOCKING deploy. Reconcile before pushing:"
    echo "  1. Inspect the missing files above. Confirm they are not work-in-progress that should land in this deploy."
    echo "  2. To bring peer content into local: git fetch from peer (see incident playbook for ssh-based fetch)."
    echo "  3. If the removal is deliberate, re-run with PREFLIGHT_ALLOW_REGRESSION=1 (commit + document why)."
    EXIT_CODE=1
  fi
else
  green "No regression — local tree is a superset of $PEER_LABEL ✓"
fi

if [[ "$target_remote_only" -gt 0 ]]; then
  amber "Note: $TARGET has $target_remote_only file(s) not present locally."
  echo  "  If you are rsyncing with --delete, these files will be REMOVED on deploy."
  echo  "  First 10:"
  head -10 "$TARGET_DIFF/remote_only" | sed 's/^/    /'
fi

echo ""
if [[ $EXIT_CODE -eq 0 ]]; then
  green "Preflight OK — safe to deploy $TARGET."
else
  red "Preflight FAILED — do not deploy until reconciled."
fi
exit $EXIT_CODE

#!/usr/bin/env bash
# setup-ghcr-pat.sh — Mint a GHCR Personal Access Token for the TG Clinic VPS
# Used by Phase 9 (CI push) and Phase 10 (VPS pull).
#
# Run this ONCE locally on your laptop. It will:
#   1. Verify gh CLI is installed and authed
#   2. Refresh your gh auth scopes to include write:packages
#   3. Mint a classic PAT with read:packages (for VPS pulls)
#   4. Save it to ~/.config/tgroup/ghcr.token (mode 600)
#   5. Print the SCP command to ship it to the VPS
#
# This script intentionally requires interactive browser auth — it cannot be
# run by an autonomous agent. The PAT itself is sensitive; do not commit.

set -euo pipefail

readonly RED=$'\033[31m' GRN=$'\033[32m' YLW=$'\033[33m' BLU=$'\033[34m' RST=$'\033[0m'
readonly TOKEN_DIR="${HOME}/.config/tgroup"
readonly TOKEN_FILE="${TOKEN_DIR}/ghcr.token"
readonly VPS_HOST="${VPS_HOST:-root@76.13.16.68}"
readonly VPS_PATH="/opt/tgroup/.env.ghcr"
readonly GHCR_NAMESPACE="${GHCR_NAMESPACE:-niiiusburo}"

step() { printf "${BLU}━━━ %s${RST}\n" "$*"; }
ok() { printf "${GRN}✓ %s${RST}\n" "$*"; }
warn() { printf "${YLW}⚠ %s${RST}\n" "$*"; }
die() { printf "${RED}✘ %s${RST}\n" "$*" >&2; exit 1; }

# 1. Preflight ────────────────────────────────────────────────────────────────
step "Step 1/5 — Preflight"

command -v gh >/dev/null 2>&1 || die "gh CLI not found. Install: brew install gh"

if ! gh auth status >/dev/null 2>&1; then
  warn "gh is not authenticated. Running 'gh auth login' first..."
  gh auth login
fi

ok "gh CLI ready (logged in as: $(gh api user -q .login))"

# 2. Refresh scopes for org packages ─────────────────────────────────────────
step "Step 2/5 — Adding write:packages scope to gh CLI auth"
echo "A browser window will open. Approve the new scopes."
read -r -p "Press Enter to continue..."
gh auth refresh -h github.com -s write:packages,read:packages,delete:packages
ok "Scopes added"

# 3. Mint a long-lived classic PAT for the VPS (read-only) ───────────────────
step "Step 3/5 — Mint a classic PAT for the VPS (read:packages only)"
echo
echo "GitHub does NOT have an API to mint classic PATs programmatically."
echo "You'll need to do this in the browser. Opening the page now..."
echo
echo "On the form that opens, set:"
echo "  Note:        tgroup-vps-ghcr-pull"
echo "  Expiration:  90 days (or 'No expiration' if you accept the risk)"
echo "  Scopes:      read:packages  ← only this one"
echo
echo "Then click 'Generate token' and copy the token starting with 'ghp_'."
echo
read -r -p "Press Enter to open the token creation page..."
open "https://github.com/settings/tokens/new?description=tgroup-vps-ghcr-pull&scopes=read:packages" 2>/dev/null \
  || xdg-open "https://github.com/settings/tokens/new?description=tgroup-vps-ghcr-pull&scopes=read:packages" 2>/dev/null \
  || echo "Open this URL manually: https://github.com/settings/tokens/new?description=tgroup-vps-ghcr-pull&scopes=read:packages"

echo
read -r -s -p "Paste the token here (input hidden): " GHCR_PAT
echo

[[ -z "${GHCR_PAT}" ]] && die "Empty token, aborting"
[[ "${GHCR_PAT}" =~ ^ghp_ ]] || warn "Token doesn't start with 'ghp_' — make sure you copied a classic PAT, not a fine-grained one"

# 4. Save locally with strict permissions ───────────────────────────────────
step "Step 4/5 — Save token to ${TOKEN_FILE}"
mkdir -p "${TOKEN_DIR}"
chmod 700 "${TOKEN_DIR}"
umask 077
cat > "${TOKEN_FILE}" <<EOF
# GHCR Personal Access Token for TG Clinic VPS
# Scopes: read:packages
# Created: $(date -u +%Y-%m-%dT%H:%M:%SZ) by setup-ghcr-pat.sh
# DO NOT COMMIT
GHCR_USERNAME=$(gh api user -q .login)
GHCR_TOKEN=${GHCR_PAT}
GHCR_NAMESPACE=${GHCR_NAMESPACE}
EOF
chmod 600 "${TOKEN_FILE}"
ok "Saved (mode 600)"

# Verify the token works against GHCR
step "Verifying token against GHCR"
if echo "${GHCR_PAT}" | docker login ghcr.io -u "$(gh api user -q .login)" --password-stdin >/dev/null 2>&1; then
  ok "docker login ghcr.io succeeded"
  docker logout ghcr.io >/dev/null 2>&1 || true
else
  warn "docker login test failed — verify the token has read:packages scope"
fi

# 5. Print VPS deploy command ────────────────────────────────────────────────
step "Step 5/5 — Ship to VPS"
cat <<EOF

To deploy to the VPS (Phase 10 will need this):

  ${BLU}scp ${TOKEN_FILE} ${VPS_HOST}:${VPS_PATH}${RST}
  ${BLU}ssh ${VPS_HOST} 'chmod 600 ${VPS_PATH}'${RST}

Then on the VPS, the deploy script will:

  ${BLU}source ${VPS_PATH}${RST}
  ${BLU}echo "\${GHCR_TOKEN}" | docker login ghcr.io -u "\${GHCR_USERNAME}" --password-stdin${RST}

${GRN}Run the scp/ssh commands above when you're ready. They are NOT executed
automatically by this script — review the token first.${RST}

EOF

ok "Done. Token is at: ${TOKEN_FILE}"

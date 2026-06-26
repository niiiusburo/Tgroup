#!/usr/bin/env bash
# NK3 verification package runner — see docs/reports/nk3-multi-agent-audit-2026-06-11.md
# Usage: bash scripts/nk3-verify-package.sh <package-id|all|list>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PKG="${1:-list}"

run_api() {
  (cd api && JWT_SECRET=test npx jest --runInBand "$@")
}

case "$PKG" in
  list)
    echo "nk3-auth-identity nk3-lob-cosmetic nk3-web-shell nk3-customers-identity"
    echo "nk3-calendar-appointments nk3-services-money nk3-ctv-commission nk3-reports-exports nk3-settings-governance"
    ;;
  nk3-auth-identity)
    run_api tests/loginRateLimiter.test.js tests/readRoutePermissions.test.js \
      src/__tests__/cosmeticLobGuards.test.js src/middleware/__tests__/dentalLobGate.test.js \
      src/routes/__tests__/authLobHardening.test.js src/services/__tests__/permissionService.test.js \
      src/services/__tests__/loginIdentifier.test.js src/services/__tests__/legacyCtvPassword.test.js
    ;;
  nk3-lob-cosmetic)
    run_api src/__tests__/db-factory.test.js src/__tests__/cosmeticLobGuards.test.js \
      src/__tests__/adminLobPermissions.test.js src/middleware/__tests__/lob.test.js \
      src/middleware/__tests__/dentalLobGate.test.js
    npm run verify:migrations
    ;;
  nk3-services-money)
    run_api src/services/__tests__/serviceReversal.test.js \
      src/services/__tests__/commissionEngine.test.js \
      src/services/__tests__/commissionEngineServiceCard.test.js \
      tests/saleOrderLines.test.js tests/paymentsTransaction.test.js
    ;;
  nk3-ctv-commission)
    run_api src/routes/__tests__/ctvCreateLobScope.test.js \
      src/routes/__tests__/ctvBookings.test.js src/routes/__tests__/ctvPublicJoin.test.js \
      src/services/__tests__/commissionEngineServiceCard.test.js \
      src/services/__tests__/nk3CtvIntegrityRepair.test.js
    ;;
  nk3-settings-governance)
    npm run verify:governance
    ;;
  all)
    for id in nk3-auth-identity nk3-lob-cosmetic nk3-services-money nk3-ctv-commission nk3-settings-governance; do
      echo "=== $id ==="
      bash "$0" "$id"
    done
    ;;
  *)
    echo "Unknown package: $PKG" >&2
    exit 1
    ;;
esac
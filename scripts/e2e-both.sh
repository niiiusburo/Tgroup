#!/usr/bin/env bash
#
# e2e-both.sh — Run E2E suite against LOCAL and VPS, compare results.
#
# How: Creates temp copies of e2e/ with sed-replaced URLs, runs Playwright.
#
# Usage:
#   ./scripts/e2e-both.sh                # Run both environments
#   ./scripts/e2e-both.sh --local-only   # Local only
#   ./scripts/e2e-both.sh --vps-only     # VPS only
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WEBSITE_DIR="$PROJECT_DIR/website"

LOCAL_URL="${LOCAL_URL:-http://localhost:5174}"
VPS_URL="${VPS_URL:-https://nk.2checkin.com}"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

RUN_LOCAL=true; RUN_VPS=true
for arg in "$@"; do
  case "$arg" in
    --local-only) RUN_VPS=false ;;
    --vps-only)   RUN_LOCAL=false ;;
    --help|-h) echo "Usage: $0 [--local-only|--vps-only|--help]"; exit 0 ;;
  esac
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪  TGroup E2E — Local vs VPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Local: $LOCAL_URL"
echo "  VPS:   $VPS_URL"
echo ""

cd "$WEBSITE_DIR"

WORK_DIR=$(mktemp -d /tmp/e2e-both.XXXXXX)
trap "rm -rf $WORK_DIR" EXIT

# ─── Generate playwright config for a target testDir ──────────────────────────
make_config() {
  local cfgpath="$1"
  local testdir="$2"
  local authfile="$3"
  cat > "$cfgpath" << CONF
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '${testdir}',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth-setup\\.spec\\.ts/,
      use: { storageState: undefined },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '${authfile}',
      },
      dependencies: ['auth-setup'],
      testIgnore: /auth-setup\\.spec\\.ts/,
    },
  ],
});
CONF
}

# ─── Prepare a test run directory ────────────────────────────────────────────
# Copies e2e/, replaces all localhost URLs with target, patches auth save path
prepare_run() {
  local name="$1"        # "local" or "vps"
  local target_url="$2"

  local run_dir="$WORK_DIR/$name"
  local e2e_dir="$run_dir/e2e"
  local auth_file="$WEBSITE_DIR/.auth/admin.$name.json"

  mkdir -p "$e2e_dir"
  cp -r "$WEBSITE_DIR/e2e/"*.spec.ts "$e2e_dir/"

  # Replace hardcoded localhost URLs
  find "$e2e_dir" -name '*.spec.ts' -exec sed -i '' \
    -e "s|http://localhost:5174|${target_url}|g" \
    -e "s|http://localhost:5175|${target_url}|g" \
    -e "s|http://127.0.0.1:5174|${target_url}|g" \
    {} +

  # Patch auth-setup to save to environment-specific file
  sed -i '' "s|'\\.auth/admin\\.json'|'.auth/admin.${name}.json'|g" "$e2e_dir/auth-setup.spec.ts"

  # Generate config
  make_config "$run_dir/playwright.config.ts" "$e2e_dir" "$auth_file"

  echo "$run_dir"
}

# ─── Run tests for one environment ────────────────────────────────────────────
run_tests() {
  local name="$1"
  local label="$2"
  local url="$3"

  echo ""
  echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}  $label RUNNING: $name ($url)${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"

  local run_dir
  run_dir=$(prepare_run "$name" "$url")
  local output_file="/tmp/e2e-${name}-output.txt"

  # Copy the config into website/ so @playwright/test resolves from node_modules
  local config_in_website="$WEBSITE_DIR/playwright.$name.config.ts"
  cp "$run_dir/playwright.config.ts" "$config_in_website"
  # Also copy the e2e test dir into website/
  rm -rf "$WEBSITE_DIR/e2e-run-$name"
  cp -r "$run_dir/e2e" "$WEBSITE_DIR/e2e-run-$name"
  # Fix the testDir path in config to be relative to website/
  sed -i '' "s|testDir: '.*'|testDir: './e2e-run-$name'|" "$config_in_website"

  mkdir -p "$WEBSITE_DIR/.auth"

  npx playwright test \
    --config="$config_in_website" \
    --output="$WEBSITE_DIR/test-results/$name" \
    2>&1 | tee "$output_file" && echo "PASS" > "$run_dir/result" || echo "FAIL" > "$run_dir/result"

  # Cleanup test dir from website/
  rm -rf "$WEBSITE_DIR/e2e-run-$name" "$config_in_website"

  cat "$run_dir/result"
}

# ─── Execute ──────────────────────────────────────────────────────────────────
if [ "$RUN_LOCAL" = true ]; then
  run_tests "local" "🏠" "$LOCAL_URL"
fi

if [ "$RUN_VPS" = true ]; then
  run_tests "vps" "🌐" "$VPS_URL"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊  RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

EXIT_CODE=0

if [ "$RUN_LOCAL" = true ]; then
  PASSED=$(grep -c "^  ✓" /tmp/e2e-local-output.txt 2>/dev/null || echo "0")
  FAILED=$(grep -c "^  ✘" /tmp/e2e-local-output.txt 2>/dev/null || echo "0")
  RESULT=$(cat "$WORK_DIR/local/result")
  if [ "$RESULT" = "PASS" ]; then
    echo -e "  🏠 Local:  ${GREEN}✅ PASS${NC}  ($PASSED passed)"
  else
    echo -e "  🏠 Local:  ${RED}❌ FAIL${NC}  ($PASSED passed, $FAILED failed)"
    EXIT_CODE=1
  fi
fi

if [ "$RUN_VPS" = true ]; then
  PASSED=$(grep -c "^  ✓" /tmp/e2e-vps-output.txt 2>/dev/null || echo "0")
  FAILED=$(grep -c "^  ✘" /tmp/e2e-vps-output.txt 2>/dev/null || echo "0")
  RESULT=$(cat "$WORK_DIR/vps/result")
  if [ "$RESULT" = "PASS" ]; then
    echo -e "  🌐 VPS:    ${GREEN}✅ PASS${NC}  ($PASSED passed)"
  else
    echo -e "  🌐 VPS:    ${RED}❌ FAIL${NC}  ($PASSED passed, $FAILED failed)"
    EXIT_CODE=1
  fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $EXIT_CODE

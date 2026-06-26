#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

STAGED_FILES="$(git diff --cached --name-only --diff-filter=ACMR)"

if [ -z "$STAGED_FILES" ]; then
  echo "[hard-gates] No staged files; skipping typecheck, lint, and tests."
  exit 0
fi

has_staged() {
  printf '%s\n' "$STAGED_FILES" | grep -E "$1" >/dev/null 2>&1
}

staged_matching() {
  printf '%s\n' "$STAGED_FILES" | grep -E "$1" || true
}

run_gate() {
  echo
  echo "[hard-gates] $*"
  "$@"
}

echo "[hard-gates] Staged files:"
printf '%s\n' "$STAGED_FILES" | sed 's/^/[hard-gates]   /'

echo
echo "[hard-gates] Type check"
if has_staged '^(website/(src|test|tests|e2e|tsconfig|vite\.config|vitest\.config|package(-lock)?\.json)|website/.*\.(ts|tsx))'; then
  run_gate ./website/node_modules/.bin/tsc -p website/tsconfig.json --noEmit --pretty false
else
  echo "[hard-gates] Website TypeScript unchanged; skipping website typecheck."
fi

if has_staged '^(contracts/(src|tsconfig|package(-lock)?\.json)|contracts/.*\.(ts|tsx))'; then
  run_gate ./contracts/node_modules/.bin/tsc -p contracts/tsconfig.json --noEmit --pretty false
else
  echo "[hard-gates] Contracts TypeScript unchanged; skipping contracts build."
fi

NODE_CHECK_FILES="$(staged_matching '\.(cjs|mjs|js)$' | grep -v -E '(^|/)(node_modules|dist|build|coverage|website/public/catalogue/assets)/' || true)"
if [ -n "$NODE_CHECK_FILES" ]; then
  echo "$NODE_CHECK_FILES" | while IFS= read -r file; do
    [ -f "$file" ] || continue
    run_gate node --check "$file"
  done
else
  echo "[hard-gates] No staged JavaScript files needing node --check."
fi

echo
echo "[hard-gates] Lint"
if has_staged '^(website/(src|e2e|\.eslintrc\.cjs|eslint\.config\.)|website/.*\.(ts|tsx|js|jsx))'; then
  run_gate npm --prefix website run lint
else
  echo "[hard-gates] Website lint inputs unchanged; skipping website lint."
fi

echo
echo "[hard-gates] Affected tests"
if has_staged '^api/(src|tests|package(-lock)?\.json)'; then
  run_gate npm --prefix api test -- --runInBand
else
  echo "[hard-gates] API runtime/tests unchanged; skipping API Jest."
fi

WEBSITE_UNIT_TESTS="$(staged_matching '^website/.*\.(test|spec)\.(ts|tsx|js|jsx)$' | grep -v '^website/e2e/' | sed 's|^website/||' || true)"
if [ -n "$WEBSITE_UNIT_TESTS" ]; then
  run_gate npm --prefix website test -- $WEBSITE_UNIT_TESTS
elif has_staged '^website/(src|test|tests|vite\.config|vitest\.config)'; then
  run_gate npm --prefix website test
else
  echo "[hard-gates] Website unit-test inputs unchanged; skipping Vitest."
fi

if has_staged '^website/e2e/.*\.(test|spec)\.(ts|tsx|js|jsx)$'; then
  E2E_TESTS="$(staged_matching '^website/e2e/.*\.(test|spec)\.(ts|tsx|js|jsx)$')"
  run_gate npm --prefix website run test:e2e -- $E2E_TESTS
else
  echo "[hard-gates] Website E2E specs unchanged; skipping Playwright."
fi

echo
echo "[hard-gates] All selected hard gates passed."

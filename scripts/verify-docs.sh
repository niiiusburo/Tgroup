#!/usr/bin/env bash
# verify-docs.sh
# Enforces AGENTS.md §16: doc updates must accompany contract/invariant/data-model/workflow changes.
# Run this before committing, or wire it as a pre-commit hook.

set -euo pipefail

CHANGED_FILES=$(git diff --cached --name-only 2>/dev/null || git diff --name-only HEAD~1)

if [ -z "$CHANGED_FILES" ]; then
  echo "✓ No files changed."
  exit 0
fi

# Patterns that trigger doc-update requirement
TRIGGER_PATTERNS=(
  "contracts/"
  "api/src/routes/"
  "api/src/middleware/"
  "api/src/services/"
  "api/migrations/"
  "website/src/lib/api/"
  "website/src/types/"
  "website/src/constants/index.ts"
  "product-map/"
)

# Docs that must be touched when triggers fire
REQUIRED_DOCS=(
  "docs/CONTRACTS.md"
  "docs/DATA-MODEL.md"
  "docs/INVARIANTS.md"
  "docs/USE-CASES.md"
  "docs/WORKFLOWS.md"
  "docs/CHANGELOG.md"
)

TRIGGER_HIT=false
for pattern in "${TRIGGER_PATTERNS[@]}"; do
  if echo "$CHANGED_FILES" | grep -qE "^$pattern"; then
    TRIGGER_HIT=true
    break
  fi
done

if [ "$TRIGGER_HIT" = false ]; then
  echo "✓ No contract/schema/API changes detected. Doc-update check skipped."
  exit 0
fi

echo "⚠️  Contract/schema/API changes detected. Checking doc updates..."

DOC_UPDATED=false
for doc in "${REQUIRED_DOCS[@]}"; do
  if echo "$CHANGED_FILES" | grep -qE "^$doc"; then
    DOC_UPDATED=true
    echo "  ✓ $doc updated"
  fi
done

CHANGELOG_UPDATED=false
if echo "$CHANGED_FILES" | grep -qE "^docs/CHANGELOG.md"; then
  CHANGELOG_UPDATED=true
  echo "  ✓ CHANGELOG.md updated"
fi

if [ "$DOC_UPDATED" = false ]; then
  echo ""
  echo "❌ FAILED: You changed a contract/schema/API file but did NOT update any of:"
  for doc in "${REQUIRED_DOCS[@]}"; do
    echo "   - $doc"
  done
  echo ""
  echo "AGENTS.md §16: 'Every task that touches a contract, invariant, data-model,"
  echo "or workflow MUST update the relevant doc in the same commit.'"
  echo ""
  echo "To bypass (not recommended): git commit --no-verify"
  exit 1
fi

if [ "$CHANGELOG_UPDATED" = false ]; then
  echo ""
  echo "⚠️  WARNING: CHANGELOG.md was NOT updated. Append an entry per AGENTS.md §8."
  echo "   To bypass: git commit --no-verify"
  # Non-blocking warning; change to exit 1 if you want strict enforcement.
fi

echo ""
echo "✓ Doc-update check passed."
exit 0

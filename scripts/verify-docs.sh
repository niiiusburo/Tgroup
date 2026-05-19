#!/usr/bin/env bash
# verify-docs.sh
# Enforces AGENTS.md §16: doc updates must accompany contract/invariant/data-model/workflow changes.
# Run this before committing, or wire it as a pre-commit hook.

set -euo pipefail

if [ -n "${VERIFY_DOCS_CHANGED_FILES:-}" ]; then
  CHANGED_FILES="$VERIFY_DOCS_CHANGED_FILES"
elif ! git diff --cached --quiet --exit-code 2>/dev/null; then
  CHANGED_FILES=$(git diff --cached --name-only)
elif [ -n "${VERIFY_DOCS_BASE_REF:-}" ]; then
  CHANGED_FILES=$(git diff --name-only "${VERIFY_DOCS_BASE_REF}...HEAD")
else
  CHANGED_FILES=$(git diff --name-only HEAD)
fi

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
  "api/src/db/migrations/"
  "website/src/lib/api/"
  "website/src/types/"
  "website/src/constants/index.ts"
  "product-map/"
)

# Docs that can satisfy the relevant-doc requirement when triggers fire
REQUIRED_DOCS=(
  "docs/CONTRACTS.md"
  "docs/DATA-MODEL.md"
  "docs/INVARIANTS.md"
  "docs/USE-CASES.md"
  "docs/WORKFLOWS.md"
  "docs/DEPENDENCY-MAP.md"
  "docs/FAILURE-MODES.md"
  "docs/MIGRATIONS.md"
  "docs/TEST-MATRIX.md"
  "product-map/"
)

# Governance/doc-only edits still require a changelog entry.
DOC_GOVERNANCE_PATTERNS=(
  "AGENTS.md"
  "ARCHITECTURE.md"
  "DESIGN.md"
  "BEHAVIOR.md"
  "DECISIONS.md"
  "COORDINATION_REQUESTS.md"
  "docs/"
  "product-map/"
)

# Frontend, feature, and backend data-flow changes require TestSprite planning.
TESTBRIGHT_PATTERNS=(
  "api/src/routes/"
  "api/src/middleware/"
  "api/src/services/"
  "api/migrations/"
  "api/src/db/migrations/"
  "website/src/"
  "contracts/"
  "product-map/"
  "docs/CONTRACTS.md"
  "docs/DATA-MODEL.md"
  "docs/USE-CASES.md"
  "docs/WORKFLOWS.md"
  "docs/TEST-MATRIX.md"
)

REQUIRED_ALWAYS=(
  "docs/CHANGELOG.md"
)

has_changed_file_matching() {
  local pattern="$1"
  echo "$CHANGED_FILES" | grep -qE "^$pattern"
}

require_changed_file() {
  local path_pattern="$1"
  local reason="$2"
  if ! has_changed_file_matching "$path_pattern"; then
    echo ""
    echo "❌ FAILED: Missing required cross-check artifact: $path_pattern"
    echo "   Reason: $reason"
    echo "   Follow AGENTS.md §3 and §16 before committing."
    exit 1
  fi
}

API_CONTRACT_HIT=false
for pattern in "contracts/" "api/src/routes/" "website/src/lib/api/" "website/src/types/"; do
  if has_changed_file_matching "$pattern"; then
    API_CONTRACT_HIT=true
    break
  fi
done

SCHEMA_HIT=false
for pattern in "api/migrations/" "api/src/db/migrations/"; do
  if has_changed_file_matching "$pattern"; then
    SCHEMA_HIT=true
    break
  fi
done

FEATURE_OR_DATA_HIT=false
for pattern in "api/src/routes/" "api/src/middleware/" "api/src/services/" "website/src/" "contracts/"; do
  if has_changed_file_matching "$pattern"; then
    FEATURE_OR_DATA_HIT=true
    break
  fi
done

TRIGGER_HIT=false
for pattern in "${TRIGGER_PATTERNS[@]}"; do
  if has_changed_file_matching "$pattern"; then
    TRIGGER_HIT=true
    break
  fi
done

if [ "$TRIGGER_HIT" = false ]; then
  echo "✓ No contract/schema/API changes detected."
fi

if [ "$TRIGGER_HIT" = true ]; then
  echo "⚠️  Contract/schema/API changes detected. Checking doc updates..."
fi

DOC_UPDATED=false
for doc in "${REQUIRED_DOCS[@]}"; do
  if has_changed_file_matching "$doc"; then
    DOC_UPDATED=true
    echo "  ✓ $doc updated"
  fi
done

CHANGELOG_UPDATED=false
TESTBRIGHT_REQUIRED=false
TESTBRIGHT_UPDATED=false
DOC_GOVERNANCE_HIT=false

for pattern in "${DOC_GOVERNANCE_PATTERNS[@]}"; do
  if has_changed_file_matching "$pattern" && ! has_changed_file_matching "docs/CHANGELOG.md$"; then
    DOC_GOVERNANCE_HIT=true
    break
  fi
done

for pattern in "${TESTBRIGHT_PATTERNS[@]}"; do
  if has_changed_file_matching "$pattern"; then
    TESTBRIGHT_REQUIRED=true
    break
  fi
done

if has_changed_file_matching "docs/CHANGELOG.md$"; then
  CHANGELOG_UPDATED=true
  echo "  ✓ docs/CHANGELOG.md updated"
fi

if has_changed_file_matching "testbright.md$"; then
  TESTBRIGHT_UPDATED=true
  echo "  ✓ testbright.md updated"
fi

if [ "$API_CONTRACT_HIT" = true ]; then
  require_changed_file "docs/CONTRACTS.md$" "API/contract/client/type changes must update the frozen contract documentation."
  require_changed_file "product-map/contracts/api-index.md$" "API/contract/client/type changes must update the product-map API index."
fi

if [ "$SCHEMA_HIT" = true ]; then
  require_changed_file "docs/DATA-MODEL.md$" "Schema or migration changes must update the ERD/data-model authority."
  require_changed_file "docs/MIGRATIONS.md$" "Schema or migration changes must update the migration log."
  require_changed_file "product-map/schema-map.md$" "Schema or migration changes must update schema blast-radius mapping."
fi

if [ "$FEATURE_OR_DATA_HIT" = true ]; then
  if ! has_changed_file_matching "docs/TEST-MATRIX.md$" && ! has_changed_file_matching "product-map/test-matrix.md$"; then
    echo ""
    echo "❌ FAILED: Feature/backend/contract changes must update docs/TEST-MATRIX.md or product-map/test-matrix.md."
    echo "   This keeps future agents from changing a feature without knowing the regression gate."
    exit 1
  fi
fi

if [ "$TRIGGER_HIT" = true ] && [ "$DOC_UPDATED" = false ]; then
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

if { [ "$TRIGGER_HIT" = true ] || [ "$DOC_GOVERNANCE_HIT" = true ]; } && [ "$CHANGELOG_UPDATED" = false ]; then
  echo ""
  echo "❌ FAILED: docs/CHANGELOG.md was NOT updated. Append an entry per AGENTS.md §16."
  echo "   To bypass: git commit --no-verify"
  exit 1
fi

if [ "$TESTBRIGHT_REQUIRED" = true ] && [ "$TESTBRIGHT_UPDATED" = false ]; then
  echo ""
  echo "❌ FAILED: testbright.md was NOT updated for frontend/feature/backend data-flow changes."
  echo "   Add a TestSprite plan with changed URLs/API routes, data flows, roles, paths, edge cases, regressions, and setup data."
  echo "   To bypass: git commit --no-verify"
  exit 1
fi

echo ""
echo "✓ Doc-update check passed."
exit 0

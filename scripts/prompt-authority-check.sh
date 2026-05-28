#!/usr/bin/env bash
# prompt-authority-check.sh
# Lightweight prompt-start guard for agents. It verifies that authority docs exist,
# blocks generated-memory leakage, and prints the docs that should be read before edits.

set -euo pipefail

ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$ROOT_DIR"

PROMPT_PAYLOAD=$(cat 2>/dev/null || true)
PROMPT_LOWER=$(printf '%s' "$PROMPT_PAYLOAD" | tr '[:upper:]' '[:lower:]')

sanitize_agents_memory_block() {
  local file="AGENTS.md"
  [ -f "$file" ] || return 0
  if ! grep -q "<claude-mem-context>" "$file"; then
    return 0
  fi

  local tmp_file
  tmp_file="$(mktemp)"
  awk '
    /<claude-mem-context>/ { skip = 1; changed = 1; next }
    /<\/claude-mem-context>/ { skip = 0; next }
    !skip { lines[++n] = $0 }
    END {
      while (n > 0 && lines[n] == "") n--
      for (i = 1; i <= n; i++) print lines[i]
    }
  ' "$file" > "$tmp_file"
  mv "$tmp_file" "$file"
}

sanitize_agents_memory_block

required_files=(
  "AGENTS.md"
  "ARCHITECTURE.md"
  "DESIGN.md"
  "BEHAVIOR.md"
  "DECISIONS.md"
  ".claude/memory.md"
  "product-map/schema-map.md"
  "product-map/contracts/dependency-rules.yaml"
  "product-map/unknowns.md"
  "docs/CHANGELOG.md"
  "docs/TEST-MATRIX.md"
  "testbright.md"
)

missing=()
for file in "${required_files[@]}"; do
  if [ ! -e "$file" ]; then
    missing+=("$file")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  echo "test sprite activated."
  echo "Authority prompt check: FAIL. Missing required authority files:"
  printf '  - %s\n' "${missing[@]}"
  exit 1
fi

if command -v rg >/dev/null 2>&1; then
  if rg -n -e '<claude-mem-context>' -e '</claude-mem-context>' \
    AGENTS.md ARCHITECTURE.md DESIGN.md BEHAVIOR.md DECISIONS.md docs product-map \
    --glob '!docs/runbooks/VERIFICATION.md' >/tmp/tgroup-authority-memory-markers.$$ 2>/dev/null; then
    echo "test sprite activated."
    echo "Authority prompt check: FAIL. Generated memory markers leaked into authority docs:"
    cat "/tmp/tgroup-authority-memory-markers.$$"
    rm -f "/tmp/tgroup-authority-memory-markers.$$"
    exit 1
  fi
  rm -f "/tmp/tgroup-authority-memory-markers.$$"
fi

matched_docs=()

add_doc() {
  local doc="$1"
  [ -e "$doc" ] || return 0
  for existing in "${matched_docs[@]:-}"; do
    if [ "$existing" = "$doc" ]; then
      return 0
    fi
  done
  matched_docs+=("$doc")
}

contains_any() {
  local needle
  for needle in "$@"; do
    if [[ "$PROMPT_LOWER" == *"$needle"* ]]; then
      return 0
    fi
  done
  return 1
}

if contains_any "frontend" "ui" "page" "screen" "modal" "form" "button" "layout" "component" "browser" "visual"; then
  add_doc "website/agents.md"
  add_doc "website/design.md"
  add_doc "DESIGN.md"
  add_doc "BEHAVIOR.md"
  add_doc "docs/USE-CASES.md"
  add_doc "docs/WORKFLOWS.md"
  add_doc "docs/TEST-MATRIX.md"
  add_doc "testbright.md"
fi

if contains_any "api" "backend" "route" "endpoint" "request" "response" "contract" "client" "hook"; then
  add_doc "docs/CONTRACTS.md"
  add_doc "product-map/contracts/api-index.md"
  add_doc "docs/USE-CASES.md"
  add_doc "docs/WORKFLOWS.md"
  add_doc "docs/TEST-MATRIX.md"
fi

if contains_any "database" "db" "schema" "migration" "import" "restore" "sync" "copy" "export data"; then
  add_doc "docs/DATA-MODEL.md"
  add_doc "docs/MIGRATIONS.md"
  add_doc "product-map/schema-map.md"
  add_doc "docs/INVARIANTS.md"
  add_doc "docs/RUNBOOK.md"
fi

if contains_any "payment" "deposit" "refund" "money" "wallet" "revenue" "settle" "receipt"; then
  add_doc "docs/runbooks/MONEY_FLOW.md"
  add_doc "docs/INVARIANTS.md"
  add_doc "product-map/domains/payments-deposits.yaml"
  add_doc "product-map/business-logic/payment-allocation.md"
fi

if contains_any "auth" "login" "permission" "role" "security" "token" "session"; then
  add_doc "docs/SECURITY.md"
  add_doc "docs/INVARIANTS.md"
  add_doc "product-map/domains/auth.yaml"
  add_doc "product-map/contracts/permission-registry.yaml"
fi

if contains_any "report" "reports" "excel" "analytics" "dashboard"; then
  add_doc "product-map/domains/reports-analytics.yaml"
  add_doc "product-map/test-matrix.md"
fi

if contains_any "customer" "partner" "patient" "face" "hosoonline" "image"; then
  add_doc "product-map/domains/customers-partners.yaml"
fi

if contains_any "appointment" "calendar" "schedule" "check-in" "checkin"; then
  add_doc "product-map/domains/appointments-calendar.yaml"
fi

if contains_any "service" "treatment" "product" "saleorder" "sale order"; then
  add_doc "product-map/domains/services-catalog.yaml"
fi

if contains_any "feedback" "cms"; then
  add_doc "product-map/domains/feedback-cms.yaml"
fi

if contains_any "setting" "settings" "ip access" "version" "config"; then
  add_doc "product-map/domains/settings-system.yaml"
fi

if contains_any "deploy" "deployment" "vps" "production" "staging" "docker" "nginx" "env" "nk" "nk2"; then
  add_doc "docs/runbooks/DEPLOYMENT.md"
  add_doc "docs/runbooks/INFRASTRUCTURE.md"
  add_doc "docs/RUNBOOK.md"
  add_doc "docs/OBSERVABILITY.md"
fi

echo "test sprite activated."
echo "Authority prompt check: PASS."
echo "Always apply: AGENTS.md, ARCHITECTURE.md, DESIGN.md, BEHAVIOR.md, DECISIONS.md, .claude/memory.md."

if [ "${#matched_docs[@]}" -gt 0 ]; then
  echo "Prompt-matched docs:"
  printf '  - %s\n' "${matched_docs[@]}"
else
  echo "Prompt-matched docs: none inferred; select the affected product-map domain before editing."
fi

echo "Before edits: check product-map/unknowns.md and update docs/CHANGELOG.md plus testbright.md when the task touches frontend, feature, contract, or backend data flow."

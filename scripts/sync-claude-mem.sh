#!/usr/bin/env bash
# sync-claude-mem.sh — Pull latest Tgroup observations from claude-mem DB into .claude/memory.md
# Usage: ./scripts/sync-claude-mem.sh

set -euo pipefail

DB="${HOME}/.claude-mem/claude-mem.db"
OUT="$(dirname "$0")/../.claude/memory.md"
PROJECT="Tgroup"

if [[ ! -f "$DB" ]]; then
  echo "❌ claude-mem DB not found at $DB"
  exit 1
fi

NOW=$(date +%Y-%m-%d\ %H:%M:%S)

# Count sessions
SESSION_COUNT=$(sqlite3 "$DB" "SELECT COUNT(*) FROM sdk_sessions WHERE project='$PROJECT';" 2>/dev/null || echo "0")

# Fetch latest 10 observations
OBS=$(sqlite3 "$DB" "SELECT type, title, narrative, datetime(created_at_epoch, 'unixepoch') FROM observations WHERE project='$PROJECT' ORDER BY created_at_epoch DESC LIMIT 10;" 2>/dev/null || true)

# Fetch latest 5 session summaries
SUMS=$(sqlite3 "$DB" "SELECT request, completed, next_steps, datetime(created_at_epoch, 'unixepoch') FROM session_summaries WHERE project='$PROJECT' ORDER BY created_at_epoch DESC LIMIT 5;" 2>/dev/null || true)

cat > "$OUT" <<EOF
# Shared Session Memory — $PROJECT (Claude-Mem Bridge)

> Auto-generated from claude-mem DB (\`~/.claude-mem/claude-mem.db\`)  
> Last sync: $NOW  
> Project: $PROJECT | Sessions tracked: $SESSION_COUNT

---

## 🔥 Recent Observations

EOF

if [[ -n "$OBS" ]]; then
  echo "$OBS" | while IFS='|' read -r TYPE TITLE NARRATIVE CREATED; do
    echo "- **[$TYPE]** $TITLE ($CREATED)" >> "$OUT"
    if [[ -n "$NARRATIVE" ]]; then
      echo "  - ${NARRATIVE:0:300}" >> "$OUT"
    fi
    echo "" >> "$OUT"
  done
else
  echo "_No observations found._" >> "$OUT"
fi

cat >> "$OUT" <<EOF

---

## 📋 Recent Session Summaries

EOF

if [[ -n "$SUMS" ]]; then
  echo "$SUMS" | while IFS='|' read -r REQUEST COMPLETED NEXT_STEPS CREATED; do
    echo "### $CREATED" >> "$OUT"
    echo "- **Request:** ${REQUEST:0:200}" >> "$OUT"
    if [[ -n "$COMPLETED" ]]; then
      echo "- **Completed:** ${COMPLETED:0:300}" >> "$OUT"
    fi
    if [[ -n "$NEXT_STEPS" ]]; then
      echo "- **Next steps:** ${NEXT_STEPS:0:200}" >> "$OUT"
    fi
    echo "" >> "$OUT"
  done
else
  echo "_No summaries found._" >> "$OUT"
fi

cat >> "$OUT" <<EOF

---

> 💡 Tip: Run \`./scripts/sync-claude-mem.sh\` to refresh this file from the latest claude-mem data.
EOF

echo "✅ Synced claude-mem → $OUT"
echo "   Sessions: $SESSION_COUNT | Observations: $(echo "$OBS" | wc -l | xargs) | Summaries: $(echo "$SUMS" | wc -l | xargs)"

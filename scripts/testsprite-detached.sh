#!/usr/bin/env bash
# TestSprite detached runner — decouple long test sweeps from MCP/agent sessions.
#
# The MCP stdio pipe (and any interactive agent session) can die mid-sweep;
# this wrapper makes the sweep survive that by running it as a detached
# process with file-based handoff:
#   testsprite_tests/testsprite-results.json  — stable results file (poll this)
#   testsprite_tests/testsprite-run.log       — live stdout/stderr
#   testsprite_tests/testsprite-run.pid       — PID of the active run
#
# Usage:
#   bash scripts/testsprite-detached.sh start [--mode live|local] [--pattern TCxxx] [--parallel N]
#   bash scripts/testsprite-detached.sh status
#   bash scripts/testsprite-detached.sh results
#   bash scripts/testsprite-detached.sh wait [timeout_seconds]
#   bash scripts/testsprite-detached.sh stop
#
# NK3 staging (tmv.2checkin.com) is the default live target; override with
# TESTSPRITE_BASE_URL. NK production must NEVER receive mutation tests.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TS_DIR="$ROOT/testsprite_tests"
PID_FILE="$TS_DIR/testsprite-run.pid"
LOG_FILE="$TS_DIR/testsprite-run.log"
RESULTS_FILE="$TS_DIR/testsprite-results.json"
PYTHON="/opt/homebrew/bin/python3.12"

cmd="${1:-status}"
shift || true

is_running() {
  [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

case "$cmd" in
  start)
    if is_running; then
      echo "A run is already active (pid $(cat "$PID_FILE")). Use 'status' or 'stop'."
      exit 1
    fi
    # Default to live (NK3) unless caller passes --mode
    args=("$@")
    if [[ ! " ${args[*]:-} " == *" --mode "* ]]; then
      args=(--mode live "${args[@]:-}")
    fi
    : > "$LOG_FILE"
    nohup "$PYTHON" "$TS_DIR/run_testsprite_suite.py" "${args[@]}" \
      >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "Started detached TestSprite run (pid $(cat "$PID_FILE"))"
    echo "  log:     $LOG_FILE"
    echo "  results: $RESULTS_FILE (written on completion)"
    ;;

  status)
    if is_running; then
      echo "RUNNING (pid $(cat "$PID_FILE"))"
      tail -n 15 "$LOG_FILE" 2>/dev/null || true
    elif [[ -f "$RESULTS_FILE" ]]; then
      echo "IDLE — last results:"
      "$PYTHON" - "$RESULTS_FILE" <<'EOF'
import json, sys
d = json.load(open(sys.argv[1]))
s = d.get("summary", {})
print(f"  {d.get('timestamp')} mode={d.get('mode')} target={d.get('target_url')}")
print(f"  total={s.get('total')} pass={s.get('pass')} fail={s.get('fail')} "
      f"skip={s.get('skip')} timeout={s.get('timeout')} error={s.get('error')}")
EOF
    else
      echo "IDLE — no results file yet."
    fi
    ;;

  results)
    if [[ -f "$RESULTS_FILE" ]]; then
      cat "$RESULTS_FILE"
    else
      echo "No results file at $RESULTS_FILE" >&2
      exit 1
    fi
    ;;

  wait)
    timeout="${1:-1800}"
    waited=0
    while is_running; do
      if (( waited >= timeout )); then
        echo "Timed out after ${timeout}s; run still active (pid $(cat "$PID_FILE"))." >&2
        exit 2
      fi
      sleep 5
      waited=$((waited + 5))
    done
    rm -f "$PID_FILE"
    echo "Run finished after ~${waited}s."
    [[ -f "$RESULTS_FILE" ]] && bash "$0" status
    ;;

  stop)
    if is_running; then
      kill "$(cat "$PID_FILE")" && rm -f "$PID_FILE"
      echo "Stopped."
    else
      rm -f "$PID_FILE"
      echo "No active run."
    fi
    ;;

  *)
    echo "Unknown command: $cmd (use start|status|results|wait|stop)" >&2
    exit 1
    ;;
esac

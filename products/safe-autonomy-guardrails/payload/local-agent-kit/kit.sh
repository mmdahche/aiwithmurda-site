#!/bin/sh
# kit.sh — thin shim -> kit.py (local-agent-kit guards for shell hooks).
#
# Sets PYTHONUTF8=1 for Windows cp1252 consoles. Forwards all args + stdin.
# Cross-platform POSIX sh (macOS / Linux / Git Bash on Windows).
#
# Contract: every mode is FAIL-CLOSED — exit 2 = blocked/invalid, exit 0 = allow/valid.
#   --date            print a fresh UTC date-context line
#   --validate-input  stdin -> exit 0 valid / 2 invalid (input never echoed)
#   --guard-action X  exit 0 reversible / 2 irreversible
set -u
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PY="$DIR/kit.py"
if command -v python3 >/dev/null 2>&1; then PYBIN=python3
elif command -v python >/dev/null 2>&1; then PYBIN=python
else
  # No interpreter: the guards cannot run. Fail closed (exit 2) rather than allow an
  # unverified action through — python3 is a required dependency.
  echo "kit: no python interpreter found; failing closed" >&2
  exit 2
fi
PYTHONUTF8=1 "$PYBIN" "$PY" "$@"
exit $?

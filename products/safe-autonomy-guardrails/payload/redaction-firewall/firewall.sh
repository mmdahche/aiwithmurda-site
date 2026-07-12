#!/bin/sh
# firewall.sh — thin shim -> firewall.py (Python stdlib redaction firewall).
#
# Sets PYTHONUTF8=1 for Windows cp1252 consoles. Passes stdin through and forwards
# all args (e.g. --check, --profile phi). Cross-platform POSIX sh (macOS / Linux /
# Git Bash on Windows).
#
# Contract (filter mode): exit 0 = scrubbed stdout produced, exit 2 = FAIL-CLOSED
#   (stdout NOT trustworthy — drop it). (--check mode): 0 = clean, 1 = secrets
#   present, 2 = FAIL-CLOSED.
set -u
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PY="$DIR/firewall.py"
if command -v python3 >/dev/null 2>&1; then PYBIN=python3
elif command -v python >/dev/null 2>&1; then PYBIN=python
else
  # No interpreter: the firewall CANNOT scrub. Fail closed (exit 2) rather than let
  # un-scrubbed content through — python3 is a required dependency.
  echo "firewall: no python interpreter found; failing closed" >&2
  exit 2
fi
PYTHONUTF8=1 "$PYBIN" "$PY" "$@"
exit $?

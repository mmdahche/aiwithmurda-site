#!/bin/sh
# research.sh -- thin shim -> research.py ($0 multi-source web-research aggregator).
#
# Sets PYTHONUTF8=1 so Windows cp1252 consoles don't mangle non-ASCII output.
# Forwards all args + stdin. Cross-platform POSIX sh (macOS / Linux / Git Bash).
#
#   research.sh <topic> [--academic] [--sources s1,s2,...] [--n N] [--timeout SECS]
#   research.sh --list-sources
#
# Live network is OFF by default. Set RESEARCH_LIVE=1 (after your own security
# sign-off) to enable real outbound requests. Without it, every source raises
# LiveDisabledError and the CLI exits 3 -- ZERO network calls made.
#
# Fail-closed contract:
#   exit 0 -- structured JSON written to stdout
#   exit 2 -- bad args (missing topic / unknown source name)
#   exit 3 -- live-gate OFF (set RESEARCH_LIVE=1)
#   exit 4 -- query / results scrub failed (guardrails fail-closed)
#   exit 5 -- transport / unknown failure
set -u
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PY="$DIR/research.py"
if command -v python3 >/dev/null 2>&1; then PYBIN=python3
elif command -v python >/dev/null 2>&1; then PYBIN=python
else
  echo "research: no python interpreter found; failing closed" >&2
  exit 5
fi
PYTHONUTF8=1 "$PYBIN" "$PY" "$@"
exit $?

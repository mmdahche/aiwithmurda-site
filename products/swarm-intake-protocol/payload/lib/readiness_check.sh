#!/usr/bin/env bash
# readiness_check.sh -- thin bash->python3 shim for the Swarm-intake dispatch gate.
# Matches the existing hook-wiring convention (a .sh entrypoint over a stdlib
# Python collector). Cross-platform: forces PYTHONUTF8=1 so Windows shells parse
# UTF-8 templates/fixtures identically to macOS/Linux. Forwards all args and the
# collector's exit code (0 = READY, 1 = NOT-READY, 2 = usage error).
#
# Usage:
#   readiness_check.sh <project_dir> [--format human|json]
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PY="${PYTHON:-}"
if [ -z "${PY}" ]; then
  if command -v python3 >/dev/null 2>&1; then
    PY=python3
  elif command -v python >/dev/null 2>&1; then
    PY=python
  else
    echo "readiness_check.sh: no python3/python on PATH" >&2
    exit 2
  fi
fi

PYTHONUTF8=1 exec "${PY}" "${HERE}/readiness_check.py" "$@"

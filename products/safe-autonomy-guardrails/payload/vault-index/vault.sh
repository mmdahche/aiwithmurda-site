#!/bin/sh
# vault.sh — thin shim -> vault_index.py (vault master-index generator/validator + session log).
#
# Sets PYTHONUTF8=1 for Windows cp1252 consoles. Forwards all args + stdin.
# Cross-platform POSIX sh (macOS / Linux / Git Bash on Windows).
#
#   vault.sh generate --root <vault>           # write the master index
#   vault.sh validate --root <vault>           # exit 1 on drift (correct on contact)
#   vault.sh log --root <vault> --message "…"  # append a scrubbed session-log entry
# `log` fails CLOSED (exit 2) if the redaction firewall is unavailable — a session-log
# entry is never written un-scrubbed (secrets-out-of-vault).
set -u
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PY="$DIR/vault_index.py"
if command -v python3 >/dev/null 2>&1; then PYBIN=python3
elif command -v python >/dev/null 2>&1; then PYBIN=python
else
  echo "vault-index: no python interpreter found; failing closed" >&2
  exit 2
fi
PYTHONUTF8=1 "$PYBIN" "$PY" "$@"
exit $?

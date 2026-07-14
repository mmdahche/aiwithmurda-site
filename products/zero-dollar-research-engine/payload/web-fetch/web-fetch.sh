#!/bin/sh
# web-fetch.sh -- thin shim -> web_fetch.py ($0 single-URL fetch fast-path).
#
# Sets PYTHONUTF8=1 so Windows cp1252 consoles don't mangle non-ASCII body
# bytes. Forwards all args + stdin. Cross-platform POSIX sh
# (macOS / Linux / Git Bash on Windows).
#
#   web-fetch.sh <url> [--out FILE] [--max-bytes N] [--timeout S]
#                       [--max-redirects N] [--impersonate PROFILE]
#
# Live network is OFF by default. Set WEB_FETCH_LIVE=1 (after your own security
# sign-off) to enable real outbound requests. Without it, fetch_once raises
# LiveDisabledError and the CLI exits 3 -- ZERO network calls made.
#
# Fail-closed contract:
#   exit 0 -- scrubbed body on stdout (or written atomically to --out)
#   exit 2 -- bad args (missing URL)
#   exit 3 -- live-gate OFF (set WEB_FETCH_LIVE=1)
#   exit 4 -- SSRF refused (scheme / resolved IP in deny range, incl. redirect hop)
#   exit 5 -- scrub failed (guardrails fail-closed, when installed)
#   exit 6 -- transport / network / too-many-redirects failure
#   exit 7 -- unknown failure
set -u
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PY="$DIR/web_fetch.py"
if command -v python3 >/dev/null 2>&1; then PYBIN=python3
elif command -v python >/dev/null 2>&1; then PYBIN=python
else
  echo "web-fetch: no python interpreter found; failing closed" >&2
  exit 7
fi
# Verify the interpreter is Python 3.8+. A `python` that is actually Python 2
# (older base images) would die on a raw SyntaxError instead of a clear message;
# fail closed with a structured diagnostic instead.
if ! "$PYBIN" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)' 2>/dev/null; then
  echo "web-fetch: $PYBIN is not Python 3.8+; failing closed" >&2
  exit 7
fi
PYTHONUTF8=1 "$PYBIN" "$PY" "$@"
exit $?

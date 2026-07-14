#!/bin/sh
# tomd.sh -- thin shim -> tomarkdown.py (the doc/data -> Markdown converter).
#
# Sets PYTHONUTF8=1 so Windows cp1252 consoles don't mangle non-ASCII output.
# Forwards all args + stdin. Cross-platform POSIX sh (macOS / Linux / Git Bash).
#
#   tomd.sh convert --in <file> [--out <file>]
#
# Fail-closed contract: any validation error, conversion failure, or scrubber
# failure -> non-zero exit, NOTHING written. URL inputs (http(s)://, ftp(s)://,
# file://, data:) are REFUSED in v1; egress lives in the /web-fetch skill.
#
# Requires markitdown: pip install 'markitdown[pdf,docx,pptx,xlsx]==0.1.3'
set -u
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PY="$DIR/tomarkdown.py"
if command -v python3 >/dev/null 2>&1; then PYBIN=python3
elif command -v python >/dev/null 2>&1; then PYBIN=python
else
  echo "to-markdown: no python interpreter found; failing closed" >&2
  exit 2
fi
PYTHONUTF8=1 "$PYBIN" "$PY" "$@"
exit $?

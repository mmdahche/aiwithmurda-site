#!/usr/bin/env bash
# One-time setup for The Council.
# Installs the runner to ~/.council (or $COUNCIL_HOME), checks python3,
# and walks you through the Groq key. Safe to re-run; refuses to clobber
# an existing install unless you pass --force.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAYLOAD="$HERE/../payload/council"
TARGET="${COUNCIL_HOME:-$HOME/.council}"
FORCE="${1:-}"

if ! command -v python3 >/dev/null 2>&1; then
    echo "ERROR: python3 not found. Install Python 3.10+ first (macOS: xcode-select --install or brew install python3; Windows: python.org installer; Linux: your package manager)." >&2
    exit 1
fi

if [[ -d "$TARGET" && "$FORCE" != "--force" ]]; then
    echo "ERROR: $TARGET already exists. Re-run with --force to overwrite (your .secrets/ and runs/ are preserved)." >&2
    exit 1
fi

mkdir -p "$TARGET" "$TARGET/runs" "$TARGET/reports" "$TARGET/.secrets"
cp "$PAYLOAD/runner.py" "$TARGET/runner.py"
cp "$PAYLOAD/council.sh" "$TARGET/council.sh"
chmod +x "$TARGET/council.sh"
mkdir -p "$TARGET/advisors" "$TARGET/reviewers"
cp "$PAYLOAD"/advisors/*.md "$TARGET/advisors/"
cp "$PAYLOAD"/reviewers/*.md "$TARGET/reviewers/"

if [[ ! -f "$TARGET/.secrets/groq.env" ]]; then
    cp "$PAYLOAD/.secrets/groq.env.example" "$TARGET/.secrets/groq.env.example"
    echo ""
    echo "NEXT STEP (manual, one time):"
    echo "  1. Get a free key: https://console.groq.com/keys"
    echo "  2. cp $TARGET/.secrets/groq.env.example $TARGET/.secrets/groq.env"
    echo "  3. Edit groq.env and paste your key. Then: chmod 600 $TARGET/.secrets/groq.env"
fi

echo ""
echo "Installed The Council to $TARGET"
echo "Verify with: $TARGET/council.sh --mode fast \"Should I test the council with a trivial question?\""

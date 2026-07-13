#!/usr/bin/env bash
# One-time setup for The Three-Tier LLM Router.
# Copies the router to ~/.router (or $ROUTER_HOME). Zero npm dependencies;
# Node 18+ is the only requirement. Safe to re-run; refuses to clobber an
# existing install unless you pass --force (your .env and memory/ ledger are
# preserved either way).

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAYLOAD="$HERE/../payload"
TARGET="${ROUTER_HOME:-$HOME/.router}"
FORCE="${1:-}"

if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: node not found. Install Node 18+ first (nodejs.org, or your package manager)." >&2
    exit 1
fi
NODE_MAJOR=$(node -e 'console.log(process.versions.node.split(".")[0])')
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "ERROR: Node $NODE_MAJOR found; the router needs 18+ (built-in fetch)." >&2
    exit 1
fi

if [[ -d "$TARGET/lib" && "$FORCE" != "--force" ]]; then
    echo "ERROR: $TARGET already has a router install. Re-run with --force to refresh code (keeps .env and memory/)." >&2
    exit 1
fi

mkdir -p "$TARGET/memory"
cp -R "$PAYLOAD/lib" "$TARGET/"
cp -R "$PAYLOAD/bin" "$TARGET/"
cp -R "$PAYLOAD/scripts" "$TARGET/"
cp -R "$PAYLOAD/test" "$TARGET/"
cp "$PAYLOAD/model-roles.json" "$TARGET/model-roles.json"
[ -f "$TARGET/.env" ] || cp "$PAYLOAD/.env.example" "$TARGET/.env.example"
chmod +x "$TARGET/bin/ask.sh"

echo ""
echo "Installed the router to $TARGET"
echo ""
echo "NEXT STEPS:"
echo "  1. cp $TARGET/.env.example $TARGET/.env   # then add at least one provider key"
echo "  2. Put ask on your PATH:  ln -s $TARGET/bin/ask.sh ~/.local/bin/ask   (or add an alias)"
echo "  3. Prove it offline:      cd $TARGET && node --test test/*.test.cjs"
echo "  4. First call:            ask --purpose summarize \"Summarize: ...\""

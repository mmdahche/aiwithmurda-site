#!/usr/bin/env bash
# One-time setup for Safe-Autonomy Guardrails.
# Installs the guard engines to ~/.guardrails (or $GUARDRAILS_HOME) and stages
# the Claude Code hooks for you to wire. Safe to re-run; refuses to clobber an
# existing install unless you pass --force.
#
# This script never edits your Claude Code settings.json — hook wiring is a
# deliberate, visible step you do once (see install/hooks/settings.hooks.example.json).

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAYLOAD="$HERE/../payload"
TARGET="${GUARDRAILS_HOME:-$HOME/.guardrails}"
FORCE="${1:-}"

if ! command -v python3 >/dev/null 2>&1; then
    echo "ERROR: python3 not found. Install Python 3.10+ first (macOS: xcode-select --install; Linux: your package manager; Windows: python.org, then use WSL/Git Bash for the .sh shims)." >&2
    exit 1
fi

if [[ -d "$TARGET" && "$FORCE" != "--force" ]]; then
    echo "ERROR: $TARGET already exists. Re-run with --force to overwrite." >&2
    exit 1
fi

mkdir -p "$TARGET"
cp -R "$PAYLOAD/lib" "$TARGET/lib"
cp -R "$PAYLOAD/redaction-firewall" "$TARGET/redaction-firewall"
cp -R "$PAYLOAD/local-agent-kit" "$TARGET/local-agent-kit"
cp -R "$PAYLOAD/vault-index" "$TARGET/vault-index"
cp -R "$PAYLOAD/blueprints" "$TARGET/blueprints"
cp -R "$PAYLOAD/set-secret" "$TARGET/set-secret"
chmod +x "$TARGET"/redaction-firewall/firewall.sh "$TARGET"/local-agent-kit/kit.sh \
         "$TARGET"/vault-index/vault.sh "$TARGET"/set-secret/set-secret.sh

# Stage (never auto-wire) the Claude Code hooks.
mkdir -p "$HOME/.claude/hooks"
for hook in destructive-command-guard.sh freeze-path-guard.sh; do
    if [[ -f "$HOME/.claude/hooks/$hook" && "$FORCE" != "--force" ]]; then
        echo "SKIP: ~/.claude/hooks/$hook already exists (re-run with --force to replace)"
    else
        cp "$HERE/hooks/$hook" "$HOME/.claude/hooks/$hook"
        chmod +x "$HOME/.claude/hooks/$hook"
        echo "Staged: ~/.claude/hooks/$hook"
    fi
done

echo ""
echo "Installed Safe-Autonomy Guardrails to $TARGET"
echo ""
echo "MANUAL STEP (one time): wire the two hooks into your Claude Code settings."
echo "  Open ~/.claude/settings.json and merge the PreToolUse entries from:"
echo "  $HERE/hooks/settings.hooks.example.json"
echo ""
echo "Verify with the checklist in VERIFY.md, starting with:"
echo "  printf 'contact me at test@example.com' | $TARGET/redaction-firewall/firewall.sh"

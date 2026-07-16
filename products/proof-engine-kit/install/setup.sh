#!/usr/bin/env bash
# Install Proof Engine skill.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODUCT="$(cd "$HERE/.." && pwd)"
CLAUDE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/proof-engine"
FORCE="${1:-}"

if [[ -d "$CLAUDE" && "$FORCE" != "--force" ]]; then
  echo "ERROR: $CLAUDE exists. Re-run with --force." >&2
  exit 1
fi

mkdir -p "$CLAUDE"
cp "$PRODUCT/payload/proof-engine.md" "$CLAUDE/SKILL.md"

echo "Installed Proof Engine skill to $CLAUDE"
echo "Payload templates remain at: $PRODUCT/payload/"

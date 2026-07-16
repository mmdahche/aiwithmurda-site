#!/usr/bin/env bash
# Install Retail Ops AI Pack skills (markdown-only).

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODUCT="$(cd "$HERE/.." && pwd)"
CLAUDE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills"
FORCE="${1:-}"

for name in inventory-demand-planning returns-reverse-logistics; do
  if [[ -d "$CLAUDE/$name" && "$FORCE" != "--force" ]]; then
    echo "ERROR: $CLAUDE/$name exists. Re-run with --force." >&2
    exit 1
  fi
done

mkdir -p "$CLAUDE/inventory-demand-planning" "$CLAUDE/returns-reverse-logistics"
cp "$PRODUCT/payload/inventory-demand-planning.md" "$CLAUDE/inventory-demand-planning/SKILL.md"
cp "$PRODUCT/payload/returns-reverse-logistics.md" "$CLAUDE/returns-reverse-logistics/SKILL.md"

echo "Installed Retail Ops AI Pack to $CLAUDE"

#!/usr/bin/env bash
# Install Founder Finance Pack skills (markdown-only).

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODUCT="$(cd "$HERE/.." && pwd)"
CLAUDE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills"
FORCE="${1:-}"

SKILLS=(cfo-advisor financial-analyst saas-metrics-coach investor-materials investor-outreach board-deck-builder)

for name in "${SKILLS[@]}"; do
  if [[ -d "$CLAUDE/$name" && "$FORCE" != "--force" ]]; then
    echo "ERROR: $CLAUDE/$name exists. Re-run with --force." >&2
    exit 1
  fi
done

for name in "${SKILLS[@]}"; do
  mkdir -p "$CLAUDE/$name"
  cp "$PRODUCT/payload/$name.md" "$CLAUDE/$name/SKILL.md"
done

echo "Installed Founder Finance Pack (${#SKILLS[@]} skills) to $CLAUDE"

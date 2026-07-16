#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODUCT="$(cd "$HERE/.." && pwd)"
CLAUDE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills"
CODEX_ROOT="${CODEX_SKILLS_DIR:-.agents/skills}"
FORCE="${1:-}"

for name in hooks-angles content-humanizer ugc-scriptwriter trending-content audio-overview; do
  if [[ -d "$CLAUDE/$name" && "$FORCE" != "--force" ]]; then
    echo "ERROR: $CLAUDE/$name exists. Re-run with --force." >&2
    exit 1
  fi
done

for name in hooks-angles content-humanizer ugc-scriptwriter trending-content audio-overview; do
  mkdir -p "$CLAUDE/$name"
  cp "$PRODUCT/payload/$name.md" "$CLAUDE/$name/SKILL.md"
  if [[ -d "$CODEX_ROOT" || "$FORCE" == "--force" ]]; then
    mkdir -p "$CODEX_ROOT/$name"
    cp "$PRODUCT/payload/$name.md" "$CODEX_ROOT/$name/SKILL.md"
  fi
done

echo "Installed Content Engine Pack (5 skills) to $CLAUDE"
chmod +x "$HERE/setup.sh"

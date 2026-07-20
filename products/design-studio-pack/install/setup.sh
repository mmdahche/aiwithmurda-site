#!/usr/bin/env bash
# Install Design Studio Pack skills (markdown-only).

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODUCT="$(cd "$HERE/.." && pwd)"
CLAUDE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills"
CODEX_ROOT="${CODEX_SKILLS_DIR:-.agents/skills}"
FORCE="${1:-}"

SKILLS=(design-contract anti-slop-audit motion-framework ui-critique)

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

if [[ -d "$CODEX_ROOT" || "$FORCE" == "--force" ]]; then
  for name in "${SKILLS[@]}"; do
    mkdir -p "$CODEX_ROOT/$name"
    cp "$PRODUCT/payload/$name.md" "$CODEX_ROOT/$name/SKILL.md"
  done
fi

echo "Installed Design Studio Pack (${#SKILLS[@]} skills) to $CLAUDE"

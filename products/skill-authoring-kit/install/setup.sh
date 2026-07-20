#!/usr/bin/env bash
# Install Skill Authoring Kit — the `write-a-skill` authoring workflow.
#
# Usage:
#   bash install/setup.sh          # refuse if $CLAUDE/write-a-skill exists
#   bash install/setup.sh --force  # overwrite existing install
#
# Env overrides:
#   CLAUDE_CONFIG_DIR   default: $HOME/.claude
#   CODEX_SKILLS_DIR    default: .agents/skills (relative to cwd)

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODUCT="$(cd "$HERE/.." && pwd)"
CLAUDE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills"
CODEX_ROOT="${CODEX_SKILLS_DIR:-.agents/skills}"
FORCE="${1:-}"

if [[ -d "$CLAUDE/write-a-skill" && "$FORCE" != "--force" ]]; then
  echo "ERROR: $CLAUDE/write-a-skill exists. Re-run with --force to overwrite." >&2
  exit 1
fi

mkdir -p "$CLAUDE/write-a-skill"
cp "$PRODUCT/install/claude-code/write-a-skill.md" "$CLAUDE/write-a-skill/SKILL.md"

if [[ -d "$CODEX_ROOT" || "$FORCE" == "--force" ]]; then
  mkdir -p "$CODEX_ROOT/write-a-skill"
  cp "$PRODUCT/install/codex/write-a-skill/SKILL.md" "$CODEX_ROOT/write-a-skill/SKILL.md"
fi

echo "Installed Skill Authoring Kit to $CLAUDE/write-a-skill"
echo "Reference docs (description-writing, placement-guide, validation-tdd,"
echo "skill-template) live in $PRODUCT/payload/ — read as needed while authoring."

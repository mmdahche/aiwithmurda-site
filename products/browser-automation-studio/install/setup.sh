#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODUCT="$(cd "$HERE/.." && pwd)"
CLAUDE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills"
CODEX_ROOT="${CODEX_SKILLS_DIR:-.agents/skills}"
FORCE="${1:-}"

if [[ -d "$CLAUDE/browser-automation" && "$FORCE" != "--force" ]]; then
  echo "ERROR: $CLAUDE/browser-automation exists. Re-run with --force." >&2
  exit 1
fi

mkdir -p "$CLAUDE/browser-automation"
cp "$PRODUCT/payload/browser-automation.md" "$CLAUDE/browser-automation/SKILL.md"

if [[ -d "$CODEX_ROOT" || "$FORCE" == "--force" ]]; then
  mkdir -p "$CODEX_ROOT/browser-automation"
  cp "$PRODUCT/payload/browser-automation.md" "$CODEX_ROOT/browser-automation/SKILL.md"
fi

echo "Installed Browser Automation Studio to $CLAUDE/browser-automation"
chmod +x "$HERE/setup.sh"

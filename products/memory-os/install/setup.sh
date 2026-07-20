#!/usr/bin/env bash
# Install Memory OS — three command-skills (dispatch, handoff, resume).
#
# This script installs ONLY the commands. Identity + memory templates
# (SOUL.md, MEMORY.md, AGENTS-ADDON.md, daily-note.md, workspace-map.md) live
# in payload/templates/ and get filled and placed per your addon's paths —
# see 00-START-HERE.md for the boot ritual and template placement.
#
# Usage:
#   bash install/setup.sh          # refuse if any command dir exists
#   bash install/setup.sh --force  # overwrite existing installs
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

SKILLS=(dispatch handoff resume)

for name in "${SKILLS[@]}"; do
  if [[ -d "$CLAUDE/$name" && "$FORCE" != "--force" ]]; then
    echo "ERROR: $CLAUDE/$name exists. Re-run with --force to overwrite." >&2
    exit 1
  fi
done

for name in "${SKILLS[@]}"; do
  mkdir -p "$CLAUDE/$name"
  cp "$PRODUCT/install/claude-code/$name.md" "$CLAUDE/$name/SKILL.md"
done

if [[ -d "$CODEX_ROOT" || "$FORCE" == "--force" ]]; then
  for name in "${SKILLS[@]}"; do
    mkdir -p "$CODEX_ROOT/$name"
    cp "$PRODUCT/install/codex/$name/SKILL.md" "$CODEX_ROOT/$name/SKILL.md"
  done
fi

echo "Installed Memory OS commands (dispatch, handoff, resume) to $CLAUDE"
echo "Next: fill and place the identity + memory templates from"
echo "$PRODUCT/payload/templates/ — see 00-START-HERE.md."

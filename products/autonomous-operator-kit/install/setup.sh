#!/usr/bin/env bash
# Install Autonomous Operator Kit — six cycle command-skills.
#
# This script installs ONLY the six commands (/operator-cycle, /depth-check,
# /cycle-brief, /cycle-goal, /cycle-evolve, /schedule-task). It does NOT
# bootstrap the ~/.operator-cycle/ root — follow payload/bootstrap.md § 1-2
# for that (template placement, config, git author, wake-up wiring).
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

SKILLS=(cycle-brief cycle-evolve cycle-goal depth-check operator-cycle schedule-task)

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

echo "Installed Autonomous Operator Kit (6 commands) to $CLAUDE"
echo "Next: run payload/bootstrap.md § 1-2 to create ~/.operator-cycle/,"
echo "arm the write-boundary, and wire the wake-up mechanism. First cycle"
echo "runs ATTENDED — the VERIFY checklist is the on-ramp to unattended."

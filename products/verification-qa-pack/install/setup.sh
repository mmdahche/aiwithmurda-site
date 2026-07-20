#!/usr/bin/env bash
# Install Verification & QA Pack — six discipline skills.
#
# Usage:
#   bash install/setup.sh          # refuse if any skill dir exists
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

SKILLS=(ai-blind-spot-testing qa qa-only state-sequence-audit test-gap-detector verify-before-claiming)

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

echo "Installed Verification & QA Pack (6 skills) to $CLAUDE"
echo "Note: verify-before-claiming also ships inside Safe-Autonomy Guardrails —"
echo "the same canonical file. If you own both packs, install it once."

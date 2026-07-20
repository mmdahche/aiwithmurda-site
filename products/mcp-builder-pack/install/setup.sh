#!/usr/bin/env bash
# Install MCP Builder Pack — four design and build skills.
#
# The skills themselves are pure markdown, no dependencies. To follow the
# TypeScript worked example inside mcp-server-build (build and run the
# changelog-query server), you also need Node 20+ and two npm packages the
# walkthrough installs: @modelcontextprotocol/sdk and zod.
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

SKILLS=(agent-action-space mcp-server-build mcp-server-patterns regex-vs-llm)

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

echo "Installed MCP Builder Pack (4 skills) to $CLAUDE"
echo "Worked example: examples/changelog-mcp-walkthrough.md — copy the TS"
echo "source, npm install @modelcontextprotocol/sdk zod, build, run."

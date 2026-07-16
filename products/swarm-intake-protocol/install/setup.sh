#!/usr/bin/env bash
# Install Swarm Intake Protocol skill + bundled lib/templates/tests.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODUCT="$(cd "$HERE/.." && pwd)"
CLAUDE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/swarm-intake"
FORCE="${1:-}"

if [[ -d "$CLAUDE" && "$FORCE" != "--force" ]]; then
  echo "ERROR: $CLAUDE exists. Re-run with --force to overwrite." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 required for readiness_check.py and tests." >&2
  exit 1
fi

mkdir -p "$CLAUDE/lib" "$CLAUDE/templates" "$CLAUDE/tests"

cp "$PRODUCT/payload/swarm-intake.md" "$CLAUDE/SKILL.md"
cp "$PRODUCT/payload/G10-manifest.yaml" "$CLAUDE/" 2>/dev/null || true
cp "$PRODUCT/payload/lib/readiness_check.py" "$PRODUCT/payload/lib/readiness_check.sh" "$CLAUDE/lib/"
chmod +x "$CLAUDE/lib/readiness_check.sh"
cp -R "$PRODUCT/payload/templates/." "$CLAUDE/templates/"
cp -R "$PRODUCT/payload/tests/." "$CLAUDE/tests/"

echo "Installed Swarm Intake Protocol to $CLAUDE"
echo "Verify: PYTHONUTF8=1 python3 -m pytest \"$CLAUDE/tests/\" -q"
echo "Verify: \"$CLAUDE/lib/readiness_check.sh\" \"$CLAUDE/tests/fixtures/ready\" --format human"

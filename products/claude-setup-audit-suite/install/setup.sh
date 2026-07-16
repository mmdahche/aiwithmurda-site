#!/usr/bin/env bash
# Install Claude Setup Audit Suite skills into Claude Code layout.
# Copies four skills + bundled scripts. Safe to re-run; use --force to overwrite.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODUCT="$(cd "$HERE/.." && pwd)"
CLAUDE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SKILLS="$CLAUDE/skills"
FORCE="${1:-}"

if [[ "$FORCE" != "--force" ]]; then
  for name in audit-setup context-budget eval skill-security-auditor; do
    if [[ -d "$SKILLS/$name" ]]; then
      echo "ERROR: $SKILLS/$name exists. Re-run with --force to overwrite." >&2
      exit 1
    fi
  done
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 required for audit-collect.py and skill_security_auditor.py." >&2
  exit 1
fi

mkdir -p "$SKILLS/audit-setup" "$SKILLS/context-budget" "$SKILLS/eval" "$SKILLS/skill-security-auditor/scripts" "$SKILLS/skill-security-auditor/references"

cp "$PRODUCT/payload/audit-setup.md" "$SKILLS/audit-setup/SKILL.md"
cp "$PRODUCT/payload/audit-collect.py" "$SKILLS/audit-setup/audit-collect.py"
chmod +x "$SKILLS/audit-setup/audit-collect.py"

cp "$PRODUCT/payload/context-budget.md" "$SKILLS/context-budget/SKILL.md"

cp "$PRODUCT/payload/eval.md" "$SKILLS/eval/SKILL.md"
cp "$PRODUCT/payload/run-evals.sh" "$SKILLS/eval/run-evals.sh"
cp "$PRODUCT/payload/scenarios.json" "$SKILLS/eval/scenarios.json"
cp "$PRODUCT/payload/eval-rubric.md" "$SKILLS/eval/eval-rubric.md"
chmod +x "$SKILLS/eval/run-evals.sh"

cp "$PRODUCT/payload/skill-security-auditor.md" "$SKILLS/skill-security-auditor/SKILL.md"
cp "$PRODUCT/payload/scripts/skill_security_auditor.py" "$SKILLS/skill-security-auditor/scripts/skill_security_auditor.py"
cp "$PRODUCT/payload/threat-model.md" "$SKILLS/skill-security-auditor/references/threat-model.md"
chmod +x "$SKILLS/skill-security-auditor/scripts/skill_security_auditor.py"

echo "Installed Claude Setup Audit Suite to $SKILLS"
echo "Verify: python3 $SKILLS/audit-setup/audit-collect.py | head -5"
echo "Verify: sh $SKILLS/eval/run-evals.sh"

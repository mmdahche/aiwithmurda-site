---
name: skill-security-auditor
description: Security audit for AI agent skills before installation. Use when evaluating an untrusted skill, auditing a skill directory or git repo, or gating a plugin install. Scans scripts for dangerous patterns, SKILL.md for prompt injection, dependencies for supply-chain risks, and file structure for boundary violations. Triggers include "audit this skill", "is this skill safe", "scan skill before install".
---

# Skill Security Auditor

Static scan of an AI agent skill package. Produces **PASS / WARN / FAIL** with
findings and remediation guidance.

## Quick start

```bash
python3 ~/.claude/skills/skill-security-auditor/scripts/skill_security_auditor.py /path/to/skill/

python3 ~/.claude/skills/skill-security-auditor/scripts/skill_security_auditor.py /path/to/skill/ --strict

python3 ~/.claude/skills/skill-security-auditor/scripts/skill_security_auditor.py /path/to/skill/ --json
```

## What gets scanned

1. **Code execution risks** — `eval`, `exec`, `os.system`, shell=True subprocess, obfuscation, network exfiltration, credential harvesting
2. **Prompt injection** — override phrases, role hijacks, hidden instructions in SKILL.md and references
3. **Dependencies** — unpinned packages, install commands inside scripts, typosquat patterns
4. **Structure** — writes outside the skill dir, unexpected binaries, symlinks escaping the package

Full pattern catalog: `~/.claude/skills/skill-security-auditor/references/threat-model.md`
(copy shipped in this product's payload as `threat-model.md`).

## Verdicts

- **PASS** — No critical or high findings. Safe to install after your own review.
- **WARN** — High/medium findings. Read each one before installing.
- **FAIL** — Critical findings. Do not install without remediation.

## Workflow

1. Run the scanner on the skill directory (or clone to temp first).
2. Read findings grouped by severity.
3. Fix or reject the skill based on the report.
4. Re-scan after any upstream update.

## Limitations

Static analysis only — no sandbox execution. Logic bombs and novel obfuscation may
evade pattern checks. When in doubt, do not install; ask the author.

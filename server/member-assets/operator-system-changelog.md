# Operator System Changelog

## 1.1.0 - 2026-07-10

Access: Active Operator System Updates membership

### Added

- Compatibility Audit skill
- Skill Upgrade Review skill
- Release Migration skill
- System Health Check skill
- Claude Code + Codex Compatibility Matrix
- Versioned update and rollback workflow

### Changed

- Update releases now separate permanent launch-edition access from recurring update-channel access.
- Every release requires migration notes, verification evidence, and rollback guidance.

### Migration

1. Save the current `docs/operator-system/version.md` and skill directories.
2. Read COMPATIBILITY.md.
3. Run Skill Upgrade Review before copying any changed folder.
4. Add the four update-channel skills only if you will use the release workflow.
5. Run System Health Check.
6. Set installed version to 1.1.0 after verification passes.

### Rollback

Remove the four 1.1.0 skill folders, restore the saved version file, start a clean agent session, and rerun the 1.0.0 verification receipt.

### Verification

- ZIP contains matching Claude Code and Codex project layouts.
- Every skill has valid frontmatter, workflow, return, and guardrail sections.
- Compatibility references reviewed 2026-07-10.

## 1.0.0 - 2026-07-10

Access: Permanent Operator Toolkit launch edition

### Added

- 24-skill customer-safe installation pack
- System Installation Guide
- Dual-Agent Command Center
- Project Instruction Pack
- Dual-Agent Collaboration Protocol
- Automation Recipe Library
- Design + QA System
- Research + Launch System
- Client Delivery System
- Weekly Operator Review
- System Verification + Recovery

### Ownership

The 1.0.0 launch edition remains available after the monthly update subscription ends.

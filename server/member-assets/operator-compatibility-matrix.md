# Claude Code + Codex Compatibility Matrix

Operator System version: 1.1.0

Last reviewed: 2026-07-10

Tool behavior changes. Recheck official documentation before recording a lesson or publishing a compatibility update.

| Capability | Claude Code | Codex | Operator Toolkit rule |
| --- | --- | --- | --- |
| Project guidance | `CLAUDE.md` | `AGENTS.md` | Keep shared facts aligned; import shared guidance only where supported and verified. |
| Project skills | `.claude/skills/<name>/SKILL.md` | `.agents/skills/<name>/SKILL.md` | Install selected project skills; inspect every file first. |
| Start session | `claude` | `codex` | Start from the intended project directory. |
| Version check | `claude --version` | `codex --version` | Record versions without tokens or account data. |
| Permissions | Review command and file prompts | Review configured permissions and approvals | Do not enable broad bypass modes for beginner or customer setups. |
| Read-only start | Ask for inspection with no edits | Ask for inspection with no edits | Both agents must explain the project before implementation. |
| Durable context | Project guidance and documented project files | Project guidance and documented project files | Do not rely on transcript memory for critical facts. |

## Official references

- Claude Code quickstart: https://code.claude.com/docs/en/quickstart
- Claude Code memory: https://code.claude.com/docs/en/memory
- Claude Code skills: https://code.claude.com/docs/en/skills
- Claude Code security: https://code.claude.com/docs/en/security
- Codex CLI: https://developers.openai.com/codex/cli/
- Codex customization: https://developers.openai.com/codex/concepts/customization/

## Reviewed installation paths

Claude Code native installer:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Claude Code macOS Homebrew option:

```bash
brew install --cask claude-code
```

Codex standalone installer for macOS and Linux:

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

Open the official page and inspect the command before running a remote installer.

## Update review checklist

- [ ] Official docs reviewed on the release date.
- [ ] Install and version commands tested in a disposable environment.
- [ ] Project guidance loading verified.
- [ ] Project skill discovery verified.
- [ ] Permission language reviewed.
- [ ] Deprecated commands removed.
- [ ] Migration and rollback written.
- [ ] Compatibility receipt attached to the changelog.

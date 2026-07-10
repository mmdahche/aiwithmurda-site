# Install + Verify Pack

Last curriculum review: 2026-07-10.

Tool installation changes over time. Open the official page before running an installer and prefer the method currently marked recommended.

## Official sources

- Claude Code quickstart: https://code.claude.com/docs/en/quickstart
- Claude Code advanced setup: https://code.claude.com/docs/en/getting-started
- Claude Code security: https://code.claude.com/docs/en/security
- Codex CLI: https://developers.openai.com/codex/cli/
- Codex customization: https://developers.openai.com/codex/concepts/customization/

## Claude Code

Current official native installer for macOS, Linux, and WSL:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Current Homebrew option for macOS:

```bash
brew install --cask claude-code
```

Start and authenticate:

```bash
cd /path/to/your/practice-project
claude
```

Verify:

```bash
claude --version
claude auth status --text
```

## Codex

Current official standalone installer for macOS and Linux:

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

Start and authenticate:

```bash
cd /path/to/your/practice-project
codex
```

Inside Codex, use `/status` to inspect the session configuration and `/permissions` to review what the agent is allowed to do.

Verify from the shell:

```bash
codex --version
```

## Git

Verify:

```bash
git --version
```

If Git is unavailable, install it from https://git-scm.com/downloads or your operating system package manager before creating checkpoints.

## Toolchain receipt

```markdown
# Toolchain Receipt

Date:
Operating system and version:
Shell or app surface:
Git version:
Claude Code version or app receipt:
Claude account type:
Codex version or app receipt:
Codex sign-in method:
Practice project path:
Unexpected permission prompt:
Issue solved:
```

## Diagnose before reinstalling

1. Confirm the terminal or app is pointed at the intended project.
2. Run the version check.
3. Run the tool's authentication status command where available.
4. Close and reopen the terminal after a new install changes the PATH.
5. Use the official troubleshooting page for the exact error.
6. After two failed attempts, stop and write down the exact command and complete error.

## Never include in a support message

- API keys or access tokens
- Passwords or recovery codes
- Full `.env` contents
- Customer records
- Payment dashboard screenshots with private data
- Private repository URLs unless the support channel is authorized

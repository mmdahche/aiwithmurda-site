# The Operator Toolkit - System Installation Guide

Version: 1.0.0

The goal is a verified operating system, not the largest possible skills folder. Install in stages, test each stage, and preserve a restore point.

## What you own permanently

- The 24-skill launch-edition pack
- Dual-Agent Command Center
- Project Instruction Pack
- Claude Code + Codex collaboration protocol
- Automation, design, research, launch, client-delivery, weekly-review, and verification systems

Monthly updates are a separate access channel. Canceling updates does not remove these launch-edition files.

## Stage 0 - Protect the machine

Before opening an agent:

1. Choose one dedicated practice project.
2. Keep the project outside your home-directory root and outside unrelated business folders.
3. Confirm `.env`, credentials, exports, customer data, and local secrets are ignored by Git.
4. Do not paste API keys, passwords, private URLs, or full environment files into either agent.
5. Create a clean Git checkpoint or a separate disposable project.

Stop if you cannot explain which folder the agent can access.

## Stage 1 - Verify the toolchain

Run only commands you understand:

```bash
git --version
claude --version
codex --version
```

Open the project separately in each agent. Ask both:

```text
Do not edit anything. Confirm the working directory, list the files you can see, explain what this project appears to do, and name any secret or generated files that should be protected.
```

Save the result in `docs/operator-system/setup-receipt.md`.

## Stage 2 - Create the command center

Add:

```text
PROJECT-BRIEF.md
AGENTS.md
CLAUDE.md
docs/operator-system/
  setup-receipt.md
  evidence-log.md
  handoff.md
  version.md
```

Use the Project Instruction Pack. Replace every placeholder with verified project facts. Never leave an invented install, test, build, migration, or deployment command in project guidance.

Set `docs/operator-system/version.md` to:

```markdown
# Operator System Version

Installed: 1.0.0
Installed on:
Installed by:
Skill collections:
Project checkpoint:
Last health check:
```

## Stage 3 - Select skill collections

Start with six foundation skills:

- Project Map
- Requirement Brief
- Build One Slice
- Environment Audit
- Scope Guard
- Context Handoff

Then add one collection tied to current work:

- Build + Quality for software changes
- Design + Product for interface work
- Operations + Growth for automations, offers, launches, or recurring workflows

Do not install all 24 into every project by default. A smaller relevant set creates clearer triggers and easier maintenance.

## Stage 4 - Install project-scoped skills

From the ZIP:

- Claude Code source: `claude/.claude/skills/`
- Codex source: `codex/.agents/skills/`

Copy selected skill folders into the matching path inside the project. Read each `SKILL.md` before copying it.

After installation, ask the agent to list project skills and explain when each should trigger. If it cannot distinguish two skills, remove or revise the overlap before proceeding.

## Stage 5 - Run the first system test

Use one small real task:

1. Run Project Map without edits.
2. Run Requirement Brief on the task.
3. Run Build One Slice.
4. Use the other agent for Code Review.
5. Run User Path Test and Verify Before Done.
6. Write Context Handoff.

The task is complete only when the user path works and the evidence log records what was run.

## Stage 6 - Save the baseline

Record:

- Agent versions
- Installed skill slugs
- Project instructions
- Git checkpoint
- Test commands and results
- One successful workflow receipt
- Known limits
- Restore procedure

Create a release tag or named commit only if that matches the project's existing Git policy.

## Update discipline

Before applying a monthly release:

1. Read the changelog and compatibility matrix.
2. Back up customized instruction and skill files.
3. Run Skill Upgrade Review on changed skills.
4. Apply the release in a disposable branch or project.
5. Run System Health Check.
6. Promote or roll back.

Never overwrite a customized skill blindly.

## Installation completion receipt

```markdown
# Operator Toolkit Installation Receipt

Date:
Project:
Operator System version:
Claude Code version:
Codex version:
Installed collections:
Skills installed:
Protected paths verified:
Project commands verified:
First task shipped:
Builder agent:
Reviewer agent:
Checks run:
Evidence:
Known limits:
Restore point:
Next system review:
```

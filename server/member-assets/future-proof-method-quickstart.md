# The Future Proof Method - 60-Minute Quickstart

Goal: finish one safe first session with Claude Code and Codex. Do not build a full app in this hour.

## Minute 0-10 - Choose your surfaces

- [ ] Choose where you will use Claude Code: terminal, desktop, or IDE.
- [ ] Choose where you will use Codex: terminal, desktop, or IDE.
- [ ] Confirm you can sign in to both accounts.
- [ ] Open the Install + Verify Pack for current official setup links.

Use one surface per tool for the course. Extra installations create extra confusion.

## Minute 10-25 - Verify the toolchain

Run only the checks that match your setup:

```text
git --version
claude --version
codex --version
```

Save the output in a setup note. If a command is unavailable, stop and use the troubleshooting guide instead of trying random fixes.

## Minute 25-35 - Create the practice project

Create a dedicated folder. Do not start in your home directory, Downloads folder, or an important company repository.

Recommended structure:

```text
future-proof-practice/
  README.md
  notes/
    setup-receipt.md
```

Put this in `README.md`:

```markdown
# Future Proof Practice

This is a disposable practice project for learning Claude Code and Codex.

First outcome: both agents can inspect this folder, explain it, and wait for a scoped task.
```

## Minute 35-50 - Run the same read-only prompt twice

Open the practice folder in Claude Code and run:

```text
Do not edit anything yet. Tell me what files you can see, what this project appears to be for, and the safest first task for a beginner. Wait for my approval before changing anything.
```

Run the same prompt in Codex.

Record:

- Which explanation was clearer?
- Did either tool make an incorrect assumption?
- Did either tool ask for a permission you did not expect?
- Which working directory did each tool report?

## Minute 50-60 - Save the setup receipt

```markdown
# Setup Receipt

Date:
Operating system:
Claude Code surface:
Codex surface:
Git check:
Claude Code check:
Codex check:
Practice project path:
First Claude Code result:
First Codex result:
Issue solved:
Next task: Open Module 1 and complete the remaining setup checks.
```

## Safety rules

- Never paste passwords, API keys, recovery codes, or private customer data into chat.
- Keep `.env` and secret files out of source control.
- Read a command before approving it.
- Ask the agent to explain unfamiliar commands in plain language.
- Do not use broad permission-bypass modes while learning.
- Keep production payment, hosting, DNS, and customer systems outside the practice project.

Done means both agents can enter one safe project, explain it, and wait for direction.

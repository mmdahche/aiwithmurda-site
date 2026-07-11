# Placement Guide — where skills live, per agent

The same SKILL.md content works in both major agents; only the folder layout
differs. The second decision — personal vs project — matters more than most
people expect.

## Claude Code

| Scope | Path | When |
|---|---|---|
| Personal (follows you everywhere) | `~/.claude/skills/<name>/SKILL.md` (or a flat `~/.claude/skills/<name>.md` for simple single-file skills, surfaced as commands per your setup) | Workflows you use across every project: review discipline, research, writing style |
| Project (travels with the repo) | `<project>/.claude/skills/<name>/SKILL.md` | Anything referencing this project's commands, paths, or conventions |
| Slash command | `~/.claude/commands/<name>.md` | Explicit-invoke workflows you fire by name |

## Codex

| Scope | Path | When |
|---|---|---|
| Project | `<project>/.agents/skills/<name>/SKILL.md` | Same rule: project facts stay in the project |
| Personal | `~/.agents/skills/<name>/SKILL.md` (check your Codex version's discovery paths) | Cross-project workflows |

## The placement rule

Ask one question: **"Would this skill be wrong in a different project?"**

- Yes (it names commands, paths, schemas of THIS project) → project scope.
- No (it's a way of working) → personal scope.

Mixing them is the classic failure: a personal skill that hardcodes one
project's `npm run` commands silently corrupts your work in every other
repo. Project facts belong in project scope, full stop.

## Layer discipline (skills vs instructions vs one-shots)

- **Always-loaded instructions** (CLAUDE.md / AGENTS.md): durable project
  facts every session needs — stack, commands, boundaries. Small.
- **Skills**: on-demand procedures with a trigger. Loaded when relevant.
- **One-shot prompts**: things that won't recur. Don't codify these at all.

Putting a one-time task in a skill clutters the picker. Putting a permanent
project fact in a skill hides it from sessions that need it always. When in
doubt: recurring + triggered = skill; permanent + universal = instructions;
neither = just do it.

## Install checklist (either agent)

1. Copy the folder/file to the target path.
2. Confirm discovery: ask the agent "what skills do you have for <topic>?"
   or invoke explicitly by name.
3. Fire it once on a real (safe) case before trusting it — see
   `validation-tdd.md` for the rigorous version.

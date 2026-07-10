# Troubleshooting Guide

Rule: two failed attempts on the same problem means stop, capture evidence, and diagnose before trying another fix.

## 1. Command not found

Capture:

- Exact command
- Full error
- Operating system and shell
- Installation method
- Version check result

Check in order:

1. Close and reopen the terminal.
2. Confirm the official installer completed.
3. Ask the shell where it looks for the command.
4. Check the current official setup page for the installed method.
5. Avoid installing the same tool through multiple package managers.

## 2. Login or account loop

1. Run the tool's authentication status command where available.
2. Confirm you are using the intended account type.
3. Complete browser authentication in the same local session.
4. Do not paste tokens into chat.
5. If the account lacks access, solve account access before reinstalling the CLI.

## 3. Agent cannot find the project

1. Run `pwd` or inspect the current folder in the app.
2. Confirm the project exists at that path.
3. Start the agent from the project directory.
4. Ask the agent to list visible top-level files before editing.
5. Do not grant access to your entire home directory as a shortcut.

## 4. Agent ignores instructions

1. Confirm the correct AGENTS.md or CLAUDE.md is loaded.
2. Remove vague or conflicting rules.
3. Verify commands and file paths.
4. Move long procedures into an on-demand skill.
5. Rewrite the task with one user path, non-goals, and a stop condition.

## 5. Permission prompt is unclear

Use this script:

```text
Explain this command before I approve it. Break down every flag, files and services affected, network use, reversibility, and the safest read-only alternative.
```

Do not approve if the command touches secrets, production systems, broad parent directories, or destructive actions unrelated to the task.

## 6. Build or test fails

1. Reproduce the exact failure.
2. Record the first meaningful error, not only the final summary.
3. Identify whether the failure is install, configuration, compile, test, runtime, data, or browser behavior.
4. Rank likely causes by evidence.
5. Change one cause at a time.
6. Rerun the original reproduction after the fix.
7. Run one nearby regression check.

## 7. The agent keeps expanding scope

Paste:

```text
Compare the current work with the approved build brief. Separate required changes, accidental expansion, and unrelated cleanup. Preserve the smallest working path, move optional ideas into a next-build list, and return to the agreed stop condition.
```

## 8. The page looks right but behaves wrong

1. Test with a fresh session or clean browser state.
2. Exercise the real click, submit, error, loading, and success states.
3. Check desktop and mobile sizes.
4. Inspect console and network errors.
5. Verify data persistence after refresh when persistence is promised.

## 9. The skill does not trigger

1. Confirm the directory and `SKILL.md` filename are correct.
2. Read the description and make the trigger more specific.
3. Invoke the skill explicitly.
4. Restart the surface only if it did not detect a newly created top-level skill directory.
5. Remove naming conflicts and test in the practice project.

## Rescue receipt

```markdown
# Rescue Receipt

Goal:
Exact failure:
Reproduction:
Layer:
Attempt 1 and result:
Attempt 2 and result:
Evidence collected:
Most likely cause:
Next bounded test:
What I will not try yet:
```

# Core Prompt Scripts

Replace bracketed fields with real context. Do not paste secrets or private customer data.

## Script 1 - Inspect first

```text
Inspect the project before editing. Map [USER PATH OR FEATURE], cite the relevant files, explain the current behavior, list the main risks, and tell me what you still need to know. Do not change files yet.
```

## Script 2 - Build brief

```text
Turn this request into a narrow build brief.

User: [WHO]
Current problem: [PAIN]
Requested outcome: [VISIBLE RESULT]

Return:
1. Current state
2. One user path
3. Smallest useful change
4. Explicit non-goals
5. Likely files
6. Risks and edge cases
7. Verification path
8. Stop condition

Ask questions only when the answer cannot be discovered from the project and a wrong assumption would be costly.
```

## Script 3 - Implement one slice

```text
Implement the approved build brief. Keep the change inside the stated user path and non-goals. Use existing project patterns. After each meaningful change, run the narrowest useful check. Do not add abstractions, dependencies, or adjacent features unless they are required for the promised outcome.
```

## Script 4 - Verify before done

```text
Do not summarize yet. Verify the actual user path from a clean enough state to expose hidden assumptions. Run the relevant tests and build checks, inspect the diff for unrelated changes and secrets, and report:

- Checks run
- User path tested
- Evidence that passed
- Anything not tested
- Remaining risk
- Exact files changed
```

## Script 5 - Second-agent review

```text
Act as the reviewer, not the implementer. Read the build brief, current diff, tests, and verification receipt. Find behavioral regressions, wrong assumptions, missing edge cases, security concerns, unrelated edits, and weak evidence. Lead with findings ordered by severity and cite files. If no issue is found, state the remaining test gap.
```

## Script 6 - Evidence-first debug

```text
We have a failure. Do not try random fixes. First reproduce it, capture the exact error, identify the layer where it occurs, and list the three most likely causes ranked by evidence. Test one hypothesis at a time. After the fix, rerun the original reproduction and one nearby regression check.
```

## Script 7 - Recover from scope drift

```text
Compare the current work with the original build brief. Separate required changes, accidental expansion, and unrelated cleanup. Preserve the smallest working path, move optional ideas into a next-build list, and propose the shortest route back to the agreed stop condition.
```

## Script 8 - Session handoff

```text
Write a concise handoff for the next AI session. Include the goal, current behavior, completed work, verification run, known limits, files touched, exact next action, and anything that must not be changed without approval. Do not include secrets or private customer data.
```

## Script 9 - Explain a command before approval

```text
Explain this command in plain language before I approve it. Break down every flag, state which files or services it can affect, whether it uses the network, whether it can be reversed, and the safer read-only alternative if one exists:

[COMMAND]
```

## Script 10 - Project instruction audit

```text
Audit the project's AGENTS.md, CLAUDE.md, rules, skills, and package scripts. Separate permanent facts, on-demand procedures, and one-time task instructions. Flag contradictions, stale commands, vague rules, secret risk, and context bloat. Propose the smallest clean structure.
```

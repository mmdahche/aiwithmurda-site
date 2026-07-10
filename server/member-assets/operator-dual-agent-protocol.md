# Dual-Agent Collaboration Protocol

The point of two agents is independent verification, not twice the uncontrolled output.

## Roles

### Human operator

- Owns the objective, approval, secrets, production access, and final decision.
- Chooses which agent builds and which reviews.
- Resolves conflicts and decides when scope changes.

### Builder agent

- Maps the relevant system.
- Writes the brief and implementation plan.
- Changes the smallest required surface.
- Runs focused checks and records evidence.

### Reviewer agent

- Reads the original brief, diff, and verification evidence.
- Challenges assumptions, regressions, security, data, billing, and missing states.
- Does not rewrite the feature unless asked after findings are accepted.

## Standard sequence

1. Human writes or approves the active brief.
2. Builder runs Project Map and Requirement Brief.
3. Builder implements one slice and updates the evidence log.
4. Human checkpoints the working tree.
5. Reviewer runs Code Review and identifies missing proof.
6. Builder resolves accepted findings.
7. Reviewer or builder runs User Path Test and Verify Before Done.
8. Human accepts, deploys through Safe Deploy when applicable, and writes Context Handoff.

## Handoff packet between agents

Provide:

- Objective and non-goals
- Relevant project guidance
- Current Git status and diff
- Files intentionally changed
- Checks run with results
- Real user-path evidence
- Known limits
- Specific review question

Do not provide:

- Full unrelated transcript history
- Credentials or environment values
- Private customer records
- Broad permission to change anything

## Conflict rules

When agents disagree:

1. Identify whether the disagreement is fact, risk tolerance, product decision, or style.
2. Verify facts from code, tests, or current primary documentation.
3. Give the human the smallest decision with tradeoffs.
4. Preserve the last working checkpoint.
5. Do not let both agents implement competing versions simultaneously.

## File ownership

For parallel work:

- Assign distinct files or modules.
- Name shared contracts that require coordination.
- Merge one verified change before starting another on the same boundary.
- Re-read changed files before editing if another operator was active.

## Review prompts

### Builder to reviewer

```text
Review this change against the attached brief and definition of done. Lead with behavioral bugs, security or data risks, billing or auth regressions, compatibility breaks, and missing user-path tests. Cite files and explain impact. Do not propose unrelated refactors.
```

### Reviewer challenge

```text
Assume the happy path works. Find the first realistic state that breaks: returning user, stale data, canceled payment, long content, mobile viewport, missing environment, partial migration, failed network, or interrupted deploy. Name the smallest test that proves or rejects each concern.
```

### Final acceptance

```text
Compare the original request, final diff, test output, and browser or API evidence. List exactly what is verified, what remains untested, and whether the work is ready to ship. Do not infer success from compilation alone.
```

## Stop conditions

Stop and ask the human when work requires:

- Production payment or customer impact
- Destructive data or Git actions
- Secret or credential access
- A new external dependency with material risk
- A change outside the approved non-goals
- An unresolved conflict after two evidence-based attempts

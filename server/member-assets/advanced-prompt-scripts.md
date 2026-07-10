# Advanced Prompt Scripts

Use these after the core operator loop is working. Replace brackets with real project facts.

## Architecture decision

```text
Evaluate [DECISION] against the current project rather than generic best practices. Identify constraints, existing patterns, migration cost, security and data impact, operational burden, reversibility, and verification. Compare at most three realistic options. Recommend one and state the assumptions that would change the recommendation. Do not implement yet.
```

## Safe refactor

```text
Refactor [AREA] without changing observable behavior. First map callers, contracts, tests, and runtime side effects. Define invariants and a rollback checkpoint. Make the smallest staged change, run narrow checks after each stage, then run the full relevant user path. Separate required cleanup from optional cleanup.
```

## Data or API migration

```text
Plan this migration with compatibility and rollback first. Map the old contract, new contract, readers, writers, data transformation, backfill, dual-read or dual-write needs, failure handling, observability, and rollback trigger. Identify which step is irreversible. Do not run a production migration without explicit approval.
```

## Dependency decision

```text
Determine whether [DEPENDENCY] is necessary. Compare the existing stack, standard-library option, maintenance status, bundle or runtime cost, security surface, license, lock-in, and removal path. Recommend installation only if it removes meaningful complexity. If installed, add the smallest integration and verify it through the real user path.
```

## Performance investigation

```text
Do not optimize from intuition. Reproduce the slow path, capture a baseline, identify the dominant layer, and propose the smallest measurable experiment. Change one variable at a time. Report before and after numbers, test conditions, tradeoffs, and whether the result is large enough to keep.
```

## Security boundary review

```text
Review [FEATURE OR DIFF] as a security boundary. Trace identity, authorization, input validation, secret handling, data exposure, logging, external calls, failure behavior, and abuse limits. Lead with concrete findings and evidence. Do not claim compliance or safety beyond what was verified.
```

## Production incident audit

```text
Separate containment, diagnosis, repair, and prevention. Build a timeline from logs and deploy history, identify user impact and current exposure, rank hypotheses by evidence, and recommend the smallest reversible containment. Preserve evidence. Do not deploy or change production without explicit approval.
```

## Cross-agent builder and reviewer

Builder prompt:

```text
Implement only the approved brief. Keep a decision log of assumptions, files changed, checks run, and anything not verified. Stop at the agreed success state and produce a review packet.
```

Reviewer prompt:

```text
Treat the builder's summary as an untrusted claim. Review the brief, diff, tests, and evidence directly. Find regressions, scope drift, security risk, weak verification, and undocumented behavior. Lead with findings and do not implement unless asked.
```

## Recovery after a long session

```text
Reconstruct the current state from the project, Git history, working tree, tests, and existing handoffs. Separate completed work, partial work, stale assumptions, and open risk. Recommend one exact next action that moves the original goal forward without restarting or broadening scope.
```

# Dual-Agent Review Loop

Use one agent as builder and the other as reviewer. Different agents do not guarantee correctness; role separation creates a second pass with a different instruction contract.

## When to use it

- Auth, payments, permissions, or private data
- Shared components or cross-module contracts
- Deployment and infrastructure changes
- Refactors with many callers
- UI changes where visual behavior matters
- Any task where the first agent made a costly wrong assumption

## Step 1 - Create the shared brief

The brief must name:

- User and problem
- Current behavior
- Requested outcome
- Non-goals
- Relevant constraints
- Verification path
- Stop condition

Both agents receive the same brief.

## Step 2 - Builder packet

```text
You are the builder. Inspect first, implement only the approved brief, keep the change narrow, and run project checks. Produce a review packet containing the brief, files changed, decisions, verification evidence, untested areas, and known risk. Do not ask the reviewer to trust your summary.
```

## Step 3 - Freeze the working version

Create a checkpoint before reviewer-driven changes. The reviewer needs a stable diff.

Record:

- Commit or saved version
- Test output
- User-path evidence
- Environment used

## Step 4 - Reviewer packet

```text
You are the reviewer. Do not continue implementation. Read the original brief, project guidance, current diff, tests, and verification evidence. Treat the builder summary as a claim to verify.

Find:
- Wrong assumptions
- Behavioral regressions
- Auth, payment, security, privacy, or data risk
- Missing edge states
- Scope drift and unrelated edits
- Weak or missing tests
- Claims not supported by evidence

Lead with findings ordered by severity and cite files. If no issue is found, state the remaining test gap and residual risk.
```

## Step 5 - Triage findings

Classify each finding:

- Must fix before ship
- Should fix soon
- Optional improvement
- Not applicable, with evidence

Do not let the reviewer turn the task into a redesign.

## Step 6 - Builder repair

```text
Address only the accepted reviewer findings. Preserve the original user path and non-goals. Add or update verification for every must-fix item. Report any finding that cannot be resolved without a product decision.
```

## Step 7 - Final verification

- [ ] Original user path passes.
- [ ] Must-fix findings are closed with evidence.
- [ ] New checks pass.
- [ ] Working tree contains no unrelated changes.
- [ ] README or handoff reflects the final state.
- [ ] Residual risk is explicit.

## Review receipt

- Builder:
- Reviewer:
- Brief:
- Checkpoint:
- Findings:
- Accepted fixes:
- Rejected findings and evidence:
- Final verification:
- Residual risk:

# Worked Example — Hardening an Overnight Agent Run

This is the exact layering the author uses before letting an agent work
unattended. Follow it once manually; afterwards it's a 2-minute preflight.

## The scenario

You want an agent to grind on a repo overnight: fix tests, refactor a module,
draft docs. Unattended means every failure class you didn't pre-block is one
you've accepted.

## Layer 1 — Boundaries before brains (2 min)

```text
/freeze ~/projects/the-repo/
```

The freeze-path-guard hook now denies any Edit/Write outside the repo. The
agent can be brilliant or confused — either way it edits one directory.

The destructive-command guard is already on (it's wired in settings, not
per-session): `rm -rf`, force-pushes to main, dirty hard resets, and
`git clean` all warn instead of executing silently.

## Layer 2 — Scope the credentials (3 min)

- The agent's tokens load from env via `kit.read_token("AGENT_TOKEN")` —
  never argv, never files with loose modes (`check_token_file_mode` verifies).
- If the overnight task only READS an external service, hand it the read
  token and enforce it in code:

```python
kit.require_scope(held=kit.READ, needed=kit.ACT)   # raises — a read session cannot act
```

- Anything irreversible stays locked: `kit.guard_action("delete")` raises
  unless you explicitly passed `allow=["delete"]` for this one run. Default
  posture: archive instead of delete, draft instead of send.

## Layer 3 — Scrub every egress (2 min)

Any line the run emits off-box — a notification, a log shipped anywhere, a
status webhook — goes through the firewall first:

```sh
MSG=$(printf '%s' "$RAW" | ~/.guardrails/redaction-firewall/firewall.sh) || exit 1
notify-send-or-webhook "$MSG"
```

Exit 2 means the scrubber itself failed — the message is dropped, not sent.
That's the fail-closed contract: no scrub, no send.

## Layer 4 — Honest record (1 min)

End-of-run notes go through the vault log, which scrubs before appending:

```sh
~/.guardrails/vault-index/vault.sh log --root ~/projects/the-repo \
  --message "overnight run: 14 tests fixed, module X refactored, 2 TODOs left" \
  --author agent
```

Append-only: the morning-you reads what actually happened, in order, with no
rewrites.

## Layer 5 — Verification before belief (morning-you, 5 min)

The agent says it finished. `/verify-before-claiming` is the discipline:

1. Run the test suite fresh yourself — its claim doesn't count.
2. Read the diff, not the summary.
3. One counter-check: pick the boldest claim in its notes and try to falsify
   it (run that path, open that file).

## What this stack does NOT cover (on purpose, know your edges)

- Network destinations (pair with deny-by-default egress rules / a proxy).
- Encoded secret blobs (the firewall matches literal text).
- A hostile human at the keyboard — these are accident-prevention layers.

Total preflight once practiced: ~2 minutes. Total cost of the failure classes
it blocks: your weekend, your repo history, or a rotated key at 3am.

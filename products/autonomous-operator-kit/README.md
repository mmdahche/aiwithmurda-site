# The Operator Cycle — Autonomous Operator Kit

Turn Claude Code into a persistent operator: one substantive, verified ship
per cycle, a fixed log + commit-trailer contract that a validator (or a
suspicious human) can audit, self-scheduled wake-ups where your platform
allows them — and the discipline stack that keeps an unattended loop honest:
depth ladder, anti-decay rotation, counter-action verification, null-result
honesty, and a diminishing-returns autostop.

## Who this is for

Ambitious solo builders who want compounding progress from unattended or
semi-attended agent time — and who'd rather have 5 verified ships and 2
honest nulls than 20 claimed successes. Requires comfort with git and your
platform's scheduler.

## Time to first value

~30 minutes to bootstrap + your first attended cycle. Unattended runs come
AFTER the verification checklist passes attended — that ordering is part of
the product.

## What's inside

| Piece | What it does |
|---|---|
| `/operator-cycle` | The loop: pre-cycle safety checks (write-boundary flag, human-directive halt, dead-work blocklist), 7-domain rotation with anti-decay forcing, depth ladder L1 (surface fix) → L6 (foundation rebuild) with a compounding rule, optional cheap-tier dispatch, counter-action before every ship, the exact ship procedure (log → state → commit → trailer validation), and the K-null autostop |
| `/depth-check` | Meta-audit: is the loop's claimed depth drifting from its actual depth? |
| `/cycle-brief` | Read-only digest of the last N cycles — the morning-after report |
| `/cycle-goal` | Goal mode: point the loop at a named objective with sub-goals; goal cycles interleave with free cycles on a modulo you set |
| `/cycle-evolve` | Bounded self-extension: the loop may grow a new skill/script when evidence warrants, with citation rules |
| `/schedule-task` | The wake-up wiring: scheduled wake-ups, launchd/cron/systemd/Task Scheduler patterns |
| `CYCLE-CONTRACT.md` | The auditable spec: inner-log entry format, state schema, commit trailer (`Cycle:/Depth:/Domain:/Duration:/Evidence:`), validation rules |
| `CYCLE-PITFALLS.md` | The failure modes already paid for: the log/trailer/sha chicken-and-egg, BSD sed, append-only discipline, firewall-block-as-finding |
| `templates/` + `bootstrap.md` | Fresh state/config/log/goal templates and the full init path |

## The honesty architecture (why this loop can be trusted unattended)

- **Counter-action:** before any ship, name ONE specific way the claim could
  still be wrong and check that exact thing.
- **Null honesty:** a cycle that found nothing says so. Target >20% nulls;
  a loop that never fails is performing, not investigating.
- **Anti-decay:** three same-domain cycles force a switch; three nulls force
  a hard switch; K low-value cycles trigger autostop with a briefing instead
  of an infinite idle burn.
- **Write boundary:** the loop writes only inside its own root and your
  allow-listed projects; a blocked write is recorded as a finding, never
  retried around.
- **No faked continuity:** sessions do not auto-continue, and the docs say
  so everywhere it matters. The wake-up mechanism is explicit wiring you do
  once, not an implied magic.

## Optional companion

The dispatch discipline (delegate >500-token generation to a cheap-tier
model) activates when you set `$ROUTER_CLI` to any classify-and-dispatch
CLI. The Three-Tier LLM Router from this same store fits the socket exactly;
the loop runs fine without it.

## What this is NOT

- Not an unattended-by-default tool: attended first runs and the VERIFY
  checklist are the required on-ramp.
- Not a bypass-permissions autopilot — the loop works WITH your permission
  gates and treats blocks as findings.
- No income or output promises. The receipts behind this product are the
  author's own logged cycles; yours will reflect your projects and your
  cadence.

## Support boundary

Digital product. Setup questions: murad@aiwithmurda.com. No custom loop
configuration included. See LICENSE for use terms.

## Lineage (honesty note)

The loop mechanism is a clean-room adaptation of an acquired autonomous-loop
pattern library, substantially adapted and extended by the author
(depth-ladder discipline, dispatch integration, honesty gates, autostop).
The receipts behind this product are the author's own logged cycles.

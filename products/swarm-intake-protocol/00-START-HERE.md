# START HERE — Swarm Intake Protocol

You bought the **project intake protocol**: the upstream discipline that makes
parallel agents build the right thing the first time — before anyone dispatches
work.

## First win in 3 steps (~30 minutes)

1. **Install:** run `bash install/setup.sh` (needs `python3` on PATH).
2. **Pick a throwaway repo** — greenfield folder or small existing project.
   Invoke the skill: "prep this project for parallel agents" / `/swarm-intake`.
3. **Run the readiness gate** on your scaffolded repo:
   ```bash
   ~/.claude/skills/swarm-intake/lib/readiness_check.sh ./your-project --format human
   ```
   NOT-READY → fix the listed checks → re-run until READY.

## Where everything is

- `payload/swarm-intake.md` — the 5-stage pipeline (S0 interview → S5 pilot)
- `payload/lib/readiness_check.py` — deterministic 10-check collector
- `payload/templates/` — repo scaffold artifacts (CLAUDE.md layers, CODEOWNERS, CI, tasks)
- `payload/tests/` — run `python3 -m pytest payload/tests/ -q` from skill root after install
- `examples/greenfield-intake-walkthrough.md` — end-to-end on a fake SaaS idea
- `VERIFY.md` — checklist we ran before shipping

## The one rule

**No dispatch until READY.** The collector is the gate — if it says NOT-READY,
fixing the intake artifacts is always cheaper than debugging three agents that
collided on the same file.

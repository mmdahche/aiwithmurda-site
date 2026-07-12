---
name: guard
description: Maximum-safety mode — combines /freeze (edit boundary) with the destructive-command-guard hook (warns before rm -rf, DROP TABLE, force-push, hard reset, etc.). Use when touching prod or debugging live systems. Triggers when the user says "guard mode", "full safety", "lock it down", "maximum safety", "prod mode", "I'm touching prod". Pairs with /unfreeze to release the edit boundary.
---

# /guard — Full safety mode

Two protections active simultaneously:

1. **Destructive command warnings** — `rm -rf`, `DROP TABLE`, `git push --force`, `git reset --hard`, `git clean`, etc. trigger a warning before executing. This runs from the pack's `destructive-command-guard.sh` hook (installed at `~/.claude/hooks/`) and is always on once wired, regardless of `/guard`. The skill makes the protection explicit so the user knows it's covering them.
2. **Edit boundary** — file Edit/Write restricted to one directory (delegates to `/freeze`, enforced by the pack's `freeze-path-guard.sh` hook).

The combination is for the highest-stakes work: production debugging, schema changes, force-pushes, anything that could lose data or break live systems.

## When to use

- The user says: "guard mode", "full safety", "lock it down", "maximum safety", "prod mode", "I'm touching prod"
- Investigating a live incident
- Schema migrations on production data
- First debugging session in a high-stakes module after a break
- Any time the cost of an accidental edit is severe

## When NOT to use

- Routine development → `/freeze` alone is enough; the destructive-command guard is already running by default once installed.
- Read-only investigation → no protection needed.
- The user needs to *bypass* a destructive guard intentionally → that's the override path on the warning itself, not `/guard`'s job.

## Phase 1 — Confirm the destructive guard is on

```bash
if [ -x "$HOME/.claude/hooks/destructive-command-guard.sh" ]; then
  echo "DESTRUCTIVE_GUARD: ACTIVE"
else
  echo "DESTRUCTIVE_GUARD: MISSING — guard mode degraded"
fi
```

If MISSING: warn the user. Guard mode falls back to freeze-only. Point them at
this pack's `install/hooks/` + `settings.hooks.example.json` to wire it.

## Phase 2 — Apply the freeze

Run the same logic as `/freeze`:

```bash
RAW="$1"
[ -z "$RAW" ] && {
  # Ask: "Guard mode — which directory should edits be restricted to?"
  # Wait for response.
}
FREEZE_DIR=$(cd "$RAW" 2>/dev/null && pwd)
[ -z "$FREEZE_DIR" ] && echo "Directory not found: $RAW" && exit 1
FREEZE_DIR="${FREEZE_DIR%/}/"

SESSION="${CLAUDE_SESSION_ID:-active}"
STATE_DIR="$HOME/.claude/state"
mkdir -p "$STATE_DIR"
STATE_FILE="$STATE_DIR/freeze-$SESSION.txt"
echo "$FREEZE_DIR" > "$STATE_FILE"
chmod 0600 "$STATE_FILE"
```

## Phase 3 — Confirm + brief

Tell the user:

- **Guard mode active.** Two protections are now on:
- **1. Destructive commands** — `rm -rf`, `DROP TABLE`, force-push, etc. will warn before running. You can override each warning case-by-case.
- **2. Edit boundary** — file edits restricted to `<FREEZE_DIR>`. Outside that path → blocked.
- To remove the edit boundary, run `/unfreeze`. The destructive guard stays on (it's the session default once installed).

## Discipline rules

- **Don't fake-install the destructive guard.** If `destructive-command-guard.sh` is missing, say so. Don't pretend `/guard` adds it — the hook layer adds it, and if it's missing that's a separate install step.
- **Same session-scope as /freeze.** No global state.
- **Don't auto-/unfreeze at session end.** The user clears via `/unfreeze` explicitly.

## Output (when done)

1-3 sentences:

- "Guard mode active. Edits restricted to `<path>`. Destructive command warnings on. Clear the edit boundary with `/unfreeze`."
- If the destructive guard is missing: "Edit boundary set to `<path>`, but destructive-command-guard.sh is missing — guard mode degraded to freeze-only. Wire it from install/hooks/."

## Related skills

- `/freeze` — edit boundary only
- `/unfreeze` — clear the edit boundary

## Origin

Clean-room adaptation of garrytan/gstack `/guard` (MIT). Kept: the combination semantics, two-layer protection framing, session scope, prod-mode use-case framing. Adapted: wired to this pack's bundled hooks instead of gstack's.

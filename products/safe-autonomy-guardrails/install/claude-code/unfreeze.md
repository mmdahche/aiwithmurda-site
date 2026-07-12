---
name: unfreeze
description: Clear the freeze boundary set by /freeze, allowing edits to all directories again for this session. Use when widening edit scope without ending the session. Triggers when the user says "unfreeze", "unlock edits", "remove freeze", "allow all edits", "clear the boundary".
---

# /unfreeze — Clear the freeze boundary

Removes the session-scoped freeze state file. After this runs, the
freeze-path-guard hook no longer blocks edits outside any directory.

## When to use

- The user says: "unfreeze", "unlock", "clear the freeze", "allow all edits", "remove the boundary"
- Mid-session you need to edit a file outside the frozen path and don't want to re-`/freeze` after.

## When NOT to use

- No freeze is currently active — `/unfreeze` is safe to run anyway (idempotent), but unnecessary.
- You want to permanently disable freezing — nothing to disable; freeze only exists when set.

## Phase 1 — Clear state

```bash
SESSION="${CLAUDE_SESSION_ID:-active}"
STATE_FILE="$HOME/.claude/state/freeze-$SESSION.txt"

if [ -f "$STATE_FILE" ]; then
  PREV=$(cat "$STATE_FILE")
  rm -f "$STATE_FILE"
  echo "Freeze cleared (was: $PREV)"
else
  echo "No freeze was active for this session."
fi
```

## Discipline rules

- **Idempotent.** Running `/unfreeze` with no active freeze is fine — report "no freeze was active" and exit clean.
- **Only this session.** Never touch other sessions' state files. Two frozen sessions each `/unfreeze` independently.
- **State file deletion is the source of truth.** Don't "soft-disable" with a placeholder — delete.

## Output (when done)

One line: "Freeze cleared (was: `<path>`). All directories editable again." or "No freeze was active for this session."

## Related skills

- `/freeze` — set a new freeze boundary
- `/guard` — freeze + destructive-command warnings together

## Origin

Clean-room adaptation of garrytan/gstack `/unfreeze` (MIT). Kept: idempotent clear, prior-path-on-clear reporting.

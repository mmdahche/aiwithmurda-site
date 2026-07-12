---
name: freeze
description: Restrict file edits to a specific directory for the current session. Blocks Edit and Write outside the allowed path via the pack's freeze-path-guard.sh hook. Use when debugging to prevent accidental fixes to unrelated code, or when scoping changes to one module. Triggers when the user says "freeze edits to <dir>", "lock editing scope", "restrict file changes to X", "only edit this folder". Pairs with /unfreeze (clears) and /guard (freeze + destructive-command warnings).
---

# /freeze — Restrict edits to a directory

Locks Edit and Write to a specific directory for this session. Anything outside
the allowed path gets blocked by the path-guard hook. Bash commands like `sed`
can still touch files outside — this is **an accident-prevention boundary, not a
security boundary**.

## When to use

- The user says: "freeze edits to `<path>`", "lock editing to `<path>`", "only edit `<path>`", "restrict to this folder", "scope my changes"
- A debugging session where the agent might over-eagerly "fix" unrelated code
- Touching one module during a multi-project session
- Working in a project with a load-bearing area where wandering would be bad

## When NOT to use

- You want a security boundary — use proper OS-level isolation (separate user, container) for that.
- The session needs cross-project edits — `/freeze` is single-directory by design.
- You want edits allowed everywhere → don't freeze; if one is active, `/unfreeze`.

## How it works

1. The skill resolves the user-provided directory to an absolute path
2. Writes the path to `~/.claude/state/freeze-${CLAUDE_SESSION_ID:-active}.txt` (one path, trailing slash ensured)
3. The pack's `freeze-path-guard.sh` PreToolUse hook (installed at `~/.claude/hooks/`, wired per `settings.hooks.example.json`) reads that file on every Edit/Write
4. If `file_path` doesn't start with the freeze path → the hook denies with a clear reason

**Install required once:** this skill is a no-op until `freeze-path-guard.sh` is
wired into your Claude Code settings. Both the hook and the settings fragment
ship in this pack's `install/hooks/`.

## Phase 1 — Resolve path

If `/freeze` was invoked with no argument, ask: "Which directory should I
restrict edits to?" If invoked with an arg, resolve it:

```bash
RAW="$1"
[ -z "$RAW" ] && echo "Usage: /freeze <directory>" && exit 1
FREEZE_DIR=$(cd "$RAW" 2>/dev/null && pwd)
[ -z "$FREEZE_DIR" ] && echo "Directory not found: $RAW" && exit 1
FREEZE_DIR="${FREEZE_DIR%/}/"
```

## Phase 2 — Write state

```bash
SESSION="${CLAUDE_SESSION_ID:-active}"
STATE_DIR="$HOME/.claude/state"
mkdir -p "$STATE_DIR"
STATE_FILE="$STATE_DIR/freeze-$SESSION.txt"
echo "$FREEZE_DIR" > "$STATE_FILE"
chmod 0600 "$STATE_FILE"
```

## Phase 3 — Confirm

Report:

- "Freeze active. Edit/Write restricted to `<FREEZE_DIR>` for this session."
- "Outside that path → blocked by freeze-path-guard.sh."
- "Bash commands (sed/awk/cp) still work everywhere — this isn't a security boundary."
- "Clear with `/unfreeze`."

Detect enforcement (is the hook wired?):

```bash
[ -x "$HOME/.claude/hooks/freeze-path-guard.sh" ] && echo "ENFORCED" || echo "ADVISORY — wire install/hooks/ first"
```

## Discipline rules

- **Session-scoped only.** Never write a global/cross-session freeze file.
- **0600 perms on the state file.**
- **Trailing slash always.** Prevents `/src` from matching `/src-old`.
- **Never silently overwrite.** If a freeze already exists for this session, surface the prior path before replacing it.

## Output (when done)

1-2 sentences: "Freeze active on `<path>` for this session. Outside that → blocked. Clear with `/unfreeze`." If the hook isn't wired: "Freeze recorded but enforcement requires installing freeze-path-guard.sh (one-time, see install/hooks/)."

## Related skills

- `/unfreeze` — clears the freeze state file for this session.
- `/guard` — freeze + destructive-command warnings together.

## Origin

Clean-room adaptation of garrytan/gstack `/freeze` (MIT). Kept: directory-restriction protocol, trailing-slash invariant, session scope, accident-prevention-not-security framing. Adapted: enforcement via this pack's bundled freeze-path-guard.sh hook.

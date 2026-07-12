#!/bin/bash
# Safe-Autonomy Guardrails — freeze path guard
# PreToolUse hook for the Edit / Write / MultiEdit tools.
#
# Purpose: constrain agent file-writes to a single "frozen" directory when the
# user has explicitly narrowed the working scope (e.g. via a /freeze slash
# command that writes the boundary file below). If no boundary is set, every
# path is allowed.
#
# State file:
#   ~/.claude/state/freeze-${CLAUDE_SESSION_ID:-active}.txt
#     First non-empty line = the allowed directory prefix. MUST end with '/'.
#     Absent file → no boundary → allow everything.
#
# Hook input schema (stdin JSON):
#   { "tool_name": "Edit|Write|MultiEdit",
#     "tool_input": { "file_path": "/abs/path", ... } }
#
# Deny output schema (stdout JSON, exit 0):
#   { "hookSpecificOutput": {
#       "hookEventName": "PreToolUse",
#       "permissionDecision": "deny",
#       "permissionDecisionReason": "..." } }
#
# Fail-open policy: if the stdin payload is malformed (unparseable JSON) we
# exit 0 with no output. A broken guard must NOT brick the session. Fail-open
# applies ONLY to malformed input — a valid payload with an out-of-bounds
# path is always denied.

set +e

INPUT=""
if [ ! -t 0 ]; then
  INPUT=$(cat 2>/dev/null)
fi
# Empty stdin is treated as "no input to check" → allow.
[ -z "$INPUT" ] && exit 0

# Parse tool_name + file_path via node (Claude Code always ships with node on
# PATH). Value channel: stdin → node → \u0001-delimited stdout.
PARSED=$(printf '%s' "$INPUT" | node -e "
let d='';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  try {
    const j = JSON.parse(d);
    const name = j.tool_name || '';
    const fp = (j.tool_input && j.tool_input.file_path) || '';
    process.stdout.write(name + '\\u0001' + fp);
  } catch {}
});
" 2>/dev/null)

TOOL_NAME=$(printf '%s' "$PARSED" | awk -F$'\001' '{print $1}')
FP=$(printf '%s' "$PARSED" | awk -F$'\001' '{print substr($0, index($0,"\001")+1)}')

# Fail-open on malformed input (parse produced nothing usable).
[ -z "$TOOL_NAME" ] && exit 0

case "$TOOL_NAME" in
  Write|Edit|MultiEdit) ;;
  *) exit 0 ;;
esac

# A valid Edit/Write/MultiEdit payload with no file_path is a parser edge
# case, not an out-of-bounds path — fail-open.
[ -z "$FP" ] && exit 0

SESSION_ID="${CLAUDE_SESSION_ID:-active}"
FREEZE_FILE="$HOME/.claude/state/freeze-${SESSION_ID}.txt"

# No boundary in effect → allow.
[ ! -f "$FREEZE_FILE" ] && exit 0

# First non-empty line = the boundary directory. Must end with '/'.
FREEZE_DIR=""
while IFS= read -r line || [ -n "$line" ]; do
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  case "$line" in
    ''|'#'*) continue ;;
    */) FREEZE_DIR="$line"; break ;;
    *)  FREEZE_DIR="$line/"; break ;;
  esac
done < "$FREEZE_FILE"

# Malformed boundary file (no directory line) → treat as no boundary, allow.
[ -z "$FREEZE_DIR" ] && exit 0

# In-bounds → allow.
case "$FP" in
  "$FREEZE_DIR"*) exit 0 ;;
esac

# Out-of-bounds → deny via PreToolUse JSON output. Use python3 for JSON
# emission (macOS ships python3 via the Xcode CLI tools, which Claude Code
# users already have). Falls back to a hand-formatted JSON if python3 is
# missing so the deny still fires.
REASON="Edit blocked by /freeze boundary. Only files under ${FREEZE_DIR} may be modified in this session; requested path was ${FP}. Run /unfreeze to release the boundary."

if command -v python3 >/dev/null 2>&1; then
  REASON_TEXT="$REASON" python3 -c '
import json, os
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": os.environ["REASON_TEXT"],
    }
}))
'
else
  ESC=$(printf '%s' "$REASON" | sed 's/\\/\\\\/g; s/"/\\"/g')
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$ESC"
fi

exit 0

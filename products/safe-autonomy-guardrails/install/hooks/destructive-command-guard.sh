#!/bin/bash
# Safe-Autonomy Guardrails — destructive command guard
# PreToolUse hook for the Bash tool.
#
# Purpose: always-on guard against irrecoverable shell operations. These
# patterns are blocked unconditionally because the recovery cost vastly
# exceeds the friction of running them manually.
#
# Hook input schema (stdin JSON):
#   { "tool_name": "Bash",
#     "tool_input": { "command": "...", ... } }
#
# Block list (with reasons):
#   rm -rf / rm -fr / rm -Rf / rm --recursive --force  → mass deletion
#   git push --force / -f to main|master|prod|production → history rewrite on shared branches
#   git push (non-force) to protected branch from a feature branch → PR bypass
#   git branch -D                                       → force-deletes unmerged branches
#   git reset --hard (when working tree dirty)          → discards uncommitted work
#   git checkout . / git restore .                      → discards working tree changes
#   git clean -fd / -fdx                                → removes untracked files
#   --no-verify on git commands                         → bypasses pre-commit hooks
#   chmod 777 (incl. flag variants like chmod -R 777)   → world-writable files
#   sudo …                                              → privilege escalation
#   dd if= / dd of=                                     → raw disk operations
#   curl|wget … | bash / sh                             → unverified remote execution
#   npm|yarn|pnpm publish                               → irreversible registry publish
#   DROP TABLE/DATABASE / TRUNCATE via SQL CLIs         → destructive SQL DDL
#   mkfs / mkfs.*                                       → formats filesystem (destroys data)
#   > /dev/sd* (raw block-device redirect)              → overwrites the disk
#
# Block protocol: exit 2 with stderr message.
#
# Fail-safe principle: if we cannot parse the command, we ALLOW (fail-open on
# parse error). Blocking on parse failure could deadlock legitimate work; the
# patterns we care about all rely on substring matches that work even on
# weirdly-quoted commands.

set +e

# ---------- Read stdin JSON -----------------------------------------------
INPUT=""
if [ ! -t 0 ]; then
  INPUT=$(cat 2>/dev/null)
fi
[ -z "$INPUT" ] && exit 0

PARSED=$(printf '%s' "$INPUT" | node -e "
let d='';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  try {
    const j = JSON.parse(d);
    const name = j.tool_name || '';
    const cmd = (j.tool_input && j.tool_input.command) || '';
    process.stdout.write(name + '\\u0001' + cmd);
  } catch {}
});
" 2>/dev/null)

TOOL_NAME=$(printf '%s' "$PARSED" | awk -F$'\001' '{print $1}')
CMD=$(printf '%s' "$PARSED" | awk -F$'\001' '{print substr($0, index($0,"\001")+1)}')

[ "$TOOL_NAME" != "Bash" ] && exit 0
[ -z "$CMD" ] && exit 0

# ---------- Block helper --------------------------------------------------
block() {
  local reason="$1"
  printf '[destructive-command-guard] BLOCKED: %s — reason: %s. If intentional, run manually outside the agent (this guard is always-on).\n' "$CMD" "$reason" >&2
  exit 2
}

LCMD=$(printf '%s' "$CMD" | tr '[:upper:]' '[:lower:]')

# ---------- 1. rm -rf and variants ----------------------------------------
if printf '%s' "$LCMD" | grep -qE '(^|[^a-z])rm[[:space:]]+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r|--recursive[[:space:]]+--force|--force[[:space:]]+--recursive|-r[[:space:]]+-f|-f[[:space:]]+-r)'; then
  block 'rm -rf (mass deletion)'
fi

# ---------- 2. git push --force to protected branches ---------------------
if printf '%s' "$LCMD" | grep -qE 'git[[:space:]]+push[[:space:]]+.*(--force([[:space:]]|$|[^-])|--force-with-lease|-f([[:space:]]|$))'; then
  if printf '%s' "$LCMD" | grep -qE '(^|[[:space:]])(main|master|prod|production)([[:space:]]|$|:)'; then
    block 'git push --force to protected branch (main/master/prod)'
  fi
fi

# ---------- 2a. git push directly to protected branches (no --force) ------
# Even without --force, plain `git push origin main` from a feature-branch
# session is almost never intended. Block unless the current branch IS that
# branch (i.e. you're pushing your own commits to your own branch, which is
# the normal case for someone whose checkout actually sits on main).
if printf '%s' "$LCMD" | grep -qE 'git[[:space:]]+push[[:space:]]+(origin[[:space:]]+)?(main|master|prod|production)([[:space:]]|$|:)'; then
  CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
  case "$CURRENT_BRANCH" in
    main|master|prod|production) ;;  # on the branch you're pushing, normal
    *) block 'git push to protected branch (main/master/prod) from feature branch — use a PR' ;;
  esac
fi

# ---------- 2b. git branch -D (force-delete branch with unmerged commits) -
# `-D` is destructive (force-delete even if unmerged). Distinct from `-d`
# (refuses to delete unmerged branches). Block; rerun manually if intentional.
# Uses $CMD (case-preserving), not $LCMD — the D vs d distinction IS the
# whole point of the check.
if printf '%s' "$CMD" | grep -qE 'git[[:space:]]+branch[[:space:]]+(-[a-zA-Z]*D[a-zA-Z]*|-D)([[:space:]]|$)'; then
  block 'git branch -D (force-deletes branch ignoring unmerged commits)'
fi

# ---------- 3. git reset --hard with dirty tree ---------------------------
if printf '%s' "$LCMD" | grep -qE 'git[[:space:]]+reset[[:space:]]+(--hard|-[a-zA-Z]*[[:space:]]+--hard|--hard[[:space:]])'; then
  STATUS=$(git status --porcelain 2>/dev/null)
  if [ -n "$STATUS" ]; then
    block 'git reset --hard with uncommitted changes (would discard work)'
  fi
fi

# ---------- 4. git checkout . / git restore . -----------------------------
if printf '%s' "$LCMD" | grep -qE 'git[[:space:]]+(checkout|restore)[[:space:]]+\.([[:space:]]|$)'; then
  block 'git checkout . / git restore . (discards all working tree changes)'
fi

# ---------- 5. git clean -fd / -fdx ---------------------------------------
if printf '%s' "$LCMD" | grep -qE 'git[[:space:]]+clean[[:space:]]+(-[a-z]*f[a-z]*d|-[a-z]*d[a-z]*f)'; then
  block 'git clean -fd (removes untracked files)'
fi

# ---------- 6. --no-verify on git ----------------------------------------
if printf '%s' "$LCMD" | grep -qE 'git[[:space:]]+[a-z]+([[:space:]]+--?[a-zA-Z-]+)*[[:space:]]+--no-verify'; then
  block '--no-verify on git command (bypasses hooks)'
fi
if printf '%s' "$LCMD" | grep -qE 'git[[:space:]].*--no-verify'; then
  block '--no-verify on git command (bypasses hooks)'
fi

# ---------- 7. chmod 777 --------------------------------------------------
# Tolerate flag words between chmod and the mode — `chmod -R 777` must not
# slip through because `-R` sits between chmod and 777.
if printf '%s' "$LCMD" | grep -qE '(^|[^a-z])chmod[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*([0-7]*)?777'; then
  block 'chmod 777 (world-writable, security risk)'
fi

# ---------- 8. sudo (any privilege escalation) ----------------------------
if printf '%s' "$LCMD" | grep -Eq '(^|[[:space:];&|(])sudo([[:space:]]|$)'; then
  block 'sudo (privilege escalation requires interactive confirmation)'
fi

# ---------- 9. dd if= / dd of= --------------------------------------------
if printf '%s' "$LCMD" | grep -qE '(^|[^a-z])dd[[:space:]]+.*\b(if|of)='; then
  block 'dd if=/of= (raw disk operations)'
fi

# ---------- 10. curl|wget … | bash/sh -------------------------------------
if printf '%s' "$LCMD" | grep -qE '(curl|wget)[[:space:]].*\|[[:space:]]*(sudo[[:space:]]+)?(bash|sh|zsh|ksh)([[:space:]]|$)'; then
  block 'curl/wget piped to shell (unverified remote code execution)'
fi
if printf '%s' "$LCMD" | grep -qE '(bash|sh|zsh|ksh)[[:space:]]+<\([[:space:]]*(curl|wget)'; then
  block 'shell <(curl/wget …) process substitution (unverified remote code execution)'
fi

# ---------- 11. npm / yarn / pnpm publish ----------------------------------
# Publishing to a package registry is effectively irreversible (unpublish
# windows are narrow and registries cache forever). Run it manually, on
# purpose. Word-bounded so `npm run publish-docs` style scripts pass.
if printf '%s' "$LCMD" | grep -qE '(^|[^a-z])(npm|yarn|pnpm)[[:space:]]+publish([[:space:]]|$)'; then
  block 'npm/yarn/pnpm publish (irreversible package registry publish)'
fi

# ---------- 12. destructive SQL DDL via SQL CLIs ---------------------------
# DROP TABLE / DROP DATABASE / TRUNCATE destroy data with no undo. Only
# fires when a SQL CLI (psql/mysql/mariadb/sqlite3 -e/-c style) appears in
# the same command — word-bounded, so `grep 'DROP TABLE' README.md` or code
# that merely mentions the keywords passes.
if printf '%s' "$LCMD" | grep -qE '(^|[^a-z])(psql|mysql|mariadb|sqlite3)([[:space:]]|$)'; then
  if printf '%s' "$LCMD" | grep -qE '(^|[^a-z])(drop[[:space:]]+(table|database)|truncate)([^a-z]|$)'; then
    block 'destructive SQL DDL (DROP TABLE/DATABASE or TRUNCATE) via SQL CLI'
  fi
fi

# ---------- 13. mkfs (filesystem format) -----------------------------------
# mkfs / mkfs.ext4 / mkfs.vfat etc. format a device and destroy everything
# on it. Never something to run unattended.
if printf '%s' "$LCMD" | grep -qE '(^|[^a-z])mkfs(\.[a-z0-9]+)?([[:space:]]|$)'; then
  block 'mkfs (formats a filesystem, destroys all data on the target device)'
fi

# ---------- 14. shell redirect to a raw block device ------------------------
# `> /dev/sdX` (and friends) overwrites a disk directly — the redirect twin of
# the dd rule above. Covers Linux/Git Bash (sd/hd/nvme/mmcblk) and macOS
# (diskN). /dev/null, /dev/stderr etc. are untouched.
if printf '%s' "$LCMD" | grep -qE '>[[:space:]]*/dev/(sd[a-z]|hd[a-z]|nvme[0-9]|mmcblk[0-9]|disk[0-9])'; then
  block 'shell redirect to a raw block device (overwrites the disk)'
fi

exit 0

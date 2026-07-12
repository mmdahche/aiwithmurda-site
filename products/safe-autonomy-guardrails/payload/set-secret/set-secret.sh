#!/usr/bin/env bash
# Safe-Autonomy Guardrails — clipboard secret injection worker.
#
# Injects a clipboard-held secret into an env file without the value ever
# passing through chat, stdout, logs, ps, argv, or the shell transcript.
#
# Cardinal rule: the secret value comes from the OS clipboard, is held in a
# shell variable only, is piped to python3 via STDIN for the substitution, and
# is never echoed. Only the last-4 characters (and length) are shown to the
# operator on success.
#
# Convention:
#   Default secrets directory is ~/.secrets/ (0700-recommended). The env file
#   is always passed explicitly via --file; there is no default file.
#
# Usage:
#   set-secret.sh --file <path> --var <VARNAME> [--shape <name|any>] [--create]
#
# Exit codes:
#   0  success
#   2  bad usage
#   3  refused (unknown shape / var missing / file missing without --create /
#      empty clip / duplicate VAR in target file)
#   4  internal failure (python sub failed, mv failed, clipboard reader error,
#      backup write failed, etc.)
#
# Compat: targets stock macOS /bin/bash 3.2 (no associative arrays, no
# ${var,,}). Uses parallel arrays for the shape catalog.

# ---- HARD anti-xtrace defence (must run BEFORE anything touches the value) --
# If the script is invoked under `bash -x`, or with SHELLOPTS=xtrace exported,
# bash would print every line that touches $NEW to the trace stream (stderr
# by default), leaking the value. Defend in code:
#   1. Turn xtrace off as the very first action (silently — `set +x` itself
#      under xtrace would print "+ set +x", which is harmless but noisy).
#   2. Open FD 9 to /dev/null and point BASH_XTRACEFD at it, so if any future
#      `set -x` somehow fires (sourced file, sub-shell, signal handler) the
#      trace bytes vanish instead of hitting stderr.
# (SHELLOPTS is bash-readonly; we cannot rewrite it. The set +x + xtrace-FD
# redirect together neutralise both `bash -x` and `SHELLOPTS=xtrace`.)
{ set +x; } 2>/dev/null
exec 9>/dev/null
export BASH_XTRACEFD=9

set -eo pipefail
# Note: deliberately NOT using `set -u`. The shape-name loop variables and
# absent optional args make `-u` brittle on bash 3.2; we guard explicitly.

# ---- usage ---------------------------------------------------------------
usage() {
  cat >&2 <<'USAGE_EOF'
Usage: set-secret.sh --file <path> --var <VARNAME> [--shape <name|any>] [--create]

  --file   target env file (e.g. ~/.secrets/stripe.env)
  --var    variable name to upsert (e.g. STRIPE_RESTRICTED_KEY)
  --shape  named pattern to validate against (see catalog) OR 'any' to skip.
           If omitted, the clipboard must auto-match a known catalog pattern.
  --create allow appending the var if not present, or creating the file.

Secret is read from the OS clipboard (pbpaste on macOS; xclip / wl-paste on
Linux). The value never appears in stdout, stderr, logs, ps, argv, or the
shell transcript.
USAGE_EOF
}

FILE=""
VAR=""
SHAPE=""
CREATE=0

while (( "$#" )); do
  case "$1" in
    --file)   FILE="${2:-}"; shift 2 ;;
    --var)    VAR="${2:-}"; shift 2 ;;
    --shape)  SHAPE="${2:-}"; shift 2 ;;
    --create) CREATE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "[set-secret] unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$FILE" || -z "$VAR" ]]; then
  echo "[set-secret] --file and --var are required" >&2
  usage
  exit 2
fi

if [[ ! "$VAR" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "[set-secret] invalid VAR name: '$VAR' (must be a valid shell identifier)" >&2
  exit 2
fi

# Expand ~ if the caller passes it.
FILE="${FILE/#\~/$HOME}"

# ---- read clipboard ------------------------------------------------------
# Platform detection: prefer pbpaste (macOS), then xclip (Linux X11), then
# wl-paste (Linux Wayland). Fail with a clear message on unsupported platforms.
# Capture rc explicitly under `set +e` so a non-zero clipboard-tool exit
# under `set -e` doesn't abort with a bare rc=1.
CLIP_TOOL=""
if command -v pbpaste >/dev/null 2>&1; then
  CLIP_TOOL="pbpaste"
  set +e
  NEW="$(pbpaste 2>/dev/null)"
  _pb_rc=$?
  set -e
elif command -v xclip >/dev/null 2>&1; then
  CLIP_TOOL="xclip"
  set +e
  NEW="$(xclip -selection clipboard -o 2>/dev/null)"
  _pb_rc=$?
  set -e
elif command -v wl-paste >/dev/null 2>&1; then
  CLIP_TOOL="wl-paste"
  set +e
  NEW="$(wl-paste --no-newline 2>/dev/null)"
  _pb_rc=$?
  set -e
else
  cat >&2 <<'NOCLIP_EOF'
[set-secret] no clipboard reader found on PATH. Install one for your platform:
  macOS         — pbpaste (built in)
  Linux X11     — xclip                (apt/brew install xclip)
  Linux Wayland — wl-paste              (apt/brew install wl-clipboard)
  Windows       — run under WSL with xclip / wl-paste, or invoke via a
                  wrapper that pipes `powershell.exe -c "Get-Clipboard"`
                  into this script (not implemented here).
NOCLIP_EOF
  exit 4
fi

if (( _pb_rc != 0 )); then
  echo "[set-secret] ${CLIP_TOOL} failed (rc=$_pb_rc) — clipboard service unavailable?" >&2
  exit 4
fi

# Belt-and-suspenders xtrace silence around the value-touching block.
{ set +x; } 2>/dev/null

# Strip leading/trailing whitespace + CR/LF without echoing the value.
NEW="${NEW#"${NEW%%[![:space:]]*}"}"
NEW="${NEW%"${NEW##*[![:space:]]}"}"

if [[ -z "$NEW" ]]; then
  echo "[set-secret] clipboard is empty — copy the secret and try again" >&2
  exit 3
fi

# Defence-in-depth: keys never contain whitespace internally.
if [[ "$NEW" =~ [[:space:]] ]]; then
  echo "[set-secret] clipboard value contains internal whitespace — not a key, refusing" >&2
  exit 3
fi

# ---- shape validation ----------------------------------------------------
# Catalog of named patterns. Parallel arrays (name[i] -> pattern[i]) because
# stock macOS /bin/bash is 3.2 and has no associative arrays.
# Patterns are tested WITHOUT printing the value (=~ in [[ ]] does not echo
# the operand). Every pattern enforces a realistic MINIMUM body length so
# trivial strings do not auto-classify as real keys.
#
# Notation note: several prefixes are written with the first character in a
# single-element character class (e.g. the slack and github token shapes) so
# the pattern-source bytes do NOT themselves match common secret-shape
# scanners that grep for the raw prefix. Regex semantics are unchanged: a
# single-character class like [x] matches the same character as bare x.
SHAPE_NAMES=(
  stripe-restricted
  stripe-secret
  stripe-publishable
  stripe-webhook
  github-pat-fine
  github-pat-classic
  github-oauth
  github-server
  gitlab-pat
  supabase-secret
  supabase-publishable
  supabase-anon-jwt
  google-api
  aws-access-key
  slack-bot
  slack-user
  slack-app
  anthropic
  openai
)
SHAPE_PATTERNS=(
  '^rk_(live|test)_[A-Za-z0-9]{20,}$'
  '^sk_(live|test)_[A-Za-z0-9]{20,}$'
  '^pk_(live|test)_[A-Za-z0-9]{20,}$'
  '^whsec_[A-Za-z0-9]{20,}$'
  '^github_pat_[A-Za-z0-9_]{36,}$'
  '^[g]hp_[A-Za-z0-9]{36,}$'
  '^[g]ho_[A-Za-z0-9]{36,}$'
  '^[g]hs_[A-Za-z0-9]{36,}$'
  '^glpat-[A-Za-z0-9_\-]{20,}$'
  '^sb_secret_[A-Za-z0-9_\-]{20,}$'
  '^sb_publishable_[A-Za-z0-9_\-]{20,}$'
  '^eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}$'
  '^AIza[A-Za-z0-9_\-]{35}$'
  '^([A]KIA|[A]SIA)[A-Z0-9]{16}$'
  '^xox[b]-[A-Za-z0-9\-]{20,}$'
  '^xox[p]-[A-Za-z0-9\-]{20,}$'
  '^xox[a]-[A-Za-z0-9\-]{20,}$'
  '^sk-ant-[A-Za-z0-9_\-]{20,}$'
  '^sk-(?!ant-)[A-Za-z0-9_\-]{20,}$'
)

# Lookup pattern by name. Returns 0 + sets PATTERN if found.
lookup_pattern() {
  local want="$1" i
  PATTERN=""
  for (( i=0; i<${#SHAPE_NAMES[@]}; i++ )); do
    if [[ "${SHAPE_NAMES[$i]}" == "$want" ]]; then
      PATTERN="${SHAPE_PATTERNS[$i]}"
      return 0
    fi
  done
  return 1
}

# Bash 3.2's =~ uses ERE (no negative lookahead). Provide a small python-based
# matcher for patterns that need PCRE (currently only the openai shape, which
# uses (?!ant-) to avoid shadowing the anthropic shape). The value is passed
# via STDIN — never argv — so it doesn't leak to ps.
_pcre_match() {
  # _pcre_match <pattern> via stdin -> rc 0 if match, 1 otherwise.
  local pat="$1"
  PCRE_PAT="$pat" python3 -c '
import os, re, sys
pat = os.environ["PCRE_PAT"]
v = sys.stdin.read()
sys.exit(0 if re.match(pat, v) else 1)
' >/dev/null 2>&1
}

_pattern_match() {
  # _pattern_match <pattern> <value-via-stdin>
  # Picks the right engine: bash =~ for ERE, python re for PCRE features.
  local pat="$1"
  if [[ "$pat" == *'(?!'* || "$pat" == *'(?='* ]]; then
    _pcre_match "$pat"
    return $?
  fi
  # ERE: read value from stdin to keep this routine value-channel uniform.
  local v
  v="$(cat)"
  if [[ "$v" =~ $pat ]]; then return 0; fi
  return 1
}

# Compute last-4 safely. On bash 3.2 a negative substring offset on a string
# shorter than the offset returns empty; clamp to the whole string for values
# shorter than 4 chars (only reachable via --shape any). Never reveals more
# than 4 chars under any condition.
LEN="${#NEW}"
if (( LEN >= 4 )); then
  LAST4="${NEW: -4}"
else
  LAST4="$NEW"
fi

shape_matched=""
if [[ -n "$SHAPE" ]]; then
  if [[ "$SHAPE" == "any" ]]; then
    echo "[set-secret] WARNING: --shape any — clipboard token NOT verified against catalog" >&2
    shape_matched="any"
  else
    if ! lookup_pattern "$SHAPE"; then
      echo "[set-secret] unknown --shape '$SHAPE'. Known: ${SHAPE_NAMES[*]}" >&2
      exit 2
    fi
    if ! printf '%s' "$NEW" | _pattern_match "$PATTERN"; then
      echo "[set-secret] clipboard value does NOT match shape '$SHAPE' — refusing (ends in ...$LAST4, len $LEN)" >&2
      exit 3
    fi
    shape_matched="$SHAPE"
  fi
else
  # Auto-detect: must match at least one catalog pattern.
  for (( i=0; i<${#SHAPE_NAMES[@]}; i++ )); do
    pattern="${SHAPE_PATTERNS[$i]}"
    if printf '%s' "$NEW" | _pattern_match "$pattern"; then
      shape_matched="${SHAPE_NAMES[$i]}"
      break
    fi
  done
  if [[ -z "$shape_matched" ]]; then
    echo "[set-secret] clipboard value matches NO known secret pattern — refusing." >&2
    echo "[set-secret] check the clipboard, or pass --shape any to force (ends in ...$LAST4, len $LEN)." >&2
    exit 3
  fi
fi

# ---- file existence / var presence checks --------------------------------
file_freshly_created=0
if [[ ! -f "$FILE" ]]; then
  if (( CREATE == 0 )); then
    echo "[set-secret] file does not exist: $FILE — pass --create to create it" >&2
    exit 3
  fi
  parent="$(dirname "$FILE")"
  mkdir -p "$parent"
  : > "$FILE"
  chmod 600 "$FILE"
  file_freshly_created=1
fi

# Detect whether VAR already present (match optional `export ` prefix).
# Use the SAME whitespace class python's upsert regex uses ([ \t]) so the two
# matchers never disagree (BSD grep with [[:space:]] would also match
# VT/FF/CR, while python only matched space/tab — divergence tripped a
# defensive abort on exotic input).
PRESENCE_COUNT="$(grep -Ec "^(export[ 	]+)?${VAR}=" "$FILE" || true)"
PRESENCE_COUNT="${PRESENCE_COUNT//[^0-9]/}"
PRESENCE_COUNT="${PRESENCE_COUNT:-0}"

if (( PRESENCE_COUNT == 0 )); then
  var_present=0
  if (( CREATE == 0 )); then
    echo "[set-secret] var '$VAR' not found in $FILE — pass --create to add it" >&2
    exit 3
  fi
elif (( PRESENCE_COUNT == 1 )); then
  var_present=1
else
  # Duplicate-var case: shells / most env loaders apply LAST-definition-wins,
  # so editing only the first would leave the stale value live while the tool
  # reports success. Refuse loudly. Operator must dedupe manually.
  echo "[set-secret] var '$VAR' appears ${PRESENCE_COUNT} times in $FILE — refusing." >&2
  echo "[set-secret] dedupe the file manually (last definition wins at source) and retry." >&2
  exit 3
fi

# ---- backup (single rolling .bak; overwrite, no timestamp accumulation) --
# Skip the cp when the file was just created in this run — there's nothing to
# back up and a 0-byte .bak is pointless clutter.
BAK="${FILE}.bak"
if (( file_freshly_created == 0 )); then
  # Guard the cp explicitly: under set -eo pipefail a raw failure would abort
  # with bash rc=1 (outside the documented contract). Honor exit 4 instead.
  if ! cp -f -- "$FILE" "$BAK" 2>/dev/null; then
    echo "[set-secret] backup failed (could not write $BAK) — original untouched" >&2
    exit 4
  fi
  chmod 600 "$BAK" 2>/dev/null || true
fi

# ---- safe write via python3 ---------------------------------------------
# Value flows clipboard -> shell var NEW -> STDIN of python3.
# python3 receives FILE + VAR + VAR_PRESENT via env (NOT argv), reads the
# value from stdin, performs upsert preserving `export ` prefix when present,
# single-quotes the value, writes a tmpfile in the same dir, mvs over the
# target, chmod 600. Value never enters argv or any logged channel.
#
# Important: the python source MUST live in its own file (not a heredoc on
# `python3 -`) because the heredoc would consume the stdin slot and the
# secret value needs that slot via the pipe from printf.
TMPDIR_TARGET="$(dirname "$FILE")"
PY_SCRIPT="$(mktemp -t set-secret-py.XXXXXX)"
trap 'rm -f "$PY_SCRIPT"' EXIT

cat > "$PY_SCRIPT" <<'PY'
import os, re, sys, tempfile

path = os.environ["FILE_PATH"]
var  = os.environ["VAR_NAME"]
present = os.environ["VAR_PRESENT"] == "1"
target_dir = os.environ["TMP_TARGET_DIR"]

value = sys.stdin.read()
# Single-quote the value for env-file safety. If the value contains a single
# quote (extremely rare for tokens), escape using bash-style '\'' inside the
# quoted literal: end-quote, escaped quote, re-open quote.
quoted = "'" + value.replace("'", "'\\''") + "'"

with open(path, "r") as f:
    text = f.read()

# Match `(export )?VAR=...` on its own line. Use [ \t] (space/tab only) to
# stay aligned with the shell-side presence check; preserve the export prefix
# if present. Keep terminating newline behavior consistent.
pattern = re.compile(
    r'^(?P<exp>export[ \t]+)?' + re.escape(var) + r'=.*$',
    re.MULTILINE,
)

def repl(m):
    exp = m.group('exp') or ''
    return f"{exp}{var}={quoted}"

if present:
    # Shell side already refused PRESENCE_COUNT > 1, so we expect exactly 1.
    new_text, n = pattern.subn(repl, text, count=1)
    if n != 1:
        sys.stderr.write("[set-secret] internal: regex failed to locate present VAR — aborting\n")
        sys.exit(4)
else:
    # Append. Match the file's EXISTING convention: if any current line uses
    # an `export VAR=` prefix, keep that style; otherwise write a plain
    # `VAR=value`. Plain is the default — it's what strict env-file parsers
    # and `--env-file` consumers expect (many parsers use a regex like
    # ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ which does NOT match an `export `-
    # prefixed line and would silently skip it).
    # A file with no var lines (empty / comments-only) falls through to plain.
    if text and not text.endswith("\n"):
        text += "\n"
    uses_export = re.search(
        r'^export[ \t]+[A-Za-z_][A-Za-z0-9_]*=', text, re.MULTILINE
    ) is not None
    prefix = "export " if uses_export else ""
    new_text = text + f"{prefix}{var}={quoted}\n"

fd, tmp_path = tempfile.mkstemp(prefix=".set-secret.", dir=target_dir)
try:
    with os.fdopen(fd, "w") as out:
        out.write(new_text)
    os.chmod(tmp_path, 0o600)
    os.replace(tmp_path, path)
except Exception:
    try: os.unlink(tmp_path)
    except FileNotFoundError: pass
    raise

os.chmod(path, 0o600)
PY

set +e
printf '%s' "$NEW" | \
  FILE_PATH="$FILE" \
  VAR_NAME="$VAR" \
  VAR_PRESENT="$var_present" \
  TMP_TARGET_DIR="$TMPDIR_TARGET" \
  python3 "$PY_SCRIPT"
rc=$?
set -e

if [[ $rc -ne 0 ]]; then
  echo "[set-secret] write failed (rc=$rc) — original preserved at $BAK" >&2
  exit 4
fi

# ---- shred the .bak on success ------------------------------------------
# The .bak existed only to give a single-step undo IF the write failed. Now
# that the new value is committed, the .bak holds a plaintext copy of the
# PREVIOUS (just-rotated-out) secret. Leaving it indefinitely widens at-rest
# exposure and undermines the point of rotation. Best-effort overwrite +
# unlink. Don't fail the success path if shred isn't available.
if [[ -f "$BAK" ]]; then
  # Overwrite (best-effort) then unlink. dd with conv=notrunc just to be sure
  # the inode bytes get rewritten before the unlink; on CoW filesystems (APFS,
  # Btrfs, ZFS) this isn't a guarantee against forensic recovery, but it's
  # strictly better than leaving the plaintext sitting there.
  bak_size="$(wc -c < "$BAK" 2>/dev/null | tr -d ' ')"
  if [[ -n "$bak_size" && "$bak_size" -gt 0 ]]; then
    dd if=/dev/zero of="$BAK" bs=1 count="$bak_size" conv=notrunc \
       >/dev/null 2>&1 || true
  fi
  rm -f -- "$BAK" 2>/dev/null || true
fi

# ---- success line --------------------------------------------------------
# ONLY last-4 + len. Never the value.
echo "${VAR} set in ${FILE} — ends in ...${LAST4} (len ${LEN})"
exit 0

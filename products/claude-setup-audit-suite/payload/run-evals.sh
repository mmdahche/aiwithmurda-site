#!/usr/bin/env sh
# run-evals.sh — deterministic, $0 regression checks for the core's safety hooks.
# Verifies the protection mechanisms still FIRE after edits or a merge. Builds
# throwaway git repos; cleans up after itself. Cross-platform POSIX sh
# (macOS + Windows Git Bash). Needs: git + the installed hooks.
#
# Probes which safety hooks are installed and tests those — a hook that isn't
# installed is a SKIP, not a failure. Only zero installed hooks is fatal.
set -u

HOOKS="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/hooks"
PASS=0
FAIL=0
SKIP=0
PROBED=0
ok() { PASS=$((PASS + 1)); echo "PASS $1"; }
no() { FAIL=$((FAIL + 1)); echo "FAIL $1"; }
skipped() { SKIP=$((SKIP + 1)); echo "SKIP $1 (hook not installed)"; }

TMPD=$(mktemp -d 2>/dev/null || mktemp -d -t claude-eval)
mkdir -p "$TMPD/home" # scratch HOME so hooks that write logs never touch the real setup
mk_repo() {
  d=$(mktemp -d "$TMPD/repo.XXXXXX")
  ( cd "$d" && git init -q && git config user.email t@t && git config user.name t )
  echo "$d"
}

# ---- pre-commit-secrets.sh: staged secrets must block the commit ----------
if [ -f "$HOOKS/pre-commit-secrets.sh" ]; then
  PROBED=$((PROBED + 1))
  secret_exit() { # $1 = repo path -> prints the secret hook's exit code
    printf '{"tool_input":{"command":"git commit -m x"},"cwd":"%s"}' "$1" \
      | sh "$HOOKS/pre-commit-secrets.sh" >/dev/null 2>&1
    echo $?
  }

  R=$(mk_repo); printf 'API_KEY=abc123\n' > "$R/.env"; ( cd "$R" && git add .env )
  [ "$(secret_exit "$R")" = "2" ] && ok "secret-hook blocks .env" || no "secret-hook blocks .env"

  R=$(mk_repo); printf 'API_KEY=\n' > "$R/.env.example"; ( cd "$R" && git add .env.example )
  [ "$(secret_exit "$R")" = "0" ] && ok "secret-hook allows .env.example" || no "secret-hook allows .env.example"

  # Assemble the fake token from parts at RUNTIME so secret-scrubbers in the
  # tooling chain do not redact the literal out of this fixture. The reassembled
  # value still matches the hook's pattern.
  TOK="sk-""ant-""api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  R=$(mk_repo); printf 'const k="%s";\n' "$TOK" > "$R/c.ts"; ( cd "$R" && git add c.ts )
  [ "$(secret_exit "$R")" = "2" ] && ok "secret-hook blocks token in source" || no "secret-hook blocks token in source"

  R=$(mk_repo); printf 'export const x = 1;\n' > "$R/a.ts"; ( cd "$R" && git add a.ts )
  [ "$(secret_exit "$R")" = "0" ] && ok "secret-hook allows clean file" || no "secret-hook allows clean file"
else
  skipped "pre-commit-secrets.sh"
fi

# ---- destructive-command-guard.sh: rm -rf blocks, clean commands pass -----
if [ -f "$HOOKS/destructive-command-guard.sh" ]; then
  PROBED=$((PROBED + 1))
  guard_exit() { # $1 = command string -> prints the guard's exit code
    printf '{"tool_name":"Bash","tool_input":{"command":"%s"}}' "$1" \
      | bash "$HOOKS/destructive-command-guard.sh" >/dev/null 2>&1
    echo $?
  }

  [ "$(guard_exit 'rm -rf /tmp/somedir')" = "2" ] && ok "destructive-guard blocks rm -rf" || no "destructive-guard blocks rm -rf"
  [ "$(guard_exit 'echo hello')" = "0" ] && ok "destructive-guard allows clean command" || no "destructive-guard allows clean command"
else
  skipped "destructive-command-guard.sh"
fi

# ---- session-start.sh: state injection + bootstrap nudge ------------------
if [ -f "$HOOKS/session-start.sh" ]; then
  PROBED=$((PROBED + 1))

  P=$(mktemp -d "$TMPD/proj.XXXXXX")
  printf '# Project state\nEVAL_STATE_SENTINEL_OK\n' > "$P/PROJECT_STATE.md"
  OUT=$( cd "$P" && HOME="$TMPD/home" bash "$HOOKS/session-start.sh" 2>/dev/null )
  case "$OUT" in
    *additionalContext*EVAL_STATE_SENTINEL_OK*) ok "session-start injects PROJECT_STATE.md" ;;
    *) no "session-start injects PROJECT_STATE.md" ;;
  esac

  P=$(mktemp -d "$TMPD/empty.XXXXXX")
  OUT=$( cd "$P" && HOME="$TMPD/home" bash "$HOOKS/session-start.sh" 2>/dev/null )
  case "$OUT" in
    *bootstrap-state*) ok "session-start nudges /bootstrap-state when no state file" ;;
    *) no "session-start nudges /bootstrap-state when no state file" ;;
  esac
else
  skipped "session-start.sh"
fi

rm -rf "$TMPD" 2>/dev/null || true
echo ""
echo "config self-test: $PASS passed, $FAIL failed, $SKIP skipped"
if [ "$PROBED" = "0" ]; then
  echo "FAIL no known safety hooks found at $HOOKS — nothing was tested" >&2
  exit 1
fi
[ "$FAIL" = "0" ]

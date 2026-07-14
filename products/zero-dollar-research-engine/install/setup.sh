#!/bin/sh
# setup.sh -- copy the three engine payloads into $RESEARCH_HOME (default:
# ~/.research-engine/) and mark the shell shims executable. Doesn't touch
# your agent's settings, doesn't open a network socket.
#
# Idempotent: re-running overwrites the copies in place. Never deletes
# anything outside the target directory.
#
# Usage:
#   bash install/setup.sh               # target: ~/.research-engine
#   RESEARCH_HOME=/opt/re bash install/setup.sh
#
# After this runs:
#   ~/.research-engine/research/research.sh
#   ~/.research-engine/web-fetch/web-fetch.sh
#   ~/.research-engine/to-markdown/tomd.sh
#
# Copy the skill wrappers into your agent's skill folder separately:
#   Claude Code:  cp install/claude-code/*.md   ~/.claude/skills/
#   Codex:        cp -R install/codex/*         ~/.agents/skills/
set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PACK_ROOT=$(CDPATH= cd -- "$DIR/.." && pwd)
PAYLOAD="$PACK_ROOT/payload"

if [ ! -d "$PAYLOAD" ]; then
  echo "setup: cannot find payload/ directory at $PAYLOAD" >&2
  exit 1
fi

TARGET="${RESEARCH_HOME:-$HOME/.research-engine}"
# Expand a leading ~ manually in case someone quoted it as a literal.
case "$TARGET" in
  "~"|"~/"*) TARGET="$HOME${TARGET#~}" ;;
esac

echo "setup: installing to $TARGET"
mkdir -p "$TARGET"

for skill in research web-fetch to-markdown; do
  if [ ! -d "$PAYLOAD/$skill" ]; then
    echo "setup: payload/$skill/ is missing; refusing to continue" >&2
    exit 1
  fi
  # Wipe then recreate the skill dir under the target so a re-run doesn't
  # accumulate stale files. rm -rf is scoped to $TARGET/<skill>.
  rm -rf "$TARGET/$skill"
  mkdir -p "$TARGET/$skill"
  # Use tar to preserve permissions + skip nothing (cp -R varies by platform
  # on how it handles hidden files). Portable across macOS BSD tar and
  # GNU tar on Linux.
  ( cd "$PAYLOAD/$skill" && tar -cf - . ) | ( cd "$TARGET/$skill" && tar -xf - )
  echo "  installed $skill -> $TARGET/$skill"
done

# Mark every shim executable (redundant if the pack was extracted with modes
# intact, but chmod is cheap and works on filesystems that lost the bit).
chmod +x "$TARGET/research/research.sh" \
         "$TARGET/web-fetch/web-fetch.sh" \
         "$TARGET/to-markdown/tomd.sh" 2>/dev/null || true

cat <<EOF

setup: done.

Next:

  1) pip install the runtime dep(s) for the skill(s) you'll use first
     (nothing is bundled -- your environment, your call):

       pip install 'curl_cffi==0.7.4'                           # for /web-fetch
       pip install 'markitdown[pdf,docx,pptx,xlsx]==0.1.3'      # for /to-markdown
       # /research needs no third-party deps -- pure stdlib.

  2) Copy the skill wrappers into your agent's skill folder:

       Claude Code:
         cp $DIR/claude-code/*.md ~/.claude/skills/

       Codex:
         cp -R $DIR/codex/*       ~/.agents/skills/

  3) Live network is OFF by default. Enable per skill only after review:

       export RESEARCH_LIVE=1        # research aggregator
       export WEB_FETCH_LIVE=1       # single-URL fetcher

     /to-markdown does no network -- no gate needed.

  4) OPTIONAL: install the Safe-Autonomy Guardrails firewall from the same
     store (pairs with this pack, sold separately). Point at it via:

       export GUARDRAILS_HOME=/path/to/guardrails

     Or drop it at ~/.guardrails/redaction-firewall/firewall.py. Missing =
     each skill runs with a passthrough scrubber and a one-time stderr note.

Run VERIFY.md end to end before pointing any of these at production traffic.
EOF

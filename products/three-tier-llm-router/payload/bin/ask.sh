#!/usr/bin/env bash
# ask.sh — easy CLI wrapper for the 3-tier router
# Usage:
#   ask.sh "<prompt>"                                        # auto-classify
#   ask.sh --purpose summarize "<prompt>"                    # explicit purpose (cheap/T2)
#   ask.sh --purpose classify "<prompt>"                     # local/T1
#   ask.sh --purpose architectural_decision "<prompt>"       # hard-floor/T3
#   ask.sh --system "<sys>" --purpose summarize "<prompt>"
#   ask.sh --quiet "<prompt>"                                # text-only output (no tier banner)
#   ask.sh --json "<prompt>"                                 # raw JSON result
#   ask.sh --deepseek "<prompt>"                             # direct Fireworks DeepSeek path
#   ask.sh --file <path> --purpose summarize                 # synthesize file contents
#
# Purposes that hit cheap tiers:
#   T1 chat:    greeting, echo, classify, label, json_reformat, template_slot_fill, dedup, hash_match
#               (local Ollama only when LOCAL_OLLAMA_ENABLED=true; otherwise routes to remote cheap)
#   T2 cheap:   summarize, summary, enrich, reflexion_first_pass, kg_titling, embedding_title,
#               compact_memory, long_context_analysis, codebase_analysis, research_synthesis
# Purposes that hard-floor to T3 precision (always):
#   identity_audit, self_modification, phenomenology, architectural_decision,
#   author_voice, high_stakes_review

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIERED_ASK="$PACKAGE_ROOT/lib/tiered-ask.cjs"

PURPOSE=""
SYSTEM=""
PROMPT=""
FILE=""
QUIET=0
JSON_OUT=0
DEEPSEEK=0

while [ $# -gt 0 ]; do
  case "$1" in
    --purpose) PURPOSE="$2"; shift 2 ;;
    --system) SYSTEM="$2"; shift 2 ;;
    --file) FILE="$2"; shift 2 ;;
    --deepseek) DEEPSEEK=1; shift ;;
    --quiet|-q) QUIET=1; shift ;;
    --json) JSON_OUT=1; shift ;;
    --help|-h)
      sed -n '2,22p' "$0"
      exit 0
      ;;
    *)
      if [ -z "$PROMPT" ]; then PROMPT="$1"; else PROMPT="$PROMPT $1"; fi
      shift
      ;;
  esac
done

if [ -n "$FILE" ]; then
  if [ ! -f "$FILE" ]; then
    echo "ERROR: --file $FILE does not exist" >&2
    exit 2
  fi
  FILE_CONTENT=$(cat "$FILE")
  if [ -z "$PROMPT" ]; then
    PROMPT="Synthesize the following content per the purpose flag. Be concise and structured.

$FILE_CONTENT"
  else
    PROMPT="$PROMPT

---

$FILE_CONTENT"
  fi
fi

if [ -z "$PROMPT" ]; then
  echo "ERROR: prompt required (or --file <path>)" >&2
  echo "Usage: ask.sh [--purpose <name>] [--system <text>] [--file <path>] [--quiet|--json] \"<prompt>\"" >&2
  exit 2
fi

ARGS_JSON=$(TIERED_ASK="$TIERED_ASK" node -e "
const obj = { prompt: process.argv[1] };
if (process.argv[2]) obj.purpose = process.argv[2];
if (process.argv[3]) obj.system = process.argv[3];
if (process.argv[4] === '1') obj.flags = { deepseek: true };
console.log(JSON.stringify(obj));
" "$PROMPT" "$PURPOSE" "$SYSTEM" "$DEEPSEEK")

RESULT=$(TIERED_ASK="$TIERED_ASK" node -e "
const ask = require(process.env.TIERED_ASK).ask;
const args = JSON.parse(process.argv[1]);
ask(args).then(r => {
  process.stdout.write(JSON.stringify({
    text: r.text,
    tier: r.tier,
    model: r.model,
    class: r.class,
    classified: r.classified,
    quota_routed_to: r.quota_routed_to,
    latency_ms: r.latency_ms,
    usage: r.usage,
    fallback_chain: r.fallback_chain || []
  }));
}).catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
" "$ARGS_JSON")

if [ $JSON_OUT -eq 1 ]; then
  echo "$RESULT"
else
  TIER=$(echo "$RESULT" | node -e "process.stdin.on('data', d => { const r = JSON.parse(d.toString()); console.log(r.tier); })")
  MODEL=$(echo "$RESULT" | node -e "process.stdin.on('data', d => { const r = JSON.parse(d.toString()); console.log(r.model); })")
  LATENCY=$(echo "$RESULT" | node -e "process.stdin.on('data', d => { const r = JSON.parse(d.toString()); console.log(r.latency_ms); })")
  TEXT=$(echo "$RESULT" | node -e "let d=''; process.stdin.on('data', c=>d+=c); process.stdin.on('end',()=>{const r=JSON.parse(d); process.stdout.write(r.text);})")

  if [ $QUIET -eq 0 ]; then
    echo "[tier $TIER | $MODEL | ${LATENCY}ms]"
    echo "---"
  fi
  echo "$TEXT"
fi

#!/usr/bin/env bash
# The Council wrapper — sources the Groq key and invokes the Python runner.
# Usage:
#   council.sh "the question to run past the council"
#   council.sh --mode personas "the question"
#   council.sh --mode multi-model "the question"  (default)
#   council.sh --mode fast "the question"         (sub-2s sanity check)

set -euo pipefail

COUNCIL_ROOT="${COUNCIL_HOME:-$HOME/.council}"
SECRETS="$COUNCIL_ROOT/.secrets/groq.env"

if [[ ! -r "$SECRETS" ]]; then
    echo "ERROR: $SECRETS not readable." >&2
    echo "Setup: copy .secrets/groq.env.example to .secrets/groq.env and paste your free Groq API key." >&2
    exit 1
fi

# shellcheck disable=SC1090
set -a  # export all variables defined while sourcing
source "$SECRETS"
set +a

if [[ -z "${GROQ_API_KEY:-}" ]]; then
    echo "ERROR: GROQ_API_KEY not set after sourcing $SECRETS" >&2
    exit 1
fi

exec python3 "$COUNCIL_ROOT/runner.py" "$@"

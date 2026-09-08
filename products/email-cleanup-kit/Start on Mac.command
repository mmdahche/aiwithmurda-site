#!/bin/sh
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  printf '%s\n' 'Python was not found. Install it from https://www.python.org/downloads/' 'Then reopen this launcher. Nothing was installed or connected.'
else
  python3 -B start.py "$@"
fi
printf '\nPress Return to close this window. '
read -r answer

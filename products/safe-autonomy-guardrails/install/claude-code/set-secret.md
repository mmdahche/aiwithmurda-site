---
name: set-secret
description: Inject a secret into an env file from the clipboard without the value ever passing through chat. Use when the user says "set a secret", "save this key", "I copied the key", "I copied the token", "put this in .env", "put this in .secrets", "rotate this key into the file", "store the API key", "/set-secret", or pastes a key in chat (refuse and switch to clipboard mode). Wraps the pack's set-secret.sh worker.
---

# /set-secret — Clipboard-only secret injection

The safe path for taking a freshly-issued API key, token, or webhook secret and
writing it into an env file. The value never touches the chat transcript, never
appears in stdout/stderr/logs/ps, and only the last 4 characters of the stored
value are ever echoed back.

Worker installed at: `~/.guardrails/set-secret/set-secret.sh` (via this pack's setup.sh).

## When to use

- The user says "set this secret", "save this key", "save this token", "rotate this key into <file>", "put this in `.env`", "put this in `.secrets`", "/set-secret".
- The user says "I copied the [Stripe / GitHub / Supabase / OpenAI / Anthropic / Slack / AWS / Google / GitLab] key" and wants it stored.
- Any time a secret value needs to land in an env file. This is the standard path.

## When NOT to use

- READING a secret out of a file — just read the file (it should already be 600-permed).
- Non-secret configuration values (feature flags, URLs without credentials, ports) — normal editing.
- The user pastes the value INTO the chat — refuse the chat-paste path entirely and ask them to put it on the clipboard instead, then run this skill.
- Setting a value inside source code or a committed config file — secrets live in untracked env files, never in the repo.

## Steps

1. **Refuse any chat-pasted secret.** If the value was pasted in the message, do NOT acknowledge or repeat it. Say: *"Don't paste secrets in chat — copy it to your clipboard and I'll run /set-secret."* Then proceed once it's on the clipboard.
2. **Resolve the target file + VAR name.** Infer from context (which project, which vendor). Default location: `~/.secrets/<vendor>.env` or the project's `.secrets/<name>.env`. VAR name by vendor convention (`STRIPE_SECRET_KEY`, `GITHUB_TOKEN`, `OPENAI_API_KEY`, …). **If either is ambiguous, ask — one short question beats writing to the wrong file.** Secrets are a confirmation-worthy class.
3. **Confirm the secret is on the clipboard.** One line: *"Confirm the key is on your clipboard and I'll write it to `<file>` as `<VAR>`."*
4. **Run the worker:**
   ```
   ~/.guardrails/set-secret/set-secret.sh --file <resolved-file> --var <VARNAME>
   ```
   Flags only when needed: `--create` (new var or new file), `--shape <name>` (only if auto-detect would fail; `--shape any` skips validation — last resort, confirm the vendor first).
5. **Report ONLY what the worker prints** — the one success line: `<VAR> set in <file> — ends in ...XXXX (len N)`. Never the value. If the worker refused (exit 3), pass its stderr through verbatim and ask the user to fix the clipboard or pick a different shape.
6. **Remind the user to reload** whatever consumes that env file: `source <file>` for shells; restart for daemons/MCP servers/dev servers.

## Hard rules (do not deviate)

- Never echo the secret value, never paste it into a tool call, never log it, never put it in a note. The file path and VAR name are fine; the value is forbidden.
- Never disable `--shape` validation reflexively; `--shape any` only when the catalog truly cannot match and the user confirmed the vendor.
- Never write to a file the user hasn't named or implicitly confirmed via project context. If you're guessing, ask.
- The worker keeps a single rolling `<file>.bak` — don't add timestamped backup clutter.

## Notes

- The shape catalog lives inside `set-secret.sh` (parallel `SHAPE_NAMES` / `SHAPE_PATTERNS` arrays, macOS bash 3.2 compatible). Extend both arrays together.
- The worker writes atomically (temp file + rename in the same directory); chmod 600 on both the target and the `.bak`.
- Clipboard source is `pbpaste` on macOS; on Linux/Windows the worker prints the supported alternative in its error message.

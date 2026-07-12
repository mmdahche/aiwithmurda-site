---
name: redaction-firewall
description: Fail-closed egress redaction firewall. Scrub secrets, PII, and opt-in PHI out of any content BEFORE it leaves a trust boundary — a log line, an OS notification, an off-box send, a memory write, a dashboard JSON. Use the firewall.py library API or the firewall.sh CLI filter whenever an agent or tool is about to emit text that could carry a credential or personal data, and use --check to gate "may this content leave as-is?". Fails closed if the pattern library is unavailable. $0, pure stdlib, cross-platform.
---

# redaction-firewall — the reusable fail-closed egress scrubber

A guard layer EVERY surface can call before emitting text: one canonical
pattern library (`lib/redact.py`), one thin firewall over it, zero forks.
If the pattern library can't be loaded, **every guard call fails closed**
(raises / exit 2) rather than letting un-scrubbed content through.

Installed location (via this pack's setup.sh): `~/.guardrails/redaction-firewall/`.

## When to use

- An agent/tool is about to **emit content past a trust boundary**: write a log,
  fire an OS notification, push to an external channel/webhook, write to durable
  memory, publish a dashboard JSON, or hand text to a less-trusted process.
- You need a **gate**: "does this content carry a secret/PII/PHI?" → `--check`.
- A project handles health data and wants **PHI** scrubbed too → the opt-in `phi` profile.

## When NOT to use

- As your ONLY egress control. It is a content scrubber (static patterns, literal
  text). It does **not** govern network destinations — pair it with deny-by-default
  network rules at your proxy/firewall layer.
- On encoded/serialized credential blobs (base64/hex/gzip/JSON-wrapped). See the
  known limitation — callers must not feed those in.
- To re-implement or fork the redactor. Always import the canonical lib.

## Profiles

| Profile | Patterns | Use for |
|---|---|---|
| `default` (default) | secrets **+ PII** (email/SSN/credit-card) | human-readable content leaving a boundary |
| `phi` | `default` **+ PHI** (MRN/NPI/ICD/DOB) | **opt-in**, projects handling health data |
| `secrets-only` | secrets, **no PII** | scanning **code/docs** where emails & digit runs false-positive |

An unknown profile name **fails closed** (raises) — it never degrades to "no patterns".

## Library API (Python agents/tools)

```python
import firewall  # load via importlib from ~/.guardrails/redaction-firewall/firewall.py

clean, was = firewall.scrub(text)                 # (scrubbed_text, was_redacted)
clean      = firewall.guard(text)                 # just the safe-to-emit string
clean      = firewall.guard(text, profile="phi")  # opt-in PHI
names      = firewall.find_secrets(text)          # ['github-token', ...] NAMES only
if not firewall.is_clean(payload):                # gate before emitting
    payload = firewall.guard(payload)
```

All calls are **fail-closed**: a firewall error (redactor unavailable / unknown
profile) or a pattern failure propagates — the caller must drop the content,
never emit it.

## CLI (shell pipelines / hooks / non-Python tools)

```sh
# filter: scrub stdin -> stdout
printf '%s' "$MSG" | ~/.guardrails/redaction-firewall/firewall.sh          # exit 0 = scrubbed stdout
printf '%s' "$MSG" | ~/.guardrails/redaction-firewall/firewall.sh --phi
printf '%s' "$CODE" | ~/.guardrails/redaction-firewall/firewall.sh --profile secrets-only

# check: gate "may this leave as-is?" (emits nothing to stdout)
printf '%s' "$MSG" | ~/.guardrails/redaction-firewall/firewall.sh --check  # 0=clean 1=secrets 2=fail-closed
```

**Exit codes** — filter: `0` scrubbed stdout produced, `2` FAIL-CLOSED (stdout is
NOT trustworthy — drop it). check: `0` clean, `1` secrets/PII/PHI present (pattern
NAMES on stderr, never the value), `2` FAIL-CLOSED.

### Example: scrub before an off-box notification

```sh
MSG=$(printf '%s' "$RAW" | ~/.guardrails/redaction-firewall/firewall.sh) \
  || { echo "redaction failed; not sending" >&2; exit 1; }
ntfy publish my-topic "$MSG"   # $MSG is scrubbed; a fail-closed (exit 2) blocks the send
```

## Known limitation (static patterns only)

Matches secrets/PII/PHI in their **literal** textual form. It does **not** catch
base64/hex/URL-encoded values, secrets inside serialized/compressed blobs, or
otherwise transformed strings. Treat redaction as a strong best-effort filter for
human-readable content, **not a guarantee** — never feed encoded credential blobs in.

## Security posture

- **Fail-closed** everywhere: redactor-unavailable, unknown-profile, or pattern-failure → raise / exit 2; content is never emitted on failure.
- **Never echoes a secret.** Logs and `--check` report the pattern **NAME** only.
- **No network, no eval/exec, no filesystem writes** (scrubbed text → stdout only).

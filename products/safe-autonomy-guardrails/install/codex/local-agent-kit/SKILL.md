---
name: local-agent-kit
description: The recurring local-agent pitfalls as reusable fail-closed guards. Use whenever a small/local model (or any agent) drives tools — inject a fresh date on every call (date_context/is_fresh), resolve a model-supplied ID against reality before acting (resolve_id), keep a read-token and an act-token from ever crossing (require_scope), block irreversible actions in code (guard_action — delete/send/mark-read/overwrite blocked unless operator-allow-listed), keep tokens out of logs (read_token from env + mask_token), and treat anything typed at the agent as untrusted (Allowlist deny-by-default + validate_input). Library API + a small CLI for hooks. Fail-closed everywhere; ships no exec/eval. $0, pure stdlib, cross-platform.
---

# local-agent-kit — the pitfalls, as code

A small/local model can act safely only behind a hardening layer. Each recurring
pitfall of letting a model drive tools becomes a **reusable, fail-closed guard**,
so the rule is enforced in code, not just written in a doc.

Installed location (via this pack's setup.sh): `~/.guardrails/local-agent-kit/`.

> **Fail-closed, always.** Every guard RAISES (or the CLI exits non-zero) on any
> doubt rather than letting an unsafe action through. Messages name the failure
> class / the offending action — **never a secret value**, and never raw untrusted
> content echoed verbatim (control chars are stripped from messages).

## The guards (each maps to a pitfall)

| Guard | Pitfall it kills | API |
|---|---|---|
| **Date-per-call** | an LLM has no clock; a date injected at startup goes stale | `date_context(now=None)` · `is_fresh(ts)` |
| **Resolve-IDs-before-execute** | small models hallucinate IDs | `resolve_id(supplied, real_ids)` · `try_resolve_id(...)` |
| **Separation of duties** | a read-token used to act (or vice-versa) | `require_scope(held, needed)` · `can_act(held)` |
| **Irreversible-action lock** | delete / send / mark-read are unrecoverable | `guard_action(name, allow=())` · `is_irreversible(name)` |
| **Token = identity** | tokens leak via argv / logs / world-readable files | `read_token(env_var)` · `mask_token(t)` · `check_token_file_mode(path)` |
| **Untrusted input** | anything typed at the agent is hostile | `Allowlist` · `validate_input(text)` |

## Library API (Python agents/tools)

```python
import kit  # load via importlib from ~/.guardrails/local-agent-kit/kit.py

# date on EVERY call (never cached at startup)
prompt = kit.date_context() + "\n" + user_prompt
if not kit.is_fresh(saved_date):           # caught a stale startup date → recompute
    saved_date = kit.date_context()

# resolve a model-supplied id before acting (raises on a hallucination)
real = kit.resolve_id(model_said, known_ids)   # returns a REAL id, or raises UnresolvedIDError

# read-token vs act-token: never crossed
kit.require_scope(held=token_scope, needed=kit.ACT)   # raises if a read-token tries to act

# irreversible-action lock (blocked unless the operator opts in)
kit.guard_action("delete")                          # raises IrreversibleActionError
kit.guard_action("delete", allow=["delete"])        # operator opted in → permitted

# token = identity (env-loaded, never logged)
tok = kit.read_token("MY_AGENT_TOKEN")              # raises if unset/empty
log.info("using %s", kit.mask_token(tok))           # never the value

# untrusted input
tools = kit.Allowlist(["status", "search", "help"])
tools.require_allowed(requested)                    # deny-by-default
kit.validate_input(user_text)                       # control chars / over-length → raise
```

Errors are all subclasses of `kit.KitError` (`UnresolvedIDError`, `ScopeError`,
`IrreversibleActionError`, `TokenError`, `NotAllowedError`, `UntrustedInputError`,
`ResolveUnavailableError`) — each a fail-closed "do not proceed" signal.

## CLI (shell hooks / non-Python tools)

```sh
~/.guardrails/local-agent-kit/kit.sh --date          # print a fresh UTC date-context line
printf '%s' "$INPUT" | ~/.guardrails/local-agent-kit/kit.sh --validate-input  # exit 0 valid / 2 invalid
~/.guardrails/local-agent-kit/kit.sh --guard-action delete                 # exit 2 (irreversible)
~/.guardrails/local-agent-kit/kit.sh --guard-action delete --allow delete  # exit 0 (opted in)
```

**Exit codes are fail-closed: `0` = valid/allowed, `2` = invalid/blocked.** Wire
`--validate-input` / `--guard-action` into a PreToolUse hook to reject hostile
input or block an irreversible tool call deterministically.

## When NOT to use

- As a network-egress control — pair with the redaction-firewall (content) and
  deny-by-default network rules (destinations).
- `resolve_id` is not a security boundary on its own; it lowers the odds of acting
  on a hallucinated id. Still gate the resolved id behind the allowlist + scope.
- To `exec` user text — the kit deliberately ships **no** exec/eval/system helper.

## Bundled alongside

`resolve_id` imports the bundled fuzzy-matching module
(`~/.guardrails/blueprints/fuzzy-matching/fuzzy_match.py`) — one owner of the
matching logic, never forked. If it can't be loaded, `resolve_id` fails closed
(raises) rather than guessing.

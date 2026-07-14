---
name: mcp-server-patterns
description: The design patterns for MCP servers that the picker actually uses well — writing tool descriptions like they are the API (because the picker reads only descriptions), preferring coarse one-round-trip tools over chatty ones, pagination and truncation contracts for large results, deterministic scripts behind tools, secrets via env not args, read-only vs mutating tool separation, versioning and deprecation etiquette, testing MCP servers with the Inspector and scripted stdio calls, and the failure modes (silent empty results, over-broad tools, schema drift). Use when reviewing an MCP server before shipping it, when the agent keeps picking the wrong tool, when tool results feel too chatty or too shallow, or when adding a second/third tool to an existing server. Pairs with mcp-server-build (the how-to) and agent-action-space (whether to add a tool at all).
---

# /mcp-server-patterns — design rules for MCP servers agents actually use well

An MCP server that runs is not an MCP server that works. Working means the
agent's tool picker fires the right tool at the right time with the right
args, gets a response shaped for the agent (not for a human console), and
either succeeds cleanly or fails in a way the agent can recover from. Every
rule below fights a specific failure mode observed in servers that "run but
don't get used."

## Rule 1 — The description IS the API

The picker sees your tool name, your description, and your input schema.
Nothing else. Not the function body, not the tests, not the README. If the
description is thin, the picker guesses; guesses are how the wrong tool
fires.

A description that carries its weight answers four questions:

1. **What does this return?** (Shape and units, not vague nouns.)
2. **When should the agent choose this?** (A phrase or two describing the
   intent this matches.)
3. **When should the agent NOT choose this?** (The neighbour tool that this
   is not.)
4. **What are the preconditions?** (Args it needs; arg it should get from
   another tool first.)

Thin (a real, common shape):

```
description: "Get order info."
```

Load-bearing:

```
description: "Return the current status, line items, and totals for ONE
order by its numeric order id. Use when the agent needs order details for
a specific order id it already has. If the order id is not known, call
search_orders first — this tool does NOT search."
```

Test rewrites the way you'd test code: ask the agent to "quote every MCP
tool description you can see verbatim, then explain in one sentence when to
pick each." If the agent's one-sentence back-translation is wrong, the
description is broken — regardless of what the docs say.

## Rule 2 — Coarse tools beat chatty tools

The single biggest performance improvement in a well-used MCP server is not
speed; it's **fewer round trips**. Every round trip is a full agent turn:
context inflates, latency compounds, the picker gets another chance to
misfire.

Compare the same capability, two ways:

**Chatty (five calls, five turns):**
```
list_orders()               → [ids...]
get_order(id)               → header
get_order_lines(id)         → items
get_order_customer(id)      → customer
get_order_totals(id)        → totals
```

**Coarse (one call, one turn):**
```
get_order_bundle(id)        → { header, lines, customer, totals }
```

Rule: **shape the response to the question the agent is trying to answer,
not to the row-by-row shape of your DB.** If callers always fetch A+B+C
together, return A+B+C together. Optional flags (`include_lines: false`) let
callers opt out of size when they know they don't need it.

The counter-pressure — don't return a whole DB dump — is real; that's what
Rule 3 handles.

## Rule 3 — Pagination and truncation are contracts, not surprises

Any tool that returns a list must answer three questions in its output:

1. **How many items did I return?** (`count`)
2. **How many did I skip?** (`truncated` boolean + optional `total_available`)
3. **How does the agent get the next page?** (`next_cursor` or `next_page`)

Return an empty array with no note when there are 40k results, and the
agent's downstream reasoning silently reads "there are none." That is the
single most damaging failure mode in production servers because it's
invisible in the transcript — no error, no warning, wrong answer.

A concrete contract:

```json
{
  "items": [ /* ... */ ],
  "count": 20,
  "truncated": true,
  "total_available": 1247,
  "next_cursor": "eyJvZmZzZXQiOjIwfQ=="
}
```

Same rule for text payloads — long file reads should return `text` plus
`bytes_read`, `total_bytes`, and either a `next_offset` or an explicit
"file was truncated at N bytes; call again with offset=N for more."

## Rule 4 — Deterministic scripts behind tools, not LLMs

Anything an MCP tool does should be reproducible: same inputs → same output.
Wrapping an LLM call behind a tool description makes the tool
non-deterministic, hard to test, expensive per call, and lets the outer
agent's reasoning drift into the inner agent's uncertainty. If the tool's
job is "summarize this doc," ship a script that extracts the summary
deterministically (structured headers, first-N-sentences, whatever the doc
shape allows) — and let the outer agent do the LLM work if none of those
apply.

The `regex-vs-llm` skill covers the decision framework in detail; the short
version here is: **an MCP tool is a bad place to hide an LLM.** Deterministic tools get called ten times a day for a week and behave
identically. LLM-behind-tools drift silently and take blame from the outer
agent for a failure that lives inside a nested model call.

## Rule 5 — Auth and secrets via env, never args

Every credential, API key, or connection string is a launch-time environment
variable, not a tool argument. Two reasons:

1. **The agent should not see it.** Args ship through the JSON-RPC transcript
   and end up in agent context. Env stays in the server process.
2. **The agent should not choose it.** If the API key is a tool arg, the
   agent will hallucinate values, pass the wrong workspace's key across
   sessions, or leak the last-seen key back into chat when asked "how did
   you authenticate?"

A tool that needs to know which tenant/workspace to hit should read that
from an env var (`WORKSPACE_ID`) set at launch. The exception is genuinely
per-call parameters — a customer_id the agent looked up two turns ago. That
IS an arg. The client's OAuth token to reach the customer DB is not.

## Rule 6 — Separate read tools from mutating tools

`update_order`, `delete_customer`, `send_email` are qualitatively different
from `get_order`, `search_customers`, `list_drafts`, and they deserve
different affordances:

- **Naming discipline.** Read tools take verbs like `get_`, `list_`,
  `search_`, `find_`. Mutating tools take verbs like `create_`, `update_`,
  `send_`, `delete_`. The picker infers safety from the verb; help it.
- **Description discipline.** Every mutating tool description explicitly
  states "This modifies state — [what changes], irreversible: [yes/no]." The
  agent's guardrails read that; users' guardrails read that.
- **Dry-run affordances.** For irreversible mutations, a `dry_run: true`
  arg that returns what WOULD happen without doing it is the single cheapest
  way to let the agent verify shape before firing.
- **Confirmation surface.** Some clients gate mutating tools behind explicit
  user approval when the description signals it (annotations like
  `destructiveHint: true` in the SDK's tool annotations). Set them.

## Rule 7 — Versioning and deprecation etiquette

MCP servers get called by more agents over time. Breaking a tool's schema
breaks every consumer at once, and consumers upgrade at different rates.

- **Additive changes are free.** New optional args, new fields in the
  response, new tools — safe.
- **Renames are breaks.** Rename by adding the new tool, marking the old
  one deprecated in its description ("DEPRECATED — call `search_customers`
  instead"), leaving the old one working for two releases, then removing.
- **Server-level version.** Bump the server's `version` field for every
  release; log it on start. When a bug turns out to be "you're on the old
  server," you can prove which one they had.
- **CHANGELOG.md next to the server.** Same discipline as any other
  library. Consumers grep it before they upgrade.

## Rule 8 — Testing MCP servers

The Inspector (`npx @modelcontextprotocol/inspector`) is the hand-test
loop. It is not a regression suite. For a server that ships to more than
one user, add:

- **Scripted stdio smoke tests.** Spawn the server, send the JSON-RPC
  `initialize` + `tools/list` + a couple of `tools/call` requests over its
  stdin, assert on the stdout responses. Node's built-in `child_process` +
  `readline` is enough — no framework needed. This catches "the server
  compiles and starts but its tool schema is malformed" in under a second.
- **Per-tool fixture tests.** For each tool, feed the underlying handler
  function a fixture input, snapshot the response. Keep fixtures as JSON
  files next to the tool.
- **A description eval, not just a code test.** Five realistic user
  prompts, expected tool for each, run against a real agent nightly. This
  catches description drift long before a user complains.

## The failure modes to watch for

Every server that "runs but doesn't get used" is failing one of these:

1. **Silent empty results.** No error, no truncation flag, no result. The
   agent reads "no results" as "no such thing exists." Fix with Rule 3.
2. **Over-broad tools.** `run(command: string, args: string[])` is a
   footgun disguised as flexibility — the picker can't tell when to fire it
   and users can't audit what it will do. Break it into named tools.
3. **Schema drift.** The tool description says the response has field
   `total`, the response has field `sum`. The agent parses either fine when
   reading text, badly when reading `structuredContent`. Snapshot tests
   catch this on every commit.
4. **Description theatre.** A description that reads as marketing copy
   ("blazingly fast order retrieval") instead of a spec. The picker doesn't
   care how fast it is; it cares what the tool returns and when to pick it.
5. **Chatty error surfaces.** A tool that returns `isError: true` with a
   200-word essay explaining what went wrong is worse than a two-line one.
   The agent reads the first line and moves on; the rest is context bloat.
6. **Absent examples.** The Zod input schema has no `.describe()` calls on
   its fields. The picker sees `limit: number` with no context and passes
   `1000` when the server caps at `200`. Every field gets a describe.

## Pairs with

- `mcp-server-build` — how to actually scaffold and wire up a server that
  these rules apply to.
- `agent-action-space` — whether the capability should be a tool, a
  resource, a skill, or a subagent.
- `regex-vs-llm` — the deterministic-scripts-behind-tools rule extended to
  parsing decisions.

## Origin

Original write-up for this pack. The techniques (description-first picking,
coarse tools, pagination contracts, structured errors, dry-run affordances,
scripted stdio smoke tests) are the shape of the MCP protocol and the
observed failure modes across many working servers; the taxonomy, the
worded rules, and every example above are this pack's own.

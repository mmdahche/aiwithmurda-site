---
name: agent-action-space
description: Design the action space an agent sees — fewer-better tools with descriptions the picker can actually rank, observation formatting (what comes BACK matters as much as what's callable), affordance naming, guarding irreversible actions behind explicit opt-ins, when to add a tool vs a skill vs a subagent, and how to measure whether a tool actually earns its context cost (call rate + success rate over a week). Use before adding a new tool to an agent, when the tool picker keeps guessing, when tools exist but the agent doesn't use them, or when reviewing the total capability surface of an agent config. Pairs with mcp-server-patterns for the tool-side rules and mcp-server-build for the how-to.
---

# /agent-action-space — designing what the agent can see and do

An agent's capabilities are not a list; they are a menu the picker reads
under time pressure. The wrong tool with a great description gets called;
the right tool with a bad description sits idle; a tool nobody has called
in three weeks is silently paying rent in every context window. Action-
space design is about what makes it onto the menu, what it says on the
menu, and what happens when the agent orders it.

The four rules below are what separate action spaces that scale (agent
performance improves as you add capabilities) from ones that don't (each
new tool makes the agent slightly worse at everything).

## When to use

- Before adding a new tool, resource, or subagent to an agent.
- When the picker keeps guessing wrong or ignoring perfectly good tools.
- When an agent's config has ballooned past a dozen tools and it "feels
  slower and dumber than it used to."
- Reviewing a client (Claude Code, IDE, CI runner) config before shipping
  it to a team.

## When NOT to use

- One-shot scripts a human runs directly — no picker, no problem.
- Read-only reference material the agent should just remember (a style
  guide, a schema doc) — that's a **skill**, not a tool; skip to Rule 3.
- Deep engineering on the tool's internals — that's `mcp-server-build`
  and `mcp-server-patterns`. This skill is about whether the tool should
  exist at all and how it presents.

## Rule 1 — Fewer, better tools than more, blurrier ones

Every tool has a fixed context cost (name + description + schema in every
turn) and a variable cost (the picker's attention). Adding a tool taxes
every other tool's chance of being picked correctly.

The test: **can you write a description for this tool that names the
specific intent it matches, and can you write descriptions for its
neighbours that don't overlap it?** If not, the tool is not distinct
enough to justify a slot. Merge it with the closest neighbour, or split
the neighbour so the seams are clean.

Heuristic ceilings that show up empirically:

- **10 tools per server** — beyond this, picker accuracy drops sharply
  unless the tools are very obviously non-overlapping.
- **20 tools across all servers in one client** — beyond this, agent
  session latency and drift start to compound.

These are floors to design against, not sacred numbers. But every time you
consider adding tool #21, look first for tool #4 that got called twice in
the last month.

## Rule 2 — Observations matter as much as actions

The picker is half the game. The other half is what the agent reads when
the tool returns. Consider the same tool, two ways:

**Bad observation:**
```
Result: OK. 47 rows.
```

**Good observation:**
```json
{
  "count": 47,
  "truncated": false,
  "items": [ /* shaped as {id, status, total, customer_name} */ ]
}
```

The bad version forces the agent to call again just to see anything. The
good version lets it reason directly. The rule: **an observation is a
message from the tool to the agent's next turn.** Design it like you're
writing the prompt the next turn will read — because you are.

Concrete observation principles:

- **Return structured data next to human text.** `content` (text) for the
  reader, `structuredContent` (JSON) for the machine. Newer clients skip
  the parse; older clients read the text.
- **Include the metadata the agent needs to decide "what next".** Was it
  truncated? Was it authoritative? How stale is the underlying data?
  Missing metadata is where "silent wrong" bugs live.
- **Errors are observations too.** A useful error tells the agent what
  went wrong AND what to do next. "Version not found. Call
  list_releases first" beats "not found".
- **Formatting is not decoration.** Numbers as numbers, dates as ISO
  strings, prices as fixed-decimal strings when precision matters. The
  agent parses these back — inconsistency here becomes bugs downstream.

## Rule 3 — Tool vs skill vs subagent — the decision

Three affordances, one decision every time you want to add capability:

| Affordance | When to pick | What it is |
|---|---|---|
| **Skill** (markdown file) | The capability is "know how to X" — reference, procedure, checklist. No new verbs. | Prose the agent reads on demand. Free to add, cheap to maintain, no runtime. |
| **Tool** (MCP or built-in) | The capability is a deterministic verb — same input → same output. The agent should call it, not simulate it. | A named endpoint the picker can fire with typed args. |
| **Subagent** | The capability is a bounded conversation — a specialist that owns its own context for a few turns before returning a result. | A prompt-configured agent launched as a task, returning a summary + artifacts to the parent. |

Quick tests:

- If it can be a shell command → **tool** (or nothing; agent runs the
  command directly).
- If it's "read this and follow it" → **skill**.
- If it involves multi-step reasoning against a specialized context (e.g.
  "review this diff for security issues") → **subagent**.
- If the same request should be answered identically in every session →
  **tool** (deterministic).
- If the request needs judgment against a body of examples →
  **subagent** (has room for reasoning).

Anti-patterns to catch:

- **Skill masquerading as tool.** A "tool" whose function body is `return
  fs.readFileSync("style-guide.md")` is a skill; ship it as a skill file
  and let the agent load it.
- **Tool masquerading as skill.** A skill titled "How to look up an order
  by phone number" that then walks the agent through five shell commands
  every session is a `lookup_order_by_phone` tool waiting to be born.
- **Subagent masquerading as tool.** A "tool" that internally spawns an
  LLM call is not a tool — it's a hidden subagent (see
  `mcp-server-patterns` Rule 4). Ship it as an explicit subagent so the
  parent agent's reasoning knows a fresh reasoning layer is running.

## Rule 4 — Guard irreversible actions behind explicit opt-ins

Mutating and destructive actions do not deserve the same picker
affordance as reads. Three levels, escalating:

1. **Reversible, low-blast.** Create a draft, save a file. Fine as a
   normal tool; the description signals mutation ("Create a new..."), the
   agent picks it when needed.
2. **Reversible, high-blast.** Send an email to a list, publish a post,
   update every record matching X. Add a `dry_run: true` default and
   require an explicit `dry_run: false` to actually fire. The agent
   forgets to flip flags less often than it invents mutating calls; the
   default protects the world.
3. **Irreversible.** Delete production data, force-push a branch, wire
   money. Do not ship these as tools the picker can fire. Ship them as
   scripts a human runs, or as tools gated behind a per-call
   confirmation surface (client-side approval prompt, tool annotation
   flagging destructive intent, or a separate credential path the agent
   doesn't hold).

The naming discipline reinforces the guarding: `send_` and `delete_` and
`publish_` are picker signals; `create_draft` is not the same tool as
`publish_draft` and shouldn't share a name.

## Measuring whether a tool earns its slot

Every tool competes for context. Track two numbers per tool over a rolling
week:

1. **Call rate.** How often is this tool picked across sessions? A tool
   called zero times in a month is either invisible (bad description) or
   redundant (another tool covers it). Either way it's a candidate for
   deletion or merger.
2. **Success rate.** Of the calls, how often does the tool return a
   useful non-error result? A tool with a 30% success rate is either
   getting picked wrong (description misleads the picker) or has a real
   bug. Fix or narrow the description.

A "usage log" for MCP servers is a middleware layer that appends
`{timestamp, tool_name, args_shape, is_error}` to a local file. Grep it
weekly. A tool that hits both a low call rate AND a high error rate is a
deletion candidate — remove it, watch the agent for a week, and add it
back if a workflow noticeably degrades.

## The action-space audit (do this before every quarter)

A concrete audit you can run in 20 minutes:

1. **List every tool the agent has visibility into.** MCP tools + built-in
   tools + any bespoke actions.
2. **For each tool, write a one-sentence "when to pick this" from
   memory.** Then check against its actual description. Every mismatch is
   description drift.
3. **For each pair of tools, ask "when would the picker legitimately be
   torn between these two?"** Any pair with a real answer here needs
   sharper descriptions or a merger.
4. **Pull call-rate stats.** Anything at zero for a month, anything under
   50% success — flag for review.
5. **Look at the observation payloads.** Any tool whose response is one
   sentence of unstructured text is under-designed. Any tool whose
   response is 2000 tokens of JSON is over-designed.
6. **Ask "if I removed this tool tomorrow, what workflow breaks?"** If
   the answer is "none," remove it. If the answer is "the agent would do
   it manually via shell" — check that manual path is actually painful
   before keeping the tool.

The audit will typically retire 2–3 tools and rewrite the descriptions of
5–8 more. Both changes make the picker more accurate on the tools that
remain.

## Pairs with

- `mcp-server-patterns` — the tool-side design rules (descriptions,
  coarse tools, pagination, errors) this action-space design applies.
- `mcp-server-build` — the how-to for shipping a tool once you've
  decided it belongs.
- `regex-vs-llm` — the parsing-decision framework that keeps tools
  deterministic rather than hiding LLMs inside them.

## Origin

Original write-up for this pack. The techniques (picker-context economics,
observation-as-message, tool/skill/subagent decision, mutation guarding,
call-rate/success-rate measurement) are common practice across agent
harnesses; the taxonomy, the four rules, the audit protocol, and every
example above are this pack's own.

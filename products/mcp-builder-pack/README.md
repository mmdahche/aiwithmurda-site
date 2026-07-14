# MCP Builder Pack

Build the tools your agent is missing. Four skills that take you from "the
agent doesn't have a way to do X" to a small, tested, well-picked MCP tool
in the client — plus the design discipline that keeps it from silently
paying rent in every future context window.

## Who this is for

Builders whose agent keeps hitting the wall labelled *"I can't do that from
here."* Anyone who has watched an agent invent shell one-liners around a
missing capability, or shipped a home-grown MCP server that the picker
never actually chooses. Teams standardizing what "add a tool for the
agent" means so every new server ships with descriptions the picker can
rank, deterministic behavior the reviewer can audit, and a size the
context budget can afford.

## Time to first value

~45 minutes: scaffold the worked-example server, wire it into Claude Code,
watch the picker choose the wrong tool, edit one description, watch it
choose the right one. That single edit is the entire craft of MCP work —
everything else in the pack teaches you how to see it coming and how to
scale it.

Follow `00-START-HERE.md`.

## What's inside

| Skill | The problem it kills |
|---|---|
| `mcp-server-build` | "I want to add a tool but I don't know where to start" — end-to-end SDK build with a working two-tool `changelog-query` example |
| `mcp-server-patterns` | "The server runs but the agent never picks it" — description-first design, coarse-vs-chatty tradeoffs, pagination contracts, structured errors, versioning etiquette |
| `agent-action-space` | "We have 20 tools and the picker feels drunk" — fewer-better-tools discipline, observation formatting, tool-vs-skill-vs-subagent decision, call-rate audits |
| `regex-vs-llm` | "Should this be a regex or an LLM call?" — the three-tier deterministic-first framework with a confidence gate, and three worked examples |

All plain markdown. Works with Claude Code and Codex. The one worked
example ships in TypeScript against `@modelcontextprotocol/sdk`; the
principles apply unchanged to any client or SDK.

## Setup

Copy the four files from `install/claude-code/` into your skills/commands
folder — or per-skill `install/codex/<name>/SKILL.md` into
`.agents/skills/`. No dependencies, nothing to run to install the skills
themselves.

To follow the worked example (build and run the `changelog-query` server),
you need Node 20+ and the two npm packages the walkthrough installs:
`@modelcontextprotocol/sdk` and `zod`.

## What this is NOT

- Not a hosted MCP server or a marketplace — it's a build guide, a design
  rulebook, and an action-space audit method.
- Not a wrapper library or a code generator — the worked example is real
  code you author yourself against the official SDK; nothing to lock in.
- Not a substitute for reading the MCP spec if you need protocol edge
  cases. It's the practitioner layer on top: what to build, how to shape
  descriptions, how to know when a tool earns its slot.
- No outcome promises. It raises the floor on tool design; whether the
  tools you ship actually help your agent is your call.

## Support boundary

Digital product. Setup questions: murad@aiwithmurda.com. No custom MCP
server implementation included. MIT licensed — reuse freely, attribution
appreciated.

## Lineage (honesty note)

All four skills — `mcp-server-build`, `mcp-server-patterns`,
`agent-action-space`, `regex-vs-llm` — are **original write-ups for this
pack**. The underlying concepts (the MCP protocol shape, the official
TypeScript SDK's API, the description-first picker behavior, coarse-tool
patterns, action-space economics, deterministic-first parsing) are public
practitioner wisdom and the shape of the official specifications; the
taxonomies, the rule numbering, the worked examples, the audit protocols,
and every word of every description above are this pack's own. No
third-party skill text was copied.

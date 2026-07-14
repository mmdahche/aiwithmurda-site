# START HERE — MCP Builder Pack

You bought the pack that turns "the agent can't do that" into a small,
well-picked tool sitting in the client. Four disciplines that close the
loop from *"we need a new capability"* to *"the picker fires it reliably
and it doesn't quietly pay context rent forever"*: how to build an MCP
server, the design patterns that keep it usable, how to design the whole
action space around it, and when a regex would have been the right answer
instead of a tool at all.

All markdown skills — no dependencies, no installs beyond copying files.
The worked example builds real TypeScript against
`@modelcontextprotocol/sdk`; the principles apply unchanged to any
client or SDK.

## Your first win in 4 steps (~45 minutes)

1. **Install the four skills:** copy `install/claude-code/*.md` into your
   skills/commands folder (Codex: `install/codex/<name>/SKILL.md` →
   `.agents/skills/`). Restart the client; ask the agent to list the new
   skills it can see. If any name back garbled, the skill file didn't
   copy cleanly — re-check.
2. **Build the worked example:** follow
   `examples/changelog-mcp-walkthrough.md` end to end — scaffold, code,
   Inspector smoke test, wire into Claude Code with `.mcp.json`. About
   30 minutes if it's your first MCP server. You end with a two-tool
   `changelog-query` server the agent can call.
3. **Run the tuning iteration:** the walkthrough deliberately shows the
   picker firing the *wrong* tool on a realistic prompt, and fixes it
   with one description edit. Watch that edit take effect. That single
   loop — realistic prompt → wrong pick → description edit → right pick
   — is the entire craft of MCP work.
4. **Then audit your existing action space** with
   `payload/agent-action-space.md`'s 20-minute audit protocol. You will
   typically retire 2-3 tools and rewrite 5-8 descriptions the first
   time you run it.

## Where everything is

- `payload/mcp-server-build.md` — build an MCP server end to end with the
  official TypeScript SDK; scaffold, tool definitions, Zod schemas,
  resources, transports, client wiring, and the iterate-with-the-agent
  loop. Includes the complete `changelog-query` server source.
- `payload/mcp-server-patterns.md` — eight design rules for MCP servers
  that the picker actually uses well: description-writing, coarse tools,
  pagination contracts, structured errors, deterministic scripts,
  secrets discipline, read/mutating separation, versioning, testing —
  and the six failure modes to watch for.
- `payload/agent-action-space.md` — how to design the total capability
  surface the agent sees: fewer-better tools, observation formatting,
  tool-vs-skill-vs-subagent decision, irreversible-action guarding, and
  the quarterly audit that keeps the surface tight.
- `payload/regex-vs-llm.md` — the three-tier parsing framework
  (deterministic → LLM → human) with a confidence gate, the anti-patterns
  to catch in code review, and three worked examples showing the framework
  producing the right verdict for each.
- `install/claude-code/` + `install/codex/` — the same four skills in
  both agent layouts.
- `examples/changelog-mcp-walkthrough.md` — the two-tool server built
  end to end, including the description-tuning iteration.
- `VERIFY.md` — the checklist we ran before shipping; re-run it.

## The one rule

**The picker reads descriptions, not code.** Every discipline in this
pack exists to make that one asymmetry work in your favor: descriptions
so specific the picker cannot legitimately hesitate, tools coarse enough
that one call answers the question, observations shaped like messages to
the agent's next turn, and a total surface small enough that the picker
still has attention left. The first server you ship following these rules
will out-pick five servers that don't.

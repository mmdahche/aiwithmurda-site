---
name: mcp-server-build
description: Build a Model Context Protocol (MCP) server with the official TypeScript SDK — project scaffold, tool definitions with Zod input schemas and load-bearing descriptions, resources vs tools, stdio vs Streamable HTTP transports, structured error surfaces, local wiring into Claude Code (`claude mcp add`, `.mcp.json`) or any generic client, and the iterate-with-the-agent loop that tunes descriptions until the tool picker fires reliably. Use when the user says "build an MCP server", "add a tool for the agent", "wrap this internal API for Claude", or "the agent needs to do X but doesn't have a way to". Pairs with mcp-server-patterns for the design rules and agent-action-space for whether a new tool is the right unit at all.
---

# /mcp-server-build — build the tool the agent is missing

MCP (Model Context Protocol) is how a coding agent gets a new verb. When your
agent needs to query your internal changelog, look up a customer by phone, or
run a deterministic script against your repo, wrapping that capability in an
MCP server is usually the right unit — a small, versioned, testable process the
agent calls through a stable JSON-RPC contract instead of a shell one-liner it
invents on the fly.

This skill takes you end to end: scaffold → two working tools → wire into a
client → iterate the tool descriptions until the picker fires reliably.
Everything is in Node.js/TypeScript against the official SDK
(`@modelcontextprotocol/sdk`).

## When to use

- The agent needs a capability that isn't a raw shell command (parses data,
  hits an internal API, enforces a contract).
- You already have a working script or CLI and want the agent to call it as a
  first-class tool with typed inputs.
- Multiple agents (Claude Code, another IDE, a CI job) need the same
  capability — the MCP server is one implementation many clients share.

## When NOT to use

- The task is a one-off shell command the agent can just run — `git status`
  doesn't need a wrapper.
- The capability is pure reference material (a style guide, an API doc) — that
  is a **skill** or a **resource**, not a tool. See `agent-action-space` for
  the tool-vs-skill-vs-subagent decision.
- The action is destructive and rare (nuke a prod DB) — a tool the picker can
  fire is the wrong shape; keep it as a script the human runs.
- You don't yet know which tools you need. Prototype in a skill first, promote
  to a tool when the shape is stable.

## The five-part mental model

Every MCP server exposes some subset of five things over one transport:

1. **Tools** — actions the agent picks and calls with typed args. The picker
   reads only the `description` field to decide (see `mcp-server-patterns`).
2. **Resources** — addressable read-only data (`file://`, `db://orders/42`).
   Good for "content the agent may want to attach" — bad for parameterized
   queries; those are tools.
3. **Prompts** — reusable prompt templates the client offers as slash commands
   or menu items. Optional; most servers ship none.
4. **Sampling** (server → client) — the server asks the client to run an LLM
   call. Rarely needed for internal servers.
5. **Roots / logging / progress** — protocol plumbing you mostly get for free.

If you are wrapping an API, you want **tools** (parameterized actions) plus
maybe a couple of **resources** (canonical documents worth attaching by URI).
Everything else is optional.

## Step 1 — Scaffold

```bash
mkdir changelog-mcp && cd changelog-mcp
npm init -y
npm i @modelcontextprotocol/sdk zod
npm i -D typescript @types/node
npx tsc --init --target es2022 --module nodenext --moduleResolution nodenext \
  --outDir dist --rootDir src --strict --esModuleInterop
mkdir src
```

Then edit `package.json`:

```json
{
  "type": "module",
  "bin": { "changelog-mcp": "dist/index.js" },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc --watch"
  }
}
```

`type: module` is not optional — the SDK ships ESM, and you'll want top-level
`await` in the entry point.

One tsconfig knob to flip: recent TypeScript releases ship `tsc --init` with
`"types": []`. Node.js globals (`process`, `node:fs/promises`, `node:path`)
won't resolve without opting in. Add this to `compilerOptions` in
`tsconfig.json`:

```json
"types": ["node"],
"lib": ["esnext"]
```

The generated `tsconfig.json` includes a commented hint saying exactly this
— uncomment it, or paste the two lines above.

## Step 2 — The worked example server (full source)

The goal: a read-only server that answers "what changed in this project?" by
querying the local `CHANGELOG.md`. Two tools — `list_releases` and
`get_release_notes` — plus the changelog file exposed as an MCP resource. This
is the same server the pack's `examples/changelog-mcp-walkthrough.md` builds
step by step and iterates on until the picker gets the descriptions right.

`src/index.ts`:

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CHANGELOG_PATH = process.env.CHANGELOG_PATH ?? "./CHANGELOG.md";

interface Release {
  version: string;
  date: string;
  bodyLines: string[];
}

async function loadReleases(): Promise<Release[]> {
  const raw = await readFile(resolve(CHANGELOG_PATH), "utf8");
  const lines = raw.split(/\r?\n/);
  const header = /^##\s+(\d+\.\d+\.\d+)\s+[—-]\s+(\d{4}-\d{2}-\d{2})/;
  const releases: Release[] = [];
  let current: Release | null = null;
  for (const line of lines) {
    const m = header.exec(line);
    if (m) {
      const [, version, date] = m;
      if (!version || !date) continue;
      if (current) releases.push(current);
      current = { version, date, bodyLines: [] };
      continue;
    }
    if (current) current.bodyLines.push(line);
  }
  if (current) releases.push(current);
  return releases;
}

const server = new McpServer({
  name: "changelog-query",
  version: "0.1.0",
});

server.registerTool(
  "list_releases",
  {
    title: "List releases",
    description:
      "Return every released version recorded in the project's CHANGELOG.md, newest first, as {version, date, summary}. Use when the agent needs the version history, the latest shipped version, or a release date. Does NOT return the per-release bullet content — call get_release_notes with a specific version for that.",
    inputSchema: {
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .default(20)
        .describe("Max releases to return, newest first. Default 20."),
    },
  },
  async ({ limit }) => {
    const releases = await loadReleases();
    const shaped = releases.slice(0, limit).map((r) => ({
      version: r.version,
      date: r.date,
      summary: r.bodyLines.find((l) => l.trim())?.trim() ?? "",
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(shaped, null, 2) }],
      structuredContent: { releases: shaped },
    };
  },
);

server.registerTool(
  "get_release_notes",
  {
    title: "Get release notes for one version",
    description:
      "Return the full changelog body (the bullet list of what changed) for ONE specific released version. Use when the agent needs to answer 'what changed in v1.2.3' or diff two releases. Requires an exact semver string as it appears in CHANGELOG.md — call list_releases first if the version is not already known.",
    inputSchema: {
      version: z
        .string()
        .regex(/^\d+\.\d+\.\d+$/)
        .describe("Exact semver, e.g. '1.2.3', matching a heading in CHANGELOG.md."),
    },
  },
  async ({ version }) => {
    const releases = await loadReleases();
    const hit = releases.find((r) => r.version === version);
    if (!hit) {
      return {
        content: [
          {
            type: "text",
            text: `No release found for version '${version}'. Call list_releases to see available versions.`,
          },
        ],
        isError: true,
      };
    }
    const body = hit.bodyLines.join("\n").trim();
    return {
      content: [{ type: "text", text: body }],
      structuredContent: { version: hit.version, date: hit.date, body },
    };
  },
);

server.registerResource(
  "changelog",
  "changelog://project",
  {
    title: "Project CHANGELOG",
    description: "The raw project CHANGELOG.md as text.",
    mimeType: "text/markdown",
  },
  async (uri) => {
    const raw = await readFile(resolve(CHANGELOG_PATH), "utf8");
    return {
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: raw }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

Points worth making explicit — the same points the design-patterns skill
enforces as rules:

- **Descriptions do the work.** The picker never sees your function body; it
  picks tools by reading `description`. Every description above says what the
  tool returns, when to use it, and what it does NOT do. The "does NOT" clause
  is what stops `list_releases` from being called when the agent actually
  wants the body of one release.
- **Zod schemas are for the client and the picker.** `.describe(...)` on each
  field surfaces the constraint in the agent's tool list — cheaper than
  guarding a bad call server-side.
- **Errors are returns, not throws.** A thrown exception aborts the whole
  JSON-RPC call and gives the agent nothing to reason about. Returning
  `{ content, isError: true }` gives the agent a readable failure and a path
  forward (in this case: "call list_releases first").
- **`structuredContent` next to `content`.** The `content` array is the
  human/agent-readable text; `structuredContent` is the machine-parseable
  duplicate. Newer clients read the structured field and skip the text parse.
  Ship both for portability.
- **Env for config, not args.** `CHANGELOG_PATH` is not a tool input — it's a
  server-launch config. Args are for what the agent chooses per-call; env is
  for what the operator configures once.

## Step 3 — Build and smoke-test locally with the Inspector

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

The Inspector is a local web UI. It boots your server over stdio, lists what
it exposes, and lets you invoke tools by hand — the fastest possible feedback
loop. Verify:

1. **Tools tab** shows both tools with their descriptions and input schemas.
2. `list_releases` returns your changelog releases as JSON.
3. `get_release_notes` with a real version returns the body; with a bogus
   version returns `isError: true` and the helpful message.
4. **Resources tab** shows `changelog://project` and reads back the raw file.

If the tool list is empty or a call hangs, the server crashed on startup —
tail stderr in the Inspector's log pane.

## Step 4 — Choose a transport

- **stdio** — the default for local, single-user, per-client servers. Client
  spawns the process; JSON-RPC over stdin/stdout; no port, no auth. This is
  the right pick for anything a developer runs on their own machine (the
  changelog example, a repo-linter, a scan2stock helper).
- **Streamable HTTP** — the right pick for shared/remote servers, multi-user
  deployments, or any server that outlives a single client session. Runs an
  HTTP endpoint that speaks JSON-RPC with optional server-sent-event streaming
  for long tool responses.

If in doubt: start with stdio. It's simpler, has no auth surface, and
migrating to Streamable HTTP later is a transport swap, not a rewrite:

```typescript
// stdio (above):
const transport = new StdioServerTransport();

// Streamable HTTP alternative:
import { StreamableHTTPServerTransport } from
  "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
});
await server.connect(transport);
const http = createServer((req, res) => transport.handleRequest(req, res));
http.listen(3333);
```

The older SSE transport is deprecated; do not build against it for new work.

## Step 5 — Wire it into Claude Code

Two ways, pick one:

**A. Per-project, checked into the repo** — create `.mcp.json` at the repo
root:

```json
{
  "mcpServers": {
    "changelog": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": { "CHANGELOG_PATH": "./CHANGELOG.md" }
    }
  }
}
```

This means every teammate who opens the repo in Claude Code gets the tool.

**B. Per-user, global** — from the project root:

```bash
claude mcp add changelog -- node ./dist/index.js
```

Then restart Claude Code and open a fresh session in that project. Ask the
agent: "list the MCP tools you can see." It should name both tools and quote
their descriptions.

For other clients, the config lives in a similar JSON block — the shape
(`command`, `args`, `env`) is what all clients agree on; only the surrounding
config key name differs per client. If a client expects Streamable HTTP
instead, point it at the HTTP URL from Step 4 and drop the `command`/`args`.

## Step 6 — The iterate-with-the-agent loop (this is where servers get good)

Getting the server to run is 30% of the work. The other 70% is making the
picker actually call the right tool at the right time. Loop:

1. **Ask the agent what it sees.** "List the tools this MCP server exposes,
   quoting the description verbatim." If the description reads back garbled,
   the description IS the bug.
2. **Fire a realistic prompt** in a fresh session — the kind of question the
   tool exists to answer. Watch which tool the agent picks and what args it
   sends.
3. **Diagnose the pick, not the result.** If it chose `list_releases` when
   the user asked "what changed in 1.2.0", the description is under-selling
   the version specificity of `get_release_notes`. If it invented arg values,
   your `.describe()` copy is thin.
4. **Rewrite the description**, rebuild, restart the client, retry the same
   prompt. Two-line description fixes routinely change the picker's behavior
   more than any code change.
5. **Save the prompts as a mini eval.** Five realistic prompts, expected tool
   for each, expected arg shape. Rerun on every description change. This is
   the fastest way to keep the picker steady as you add tools.

The pack's worked example (`examples/changelog-mcp-walkthrough.md`) shows this
loop firing on this exact server — the agent initially picks `list_releases`
when the user asks about one specific version, and one description edit fixes
it. That kind of tuning is not decoration; it is the load-bearing
engineering.

## Common mistakes on the first server

- **Description-as-name.** "Get release notes." That's a title, not a
  description. The picker sees three lines that look identical and rolls
  dice.
- **Throwing instead of returning `isError`.** Kills the agent's ability to
  self-correct — see the design-patterns skill.
- **A single mega-tool with a discriminator arg.** `run_command(kind: "list"
  | "get")` reads to the picker as one blurred tool; two named tools with
  distinct descriptions pick more reliably.
- **Reading config from tool args.** If the agent can change the file path,
  the agent will change the file path when the schema is loose. Use env.
- **Shipping without a `type: module`.** ESM SDK, top-level await — the
  server won't even start.

## Pairs with

- `mcp-server-patterns` — the design rules this skill applies (description
  copy, coarse vs chatty, structured errors, testing).
- `agent-action-space` — whether an MCP tool is even the right unit for the
  capability, or whether a skill/subagent fits better.
- `regex-vs-llm` — if your tool is a parser, the decision framework that
  keeps you from wrapping an LLM when a regex would do.

## Origin

Original write-up for this pack. The concepts (protocol structure, transport
choices, description-driven picking, Zod schemas, structured errors) are the
public MCP specification and the shape of the official TypeScript SDK; the
scaffold, the worked example server, the iterate-with-the-agent loop, and
every word of every description above are this pack's own.

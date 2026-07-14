# Worked Example — Building the `changelog-query` MCP Server

A complete walk-through of the server from `payload/mcp-server-build.md`, end
to end: scaffold, run, wire into a client, and — the load-bearing bit — a
description-tuning iteration where the agent initially picks the wrong tool
and one description edit fixes it. Follow along; you will finish with a
working MCP server and a repeatable feedback loop you can apply to every
tool you ship after this one.

Prerequisites: Node 20+ and Claude Code (or any MCP-capable client) on your
machine.

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

Edit `package.json`:

```json
{
  "type": "module",
  "bin": { "changelog-mcp": "dist/index.js" },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

The `type: module` line is not optional — the SDK is ESM and the entry file
uses top-level `await`.

Then open `tsconfig.json` and enable Node types — recent TypeScript releases
ship `tsc --init` with `"types": []`, and Node's globals (`process`,
`node:fs/promises`) won't resolve without opting in. Add:

```json
"types": ["node"],
"lib": ["esnext"]
```

into `compilerOptions`. (The generated file has a commented hint saying
this; either uncomment or paste the two lines above.)

## Step 2 — Author `src/index.ts`

Copy the full server source from `payload/mcp-server-build.md` (the "Step 2
— The worked example server" block). Save it as `src/index.ts`. Two tools,
one resource, stdio transport.

## Step 3 — Give it a real CHANGELOG to answer against

At the repo root, create a small `CHANGELOG.md` — the file the server will
query. This is the input the agent's tool calls will read.

```markdown
# Changelog — demo-project

## 1.2.0 — 2026-06-30
- Added: dark mode toggle in preferences.
- Fixed: race in the draft autosave loop that occasionally lost the last edit.
- Deprecated: legacy `/api/v1/notes` — use `/api/v2/notes`.

## 1.1.0 — 2026-05-14
- Added: bulk export to CSV.
- Fixed: incorrect timezone display on the activity feed.

## 1.0.0 — 2026-04-01
- Launch edition.
```

## Step 4 — Build and smoke-test with the Inspector

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

The Inspector boots a local web UI, spawns your server over stdio, and lets
you invoke tools by hand. Verify — in this exact order:

1. **Tools tab** lists `list_releases` and `get_release_notes` with their
   descriptions. If the list is empty or the tab is stuck loading, the
   server crashed on startup — check the Inspector's stderr pane.
2. **Call `list_releases`** with no args (accepts the `limit: 20` default).
   Expected: three entries `[{version, date, summary}]` newest-first.
3. **Call `get_release_notes`** with `version: "1.2.0"`. Expected: the three
   bullets for that release, returned as text plus a structured
   `{version, date, body}` object.
4. **Call `get_release_notes`** with `version: "9.9.9"`. Expected:
   `isError: true` and a message telling the caller to run `list_releases`
   first. This is the recoverable failure path — the agent needs the
   instruction, not just the error.
5. **Resources tab** shows `changelog://project` and reads back the raw
   `CHANGELOG.md`.

If all five pass, the server *runs*. It does not yet *work* — see Step 6.

## Step 5 — Wire it into Claude Code

At the repo root, create `.mcp.json`:

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

Restart Claude Code and open a fresh session in this project. Confirm
discovery:

> **You:** List the MCP tools you can see, quoting each tool's description
> verbatim.

Expected: the agent names `list_releases` and `get_release_notes`, quotes
both descriptions, and (if you ask) can also name the `changelog://project`
resource.

If it can't see them, your restart didn't reload the config — quit the
client, not just the workspace.

## Step 6 — The tuning iteration (this is the load-bearing part)

Running the server is 30% of the work. The other 70% is watching the picker
choose between your tools on realistic prompts, and rewriting descriptions
until it picks the intended tool without hedging. Below is the actual loop
that happens on this exact server — the miss, the diagnosis, the fix.

### The realistic prompt

Open a fresh session in Claude Code (fresh so you can see the picker
decide without prior turns tilting it) and ask:

> **You:** What changed in v1.2.0?

### The miss

With the description block as it was in an earlier draft — before the
"does NOT" clause was added — the picker fires **`list_releases`**. The
agent gets back the summary list, reads it, and answers with the one-line
summary from the array. It gets the right *answer* by accident, because
`list_releases` happens to include a `summary` field, but it did not
answer *from* the release notes — it answered from a summary line, and if
that summary line were empty (a common shape in real changelogs) the
answer would be wrong.

The diagnosis writes itself: **the picker is picking the tool that returns
the version list because it has no signal that `get_release_notes`
outranks it when the version is already known.**

### The description edit

Compare the two descriptions the pick was choosing between. The earlier
draft — the version that lost the pick — read something like:

```
list_releases: "Return the recent releases from CHANGELOG.md."
get_release_notes: "Return release notes for a version."
```

Both descriptions are grammatical. Neither answers the picker's actual
question: *given this user prompt, which of these two tools is the
right one, and why not the other?*

The fix is not to make `get_release_notes`'s description longer. The fix
is to put the *comparison* into the descriptions themselves — each tool
tells the picker when it is NOT the right one.

Updated pair (this is what ships in `payload/mcp-server-build.md`):

```
list_releases: "Return every released version recorded in the project's
CHANGELOG.md, newest first, as {version, date, summary}. Use when the
agent needs the version history, the latest shipped version, or a release
date. Does NOT return the per-release bullet content — call
get_release_notes with a specific version for that."

get_release_notes: "Return the full changelog body (the bullet list of
what changed) for ONE specific released version. Use when the agent
needs to answer 'what changed in v1.2.3' or diff two releases. Requires
an exact semver string as it appears in CHANGELOG.md — call list_releases
first if the version is not already known."
```

Rebuild, restart the client, and ask the exact same question in a fresh
session.

### The hit

> **You:** What changed in v1.2.0?

Picker fires **`get_release_notes`** with `version: "1.2.0"`. Response
is the three bullets. Agent answers verbatim from the release body.

Two things to notice about what happened:

1. **No code changed.** The tool bodies are identical. What changed is
   the picker's information about when to prefer one tool over the other.
2. **The "does NOT" clause did the work.** The picker reads the neighbour
   tool's description and finds it explicitly disqualifying itself for
   this intent. That is a stronger signal than any keyword match in the
   preferred tool.

## Step 7 — Turn the prompts into a mini eval

The single-prompt tuning loop is fine for one fix. For a server that keeps
getting tools added to it, you want a small fixture that runs after every
description change. Five prompts is a good starter set for two tools:

```
1. "What changed in v1.2.0?"                      → get_release_notes(version="1.2.0")
2. "What's the latest release?"                   → list_releases(limit=1)
3. "Show me every release in the last six months" → list_releases (any limit)
4. "Diff v1.1.0 and v1.2.0"                       → get_release_notes ×2
5. "What version am I on if the last thing shipped was the dark mode toggle?"
                                                  → list_releases first, then reasoning
```

Run those five prompts against a fresh session after every description
edit. If the tool-picker output ever changes for prompts 1-4, your last
edit had a side effect on the neighbouring tool — investigate before
merging.

## What to take from this

- The Inspector proves the server runs. Only realistic prompts against a
  real client prove it *works*.
- The picker's decision is made from tool descriptions and nothing else.
  Descriptions that don't compare against neighbouring tools force the
  picker to guess.
- The single most productive kind of edit on a working MCP server is a
  "does NOT" clause pointing at the neighbour tool. Two of those on a
  five-tool server usually retunes picker accuracy dramatically.
- Save the prompts. When you add tool #3 in a month, re-run them and
  make sure the new tool didn't quietly steal one of the picks.

## Pairs with

- `payload/mcp-server-build.md` — the full source of the server built
  here, plus the transport, wiring, and iterate-loop guidance this
  example applies.
- `payload/mcp-server-patterns.md` — the design rules that predicted
  the miss ("Rule 1 — The description IS the API") and the fix
  ("answer four questions in every description").
- `payload/agent-action-space.md` — why picker accuracy is a
  first-class engineering concern, not decoration.

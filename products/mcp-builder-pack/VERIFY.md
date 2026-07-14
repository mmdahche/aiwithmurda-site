# VERIFY — MCP Builder Pack

The checklist we ran before shipping this folder. Re-run it yourself — a
pack about tool discipline is worth exactly what its own discipline is
worth. Failures → murad@aiwithmurda.com with the step number.

## 1. Folder integrity

- [ ] `LICENSE` (MIT), `CHANGELOG.md`, `README.md`, `00-START-HERE.md`
      present at the folder root.
- [ ] Every file listed in `INDEX.md` exists on disk (and nothing extra).
- [ ] The four payload skills match their `install/` copies exactly (same
      content, two layouts). Spot-check:
      `diff payload/mcp-server-build.md install/claude-code/mcp-server-build.md`
      returns nothing, and
      `diff payload/mcp-server-build.md install/codex/mcp-server-build/SKILL.md`
      returns nothing.

## 2. Cross-references resolve

- [ ] Every "Pairs with" section names skills that exist in
      `payload/`. Grep the four payload files for the four skill names —
      each should be referenced by at least one other, and no reference
      should point to a name that isn't a payload file.

## 3. Install + discovery

- [ ] Claude Code: the four files copied into your skills/commands
      folder; the agent lists them by name when asked "what MCP-related
      skills do you have?"
- [ ] Codex: `install/codex/<name>/SKILL.md` copied into
      `.agents/skills/`; same discovery check.

## 4. The worked-example server builds against the current SDK

- [ ] `examples/changelog-mcp-walkthrough.md` still runs on a clean
      machine. From a fresh empty directory, follow Step 1 verbatim:

      ```bash
      npm init -y
      npm i @modelcontextprotocol/sdk zod
      npm i -D typescript @types/node
      npx tsc --init --target es2022 --module nodenext \
        --moduleResolution nodenext --outDir dist --rootDir src \
        --strict --esModuleInterop
      ```

      Then paste `src/index.ts` from `payload/mcp-server-build.md`
      (Step 2), add `"type": "module"` and the `build`/`start` scripts
      to `package.json`, and add `"types": ["node"], "lib": ["esnext"]`
      to `compilerOptions` in `tsconfig.json` (the generated file has
      commented hints saying exactly this — required so Node globals
      resolve under recent TypeScript releases). Then run:

      ```bash
      npm run build
      ```

      PASS = the compile succeeds with no errors. FAIL = the current SDK
      has renamed a symbol (most likely `McpServer`, `registerTool`, or
      `StdioServerTransport`) — check the SDK's own changelog and update
      the worked example.

## 5. Inspector smoke test proves the server responds

- [ ] Create the small `CHANGELOG.md` from Step 3 of the walkthrough at
      the repo root. Then run:

      ```bash
      npx @modelcontextprotocol/inspector node dist/index.js
      ```

      PASS = the Inspector's Tools tab shows `list_releases` and
      `get_release_notes` with their full descriptions; calling
      `list_releases` returns the three demo entries newest-first;
      calling `get_release_notes` with `version: "9.9.9"` returns
      `isError: true` with the "call list_releases first" message.

## 6. The tuning iteration reproduces

- [ ] Wire the server into Claude Code with the `.mcp.json` snippet in
      Step 5 of the walkthrough. In a fresh session ask:
      "What changed in v1.2.0?"
      PASS = the picker fires `get_release_notes` with
      `version: "1.2.0"`, and the answer quotes the release body. If it
      instead fires `list_releases`, your description block did not
      copy fully — recheck against the payload file, especially the
      "does NOT" clause on `list_releases`.

## 7. No leaked internals (packaging hygiene)

- [ ] Scan for references to private tooling, internal codenames, or the
      build machine's absolute paths. From the folder root, run a
      case-insensitive ripgrep for any codenames, internal skill
      prefixes, or planning-folder paths your build pipeline knows to
      exclude — the count should be zero.
- [ ] `rg -in "murad"` returns only the support-email lines in
      `README.md`, `LICENSE`, and this file. Every other reference to a
      person or private path is a bug — flag it.
- [ ] Ripgrep the folder for absolute filesystem paths starting with a
      home-directory prefix — the count should be zero, so no build
      machine paths survived into the shipped folder.

## Shipping record

- Verified by: manual review of the worked example's TypeScript against
  the shape of `@modelcontextprotocol/sdk`'s current server API
  (`McpServer`, `registerTool`, `registerResource`,
  `StdioServerTransport`, `StreamableHTTPServerTransport`) and the
  eight-rule pattern checklist applied to the two demo tools.
- Clean-machine pass: v1.0.0 verified on macOS with Node 20 and the
  Claude Code layout; Codex layout structurally mirrored and
  spot-checked.

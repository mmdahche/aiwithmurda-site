# Workspace map — the multi-project router

<!-- TEMPLATE for owners running several projects under one home directory.
     This merges into the HOME-level agent contract (the one that loads when
     no specific project is active). Its whole job: orient, then route into
     the right project's own contract. It routes; it never absorbs. -->

## Projects

| Path | Project | Status | One-liner |
|---|---|---|---|
| `~/[project-a]/` | [Name] | [Active / DO-first / Parked] | [what it is in ten words] |
| `~/[project-b]/` | [Name] | [status] | [one-liner] |
| `~/[project-c]/` | [Name] | [status] | [one-liner] |

<!-- Keep a status column that encodes PRIORITY (mark the one that matters
     most right now). When the owner picks a project, its own CLAUDE.md /
     AGENTS.md becomes the working contract for that session — this map
     hands off and gets out of the way. -->

## Where common things live

- Identity + operating contract: [paths to SOUL.md + the agents addon]
- Memory: [path to MEMORY.md + memory/]
- Handoffs: [path to handoffs/]
- Priorities: [path to whatever holds "what matters this week" — read when
  picking what to work on]

## What NOT to read proactively

- System dirs, caches, downloads, media folders — noise.
- `node_modules/`, build artifacts, vendor dirs inside any project.
- Reachable if explicitly asked; never crawled for orientation.

## Protected (never write without the owner's explicit direction)

- [SOUL.md path] — identity changes are deliberate, owner-made
- [shell config, ssh, env/secrets paths]

## Session start at home

1. This map is loaded (by virtue of being in the home contract).
2. Glance at the priorities file to confirm what matters today.
3. Wait for the owner to pick a project before entering one — don't crawl.

---
name: swarm-intake
description: Project Intake Protocol (M12). Turn any project — an idea, a brief, or an existing repo — into a Swarm-READY package so the swarm builds the RIGHT thing the first time with parallel, collision-free routing. Invoke with /swarm-intake <project> or natural language ("prep this project for the swarm", "make this repo swarm-ready", "intake this idea"). Runs a 5-stage guided pipeline with a human gate after each stage — repo swarm-readiness → PROJECT_STATE spec → task graph → dispatch plan → pilot — and a deterministic readiness collector that MUST return READY before any /swarm dispatch. PRODUCES the four inputs the LOCKED Swarm consumes; never routes, executes, verifies, or merges (that is /swarm + the daemons + the verifier loop). $0 / native-first / metadata-only.
risk: low
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
date_added: 2026-06-26
spec: specs/M12.md
---

# swarm-intake — the Project Intake Protocol

The Swarm (PROJECT_STATE §4/§7) is a **dispatch + verify + merge engine**: hand it
a task, it routes to a teammate's Claude, peer-verifies, and merges through a human
gate. Everything *upstream* of `POST /tasks` — **how good the inputs are** — the
Swarm does not do for you. **That gap is what this skill closes.**

> **`/swarm-intake` is a PRODUCER of the four things the LOCKED Swarm consumes; it
> is never a consumer of the locked plane.** It produces (1) the 4-layer-context
> repo shape, (2) the `PROJECT_STATE` locked-spec with acceptance criteria, (3) the
> task graph of `Goal:`/`Until:`/`Without:` directives with deps + complexity flags,
> (4) a `swarm.config.yml` + CODEOWNERS + CI the verifier/orchestrator read. **It
> never touches the bridge, orchestrator, routing, capability tokens, or verifier
> loop** (those are LOCKED, MUST-CUSTOM per M03).

**Native-first (M03).** This skill is an orchestration spine over existing native
commands + core skills — it builds almost no new engine. The only net-new code is
the deterministic **readiness collector** (`lib/readiness_check.py`, modelled on
`audit-setup`/`eval` shape) + the artifact **templates** (`templates/`). Everything
else is wiring.

## When to use

- "Prep this project for the swarm" / "make this repo swarm-ready" / "intake this idea".
- A new greenfield idea, a written brief, or an existing repo to retrofit.
- Before the first `/swarm <task>` on any project — readiness is the dispatch gate.

## When NOT to use

- To route / execute / verify / merge a task — that is `/swarm` + the LOCKED core.
- To change the `swarm.config.yml` / CODEOWNERS **schema** — that is a Swarm-core
  touch; FLAG IT TO MASON, never edit silently (§11, Open-Q1).
- To write to `~/.claude`, `_refs`, or another module's `_staging` subtree — never.

---

## The 5-stage pipeline (a human gate after every stage)

Stages are sequential (one complete before the next); within a stage, disjoint work
may fan out to non-conflicting subagents. **A gate = stop, show the operator the
artifact, get approval, then proceed.**

| Stage | Produces | Native/core reused | Gate (operator) |
|---|---|---|---|
| **S0** (implicit) intake interview | decision-complete context (product, module boundaries, stacks/targets, owners + GH usernames, pilot pick, Phase-0 picks) | `/deep-research`, `WebSearch`/`WebFetch` (**metadata only**) | "context complete enough to scaffold?" |
| **S1** repo swarm-readiness | monorepo + root/per-module `CLAUDE.md` + CODEOWNERS + `swarm.config.yml` + CI | `/bootstrap-state` + `/bootstrap-project`, blueprint structure | "structure correct + scopes right?" |
| **S2** PROJECT_STATE spec | `docs/PROJECT_STATE.md` (what / architecture / **acceptance criteria** / decisions) | `/bootstrap-state`, `/deep-research` | "spec is source of truth + acceptance criteria testable?" |
| **S3** task graph | `.swarm/intake/tasks.yaml` — each task `Goal`/`Until`/`Without` + deps + `--complex`/`--cross-module` | `TaskCreate`/`TaskUpdate` DAG (`addBlockedBy`) | "decomposition correct + done-conditions reviewable?" |
| **S4** dispatch plan | ordered `/swarm` invocations (topological; disjoint modules parallel) | `/swarm` (LOCKED), `EnterWorktree` per task | "dispatch order + collision plan approved?" |
| **S5** pilot-first | one small real task run end-to-end, watched route→execute→verify→approve→merge→broadcast | `/swarm`, dashboard | "pilot clean? → scale; else fix intake" |

**The readiness gate (between S3 and S4) is non-bypassable.** The deterministic
collector must return **READY** before S4 can dispatch. NOT-READY → ordered
remediation list → loop back. "Done is a claim → prove it" applied to intake.

---

## Stage 0 — intake interview (reach decision-complete)

Run a short structured interview before scaffolding. Gather: product + why; natural
module boundaries; stack(s) + targets (JS/TS? polyglot? iOS/Android/Rust/Python/Go?);
owners + their **GitHub usernames**; the pilot candidate; the Phase-0 picks (repo
name, GitHub org, tailnet, R2 account — Swarm §10). Fill unknowns with
**`/deep-research`** — **queries/metadata only, never code**. The completeness here
is what makes "near-zero operator escalation" real downstream (P8).

## Stage 1 — repo swarm-readiness

1. Scaffold with **`/bootstrap-project`** (CI + .gitignore + PR template) and
   **`/bootstrap-state`** (first-draft PROJECT_STATE + project CLAUDE.md), then
   harden into the blueprint monorepo shape (`templates/monorepo/`).
2. **Detect the stack** and adapt (polyglot-aware — do NOT assume pnpm):
   - JS/TS → `pnpm-workspace.yaml` + `packages/<module>/`.
   - Polyglot / non-JS → plain-directory monorepo `modules/<module>/` with
     per-module CI carrying that language's toolchain; record the workspace-link
     mechanism in `swarm.config.yml` (`workspace.manager: directory`).
3. Write **root `CLAUDE.md`** from `templates/CLAUDE.root.md` — **security-boundary
   section FIRST** (load-bearing; check C2). Server-assembled, predictable paths.
4. Write a **per-module `CLAUDE.md`** from `templates/CLAUDE.module.md` at the
   predictable path `{pkg}/<module>/CLAUDE.md` — this structurally enforces P6
   disjoint-scope at the context layer.
5. Write `.github/CODEOWNERS` (`templates/CODEOWNERS.tmpl`): each module → owner;
   `shared`/`integrations` → all-team; blueprints/root config → founder; lockfile
   diffs → founder (G8).
6. Populate `swarm.config.yml` (`templates/swarm.config.yml.tmpl`) — all 7 blocks;
   `deterministic_checks` non-empty. **Populate the Swarm-owned schema; never extend it.**
7. Write `.github/workflows/ci.yml` (`templates/ci.yml.tmpl`) — per-module matrix,
   at least lint + typecheck (+ test).
8. Seed `.swarm/memory.md` (`templates/memory.seed.md`).

## Stage 2 — PROJECT_STATE spec (acceptance criteria = source of truth)

Shape `docs/PROJECT_STATE.md` from `templates/PROJECT_STATE.tmpl.md`. **Acceptance
criteria are not prose — each is a testable done-condition that becomes a task
`until:` (the verifier's success criteria) and a golden-scenario seed.** One
artifact, four consumers. Security-relevant criteria (auth / payments / file-upload
/ third-party) get an explicit `@agent-security-auditor` acceptance line. Fill
unknowns with `/deep-research` (metadata only).

## Stage 3 — task graph (Goal/Until/Without + deps + complexity)

Decompose modules → tasks. Build the DAG with native **`TaskCreate`/`TaskUpdate`**
(`addBlockedBy`/`addBlocks`) and **mirror it** into the durable
`.swarm/intake/tasks.yaml` (native Task* is ephemeral; the YAML is the portable
record the bridge ingests). Each task (per `templates/task.tmpl.yaml`):
- `goal` (what), `until` (= matching PROJECT_STATE acceptance criterion), `without`
  (constraints: $0, no-code-to-free-API, cross-platform, don't touch other modules,
  security gates), `module`, `acceptance_criteria`, `blockedBy`, `complexity`,
  `cross_module`.
- **Complexity computed statically** (not guessed at dispatch): `complexity:
  complex` when a task touches **3+ modules OR is inherently deep (≥ L4)** →
  `/swarm --complex` (multi-stage research→story→spec→build→test→validate with
  story/spec/pr gates). `cross_module: true` when it edits `shared/`/`integrations/`
  or crosses a boundary → `/swarm --cross-module` (releases the ownership lock →
  all-team review). **Pre-fill ≠ override:** the dashboard still shows the inferred
  directive for human edit before execution.
- **Metadata only.** Never place `code`/`diff`/`file_content` in any field — the
  strict-typed schema is the input-layer defense against code-leak + injection.

## The readiness gate — run before Stage 4

```
lib/readiness_check.sh <project-dir> --format human      # or: --format json
```
- **READY** (exit 0, all 10 checks pass) → S4 may dispatch.
- **NOT-READY** (exit 1) → fix the listed FAIL items (each carries a remediation),
  re-run, loop until READY. The 10 checks are in `templates/repo-readiness-checklist.md`.

## Stage 4 — dispatch plan (intake only PLANS; `/swarm` owns execution)

Emit an **ordered dispatch plan**: topological order over `blockedBy`; parallelize
disjoint-module tasks. For each task the operator fires `/swarm <id>` (or `--complex`
/ `--cross-module` per the task's flags). From there the **LOCKED** flow owns routing
(CODEOWNERS + load + Max budget: soft-deprioritize 80% / hard-skip 95%), isolation
(`EnterWorktree`, `baseRef: fresh`), the build/audit loop, the two-tier gate
(`/code-review` + `/security-review` peer-routed), and the human merge gate. **Intake
asserts no merge authority and never touches capability tokens.**

## Stage 5 — pilot-first (Phase-7 discipline)

Do **not** fan out the whole graph. Pick one small but real task and run it
end-to-end, the originating human watching route→execute→verify→approve→merge→
broadcast.
- **Pilot clean** → intake validated → scale to the rest of the graph in dep order.
- **Pilot reveals a gap** (routing wrong, scope leak, criterion untestable) → the
  fault is in the **intake artifacts**, not the engine → fix the `CLAUDE.md` /
  `PROJECT_STATE` / `tasks.yaml`, re-run the readiness collector, then scale.

> Per Swarm Open-Q2 / M12 §14: the **live pilot (S5) is deferred until the Swarm is
> running (Phase 7)**. The skill + templates + collector are fully usable standalone
> on throwaway repos before then.

---

## Native / core mapping (PREFER-NATIVE; M03)

| Intake need | Native/core reused | Net-new here |
|---|---|---|
| Context-gather, fill unknowns | `/deep-research`, `WebSearch`/`WebFetch` (metadata only) | the S0 interview script (this doc) |
| Repo scaffold | **`/bootstrap-state` + `/bootstrap-project`** | the blueprint monorepo + per-module CLAUDE.md templates |
| Task DAG | **`TaskCreate`/`TaskUpdate`** (`addBlockedBy`) | `tasks.yaml` durable mirror + Goal/Until/Without template + complexity rule |
| Per-task isolation | **`EnterWorktree`/`ExitWorktree`** | — (Swarm daemon wraps this) |
| Readiness gate | `audit-setup`/`eval` collector *shape* | **`lib/readiness_check.py`** (the actual checks) |
| Verify/route/merge | **`/swarm` + LOCKED core** | — (never rebuilt) |

**Explicitly NOT wired** (M03 §4): `/schedule` + `RemoteTrigger` + `DesignSync`
(claude.ai cloud — breaks $0 + second login). Durable scheduling (e.g. nightly
readiness re-check) → system `cron`, not the cloud scheduler.

## Hard rules (this skill obeys)

- **$0 / free-OSS / native-first.** Runs on the Max plan (first-party). No cloud-billed path.
- **No code to free APIs** — `/deep-research` and any metabrain-bound directive carry
  metadata only. Never `code`/`diff`/`file_content` in a directive field.
- **Cross-platform** — templates are language-neutral; the collector is stdlib Python
  (`PYTHONUTF8`); polyglot detection avoids the pnpm-only assumption.
- **Respect LOCKED design** — produce inputs that *conform to* the §4/§7/§13 contracts;
  a needed **schema** change is a flag to the core maintainer, never a silent edit. the core maintainer has final
  say; no core-maintainer gate.
- **Least privilege** — the skill is read/produce-only of target repos; it writes only
  inside the target repo (with approval) and **never** to `~/.claude` (G10 Gate 0).
- **No secrets** — templates carry zero credentials; the collector C10 check
  fail-closed-rejects any committed secret and logs the pattern NAME, never the value.

## Bundled files

- `lib/readiness_check.py` — the deterministic dispatch-gate collector (stdlib; fixed-shape JSON; exit 0=READY/1=NOT-READY; fail-closed secret gate).
- `lib/readiness_check.sh` — thin `bash`→`python3` shim (`PYTHONUTF8=1`).
- `templates/` — `repo-readiness-checklist.md`, `monorepo/` skeleton, `CLAUDE.root.md`, `CLAUDE.module.md`, `CODEOWNERS.tmpl`, `ci.yml.tmpl`, `swarm.config.yml.tmpl`, `PROJECT_STATE.tmpl.md`, `tasks.schema.yaml`, `task.tmpl.yaml`, `memory.seed.md`.
- `tests/` — table-driven readiness tests + `fixtures/ready/` golden repo.
- `G10-manifest.yaml` — the `/evolve` 5-gate manifest for this skill.
- `README.md` — pipeline, gates, native commands, polyglot + Swarm-contract conformance notes.

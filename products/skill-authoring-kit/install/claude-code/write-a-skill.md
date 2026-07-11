---
name: write-a-skill
description: Authoring discipline for new agent skills. Drafts a skill from requirements with rigorous frontmatter, a trigger-explicit description, an anti-trigger section, and a pre-ship audit. Use when the user says "write a skill", "build me a skill", "create a skill for X", "wrap this in a skill", "make a /something command", or when authoring any new SKILL.md for Claude Code or Codex.
---

# /write-a-skill — Author new skills with discipline

Meta-skill. Drafts a new skill with the right frontmatter, a trigger-explicit
description, and a clean install path. The description field is the only
thing the skill picker sees when deciding what to load — this skill writes it
for that job.

## When to use

- The user says: "write a skill", "build me a skill", "create a skill for X", "wrap this in a skill", "make a /something command"
- Right after a successful manual workflow that should compound into a reusable capability
- Refactoring an existing skill's description because retrieval keeps missing the trigger

## When NOT to use

- Editing a single field in an existing skill — just open the file and edit
- One-shot commands for a one-time task — don't codify what won't fire twice
- Drafting an agent/subagent definition (different conventions than skills)

## Phase 1 — Gather requirements (one question at a time)

Interview the user. Push back on vagueness — a vague answer here becomes a
vague description the picker can't match on.

1. What problem does this skill solve? (one sentence)
2. What specific phrases will you say to fire it? (verbatim, not paraphrased — the picker matches on these)
3. What does it do — narrative orchestration (prose body) or deterministic operation (script called from prose)?
4. What anti-triggers — when should it NOT fire? What near-neighbor skill might overlap?
5. What does the success output look like — one line, full report, file path, nothing?

## Phase 1.5 — For multi-stage skills, infer a conditional stage graph (optional)

Skip for single-action skills. Apply when the skill orchestrates a PIPELINE —
stages that hand artifacts to each other (ingest → transform → render →
verify). The failure mode this prevents: wiring every possible capability
into the required path so the skill always demands tools/keys the user
didn't ask for.

1. **Separate REQUIRED stages from OPTIONAL stages.** A stage is required only if every run needs it.
2. **Each optional stage is gated by an interview answer**, not assumed on. Unselected stages are absent from the graph — not present-but-skipped.
3. **Every stage carries a six-field contract:** `purpose`, `inputs`, `outputs`, `tool`, `success_condition`, `failure_condition` (plus `approval_required` where a human gate belongs). A stage you can't write a `failure_condition` for is under-specified.
4. **The terminal two stages are always EXPORT then VERIFY.** Producing the output and proving the output are different jobs; never fuse them.

Example stage contract:

```
slug: validate-import
purpose: Confirm the parsed product CSV maps cleanly to the catalog schema.
inputs: parsed rows + schema + column-map config
outputs: validated row set or a per-row error report
tool: schema validator (deterministic script)
approval_required: false
success_condition: every required column maps and 0 rows fail type checks
failure_condition: any required column unmapped, or >0 rows fail validation
```

## Phase 2 — Draft the body

Default to a single file. Use a `<name>/SKILL.md` directory only when the
body would exceed ~150 lines AND the extra content is distinct reference
docs. See `placement-guide.md` for where the file lives per agent.

Frontmatter (minimum):

```yaml
---
name: <kebab-case, matches filename stem or directory name>
description: <see Phase 3 — load-bearing>
---
```

Recommended extra fields for your own library hygiene: `risk` (low/medium/
high/critical by blast radius), `source` (native | URL | "clean-room port of
<repo> (<license>)"), `date_added`.

Body skeleton:

1. `# /<name> — <one-line tagline>`
2. **Purpose** — 1-2 lines: what + when
3. **When to use** — bulleted trigger phrases + situations
4. **When NOT to use** — bulleted anti-triggers (helps the picker discriminate)
5. **Core sections** — Phases / Steps / Inputs / Rules / Output schema, whatever fits
6. **Discipline rules** — invariants this skill must hold
7. **Output** — what the reply looks like when done (usually 1-3 sentences)
8. **Related** — neighbor skills it composes with or differs from

## Phase 3 — Write the description (load-bearing)

The picker sees ONLY the `description`. It is the entire user interface for
skill selection. Write it for that job. See `description-writing.md` for the
full drill; the format:

`[Capability — present-tense sentence]. [Trigger sentence: "Use when the user says X, Y, Z, or wants W"]. [Optional clarifier: scope, modes, what it does NOT do, neighbor-skill pointer].`

Rules:

- Include the user's actual trigger phrases verbatim. Don't paraphrase ("debug this" ≠ "diagnose this").
- Name the situation, not just the verb. "When a Stripe webhook returns 4xx" beats "when debugging."
- If a near-neighbor exists, distinguish it in the description: "For report-only mode, use /qa-only."
- Length: as long as needed for specificity — specificity wins over brevity.
- No time-sensitive language ("newly built", "as of today") — skills outlive their drafting context.

Bad: `Helps with documents.`
Good: `Extract text and tables from PDFs, fill forms, merge documents. Use when the user says "parse this PDF", "extract from <file>.pdf", "merge these PDFs", or works with any .pdf input.`

## Phase 4 — Self-review checklist

- [ ] Description includes verbatim trigger phrases the user would actually say
- [ ] Description distinguishes against near-neighbor skills (if any)
- [ ] Frontmatter present and the name matches the file/folder
- [ ] "When NOT to use" section present and non-empty
- [ ] No time-sensitive language anywhere
- [ ] One canonical name per concept (don't alternate "skill"/"command" for the same thing)
- [ ] At least one concrete example in the body

## Phase 5 — Pre-ship audit (mechanical, not vibes)

Before installing the skill, verify three things and refuse to ship on any failure:

1. **No embedded secrets.** Scan for `sk_…`, `api[_-]?key = "…"`, `token = "…"`, `secret = "…"` shaped strings. Match → block, name the file+line, do not write.
2. **Any `.env.example` is placeholders only.** Every non-comment line must be empty-valued or carry `insert`/`replace`-style filler — never a real value.
3. **No generated/binary artifacts in the skill folder.** A reusable skill ships instructions and scripts, not sample media or build output.

## Phase 6 — Behavioral validation (TDD for skills; high-stakes skills only)

Static review checks the skill READS right; it doesn't prove it CHANGES
behavior. For skills that enforce discipline or gate behavior, run the
RED/GREEN/REFACTOR loop in `validation-tdd.md`. Skip for low-stakes
convenience skills.

## Discipline rules

- **The description is the product.** A perfect skill with a vague description fires never.
- **Verbatim trigger phrases beat synonyms.**
- **Single-file is default.** Splitting is a refactor, not a starting point.
- **Scripts for deterministic ops, prose for narrative.** Validation, formatting, retries → script. Orchestration, judgment, branching → prose.
- **Export and verify are separate stages.** The step that PRODUCES an artifact and the step that PROVES it must be distinct — the verify step probes the real output (file exists, shape/size right), never trusts the producing step's word.

## Output (when done)

One paragraph. Lead with the path:

> Skill drafted: `/<name>` at `<path>`. Install per placement-guide. Test with: `<one-line invocation>`.

## Origin

Clean-room adaptation of mattpocock/skills `/write-a-skill` (MIT). Kept: the
load-bearing "description is the only thing the picker sees" insight, the
`[Capability]. Use when [triggers].` format, the scripts-vs-prose heuristic,
the self-review checklist concept. Extended with: required anti-trigger
section, one-question-at-a-time interview, conditional stage-graph pattern
for pipeline skills, mechanical pre-ship audit, and behavioral validation.

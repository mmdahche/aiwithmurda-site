# Walkthrough — landing-page audit chain

Synthetic B2B SaaS ("Ledgerly") has an agent-generated marketing site the
founder shipped last week. Numbers are up, but the design feels generic. Run
the four skills in order and produce a fix list before Monday.

## Starting inputs

| Field | Value |
|-------|-------|
| Product | Ledgerly — SMB bookkeeping automation |
| Page under review | `/` (marketing homepage) |
| Screenshots | Desktop (1440w) + mobile (390w) attached |
| Current `DESIGN.md` | Does not exist |
| Framework | React + Tailwind (agent-generated last Thursday) |
| Constraint | One weekend of design work, no contractor budget |

## Step 1 — design-contract

**Ask:** "Draft a `DESIGN.md` for Ledgerly. It's SMB bookkeeping, personality
should be precise + calm + credible, moodboard references are Linear and
Mercury. No purple gradients, no auto-play video."

Expected agent output:

- Nine sections filled in with concrete values
- Palette: neutral base (near-black text on off-white surface), one warm accent
  (deep amber for CTA), one semantic red and green
- Type: one sans body family, one mono for numbers; 14/16/18/24/32 ramp
- Spacing scale: 4px base; `xs=4 sm=8 md=16 lg=24 xl=32 2xl=48`
- Anti-patterns explicitly listed: "no purple→pink gradient", "no emoji in
  section headings", "no auto-playing hero video"
- Verification protocol: run `anti-slop-audit` on any PR that touches `/app` or
  the marketing `/` route

## Step 2 — anti-slop-audit

**Ask:** "Audit the Ledgerly homepage desktop and mobile screenshots against
the 25-rule checklist. Rank fails."

Expected findings (representative, not exhaustive):

- Rule 1 FAIL — hero uses a purple→pink gradient inconsistent with the amber
  accent in `DESIGN.md` (blocker)
- Rule 8 FAIL — H1 body reads "Ship faster. Book smarter."; generic productivity
  slogan with no product-specific verb (major)
- Rule 14 FAIL — primary CTA is 44px tall, secondary CTA is 42px tall (minor)
- Rule 17 FAIL — page mixes Feather-style outline icons in the feature grid
  with a filled bank-vault glyph in the trust bar (major)
- Rule 22 FAIL — every feature card fades in on scroll on desktop, and the
  motion is not suppressed under `prefers-reduced-motion` (major)

Blockers must be fixed before ship; majors are the weekend list.

## Step 3 — motion-framework

**Ask:** "For the fixes coming out of the audit, what motion should stay and
what should go? Ledgerly is calm + credible."

Expected verdict:

- Fade-in-on-scroll on 12 feature cards: **remove** — motion tax without meaning
- CTA hover: **keep**, micro tier (150 ms), standard easing, opacity + subtle
  background shift only
- Modal for pricing detail: **keep**, deliberate tier (400 ms enter, 300 ms
  exit), decelerate on enter, accelerate on exit, reduced-motion collapses to
  opacity swap

Motion tokens land in `DESIGN.md` as `--motion-micro: 150ms`, `--ease-standard:
cubic-bezier(0.4, 0, 0.2, 1)`, so the app can reuse them.

## Step 4 — ui-critique

**Ask:** "Structured senior-designer critique of the homepage against Nielsen
plus AI-slop tells. Number the issues, tag each, propose fixes, close with the
one-hour highest-leverage change."

Expected output:

- Numbered issue list; each line carries severity, tag (H* or T*), evidence,
  and concrete fix
- Notable hits: T1 (purple default), T4 (six identical feature cards), T10
  (generic hero copy), H8 (aesthetic and minimalist — three sections earn no
  place on the page)
- "If I had one hour" close: rewrite the H1 with one proof point and one verb
  specific to bookkeeping; everything else waits

## Receipt

One contract written. Twenty-five rules run. Motion decided per interaction.
Critique produced as a numbered list a contractor can execute without
translation. The homepage that ships Monday still looks like Ledgerly rather
than a default LLM template.

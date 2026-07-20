---
name: anti-slop-audit
description: Deterministic 25-rule checklist that catches generic AI-generated UI before it ships. Use against any screen an agent produced — landing page, dashboard, marketing section, email template — and receive a numbered pass/fail list with severity and a fix. Run before every merge on any UI PR.
---

# Anti-Slop Audit

You run a deterministic checklist against a UI screenshot, component file, or
rendered page. The goal is to catch the tells of AI-generated design — the
default-purple gradient, the identical rounded rectangles, the emoji-as-icon
crutch — and produce a numbered failure list with severity and a fix.

The audit is boring on purpose. If a rule triggers, the fix is not "consider"
— the fix is stated and merged.

## When to use

- Reviewing a PR that touches any user-visible surface
- Auditing a landing page or marketing section before publish
- After an agent completes a "generate a UI for X" pass
- Before onboarding designers so they see what the bar is
- Weekly sweep of live pages to catch drift

## Workflow

1. **Collect inputs** — screenshot(s) at desktop and mobile widths, component source, `DESIGN.md` if it exists
2. **Run all 25 rules in order** — do not skip; missing evidence is a fail, not a pass
3. **Score each** — PASS / FAIL / N/A with one-line evidence
4. **Rank fails by severity** — blocker (ship stopper), major (fix this week), minor (backlog)
5. **Ship the fix list** — every fail has a concrete corrective action, not a vibe

## The 25 rules

### Palette (5)

1. **No default gradients** — no purple→pink, no blue→cyan hero backgrounds without a documented reason in `DESIGN.md`
2. **Every hex used appears in the palette section of `DESIGN.md`** — no ad-hoc color literals in components
3. **Contrast passes WCAG AA on body text** — 4.5:1 for normal text, 3:1 for large text; state the pair and ratio
4. **Danger and success are semantic, not decorative** — red/green appear only for state, never for accent
5. **Dark mode (if supported) is not the light palette with inverted lightness** — surfaces and shadows are re-authored, not flipped

### Typography (4)

6. **At most two type families** — display + body, or body + mono; anything else is a fail
7. **Body line-height between 1.4 and 1.7** — nothing rendered at 1.0 or 2.0 outside a documented display treatment
8. **Type ramp uses the scale in `DESIGN.md`** — no one-off `font-size: 17px` where the scale skips from 16 to 18
9. **Headings and body do not share the same weight** — hierarchy requires visible weight contrast (≥300 units apart, or family change)

### Spacing and layout (4)

10. **All spacing values are on the token scale** — no `margin: 13px`, no `padding: 22px 17px`
11. **Nothing is centered by default** — center alignment is a decision reserved for hero blocks and single-column marketing; body content is left-aligned unless the contract says otherwise
12. **No `min-height: 100vh` sections that ignore small viewports** — every full-viewport section survives a 700px-tall laptop
13. **Section rhythm is consistent** — vertical space between sections is one of two documented values, not seven improvised ones

### Components (4)

14. **Buttons share a height family** — primary and secondary at each size are the same pixel height, never off by 2
15. **Radius is quantized** — components use 0, `sm`, `md`, or `lg` radius from the scale; no `border-radius: 7px` one-offs
16. **Shadow is meaningful** — every drop-shadow signals elevation or focus; no shadows on non-interactive text or on already-elevated surfaces
17. **Icons are one family, one stroke weight, one nominal size** — no mixing Feather-style and filled Material glyphs in the same view

### Content and language (4)

18. **No Lorem ipsum, no `Your Product Here`, no placeholder person names** — real copy or none
19. **Hero H1 is not a generic productivity slogan** — reject "Ship faster.", "Build smarter.", "The future of X." unless the founder actively chose them
20. **No emoji-as-icon in production UI chrome** — emoji is fine in body content, chat, or user-generated text; not fine on buttons, tabs, or section headers
21. **Voice matches `DESIGN.md`** — banned words absent, sentence length in range, capitalisation rule followed

### Motion and interaction (4)

22. **Nothing animates on scroll that doesn't need to** — parallax, fade-in-on-scroll, and marquee are opt-in, contract-approved, and reduced-motion aware
23. **Focus state is visible on every interactive element** — a keyboard user can traverse the page and always see where they are
24. **Hover states exist and are subtle** — a hover that changes only cursor is a fail; a hover that shakes the button is also a fail
25. **Reduced-motion is honoured** — `prefers-reduced-motion: reduce` collapses non-essential animation to opacity or nothing, never keeps the parallax

## Output rules

- Numbered list 1–25 in this exact order — never re-order, never merge rules
- Each rule gets one line: rule number, verdict, one-line evidence
- Fails are collected at the bottom into a fix list, ranked blocker → major → minor
- Do not add rules on the fly; if a new class of drift shows up, add it to `DESIGN.md` and to a future revision of this skill
- If `DESIGN.md` does not exist, rule 2 is an automatic blocker — write the contract first

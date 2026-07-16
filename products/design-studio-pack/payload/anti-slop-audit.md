---
name: anti-slop-audit
description: Deterministic UI anti-slop audit — 25+ rules that catch generic AI-generated interfaces before ship. Use after generating or redesigning any screen, before claiming "UI done". Returns pass/fail per rule with fix hints.
---

# Anti-Slop Audit

A **checklist audit**, not taste theater. Run every rule; log failures with
file/selector and a one-line fix.

## When to use

- After agent-generated UI lands in the repo
- Before PR merge on frontend changes
- When a page "looks fine" but feels interchangeable with every other AI app

## Audit rules

### Layout & structure

1. **Hero stack** — headline + sub + single primary CTA; no triple CTA row above fold
2. **Feature grid** — if 3-column icon grid exists, each column must cite a user outcome, not a adjective
3. **Section count** — landing ≤7 primary sections unless content brief requires more
4. **Max content width** — prose and cards respect container max from DESIGN.md
5. **Footer minimal** — no 4-column link farm on v1 pages

### Visual tells

6. **Gradient mesh hero** — flag unless DESIGN.md explicitly allows
7. **Purple/indigo default** — flag if not in brand palette
8. **Rounded-everything** — radius >16px on cards AND buttons AND inputs = slop signal
9. **Shadow stacking** — more than one elevation level on same viewport = simplify
10. **Stock emoji as icons** — replace with SVG or licensed set
11. **Identical card heights** — bento mismatch OK; forced equal empty cards are not

### Typography

12. **Inter/Roboto only** — flag if DESIGN.md didn't choose them deliberately
13. **All-bold headings** — need weight contrast (600 headline / 400 body minimum)
14. **Centered body paragraphs** — body text left-align except short hero subcopy
15. **Line length** — body >80ch without max-width wrapper = fail

### Motion

16. **Autoplay carousel** — fail unless accessibility pause control visible
17. **Parallax on scroll** — fail on marketing pages unless brand requires
18. **Duration >500ms** on hovers — fail (see motion-framework)
19. **Reduced motion** — verify `@media (prefers-reduced-motion)` neutrals animations

### Content & trust

20. **Fake metrics** — "10,000+ happy customers" without source = fail
21. **Testimonial without name/role** — fail or mark PLACEHOLDER
22. **Logo strip** — grayscale client logos without permission note = fail
23. **Lorem or "Your Company"** — zero tolerance in shipped paths

### Accessibility baseline

24. **Focus visible** — tab through primary nav and form; invisible focus = fail
25. **Contrast** — body text vs surface ≥4.5:1 (spot-check with tool or formula)
26. **Click target** — interactive elements ≥44×44px or equivalent padding

### Process

27. **DESIGN.md exists** — if UI task ran without brand contract, fail and block
28. **One primary action** — page has one obvious next step; competing primaries = fail

## Output format

```markdown
## Anti-Slop Audit — [page/route]
Pass: N / 28

| # | Rule | Result | Fix |
|---|------|--------|-----|
| 6 | Gradient mesh hero | FAIL | Replace with solid surface + border |
...
Verdict: SHIP / REVISE (list blocking failures)
```

## Verdict rules

- **SHIP** — zero failures on rules 20–26 (trust + a11y); max 2 cosmetic failures elsewhere
- **REVISE** — any trust/a11y failure OR ≥5 total failures

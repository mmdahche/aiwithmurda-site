# START HERE — Design Studio Pack

You bought four skills that make agent-built UI look intentional: a brand
contract, an anti-slop checklist, a motion framework, and a critique protocol.

## First win in 3 steps (~15 minutes)

1. **Install all four:** `bash install/setup.sh`
2. **Contract drill:** open `design-contract` and draft a `DESIGN.md` for one
   product — palette hex values, type ramp, spacing scale, three anti-patterns.
3. **Audit drill:** screenshot your current homepage, then run `anti-slop-audit`
   against it. Fix the top three fails before touching any component code.

## Where everything is

- `payload/*.md` — four skills (source copies)
- `install/claude-code/` + `install/codex/` — dual layouts
- `examples/landing-page-audit-walkthrough.md` — end-to-end audit on a synthetic SaaS landing
- `VERIFY.md` — checklist we ran before shipping

## The one rule

**No design decision without a contract.** If the palette isn't written down,
the agent will invent a new one every screen. Write the contract first — audit
against it forever after.

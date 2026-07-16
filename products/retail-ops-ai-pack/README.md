# Retail Ops AI Pack

**Demand planning and reverse logistics playbooks — as agent skills.**

Two clean-room operator disciplines for retail and e-commerce teams running
multi-SKU catalogs, regional inventory, and high-return categories. Written for
Backbone-style IMS operators: honest economics, no fantasy automation, receipts
over vibes.

| Skill | What it does |
|-------|--------------|
| **inventory-demand-planning** | Forecast selection, safety stock, replenishment, promo lift, seasonal open-to-buy |
| **returns-reverse-logistics** | RMA policy, grading, disposition routing, fraud scoring, vendor RTV, warranty boundaries |

## Time to first value

~15 minutes: copy both skills into your agent layout, then run one planning or
returns scenario against a real SKU list or RMA queue.

## Install

**Claude Code:** copy `install/claude-code/*.md` into `~/.claude/skills/<name>/SKILL.md`
(or commands folder if you prefer slash commands).

**Codex:** copy each `install/codex/<name>/SKILL.md` into `.agents/skills/`.

**Quick path:** `bash install/setup.sh`

## Provenance

Clean-room rewrite (2026-07-16). Domain patterns informed by multi-location retail
and IMS operations — **no third-party skill content ported.** The ECC-tagged
drafts in the reference library were never read for wording.

## License

MIT — see `LICENSE`.

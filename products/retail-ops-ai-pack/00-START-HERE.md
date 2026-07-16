# START HERE — Retail Ops AI Pack

You bought two operator playbooks: one for **keeping the right units in the
right places**, one for **recovering margin when product comes back**.

## First win in 3 steps (~15 minutes)

1. **Install both skills:** run `bash install/setup.sh` or copy the four install
   files manually (see README).
2. **Planning drill:** pick one SKU with volatile demand. Ask the agent to
   classify it (ABC/XYZ), recommend a forecast method, and compute a safety-stock
   range with explicit assumptions.
3. **Returns drill:** pick one recent return. Walk grading → disposition → refund
   authority → fraud score. The agent must show economics, not just policy text.

## Where everything is

- `payload/inventory-demand-planning.md` — demand planning discipline
- `payload/returns-reverse-logistics.md` — reverse logistics discipline
- `install/claude-code/` + `install/codex/` — dual layouts
- `examples/holiday-reorder-walkthrough.md` — promo + reorder end to end
- `VERIFY.md` — checklist we ran before shipping

## The one rule

Every recommendation needs numbers attached: weeks of supply, recovery rate,
fraud score, or margin impact. If the agent can't quantify it, it's guessing.

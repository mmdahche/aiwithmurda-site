---
name: inventory-demand-planning
description: Demand forecasting, safety stock, replenishment, promotional lift, and seasonal open-to-buy for multi-location retail and e-commerce catalogs. Use when setting reorder points, planning a promotion, reviewing forecast error, or explaining why a SKU stockout or overstock happened.
---

# Inventory Demand Planning

You help operators translate sell-through into purchase orders without hiding
assumptions. Default context: 40–200 selling locations or channels, 300–800 active
SKUs, ERP + WMS + POS feeds, vendor lead times measured in weeks not hours.

## When to use

- Forecasting existing SKUs or launching new ones with thin history
- Setting or reviewing safety stock and service levels
- Planning promotional lifts, forward buys, and post-promo dips
- Explaining stockouts, excess weeks-of-supply, or open-to-buy breaches
- Choosing which SKUs deserve human review vs automated replenishment

## Workflow

1. **Cleanse demand** — strip returns, OOS zeros, and promo spikes from baseline history
2. **Classify** — ABC on margin contribution; XYZ on demand CV after de-seasonalizing
3. **Select method** — match pattern to method (see table below); document why
4. **Layer causals** — price, promo flags, calendar shifts, cannibalization
5. **Compute safety stock** — service target × demand and lead-time variability
6. **Generate order** — inventory position (on-hand + on-order − allocations), MOQ rounding
7. **Monitor** — WMAPE, bias, tracking signal; re-select method when signal drifts

## Forecast method picker

| Pattern | Primary method | Review trigger |
|---------|----------------|----------------|
| Stable high-volume | Weighted moving average (4–8 wk) | WMAPE > 25% for 4 weeks |
| Trending | Holt double exponential smoothing | Tracking signal beyond ±4 |
| Seasonal repeating | Holt-Winters or STL + baseline | Season correlation < 0.7 |
| Intermittent / lumpy | Croston or SBA | Mean inter-demand interval shifts >30% |
| Promo-driven | Baseline + explicit lift layer | Post-promo miss > 40% |
| New item (<12 wk history) | Analog profile + lifecycle curve | Own history beats analog WMAPE |

## Safety stock and service levels

- Default **95% (Z≈1.65)** for A/B predictable items; **99%** only when stockout cost is documented
- Include **lead-time variability** when vendor CV > 0.3 — demand-only formulas lie
- New items: borrow σ from 3–5 analogs; add 20–30% buffer weeks 1–8
- Never reorder on on-hand alone — use **inventory position**

## Promotional planning

- Model **baseline**, **lift**, and **post-promo dip** as separate lines
- Document lift source: own history > category analog > conservative default (−20%)
- Expect dip ≈ 30–50% of incremental lift, front-loaded week 1 after promo
- Cannibalization: 10–30% of lift for close substitutes in same category

## Seasonal and markdown discipline

- Commit **60–70%** of seasonal buy upfront; hold **30–40%** open-to-buy for reorder
- Markdown when sell-through < 60% of plan at season midpoint — delay costs margin weekly
- Hard exit date before next season receipt; don't warehouse last year's style

## Outputs must include

- Method chosen + one-line rationale
- Safety stock units and implied weeks of supply
- Order quantity with MOQ/ case-pack rounding noted
- Top 3 risks (lead time, promo miss, vendor MOQ conflict)
- KPI snapshot: WMAPE target <25%, bias ±5%, in-stock A-items >97%

## Discipline

- Read-only on live systems unless the user explicitly asks you to write POs
- Flag **phantom inventory** when system on-hand conflicts with repeated stockouts
- Quantify every override — "gut feel" gets a dated note or it doesn't ship

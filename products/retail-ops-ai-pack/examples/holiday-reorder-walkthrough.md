# Walkthrough — holiday promo reorder

Synthetic scenario showing how both skills chain on one SKU.

## Setup

- **SKU:** `WINTER-JKT-BLK-M` — outerwear, A-item, 180 stores
- **Baseline:** 420 units/week non-promo
- **Promo:** 25% off + circular feature, weeks 48–50
- **Vendor lead time:** 21 days (recently slipped from 14)

## Step 1 — Demand planning skill

**Ask:** "Plan the promo buy and post-promo replenishment for WINTER-JKT-BLK-M."

Expected agent moves:

1. Classify **AY** (high value, moderate variability)
2. Estimate lift **~140%** from last year's TPR+circular (document analog if thin history)
3. Model post-promo dip **−35%** for two weeks
4. Recalculate safety stock for 21-day LT (+40% vs old 14-day assumption)
5. Output forward buy qty with MOQ case-pack rounding
6. Flag risk: if LT slip isn't in vendor PO system, stockout in week 51

## Step 2 — Returns spike (week 51)

**Ask:** "Customer returned WINTER-JKT-BLK-M — worn collar, tags removed, claims defective."

Expected agent moves:

1. Policy: outside defect path if wear inconsistent with claim → inspect before full refund
2. Grade **C** (visible wear, functional)
3. Disposition: liquidate outerwear pallet at ~35% recovery vs refurb cost
4. Fraud score: +15 return rate if account hot, +10 reason mismatch — review tier not auto-deny
5. No RTV (customer-caused wear, not vendor defect)

## Receipt

Two skills, one economic story: the promo drove volume; returns ate margin on
 mishandled units; planning skill should have sized dip inventory to avoid
 emergency reorder at premium freight.

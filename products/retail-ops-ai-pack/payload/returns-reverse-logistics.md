---
name: returns-reverse-logistics
description: Return authorization, inspection grading, disposition routing, refund processing, return fraud scoring, vendor RTV recovery, and warranty boundary decisions for retail and e-commerce. Use when processing RMAs, routing returned inventory, investigating abuse patterns, or filing vendor defect claims.
---

# Returns & Reverse Logistics

You balance customer resolution with margin recovery. Default context: omnichannel
retailer with OMS + WMS + returns center, mixed catalog (apparel, hardlines,
electronics), vendor RTV windows, and fraud pressure on high-shrink categories.

## When to use

- Approving or denying an RMA against policy
- Grading received units and picking a disposition channel
- Scoring fraud risk before releasing a refund
- Deciding RTV vs liquidate vs refurbish economics
- Separating warranty claims from standard returns

## Workflow

1. **Policy gate** — window, category restrictions, receipt/proof, channel (BORIS/BORO)
2. **Issue RMA** — prepaid label vs returnless refund when shipping > ~40% of value
3. **Receive & grade** — A (like new) through D (salvage); category-specific tests
4. **Route disposition** — maximize recovery minus handling cost (see matrix)
5. **Refund/exchange** — match original payment price; document restocking fees
6. **Vendor path** — batch RTV/defect claims inside contractual windows
7. **Learn** — feed grading accuracy and fraud false positives back to thresholds

## Grading (default)

| Grade | Condition | Typical route |
|-------|-----------|---------------|
| A | Sealed/like new, full accessories | Restock new or open-box full margin |
| B | Light wear, repack possible | Open-box / renewed 60–80% recovery |
| C | Visible wear, functional | Liquidation or refurb if ROI > 40% |
| D | Non-functional / incomplete | Parts harvest, recycle, or destroy |

**Health & beauty opened:** default destroy (regulatory). **Electronics:** serial
match + functional test before any restock-as-new.

## Disposition economics

Before recommending a route, compare:

`Net recovery = (expected sell price × sell-through probability) − (inspect + repack + ship + labor)`

- Restock only when handling cost ≪ margin recovered
- Liquidate by **category-pure pallets** — mixed pallets tank recovery
- Donate when FMV × tax benefit beats liquidation **and** brand channel risk is acceptable
- Destroy with certificate when recall, counterfeit, or regulatory disposal applies

## Fraud scoring (0–100)

Add points; review ≥65, hold refund ≥80:

| Signal | Points |
|--------|--------|
| Rolling 12mo return rate > 30% | +15 |
| Serial / weight mismatch | +25–40 |
| High-shrink category + new account | +10–15 |
| Return reason changed receipt vs intake | +10 |
| No-receipt return | +15 |

High-LTV customers with high return rates need **segmentation**, not automatic bans.
Bracket shopping is legal; abuse is pattern + condition evidence.

## Vendor recovery

- RTV defective units before vendor claim window closes (often 90 days)
- Batch to MOQ thresholds ($200–500 typical domestic)
- Defect rate above agreement → formal claim with photos + aggregated SKU data
- Pursue when `(expected credit × collection probability) > labor + freight`

## Warranty vs return

- **Return window** = purchase reversal (retailer policy, short)
- **Warranty** = defect in coverage period (manufacturer obligation)
- Extended plans = third-party facilitator — don't mix workflows

## Outputs must include

- Policy verdict + exception rationale if any
- Grade + inspection notes (no customer-facing fraud accusations)
- Disposition choice with dollar recovery estimate
- Refund amount, fees, timeline
- RTV/warranty next step if applicable

## Discipline

- Never accuse the customer of fraud in customer-facing text — use neutral hold language
- Recalled product → recall program, not standard returns queue
- Document every exception — precedent risk is real on public complaints

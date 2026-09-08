# Storefront Reference Study

Reviewed: September 7, 2026
Scope: public-site design and product presentation, not a purchase or product-performance audit.
Status: approved by Murad and implemented in the local preview on September 7. See `STOREFRONT-IMPLEMENTATION.md` for verification. Prices, free entitlement scope, and billing are unchanged; not deployed.

## What Murad Asked For

Murad finds Flux Growth Agency and AI for Savages easier to understand than the current AI with Murda preview. He wants to learn from how they display free and paid items, rather than merely copy their styling.

## Main Finding

The current preview is easier to navigate than the old site, but its first shopping decision is still an abstract tier choice. Visitors must learn several package names and understand which smaller tools sit inside them.

The proposed next iteration should explain the useful item first, mark its access and price clearly, and then explain the containing package. A customer should be able to answer: What does it do? What do I actually receive? Is it free? What must I install? What does it cost?

## References

### Flux Growth Agency

The [store](https://store.fluxgrowthagency.com/) exposes free/paid and content-type filters, repeats price/access labels on product cards, and separates product details from purchase/download actions. Its [template detail page](https://store.fluxgrowthagency.com/p/claude-md-templates-v2) adds use cases, contents, and usage steps.

Adapt the browsing and labeling pattern, not every marketing claim, visual effect, or unusually long card description. These observations establish presentation choices, not conversion performance or verified product capabilities.

### AI for Savages

[AI for Savages](https://www.aiforsavages.fyi/) shows named skill examples with video previews and a direct explanation of what access includes. Its public preview labels do not mean the paid downloads are free. The page also mixes subscription wording with a one-time price; avoid that ambiguity.

Adapt result previews and short explanations. Do not copy its brand, profanity, media, unsupported guarantees, or implied personal-support obligations.

### Thomas Frank

[Thomas Frank's template collection](https://thomasjfrank.com/templates/) uses recognizable jobs such as tasks and notes, product images, explicit free-template links, and documentation links for larger products. The [Ultimate Brain page](https://thomasjfrank.com/brain/) explains how the paid system extends a smaller free template.

Adapt the small-useful-resource to broader-system relationship, plus visible start instructions and documentation.

### Refactoring UI

[Refactoring UI](https://refactoringui.com/) offers a limited free sample, shows actual product contents, and lists the differences between two paid packages. Its FAQ distinguishes downloadable formats from functionality the product does not include.

Adapt tangible previews, precise inclusions, and explicit exclusions. Do not copy their sales numbers, reviews, guarantee, or bundle terms.

## Recommended Structure

1. Short founder introduction: AI with Murda, what he builds, and the kinds of downloads available. Keep the person visible without putting a long biography ahead of the shop.
2. Three clear ways to browse: Free Tools, Paid Packages, and All Tools. Provide task-based filters separately from access/price filters.
3. Explain the free Starter Pack through its three existing parts. Show the pack as one free package containing three resources, not four separate products.
4. Show a small curated set of useful paid tools with a real preview and their containing package. Do not imply they can be purchased individually yet.
5. Explain the three featured packages with everyday names and a clear list of what is added at each level. Keep established product names as secondary labels until Murad approves a formal rename.
6. Longer About story, purchase questions, requirements, and support details follow the shopping choices.

## Card Contract

Each item should contain:

- A recognizable job in the headline, not only an internal system name.
- One real screenshot, short demo, or readable sample of the result.
- A text label: Free Download, Paid Package, or Included in a Paid Package. Never rely on color alone.
- One sentence explaining the benefit, followed by at most three concrete inclusions.
- A plain file-type label: Copy-and-Paste Prompt, Reusable AI Instructions, Template Folder, Written Guide, or Runnable Tool.
- Requirements that matter before purchase: own AI account, supported platform, installation, and additional usage costs.
- An action that matches the current entitlement: Download Free, View Package, or View Details. Only configured standalone products may show Buy This Tool.

Details belong on the product page. Cards should not repeat full readme files, release histories, or a list of every technical subsystem.

## Example Labels From Existing Contents

- Free: Plan an AI Change. A prompt that asks the AI to inspect the project and propose a plan before editing.
- Free: Make AI Check Its Work. Reusable instructions asking for fresh checks before claiming success; not a guarantee of correctness.
- Free: Pick Up Where You Left Off. A session checklist for finishing one task and leaving useful notes.
- Starter: Learn to Build With Claude Code and Codex. The existing Future Proof Method; written lessons, setup help, prompts, and starter tools.
- Bundle: Build, Debug, and Check Your Work. The existing New Wave Operator Bundle; adds review, debugging, safety checks, and delivery workflows.
- Toolkit: Organize Your Full AI Setup. The existing Toolkit; adds project rules, memory/handoffs, reusable skills, and collaboration structure.
- Tool detail: Project Memory and Handoffs, with Memory OS as the product label. Show an actual sanitized handoff example and explain that it relies on saved files, not unlimited memory.

These are proposed display labels, not new products or changed package contents.

## Product Page Contract

Show, in order: the job it helps with; a real example; what is delivered; a short first-use sequence; requirements and limitations; exact containing package and billing; support/purchase terms.

For example, Memory OS should demonstrate saved project decisions and a resume note. A design pack should show an actual design review. A prompt should show its real text or a bounded input/output example. Do not use another seller's media or label an invented outcome as a real customer result.

## Non-Negotiable Boundaries

- Keep $47/$97 one-time pricing and the existing Toolkit terms unless Murad separately approves changes. Current Toolkit checkout is $327 today, then $30/month; never show $297 alone as the total due today.
- Do not silently add more giveaways. The existing sampler is the approved free resource in this preview.
- Do not copy the references' low-priced entry offers; Murad's established minimum paid tier is $47.
- Distinguish a free preview from a free product, and a reusable instruction file from a runnable app.
- The older Arsenal offer is not the same as the three featured packages. Retain access and billing, and explain the distinction wherever it is linked.
- No fake popularity labels, conversion statistics, savings calculations, guaranteed results, or promises of unlimited future releases.
- Preserve Backbone-only Stripe, Supabase member accounts and ownership, and the focused download library.

## Next Build Acceptance Checks

- A visitor can identify free resources without opening a pricing FAQ.
- Every paid item exposes its package and recurring obligation before checkout.
- The free-filter count matches actual available resources, without double-counting a bundle and its contents.
- Product cards remain concise and consistent across desktop and mobile.
- Every featured item has a verified, customer-safe example and a plain description of its first useful action.
- No standalone buy action appears before the actual SKU, price, entitlement, and download delivery are configured and approved.

The inspected public pages do not reveal their sales conversion data. The recommendations above are reasoned usability choices, not claims that a particular layout will produce a measured revenue increase.

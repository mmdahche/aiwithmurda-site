# START HERE — Content Engine Pack

You bought five skills that cover the short-form content stack: hook design,
humanization, script writing, trend-driven angles, and spoken overviews. Plus
one operator workflow doc that ties them together.

## First win in 3 steps (~20 minutes)

1. **Install all five:** `bash install/setup.sh`
2. **Voice pass:** paste 400–1000 words of your own writing and ask the agent
   to run the `content-humanizer` fingerprint step. Save the fingerprint.
3. **Ship one:** open the daily pipeline in
   `payload/templates/faceless-channel-workflow.md`, pick one trend with a
   real source, and run it end-to-end into a 30-second script.

## Where everything is

- `payload/*.md` — five skills (source copies)
- `payload/templates/faceless-channel-workflow.md` — daily operator pipeline
- `install/claude-code/` + `install/codex/` — dual layouts
- `examples/reel-hook-humanize-walkthrough.md` — trend → hook → script → caption
- `VERIFY.md` — checklist we ran before shipping

## The one rule

**Every claim needs a source.** No fake income numbers, no unsourced "trending"
takes, no hooks that would need a lie to land. The pack refuses those inputs
by design — if the agent asks you for a source, provide one or change the
angle.

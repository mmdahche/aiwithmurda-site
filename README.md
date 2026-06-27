# 60-Day Command Center

Local-first dashboard for Murad's 60-day AI operator sprint.

The app keeps one daily tracker dataset and turns it into:

- a public-safe dashboard
- an OBS overlay preview
- daily log editor
- daily slide and weekly recap deck preview
- JSON/CSV exports for future automation

## Run

```bash
npm install
npm run dev
```

Then open the local Vite URL.

## Workflow

1. Open `Daily Log` every morning and set the day's goal.
2. Update metrics at night.
3. Use `Dashboard` on stream for the public command-center segment.
4. Use `Overlay` as the reference for the OBS browser source.
5. Use `Deck` to review the growing Day 1-60 proof deck.

The current version uses browser localStorage, seeded demo data, and no cloud services.

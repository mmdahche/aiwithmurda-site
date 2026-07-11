# START HERE — The Council

You bought a 5-advisor decision engine. Five different AI models argue about
your decision from five fixed, opposing perspectives; five anonymized peer
reviewers grade the arguments; your own AI session (or you) synthesizes the
verdict as Chairman. ~5 seconds per run. $0 per run on Groq's free tier.

## Your first win in 3 steps (~10 minutes)

1. **Install:** run `bash install/setup.sh` — it copies the runner to
   `~/.council` and checks you have Python 3. Pure standard library; nothing
   to pip-install.
2. **Add your free key:** grab a key at https://console.groq.com/keys, then
   `cp ~/.council/.secrets/groq.env.example ~/.council/.secrets/groq.env`
   and paste it in.
3. **Fire a test round:**
   `~/.council/council.sh --mode fast "Should I keep paying for tools I have not opened in 30 days?"`

When that returns a primary verdict + a cross-judge in about 2 seconds,
you're live. Run your first FULL council on a real decision you're currently
sitting on: frame it with `payload/framing-template.md`, then
`~/.council/council.sh "your framed question"`.

## Where everything is

- `README.md` — what this is, who it's for, per-OS setup detail
- `INDEX.md` — every file in this folder, verified against disk
- `payload/council/` — the engine (runner, wrapper, 5 advisor prompts, reviewer prompt)
- `payload/framing-template.md` — fill this before every run
- `payload/companions/` — `/office-hours` (idea diagnostic) + `/grill` (plan interrogation)
- `install/claude-code/` + `install/codex/` — drop-in skill files so your AI
  agent can dispatch the council itself
- `examples/example-run.md` — a real run from Murad's archive, trimmed
- `VERIFY.md` — the checklist we ran before shipping this folder; re-run it yourself
- `CHANGELOG.md` — version history; updates land here first

## The one rule

The council is for decisions with real downside — money, weeks, reputation.
Don't council trivia. If you can decide in 10 seconds, decide in 10 seconds.

# Changelog — The Council

All notable changes to this product are recorded here. "Lifetime updates"
means this file grows and your download refreshes — verifiably, not as a
marketing line.

## 1.0.0 — 2026-07-11 — Launch edition

- Council engine: `runner.py` (pure stdlib) with three modes — `multi-model`
  (default, 5 different Groq models), `personas` (rate-limit fallback),
  `fast` (1 primary + 1 cross-judge, ~2s, no archive).
- 5 tuned advisor prompts (Contrarian, First Principles, Expansionist,
  Outsider incl. anti-glossary hard rules, Executor).
- Anonymized peer-review pass (5 reviewers, A–E labels, merit-only grading).
- Chairman protocol: fixed 7-section synthesis + adversarial "doubt" mode
  with bounded 3-cycle loop and doubt-theater failure check.
- Question framing template.
- Companion skills: `/office-hours` (6 forcing questions, two modes) and
  `/grill` (Socratic plan interrogation).
- Install layouts for Claude Code and Codex + one-time `setup.sh`.
- Real sanitized example run from the author's archive.

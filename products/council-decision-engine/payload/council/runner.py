#!/usr/bin/env python3
"""The Council runner — 5 advisors + 5 anonymized peer reviewers on Groq.

Usage:
    GROQ_API_KEY=... python3 runner.py "the question"
    GROQ_API_KEY=... python3 runner.py --mode personas|multi-model|fast "the question"

Install location: $COUNCIL_HOME (default ~/.council). Pure standard library —
no pip installs required. Bring a free Groq API key.
"""

import argparse
import concurrent.futures as cf
import datetime as dt
import html
import json
import os
import pathlib
import random
import re
import sys
import time
import urllib.error
import urllib.request

THINK_TAG_RE = re.compile(r'<think>.*?</think>\s*', re.DOTALL | re.IGNORECASE)


def strip_reasoning_tags(text: str) -> str:
    """Remove inline <think>...</think> CoT blocks (Qwen-style) from model output."""
    if not text:
        return text
    return THINK_TAG_RE.sub('', text).strip()


COUNCIL_ROOT = pathlib.Path(os.environ.get("COUNCIL_HOME", str(pathlib.Path.home() / ".council")))
GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"

ADVISORS = [
    ("contrarian", "THE CONTRARIAN", "01-contrarian.md"),
    ("first-principles", "THE FIRST PRINCIPLES THINKER", "02-first-principles.md"),
    ("expansionist", "THE EXPANSIONIST", "03-expansionist.md"),
    ("outsider", "THE OUTSIDER", "04-outsider.md"),
    ("executor", "THE EXECUTOR", "05-executor.md"),
]

# Each advisor runs on a DIFFERENT model on purpose. Asking one model to
# role-play five personas collapses into the model's house style; five
# different models produce real cognitive diversity.
MODE_MULTI_MODEL = {
    "contrarian": "llama-3.3-70b-versatile",
    "first-principles": "qwen/qwen3-32b",
    "expansionist": "openai/gpt-oss-120b",
    "outsider": "meta-llama/llama-4-scout-17b-16e-instruct",
    "executor": "openai/gpt-oss-20b",
}

MODE_PERSONAS = {k: "llama-3.3-70b-versatile" for k in MODE_MULTI_MODEL}

REVIEWER_MODEL_POOL = list({v for v in MODE_MULTI_MODEL.values()})

# --mode fast: sub-2-second sanity check. 1 primary + 1 cross-judge,
# sequential. No anonymization, no HTML report, no archive. Use when the
# full council is overkill but you still want a second opinion to break
# self-judging bias.
FAST_PRIMARY_MODEL = "llama-3.3-70b-versatile"
FAST_JUDGE_MODEL = "openai/gpt-oss-120b"
FAST_PRIMARY_SYSTEM = (
    "You are a senior decision-making advisor. Read the question and give a concrete, "
    "opinionated recommendation in 5 sentences or fewer. State a verdict, not a list "
    "of considerations. If the question is ambiguous, pick the most likely interpretation "
    "and answer it — note your assumption in one short clause."
)
FAST_JUDGE_SYSTEM = (
    "You are a peer reviewer of another model's recommendation. Answer in 4 sentences "
    "or fewer:\n"
    "1. Agree / Disagree / Partially-Agree?\n"
    "2. The single thing the first model got most right.\n"
    "3. The single thing the first model got most wrong or missed.\n"
    "4. Your one-sentence final verdict (the user should act on YOUR verdict, not the first model's).\n"
    "Do NOT restate the original recommendation. Be terse. No filler."
)


def run_fast_judge(question: str, api_key: str) -> tuple:
    """Single primary call + single cross-judge call. Sequential.
    Target wall clock <2s end-to-end on Groq's free tier."""
    primary = groq_chat(
        FAST_PRIMARY_MODEL, FAST_PRIMARY_SYSTEM, question, api_key,
        max_tokens=600, temperature=0.4,
    )
    if not primary["ok"]:
        return primary, None
    judge_user = f"Question:\n{question}\n\nRecommendation under review:\n{primary['content']}"
    judge = groq_chat(
        FAST_JUDGE_MODEL, FAST_JUDGE_SYSTEM, judge_user, api_key,
        max_tokens=400, temperature=0.4,
    )
    return primary, judge


def print_fast_bundle(question: str, primary: dict, judge: dict | None, total_elapsed: float) -> None:
    """Plain-text bundle for the Chairman to read. No HTML, no archive
    (fast mode is meant for in-conversation real-time use)."""
    print("=== COUNCIL FAST MODE ===")
    print(f"Timestamp: {dt.datetime.now().isoformat(timespec='seconds')}")
    print("Mode: fast (1 primary + 1 cross-judge)")
    print(f"Question: {question}")
    print()
    p_elapsed = primary.get("elapsed", "?")
    print(f"--- PRIMARY [{primary['model']}] [{p_elapsed}s] ---")
    if primary["ok"]:
        print(primary["content"])
    else:
        print(f"(FAILED: {primary.get('error', 'unknown error')})")
    print()
    if judge is None:
        print("--- JUDGE [skipped — primary failed] ---")
    else:
        j_elapsed = judge.get("elapsed", "?")
        print(f"--- CROSS-JUDGE [{judge['model']}] [{j_elapsed}s] ---")
        if judge["ok"]:
            print(judge["content"])
        else:
            print(f"(FAILED: {judge.get('error', 'unknown error')})")
    print()
    print(f"[council:fast] Total wall clock: {round(total_elapsed, 2)}s")


def load_prompt(filename: str) -> str:
    return (COUNCIL_ROOT / "advisors" / filename).read_text().strip()


def load_reviewer_prompt() -> str:
    return (COUNCIL_ROOT / "reviewers" / "peer-review-prompt.md").read_text().strip()


def groq_chat(model: str, system: str, user: str, api_key: str, max_tokens: int = 1500, temperature: float = 0.7, retries: int = 2) -> dict:
    """Single Groq chat completion. Returns dict with {ok, content, error, model, elapsed, raw_content, reasoning, finish_reason}.

    Handles:
    - Qwen-style <think>...</think> inline reasoning (stripped from content; raw kept)
    - GPT-OSS-style separate `reasoning` field (falls back to reasoning if content empty)
    - Empty-content retries (reasoning models sometimes blow token budget on reasoning before emitting content)
    """
    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }).encode("utf-8")

    t0 = time.time()
    last_err = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(
                GROQ_CHAT_URL,
                data=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "the-council/1.0 (+https://github.com/karpathy/llm-council lineage)",
                    "Accept": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=90) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                msg = body["choices"][0]["message"]
                raw_content = (msg.get("content") or "").strip()
                reasoning = (msg.get("reasoning") or "").strip()
                finish_reason = body["choices"][0].get("finish_reason", "unknown")

                # Strip Qwen <think> blocks from visible content
                cleaned = strip_reasoning_tags(raw_content)

                # If cleaned content is empty but reasoning has substance, fall back to the
                # reasoning tail. Reasoning-model outputs sometimes truncate before the
                # "final answer" emission.
                if not cleaned and reasoning:
                    cleaned = reasoning.strip()
                    if len(cleaned) > 4000:
                        cleaned = cleaned[-4000:]  # keep the tail — usually the actual conclusion

                # Empty response — retry if attempts remain
                if not cleaned and attempt < retries:
                    last_err = f"empty content (finish_reason={finish_reason})"
                    time.sleep(0.5 + attempt)
                    continue

                if not cleaned:
                    return {
                        "ok": False, "content": "", "error": f"empty content after {retries + 1} attempts (finish_reason={finish_reason})",
                        "model": model, "elapsed": round(time.time() - t0, 3),
                        "raw_content": raw_content, "reasoning": reasoning, "finish_reason": finish_reason,
                    }

                return {
                    "ok": True, "content": cleaned, "error": None,
                    "model": model, "elapsed": round(time.time() - t0, 3),
                    "raw_content": raw_content, "reasoning": reasoning, "finish_reason": finish_reason,
                }
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace") if hasattr(e, "read") else ""
            last_err = f"HTTP {e.code}: {err_body[:300]}"
            if e.code == 429 and attempt < retries:
                time.sleep(2 ** attempt)
                continue
            break
        except Exception as e:
            last_err = f"{type(e).__name__}: {e}"
            if attempt < retries:
                time.sleep(1)
                continue
            break
    return {"ok": False, "content": "", "error": last_err, "model": model, "elapsed": round(time.time() - t0, 3)}


def run_advisors(question: str, mode_map: dict, api_key: str) -> list:
    """Dispatch all 5 advisors in parallel. Returns list of {key, title, model, response, ok, error, elapsed}."""
    def call(advisor):
        key, title, filename = advisor
        sys_prompt = load_prompt(filename)
        result = groq_chat(mode_map[key], sys_prompt, question, api_key)
        return {"key": key, "title": title, **result, "response": result["content"]}

    with cf.ThreadPoolExecutor(max_workers=5) as ex:
        return list(ex.map(call, ADVISORS))


def anonymize(advisor_results: list) -> tuple[list, dict]:
    """Shuffle advisor results, assign letters A-E. Returns (anon_list, letter_to_advisor_key)."""
    letters = ["A", "B", "C", "D", "E"]
    ok_results = [r for r in advisor_results if r["ok"]]
    shuffled = ok_results[:]
    random.shuffle(shuffled)
    anon = []
    mapping = {}
    for letter, r in zip(letters, shuffled):
        anon.append({"letter": letter, "response": r["response"], "advisor_key": r["key"]})
        mapping[letter] = r["key"]
    return anon, mapping


def build_review_prompt(question: str, anon: list) -> str:
    lines = [f"Question: {question}\n"]
    for item in anon:
        lines.append(f"\n--- Response {item['letter']} ---\n{item['response']}\n")
    lines.append("\n---\nNow answer the 4 numbered questions.")
    return "\n".join(lines)


def run_reviewers(question: str, anon: list, api_key: str) -> list:
    """Dispatch 5 peer reviewers in parallel. Each reviewer uses one of the pool models."""
    sys_prompt = load_reviewer_prompt()
    user_prompt = build_review_prompt(question, anon)

    # Pick 5 reviewer models (repeat if pool < 5)
    pool = REVIEWER_MODEL_POOL[:]
    random.shuffle(pool)
    while len(pool) < 5:
        pool.append(random.choice(REVIEWER_MODEL_POOL))
    reviewer_models = pool[:5]

    def call(idx_and_model):
        idx, model = idx_and_model
        # Reviewers on reasoning models (gpt-oss) need headroom for <think> + answer.
        result = groq_chat(model, sys_prompt, user_prompt, api_key, max_tokens=1500)
        return {"idx": idx + 1, **result}

    with cf.ThreadPoolExecutor(max_workers=5) as ex:
        return list(ex.map(call, enumerate(reviewer_models)))


def write_html_report(question: str, advisors: list, anon: list, mapping: dict, reviewers: list, out_path: pathlib.Path, mode: str):
    """Write a self-contained HTML artifact."""
    ts = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    esc = html.escape

    def collapsible(title: str, body_html: str, open_by_default: bool = False) -> str:
        attr = " open" if open_by_default else ""
        return f'<details{attr}><summary>{title}</summary><div class="body">{body_html}</div></details>'

    advisor_html = ""
    for a in advisors:
        status = "OK" if a["ok"] else f"FAILED: {esc(a['error'] or '')}"
        body = f'<div class="meta">Model: <code>{esc(a["model"])}</code> &middot; {a["elapsed"]}s &middot; {status}</div><pre>{esc(a["response"])}</pre>'
        advisor_html += collapsible(f"<b>{esc(a['title'])}</b> — <code>{esc(a['model'])}</code>", body)

    anon_html = ""
    for item in anon:
        anon_html += f'<div class="anon-block"><h4>Response {item["letter"]}</h4><pre>{esc(item["response"])}</pre></div>'

    review_html = ""
    for r in reviewers:
        status = "OK" if r["ok"] else f"FAILED: {esc(r['error'] or '')}"
        body = f'<div class="meta">Reviewer model: <code>{esc(r["model"])}</code> &middot; {r["elapsed"]}s &middot; {status}</div><pre>{esc(r["content"])}</pre>'
        review_html += collapsible(f"<b>Peer review #{r['idx']}</b>", body)

    mapping_html = "<ul>" + "".join(f"<li><b>{k}</b> → {esc(v)}</li>" for k, v in mapping.items()) + "</ul>"

    html_doc = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Council Report — {esc(ts)}</title>
<style>
  body {{ font-family: -apple-system, system-ui, sans-serif; max-width: 900px; margin: 2em auto; padding: 0 1em; color: #222; line-height: 1.5; }}
  h1 {{ font-size: 1.6em; margin-bottom: 0.2em; }}
  h2 {{ border-bottom: 1px solid #ddd; padding-bottom: 0.3em; margin-top: 2em; }}
  h4 {{ margin-top: 1em; margin-bottom: 0.3em; }}
  .question {{ background: #fafafa; border-left: 3px solid #888; padding: 0.8em 1em; margin: 1em 0; font-size: 1.05em; }}
  .meta {{ color: #666; font-size: 0.9em; margin-bottom: 0.5em; }}
  pre {{ background: #f5f5f5; padding: 0.8em; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; font-family: inherit; }}
  details {{ margin: 0.5em 0; border: 1px solid #e0e0e0; border-radius: 4px; padding: 0.5em 0.8em; }}
  summary {{ cursor: pointer; padding: 0.2em 0; }}
  .body {{ margin-top: 0.6em; }}
  .anon-block {{ margin: 1em 0; }}
  .footer {{ color: #888; font-size: 0.85em; border-top: 1px solid #eee; padding-top: 1em; margin-top: 3em; }}
  code {{ background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: 0.9em; }}
</style></head><body>
<h1>Council Report</h1>
<div class="meta">{esc(ts)} &middot; mode: <code>{esc(mode)}</code></div>

<h2>Question</h2>
<div class="question">{esc(question)}</div>

<h2>Advisors</h2>
{advisor_html}

<h2>Anonymized Responses (as seen by peer reviewers)</h2>
{collapsible("Show the A–E labeled responses reviewers actually saw", anon_html)}

<h2>Peer Reviews</h2>
{review_html}

<h2>De-anonymization Map</h2>
{mapping_html}

<div class="footer">
  Generated by The Council<br>
  Advisor models: {esc(", ".join(sorted(set(a["model"] for a in advisors))))}<br>
  Council pattern lineage: <a href="https://github.com/karpathy/llm-council">karpathy/llm-council</a>
</div>
</body></html>"""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html_doc)


def build_chairman_bundle(question: str, advisors: list, anon: list, mapping: dict, reviewers: list, html_path: pathlib.Path, mode: str) -> str:
    """Plain-text bundle printed to stdout for the Chairman to synthesize.

    The Chairman is the AI session (or human) that dispatched the council —
    the one holding the full context the Groq advisors never saw."""
    lines = []
    lines.append("=== COUNCIL REPORT ===")
    lines.append(f"Timestamp: {dt.datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"Mode: {mode}")
    lines.append(f"Question: {question}")
    lines.append("")
    lines.append("=== ADVISORS (identities visible to Chairman only) ===")
    for a in advisors:
        status = "OK" if a["ok"] else f"[FAILED: {a['error']}]"
        lines.append(f"\n--- {a['title']} [{a['model']}] {status} [{a['elapsed']}s] ---")
        lines.append(a["response"] if a["ok"] else "(no response)")
    lines.append("")
    lines.append("=== ANONYMIZATION MAP ===")
    for letter, key in mapping.items():
        lines.append(f"  {letter} = {key}")
    lines.append("")
    lines.append("=== PEER REVIEWS (saw only A–E, no identities) ===")
    for r in reviewers:
        status = "OK" if r["ok"] else f"[FAILED: {r['error']}]"
        lines.append(f"\n--- Peer Review #{r['idx']} [reviewer model: {r['model']}] {status} [{r['elapsed']}s] ---")
        lines.append(r["content"] if r["ok"] else "(no response)")
    lines.append("")
    lines.append("=== ARTIFACT ===")
    lines.append(f"HTML report: {html_path}")
    lines.append("")
    lines.append("=== CHAIRMAN ROLE ===")
    lines.append("The session that dispatched this council is the Chairman. Synthesize the fixed 7-section verdict:")
    lines.append("  1. WHERE THE COUNCIL AGREES")
    lines.append("  2. WHERE THE COUNCIL CLASHES")
    lines.append("  3. PARTIAL COVERAGE (topics only some advisors addressed — name who covered what)")
    lines.append("  4. UNIQUE INSIGHTS (points made by exactly ONE advisor that deserve elevation)")
    lines.append("  5. BLIND SPOTS THE COUNCIL MISSED (surfaced by peer reviewers)")
    lines.append("  6. THE RECOMMENDATION")
    lines.append("  7. THE ONE THING TO DO FIRST")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="The Council — 5 advisors + anonymized peer review via Groq")
    parser.add_argument("--mode", choices=["multi-model", "personas", "fast"], default="multi-model")
    parser.add_argument("question", nargs="+", help="The question to put before the council")
    args = parser.parse_args()

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("ERROR: GROQ_API_KEY environment variable is not set.", file=sys.stderr)
        print(f"Source the secrets file: source {COUNCIL_ROOT}/.secrets/groq.env", file=sys.stderr)
        sys.exit(2)

    question = " ".join(args.question).strip()

    if args.mode == "fast":
        t0_fast = time.time()
        print(f"[council:fast] Primary: {FAST_PRIMARY_MODEL}; Cross-judge: {FAST_JUDGE_MODEL}", file=sys.stderr)
        primary, judge = run_fast_judge(question, api_key)
        elapsed_fast = time.time() - t0_fast
        print_fast_bundle(question, primary, judge, elapsed_fast)
        return

    mode_map = MODE_MULTI_MODEL if args.mode == "multi-model" else MODE_PERSONAS

    t0 = time.time()
    print(f"[council] Dispatching 5 advisors in {args.mode} mode...", file=sys.stderr)
    advisors = run_advisors(question, mode_map, api_key)
    ok_count = sum(1 for a in advisors if a["ok"])
    print(f"[council] Advisors returned: {ok_count}/5 ok in {round(time.time() - t0, 2)}s", file=sys.stderr)

    if ok_count < 3:
        print("[council] FATAL: fewer than 3 advisors succeeded. Check rate limits / models.", file=sys.stderr)
        for a in advisors:
            if not a["ok"]:
                print(f"  [FAIL] {a['key']} ({a['model']}): {a['error']}", file=sys.stderr)
        sys.exit(3)

    anon, mapping = anonymize(advisors)

    t1 = time.time()
    print("[council] Dispatching 5 anonymized peer reviewers...", file=sys.stderr)
    reviewers = run_reviewers(question, anon, api_key)
    ok_rev = sum(1 for r in reviewers if r["ok"])
    print(f"[council] Reviewers returned: {ok_rev}/5 ok in {round(time.time() - t1, 2)}s", file=sys.stderr)

    ts_slug = dt.datetime.now().strftime("%Y-%m-%d-%H%M%S")
    run_dir = COUNCIL_ROOT / "runs" / ts_slug
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "question.txt").write_text(question + "\n")
    (run_dir / "advisors.json").write_text(json.dumps(advisors, indent=2))
    (run_dir / "reviewers.json").write_text(json.dumps(reviewers, indent=2))
    (run_dir / "mapping.json").write_text(json.dumps(mapping, indent=2))

    html_path = COUNCIL_ROOT / "reports" / f"council-report-{ts_slug}.html"
    write_html_report(question, advisors, anon, mapping, reviewers, html_path, args.mode)

    print(build_chairman_bundle(question, advisors, anon, mapping, reviewers, html_path, args.mode))
    print(f"\n[council] Total: {round(time.time() - t0, 2)}s  | HTML: {html_path}", file=sys.stderr)


if __name__ == "__main__":
    main()

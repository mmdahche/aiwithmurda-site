# Faceless Channel Workflow

Operator playbook for running a faceless (or lightly-faced) short-form
channel using the five skills in this pack. This is the seat-to-seat process
one operator follows, alone, on a laptop and a phone, to ship one video per
weekday.

Not a growth guarantee. Not a monetization plan. A repeatable pipeline that
turns research into a shipped short in ≤ 90 minutes on a good day.

## Cadence

| Day / block | Skill in use | Output |
|-------------|--------------|--------|
| Monday research block | `trending-content` | Six angles + sources for the week |
| Tue–Fri drafting | `hooks-angles` → `ugc-scriptwriter` | One shootable script per day |
| Same-day rewrite | `content-humanizer` | Voice-calibrated caption + description |
| Weekly audio | `audio-overview` | One podcast-style summary per week (optional) |

## Pipeline — one shipped short in five stages

### Stage 1 — Research (once weekly, ~30 min)

1. Open the trend sources the operator subscribes to (news, community boards,
   platform "trending" pages, industry newsletters).
2. Log every candidate trend with: name, primary URL, date, corroborating URL.
3. Run `trending-content` against each candidate. Discard any that fail the
   ethics screen without argument.
4. Save 4–6 approved trends with their angle matrices into a working doc.
5. Slot one angle per weekday. Note the format the angle is written for.

**Output artifact:** `week-of-<date>-content-plan.md` with 4–6 angles,
sources, and slot dates.

### Stage 2 — Script (daily, ~20 min)

1. Pull the day's angle from the plan.
2. Run `hooks-angles` on the topic. Produce five hook candidates + one
   rejection line. Pick the strongest.
3. Feed the chosen hook + angle into `ugc-scriptwriter`. Request a script
   at the platform's optimal length (30–45s for reels / TikTok, ≤ 60s for
   YouTube Shorts).
4. Read the paste-ready template out loud once. If any beat trips you up,
   ask the scriptwriter for a rewrite of that beat only.

**Output artifact:** paste-ready script doc with shot list, overlays, caption.

### Stage 3 — Record (daily, ~15 min)

1. Set the phone in the operator's default recording position (tripod, ring
   light on, front or back camera per the shot list).
2. Read the script beat-by-beat. Do not memorize — glance at the phone lockscreen
   teleprompter or a second device.
3. Shoot each beat as a separate clip. Re-shoot the hook up to five times if
   needed — hook quality dictates completion rate.
4. Shoot B-roll cues immediately after the face beats, same session.

**Output artifact:** raw clips folder named `raw-<date>-<slug>/`.

### Stage 4 — Edit (daily, ~15 min)

1. Import clips into the operator's editor of choice.
2. Cut on the beat boundaries from the script. Do not editorialize new cuts
   the script didn't call for — the script is the edit map.
3. Paste overlays from the script's overlay block. Match font, size, position
   as documented in the script.
4. Add B-roll cutaways at the timestamps the script specified.
5. Export vertical (9:16), 1080×1920, at platform-appropriate bitrate.

**Output artifact:** `final-<date>-<slug>.mp4` + thumbnail if needed.

### Stage 5 — Post (daily, ~10 min)

1. Paste the script's caption block into the platform upload form.
2. Run the description / caption through `content-humanizer` with the
   operator's voice sample if this is the first time on a new platform, or
   the caption sounds off. Skip on subsequent uploads where the caption
   template already matches voice.
3. Set the CTA per the script — do not add extras.
4. Schedule or post to the operator's target time window (per platform).
5. Log the post in the tracker (see tracker section below).

**Output artifact:** live URL logged in `posts-<year>.csv`.

## Weekly audio slot (optional)

Once a week the operator turns a longer piece — newsletter, blog, spec — into
an audio overview:

1. Pick the source doc. Confirm it's the operator's own work or clearly cited.
2. Feed to `audio-overview` with runtime target (usually 8–12 min).
3. Record straight from the script in one take. Re-record only the cold open
   if it's the weak beat.
4. Post as a private podcast, private YouTube upload, or share to team.

## Tracking — what to log

A minimum viable log per post:

```
date, platform, slug, hook_frame, format, runtime_sec, url, views_24h, saves_24h, ctr_bio_link_24h
```

Do not track vanity metrics without a decision they'd change. If the operator
doesn't act on average watch time, don't collect it.

## The 90-minute-day discipline

Stages 2–5 are designed to fit in 60 minutes total on an average day. Add
15–30 minutes for stage 1 amortized across the week. Anything more, and
this workflow is being violated somewhere — usually by re-scripting during
recording or re-shooting after editing has started.

Common violations and their fixes:

- **Re-scripting during recording** — pause. Ask `ugc-scriptwriter` for a
  beat rewrite. Restart that beat only.
- **Re-shooting after editing** — the shot list was incomplete. Add the
  missed cue to the shot list template so it doesn't happen next time.
- **Re-writing the caption three times** — you skipped the voice fingerprint
  step in `content-humanizer`. Do it once, save the fingerprint, reuse it.
- **Trend went stale mid-week** — the 24-hour rule caught you. Move the slot
  to an evergreen angle already in the plan.

## Failure modes to name and avoid

- Copying another creator's script structure line-for-line — the four beats
  are structural; the words are yours
- Using `trending-content` with unsourced trends and blaming the skill when
  the take gets fact-checked
- Skipping the ethics screen because "the trend is hot" — hot trends punish
  ethics failures harder, not less
- Hooking with a claim the script's action beats can't deliver — the audience
  drops off at the action beat and the piece looks like clickbait

## What this workflow is not

- Not a monetization strategy — that's a different pack
- Not a scaling plan for a multi-person team — designed for a solo operator
- Not a substitute for a niche and a point of view — the pack sharpens
  execution, not positioning

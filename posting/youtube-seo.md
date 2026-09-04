# YouTube Shorts SEO — "Boost your video views" (Step 5), applied

This is the repeatable playbook for making the auto-posted Shorts more
attention-grabbing and search-friendly. It turns the generic "Step 5" prompt
into a concrete, checked process wired to `posting/config.json`.

## What changed

The `neville_youtube` clips used to post with **empty titles** — the single
biggest CTR/search miss. They now ship with:

- **`clips[].title`** — 28 unique, front-loaded, hook + keyword titles, each
  ≤100 chars, each ending in `#Shorts` + two rotating topical hashtags.
- **`manifests.neville_youtube.description_template`** — a description whose
  first line is the hook, followed by a benefit/CTA, music + site credit, and a
  hashtag block. `{title_plain}` is the title with its trailing hashtags
  stripped (use `title.split(' #')[0]`).
- **`manifests.neville_youtube.tags`** — a researched tag list; joined with
  `", "` it is 405 chars, inside YouTube's ~500-char budget.

## The title formula (why these work)

1. **Front-load the hook + core keyword** in the first ~40 chars — that's all
   the Shorts feed and search snippet reliably show. "Neville Goddard",
   "manifestation", "law of assumption", or "manifest" appears early in every
   title.
2. **Curiosity or benefit, second person.** "This changes how you manifest",
   "Watch reality bend", "Nobody taught you" — a reason to tap, not a label.
3. **`#Shorts` is mandatory** — it's the strongest signal to surface a vertical
   video in the Shorts feed. Then 2 topical hashtags, rotated across
   `#NevilleGoddard #Manifestation #LawOfAssumption #Manifest #Spiritual
   #Mindset #ManifestSP #LOA` so the channel doesn't look templated.
4. **≤100 chars.** Titles are enforced ≤100 in `apply_yt_seo.py`; keep new ones
   there so nothing truncates mid-word.

## The description formula

- **Line 1 = the hook** (`{title_plain}`). YouTube weights the first line
  heavily and shows it under the video.
- **Lines 2-3 = benefit + CTA** ("save this", "watch again tonight",
  "subscribe for a new one daily") — watch-time and subscribe drivers.
- **Credit + link** — `"Cheat Code" by Antidote` and antidotethefoodie.com, so
  music and the site get pulled through.
- **Hashtag block** — 12 tags; the first three (`#Shorts #NevilleGoddard
  #Manifestation`) are what render as clickable chips above the title.

## How the posting routine should use these fields

When posting a `neville_youtube` clip at index N:

```
title       = clips[N].title
description = description_template.replace("{title_plain}", clips[N].title.split(" #")[0])
tags        = tags            # pass as the video's tag list
```

Nothing else needs to change in the selection logic.

## Refresh cadence (keep it current — the prompt says "latest trends")

vidIQ is the source of truth; run these when credits are available
(they cost 5 each, so batch them):

- `vidiq_keyword_research mode=rising topic=<niche>` — catch rising manifestation
  angles (e.g. a spike in "manifest specific person", "glow up manifestation").
- `vidiq_score_title` on any new title before it goes in the manifest; keep only
  those scoring well for `type=short`.
- `vidiq_trending_videos videoFormat=short titleQuery="neville goddard"` — mine
  the title patterns of Shorts that are actually spiking, then mirror the
  structure (not the words).

Re-run monthly, or whenever a title's angle stops landing. Update the titles in
`apply_yt_seo.py` and re-run it so the manifest stays the single source of truth.

## Guardrails

- No fabricated view counts, fake "as seen on", or clickbait the video doesn't
  pay off — the hook must match the clip's actual teaching.
- Keep it Neville's own doctrine; don't promise guaranteed outcomes.

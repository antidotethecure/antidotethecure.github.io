# "Real or AI?" — YouTube video format (reusable template)

A repeatable guessing-game video: show two clips (one genuinely real, one
AI-generated), let the viewer guess, then reveal. Built for retention +
rewatch. Vertical 9:16, ~90s (stretchable to 2:00).

## Hard integrity rule
The clip labeled **REAL must be genuinely real footage.** Never label an
AI clip "real" — the video's whole promise is that one is authentic, so the
reveal has to be true. If we don't have a real clip, we don't ship the video.

## Where the clips come from (given the constraints)
- **AI clip (B):** generated with Higgsfield `generate_video` (Higgsfield credits).
- **Real clip (A):** must be genuinely real. Options that actually work here:
  1. Antidote's own real footage already hosted on cloudfront (the food-review
     clips) — the compositor CAN fetch those (it fetched them for the GTA renders).
  2. A real clip the creator attaches directly in chat (lands in uploads/), which
     we host via `media_upload`.
  - NOT usable: Instagram / arbitrary web links (egress-blocked from the sandbox).

## Timeline (≈90s, vertical 9:16)
| # | Segment | Time | On-screen |
|---|---|---|---|
| 1 | Hook card | 0–5s | "REAL or AI? 👀 Can you tell?" |
| 2 | Clip A (full screen) | 5–35s | big "A" badge top-left |
| 3 | Clip B (full screen) | 35–65s | big "B" badge top-left |
| 4 | Guess + countdown | 65–75s | "Which one is REAL? Comment your guess!" + 10→1 countdown |
| 5 | Reveal | 75–90s | "✅ A = REAL · ❌ B = AI" (swap per the true answer) + one-line why |

To reach 2:00: extend clips to 40s each, or add a 10s "watch again 👀" recap.

## vidiq_compose plan (feed this when vidIQ credits are available)
- `format: "vertical"`
- `scenes`: [hookCard(image or color, 5s), realOrAiClipA(video, 30s, layout fit),
  clipB(video, 30s, layout fit), guessCard(5s), revealCard(15s)]
  - simplest: use the two clips as the only video scenes; render the hook/guess/
    reveal as text overlays over a black or branded still, OR as short image scenes.
- `overlays` (text):
  - "A" badge  — start 5, duration 30, position top-left
  - "B" badge  — start 35, duration 30, top-left
  - "Which one is REAL? 🤔 Comment A or B" — start 65, duration 10, centered
  - Countdown "10","9",…,"1" — one per second, start 65..74, centered-bottom, big
  - Reveal text — start 75, duration 15, centered, high-contrast
- `music`: the Antidote track or an upbeat bed, `volume` ~0.5 under the clips
  (`duckTo` if any voiceover).
- Keep each source clip's own audio only if it matters (`keepNativeAudio`);
  otherwise music-only.

## YouTube metadata (fill the subject in [brackets])
**Title options (front-load the hook, ≤100 chars):**
- `Real or AI? 👀 Can You Tell Which [SUBJECT] Is Fake? #Shorts`
- `One of These [SUBJECT] Clips Is AI… Can You Spot It? 🤖 #Shorts`
- `99% Get This WRONG — Real or AI? [SUBJECT] Edition 👀`

**Description template:**
```
One of these two clips is 100% real. The other is AI. Can you tell which? 👀
Drop your guess — A or B — in the comments BEFORE the reveal!

🅰️ Clip A
🅱️ Clip B
Answer revealed at the end. No cheating 😏

Follow for more Real-or-AI challenges.
More: https://antidotethefoodie.com

#RealOrAI #AIvsReal #Shorts #AI #ArtificialIntelligence #Antidote #TheRealAntidote
#guessinggame #AIvideo #isitreal #fyp #viral #trending #foryoupage
```

**Tags:** real or ai, ai vs real, is it real or ai, ai video, guess the ai,
artificial intelligence, ai challenge, antidote, therealantidote, ai detection,
real or fake, guessing game

## What's needed to actually render one
1. A real clip (attach one, or point me at an Antidote cloudfront clip).
2. The subject, so the AI clip B is a fair match.
3. vidIQ credits for `vidiq_compose` (~empty until Oct 4) + Higgsfield credits
   for the AI clip. Preflight the AI cost with `generate_video get_cost:true`.

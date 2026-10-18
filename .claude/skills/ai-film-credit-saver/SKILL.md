---
name: ai-film-credit-saver
description: >
  Credit-saving production workflow for AI filmmaking: title cards, key art,
  promos, teasers and documentary shots made with Higgsfield, Seedance, Kling,
  Nano Banana, CapCut or similar paid generators. Use whenever you are about to
  spend generation credits on an image or video, plan a shot or sequence, retry
  a failed render, or animate a still. Core rule: make creative decisions with
  cheap methods and spend expensive video credits only on approved shots.
---

# AI Film Credit Saver

The core rule: **use cheap methods to make the creative decisions, and spend
expensive video generation only after the shot is approved.**

This is a working method, not a checklist to recite. Before every paid
generation, ask: has the person approved what this render depends on? If not,
do the cheaper step first.

Project-specific facts (approved assets, faces, card registry, story beats)
live in the person's private Google Drive project docs, not in this public
repo. Read those before generating. Never copy private story details into this
file.

## The pipeline (do not skip ahead)

1. **Script.** The story beat is locked in the project docs.
2. **Shot plan.** One line per shot: subject, action, camera, how it ends.
3. **Text storyboard.** Describe each frame in words. It costs nothing.
4. **Approved starting frame.** One still per shot, approved by the person.
5. **Animatic.** Approved stills cut together with voiceover in a free editor
   (CapCut). This catches pacing problems for free.
6. **References.** Character, location, prop and lighting references are saved
   and reused.
7. **Draft video.** Lowest resolution and shortest length that shows the motion.
8. **Rough edit.** Fix small problems in post.
9. **Final render.** Upscale or finalize only the drafts the person approved.

## Gates: stop and get approval before moving on

- **Face gate.** No video until the person confirms the still looks like them.
  Video can only be as accurate as its first frame.
- **Text gate.** Proofread every word of AI-rendered text (titles, brand names,
  dates) against the source before locking. AI misspells small text.
- **Brand gate.** Brand names follow the project's spelling rule exactly.
- **Cost gate.** Run a cost preflight (for example `get_cost: true` on
  Higgsfield video) and tell the person the price before any render that costs
  more than a draft.

## Identity: the most expensive failure

Identity drift wastes the most credits. A face built on AI built on AI drifts
further with every step, like a photocopy of a photocopy.

- Anchor every face shot to a **real photo** or an approved reference element.
  Never chain more than one AI edit away from a real-photo anchor.
- Prefer fresh, real, front-facing photos in good light over old or filtered
  ones. Filters bake wrong skin tones into references, so take face shape
  from a filtered photo and color from an unfiltered one.
- For a different age (younger or older), use a real photo from that era as the
  reference; don't ask the model to guess.
- When animating a person, use a video model that accepts an identity
  reference element (for example Kling 3.0) rather than inferring the face from
  one frame. Keep the subject still and move the camera and environment; less
  face motion means less drift.

## Retries: change less, not more

- Change **one** major variable per retry, and analyze why the last one failed
  before writing the next prompt.
- Set a **retry budget per shot: 2 tries.** If a small detail (which finger,
  which hand, a prop, a word) fails twice, stop regenerating and fix it in post
  or with a real reference photo.
- Separate competing details. If a detail keeps landing on the wrong body part,
  give each hand or object its own clear job in the prompt.
- Describe actions in order, keep one clear action per shot, and avoid
  contradictory instructions.
- Save prompts and settings that worked, and reuse them.

## Testing video cheaply

- Test at 480p, in draft or fast mode, at the shortest length (4–5 s).
- Use draft-to-master when the model offers it: approve the draft, then
  finalize that same job at 1080p instead of re-rolling.
- Test the subject's motion before adding camera motion.
- Set resolution in the settings, not in the prompt.
- Use cheaper models for simple shots; save premium models for hero shots.
- Reference prices seen on Higgsfield, Oct 2026 (prices change; re-check with
  a preflight):
  - Seedance 2.5, 5 s 480p draft: ~15 credits
  - Seedance 2.5, 5 s 720p: ~35 credits
  - Seedance 2.5, 8 s 1080p: ~96 credits
  - Nano Banana image edit, 2K: ~10–11 credits

## Editing saves money

- Put titles and on-screen text on in post (a card builder, Canva or CapCut) over a
  text-free plate whenever possible. Regenerating a whole image to fix one
  letter wastes credits.
- Trim clip starts and ends, reframe, add cutaways, and repair small errors in
  post instead of regenerating.
- Match color in post, and use sound design to strengthen weak moments.
- Reuse approved footage for alternate edits, teasers and vertical versions.
- Real footage beats AI for documentary truth. Never fabricate a real event
  (an arrest, a death, a crime) with AI. Use abstract imagery or real material.

## Continuity

- Use the last approved frame as the start frame for a continuing action.
- Keep the same lighting and wardrobe references across a sequence.
- Track character, prop and environment positions between shots.

## Budget control

- Before starting a batch, check the balance and tell the person what it buys
  (for example "42 credits is about one video draft plus two stills").
- Track cost per **usable** output, not per generation.
- Spend video credits on approved shots only. Use whichever account is
  cheapest for the job (for example CapCut credits for video, Higgsfield for
  stills), and say which one is paying.
- When the person can't see a link in chat, point them to the generator app's
  history instead of re-rendering.

## Start here (the five cheapest high-value steps)

1. A text-only storyboard.
2. A visual storyboard and animatic from stills.
3. Approved starting frames.
4. Low-cost motion tests.
5. A final render only after continuity checks.

Source: adapted from "50 Tips To Save Credits in AI Filmmaking" (Shailesh,
@BEGINNERSBLOG), plus lessons from real production sessions.

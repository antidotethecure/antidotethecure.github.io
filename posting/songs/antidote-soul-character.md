# Antidote Soul Character — Retrain Plan

Goal: fix the body on the Antidote Soul character. Face is close on the
existing "Antidote Real" Soul (67148f87-b5ef-4a45-9db7-7782a07d0acd); the
body is not, because the old training set was face-heavy.

## Body description block (paste into every prompt)

> a big, broad-shouldered Black man with a powerful heavyset build, thick
> chest and strong tattooed forearms, light brown skin with freckles across
> his face, chinstrap beard, wearing a fitted black cap and gold chain,
> standing with grounded confident posture

Use this in place of "a Black man" in all 14 Believe Me treatment prompts.

## Training images already uploaded to Higgsfield media library

| # | Shot | media_id |
|---|---|---|
| 1 | Ramen fit — solo full body, front, mirror-corrected | b1239477-f025-43fc-b9c7-d91393d8fd87 |
| 2 | Poolside A — solo full body, front, night | 47f7baa6-1d9f-4670-a10c-259cad5e77e5 |
| 3 | Poolside B — solo full body, front, night | d31cc608-a967-4819-8d9d-8323eccf64c1 |
| 4 | Product shot — full body, front, cropped solo | 19e1d873-3319-4e6a-9455-f20a92819d7c |
| 5 | Mansion party 2022 — 3/4 body, clear face, no sunglasses | 2673ed45-0814-402b-91e3-d1b984e91427 |
| 6 | Range video frame — full body side profile | 771053fd-369d-4777-8f85-b2dd96648b5d |
| 7 | Range video frame — full body, mid-motion | 8edddb60-a6ad-4793-a7dd-ae7125455587 |

## The Messiah look (Believe Me signature wardrobe)

Requested styling: Jesus-type robe, crown of thorns, blood on the face.

Wardrobe block (append to the body block for sacred scenes):

> wearing a flowing off-white linen messiah robe draped over his shoulders,
> a crown of thorns on his head, thin trickles of blood running down his
> forehead and face, gold chain visible at his chest

First concept tests (Soul V2, "Antidote Real", 2026-08-27):
- job de8436e9-50e3-4a0b-baea-8e9f585f9f19
- job 88b04d91-7878-4588-af37-32d108314c0f

Suggested use in the treatment: street clothes for Verse 1 (the world
before), the robe + thorns from the first wing-tear onward (scenes 05-13),
so the sacrifice look lands exactly when the song starts costing him.
Update every affected scene prompt with the wardrobe block for consistency.

## Still needed before retraining (phone photos are fine)

1. Recent solo full-body, front, eyes visible (no sunglasses)
2. Side profile, no vest/jacket
3. One from behind
4. One without a hat (hairline never captured yet)
5. 1-2 in the Believe Me video wardrobe

## Retrain steps (when ~1,200 credits land ~Sept 6)

1. Upload the remaining shots to the media library
2. Train new Soul ID from the full set (~25 credits)
3. Test with 5-10 Soul V2 generations at 0.12 credits each using the body
   block above; compare against "Antidote Real"
4. If good: use the new Soul for all Believe Me treatment scenes
   (see believe-me-treatment.md)

Notes: caps are fine in most shots (it's the signature look), but the set
needs at least one hatless and two no-sunglasses images so the model learns
the full head. Sunglasses shots teach wardrobe, not identity.

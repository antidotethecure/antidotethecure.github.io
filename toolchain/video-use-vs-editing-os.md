# Video Use vs. the Antidote Editing OS — output verification notes

Research date: 2026-09-05. Source: https://github.com/browser-use/video-use
(read-only reference clone; not installed as a tool).

**Caveat first:** the Antidote Editing OS spec (build-antidote-edit,
caption-engine, sound-design, viral-clip-finder, shorts-generator,
quality-control) was not reachable from the session that wrote this — it is
not in any branch of antidotethecure.github.io, not in the published Claude
artifacts, and not in Google Drive. So the "what your spec doesn't do"
column below is inference from the module names, not a verified diff.
Point a session at the actual spec to turn this into a real line-by-line
comparison.

## How Video Use handles each area

**Filler-word removal.** It deliberately does NOT strip fillers in
preprocessing. It demands word-level *verbatim* ASR (ElevenLabs Scribe) and
treats fillers, false starts, and `(laughs)`-style audio events as editorial
signal the LLM reads at decision time. Cuts are chosen from a packed
phrase-level transcript; every cut edge must land on a word boundary with
30–200ms padding to absorb 50–100ms timestamp drift. Its anti-pattern list
explicitly bans normalized/phrase-mode transcripts because they destroy the
sub-second gap data cutting depends on.

**Subtitles.** Word-level SRT built on *output-timeline* offsets
(`word.start - segment_start + segment_offset`) so captions stay aligned
after segments are concatenated, and burned in LAST in the filter chain so
overlays can never cover them. Style is three explicit dimensions —
chunking, case, bottom margin — with a shipped 2-word/UPPERCASE force_style
for short-form.

**Color grading.** No preset-first mindset: an ASC CDL mental model
(slope/offset/power per channel + saturation), applied per-segment during
extraction (never post-concat, which double-encodes), with a hard rule to
test skin tones before going aggressive. Look at a frame, change one thing,
look again.

**Overlays.** Rendered as separate clips (PIL/ffmpeg, HyperFrames, Remotion,
or Manim) by parallel sub-agents, composited with
`setpts=PTS-STARTPTS+T/TB` so the overlay starts at its own frame 0; payoff
frames are back-timed to land on the spoken payoff word; easing is never
linear.

**The output self-check (the interesting part).** Step 7 of its process,
run BEFORE the user ever sees a preview:

1. Re-inspect the **rendered output**, not the sources: a filmstrip +
   waveform PNG (`timeline_view.py`) at every cut boundary, ±1.5s.
2. Per boundary, check four named failure modes: visual jump at the cut,
   waveform spike (audio pop that slipped past the 30ms fades), subtitle
   hidden behind an overlay, overlay showing the wrong frames.
3. Sample first 2s, last 2s, and 2–3 midpoints for grade consistency and
   subtitle readability.
4. One machine check: `ffprobe` duration on the output must match the EDL's
   expected total.
5. Bounded repair loop: fix → re-render → re-eval, **capped at 3 passes**,
   then remaining issues are flagged to the human instead of looping.
6. Debug frames land in a `verify/` directory — an audit trail of what the
   self-check actually looked at.

Note what the self-check leans on upstream: most failure classes are
*prevented* by hard ordering rules (subtitles last, per-segment extract +
lossless concat, 30ms boundary fades, word-boundary cuts) and the
self-check exists to catch the residue those rules miss.

## What's worth folding into quality-control

1. **Verify the render, not the plan.** If quality-control today scores the
   EDL/script/captions before render, add a pass that extracts frames +
   waveform from the finished file at every cut boundary and has the model
   look at them. Most shipping defects (pops, flashes, covered captions)
   only exist in the render.
2. **Name the failure modes.** A checklist of specific, checkable defects
   (audio pop, visual jump, caption occlusion, overlay misfire, duration
   mismatch) beats a generic "review the output" instruction.
3. **At least one machine-checkable invariant.** ffprobe duration vs.
   expected, resolution/fps vs. delivery spec, caption count vs. transcript
   segments. Cheap, deterministic, catches whole-file breakage instantly.
4. **Bounded self-repair with escalation.** Fix-and-re-render at most N
   times (Video Use uses 3), then surface what's still wrong to you rather
   than burning tokens in a loop or silently shipping.
5. **An audit trail.** Keep the verification frames/images per run so "QC
   passed" is inspectable after the fact — useful across
   shorts-generator/viral-clip-finder batches where you won't watch every
   output.
6. **Push correctness upstream as ordering rules.** Caption-engine should
   own "captions composite last" and "timestamps are output-timeline
   offsets" as hard rules, so quality-control verifies residue instead of
   catching systemic bugs every run.

Cheapest high-leverage adoption if only one thing gets taken: #1 + #4 —
a render-inspection pass with a capped repair loop.

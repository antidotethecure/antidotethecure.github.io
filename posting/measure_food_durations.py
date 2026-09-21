#!/usr/bin/env python3
"""
Measure every food-review clip's duration and gate TikTok Creator Rewards
eligibility on the 1:05 (65s) rule.

WHY THIS RUNS ON YOUR MAC (not in the cloud):
The clip host (cloudfront) is blocked from the cloud build sandbox, and the
sandbox has no ffprobe. Your Mac can reach the clips and measure them, so this
script runs there, then you commit the result and the posting routine picks it up.

REQUIREMENTS (one-time):
  - Python 3 (already on macOS)
  - ffprobe:  brew install ffmpeg      (installs ffprobe too)

RUN (from the repo root):
  python3 posting/measure_food_durations.py

WHAT IT DOES:
  - Reads manifests.food_review.clips[].url from posting/config.json
  - ffprobes each clip's real duration
  - Writes eligibility.duration_sec on each clip
  - Sets cr_eligible = True  ONLY if duration >= 65.0s   (1:05 or longer)
    (also keeps the existing original/watermark_free flags in mind)
  - Prints a summary: how many pass, how many are too short (with their names)

Then:  git add posting/config.json && git commit -m "Measure food clip durations, gate >=65s" && git push
(or just tell me it's done and I'll verify.)
"""
import json, subprocess, sys, os

MIN_SECONDS = 65.0
CFG = os.path.join(os.path.dirname(__file__), "config.json")

def ffprobe_duration(url):
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", url],
            capture_output=True, text=True, timeout=120)
        s = out.stdout.strip()
        return float(s) if s else None
    except FileNotFoundError:
        print("ERROR: ffprobe not found. Install it with:  brew install ffmpeg")
        sys.exit(1)
    except Exception as e:
        print(f"  ! ffprobe failed: {e}")
        return None

def main():
    d = json.load(open(CFG))
    clips = d["manifests"]["food_review"]["clips"]
    passed, short, unknown = [], [], []
    for i, c in enumerate(clips):
        name = c.get("review_name") or c.get("title", "")[:40]
        dur = ffprobe_duration(c["url"])
        elig = c.setdefault("eligibility", {})
        if dur is None:
            elig["duration_sec"] = None
            elig["cr_eligible"] = False
            unknown.append(name)
        else:
            elig["duration_sec"] = round(dur, 2)
            elig["min_length_over_60s"] = dur >= 60.0
            elig["cr_eligible"] = bool(dur >= MIN_SECONDS)
            elig["verified_by"] = "ffprobe"
            (passed if dur >= MIN_SECONDS else short).append(f"{name} ({dur:.1f}s)")
        print(f"[{i+1}/{len(clips)}] {name}: "
              f"{'?' if dur is None else f'{dur:.1f}s'} "
              f"-> {'OK' if elig['cr_eligible'] else 'EXCLUDED'}")

    json.dump(d, open(CFG, "w"), indent=2, ensure_ascii=False)
    print("\n==== SUMMARY ====")
    print(f"PASS (>= {MIN_SECONDS:.0f}s, will post): {len(passed)}")
    print(f"TOO SHORT (excluded): {len(short)}")
    for s in short:
        print(f"   - {s}")
    if unknown:
        print(f"COULD NOT MEASURE (excluded): {len(unknown)}")
        for u in unknown:
            print(f"   - {u}")
    print("\nUpdated posting/config.json. Commit & push, or tell Claude it's done.")

if __name__ == "__main__":
    main()

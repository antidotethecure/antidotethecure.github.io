"""One control point for every automated video post.

    python3 -m posting.cli status                 what is configured, per platform
    python3 -m posting.cli audit                  probe every clip, report resolution
    python3 -m posting.cli audit --manifest food_review --json out.json
    python3 -m posting.cli check <url> --platform tiktok
    python3 -m posting.cli set-quality --min 2160 raise the floor to 4K

`audit` is the important one. It probes every clip in every manifest and tells
you exactly what resolution you are actually publishing -- which is the question
that started all of this. It needs ffprobe and network access to the CDN, so run
it in an environment that has both.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from .gate import CONFIG_PATH, Probe, check, have_ffprobe, load_config, probe


def _save(cfg: dict[str, Any]) -> None:
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + "\n")


def cmd_status(args: argparse.Namespace) -> int:
    cfg = load_config()
    q = cfg["quality"]
    print("QUALITY POLICY (applies to every platform)")
    print(f"  minimum short side : {q['min_short_side']}px "
          f"({'4K' if q['min_short_side'] >= 2160 else '1080p'} in any orientation)")
    print(f"  preferred          : {q['preferred_short_side']}px")
    print(f"  on failure         : {q['on_failure'].upper()}"
          f"  (under-spec clips are never published)")
    print(f"  duration           : {q['min_duration_s']}-{q['max_duration_s']}s")
    print()
    print("PLATFORMS")
    for name, p in cfg["platforms"].items():
        state = "enabled" if p.get("enabled") else "DISABLED"
        floor = max(q["min_short_side"], p.get("min_short_side", 0))
        print(f"  {name:<16} {state:<9} {p.get('target_aspect','?'):<5} "
              f"floor {floor}px  via {p.get('transport','?')}")
        if p.get("notes"):
            print(f"      {p['notes']}")
    print()
    print("MANIFESTS")
    for name, m in cfg.get("manifests", {}).items():
        print(f"  {name:<18} {len(m.get('clips', [])):>3} clips -> "
              f"{', '.join(m.get('platforms', []))}")
        if m.get("source_trigger"):
            print(f"      from routine {m['source_trigger']}")
    if not have_ffprobe():
        print("\n  NOTE: ffprobe is not installed here, so `audit` cannot run.")
        print("        install with: apt-get update -y && apt-get install -y ffmpeg")
    return 0


def _all_clips(cfg: dict[str, Any], only: str | None) -> list[tuple[str, str, str]]:
    """(manifest, platform, url) for everything the gate would govern."""
    out = []
    for name, m in cfg.get("manifests", {}).items():
        if only and name != only:
            continue
        platforms = m.get("platforms") or ["tiktok"]
        for clip in m.get("clips", []):
            out.append((name, platforms[0], clip["url"]))
    return out


def cmd_audit(args: argparse.Namespace) -> int:
    cfg = load_config()
    clips = _all_clips(cfg, args.manifest)
    if not clips:
        print("no clips configured")
        return 1
    if not have_ffprobe():
        print("ffprobe is required for audit and is not installed.")
        print("  apt-get update -y && apt-get install -y ffmpeg")
        return 2

    print(f"Probing {len(clips)} clips (this reads headers only, not full "
          f"downloads)...\n")
    probes: dict[str, Probe] = {}
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        urls = [c[2] for c in clips]
        for url, p in zip(urls, pool.map(lambda u: probe(u, args.timeout), urls)):
            probes[url] = p

    results = []
    labels: Counter[str] = Counter()
    failed_probe = 0
    for manifest, platform, url in clips:
        p = probes[url]
        v = check(url, platform, cfg, probed=p)
        results.append((manifest, v))
        if not p.ok:
            failed_probe += 1
            labels["unreadable"] += 1
        else:
            labels[p.label] += 1
        if args.verbose or not v.passed:
            print(v.render())

    passed = sum(1 for _, v in results if v.passed)
    refused = len(results) - passed
    print("\n" + "=" * 72)
    print(f"RESULT: {passed} publishable, {refused} REFUSED by the quality gate")
    print("=" * 72)
    print("\nResolution distribution (by short side):")
    order = ["4K", "1440p", "1080p", "720p", "480p", "360p", "unreadable"]
    for label in order + [k for k in labels if k not in order]:
        if labels.get(label):
            bar = "#" * min(40, labels[label])
            print(f"  {label:<11} {labels[label]:>4}  {bar}")
    if failed_probe:
        print(f"\n  {failed_probe} clip(s) could not be read. Unreadable is "
              f"treated as a refusal: we never publish what we cannot verify.")

    by_manifest: dict[str, list[bool]] = {}
    for manifest, v in results:
        by_manifest.setdefault(manifest, []).append(v.passed)
    print("\nPer manifest:")
    for name, oks in by_manifest.items():
        print(f"  {name:<18} {sum(oks):>3}/{len(oks):<3} pass")

    if args.json:
        payload = [{
            "manifest": m, "platform": v.platform, "url": v.probe.source,
            "passed": v.passed, "width": v.probe.width, "height": v.probe.height,
            "label": v.probe.label, "aspect": v.probe.aspect(),
            "duration_s": v.probe.duration_s, "failures": v.failures,
            "warnings": v.warnings,
        } for m, v in results]
        Path(args.json).write_text(json.dumps(payload, indent=2))
        print(f"\nfull report written to {args.json}")

    if refused:
        print(f"\nNothing will publish until these are fixed. Re-generate the "
              f"refused clips at 9:16 and >= {cfg['quality']['min_short_side']}px, "
              f"or raise them with an upscaler, then re-run this audit.")
    return 0 if refused == 0 else 1


def cmd_check(args: argparse.Namespace) -> int:
    v = check(args.url, args.platform)
    print(v.render())
    return 0 if v.passed else 1


def cmd_set_quality(args: argparse.Namespace) -> int:
    cfg = load_config()
    if args.min is not None:
        cfg["quality"]["min_short_side"] = args.min
        print(f"minimum short side -> {args.min}px "
              f"({'4K' if args.min >= 2160 else '1080p' if args.min >= 1080 else 'LOW'})")
    if args.preferred is not None:
        cfg["quality"]["preferred_short_side"] = args.preferred
    _save(cfg)
    print(f"saved to {CONFIG_PATH}")
    return 0


def cmd_platform(args: argparse.Namespace) -> int:
    cfg = load_config()
    p = cfg["platforms"].get(args.name)
    if p is None:
        print(f"unknown platform '{args.name}'. "
              f"Known: {', '.join(cfg['platforms'])}")
        return 1
    if args.enable:
        p["enabled"] = True
    if args.disable:
        p["enabled"] = False
    _save(cfg)
    print(f"{args.name}: {'enabled' if p['enabled'] else 'DISABLED'}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        prog="posting",
        description="Single control point for automated video posting. "
                    "Enforces a minimum resolution on every platform.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("status", help="show policy, platforms and manifests"
                   ).set_defaults(func=cmd_status)

    a = sub.add_parser("audit", help="probe every clip and report resolution")
    a.add_argument("--manifest")
    a.add_argument("--json", help="write a full JSON report here")
    a.add_argument("--jobs", type=int, default=8)
    a.add_argument("--timeout", type=int, default=90)
    a.add_argument("-v", "--verbose", action="store_true",
                   help="also print clips that pass")
    a.set_defaults(func=cmd_audit)

    c = sub.add_parser("check", help="check one clip")
    c.add_argument("url")
    c.add_argument("--platform", default="tiktok")
    c.set_defaults(func=cmd_check)

    q = sub.add_parser("set-quality", help="change the resolution floor")
    q.add_argument("--min", type=int, help="1080 for 1080p, 2160 for 4K")
    q.add_argument("--preferred", type=int)
    q.set_defaults(func=cmd_set_quality)

    pl = sub.add_parser("platform", help="enable or disable a platform")
    pl.add_argument("name")
    pl.add_argument("--enable", action="store_true")
    pl.add_argument("--disable", action="store_true")
    pl.set_defaults(func=cmd_platform)
    return ap


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())

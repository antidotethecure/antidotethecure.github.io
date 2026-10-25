#!/usr/bin/env python3
"""pixel_gate.py: no customer-facing page may load a third-party tracker before consent (rule 2026-10-24).

California CIPA s 631 (wiretapping) gives a private right of action with statutory damages of $5,000 per
violation under s 637.2, and the whole plaintiff industry is built on one fact pattern: a page fires a
third-party beacon the moment it opens, before the visitor agrees to anything. SB 690 (signed 2026-09-30)
narrowed only the s 638.51 pen-register theory - s 631 is untouched, so this gate still matters.

Having a cookie banner is NOT the protection. Loading nothing until the visitor opts in is the protection.

  from pixel_gate import check, scan
  check(path)      -> {"pass", "path", "hits", "consent", "reason"}
  scan(root)       -> [check(p) for every .html/.js under root]   (skips .git and .claude/worktrees)
  pixel_gate.py PATH...    -> report (exit 1 if any fail)
  pixel_gate.py --selftest -> built-in assertions
"""
import re, sys
from pathlib import Path

# Third-party beacons. The value is what to call it in the report.
TRACKERS = {
    r"googletagmanager\.com|google-analytics\.com|\bgtag\s*\(": "Google Analytics / GTM",
    r"connect\.facebook\.net|fbevents\.js|\bfbq\s*\(": "Meta Pixel",
    r"analytics\.tiktok\.com|ttq\.(?:load|track)": "TikTok Pixel",
    r"\bposthog\b|us-assets\.i\.posthog\.com": "PostHog (analytics + session replay)",
    r"static\.hotjar\.com|\bhj\s*\(": "Hotjar (session replay)",
    r"clarity\.ms": "Microsoft Clarity (session replay)",
    r"fullstory\.com|\bFS\.identify": "FullStory (session replay)",
    r"mouseflow\.com|luckyorange\.com|smartlook\.com": "session replay vendor",
    r"cdn\.segment\.com|api\.mixpanel\.com|cdn\.amplitude\.com": "product analytics vendor",
    r"snap\.licdn\.com|px\.ads\.linkedin\.com": "LinkedIn Insight",
    r"sc-static\.net|tr\.snapchat\.com": "Snap Pixel",
    r"bat\.bing\.com": "Microsoft UET",
    r"widget\.intercom\.io|js\.driftt\.com|client\.crisp\.chat|embed\.tawk\.to": "third-party chat widget",
}

# A real gate: nothing is injected until the visitor opts in. A banner alone is not one, so the marker
# has to show the *load* is conditional, not just that a banner exists somewhere on the page.
CONSENT_MARKERS = [
    r"consent\s*(?:===?|!==?)\s*[\"']granted",
    r"if\s*\(\s*(?:has)?[Cc]onsent",
    r"localStorage\.getItem\(\s*[\"'][^\"']*consent",
    r"gtag\s*\(\s*[\"']consent[\"']\s*,\s*[\"']default[\"']",
    r"data-cookieconsent\s*=",
    r"window\.__CONSENT__",
]

SKIP_DIRS = {".git", "node_modules", "vendor", "dist", "build"}
# A tracker added to a React/Svelte/Astro app is the same violation as one in a <script> tag.
SCANNED = {".html", ".htm", ".js", ".mjs", ".jsx", ".ts", ".tsx", ".vue", ".svelte", ".astro"}


def _skip(p: Path) -> bool:
    parts = p.parts
    return any(d in SKIP_DIRS for d in parts) or ".claude/worktrees" in p.as_posix()


def check(path):
    """One file. `hits` is [(tracker_name, line_no)]; a file with hits and no consent marker fails."""
    p = Path(path)
    try:
        text = p.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        return {"pass": False, "path": str(p), "hits": [], "consent": False,
                "reason": f"could not read ({e}), holding"}

    lines = text.splitlines()
    hits = []
    for pat, name in TRACKERS.items():
        rx = re.compile(pat)
        for i, line in enumerate(lines, 1):
            if rx.search(line):
                hits.append((name, i))
                break          # one hit per tracker is enough to fail; keep the report short

    consent = any(re.search(m, text) for m in CONSENT_MARKERS)
    if not hits:
        return {"pass": True, "path": str(p), "hits": [], "consent": consent, "reason": "no third-party beacon"}
    if consent:
        return {"pass": True, "path": str(p), "hits": hits, "consent": True,
                "reason": "beacon present but load is gated on consent - read the gate by hand before shipping"}
    return {"pass": False, "path": str(p), "hits": hits, "consent": False,
            "reason": "third-party beacon loads with no consent gate (CIPA s 631 fact pattern)"}


def scan(root):
    root = Path(root)
    files = [root] if root.is_file() else sorted(
        f for f in root.rglob("*") if f.suffix in SCANNED and not _skip(f.relative_to(root))
    )
    return [check(f) for f in files]


def _selftest():
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        d = Path(d)
        (d / "clean.html").write_text("<html><body>hi</body></html>")
        (d / "bad.html").write_text('<head><script src="../ph.js"></script></head>\n<script>posthog.init()</script>')
        (d / "gated.html").write_text('<script>if (hasConsent) { posthog.init(); }</script>')
        (d / "meta.html").write_text("<script>fbq('init','123');</script>")

        r = {Path(x["path"]).name: x for x in scan(d)}
        assert r["clean.html"]["pass"], "clean page must pass"
        assert not r["bad.html"]["pass"], "ungated PostHog must fail"
        assert r["bad.html"]["hits"][0][0].startswith("PostHog"), r["bad.html"]["hits"]
        assert r["gated.html"]["pass"] and r["gated.html"]["consent"], "consent-gated must pass"
        assert not r["meta.html"]["pass"], "ungated Meta Pixel must fail"
        assert r["meta.html"]["hits"][0][0] == "Meta Pixel", r["meta.html"]["hits"]
        # a worktree copy must not be scanned twice
        wt = d / ".claude" / "worktrees" / "x"
        wt.mkdir(parents=True)
        (wt / "bad.html").write_text("<script>fbq('init','123');</script>")
        assert not any(".claude/worktrees" in x["path"] for x in scan(d)), "worktrees must be skipped"
    print("pixel_gate selftest: 7 assertions OK")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--selftest":
        _selftest(); sys.exit(0)
    if not args:
        print(__doc__); sys.exit(2)

    bad = 0
    for target in args:
        for r in scan(target):
            if r["pass"] and not r["hits"]:
                continue
            flag = "WARN" if r["pass"] else "FAIL"
            if not r["pass"]:
                bad += 1
            print(f"{flag}  {r['path']}")
            for name, ln in r["hits"]:
                print(f"        line {ln}: {name}")
            print(f"        {r['reason']}")
    print(f"\n{'BLOCKED: ' + str(bad) + ' file(s) load a tracker before consent' if bad else 'PASS: no ungated third-party beacons'}")
    sys.exit(1 if bad else 0)

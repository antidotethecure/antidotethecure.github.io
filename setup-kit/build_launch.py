#!/usr/bin/env python3
"""One-link launch checklist for a business owner (any number of restaurants).

    python3 setup-kit/build_launch.py <owner-slug>        # uses setup-kit/owners/<owner-slug>.json
    python3 setup-kit/build_launch.py --all

owners/<owner-slug>.json: {"owner": "Christian", "contacts": ["Sami"], "restaurants": ["melody-lax", "nalu-vida"],
                           "tags": {"melody-lax": "LAX"}}   # restaurant slugs = setup-kit/configs/<slug>.json
Writes /launch/<owner-slug>/index.html. Each restaurant needs its setup page built first (build.py)."""
import json, sys, html
from pathlib import Path
HERE = Path(__file__).resolve().parent; ROOT = HERE.parent

def build(owner_slug):
    o = json.loads((HERE / "owners" / f"{owner_slug}.json").read_text())
    rest = []
    for slug in o["restaurants"]:
        c = json.loads((HERE / "configs" / f"{slug}.json").read_text()); b = c.get("brand", {})
        out = c.get("out", f"/{slug}/setup/").strip("/") + "/"
        rest.append({"key": slug.replace("-", "_"), "name": html.escape(c["name"]), "short": html.escape(c.get("short") or c["name"]), "tag": (o.get("tags") or {}).get(slug, ""),
                     "setup": out, "color": b.get("badgeBg") or b.get("accent") or "#1e6fe0", "ink": b.get("badgeInk") or b.get("accentInk") or "#fff",
                     "storageKey": c.get("storageKey") or f"{slug}-setup-v1",
                     "logo": c.get("launchLogo") or (c.get("logo") or {}).get("img"), "ambient": c.get("ambient", []), "brand": b})
    names = [r["name"] for r in rest]
    names_html = "<b>" + "</b> and <b>".join(names) + "</b>" if len(names) <= 2 else "<b>" + "</b>, <b>".join(names[:-1]) + "</b> and <b>" + names[-1] + "</b>"
    t = (HERE / "launch_template.html").read_text()
    b0 = rest[0]["brand"]   # the page dresses in the (first) restaurant's colors
    theme = ":root{" + ";".join(f"--{k}:{v}" for k, v in (("bg", b0.get("bg")), ("page", b0.get("page")), ("card", b0.get("card")), ("edge", b0.get("edge")), ("ink", b0.get("ink")),
              ("dim", b0.get("dim")), ("gold", b0.get("accent"))) if v) + "}" + (f"html,body{{font-family:{b0['body']}}}h1,h2{{font-family:{b0['display']}}}" if b0.get("body") and b0.get("display") else "")
    fonts = b0.get("fonts")
    logos = "".join(f'<img class="rl" src="../../{r["logo"]}" alt="{r["name"]}">' for r in rest if r.get("logo")) or "".join(f'<b>{r["name"]}</b>' for r in rest)
    amb = []
    for r in rest:
        for a in r.get("ambient", []):
            if a not in amb: amb.append(a)
    for r in rest: r.pop("brand", None)
    t = (t.replace("__RESTAURANTS__", json.dumps(rest)).replace("__OWNER__", html.escape(o["owner"])).replace("__LAUNCH_NAMES__", names_html)
          .replace("__KEY__", f"{owner_slug}-launch-v1").replace("__CONTACTS__", json.dumps(o.get("contacts", [])))
          .replace("__THEME__", theme).replace("__LOGOS__", logos).replace("__AMBIENT__", json.dumps(amb)))
    if fonts: t = t.replace("</title>", f'</title><link href="{fonts}" rel="stylesheet">', 1)
    dst = ROOT / "launch" / owner_slug / "index.html"; dst.parent.mkdir(parents=True, exist_ok=True); dst.write_text(t)
    print(f"{owner_slug:12s} -> /launch/{owner_slug}/  ({', '.join(r['short'] for r in rest)})")

if __name__ == "__main__":
    args = sys.argv[1:]
    for s in ([p.stem for p in (HERE / "owners").glob("*.json")] if args == ["--all"] else args): build(s)

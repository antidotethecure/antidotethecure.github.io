#!/usr/bin/env python3
"""One-link launch checklist for a business owner (any number of restaurants).

    python3 setup-kit/build_launch.py <owner-slug>        # uses setup-kit/owners/<owner-slug>.json
    python3 setup-kit/build_launch.py --all

owners/<owner-slug>.json: {"owner": "Christian", "contacts": ["Sami"], "restaurants": ["melody-lax", "nalu-vida"],
                           "tags": {"melody-lax": "LAX"}}   # restaurant slugs = setup-kit/configs/<slug>.json
Writes /onboarding/<owner-slug>/index.html ("<Owner>'s onboarding") plus redirects at /launch/<owner-slug>/ and /launch/<alias>/ for older links. Each restaurant needs its setup page built first (build.py)."""
import json, sys, html, re, subprocess
from pathlib import Path
HERE = Path(__file__).resolve().parent; ROOT = HERE.parent
ONBOARD = Path.home() / "command-center/clients/onboarding/onboard.py"

def status():
    """readiness per restaurant from the onboarding tracker (our build checks + owner sign-offs); {} if unavailable"""
    try: return json.loads(subprocess.run([sys.executable, str(ONBOARD), "json"], capture_output=True, text=True, timeout=120).stdout)
    except Exception: return {}

def price(it):   # first field that looks like a price ("12", 11.99, "$9", "MP")
    for v in it[1:]:
        if isinstance(v, (int, float)) or re.fullmatch(r"\$?\d+(\.\d\d?)?|MP", str(v).strip()): return str(v)
    return ""

def menu(demo):
    """[[category, name, price], ...] from the demo app: menu.json, or the MENU / FOOD + DRINKS arrays in its page"""
    d = ROOT / "demo" / demo
    if (d / "menu.json").exists():
        m = json.loads((d / "menu.json").read_text())
        return [[r[0], r[2], str(r[3])] for k in m for r in m[k]]
    src = (d / "index.html").read_text() if (d / "index.html").exists() else ""
    js = []
    for var in ("MENU", "FOOD", "DRINKS"):
        mm = re.search(r"(?:var\s+)?\b" + var + r"\s*=\s*\[", src)
        if not mm: continue
        i, depth = mm.end() - 1, 0
        for j in range(i, len(src)):
            depth += {"[": 1, "]": -1}.get(src[j], 0)
            if depth == 0: js.append(f"out.{var}={src[i:j + 1]};"); break
    if not js: return []
    try:
        r = subprocess.run(["node", "-e", "var vm=require('vm'),out={};vm.runInNewContext(" + json.dumps("".join(js)) + ",{out:out});console.log(JSON.stringify(out))"],
                           capture_output=True, text=True, timeout=20)
        o = json.loads(r.stdout)
    except Exception: return []
    rows = []
    for var in ("MENU", "FOOD"):
        for c in o.get(var, []):
            for it in c.get("items", []): rows.append([c.get("name", ""), str(it[0]), price(it)])
    for it in o.get("DRINKS", []): rows.append(["Drinks", str(it[0]), price(it)])
    return rows

AGENTS = {   # AI add-on pricing shown to owners; override per owner with "aiAgents": {"call": {...}, "text": {...}}
    "call": {"name": "AI call agent", "price": 99, "included": 750, "unit": "minutes", "over": 0.15, "about": "about 17 calls a day",
             "does": "Answers your phone when nobody can, 24/7: hours, menu, specials, parking, the app. It takes messages and texts you the caller's name and number. It never takes payments or confirms reservations.",
             "parts": [["AI voice, up to 750 minutes (ElevenLabs, 8¢ a minute)", 60], ["The AI brain that understands callers", 7],
                       ["Phone number + incoming call minutes (Twilio)", 8], ["Setup on your menu + specials, weekly call reviews, updates", 24]]},
    "text": {"name": "AI text agent", "price": 49, "included": 1000, "unit": "texts", "over": 0.03, "about": "replies and automatic texts combined",
             "does": "Texts guests back 24/7 (hours, menu, specials, the app), sends a text when a call is missed, and sends the reward, raffle, winner, birthday and come-back texts you approve.",
             "parts": [["Up to 1,000 texts (carrier + Twilio, about 1.5¢ each)", 15], ["The AI that writes the replies", 4],
                       ["Text number + carrier registration (required to text customers)", 6], ["Setup, message templates, monitoring, updates", 24]]},
    "compare": "A part-time host just to answer phones costs about $2,500+ a month. Answering services charge about $1–2 per minute."}

def agents(o):
    a = json.loads(json.dumps(AGENTS)); ov = o.get("aiAgents") or {}
    for k in ("call", "text"): a[k].update(ov.get(k) or {})
    if "compare" in ov: a["compare"] = ov["compare"]
    return a

def value_card(owner_slug, o):
    """'What all of this would cost elsewhere' card -> /value/?o=<owner>. Only for owners listed in value/value-data.js ("value": true in owners/<slug>.json)."""
    if not o.get("value"): return ""
    return (f'<div class="step" style="border-color:var(--gold)"><div class="num" style="background:var(--gold);color:#241a00">$</div><div>'
            f'<h3>💡 What all of this would cost elsewhere</h3><p>Every tool in your package, what other companies charge for it on its own, and your price next to it.</p>'
            f'<a class="go" style="background:var(--gold);color:#241a00" href="../../value/?o={owner_slug}">See the comparison →</a></div></div>\n')

def build(owner_slug):
    o = json.loads((HERE / "owners" / f"{owner_slug}.json").read_text())
    rest = []; st = status()
    for slug in o["restaurants"]:
        c = json.loads((HERE / "configs" / f"{slug}.json").read_text()); b = c.get("brand", {})
        out = c.get("out", f"/{slug}/setup/").strip("/") + "/"
        rest.append({"key": slug.replace("-", "_"), "name": html.escape(c["name"]), "short": html.escape(c.get("short") or c["name"]), "tag": (o.get("tags") or {}).get(slug, ""),
                     "setup": out, "color": b.get("badgeBg") or b.get("accent") or "#1e6fe0", "ink": b.get("badgeInk") or b.get("accentInk") or "#fff",
                     "storageKey": c.get("storageKey") or f"{slug}-setup-v1",
                     "logo": c.get("launchLogo") or (c.get("logo") or {}).get("img"), "ambient": c.get("ambient", []), "brand": b,
                     "status": st.get(slug), "menu": menu(c.get("demo") or slug)})
    names = [r["name"] for r in rest]
    names_html = "<b>" + "</b> and <b>".join(names) + "</b>" if len(names) <= 2 else "<b>" + "</b>, <b>".join(names[:-1]) + "</b> and <b>" + names[-1] + "</b>"
    t = (HERE / "launch_template.html").read_text()
    b0 = rest[0]["brand"]   # the page dresses in the (first) restaurant's colors
    tv = dict((k, v) for k, v in (("bg", b0.get("bg")), ("page", b0.get("page")), ("card", b0.get("card")), ("edge", b0.get("edge")), ("ink", b0.get("ink")),
              ("dim", b0.get("dim")), ("gold", b0.get("accent"))) if v)
    tv.update(o.get("theme") or {})   # owner override, e.g. a dark version of a light brand so text stays readable
    theme = ":root{" + ";".join(f"--{k}:{v}" for k, v in tv.items()) + "}" + (f"html,body{{font-family:{b0['body']}}}h1,h2{{font-family:{b0['display']}}}" if b0.get("body") and b0.get("display") else "")
    fonts = b0.get("fonts")
    logos = "".join(f'<img class="rl" src="../../{r["logo"]}" alt="{r["name"]}">' for r in rest if r.get("logo")) or "".join(f'<b>{r["name"]}</b>' for r in rest)
    amb = []
    for r in rest:
        for a in r.get("ambient", []):
            if a not in amb: amb.append(a)
    for r in rest: r.pop("brand", None)
    t = (t.replace("__RESTAURANTS__", json.dumps(rest)).replace("__OWNER__", html.escape(o["owner"])).replace("__LAUNCH_NAMES__", names_html)
          .replace("__KEY__", f"{owner_slug}-launch-v1").replace("__CONTACTS__", json.dumps(o.get("contacts", [])))
          .replace("__AIAGENTS__", json.dumps(agents(o))).replace("__VALUECARD__", value_card(owner_slug, o))
          .replace("__THEME__", theme).replace("__LOGOS__", logos).replace("__AMBIENT__", json.dumps(amb)))
    if fonts: t = t.replace("</title>", f'</title><link href="{fonts}" rel="stylesheet">', 1)
    dst = ROOT / "onboarding" / owner_slug / "index.html"; dst.parent.mkdir(parents=True, exist_ok=True); dst.write_text(t)
    go = f"/onboarding/{owner_slug}/"
    redirect = f"""<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>{html.escape(o['owner'])}'s Onboarding</title>
<meta http-equiv="refresh" content="0;url={go}"><script>location.replace("{go}"+location.search+location.hash)</script><a href="{go}">Open {html.escape(o['owner'])}'s onboarding</a>"""
    for old in [owner_slug] + o.get("aliases", []):
        r = ROOT / "launch" / old / "index.html"; r.parent.mkdir(parents=True, exist_ok=True); r.write_text(redirect)
    print(f"{owner_slug:12s} -> {go}  ({', '.join(r['short'] for r in rest)})")

if __name__ == "__main__":
    args = sys.argv[1:]
    for s in ([p.stem for p in (HERE / "owners").glob("*.json")] if args == ["--all"] else args): build(s)

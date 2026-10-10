#!/usr/bin/env python3
"""Build every restaurant's owner setup page from setup-kit/configs/<slug>.json.

    python3 setup-kit/build.py            # build all configs
    python3 setup-kit/build.py nalu-vida  # build one

Writes <repo>/<config.out>/index.html (default <slug>/setup/index.html).
Menus are read live from each restaurant's demo files (see README), so
re-running picks up menu changes made there. Needs `node` on PATH only for
configs whose menu is a JS variable inside a demo page.
"""
import html
import json
import os
import re
import subprocess
import sys

KIT = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(KIT)
TEMPLATE = os.path.join(KIT, "template.html")

BRAND_DEFAULTS = {
    "page": None, "bg": "#111", "card": "#1b1b1b", "edge": "#333", "ink": "#f5f5f5", "dim": "#aaa",
    "accent": "#f2c14e", "accentBg": None, "accentInk": "#1a1200", "chip": "#242424", "tgOff": "#555",
    "ok": "#3ddc97", "h1": None, "h2": None, "noteBg": "#2a2414", "noteEdge": "#6b5a24", "noteInk": "#f3e6c0",
    "barBg": "rgba(17,17,17,.94)", "badgeBg": None, "badgeInk": None, "h1w": None, "h2w": None,
    "display": "system-ui,-apple-system,sans-serif", "body": "-apple-system,system-ui,sans-serif",
}

DEFAULT_PHONE = [
    ["k", "What time does the kitchen stop taking orders?", ["Same as closing", "15 min before close", "30 min before close"]],
    ["resv", "Reservations?", ["Walk-ins only", "Call us", "Big groups only, call"]],
    ["cater", "Catering or big party orders?", ["Yes, call a day ahead", "Yes, call 3 days ahead", "No catering"]],
    ["deliv", "Delivery?", ["DoorDash / Uber Eats", "Our own online ordering", "Pickup only"]],
    ["park", "Parking?", ["Free lot", "Street parking", "Paid lot nearby"]],
    ["dogs", "Dogs?", ["OK on the patio", "Service animals only"]],
]


def rel(path, out_dir):
    return os.path.relpath(os.path.join(ROOT, path), os.path.join(ROOT, out_dir)).replace(os.sep, "/")


def js_literal(src_path, var):
    """Evaluate `var NAME = <literal>` from a demo page with node, return it as Python data."""
    text = open(os.path.join(ROOT, src_path), encoding="utf-8").read()
    m = re.search(r"(?:var|let|const)\s+" + re.escape(var) + r"\s*=\s*", text) or re.search(re.escape(var) + r"\s*=\s*", text)
    if not m:
        raise SystemExit(f"{src_path}: no `{var} =` found")
    i = m.end()
    opener = text[i]
    closer = {"[": "]", "{": "}"}[opener]
    depth, j, quote = 0, i, None
    while j < len(text):
        c = text[j]
        if quote:
            if c == "\\":
                j += 2
                continue
            if c == quote:
                quote = None
        elif c in "\"'`":
            quote = c
        elif c == opener:
            depth += 1
        elif c == closer:
            depth -= 1
            if depth == 0:
                break
        j += 1
    lit = text[i:j + 1]
    js = "const vm=require('vm');let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{process.stdout.write(JSON.stringify(vm.runInNewContext('('+s+')')));});"
    out = subprocess.run(["node", "-e", js], input=lit, capture_output=True, text=True, check=True).stdout
    return json.loads(out)


PRICE_RE = re.compile(r"^\$?\s*(\d+(?:\.\d+)?)$")


def parse_price(x):
    """-> (price or None, is_market_price)"""
    if isinstance(x, (int, float)) and not isinstance(x, bool):
        return float(x), False
    if isinstance(x, str):
        s = x.strip()
        if s.upper() in ("MP", "MARKET", "MARKET PRICE"):
            return None, True
        m = PRICE_RE.match(s)
        if m:
            return float(m.group(1)), False
    return None, False


def item_from_array(arr):
    name = arr[0]
    for x in arr[1:]:
        p, mp = parse_price(x)
        if p is not None or mp:
            return [name, p, None, mp]
    return [name, None, None, False]


def load_menu(spec):
    """Normalize any supported menu source to [(section, [[name, price|None, webPrice|None, isMP]])]."""
    kind = spec.get("type")
    groups = []
    if kind == "inline":
        for g in spec["sections"]:
            items = []
            for it in g["items"]:
                name, price = it[0], it[1] if len(it) > 1 else None
                p, mp = parse_price(price) if price is not None else (None, False)
                web = it[2] if len(it) > 2 else None
                items.append([name, p, web, mp])
            groups.append((g["name"], items))
    elif kind == "rows-json":  # {"food":[[cat, slug, name, price, desc]], "drinks":[...]}
        data = json.load(open(os.path.join(ROOT, spec["file"]), encoding="utf-8"))
        for key in ("drinks", "food"):
            for row in data.get(key, []):
                p, mp = parse_price(row[3])
                name = row[0]
                if key == "drinks":
                    name = "__drinks__" + row[0]
                for g in groups:
                    if g[0] == name:
                        g[1].append([row[2], p, None, mp])
                        break
                else:
                    groups.append((name, [[row[2], p, None, mp]]))
    elif kind == "js":  # array of sections, or an object with .menu, inside a demo page
        data = js_literal(spec["file"], spec["var"])
        if isinstance(data, dict):
            data = data[spec.get("key", "menu")]
        for s in data:
            items = []
            for it in s.get("items") or []:
                items.append(item_from_array(it))
            if s.get("photo"):
                items.append(item_from_array(s["photo"]))
            for nm in s.get("list") or []:
                items.append([nm, None, None, False])
            groups.append((s.get("name") or s.get("section"), items))
    else:
        raise SystemExit(f"unknown menu type {kind!r}")

    drink_names = set(spec.get("drinkSections", []))
    menu = {"drinks": [], "food": []}
    for name, items in groups:
        seen, uniq = set(), []
        for it in items:
            if it[0] in seen:
                continue
            seen.add(it[0])
            uniq.append(it)
        if name.startswith("__drinks__"):
            menu["drinks"].append({"name": name[len("__drinks__"):], "items": uniq})
        elif name in drink_names:
            menu["drinks"].append({"name": name, "items": uniq})
        else:
            menu["food"].append({"name": name, "items": uniq})
    return menu


def logo_html(cfg, out_dir):
    lg = cfg.get("logo") or {}
    alt = html.escape(cfg["name"])
    if lg.get("img"):
        style = f' style="{html.escape(lg["boxStyle"])}"' if lg.get("boxStyle") else ""
        return f'<div class="logo"{style}><img src="{rel(lg["img"], out_dir)}" alt="{alt}"></div>'
    if lg.get("svgFrom"):
        text = open(os.path.join(ROOT, lg["svgFrom"]), encoding="utf-8").read()
        m = re.search(r'<svg[^>]*class="logo"[\s\S]*?</svg>', text)
        if not m:
            raise SystemExit(f'{lg["svgFrom"]}: no <svg class="logo"> found')
        return '<div class="logo">' + m.group(0).replace('class="logo" ', "", 1) + "</div>"
    if lg.get("html"):
        return '<div class="logo">' + lg["html"] + "</div>"
    return ""


def game_prizes(game):
    if game.get("prizesFrom"):
        src = game["prizesFrom"]
        live = js_literal(src["file"], src["var"])
        alts = game.get("alts", [])
        prizes = []
        for i, (pts, label) in enumerate(live):
            opts = [label] + [a for a in (alts[i] if i < len(alts) else []) if a != label]
            prizes.append([pts, opts])
        return prizes
    return game["prizes"]


def build(slug):
    cfg = json.load(open(os.path.join(KIT, "configs", slug + ".json"), encoding="utf-8"))
    out_dir = cfg.get("out", f"{slug}/setup")
    brand = dict(BRAND_DEFAULTS)
    brand.update(cfg.get("brand", {}))
    brand["h2"] = brand["h2"] or brand["accent"]

    page = dict(cfg)
    page.pop("brand", None)
    page.pop("logo", None)
    page["menu"] = load_menu(cfg["menu"])
    page["game"] = dict(cfg["game"], prizes=game_prizes(cfg["game"]))
    page["game"].pop("prizesFrom", None)
    page["game"].pop("alts", None)
    if "phone" not in cfg:
        page["phone"] = DEFAULT_PHONE

    css = []
    for k, v in brand.items():
        if k in ("fonts", "extraCss") or v is None:
            continue
        css.append(f"  --{k}:{v};")
    fonts = f'<link rel="preconnect" href="https://fonts.googleapis.com"><link href="{html.escape(brand["fonts"])}" rel="stylesheet">' if brand.get("fonts") else ""
    badge = f'<p><span class="badge">{html.escape(cfg["badge"])}</span></p>' if cfg.get("badge") else ""

    t = open(TEMPLATE, encoding="utf-8").read()
    data = json.dumps(page, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    repl = {
        "{{TITLE}}": html.escape((cfg.get("short") or cfg["name"]) + " Owner Setup"),
        "{{THEME}}": brand["bg"],
        "{{FONTS}}": fonts,
        "{{SLUG}}": slug,
        "{{CSSVARS}}": "\n".join(css),
        "{{EXTRACSS}}": brand.get("extraCss", ""),
        "{{LOGO}}": logo_html(cfg, out_dir),
        "{{BADGE}}": badge,
        "{{CONFIG_JSON}}": data,
    }
    for k, v in repl.items():
        t = t.replace(k, v)
    dest = os.path.join(ROOT, out_dir, "index.html")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, "w", encoding="utf-8").write(t)
    n_items = sum(len(g["items"]) for g in page["menu"]["drinks"] + page["menu"]["food"])
    n_noprice = sum(1 for g in page["menu"]["drinks"] + page["menu"]["food"] for i in g["items"] if i[1] is None)
    print(f"{slug:16} -> /{out_dir}/  ({n_items} menu items, {n_noprice} without a price)")


if __name__ == "__main__":
    slugs = sys.argv[1:] or sorted(f[:-5] for f in os.listdir(os.path.join(KIT, "configs")) if f.endswith(".json"))
    for s in slugs:
        build(s)

"""Section 30: the dashboard.

Rendered as a self-contained static HTML file under
ANTIDOTE_PREDICTION_OS/REPORTS/, deliberately NOT into the repository root.

That choice matters: this repository is published as a public GitHub Pages site.
Writing a dashboard containing your watchlist, thresholds, paper positions and
risk limits into the site root would publish your entire research posture to
anyone who guesses the URL. Keeping it under the data directory means it is
served to nobody unless you explicitly choose to move it.
"""

from __future__ import annotations

import html
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from . import DISCLAIMER, __version__
from .config import Config, DATA_ROOT
from .learning import LearningSystem
from .provenance import utcnow
from .risk import RiskManager
from .simulate import PaperPortfolio
from .storage import Store

CSS = """
:root{--bg:#f7f7f8;--panel:#fff;--ink:#16181d;--muted:#6b7280;--line:#e3e5e9;
--accent:#2d5bd7;--warn:#b45309;--bad:#b91c1c;--good:#15803d;--synth:#7c2d92;}
@media (prefers-color-scheme:dark){:root{--bg:#0f1115;--panel:#171a20;
--ink:#e8eaed;--muted:#9aa1ac;--line:#282d36;--accent:#7ea2ff;--warn:#fbbf24;
--bad:#f87171;--good:#4ade80;--synth:#d8b4fe;}}
*{box-sizing:border-box}
body{margin:0;padding:24px;background:var(--bg);color:var(--ink);
font:14px/1.5 ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif}
h1{font-size:20px;margin:0 0 2px} h2{font-size:14px;margin:0 0 10px;
text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.wrap{max-width:1400px;margin:0 auto}
.sub{color:var(--muted);font-size:12px;margin-bottom:18px}
.synth{background:var(--synth);color:#fff;padding:12px 16px;border-radius:8px;
margin-bottom:18px;font-weight:600}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(340px,1fr))}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;
padding:16px;overflow:hidden}
.card.wide{grid-column:1/-1}
table{width:100%;border-collapse:collapse;font-size:12.5px}
th{text-align:left;color:var(--muted);font-weight:600;padding:5px 8px;
border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:5px 8px;border-bottom:1px solid var(--line);vertical-align:top}
tr:last-child td{border-bottom:0}
.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.scroll{overflow-x:auto}
.pos{color:var(--good)} .neg{color:var(--bad)} .mut{color:var(--muted)}
.pill{display:inline-block;padding:1px 7px;border-radius:99px;font-size:11px;
font-weight:600}
.l1{background:#e5e7eb;color:#374151} .l2{background:#dbeafe;color:#1e40af}
.l3{background:#fef3c7;color:#92400e} .l4{background:#fed7aa;color:#9a3412}
.l5{background:#fecaca;color:#991b1b}
.kv{display:flex;justify-content:space-between;padding:3px 0;
border-bottom:1px solid var(--line)}
.kv:last-child{border-bottom:0}
.kv span:last-child{font-variant-numeric:tabular-nums;font-weight:600}
.note{color:var(--muted);font-size:11.5px;margin-top:10px;line-height:1.45}
.empty{color:var(--muted);font-style:italic;padding:8px 0}
footer{margin-top:22px;padding-top:14px;border-top:1px solid var(--line);
color:var(--muted);font-size:11.5px}
"""


def _e(v: Any) -> str:
    return html.escape(str(v)) if v is not None else "&mdash;"


def _num(v: Any, spec: str = ",.0f", dash: str = "&mdash;") -> str:
    if v is None:
        return dash
    try:
        return format(float(v), spec)
    except (TypeError, ValueError):
        return _e(v)


def _signed(v: Any, spec: str = "+,.0f") -> str:
    if v is None:
        return "&mdash;"
    cls = "pos" if float(v) > 0 else ("neg" if float(v) < 0 else "mut")
    return f'<span class="{cls}">{format(float(v), spec)}</span>'


def _table(headers: list[str], rows: list[list[str]], *,
           numeric: set[int] | None = None, empty: str = "no data") -> str:
    if not rows:
        return f'<div class="empty">{html.escape(empty)}</div>'
    numeric = numeric or set()
    head = "".join(f"<th{' class=num' if i in numeric else ''}>{html.escape(h)}</th>"
                   for i, h in enumerate(headers))
    body = []
    for row in rows:
        cells = "".join(
            f"<td{' class=num' if i in numeric else ''}>{c}</td>"
            for i, c in enumerate(row)
        )
        body.append(f"<tr>{cells}</tr>")
    return (f'<div class="scroll"><table><thead><tr>{head}</tr></thead>'
            f'<tbody>{"".join(body)}</tbody></table></div>')


def build_dashboard(store: Store, config: Config, *, hours: float = 24.0
                    ) -> str:
    now = utcnow()
    since = now - timedelta(hours=hours)
    kind = store.dominant_source_kind()

    parts: list[str] = [
        "<title>ANTIDOTE Intelligence Dashboard</title>",
        f"<style>{CSS}</style>",
        '<div class="wrap">',
        "<h1>ANTIDOTE Prediction Market Intelligence OS</h1>",
        f'<div class="sub">v{__version__} &middot; generated '
        f'{now:%Y-%m-%d %H:%M UTC} &middot; window {hours:.0f}h &middot; '
        f'alert-only, no execution</div>',
    ]
    if not kind.is_real:
        parts.append(
            f'<div class="synth">NON-REAL DATA ({kind.value.upper()}) &mdash; '
            f'every figure below is fabricated test data. It describes no real '
            f'market, trader, trade or performance. Do not act on it.</div>'
        )

    parts.append('<div class="grid">')
    parts.append(_card_markets(store))
    parts.append(_card_watchlist(store))
    parts.append(_card_large_trades(store, since))
    parts.append(_card_alerts(store, since))
    parts.append(_card_movements(store, since))
    parts.append(_card_paper(store, config))
    parts.append(_card_risk(store, config))
    parts.append(_card_signal_quality(store, config))
    parts.append(_card_backtests(store))
    parts.append(_card_sources(store))
    parts.append("</div>")

    parts.append(
        f"<footer>{html.escape(DISCLAIMER)}<br><br>"
        f"This file is written under ANTIDOTE_PREDICTION_OS/REPORTS/ and is not "
        f"part of the published GitHub Pages site. Moving it into the repository "
        f"root would publish your watchlist, thresholds and positions publicly."
        f"</footer></div>"
    )
    return "\n".join(parts)


def _card_markets(store: Store) -> str:
    rows = store.conn.execute(
        """SELECT m.id, m.question, m.category, m.status, m.close_time,
                  (SELECT price FROM market_snapshots s WHERE s.market_id=m.id
                   AND s.price IS NOT NULL ORDER BY s.ts DESC LIMIT 1) AS price,
                  (SELECT liquidity FROM market_snapshots s WHERE s.market_id=m.id
                   AND s.liquidity IS NOT NULL ORDER BY s.ts DESC LIMIT 1) AS liq,
                  (SELECT volume FROM market_snapshots s WHERE s.market_id=m.id
                   AND s.volume IS NOT NULL ORDER BY s.ts DESC LIMIT 1) AS vol
           FROM markets m WHERE m.status='open'
           ORDER BY vol DESC NULLS LAST LIMIT 15"""
    ).fetchall()
    body = _table(
        ["market", "cat", "prob", "liquidity", "volume"],
        [[_e(r["question"][:58]), _e(r["category"] or "—"),
          _num(r["price"], ".1%"), _num(r["liq"]), _num(r["vol"])]
         for r in rows],
        numeric={2, 3, 4}, empty="no open markets indexed",
    )
    total = store.conn.execute("SELECT COUNT(*) n FROM markets").fetchone()["n"]
    return (f'<div class="card wide"><h2>Markets ({total} indexed)</h2>{body}'
            f'<div class="note">Top 15 open markets by observed volume.</div></div>')


def _card_watchlist(store: Store) -> str:
    rows = store.watchlist()
    body = _table(
        ["#", "trader", "why"],
        [[str(r["rank"]), _e(r["username"] or r["trader_id"][-16:]),
          _e((r["reason"] or "")[:70])] for r in rows],
        empty="watchlist empty — run `antidote rank`",
    )
    return (f'<div class="card"><h2>Top {len(rows)} Watchlist (§5)</h2>{body}'
            f'<div class="note">Rebuilt from current data on every run. '
            f'Membership is not a permanent designation, and survivorship bias '
            f'applies: only traders active in the window can appear.</div></div>')


def _card_large_trades(store: Store, since: datetime) -> str:
    rows = store.trades(since=since, limit=2000)
    rows = sorted(rows, key=lambda r: -(r["value"] or 0))[:12]
    out = []
    for r in rows:
        mk = store.get_market(r["market_id"])
        tr = store.get_trader(r["trader_id"]) if r["trader_id"] else None
        out.append([
            _e(r["ts"][11:19]),
            _e((mk["question"] if mk else r["market_id"])[:34]),
            _e(tr["username"] if tr and tr["username"] else "anonymous"),
            _e(f"{r['side'] or '?'} {r['outcome'] or '?'}"),
            _num(r["price"], ".3f"), _num(r["value"], ",.0f"),
        ])
    return (f'<div class="card wide"><h2>Largest Observed Trades (§6/§7)</h2>'
            f'{_table(["time", "market", "trader", "side", "price", "value $"], out, numeric={4, 5}, empty="no trades in window")}'
            f'<div class="note">Size alone does not indicate information. '
            f'Anonymous rows are platforms that do not publish counterparty '
            f'identity (all Kalshi prints).</div></div>')


def _card_alerts(store: Store, since: datetime) -> str:
    rows = store.alerts(since=since, min_level=1, limit=25)
    out = []
    for r in rows:
        mk = store.get_market(r["market_id"]) if r["market_id"] else None
        out.append([
            f'<span class="pill l{r["level"]}">L{r["level"]}</span>',
            _e(r["kind"]),
            _e((mk["question"] if mk else r["market_id"] or "—")[:36]),
            _num(r["confidence"], ".0f"),
            _e(r["ts"][11:19]),
        ])
    return (f'<div class="card wide"><h2>Active Alerts (§9)</h2>'
            f'{_table(["level", "kind", "market", "conf", "time"], out, numeric={3}, empty="no alerts in window")}'
            f'<div class="note">Levels: 1 information &middot; 2 watch &middot; '
            f'3 significant &middot; 4 high priority &middot; 5 critical. '
            f'No alert is a recommendation; every one terminates in human '
            f'review.</div></div>')


def _card_movements(store: Store, since: datetime) -> str:
    from .report import _biggest_moves
    moves = _biggest_moves(store, since, limit=10)
    out = [[_e(q[:44]), _num(p0, ".3f"), _num(p1, ".3f"),
            _signed(d * 100, "+.1f")] for _, q, d, p0, p1 in moves]
    return (f'<div class="card"><h2>Price Movements (§27)</h2>'
            f'{_table(["market", "from", "to", "Δ pts"], out, numeric={1, 2, 3}, empty="insufficient snapshot history")}'
            f'</div>')


def _card_paper(store: Store, config: Config) -> str:
    p = PaperPortfolio(store, config).mark_to_market()
    unreal = ("&mdash;" if p["unrealized_pnl"] is None
              else _signed(p["unrealized_pnl"], "+,.2f"))
    wr = "&mdash;" if p["win_rate"] is None else f"{p['win_rate']:.0%}"
    kv = "".join(f'<div class="kv"><span>{k}</span><span>{v}</span></div>'
                 for k, v in [
                     ("Open positions", p["open_positions"]),
                     ("Closed positions", p["closed_positions"]),
                     ("Open exposure", f"${p['open_exposure']:,.0f}"),
                     ("Realized P&amp;L", _signed(p["realized_pnl"], "+,.2f")),
                     ("Unrealized P&amp;L", unreal),
                     ("Total P&amp;L", _signed(p["total_pnl"], "+,.2f")),
                     ("Win rate", wr),
                     ("Max drawdown", f"${p['max_drawdown']:,.2f}"),
                     ("Bankroll", f"${p['bankroll']:,.0f}"),
                 ])
    return (f'<div class="card"><h2>Paper Portfolio (§13)</h2>{kv}'
            f'<div class="note">Simulated only. This system places no orders '
            f'and holds no exchange credentials.</div></div>')


def _card_risk(store: Store, config: Config) -> str:
    rm = RiskManager(store, config)
    r = config.risk
    events = rm.exposure_by_event("default")
    cap = r.bankroll * r.max_correlated_exposure_pct
    rows = [[_e(k[:34]), f"${v:,.0f}", f"{v / cap:.0%}"]
            for k, v in sorted(events.items(), key=lambda kv: -kv[1])[:6]]
    limits = "".join(f'<div class="kv"><span>{k}</span><span>{v}</span></div>'
                     for k, v in [
                         ("Max position", f"{r.max_position_pct:.1%} "
                                          f"(${r.bankroll * r.max_position_pct:,.0f})"),
                         ("Max daily exposure", f"{r.max_daily_exposure_pct:.0%}"),
                         ("Max per market", f"{r.max_market_exposure_pct:.0%}"),
                         ("Max correlated", f"{r.max_correlated_exposure_pct:.0%}"),
                         ("Max open positions", r.max_open_positions),
                         ("Daily loss stop", f"{r.max_daily_loss_pct:.0%}"),
                         ("Max drawdown", f"{r.max_drawdown_pct:.0%}"),
                     ])
    corr = _table(["event", "exposure", "% of cap"], rows, numeric={1, 2},
                  empty="no open correlated exposure")
    return (f'<div class="card"><h2>Risk Limits (§25/§26)</h2>{limits}'
            f'<div class="note" style="margin-bottom:6px">Correlated exposure '
            f'by underlying event:</div>{corr}'
            f'<div class="note">Position size derives from your bankroll rules, '
            f'never from another trader\'s size.</div></div>')


def _card_signal_quality(store: Store, config: Config) -> str:
    perf = LearningSystem(store, config).performance()
    overall = perf["overall"]
    hr = ("&mdash;" if overall["hit_rate"] is None
          else f"{overall['hit_rate']:.0%}")
    kv = "".join(f'<div class="kv"><span>{k}</span><span>{v}</span></div>'
                 for k, v in [
                     ("Alerts reviewed", perf["total_alerts_reviewed"]),
                     ("Scorable", perf["scorable"]),
                     ("Indeterminate", perf["indeterminate"]),
                     ("Overall hit rate", hr),
                     ("Sample reliable", "yes" if overall["reliable"] else "no"),
                 ])
    rows = [[_e(k), str(v["n"]),
             "&mdash;" if v["hit_rate"] is None else f"{v['hit_rate']:.0%}"]
            for k, v in perf["by_confidence_bucket"].items()]
    return (f'<div class="card"><h2>Signal Self-Assessment (§41)</h2>{kv}'
            f'<div class="note" style="margin-bottom:6px">Confidence bucket vs '
            f'observed hit rate:</div>'
            f'{_table(["bucket", "n", "hit rate"], rows, numeric={1, 2}, empty="no scored alerts yet")}'
            f'<div class="note">Hit rate measures whether the market moved the '
            f'way an alert leaned. It does not measure profitability after fees, '
            f'slippage and delay.</div></div>')


def _card_backtests(store: Store) -> str:
    rows = store.conn.execute(
        "SELECT * FROM backtests ORDER BY ts DESC LIMIT 8"
    ).fetchall()
    out = []
    for r in rows:
        res = json.loads(r["results"])
        oos = res.get("periods", {}).get("OUT-OF-SAMPLE", {})
        roi = oos.get("roi")
        out.append([
            _e(r["strategy"]), str(oos.get("n_trades", 0)),
            "&mdash;" if roi is None else _signed(roi * 100, "+.1f"),
            _e((res.get("verdict") or "")[:38]),
        ])
    return (f'<div class="card wide"><h2>Backtests (§21/§22) — out-of-sample</h2>'
            f'{_table(["strategy", "OOS trades", "OOS ROI %", "verdict"], out, numeric={1, 2}, empty="no backtests run")}'
            f'<div class="note">Only the out-of-sample period is shown. '
            f'Training-period returns are not evidence.</div></div>')


def _card_sources(store: Store) -> str:
    rows = store.conn.execute(
        "SELECT platform, kind, ok, records, detail, ts FROM ingest_log "
        "ORDER BY ts DESC LIMIT 8"
    ).fetchall()
    out = [[_e(r["platform"]),
            '<span class="pos">ok</span>' if r["ok"] else '<span class="neg">failed</span>',
            str(r["records"]), _e((r["detail"] or "")[:60]), _e(r["ts"][5:16])]
           for r in rows]
    return (f'<div class="card wide"><h2>Data Sources (§34)</h2>'
            f'{_table(["platform", "status", "records", "detail", "when"], out, numeric={2}, empty="no ingest runs recorded")}'
            f'</div>')


def write_dashboard(store: Store, config: Config, *, hours: float = 24.0,
                    path: Path | None = None) -> Path:
    out = path or (DATA_ROOT / "REPORTS" / "dashboard.html")
    out.parent.mkdir(parents=True, exist_ok=True)
    doc = (
        "<!doctype html>\n<html lang=\"en\">\n<head>\n"
        "<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n"
        "<meta name=\"robots\" content=\"noindex,nofollow\">\n"
        + build_dashboard(store, config, hours=hours)
        + "\n</body>\n</html>\n"
    )
    # The <title>/<style> emitted by build_dashboard belong in <head>; close it
    # before the body content begins.
    doc = doc.replace('<div class="wrap">', '</head>\n<body>\n<div class="wrap">', 1)
    out.write_text(doc)
    return out

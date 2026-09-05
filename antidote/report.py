"""Sections 31, 32, 33 and 38: profiles, resolution checks, daily report."""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any

from . import DISCLAIMER
from .config import Config, DATA_ROOT
from .provenance import EpistemicClass, SourceKind, utcnow
from .ranking import RankingEngine, describe_watchlist_entry
from .risk import CorrelationEngine, RiskManager
from .storage import Store, parse_ts
from .traders import TraderAnalytics, market_resolution

BANNER_SYNTHETIC = """
################################################################################
#  WARNING: THIS REPORT IS BUILT FROM NON-REAL DATA (fixture / synthetic).     #
#  It describes no actual market, trader, trade or performance. It exists to   #
#  exercise the system. Do not act on anything in it.                          #
################################################################################
""".rstrip()


def banner_for(store: Store) -> str:
    kind = store.dominant_source_kind()
    return "" if kind.is_real else BANNER_SYNTHETIC


# ------------------------------------------------------------ market profile

def resolution_check(store: Store, market_id: str) -> str:
    """Section 33. The headline is not the contract; the rules are."""
    row = store.get_market(market_id)
    if row is None:
        return f"No market {market_id}."

    criteria = (row["resolution_criteria"] or "").strip()
    close = parse_ts(row["close_time"])
    lines = [
        "RESOLUTION-RULE CHECK (§33)",
        f"  MARKET             : {row['question']}",
        f"  RESOLUTION SOURCE  : {row['resolution_source'] or 'NOT PUBLISHED'}",
        f"  RESOLUTION DATE    : {row['resolution_date'] or row['close_time'] or 'unknown'}",
        "  RESOLUTION CRITERIA:",
    ]
    if criteria:
        for line in criteria.splitlines():
            for chunk in _wrap(line.strip(), 72):
                lines.append(f"      {chunk}")
    else:
        lines.append("      *** NOT PUBLISHED IN THE INGESTED DATA ***")

    ambiguities = _ambiguities(row, criteria, close)
    lines.append("  POTENTIAL AMBIGUITIES:")
    lines += [f"      - {a}" for a in ambiguities] or ["      - none detected"]
    lines.append(
        f"  [{EpistemicClass.ANALYSIS.value}] Ambiguity detection is keyword-"
        f"based and shallow. Read the full rules before treating this market as "
        f"a trade opportunity. 'YES' may not mean what the headline implies."
    )
    return "\n".join(lines)


def _ambiguities(row: Any, criteria: str, close: datetime | None) -> list[str]:
    out: list[str] = []
    if not criteria:
        out.append("no resolution criteria text was ingested for this market")
    if not row["resolution_source"]:
        out.append("no resolution source named: who adjudicates is unclear")

    blob = f"{row['question']} {criteria}".lower()
    for term, why in (
        ("official", "depends on a source being deemed 'official'"),
        ("announce", "hinges on an announcement, whose timing may slip"),
        ("before", "date-boundary sensitive: check the timezone used"),
        ("by end of", "date-boundary sensitive: check the timezone used"),
        ("consecutive", "requires a run of events, easy to misread"),
        ("or more", "threshold phrasing: check inclusive vs exclusive"),
        ("at least", "threshold phrasing: check inclusive vs exclusive"),
        ("median", "statistic definition may differ between sources"),
        ("revised", "may resolve on revised rather than initial figures"),
        ("primary", "may resolve off a specific named source only"),
    ):
        if term in blob:
            out.append(why)

    if close and close < utcnow():
        out.append("close time is already in the past")
    if len(criteria) < 80 and criteria:
        out.append("criteria text is unusually short for a binding rule")
    return out


def market_profile(store: Store, market_id: str, config: Config) -> str:
    """Section 32."""
    row = store.get_market(market_id)
    if row is None:
        return f"No market {market_id}."
    snap = store.latest_snapshot(market_id)
    trades = store.trades(market_id=market_id, limit=500)
    largest = sorted(trades, key=lambda r: -(r["value"] or 0))[:5]
    watch = {w["trader_id"] for w in store.watchlist()}
    involved = {t["trader_id"] for t in trades
                if t["trader_id"] and t["trader_id"] in watch}
    corr = CorrelationEngine(store, config).correlated_with(market_id)

    def f(v: Any, spec: str = ",.2f") -> str:
        return "n/a" if v is None else format(v, spec)

    lines = [
        f"MARKET PROFILE (§32): {row['question']}",
        f"  id {market_id}   platform {row['platform']}   "
        f"category {row['category'] or 'unclassified'}   status {row['status']}",
        "",
        f"  CURRENT PRICE      : {f(snap['price'] if snap else None, '.4f')}",
        f"  IMPLIED PROBABILITY: {f(snap['implied_prob'] if snap else None, '.1%')}",
        f"  VOLUME             : {f(snap['volume'] if snap else None)}",
        f"  VOLUME 24H         : {f(snap['volume_24h'] if snap else None)}",
        f"  LIQUIDITY          : {f(snap['liquidity'] if snap else None)}",
        f"  OPEN INTEREST      : {f(snap['open_interest'] if snap else None)}",
        f"  SPREAD             : {f(snap['spread'] if snap else None, '.4f')}",
        f"  EXPIRATION         : {row['close_time'] or 'unknown'}",
        "",
        f"  RECENT TRADES      : {len(trades)} observed",
    ]
    for t in largest:
        lines.append(f"      ${t['value']:>12,.0f}  {t['side'] or '?':<5} "
                     f"{t['outcome'] or '?':<4} @ {t['price']:.4f}  {t['ts'][:19]}")
    lines.append(f"  WATCHED TRADERS INVOLVED: "
                 f"{len(involved)} ({', '.join(sorted(involved)) or 'none'})")
    if corr:
        lines.append(f"  CORRELATED MARKETS (§26): {len(corr)} share this event")
        for c in corr[:5]:
            lines.append(f"      - {c['question'][:66]}")

    news = store.conn.execute(
        "SELECT title, ts FROM news WHERE market_id = ? ORDER BY ts DESC LIMIT 5",
        (market_id,),
    ).fetchall()
    lines.append(f"  NEWS               : {len(news)} stored item(s)")
    for n in news:
        lines.append(f"      [{n['ts'][:16]}] {n['title'][:64]}")

    hist = store.snapshots(market_id, limit=10)
    lines.append("  PRICE HISTORY (latest observations):")
    for s in hist[:5]:
        lines.append(f"      {s['ts'][:19]}  {f(s['price'], '.4f')}")

    lines += ["", resolution_check(store, market_id)]
    return "\n".join(lines)


# ------------------------------------------------------------ trader profile

def trader_profile(store: Store, trader_id: str, config: Config,
                   window_days: int = 90) -> str:
    """Section 31."""
    row = store.get_trader(trader_id)
    if row is None:
        return f"No trader {trader_id}."
    analytics = TraderAnalytics(store)
    m = analytics.compute(trader_id, window_days=window_days)
    trades = store.trades(trader_id=trader_id, limit=500)

    by_market: dict[str, float] = {}
    for t in trades:
        by_market[t["market_id"]] = by_market.get(t["market_id"], 0.0) + (t["value"] or 0)
    top_markets = sorted(by_market.items(), key=lambda kv: -kv[1])[:5]

    def f(v: Any, spec: str = ",.2f") -> str:
        return "not calculable" if v is None else format(v, spec)

    lines = [
        f"TRADER PROFILE (§31): {row['username'] or trader_id}",
        f"  platform {row['platform']}   wallet {row['wallet'] or 'n/a'}",
        f"  window {window_days}d   first seen {row['first_seen'][:19]}",
        "",
        f"  OBSERVED TRADES    : {m.n_trades}",
        f"  TOTAL VOLUME       : {f(m.total_volume)}",
        f"  REALIZED PNL       : {f(m.realized_pnl)}",
        f"  UNREALIZED PNL     : {f(m.unrealized_pnl)}",
        f"  ROI                : {f(m.roi, '+.2%')}",
        f"  WIN RATE           : {f(m.win_rate, '.1%')} "
        f"over {m.n_closed_lots} closed lots",
        f"  AVG POSITION       : {f(m.avg_position_size)}",
        f"  AVG TRADE SIZE     : {f(m.avg_trade_size)}",
        f"  TYPICAL HOLD       : "
        f"{'n/a' if m.avg_hold_seconds is None else f'{m.avg_hold_seconds / 3600:.1f}h'}",
        f"  TRADE FREQUENCY    : {f(m.trade_frequency_per_day, '.2f')}/day "
        f"over {m.active_days} active days",
        f"  MAX DRAWDOWN       : {f(m.max_drawdown)}",
        f"  RISK-ADJUSTED      : {f(m.risk_adjusted, '.3f')}",
        f"  CONSISTENCY        : {f(m.consistency, '.0%')} of months profitable",
        f"  CONCENTRATION      : HHI {f(m.concentration_hhi, '.4f')} "
        f"across {m.markets_traded} markets",
        "",
        "  CATEGORY MIX:",
    ]
    for cat, val in list((m.categories or {}).items())[:6]:
        lines.append(f"      {cat:<18} ${val:>14,.0f}")

    lines.append("  MOST-TRADED MARKETS:")
    for mid, val in top_markets:
        mk = store.get_market(mid)
        lines.append(f"      ${val:>12,.0f}  {(mk['question'] if mk else mid)[:56]}")

    lines.append("  RECENT TRADES:")
    for t in trades[:8]:
        lines.append(f"      {t['ts'][:19]}  {t['side'] or '?':<5} "
                     f"{t['outcome'] or '?':<4} ${t['value'] or 0:>11,.0f} "
                     f"@ {t['price']:.4f}")

    open_lots = [t for t in trades if (t["side"] or "BUY").upper() in ("BUY", "B")]
    lines.append(f"  OPEN POSITIONS (publicly visible): {m.n_open_lots} lot(s)")

    lines.append("")
    lines.append(f"  [{EpistemicClass.ANALYSIS.value}] STRATEGY OBSERVATIONS:")
    for obs in _strategy_notes(m):
        lines.append(f"      - {obs}")
    for note in m.notes:
        lines.append(f"      - [caveat] {note}")
    lines.append(
        f"      - Past performance does not imply future performance. This "
        f"profile describes what was observed, not what will happen."
    )
    return "\n".join(lines)


def _strategy_notes(m: Any) -> list[str]:
    out: list[str] = []
    if m.avg_hold_seconds is not None:
        hours = m.avg_hold_seconds / 3600
        if hours < 6:
            out.append(f"very short holds ({hours:.1f}h avg): looks intraday")
        elif hours > 24 * 14:
            out.append(f"long holds ({hours / 24:.0f}d avg): looks position-taking")
    if m.concentration_hhi is not None:
        if m.concentration_hhi > 0.5:
            out.append(f"highly concentrated (HHI {m.concentration_hhi:.2f}): "
                       f"specialises in few categories")
        elif m.concentration_hhi < 0.2:
            out.append(f"broadly diversified (HHI {m.concentration_hhi:.2f})")
    if m.trade_frequency_per_day and m.trade_frequency_per_day > 5:
        out.append(f"high frequency ({m.trade_frequency_per_day:.1f} trades/day)")
    if m.win_rate is not None and m.roi is not None:
        if m.win_rate < 0.5 and m.roi > 0:
            out.append("wins less than half the time but is profitable: "
                       "consistent with taking longshots at good prices")
        elif m.win_rate > 0.7 and m.roi is not None and m.roi < 0.1:
            out.append("wins often for small gains: consistent with trading "
                       "heavy favourites")
    if not out:
        out.append("no distinctive pattern identifiable from observed data")
    return out


# -------------------------------------------------------------- daily report

def daily_report(store: Store, config: Config, *, hours: float = 24.0) -> str:
    """Section 38."""
    now = utcnow()
    since = now - timedelta(hours=hours)
    analytics = TraderAnalytics(store)
    ranker = RankingEngine(store, config)

    metrics = analytics.compute_all(90, min_trades=1)
    watchlist = store.watchlist()

    lines: list[str] = []
    banner = banner_for(store)
    if banner:
        lines.append(banner)
    lines += [
        "",
        "=" * 78,
        "ANTIDOTE DAILY MARKET INTELLIGENCE",
        f"generated {now:%Y-%m-%d %H:%M UTC}   window: last {hours:.0f}h",
        "=" * 78,
    ]

    # -- top traders
    lines += ["", "TOP TRADERS (§4 - multiple rankings; profit alone is not one)"]
    for method in ("risk_adjusted", "roi", "realized_pnl", "consistency"):
        ranked = ranker.rank(metrics, method, 90, limit=5)
        lines.append(f"\n  {method.upper()}")
        if not ranked:
            lines.append("      (no trader met the eligibility minimums)")
        for r in ranked:
            lines.append(f"      #{r.rank} {r.username or r.trader_id[-14:]:<24} "
                         f"score {r.score:>12,.3f}   {r.explain()[:60]}")

    # -- watchlist
    lines += ["", "-" * 78, f"TOP {len(watchlist)} WATCHLIST (§5 - dynamic)"]
    if not watchlist:
        lines.append("  (watchlist empty: run `antidote rank` to build it)")
    for w in watchlist:
        lines.append(f"  #{w['rank']:<3} {w['username'] or w['trader_id']:<32} "
                     f"{(w['reason'] or '')[:60]}")

    # -- biggest trades
    trades = store.trades(since=since, limit=2000)
    biggest = sorted(trades, key=lambda r: -(r["value"] or 0))[:10]
    lines += ["", "-" * 78, "BIGGEST TRADES"]
    if not biggest:
        lines.append("  (none observed in window)")
    for t in biggest:
        mk = store.get_market(t["market_id"])
        lines.append(
            f"  ${t['value'] or 0:>12,.0f}  {t['side'] or '?':<5}"
            f"{t['outcome'] or '?':<5} @ {t['price']:.3f}  "
            f"{(mk['question'] if mk else t['market_id'])[:44]}"
        )

    # -- market moves
    lines += ["", "-" * 78, "BIGGEST MARKET MOVES"]
    moves = _biggest_moves(store, since, limit=10)
    if not moves:
        lines.append("  (insufficient snapshot history in window)")
    for mid, question, delta, p0, p1 in moves:
        lines.append(f"  {delta:+.1%}  {p0:.3f} -> {p1:.3f}  {question[:52]}")

    # -- volume spikes
    lines += ["", "-" * 78, "LARGEST VOLUME SPIKES"]
    spikes = _volume_spikes(store, limit=8)
    if not spikes:
        lines.append("  (no spikes above threshold, or insufficient history)")
    for question, ratio in spikes:
        lines.append(f"  {ratio:>5.1f}x  {question[:64]}")

    # -- alerts, consensus, conflicts
    alerts = store.alerts(since=since, min_level=1, limit=200)
    consensus = [a for a in alerts if a["kind"] == "consensus"]
    conflicts = [a for a in alerts if a["kind"] == "conflict"]
    lines += ["", "-" * 78, "SMART-MONEY CONSENSUS (§28)"]
    if not consensus:
        lines.append("  (none in window)")
    for a in consensus[:5]:
        payload = json.loads(a["payload"])
        ctx = payload.get("context", {})
        mk = store.get_market(a["market_id"])
        lines.append(f"  {ctx.get('n_traders', '?')} traders, "
                     f"${ctx.get('combined_estimated_value', 0):,.0f} combined  "
                     f"{(mk['question'] if mk else a['market_id'])[:44]}")

    lines += ["", "CONFLICTING SMART-MONEY SIGNALS (§29)"]
    if not conflicts:
        lines.append("  (none in window)")
    for a in conflicts[:5]:
        mk = store.get_market(a["market_id"])
        lines.append(f"  {(mk['question'] if mk else a['market_id'])[:60]}")

    lines += ["", "-" * 78,
              f"ALERTS IN WINDOW: {len(alerts)}"]
    by_level: dict[int, int] = {}
    for a in alerts:
        by_level[a["level"]] = by_level.get(a["level"], 0) + 1
    for level in sorted(by_level, reverse=True):
        lines.append(f"  level {level}: {by_level[level]}")

    # -- news
    news = store.conn.execute(
        "SELECT title, source, ts FROM news WHERE ts >= ? ORDER BY ts DESC LIMIT 8",
        (since.isoformat(),),
    ).fetchall()
    lines += ["", "-" * 78, "IMPORTANT NEWS (§18)"]
    if not news:
        lines.append("  (no news provider configured, or no matching items. "
                     "This is not evidence that nothing happened.)")
    for n in news:
        lines.append(f"  [{n['ts'][:16]}] {n['title'][:62]}")

    # -- markets to watch
    lines += ["", "-" * 78, "MARKETS TO WATCH"]
    watch_markets = _markets_to_watch(store, config, limit=8)
    if not watch_markets:
        lines.append("  (none flagged)")
    for question, why in watch_markets:
        lines.append(f"  {question[:52]}\n      {why}")

    # -- paper trading
    from .simulate import PaperPortfolio
    paper = PaperPortfolio(store, config).mark_to_market()
    lines += ["", "-" * 78, "PAPER-TRADING PERFORMANCE (§13)"]
    unreal = ("n/a" if paper["unrealized_pnl"] is None
              else f"${paper['unrealized_pnl']:,.2f}")
    win_rate = ("n/a" if paper["win_rate"] is None
                else format(paper["win_rate"], ".0%"))
    lines += [
        f"  open {paper['open_positions']}  closed {paper['closed_positions']}  "
        f"exposure ${paper['open_exposure']:,.0f}",
        f"  realized ${paper['realized_pnl']:,.2f}   unrealized {unreal}",
        f"  total ${paper['total_pnl']:,.2f}   win rate {win_rate}   "
        f"max drawdown ${paper['max_drawdown']:,.2f}",
    ]
    if paper["unpriced_open_positions"]:
        lines.append(f"  ({paper['unpriced_open_positions']} open position(s) "
                     f"have no current mark; unrealized P&L is incomplete)")

    # -- risk
    rm = RiskManager(store, config)
    lines += ["", "-" * 78, "RISK WARNINGS (§25/§26)"]
    exposure = rm.exposure_by_event("default")
    cap = config.risk.bankroll * config.risk.max_correlated_exposure_pct
    flagged = [(k, v) for k, v in exposure.items() if v > cap * 0.5]
    if not flagged:
        lines.append("  no correlated-exposure concentrations above half the limit")
    for event, value in sorted(flagged, key=lambda kv: -kv[1]):
        lines.append(f"  event '{event}': ${value:,.0f} "
                     f"({value / cap:.0%} of correlated limit)")
    dd = rm.current_drawdown("default")
    if dd is not None:
        lines.append(f"  paper drawdown: ${dd:,.2f} "
                     f"(limit ${-config.risk.bankroll * config.risk.max_drawdown_pct:,.0f})")

    # -- learning
    from .learning import LearningSystem
    lines += ["", "-" * 78, "SIGNAL SELF-ASSESSMENT (§41)", ""]
    lines.append(LearningSystem(store, config).calibration())

    lines += ["", "=" * 78, DISCLAIMER, "=" * 78]
    if banner:
        lines.append(banner)
    return "\n".join(lines)


def _biggest_moves(store: Store, since: datetime, limit: int = 10
                   ) -> list[tuple[str, str, float, float, float]]:
    rows = store.conn.execute(
        """SELECT m.id, m.question,
                  (SELECT price FROM market_snapshots s1 WHERE s1.market_id=m.id
                   AND s1.price IS NOT NULL AND s1.ts >= ?
                   ORDER BY s1.ts ASC LIMIT 1) AS p0,
                  (SELECT price FROM market_snapshots s2 WHERE s2.market_id=m.id
                   AND s2.price IS NOT NULL ORDER BY s2.ts DESC LIMIT 1) AS p1
           FROM markets m WHERE m.status='open'""",
        (since.isoformat(),),
    ).fetchall()
    out = []
    for r in rows:
        if r["p0"] is None or r["p1"] is None:
            continue
        out.append((r["id"], r["question"], r["p1"] - r["p0"], r["p0"], r["p1"]))
    out.sort(key=lambda t: -abs(t[2]))
    return out[:limit]


def _volume_spikes(store: Store, limit: int = 8) -> list[tuple[str, float]]:
    import statistics as _st
    rows = store.conn.execute(
        "SELECT market_id, volume_24h FROM market_snapshots "
        "WHERE volume_24h IS NOT NULL ORDER BY market_id, ts"
    ).fetchall()
    series: dict[str, list[float]] = {}
    for r in rows:
        series.setdefault(r["market_id"], []).append(r["volume_24h"])
    out = []
    for mid, vals in series.items():
        if len(vals) < 5:
            continue
        base = _st.median(vals[:-1])
        if base <= 0:
            continue
        ratio = vals[-1] / base
        if ratio >= 2.0:
            mk = store.get_market(mid)
            out.append(((mk["question"] if mk else mid), ratio))
    out.sort(key=lambda t: -t[1])
    return out[:limit]


def _markets_to_watch(store: Store, config: Config, limit: int = 8
                      ) -> list[tuple[str, str]]:
    """Open markets with watched-trader activity or near-term resolution."""
    watch = {w["trader_id"] for w in store.watchlist()}
    out: list[tuple[str, str]] = []
    seen: set[str] = set()

    if watch:
        rows = store.conn.execute(
            "SELECT market_id, COUNT(DISTINCT trader_id) AS n, SUM(value) AS v "
            "FROM trades WHERE trader_id IN "
            f"({','.join('?' * len(watch))}) GROUP BY market_id "
            "ORDER BY n DESC, v DESC LIMIT ?",
            (*watch, limit),
        ).fetchall()
        for r in rows:
            mk = store.get_market(r["market_id"])
            if mk is None or mk["status"] != "open" or mk["id"] in seen:
                continue
            seen.add(mk["id"])
            out.append((mk["question"],
                        f"{r['n']} watchlist trader(s) active, "
                        f"${r['v'] or 0:,.0f} combined observed volume"))

    soon = store.conn.execute(
        "SELECT id, question, close_time FROM markets WHERE status='open' "
        "AND close_time IS NOT NULL AND close_time > ? ORDER BY close_time ASC "
        "LIMIT ?", (utcnow().isoformat(), limit),
    ).fetchall()
    for r in soon:
        if r["id"] in seen or len(out) >= limit:
            continue
        seen.add(r["id"])
        out.append((r["question"], f"resolves {r['close_time'][:16]}"))
    return out[:limit]


def _wrap(text: str, width: int) -> list[str]:
    words = text.split()
    if not words:
        return []
    lines, cur = [], words[0]
    for w in words[1:]:
        if len(cur) + len(w) + 1 <= width:
            cur += " " + w
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    return lines


def save_daily_report(store: Store, config: Config, **kw: Any) -> str:
    text = daily_report(store, config, **kw)
    out = DATA_ROOT / "REPORTS" / f"daily-{utcnow():%Y%m%d-%H%M}.txt"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text)
    return str(out)

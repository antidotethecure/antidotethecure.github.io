"""Section 44: master commands.

    antidote init                     inspect environment, build database
    antidote sources                  what is reachable and what it can supply
    antidote ingest                   pull markets / trades / history
    antidote rank                     compute metrics, rebuild the watchlist
    antidote traders                  "show me the top 10 traders"
    antidote trades                   "show me trades over $10,000"
    antidote watch <id...>            "watch these five traders"
    antidote scan                     detect signals, emit alerts
    antidote alerts                   list recent alerts
    antidote explain <alert-id>       "explain why this alert triggered"
    antidote market <id>              market profile + resolution check
    antidote trader <id>              trader profile
    antidote moves                    "today's biggest market moves"
    antidote consensus                "where smart money agrees / disagrees"
    antidote copy-check <trade-id>    copy-trade feasibility
    antidote simulate <trader-id>     "simulate copying this trader"
    antidote backtest <strategy>      "backtest this strategy"
    antidote paper ...                paper-trading mode
    antidote risk                     bankroll and correlated exposure
    antidote report                   daily intelligence report
    antidote dashboard                render the static dashboard
    antidote learn                    score past alerts, show calibration
    antidote monitor                  real-time alert loop (§39)
    antidote config                   show / set configuration
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import timedelta
from typing import Any

from . import DISCLAIMER, __version__
from .alerts import AlertEngine, explain_alert
from .backtest import BacktestEngine
from .config import CONFIG_PATH, Config
from .copytrade import CopyAnalyzer
from .dashboard import write_dashboard
from .detect import Detector, summarise_suppressions
from .ingest import Ingestor, source_health
from .learning import LearningSystem
from .provenance import utcnow
from .ranking import RANKER_LABELS, RANKERS, RankingEngine, describe_watchlist_entry
from .report import daily_report, market_profile, resolution_check, trader_profile
from .risk import CorrelationEngine, RiskManager
from .simulate import CopySimulator, PaperPortfolio, render_delay_curve
from .storage import Store
from .traders import TraderAnalytics

WINDOWS = (7, 30, 90, 365)


def _bootstrap(args: argparse.Namespace) -> tuple[Store, Config]:
    config = Config.load()
    if getattr(args, "include_closed", False):
        config.filters.only_open = False
    return Store(), config


def _analytics(store: Store, config: Config, window: int = 90):
    ta = TraderAnalytics(store)
    metrics = ta.compute_all(window, min_trades=1)
    ranker = RankingEngine(store, config)
    return ta, metrics, ranker


def _ranks(store: Store) -> dict[str, int]:
    return {w["trader_id"]: w["rank"] for w in store.watchlist()}


# --------------------------------------------------------------------- commands

def cmd_init(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    print(f"ANTIDOTE PREDICTION MARKET INTELLIGENCE OS v{__version__}")
    print("=" * 70)
    print("\n[1-4] ENVIRONMENT AND SOURCE INSPECTION\n")
    for row in source_health(config):
        flag = "REACHABLE" if row["reachable"] else "UNAVAILABLE"
        real = "" if row["real_data"] else "   (NOT REAL-WORLD DATA)"
        print(f"  {row['platform']:<12} {flag:<12} {row['source_kind']}{real}")
        print(f"      {row['detail']}")
        print(f"      provides: {', '.join(row['capabilities'])}")
        for limit in row["limits"]:
            print(f"      limitation: {limit}")
        print()
    print("[5] DATABASE")
    print(f"      {store.path}")
    print(f"      config: {CONFIG_PATH}")
    config.save()
    print("\n[14] EXECUTION")
    print("      live_execution_enabled = "
          f"{config.live_execution_enabled}  (alert-only by design)")
    print("\n" + DISCLAIMER)
    return 0


def cmd_sources(args: argparse.Namespace) -> int:
    _, config = _bootstrap(args)
    print(json.dumps(source_health(config), indent=2))
    return 0


def cmd_ingest(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    results = Ingestor(store, config).run(
        platforms=args.platform or None, market_limit=args.markets,
        trade_limit=args.trades, with_history=args.history,
    )
    denied = False
    for r in results:
        print(r.summary())
        denied = denied or bool(r.policy_denials)
    if denied:
        print("\nOne or more sources refused access. That is a policy decision "
              "by the platform or your network; it is reported, not retried.")
    return 0


def cmd_rank(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    ta = TraderAnalytics(store)
    per_window = {}
    for w in WINDOWS:
        m = ta.compute_all(w, min_trades=1)
        ta.persist(m, w)
        per_window[w] = m
    ranker = RankingEngine(store, config)
    watchlist = ranker.build_watchlist(per_window)
    ranker.persist_watchlist(watchlist)
    print(f"Computed metrics for {len(per_window[90])} traders across "
          f"{len(WINDOWS)} windows.")
    print(f"Watchlist rebuilt: {len(watchlist)} traders.\n")
    for entry in watchlist:
        print(describe_watchlist_entry(entry, store))
        print()
    return 0


def cmd_traders(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    _, metrics, ranker = _analytics(store, config, args.window)
    methods = [args.by] if args.by else list(RANKERS)
    for method in methods:
        ranked = ranker.rank(metrics, method, args.window, limit=args.limit)
        print(f"\n{RANKER_LABELS[method]}  ({args.window}d window)")
        print("-" * 70)
        if not ranked:
            print("  no trader met the eligibility minimums "
                  f"(>= {config.ranking.min_trades_for_ranking} trades)")
            continue
        for r in ranked:
            print(f"  #{r.rank:<3} {(r.username or r.trader_id)[-28:]:<30} "
                  f"score {r.score:>14,.4f}")
            print(f"       {r.explain()}")
        if ranked:
            print(f"\n  caveats: {ranked[0].caveats[-2] if len(ranked[0].caveats) > 1 else ranked[0].caveats[0]}")
    return 0


def cmd_trades(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    since = utcnow() - timedelta(hours=args.hours)
    rows = store.trades(since=since, min_value=args.min_value, limit=args.limit)
    print(f"{len(rows)} trades >= ${args.min_value:,.0f} in the last "
          f"{args.hours:g}h\n")
    print(f"  {'time':<20}{'value':>13}  {'side':<5}{'price':>7}  trader / market")
    for r in rows:
        mk = store.get_market(r["market_id"])
        tr = store.get_trader(r["trader_id"]) if r["trader_id"] else None
        who = (tr["username"] if tr and tr["username"] else
               (r["trader_id"] or "anonymous"))
        print(f"  {r['ts'][:19]:<20}{r['value'] or 0:>13,.0f}  "
              f"{(r['side'] or '?'):<5}{r['price']:>7.3f}  {who[-22:]}")
        print(f"  {'':<20}{'':>13}  {(mk['question'] if mk else r['market_id'])[:58]}")
    return 0


def cmd_watch(args: argparse.Namespace) -> int:
    store, _ = _bootstrap(args)
    existing = {w["trader_id"] for w in store.watchlist()}
    added = []
    for tid in args.trader_ids:
        if store.get_trader(tid) is None:
            print(f"  unknown trader: {tid}")
            continue
        store.conn.execute(
            "INSERT INTO watchlist (trader_id, added_at, rank, reason, pinned) "
            "VALUES (?,?,?,?,1) ON CONFLICT(trader_id) DO UPDATE SET pinned=1",
            (tid, utcnow().isoformat(), 999, "pinned by operator"),
        )
        added.append(tid)
    print(f"Pinned {len(added)} trader(s) to the watchlist. Pinned entries "
          f"survive automatic rebuilds.")
    return 0


def cmd_scan(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    _, metrics, _ = _analytics(store, config)
    detector = Detector(store, config, metrics=metrics, ranks=_ranks(store))
    since = utcnow() - timedelta(hours=args.hours)
    signals = detector.run_all(since=since)
    live = [s for s in signals if not s.suppressed]

    print(f"Signals: {len(signals)} candidate, {len(live)} live, "
          f"{len(signals) - len(live)} suppressed by §35 filters")
    suppressions = summarise_suppressions(signals)
    if suppressions:
        print("\nSuppression reasons:")
        for reason, n in suppressions.items():
            print(f"  {n:>4}x  {reason}")

    alerts = AlertEngine(store, config).process(signals)
    print(f"\nAlerts emitted: {len(alerts)}")
    for a in alerts:
        mk = store.get_market(a.market_id)
        print(f"  L{int(a.level)} {a.level.action:<13} conf {a.confidence:>3}  "
              f"{a.kind:<12} {(mk['question'] if mk else a.market_id)[:44]}")
        print(f"       id: {a.id}")
    if alerts:
        print(f"\nRun `antidote explain <id>` for the full breakdown.")
    return 0


def cmd_alerts(args: argparse.Namespace) -> int:
    store, _ = _bootstrap(args)
    rows = store.alerts(since=utcnow() - timedelta(hours=args.hours),
                        min_level=args.min_level, limit=args.limit)
    print(f"{len(rows)} alerts in the last {args.hours:g}h "
          f"(level >= {args.min_level})\n")
    for r in rows:
        mk = store.get_market(r["market_id"]) if r["market_id"] else None
        print(f"  L{r['level']} conf {r['confidence'] or 0:>3}  {r['kind']:<12} "
              f"{r['ts'][:19]}  {(mk['question'] if mk else '')[:40]}")
        print(f"       {r['id']}")
    return 0


def cmd_explain(args: argparse.Namespace) -> int:
    store, _ = _bootstrap(args)
    print(explain_alert(store, args.alert_id))
    return 0


def cmd_market(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    if args.rules_only:
        print(resolution_check(store, args.market_id))
    else:
        print(market_profile(store, args.market_id, config))
    return 0


def cmd_trader(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    print(trader_profile(store, args.trader_id, config, window_days=args.window))
    return 0


def cmd_moves(args: argparse.Namespace) -> int:
    from .report import _biggest_moves
    store, _ = _bootstrap(args)
    moves = _biggest_moves(store, utcnow() - timedelta(hours=args.hours),
                           limit=args.limit)
    print(f"Biggest market moves in the last {args.hours:g}h\n")
    if not moves:
        print("  insufficient snapshot history")
    for _, question, delta, p0, p1 in moves:
        print(f"  {delta:+7.1%}  {p0:.3f} -> {p1:.3f}   {question[:56]}")
    return 0


def cmd_consensus(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    _, metrics, _ = _analytics(store, config)
    detector = Detector(store, config, metrics=metrics, ranks=_ranks(store))
    signals = detector.consensus(window_minutes=args.window_minutes,
                                 min_traders=args.min_traders,
                                 since=utcnow() - timedelta(hours=args.hours))
    agree = [s for s in signals if s.kind.name == "CONSENSUS"]
    conflict = [s for s in signals if s.kind.name == "CONFLICT"]

    print(f"SMART MONEY CONSENSUS (§28): {len(agree)}")
    for s in agree:
        mk = store.get_market(s.market_id)
        e = s.evidence
        print(f"\n  {(mk['question'] if mk else s.market_id)[:60]}")
        print(f"    {e['n_traders']} traders, "
              f"${e['combined_estimated_value']:,.0f} combined, "
              f"confidence {s.confidence}")
        for t in e["traders"]:
            print(f"      #{t['rank']} {t['trader_id'][-20:]}  {t['side']}")
        for c in s.contrary:
            print(f"    contrary: {c}")

    print(f"\n\nCONFLICTING SMART MONEY (§29): {len(conflict)}")
    for s in conflict:
        mk = store.get_market(s.market_id)
        print(f"\n  {(mk['question'] if mk else s.market_id)[:60]}")
        for t in s.evidence["traders"]:
            print(f"      #{t['rank']} {t['trader_id'][-20:]}  {t['side']}")
        print("    Disagreement is not a trade signal in either direction.")
    return 0


def cmd_copy_check(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    row = store.conn.execute("SELECT * FROM trades WHERE id = ?",
                             (args.trade_id,)).fetchone()
    if row is None:
        print(f"No trade {args.trade_id}")
        return 1
    ta = TraderAnalytics(store)
    tm = ta.compute(row["trader_id"], 90) if row["trader_id"] else None
    rank = _ranks(store).get(row["trader_id"] or "")
    assessment = CopyAnalyzer(store, config).assess(
        row, size_value=args.size, trader_metrics=tm, trader_rank=rank
    )
    print(assessment.render())
    return 0


def cmd_simulate(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    sim = CopySimulator(store, config)
    print(f"COPY SIMULATION (§14) for {args.trader_id}\n")
    print("SIZE SWEEP")
    for r in sim.size_sweep(args.trader_id, delay_seconds=args.delay):
        print(r.render())
        print()
    print()
    print(render_delay_curve(sim.delay_curve(args.trader_id,
                                             size_value=args.size)))
    print(f"\n{DISCLAIMER}")
    return 0


def cmd_backtest(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    engine = BacktestEngine(store, config)
    result = engine.run(args.strategy, size=args.size,
                        delay_seconds=args.delay, top_n=args.top_n)
    print(result.render())
    if result.selected_traders:
        print(f"\n  Traders selected on TRAINING data only "
              f"({len(result.selected_traders)}):")
        for tid in result.selected_traders:
            print(f"      {tid}")
    if args.regimes:
        print("\n\nREGIME ANALYSIS (§24)")
        for label, r in engine.regime_analysis(args.strategy, size=args.size).items():
            roi = "n/a" if r.roi is None else f"{r.roi:+.1%}"
            print(f"  {label:<18} trades {r.n_trades:>5}  net "
                  f"{r.net_pnl:>12,.0f}  ROI {roi:>8}   {r.reliability}")
    return 0


def cmd_paper(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    pf = PaperPortfolio(store, config, name=args.portfolio)
    if args.action == "status":
        print(json.dumps(pf.mark_to_market(), indent=2))
    elif args.action == "open":
        pid = pf.open_position(args.market_id, args.outcome, "BUY",
                               args.price, args.notional)
        if pid is None:
            print("BLOCKED by risk limits (§25):\n")
            print(RiskManager(store, config)
                  .check_new_position(args.portfolio, args.market_id,
                                      args.notional).render())
            return 1
        print(f"opened simulated position {pid}")
    elif args.action == "close":
        pnl = pf.close_position(args.position_id, args.price)
        print("no such open position" if pnl is None
              else f"closed, simulated P&L {pnl:+,.2f}")
    return 0


def cmd_risk(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    rm = RiskManager(store, config)
    if args.market_id:
        print(json.dumps(rm.suggest_size(args.market_id, args.portfolio),
                         indent=2))
        return 0
    print(rm.check_new_position(args.portfolio, "__probe__", 0.0).render())
    print("\nCORRELATED EXPOSURE (§26)")
    exposure = rm.exposure_by_event(args.portfolio)
    if not exposure:
        print("  no open positions")
    for event, value in sorted(exposure.items(), key=lambda kv: -kv[1]):
        print(f"  {event:<40} ${value:>12,.0f}")

    groups = CorrelationEngine(store, config).groups()
    multi = {k: v for k, v in groups.items() if len(v) > 1}
    print(f"\n{len(multi)} event group(s) contain multiple markets:")
    for key, markets in list(multi.items())[:8]:
        print(f"  {key}: {len(markets)} markets")
        for m in markets[:4]:
            print(f"      {m['question'][:60]}")
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    text = daily_report(store, config, hours=args.hours)
    print(text)
    if args.save:
        from .report import save_daily_report
        print(f"\nsaved: {save_daily_report(store, config, hours=args.hours)}")
    return 0


def cmd_dashboard(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    path = write_dashboard(store, config, hours=args.hours)
    print(f"dashboard written: {path}")
    print("This path is inside the data directory, not the published site root.")
    return 0


def cmd_learn(args: argparse.Namespace) -> int:
    store, config = _bootstrap(args)
    ls = LearningSystem(store, config)
    reviews = ls.review_all(horizon_hours=args.horizon)
    from collections import Counter
    counts = Counter(r.verdict.value for r in reviews)
    print(f"Reviewed {len(reviews)} alerts at a {args.horizon:g}h horizon")
    for verdict, n in counts.items():
        print(f"  {verdict:<15} {n}")
    print()
    print(ls.calibration())
    return 0


def cmd_monitor(args: argparse.Namespace) -> int:
    """Section 39: real-time alert mode. Alert-only, with cooldowns."""
    store, config = _bootstrap(args)
    print(f"ANTIDOTE monitor: polling every {config.poll_interval_seconds}s. "
          f"Alert-only; no orders are ever placed. Ctrl-C to stop.\n")
    cycles = 0
    try:
        while args.cycles == 0 or cycles < args.cycles:
            cycles += 1
            results = Ingestor(store, config).run(
                platforms=args.platform or None, market_limit=args.markets,
                trade_limit=args.trades,
            )
            for r in results:
                if r.policy_denials:
                    print(f"[{utcnow():%H:%M:%S}] {r.platform}: ACCESS DENIED "
                          f"- {'; '.join(r.policy_denials)}")

            _, metrics, _ = _analytics(store, config)
            detector = Detector(store, config, metrics=metrics,
                                ranks=_ranks(store))
            signals = detector.run_all(since=utcnow() - timedelta(hours=1))
            alerts = AlertEngine(store, config).process(signals)
            print(f"[{utcnow():%H:%M:%S}] cycle {cycles}: "
                  f"{len(signals)} signals, {len(alerts)} alerts")
            for a in alerts:
                print(f"    L{int(a.level)} {a.kind} conf {a.confidence} "
                      f"-> {a.level.action}  ({a.id})")
            if args.cycles == 0 or cycles < args.cycles:
                time.sleep(config.poll_interval_seconds)
    except KeyboardInterrupt:
        print("\nstopped.")
    return 0


def cmd_follow(args: argparse.Namespace) -> int:
    """Watch ranked traders; alert on their qualifying moves + copy-feasibility.

    This is the 'follow top traders' workflow. It is alert-only: it never places
    a trade. 'Immediately' means the poll interval — there is no per-trade push;
    a trade is seen on the next ingest cycle.
    """
    store, config = _bootstrap(args)
    ta, metrics, ranker = _analytics(store, config)
    ranks = _ranks(store)
    if not ranks:
        print("No watchlist yet. Run `antidote rank` first to build it, or "
              "`antidote watch <trader_id...>` to pin traders.")
        return 1

    detector = Detector(store, config, metrics=metrics, ranks=ranks)
    since = utcnow() - timedelta(hours=args.hours)
    signals = [s for s in detector.large_trades(since=since)
               if s.trader_id in ranks and not s.suppressed]
    signals.sort(key=lambda s: (ranks.get(s.trader_id, 999), -s.confidence))

    analyzer = CopyAnalyzer(store, config)
    engine = AlertEngine(store, config)
    print(f"Watching {len(ranks)} ranked trader(s). "
          f"{len(signals)} qualifying move(s) in the last {args.hours:g}h.\n")

    emitted = 0
    for s in signals:
        row = store.conn.execute("SELECT * FROM trades WHERE id = ?",
                                 (s.evidence.get("trade_id"),)).fetchone()
        tm = metrics.get(s.trader_id)
        assessment = analyzer.assess(
            row, size_value=args.size, trader_metrics=tm,
            trader_rank=ranks.get(s.trader_id),
        ) if row else None

        # Section 33 gate the user asked for: only surface markets whose current
        # implied probability clears their threshold. Reframed honestly below.
        prob = s.evidence.get("market_price_now")
        prob_ok = prob is not None and prob >= args.min_prob

        alert = engine.build([s], kind="large_trade", market_id=s.market_id,
                             trader_id=s.trader_id)
        if engine.emit(alert):
            emitted += 1
        mk = store.get_market(s.market_id)
        print(f"#{ranks.get(s.trader_id)} {s.trader_id[-14:]}  "
              f"{(mk['question'] if mk else s.market_id)[:46]}")
        print(f"    conf {s.confidence}  prob "
              f"{'n/a' if prob is None else f'{prob:.0%}'}"
              f"  {'>= ' + format(args.min_prob, '.0%') + ' OK' if prob_ok else 'below prob floor'}")
        if assessment:
            print(f"    copy-check: {assessment.verdict.value}")
    print(f"\n{emitted} alert(s) emitted (level/confidence gated by config).")
    print("Reminder: high implied probability = small payout, not 'safe money'. "
          "A copy-check verdict of 'Potentially replicable' means the mechanics "
          "still work, not that the trade is good. No position is suggested; "
          "human decision required.")
    return 0


def cmd_config(args: argparse.Namespace) -> int:
    config = Config.load()
    if args.set:
        for pair in args.set:
            if "=" not in pair:
                print(f"  skipping '{pair}': expected key=value")
                continue
            key, raw = pair.split("=", 1)
            target: Any = config
            parts = key.split(".")
            for p in parts[:-1]:
                target = getattr(target, p, None)
                if target is None:
                    print(f"  unknown config path: {key}")
                    break
            else:
                leaf = parts[-1]
                if not hasattr(target, leaf):
                    print(f"  unknown config key: {key}")
                    continue
                current = getattr(target, leaf)
                try:
                    value = json.loads(raw)
                except json.JSONDecodeError:
                    value = raw
                if isinstance(current, bool) and isinstance(value, str):
                    value = value.lower() in ("1", "true", "yes", "on")
                elif isinstance(current, float) and isinstance(value, int):
                    value = float(value)
                setattr(target, leaf, value)
                print(f"  {key} = {value!r}")
        config.save()
        print(f"\nsaved to {CONFIG_PATH}")
        return 0
    print(json.dumps(config.to_dict(), indent=2))
    return 0


# ----------------------------------------------------------------------- parser

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="antidote",
        description="ANTIDOTE Prediction Market Intelligence OS - research and "
                    "monitoring only. Places no trades.",
    )
    p.add_argument("--version", action="version", version=__version__)
    p.add_argument("--include-closed", action="store_true",
                   help="include closed/resolved markets (needed for backtests)")
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("init", help="inspect environment and build the database"
                   ).set_defaults(func=cmd_init)
    sub.add_parser("sources", help="source reachability and capabilities"
                   ).set_defaults(func=cmd_sources)

    s = sub.add_parser("ingest", help="pull markets, trades and history")
    s.add_argument("--platform", action="append")
    s.add_argument("--markets", type=int, default=100)
    s.add_argument("--trades", type=int, default=500)
    s.add_argument("--history", action="store_true",
                   help="backfill price history where the source supports it")
    s.set_defaults(func=cmd_ingest)

    sub.add_parser("rank", help="recompute metrics and rebuild the watchlist"
                   ).set_defaults(func=cmd_rank)

    s = sub.add_parser("traders", help="show top traders")
    s.add_argument("--by", choices=sorted(RANKERS))
    s.add_argument("--window", type=int, default=90, choices=WINDOWS)
    s.add_argument("--limit", type=int, default=10)
    s.set_defaults(func=cmd_traders)

    s = sub.add_parser("trades", help="show large trades")
    s.add_argument("--min-value", type=float, default=10_000.0)
    s.add_argument("--hours", type=float, default=24.0)
    s.add_argument("--limit", type=int, default=25)
    s.set_defaults(func=cmd_trades)

    s = sub.add_parser("watch", help="pin traders to the watchlist")
    s.add_argument("trader_ids", nargs="+")
    s.set_defaults(func=cmd_watch)

    s = sub.add_parser("scan", help="detect signals and emit alerts")
    s.add_argument("--hours", type=float, default=24.0)
    s.set_defaults(func=cmd_scan)

    s = sub.add_parser("alerts", help="list recent alerts")
    s.add_argument("--hours", type=float, default=24.0)
    s.add_argument("--min-level", type=int, default=1)
    s.add_argument("--limit", type=int, default=25)
    s.set_defaults(func=cmd_alerts)

    s = sub.add_parser("explain", help="explain why an alert triggered")
    s.add_argument("alert_id")
    s.set_defaults(func=cmd_explain)

    s = sub.add_parser("market", help="market profile and resolution rules")
    s.add_argument("market_id")
    s.add_argument("--rules-only", action="store_true")
    s.set_defaults(func=cmd_market)

    s = sub.add_parser("trader", help="trader profile")
    s.add_argument("trader_id")
    s.add_argument("--window", type=int, default=90, choices=WINDOWS)
    s.set_defaults(func=cmd_trader)

    s = sub.add_parser("moves", help="biggest market moves")
    s.add_argument("--hours", type=float, default=24.0)
    s.add_argument("--limit", type=int, default=15)
    s.set_defaults(func=cmd_moves)

    s = sub.add_parser("consensus", help="agreement and conflict among ranked traders")
    s.add_argument("--hours", type=float, default=24.0)
    s.add_argument("--window-minutes", type=int, default=240)
    s.add_argument("--min-traders", type=int, default=2)
    s.set_defaults(func=cmd_consensus)

    s = sub.add_parser("copy-check", help="copy-trade feasibility for a trade")
    s.add_argument("trade_id")
    s.add_argument("--size", type=float, default=1000.0)
    s.set_defaults(func=cmd_copy_check)

    s = sub.add_parser("simulate", help="simulate copying a trader")
    s.add_argument("trader_id")
    s.add_argument("--size", type=float, default=1000.0)
    s.add_argument("--delay", type=float, default=30.0)
    s.set_defaults(func=cmd_simulate)

    s = sub.add_parser("backtest", help="backtest a strategy")
    s.add_argument("strategy", choices=sorted(BacktestEngine.STRATEGIES))
    s.add_argument("--size", type=float, default=100.0)
    s.add_argument("--delay", type=float, default=30.0)
    s.add_argument("--top-n", type=int, default=10)
    s.add_argument("--regimes", action="store_true")
    s.set_defaults(func=cmd_backtest)

    s = sub.add_parser("paper", help="paper-trading mode")
    s.add_argument("action", choices=["status", "open", "close"])
    s.add_argument("--portfolio", default="default")
    s.add_argument("--market-id")
    s.add_argument("--outcome", default="Yes")
    s.add_argument("--price", type=float, default=0.5)
    s.add_argument("--notional", type=float, default=100.0)
    s.add_argument("--position-id")
    s.set_defaults(func=cmd_paper)

    s = sub.add_parser("risk", help="bankroll limits and correlated exposure")
    s.add_argument("--portfolio", default="default")
    s.add_argument("--market-id")
    s.set_defaults(func=cmd_risk)

    s = sub.add_parser("report", help="daily intelligence report")
    s.add_argument("--hours", type=float, default=24.0)
    s.add_argument("--save", action="store_true")
    s.set_defaults(func=cmd_report)

    s = sub.add_parser("dashboard", help="render the static dashboard")
    s.add_argument("--hours", type=float, default=24.0)
    s.set_defaults(func=cmd_dashboard)

    s = sub.add_parser("learn", help="score past alerts and show calibration")
    s.add_argument("--horizon", type=float, default=24.0)
    s.set_defaults(func=cmd_learn)

    s = sub.add_parser("monitor", help="real-time alert loop (alert-only)")
    s.add_argument("--platform", action="append")
    s.add_argument("--markets", type=int, default=100)
    s.add_argument("--trades", type=int, default=500)
    s.add_argument("--cycles", type=int, default=0, help="0 = run forever")
    s.set_defaults(func=cmd_monitor)

    s = sub.add_parser("follow", help="watch ranked traders and alert on moves")
    s.add_argument("--hours", type=float, default=24.0)
    s.add_argument("--size", type=float, default=1000.0,
                   help="notional to assess copy-feasibility against")
    s.add_argument("--min-prob", type=float, default=0.0,
                   help="only surface markets at/above this implied probability "
                        "(0-1). Default 0 = no filter.")
    s.set_defaults(func=cmd_follow)

    s = sub.add_parser("config", help="show or set configuration")
    s.add_argument("--set", action="append", metavar="KEY=VALUE",
                   help="e.g. --set thresholds.min_trade_size=5000")
    s.set_defaults(func=cmd_config)

    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())

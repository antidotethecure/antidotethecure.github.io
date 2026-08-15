"""Tests for ANTIDOTE.

Weighted toward the properties that make the system trustworthy rather than
merely functional: that fabricated data cannot be published, that absent
evidence lowers confidence instead of being ignored, that ranking is not fooled
by tiny samples, that backtests do not leak the future into trader selection,
and that risk limits derive from the operator's bankroll rather than from
somebody else's trade size.
"""

from __future__ import annotations

import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from antidote.alerts import AlertEngine, AlertLevel, render_alert
from antidote.backtest import BacktestEngine, Split
from antidote.config import Config, SourceConfig
from antidote.copytrade import CopyAnalyzer, Feasibility
from antidote.detect import Detector, FalseSignalFilter, MarketContext
from antidote.ingest import Ingestor
from antidote.learning import LearningSystem, Verdict
from antidote.provenance import (
    EpistemicClass, Provenance, ProvenanceError, SourceKind, Staleness,
    observed, require_real, speculation, utcnow,
)
from antidote.ranking import RankingEngine
from antidote.risk import CorrelationEngine, RiskManager
from antidote.signals import ConfidenceBreakdown, Signal, SignalKind, score_signal
from antidote.simulate import CopySimulator, PaperPortfolio
from antidote.sources import Capability, FixtureSource, KalshiSource, PolymarketSource
from antidote.storage import Market, Store, Trade, Trader
from antidote.traders import TraderAnalytics


def fresh_store(tmp: Path) -> Store:
    return Store(tmp / "test.db")


def seeded(tmp: Path, *, history: bool = True) -> tuple[Store, Config]:
    cfg = Config()
    cfg.filters.only_open = False
    store = fresh_store(tmp)
    Ingestor(store, cfg).run(platforms=["fixture"], market_limit=100,
                             trade_limit=100_000, with_history=history)
    return store, cfg


class TempMixin(unittest.TestCase):
    def setUp(self) -> None:
        import tempfile
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)

    def tearDown(self) -> None:
        self._tmp.cleanup()


# --------------------------------------------------------------- provenance

class TestProvenance(unittest.TestCase):
    def test_staleness_transitions(self) -> None:
        now = utcnow()
        p = Provenance("x", SourceKind.OFFICIAL_API, fetched_at=now,
                       as_of=now - timedelta(minutes=45))
        self.assertIs(p.staleness(now), Staleness.STALE)
        self.assertTrue(p.is_stale)

        fresh = Provenance("x", SourceKind.OFFICIAL_API, fetched_at=now,
                           as_of=now - timedelta(seconds=10))
        self.assertIs(fresh.staleness(now), Staleness.FRESH)

    def test_stale_data_lowers_confidence(self) -> None:
        now = utcnow()
        fresh = Provenance("x", SourceKind.OFFICIAL_API, now, as_of=now)
        stale = Provenance("x", SourceKind.OFFICIAL_API, now,
                           as_of=now - timedelta(hours=2))
        self.assertGreater(fresh.confidence(now), stale.confidence(now))

    def test_synthetic_is_not_real(self) -> None:
        self.assertFalse(SourceKind.SYNTHETIC.is_real)
        self.assertFalse(SourceKind.FIXTURE.is_real)
        self.assertTrue(SourceKind.OFFICIAL_API.is_real)

    def test_require_real_blocks_fabricated_data(self) -> None:
        p = Provenance("fixture", SourceKind.FIXTURE, utcnow())
        with self.assertRaises(ProvenanceError):
            require_real(p, "publish a trader ranking")

    def test_observed_on_fake_data_carries_caveat(self) -> None:
        p = Provenance("fixture", SourceKind.FIXTURE, utcnow())
        claim = observed("trader X bought 1000 shares", p)
        self.assertTrue(any("no real market" in c for c in claim.caveats))

    def test_speculation_is_always_labelled(self) -> None:
        claim = speculation("the trader may know something")
        self.assertIs(claim.epistemic_class, EpistemicClass.SPECULATION)
        self.assertIn("[SPECULATION]", claim.render())
        self.assertFalse(claim.epistemic_class.is_factual)

    def test_only_observed_is_factual(self) -> None:
        for cls in EpistemicClass:
            self.assertEqual(cls.is_factual, cls is EpistemicClass.OBSERVED)


# ------------------------------------------------------------------ sources

class TestSources(unittest.TestCase):
    def test_kalshi_does_not_claim_trader_identity(self) -> None:
        """The whole point: Kalshi prints are anonymous and must stay that way."""
        k = KalshiSource(SourceConfig(platform="kalshi"))
        self.assertNotIn(Capability.TRADER_IDENTITY, k.capabilities)
        self.assertFalse(k.supports(Capability.TRADER_IDENTITY))
        self.assertIn(Capability.OPEN_INTEREST, k.capabilities)

    def test_polymarket_claims_trader_identity(self) -> None:
        p = PolymarketSource(SourceConfig(platform="polymarket"))
        self.assertTrue(p.supports(Capability.TRADER_IDENTITY))

    def test_kalshi_trades_have_no_trader(self) -> None:
        k = KalshiSource(SourceConfig(platform="kalshi"))
        rows = {"trades": [{"ticker": "ABC", "count": 100, "yes_price": 55,
                            "created_time": "2026-01-01T00:00:00Z",
                            "trade_id": "t1", "taker_side": "yes"}]}
        k.http.get_json = lambda *a, **kw: rows  # type: ignore
        out = k.fetch_trades()
        self.assertEqual(len(out), 1)
        trade, trader = out[0]
        self.assertIsNone(trader)
        self.assertIsNone(trade.trader_id)
        # cents normalised to a probability
        self.assertAlmostEqual(trade.price, 0.55)

    def test_polymarket_parses_wallet_identity(self) -> None:
        p = PolymarketSource(SourceConfig(platform="polymarket"))
        rows = [{"conditionId": "0xabc", "price": "0.42", "size": "100",
                 "timestamp": 1767225600, "proxyWallet": "0xDEAD",
                 "pseudonym": "brave-otter", "side": "BUY", "outcome": "Yes",
                 "transactionHash": "0xtx"}]
        p.http.get_json = lambda *a, **kw: rows  # type: ignore
        trade, trader = p.fetch_trades()[0]
        self.assertIsNotNone(trader)
        self.assertEqual(trader.wallet, "0xDEAD")
        self.assertEqual(trader.username, "brave-otter")
        self.assertAlmostEqual(trade.value, 42.0)

    def test_fixture_ids_are_namespaced(self) -> None:
        f = FixtureSource(SourceConfig(platform="fixture"))
        for market, _ in f.fetch_markets(limit=5):
            self.assertIn("SYNTHETIC", market.external_id)
            self.assertIn("[SYNTHETIC]", market.question)
        for t in f.all_traders()[:5]:
            self.assertIn("SYNTHETIC", t.external_id)

    def test_fixture_emits_no_future_trades(self) -> None:
        f = FixtureSource(SourceConfig(platform="fixture"))
        now = utcnow()
        for trade, _ in f.fetch_trades(limit=0):
            self.assertLessEqual(trade.ts, now + timedelta(seconds=1))


# ------------------------------------------------------------------ ingest

class TestIngest(TempMixin):
    def test_ingest_populates_store(self) -> None:
        store, _ = seeded(self.tmp)
        self.assertGreater(len(store.markets(limit=1000)), 0)
        self.assertGreater(len(store.traders()), 0)
        self.assertGreater(len(store.trades(limit=10)), 0)

    def test_trades_are_deduplicated(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        before = len(store.trades(limit=100_000))
        Ingestor(store, cfg).run(platforms=["fixture"], market_limit=100,
                                 trade_limit=100_000)
        self.assertEqual(before, len(store.trades(limit=100_000)))

    def test_price_before_precedes_trade(self) -> None:
        """Pre-trade price must come from before the trade, not from 'now'."""
        store, _ = seeded(self.tmp)
        rows = [r for r in store.trades(limit=500) if r["price_before"] is not None]
        self.assertGreater(len(rows), 0)
        for r in rows[:20]:
            snap = store.conn.execute(
                "SELECT ts FROM market_snapshots WHERE market_id=? AND ts<=? "
                "ORDER BY ts DESC LIMIT 1", (r["market_id"], r["ts"])
            ).fetchone()
            self.assertIsNotNone(snap)

    def test_store_reports_weakest_source_kind(self) -> None:
        store, _ = seeded(self.tmp, history=False)
        self.assertFalse(store.dominant_source_kind().is_real)


# ------------------------------------------------------------------ metrics

class TestTraderMetrics(TempMixin):
    def test_fifo_realizes_pnl_on_sale(self) -> None:
        store = fresh_store(self.tmp)
        prov = Provenance("t", SourceKind.OFFICIAL_API, utcnow())
        store.upsert_market(Market(id="p:m1", platform="p", external_id="m1",
                                   question="Q?", status="open"), prov)
        store.upsert_trader(Trader(id="p:t1", platform="p", external_id="t1"), prov)
        base = utcnow() - timedelta(days=5)
        store.add_trade(Trade(id="a", platform="p", market_id="p:m1",
                              trader_id="p:t1", ts=base, price=0.40, size=100,
                              value=40, side="BUY", outcome="Yes"), prov)
        store.add_trade(Trade(id="b", platform="p", market_id="p:m1",
                              trader_id="p:t1", ts=base + timedelta(days=1),
                              price=0.60, size=100, value=60, side="SELL",
                              outcome="Yes"), prov)
        m = TraderAnalytics(store).compute("p:t1", 90)
        self.assertEqual(m.n_closed_lots, 1)
        self.assertAlmostEqual(m.realized_pnl, 20.0, places=4)
        self.assertEqual(m.win_rate, 1.0)

    def test_settles_open_lots_at_resolution(self) -> None:
        store = fresh_store(self.tmp)
        prov = Provenance("t", SourceKind.OFFICIAL_API, utcnow())
        close = utcnow() - timedelta(days=1)
        store.upsert_market(Market(
            id="p:m2", platform="p", external_id="m2", question="Q?",
            status="closed", close_time=close, resolution_date=close,
            raw={"resolved_outcome": "Yes"}), prov)
        store.upsert_trader(Trader(id="p:t2", platform="p", external_id="t2"), prov)
        store.add_trade(Trade(id="c", platform="p", market_id="p:m2",
                              trader_id="p:t2", ts=utcnow() - timedelta(days=3),
                              price=0.25, size=100, value=25, side="BUY",
                              outcome="Yes"), prov)
        m = TraderAnalytics(store).compute("p:t2", 90)
        # Bought YES at 0.25, resolved YES -> pays 1.00 -> +75.
        self.assertAlmostEqual(m.realized_pnl, 75.0, places=4)

    def test_losing_settlement_is_counted(self) -> None:
        store = fresh_store(self.tmp)
        prov = Provenance("t", SourceKind.OFFICIAL_API, utcnow())
        close = utcnow() - timedelta(days=1)
        store.upsert_market(Market(
            id="p:m3", platform="p", external_id="m3", question="Q?",
            status="closed", close_time=close, resolution_date=close,
            raw={"resolved_outcome": "No"}), prov)
        store.upsert_trader(Trader(id="p:t3", platform="p", external_id="t3"), prov)
        store.add_trade(Trade(id="d", platform="p", market_id="p:m3",
                              trader_id="p:t3", ts=utcnow() - timedelta(days=3),
                              price=0.25, size=100, value=25, side="BUY",
                              outcome="Yes"), prov)
        m = TraderAnalytics(store).compute("p:t3", 90)
        self.assertAlmostEqual(m.realized_pnl, -25.0, places=4)
        self.assertEqual(m.win_rate, 0.0)

    def test_uncalculable_metrics_are_none_not_zero(self) -> None:
        """A trader with no closed lots has unknown P&L, not zero P&L."""
        store = fresh_store(self.tmp)
        prov = Provenance("t", SourceKind.OFFICIAL_API, utcnow())
        store.upsert_market(Market(id="p:m4", platform="p", external_id="m4",
                                   question="Q?", status="open"), prov)
        store.upsert_trader(Trader(id="p:t4", platform="p", external_id="t4"), prov)
        store.add_trade(Trade(id="e", platform="p", market_id="p:m4",
                              trader_id="p:t4", ts=utcnow() - timedelta(days=1),
                              price=0.5, size=10, value=5, side="BUY",
                              outcome="Yes"), prov)
        m = TraderAnalytics(store).compute("p:t4", 90)
        self.assertIsNone(m.realized_pnl)
        self.assertIsNone(m.win_rate)
        self.assertEqual(m.n_trades, 1)

    def test_metrics_carry_non_real_note(self) -> None:
        store, _ = seeded(self.tmp, history=False)
        tid = store.traders()[0]["id"]
        m = TraderAnalytics(store).compute(tid, 90)
        self.assertIn(m.source_kind, ("fixture", "synthetic"))
        self.assertTrue(any("not evidence" in n for n in m.notes))


# ------------------------------------------------------------------ ranking

class TestRanking(TempMixin):
    def test_shrinkage_penalises_tiny_samples(self) -> None:
        """3-for-3 must not outrank a large sample with a good record."""
        store, cfg = seeded(self.tmp, history=False)
        engine = RankingEngine(store, cfg)
        from antidote.traders import TraderMetrics

        lucky = TraderMetrics(trader_id="lucky", window_days=90, n_trades=40,
                              active_days=30, n_closed_lots=3, win_rate=1.0,
                              roi=1.0)
        solid = TraderMetrics(trader_id="solid", window_days=90, n_trades=400,
                              active_days=80, n_closed_lots=300, win_rate=0.62,
                              roi=0.35)
        ranked = engine.rank({"lucky": lucky, "solid": solid}, "win_rate", 90)
        self.assertEqual(ranked[0].trader_id, "solid")

    def test_eligibility_excludes_thin_records(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        cfg.ranking.min_trades_for_ranking = 1000
        engine = RankingEngine(store, cfg)
        metrics = TraderAnalytics(store).compute_all(90, min_trades=1)
        self.assertEqual(engine.rank(metrics, "realized_pnl", 90), [])

    def test_every_ranking_carries_survivorship_warning(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        metrics = TraderAnalytics(store).compute_all(90, min_trades=1)
        for ranked in RankingEngine(store, cfg).rank_all(metrics, 90).values():
            for r in ranked:
                self.assertTrue(any("urvivorship" in c for c in r.caveats))

    def test_watchlist_is_rebuilt_not_accumulated(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        ta = TraderAnalytics(store)
        engine = RankingEngine(store, cfg)
        per = {w: ta.compute_all(w, min_trades=1) for w in (7, 30, 90)}
        engine.persist_watchlist(engine.build_watchlist(per))
        first = len(store.watchlist())
        engine.persist_watchlist(engine.build_watchlist(per))
        self.assertEqual(first, len(store.watchlist()))
        self.assertLessEqual(first, cfg.watchlist_size)

    def test_unknown_ranking_method_raises(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        with self.assertRaises(KeyError):
            RankingEngine(store, cfg).rank({}, "make_me_money", 90)


# ------------------------------------------------------- signals and filters

class TestSignals(unittest.TestCase):
    def test_absent_evidence_lowers_confidence(self) -> None:
        """Missing inputs must not be normalised away into a high score."""
        sig = Signal(kind=SignalKind.TRADER, market_id="m")
        score_signal(sig, data_confidence=1.0)
        self.assertLess(sig.confidence, 30)
        self.assertIn("news_confirmation", sig.breakdown.missing())

    def test_more_evidence_raises_confidence(self) -> None:
        weak = Signal(kind=SignalKind.TRADER, market_id="m")
        score_signal(weak, data_confidence=0.5, trade_value=1_000,
                     liquidity=5_000)
        strong = Signal(kind=SignalKind.TRADER, market_id="m")
        score_signal(strong, data_confidence=1.0, trade_value=100_000,
                     liquidity=500_000, confirmations=3, news_hits=2,
                     historical_hit_rate=0.7,
                     trader_metrics={"n_closed_lots": 200, "roi": 0.5,
                                     "risk_adjusted": 3.0})
        self.assertGreater(strong.confidence, weak.confidence)
        self.assertLessEqual(strong.confidence, 100)

    def test_confidence_is_bounded(self) -> None:
        sig = Signal(kind=SignalKind.TRADER, market_id="m")
        score_signal(sig, data_confidence=99.0, trade_value=1e12,
                     liquidity=1e12, confirmations=999, news_hits=999,
                     price_move=99.0, volume_ratio=1e6,
                     historical_hit_rate=5.0)
        self.assertLessEqual(sig.confidence, 100)
        self.assertGreaterEqual(sig.confidence, 0)


class TestFalseSignalFilter(unittest.TestCase):
    def _ctx(self, **kw) -> MarketContext:
        base = dict(
            market_id="m", question="Q?", category="Politics", status="open",
            close_time=utcnow() + timedelta(days=5), price=0.5,
            liquidity=100_000.0, volume=1e6, open_interest=None, spread=0.01,
            prov=Provenance("api", SourceKind.OFFICIAL_API, utcnow(),
                            as_of=utcnow()),
            price_history=[(utcnow() - timedelta(days=3), 0.5)],
            volume_history=[1.0] * 6,
            first_seen=utcnow() - timedelta(days=10),
        )
        base.update(kw)
        return MarketContext(**base)

    def setUp(self) -> None:
        self.f = FalseSignalFilter(Config())

    def test_clean_market_is_not_suppressed(self) -> None:
        self.assertEqual(self.f.check(self._ctx(), trade_value=50_000), [])

    def test_tiny_trade_suppressed(self) -> None:
        self.assertTrue(any("below min_trade_size" in r for r in
                            self.f.check(self._ctx(), trade_value=10)))

    def test_illiquid_market_suppressed(self) -> None:
        self.assertTrue(any("illiquid" in r for r in
                            self.f.check(self._ctx(liquidity=5.0),
                                         trade_value=50_000)))

    def test_resolved_price_suppressed(self) -> None:
        self.assertTrue(any("resolved end" in r for r in
                            self.f.check(self._ctx(price=0.999),
                                         trade_value=50_000)))

    def test_near_close_suppressed(self) -> None:
        ctx = self._ctx(close_time=utcnow() + timedelta(minutes=1))
        self.assertTrue(any("of close" in r for r in
                            self.f.check(ctx, trade_value=50_000)))

    def test_stale_data_suppressed(self) -> None:
        ctx = self._ctx(prov=Provenance("api", SourceKind.OFFICIAL_API,
                                        utcnow(),
                                        as_of=utcnow() - timedelta(hours=3)))
        self.assertTrue(any("stale" in r for r in
                            self.f.check(ctx, trade_value=50_000)))

    def test_duplicate_suppressed(self) -> None:
        self.assertTrue(any("duplicate" in r for r in
                            self.f.check(self._ctx(), trade_value=50_000,
                                         duplicate=True)))

    def test_unknown_liquidity_suppressed(self) -> None:
        self.assertTrue(any("liquidity unknown" in r for r in
                            self.f.check(self._ctx(liquidity=None),
                                         trade_value=50_000)))


# ------------------------------------------------------------------- alerts

class TestAlerts(TempMixin):
    def test_escalation_requires_independent_signals(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        engine = AlertEngine(store, cfg)
        # Three price signals are one family, not three confirmations.
        same = []
        for _ in range(3):
            s = Signal(kind=SignalKind.PRICE, market_id="m", confidence=70)
            same.append(s)
        self.assertLess(int(engine.escalate(same, {})),
                        int(AlertLevel.HIGH_PRIORITY))

        mixed = [
            Signal(kind=SignalKind.PRICE, market_id="m", confidence=70),
            Signal(kind=SignalKind.VOLUME, market_id="m", confidence=70),
            Signal(kind=SignalKind.TRADER, market_id="m", confidence=70),
        ]
        self.assertGreaterEqual(int(engine.escalate(mixed, {})),
                                int(AlertLevel.HIGH_PRIORITY))

    def test_conflict_caps_escalation(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        engine = AlertEngine(store, cfg)
        sigs = [
            Signal(kind=SignalKind.CONFLICT, market_id="m", confidence=95),
            Signal(kind=SignalKind.VOLUME, market_id="m", confidence=95),
            Signal(kind=SignalKind.PRICE, market_id="m", confidence=95),
        ]
        level = engine.escalate(sigs, {"ranked_trader": 1})
        self.assertLessEqual(int(level), int(AlertLevel.SIGNIFICANT))

    def test_suppressed_signals_do_not_escalate(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        engine = AlertEngine(store, cfg)
        s = Signal(kind=SignalKind.TRADER, market_id="m", confidence=99)
        s.suppressed_by = ["illiquid market"]
        self.assertIs(engine.escalate([s], {}), AlertLevel.INFORMATION)

    def test_cooldown_blocks_repeat(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        engine = AlertEngine(store, cfg)
        mid = store.markets(limit=1)[0]["id"]
        sig = Signal(kind=SignalKind.TRADER, market_id=mid, confidence=90,
                     provenance=Provenance("api", SourceKind.OFFICIAL_API,
                                           utcnow(), as_of=utcnow()))
        first = engine.build([sig], kind="large_trade", market_id=mid)
        self.assertTrue(engine.emit(first))
        second = engine.build([sig], kind="large_trade", market_id=mid)
        ok, why = engine.should_emit(second)
        self.assertFalse(ok)
        self.assertIn("cooldown", why)

    def test_alert_never_promises_profit(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        engine = AlertEngine(store, cfg)
        sig = Signal(kind=SignalKind.TRADER, market_id="m", confidence=90,
                     provenance=Provenance("f", SourceKind.FIXTURE, utcnow()))
        alert = engine.build([sig], kind="large_trade", market_id="m")
        text = render_alert(alert, store).lower()
        for banned in ("guaranteed", "sure thing", "risk-free", "will profit",
                       "you should buy"):
            self.assertNotIn(banned, text)
        self.assertIn("human", text)
        self.assertIn(alert.level.action.lower(), text)

    def test_synthetic_alert_is_banner_marked(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        engine = AlertEngine(store, cfg)
        sig = Signal(kind=SignalKind.TRADER, market_id="m", confidence=90,
                     provenance=Provenance("f", SourceKind.FIXTURE, utcnow()))
        alert = engine.build([sig], kind="large_trade", market_id="m")
        self.assertIn("SYNTHETIC TEST DATA", render_alert(alert, store))

    def test_alert_format_has_required_fields(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        engine = AlertEngine(store, cfg)
        sig = Signal(kind=SignalKind.TRADER, market_id="m", confidence=90,
                     provenance=Provenance("api", SourceKind.OFFICIAL_API,
                                           utcnow()))
        text = render_alert(engine.build([sig], kind="large_trade",
                                         market_id="m"), store)
        for field in ("MARKET:", "TRADER:", "TIME:", "TRADE:", "PRICE:",
                      "SIZE:", "MARKET PROBABILITY:", "PRE-TRADE PRICE:",
                      "POST-TRADE PRICE:", "VOLUME:", "TRADER RANK:",
                      "TRADER HISTORICAL PERFORMANCE:", "WHY THIS TRIGGERED:",
                      "OTHER SIGNALS:", "CONTRARY SIGNALS:", "RISK:",
                      "SOURCE:", "ACTION:"):
            self.assertIn(field, text)


# --------------------------------------------------------------- copy trade

class TestCopyTrade(TempMixin):
    def _setup(self):
        store = fresh_store(self.tmp)
        cfg = Config()
        prov = Provenance("api", SourceKind.OFFICIAL_API, utcnow())
        store.upsert_market(Market(
            id="p:m", platform="p", external_id="m", question="Q?",
            status="open", close_time=utcnow() + timedelta(days=10)), prov)
        return store, cfg, prov

    def _trade(self, store, prov, *, price=0.5, ago_s=60, value=5_000,
               liquidity=100_000.0):
        ts = utcnow() - timedelta(seconds=ago_s)
        store.add_trade(Trade(id=f"t{ago_s}{price}{value}", platform="p",
                              market_id="p:m", trader_id=None, ts=ts,
                              price=price, size=value / price, value=value,
                              side="BUY", outcome="Yes", liquidity=liquidity),
                        prov)
        return store.conn.execute(
            "SELECT * FROM trades ORDER BY ingested_at DESC LIMIT 1").fetchone()

    def _snap(self, store, prov, price, liquidity=100_000.0):
        from antidote.storage import Snapshot
        store.add_snapshot(Snapshot(market_id="p:m", ts=utcnow(), price=price,
                                    liquidity=liquidity), prov)

    def test_replicable_when_price_holds(self) -> None:
        store, cfg, prov = self._setup()
        self._snap(store, prov, 0.505)
        row = self._trade(store, prov, price=0.5)
        a = CopyAnalyzer(store, cfg).assess(row, size_value=1_000)
        self.assertIs(a.verdict, Feasibility.REPLICABLE)

    def test_price_moved_blocks(self) -> None:
        store, cfg, prov = self._setup()
        self._snap(store, prov, 0.75)
        row = self._trade(store, prov, price=0.5)
        a = CopyAnalyzer(store, cfg).assess(row, size_value=1_000)
        self.assertIs(a.verdict, Feasibility.PRICE_MOVED)
        self.assertIsNotNone(a.edge_consumed_pct)

    def test_illiquid_blocks(self) -> None:
        store, cfg, prov = self._setup()
        self._snap(store, prov, 0.5, liquidity=100.0)
        row = self._trade(store, prov, price=0.5, liquidity=100.0)
        a = CopyAnalyzer(store, cfg).assess(row, size_value=1_000)
        self.assertIs(a.verdict, Feasibility.ILLIQUID)

    def test_stale_signal_blocks(self) -> None:
        store, cfg, prov = self._setup()
        self._snap(store, prov, 0.5)
        row = self._trade(store, prov, price=0.5, ago_s=100_000)
        a = CopyAnalyzer(store, cfg).assess(row, size_value=1_000)
        self.assertIs(a.verdict, Feasibility.STALE)

    def test_future_timestamp_rejected(self) -> None:
        store, cfg, prov = self._setup()
        self._snap(store, prov, 0.5)
        store.add_trade(Trade(id="future", platform="p", market_id="p:m",
                              trader_id=None, ts=utcnow() + timedelta(hours=2),
                              price=0.5, size=100, value=50, side="BUY",
                              outcome="Yes", liquidity=100_000.0), prov)
        row = store.conn.execute(
            "SELECT * FROM trades WHERE id='future'").fetchone()
        a = CopyAnalyzer(store, cfg).assess(row, size_value=1_000)
        self.assertIs(a.verdict, Feasibility.UNKNOWN)
        self.assertTrue(any("FUTURE" in r for r in a.reasons))

    def test_follow_rules_are_conjunctive(self) -> None:
        store, cfg, prov = self._setup()
        self._snap(store, prov, 0.5)
        row = self._trade(store, prov, price=0.5, value=100)
        a = CopyAnalyzer(store, cfg).assess(row, size_value=100)
        # Small trade, unranked trader -> must not pass.
        self.assertFalse(a.follow_rules_pass)


# ------------------------------------------------------------------- risk

class TestRisk(TempMixin):
    def test_position_cap_from_bankroll_not_trade_size(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        cfg.risk.bankroll = 10_000
        cfg.risk.max_position_pct = 0.02
        rm = RiskManager(store, cfg)
        mid = store.markets(limit=1)[0]["id"]
        # Someone else traded $500k; our cap is still 2% of our bankroll.
        verdict = rm.check_new_position("default", mid, 500_000)
        self.assertFalse(verdict.allowed)
        self.assertLessEqual(verdict.max_allowed_notional, 200.0)

    def test_small_position_allowed(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        rm = RiskManager(store, cfg)
        mid = store.markets(limit=1)[0]["id"]
        self.assertTrue(rm.check_new_position("default", mid, 50).allowed)

    def test_correlated_exposure_is_grouped_by_event(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        groups = CorrelationEngine(store, cfg).groups()
        multi = {k: v for k, v in groups.items() if len(v) > 1}
        self.assertGreater(len(multi), 0)
        key = next(iter(multi))
        first = multi[key][0]["market_id"]
        self.assertGreater(len(CorrelationEngine(store, cfg)
                               .correlated_with(first)), 0)

    def test_suggest_size_never_references_other_traders(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        mid = store.markets(limit=1)[0]["id"]
        out = RiskManager(store, cfg).suggest_size(mid)
        self.assertIn("bankroll", out["basis"])
        self.assertIn("unrelated to any other trader", out["caveat"])

    def test_paper_position_blocked_by_limits(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        cfg.risk.bankroll = 1_000
        cfg.risk.max_position_pct = 0.01  # $10 cap
        pf = PaperPortfolio(store, cfg)
        mid = store.markets(limit=1)[0]["id"]
        self.assertIsNone(pf.open_position(mid, "Yes", "BUY", 0.5, 5_000))

    def test_paper_roundtrip(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        cfg.risk.bankroll = 100_000
        pf = PaperPortfolio(store, cfg)
        mid = store.markets(limit=1)[0]["id"]
        pid = pf.open_position(mid, "Yes", "BUY", 0.5, 500)
        self.assertIsNotNone(pid)
        self.assertEqual(pf.mark_to_market()["open_positions"], 1)
        pnl = pf.close_position(pid, 0.7)
        self.assertIsNotNone(pnl)
        self.assertGreater(pnl, 0)
        self.assertEqual(pf.mark_to_market()["closed_positions"], 1)


# --------------------------------------------------------------- simulation

class TestSimulation(TempMixin):
    def test_delay_sweep_covers_requested_delays(self) -> None:
        store, cfg = seeded(self.tmp)
        tid = store.traders()[0]["id"]
        results = CopySimulator(store, cfg).delay_curve(
            tid, delays=[0, 60, 3600])
        self.assertEqual([r.delay_seconds for r in results], [0, 60, 3600])

    def test_fees_reduce_net_below_gross(self) -> None:
        store, cfg = seeded(self.tmp)
        best = None
        for row in store.traders(limit=20):
            r = CopySimulator(store, cfg).simulate(row["id"], size_value=500)
            if r.n_entered > 0:
                best = r
                break
        self.assertIsNotNone(best, "no trader produced simulated entries")
        self.assertGreater(best.fees, 0)
        self.assertAlmostEqual(best.net_pnl, best.gross_pnl - best.fees, places=2)

    def test_simulation_flags_synthetic_input(self) -> None:
        store, cfg = seeded(self.tmp)
        tid = store.traders()[0]["id"]
        r = CopySimulator(store, cfg).simulate(tid)
        self.assertIn(r.source_kind, ("fixture", "synthetic"))
        self.assertTrue(any("not evidence" in n for n in r.notes))


# ---------------------------------------------------------------- backtest

class TestBacktest(TempMixin):
    def test_split_is_chronological_and_disjoint(self) -> None:
        start = datetime(2026, 1, 1, tzinfo=timezone.utc)
        end = datetime(2026, 12, 31, tzinfo=timezone.utc)
        s = Split.chronological(start, end)
        self.assertLess(s.train.end, s.out_of_sample.start)
        self.assertEqual(s.train.end, s.test.start)
        self.assertEqual(s.test.end, s.out_of_sample.start)
        self.assertFalse(s.train.contains(s.out_of_sample.start))

    def test_pit_selection_excludes_later_traders(self) -> None:
        """Traders whose activity starts after the cutoff cannot be selected."""
        store, cfg = seeded(self.tmp)
        engine = BacktestEngine(store, cfg)
        span = engine.data_span()
        self.assertIsNotNone(span)
        cutoff = span[0] + (span[1] - span[0]) * 0.5
        selected = engine.select_traders_pit(cutoff, top_n=10)
        for tid in selected:
            first = store.conn.execute(
                "SELECT MIN(ts) AS lo FROM trades WHERE trader_id=?", (tid,)
            ).fetchone()["lo"]
            self.assertLess(first, cutoff.isoformat())

    def test_backtest_reports_all_three_periods(self) -> None:
        store, cfg = seeded(self.tmp)
        result = BacktestEngine(store, cfg).run("large_trades", size=100)
        for name in ("TRAINING", "TEST", "OUT-OF-SAMPLE"):
            self.assertIn(name, result.periods)
        self.assertTrue(any("urvivorship" in w for w in result.warnings))

    def test_thin_out_of_sample_is_inconclusive(self) -> None:
        store, cfg = seeded(self.tmp)
        result = BacktestEngine(store, cfg).run("follow_traders", size=100)
        oos = result.periods["OUT-OF-SAMPLE"]
        if oos.n_trades < 20:
            self.assertIn("INCONCLUSIVE", result.verdict())

    def test_unknown_strategy_raises(self) -> None:
        store, cfg = seeded(self.tmp)
        with self.assertRaises(KeyError):
            BacktestEngine(store, cfg).run("print_money")

    def test_reliability_label_scales_with_sample(self) -> None:
        from antidote.backtest import PeriodResult
        tiny = PeriodResult(period="X", n_trades=5).finalise([], [], {})
        big = PeriodResult(period="X", n_trades=500).finalise([], [], {})
        self.assertIn("UNRELIABLE", tiny.reliability)
        self.assertIn("INDICATIVE", big.reliability)
        self.assertIn("not predictive", big.reliability)


# ---------------------------------------------------------------- learning

class TestLearning(TempMixin):
    def test_flat_market_is_indeterminate_not_a_win(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        ls = LearningSystem(store, cfg)
        engine = AlertEngine(store, cfg)
        mid = store.markets(limit=1)[0]["id"]
        sig = Signal(kind=SignalKind.TRADER, market_id=mid, confidence=90,
                     direction="YES",
                     provenance=Provenance("api", SourceKind.OFFICIAL_API,
                                           utcnow()))
        sig.evidence = {"market_price_now": 0.50}
        alert = engine.build([sig], kind="large_trade", market_id=mid)
        engine.emit(alert, force=True)

        from antidote.storage import Snapshot
        prov = Provenance("api", SourceKind.OFFICIAL_API, utcnow())
        store.add_snapshot(Snapshot(market_id=mid,
                                    ts=utcnow() + timedelta(hours=25),
                                    price=0.5005), prov)
        review = ls.review_alert(alert.id, horizon_hours=24)
        self.assertIs(review.verdict, Verdict.INDETERMINATE)

    def test_correct_direction_scores_correct(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        ls = LearningSystem(store, cfg)
        engine = AlertEngine(store, cfg)
        mid = store.markets(limit=1)[0]["id"]
        sig = Signal(kind=SignalKind.TRADER, market_id=mid, confidence=90,
                     direction="YES",
                     provenance=Provenance("api", SourceKind.OFFICIAL_API,
                                           utcnow()))
        sig.evidence = {"market_price_now": 0.50}
        alert = engine.build([sig], kind="large_trade", market_id=mid)
        engine.emit(alert, force=True)

        from antidote.storage import Snapshot
        prov = Provenance("api", SourceKind.OFFICIAL_API, utcnow())
        store.add_snapshot(Snapshot(market_id=mid,
                                    ts=utcnow() + timedelta(hours=25),
                                    price=0.72), prov)
        review = ls.review_alert(alert.id, horizon_hours=24)
        self.assertIs(review.verdict, Verdict.CORRECT)
        ls.record(review)
        self.assertEqual(ls.performance()["scorable"], 1)

    def test_hit_rate_withheld_until_sample_is_adequate(self) -> None:
        store, cfg = seeded(self.tmp, history=False)
        self.assertIsNone(LearningSystem(store, cfg).historical_hit_rate())


# ------------------------------------------------------- reports and output

class TestReporting(TempMixin):
    def test_daily_report_carries_synthetic_banner(self) -> None:
        from antidote.report import daily_report
        store, cfg = seeded(self.tmp)
        text = daily_report(store, cfg, hours=24 * 200)
        self.assertIn("NON-REAL DATA", text)
        self.assertIn("ANTIDOTE DAILY MARKET INTELLIGENCE", text)

    def test_resolution_check_surfaces_criteria(self) -> None:
        from antidote.report import resolution_check
        store, _ = seeded(self.tmp, history=False)
        mid = store.markets(limit=1)[0]["id"]
        text = resolution_check(store, mid)
        self.assertIn("RESOLUTION SOURCE", text)
        self.assertIn("POTENTIAL AMBIGUITIES", text)

    def test_dashboard_renders_and_warns(self) -> None:
        from antidote.dashboard import write_dashboard
        store, cfg = seeded(self.tmp)
        out = write_dashboard(store, cfg, path=self.tmp / "d.html")
        html_text = out.read_text()
        self.assertIn("<!doctype html>", html_text)
        self.assertIn("</head>", html_text)
        self.assertIn("NON-REAL DATA", html_text)
        self.assertIn("noindex", html_text)

    def test_trader_profile_states_no_prediction(self) -> None:
        from antidote.report import trader_profile
        store, cfg = seeded(self.tmp, history=False)
        tid = store.traders()[0]["id"]
        text = trader_profile(store, tid, cfg)
        self.assertIn("Past performance does not imply future performance",
                      text)


# --------------------------------------------------------------------- config

class TestConfig(TempMixin):
    def test_roundtrip_preserves_nested_values(self) -> None:
        cfg = Config()
        cfg.thresholds.min_trade_size = 4242.0
        cfg.risk.bankroll = 55_000.0
        cfg.copy.delays_seconds = [0, 7]
        path = self.tmp / "c.json"
        cfg.save(path)
        again = Config.from_dict(__import__("json").loads(path.read_text()))
        self.assertEqual(again.thresholds.min_trade_size, 4242.0)
        self.assertEqual(again.risk.bankroll, 55_000.0)
        self.assertEqual(again.copy.delays_seconds, [0, 7])

    def test_execution_is_off_by_default(self) -> None:
        self.assertFalse(Config().live_execution_enabled)

    def test_thresholds_are_configurable_not_constants(self) -> None:
        cfg = Config()
        cfg.thresholds.large_trade_tiers = [500]
        self.assertEqual(cfg.thresholds.large_trade_tiers, [500])


if __name__ == "__main__":
    unittest.main(verbosity=2)

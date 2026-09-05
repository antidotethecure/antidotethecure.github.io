"""Sections 21-24: backtesting, out-of-sample discipline, survivorship, regimes.

Three properties this engine is built to have:

  * Chronological splits, never random ones.  Random k-fold on time-series data
    leaks the future into the training set and produces beautiful, worthless
    numbers.
  * Point-in-time trader selection.  A trader-following strategy must pick its
    traders using only data available *before* the test period starts.  Ranking
    on the full history and then "testing" on part of it is the single most
    common way a backtest lies (§23).
  * Every result carries the number of trades behind it, because a 300% return
    on nine trades is not a finding.
"""

from __future__ import annotations

import statistics
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Callable, Iterable

from .config import Config
from .provenance import EpistemicClass, SourceKind, utcnow
from .simulate import _max_drawdown
from .storage import Store, parse_ts
from .traders import TraderAnalytics, market_resolution


@dataclass
class Period:
    name: str
    start: datetime
    end: datetime

    @property
    def days(self) -> float:
        return (self.end - self.start).total_seconds() / 86400

    def contains(self, ts: datetime) -> bool:
        return self.start <= ts < self.end


@dataclass
class Split:
    """Section 22: chronological train / test / out-of-sample."""

    train: Period
    test: Period
    out_of_sample: Period

    @classmethod
    def chronological(cls, start: datetime, end: datetime,
                      train_frac: float = 0.5, test_frac: float = 0.25) -> "Split":
        total = (end - start).total_seconds()
        t1 = start + timedelta(seconds=total * train_frac)
        t2 = start + timedelta(seconds=total * (train_frac + test_frac))
        return cls(
            train=Period("TRAINING", start, t1),
            test=Period("TEST", t1, t2),
            out_of_sample=Period("OUT-OF-SAMPLE", t2, end),
        )

    def render(self) -> str:
        return "\n".join(
            f"  {p.name:<14} {p.start:%Y-%m-%d} -> {p.end:%Y-%m-%d} "
            f"({p.days:.0f}d)"
            for p in (self.train, self.test, self.out_of_sample)
        )


@dataclass
class PeriodResult:
    period: str
    n_trades: int = 0
    n_wins: int = 0
    invested: float = 0.0
    gross_pnl: float = 0.0
    fees: float = 0.0
    net_pnl: float = 0.0
    roi: float | None = None
    win_rate: float | None = None
    max_drawdown: float = 0.0
    volatility: float | None = None
    avg_trade: float | None = None
    best_period: str | None = None
    worst_period: str | None = None
    reliability: str = ""

    def finalise(self, curve: list[float], rois: list[float],
                 monthly: dict[str, float]) -> "PeriodResult":
        self.net_pnl = round(self.gross_pnl - self.fees, 4)
        self.gross_pnl = round(self.gross_pnl, 4)
        self.invested = round(self.invested, 4)
        if self.n_trades:
            self.win_rate = round(self.n_wins / self.n_trades, 4)
            self.avg_trade = round(self.net_pnl / self.n_trades, 4)
        if self.invested:
            self.roi = round(self.net_pnl / self.invested, 4)
        self.max_drawdown = _max_drawdown(curve)
        if len(rois) >= 2:
            self.volatility = round(statistics.pstdev(rois), 4)
        if monthly:
            self.best_period = max(monthly, key=lambda k: monthly[k])
            self.worst_period = min(monthly, key=lambda k: monthly[k])
        self.reliability = self._reliability()
        return self

    def _reliability(self) -> str:
        if self.n_trades == 0:
            return "NO DATA: no trades in this period"
        if self.n_trades < 20:
            return (f"UNRELIABLE: {self.n_trades} trades is far too few to "
                    f"distinguish skill from noise")
        if self.n_trades < 60:
            return f"WEAK: {self.n_trades} trades; wide confidence interval"
        return f"INDICATIVE: {self.n_trades} trades; still not predictive"

    def to_dict(self) -> dict[str, Any]:
        return dict(self.__dict__)


@dataclass
class BacktestResult:
    strategy: str
    split: Split
    periods: dict[str, PeriodResult] = field(default_factory=dict)
    params: dict[str, Any] = field(default_factory=dict)
    selected_traders: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    source_kind: str = SourceKind.DERIVED.value

    @property
    def overfit_gap(self) -> float | None:
        """Train ROI minus out-of-sample ROI. Large positive == overfitting."""
        tr = self.periods.get("TRAINING")
        oos = self.periods.get("OUT-OF-SAMPLE")
        if tr and oos and tr.roi is not None and oos.roi is not None:
            return round(tr.roi - oos.roi, 4)
        return None

    def verdict(self) -> str:
        gap = self.overfit_gap
        oos = self.periods.get("OUT-OF-SAMPLE")
        if oos is None or oos.n_trades == 0:
            return "INCONCLUSIVE: no out-of-sample trades"
        if oos.n_trades < 20:
            return (f"INCONCLUSIVE: only {oos.n_trades} out-of-sample trades")
        if oos.roi is not None and oos.roi <= 0:
            return "FAILED OUT-OF-SAMPLE: strategy did not survive unseen data"
        if gap is not None and gap > 0.20:
            return (f"LIKELY OVERFIT: training ROI exceeds out-of-sample by "
                    f"{gap:+.1%}")
        return ("SURVIVED OUT-OF-SAMPLE (this is not a prediction of future "
                "performance)")

    def render(self) -> str:
        lines = [
            f"BACKTEST: {self.strategy}",
            "",
            "PERIODS (§22 - chronological, never randomised):",
            self.split.render(),
            "",
            f"  {'period':<16}{'trades':>7}{'net P&L':>13}{'ROI':>9}"
            f"{'win':>7}{'maxDD':>11}",
            f"  {'-' * 16}{'-' * 7}{'-' * 13}{'-' * 9}{'-' * 7}{'-' * 11}",
        ]
        for name in ("TRAINING", "TEST", "OUT-OF-SAMPLE"):
            r = self.periods.get(name)
            if not r:
                continue
            roi = "n/a" if r.roi is None else f"{r.roi:+.1%}"
            wr = "n/a" if r.win_rate is None else f"{r.win_rate:.0%}"
            lines.append(
                f"  {name:<16}{r.n_trades:>7}{r.net_pnl:>13,.0f}{roi:>9}"
                f"{wr:>7}{r.max_drawdown:>11,.0f}"
            )
        lines.append("")
        for name in ("TRAINING", "TEST", "OUT-OF-SAMPLE"):
            r = self.periods.get(name)
            if r:
                lines.append(f"  {name}: {r.reliability}")
        gap = self.overfit_gap
        if gap is not None:
            lines.append(f"\n  Overfitting gap (train ROI - OOS ROI): {gap:+.1%}")
        lines.append(f"\n  [{EpistemicClass.ANALYSIS.value}] VERDICT: {self.verdict()}")
        for w in self.warnings:
            lines.append(f"  [WARNING] {w}")
        return "\n".join(lines)

    def to_dict(self) -> dict[str, Any]:
        return {
            "strategy": self.strategy,
            "params": self.params,
            "selected_traders": self.selected_traders,
            "periods": {k: v.to_dict() for k, v in self.periods.items()},
            "overfit_gap": self.overfit_gap,
            "verdict": self.verdict(),
            "warnings": self.warnings,
            "source_kind": self.source_kind,
            "split": {
                p.name: {"start": p.start.isoformat(), "end": p.end.isoformat()}
                for p in (self.split.train, self.split.test,
                          self.split.out_of_sample)
            },
        }


# A strategy decides, for one observed trade, whether to take it.
StrategyFn = Callable[[Any, "BacktestEngine", Period], bool]


class BacktestEngine:
    def __init__(self, store: Store, config: Config):
        self.store = store
        self.config = config
        self._resolution_cache: dict[str, str | None] = {}
        self.selected_traders: set[str] = set()

    # ------------------------------------------------------------- resolution

    def resolution(self, market_id: str) -> str | None:
        if market_id not in self._resolution_cache:
            self._resolution_cache[market_id] = market_resolution(
                self.store.get_market(market_id)
            )
        return self._resolution_cache[market_id]

    def data_span(self) -> tuple[datetime, datetime] | None:
        row = self.store.conn.execute(
            "SELECT MIN(ts) AS lo, MAX(ts) AS hi FROM trades"
        ).fetchone()
        lo, hi = parse_ts(row["lo"]), parse_ts(row["hi"])
        return (lo, hi) if lo and hi else None

    # ---------------------------------------------------- trader preselection

    def select_traders_pit(self, as_of: datetime, *, top_n: int = 10,
                           method: str = "risk_adjusted",
                           lookback_days: int = 90) -> list[str]:
        """Point-in-time trader selection using only pre-`as_of` data (§23).

        This is what keeps a trader-following backtest honest.  Selecting on the
        full history and testing on a slice of it guarantees the "chosen"
        traders are the ones who happened to win in the test period.
        """
        from .ranking import RankingEngine

        analytics = TraderAnalytics(self.store)
        metrics: dict[str, Any] = {}
        for row in self.store.traders(limit=100_000):
            m = analytics.compute(row["id"], window_days=lookback_days,
                                  now=as_of)
            # Drop anyone whose observed activity begins after the cutoff.
            if m.n_trades > 0 and m.first_trade and \
                    parse_ts(m.first_trade) and parse_ts(m.first_trade) < as_of:
                metrics[row["id"]] = m
        ranked = RankingEngine(self.store, self.config).rank(
            metrics, method, lookback_days, limit=top_n
        )
        return [r.trader_id for r in ranked]

    # --------------------------------------------------------------- strategies

    def strategy_follow_traders(self, trader_ids: Iterable[str]) -> StrategyFn:
        ids = set(trader_ids)

        def fn(trade: Any, _engine: "BacktestEngine", _period: Period) -> bool:
            return trade["trader_id"] in ids
        return fn

    def strategy_large_trades(self, min_value: float | None = None) -> StrategyFn:
        floor = min_value or self.config.thresholds.min_trade_size

        def fn(trade: Any, _engine: "BacktestEngine", _period: Period) -> bool:
            return (trade["value"] or 0.0) >= floor
        return fn

    def strategy_momentum(self, lookback_hours: float = 24.0,
                          threshold: float = 0.05) -> StrategyFn:
        def fn(trade: Any, engine: "BacktestEngine", _period: Period) -> bool:
            ts = parse_ts(trade["ts"])
            if ts is None:
                return False
            prior = engine.store.conn.execute(
                "SELECT price FROM market_snapshots WHERE market_id = ? "
                "AND ts <= ? ORDER BY ts DESC LIMIT 1",
                (trade["market_id"],
                 (ts - timedelta(hours=lookback_hours)).isoformat()),
            ).fetchone()
            if not prior or prior["price"] is None:
                return False
            return (trade["price"] - prior["price"]) >= threshold
        return fn

    def strategy_contrarian(self, lookback_hours: float = 24.0,
                            threshold: float = 0.05) -> StrategyFn:
        momentum = self.strategy_momentum(lookback_hours, threshold)

        def fn(trade: Any, engine: "BacktestEngine", period: Period) -> bool:
            return not momentum(trade, engine, period)
        return fn

    def strategy_multi_signal(self, trader_ids: Iterable[str],
                              min_value: float | None = None) -> StrategyFn:
        follow = self.strategy_follow_traders(trader_ids)
        large = self.strategy_large_trades(min_value)

        def fn(trade: Any, engine: "BacktestEngine", period: Period) -> bool:
            return follow(trade, engine, period) and large(trade, engine, period)
        return fn

    STRATEGIES = {
        "follow_traders", "large_trades", "momentum", "contrarian",
        "multi_signal",
    }

    # ------------------------------------------------------------------- run

    def run_period(self, strategy: StrategyFn, period: Period, *,
                   size: float = 100.0, delay_seconds: float = 30.0
                   ) -> PeriodResult:
        result = PeriodResult(period=period.name)
        rows = self.store.conn.execute(
            "SELECT * FROM trades WHERE ts >= ? AND ts < ? ORDER BY ts ASC",
            (period.start.isoformat(), period.end.isoformat()),
        ).fetchall()

        curve: list[float] = []
        rois: list[float] = []
        monthly: dict[str, float] = defaultdict(float)
        running = 0.0
        fee_rate = self.config.copy.fee_rate

        for trade in rows:
            if (trade["side"] or "BUY").upper() not in ("BUY", "B", "BID"):
                continue
            if not strategy(trade, self, period):
                continue

            resolved = self.resolution(trade["market_id"])
            if resolved is None:
                continue  # cannot score an unresolved market

            ts = parse_ts(trade["ts"])
            if ts is None:
                continue
            # Charge the delayed fill price, not the observed one.
            fill_row = self.store.conn.execute(
                "SELECT price FROM market_snapshots WHERE market_id = ? "
                "AND price IS NOT NULL AND ts >= ? ORDER BY ts ASC LIMIT 1",
                (trade["market_id"],
                 (ts + timedelta(seconds=delay_seconds)).isoformat()),
            ).fetchone()
            fill = fill_row["price"] if fill_row else trade["price"]
            if not fill or fill <= 0 or fill >= 1:
                continue

            shares = size / fill
            payout = 1.0 if (trade["outcome"] or "").lower() == resolved.lower() \
                else 0.0
            gross = (payout - fill) * shares
            fees = size * fee_rate
            net = gross - fees

            result.n_trades += 1
            result.invested += size
            result.gross_pnl += gross
            result.fees += fees
            if net > 0:
                result.n_wins += 1
            running += net
            curve.append(running)
            rois.append(net / size)
            monthly[f"{ts:%Y-%m}"] += net

        return result.finalise(curve, rois, dict(monthly))

    def run(self, strategy_name: str, *, size: float = 100.0,
            delay_seconds: float = 30.0, top_n: int = 10,
            train_frac: float = 0.5, test_frac: float = 0.25,
            **params: Any) -> BacktestResult:
        span = self.data_span()
        if span is None:
            raise ValueError("no trades in store: nothing to backtest")
        split = Split.chronological(span[0], span[1], train_frac, test_frac)

        warnings: list[str] = []
        selected: list[str] = []

        # Trader-following strategies must pick their traders using only data
        # from before the test period begins.
        if strategy_name in ("follow_traders", "multi_signal"):
            selected = self.select_traders_pit(
                split.train.end, top_n=top_n,
                method=params.get("method", "risk_adjusted"),
            )
            if not selected:
                warnings.append(
                    "no traders qualified on training data alone; the strategy "
                    "has nothing to follow out-of-sample"
                )
            strategy = (self.strategy_follow_traders(selected)
                        if strategy_name == "follow_traders"
                        else self.strategy_multi_signal(
                            selected, params.get("min_value")))
        elif strategy_name == "large_trades":
            strategy = self.strategy_large_trades(params.get("min_value"))
        elif strategy_name == "momentum":
            strategy = self.strategy_momentum(
                params.get("lookback_hours", 24.0), params.get("threshold", 0.05))
        elif strategy_name == "contrarian":
            strategy = self.strategy_contrarian(
                params.get("lookback_hours", 24.0), params.get("threshold", 0.05))
        else:
            raise KeyError(
                f"unknown strategy '{strategy_name}'. "
                f"Known: {', '.join(sorted(self.STRATEGIES))}"
            )

        result = BacktestResult(
            strategy=strategy_name, split=split, selected_traders=selected,
            params={"size": size, "delay_seconds": delay_seconds,
                    "top_n": top_n, **params},
            source_kind=self.store.dominant_source_kind().value,
        )
        for period in (split.train, split.test, split.out_of_sample):
            result.periods[period.name] = self.run_period(
                strategy, period, size=size, delay_seconds=delay_seconds
            )

        warnings.append(
            "Survivorship bias (§23): only traders present in the stored feed "
            "can be selected. Traders who blew up and left are absent."
        )
        warnings.append(
            "Only resolved markets are scored; open positions are excluded, "
            "which biases toward faster-resolving markets."
        )
        if result.source_kind in ("synthetic", "fixture"):
            warnings.append(
                "SYNTHETIC DATA: this backtest measures engine behaviour, not "
                "any real strategy's performance."
            )
        result.warnings = warnings

        self.store.save_backtest(
            f"bt-{uuid.uuid4().hex[:10]}", strategy_name, result.params,
            result.to_dict(), SourceKind(result.source_kind)
            if result.source_kind in {k.value for k in SourceKind}
            else SourceKind.DERIVED,
        )
        return result

    # ---------------------------------------------------------------- regimes

    def regime_analysis(self, strategy_name: str, *, size: float = 100.0,
                        **params: Any) -> dict[str, PeriodResult]:
        """Section 24: does performance hold across market conditions?

        Regimes are cut by realised volatility of the traded markets, which is
        observable.  Election periods and sports seasons need a calendar the
        system does not have; those are left to the operator to supply rather
        than guessed at.
        """
        span = self.data_span()
        if span is None:
            return {}
        if strategy_name == "large_trades":
            strategy = self.strategy_large_trades(params.get("min_value"))
        elif strategy_name == "momentum":
            strategy = self.strategy_momentum()
        elif strategy_name == "contrarian":
            strategy = self.strategy_contrarian()
        else:
            traders = self.select_traders_pit(
                span[0] + (span[1] - span[0]) / 2, top_n=params.get("top_n", 10)
            )
            strategy = self.strategy_follow_traders(traders)

        vol = self._market_volatility()
        if not vol:
            return {}
        median_vol = statistics.median(vol.values())
        high = {m for m, v in vol.items() if v >= median_vol}

        out: dict[str, PeriodResult] = {}
        for label, keep in (("HIGH VOLATILITY", high),
                            ("LOW VOLATILITY", set(vol) - high)):
            def scoped(trade: Any, engine: "BacktestEngine", period: Period,
                       _keep: set[str] = keep) -> bool:
                return trade["market_id"] in _keep and strategy(trade, engine, period)
            out[label] = self.run_period(
                scoped, Period(label, span[0], span[1]), size=size
            )
        return out

    def _market_volatility(self) -> dict[str, float]:
        rows = self.store.conn.execute(
            "SELECT market_id, price FROM market_snapshots "
            "WHERE price IS NOT NULL ORDER BY market_id, ts"
        ).fetchall()
        series: dict[str, list[float]] = defaultdict(list)
        for r in rows:
            series[r["market_id"]].append(r["price"])
        return {m: statistics.pstdev(v) for m, v in series.items() if len(v) >= 3}

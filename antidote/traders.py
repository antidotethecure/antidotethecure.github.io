"""Section 3: trader intelligence.

Metrics are computed from observed trades by FIFO lot accounting, not taken on
faith from a platform leaderboard.  Two honesty constraints shape the code:

  * Every metric records whether it was fully calculable.  Unrealized P&L needs
    a current mark; win rate needs closed lots; hold time needs matched
    entries and exits.  When an input is missing the metric is None, never zero.
  * Small samples are shrunk toward the population mean before ranking (§4), so
    a trader who is 3-for-3 does not outrank one who is 260-for-400.
"""

from __future__ import annotations

import math
import statistics
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Iterable

from .provenance import SourceKind, utcnow
from .storage import Store, parse_ts


@dataclass
class Lot:
    price: float
    size: float
    ts: datetime


@dataclass
class ClosedLot:
    market_id: str
    outcome: str | None
    entry_price: float
    exit_price: float
    size: float
    opened_at: datetime
    closed_at: datetime
    settled: bool  # True == closed by market resolution rather than by a sale

    @property
    def pnl(self) -> float:
        return round((self.exit_price - self.entry_price) * self.size, 6)

    @property
    def cost(self) -> float:
        return round(self.entry_price * self.size, 6)

    @property
    def roi(self) -> float | None:
        return round(self.pnl / self.cost, 6) if self.cost else None

    @property
    def hold_seconds(self) -> float:
        return max(0.0, (self.closed_at - self.opened_at).total_seconds())


@dataclass
class TraderMetrics:
    """Section 3 record. `None` means not calculable from observed data."""

    trader_id: str
    window_days: int
    n_trades: int = 0
    total_volume: float = 0.0
    n_closed_lots: int = 0
    n_open_lots: int = 0
    win_rate: float | None = None
    realized_pnl: float | None = None
    unrealized_pnl: float | None = None
    roi: float | None = None
    avg_trade_size: float | None = None
    avg_position_size: float | None = None
    avg_hold_seconds: float | None = None
    trade_frequency_per_day: float | None = None
    active_days: int = 0
    first_trade: str | None = None
    last_trade: str | None = None
    markets_traded: int = 0
    categories: dict[str, int] = field(default_factory=dict)
    concentration_hhi: float | None = None
    best_trade: float | None = None
    worst_trade: float | None = None
    max_drawdown: float | None = None
    pnl_volatility: float | None = None
    risk_adjusted: float | None = None
    consistency: float | None = None
    # Honesty flags
    unrealized_priced: int = 0
    unrealized_unpriced: int = 0
    source_kind: str = SourceKind.DERIVED.value
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {k: v for k, v in self.__dict__.items()}


def market_resolution(row: Any) -> str | None:
    """Resolved outcome for a market, or None if unresolved/unknown.

    Kept generic: reads the platform's raw payload for the handful of shapes the
    supported platforms use. Never guesses from price alone.
    """
    if row is None:
        return None
    if (row["status"] or "").lower() not in ("closed", "resolved", "settled",
                                             "finalized"):
        return None
    import json
    try:
        raw = json.loads(row["raw"] or "{}")
    except (json.JSONDecodeError, TypeError):
        raw = {}
    for key in ("resolved_outcome", "resolvedOutcome", "outcome", "result",
                "settlement_result", "winning_outcome"):
        val = raw.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


class TraderAnalytics:
    def __init__(self, store: Store):
        self.store = store
        self._market_cache: dict[str, Any] = {}

    def _market(self, market_id: str) -> Any:
        if market_id not in self._market_cache:
            self._market_cache[market_id] = self.store.get_market(market_id)
        return self._market_cache[market_id]

    def _mark(self, market_id: str) -> float | None:
        snap = self.store.latest_snapshot(market_id)
        return snap["price"] if snap else None

    # ---------------------------------------------------------------- compute

    def compute(self, trader_id: str, window_days: int = 90,
                now: datetime | None = None) -> TraderMetrics:
        now = now or utcnow()
        since = now - timedelta(days=window_days)
        rows = self.store.trades(trader_id=trader_id, since=since, limit=100_000)
        m = TraderMetrics(trader_id=trader_id, window_days=window_days)
        if not rows:
            m.notes.append("no observed trades in window")
            return m

        kinds = {r["source_kind"] for r in rows}
        for weak in (SourceKind.SYNTHETIC.value, SourceKind.FIXTURE.value):
            if weak in kinds:
                m.source_kind = weak
                m.notes.append(
                    "computed from non-real data; not evidence about any person"
                )
                break

        rows = sorted(rows, key=lambda r: r["ts"])
        m.n_trades = len(rows)
        m.total_volume = round(sum(r["value"] or 0.0 for r in rows), 4)
        m.avg_trade_size = round(m.total_volume / m.n_trades, 4)

        timestamps = [parse_ts(r["ts"]) for r in rows]
        timestamps = [t for t in timestamps if t]
        if timestamps:
            m.first_trade = timestamps[0].isoformat()
            m.last_trade = timestamps[-1].isoformat()
            m.active_days = len({t.date() for t in timestamps})
            span_days = max(1.0, (timestamps[-1] - timestamps[0]).total_seconds() / 86400)
            m.trade_frequency_per_day = round(m.n_trades / span_days, 4)

        closed, open_lots = self._account(rows, now)
        m.n_closed_lots = len(closed)
        m.n_open_lots = sum(len(v) for v in open_lots.values())
        m.markets_traded = len({r["market_id"] for r in rows})

        # Category mix and concentration (§3).
        cat_value: dict[str, float] = defaultdict(float)
        for r in rows:
            mk = self._market(r["market_id"])
            cat = (mk["category"] if mk else None) or "unknown"
            cat_value[cat] += r["value"] or 0.0
        m.categories = {k: round(v, 2) for k, v in
                        sorted(cat_value.items(), key=lambda kv: -kv[1])}
        total = sum(cat_value.values())
        if total > 0:
            m.concentration_hhi = round(
                sum((v / total) ** 2 for v in cat_value.values()), 4
            )

        if closed:
            pnls = [c.pnl for c in closed]
            costs = [c.cost for c in closed]
            wins = [p for p in pnls if p > 0]
            m.realized_pnl = round(sum(pnls), 4)
            m.win_rate = round(len(wins) / len(pnls), 4)
            m.best_trade = round(max(pnls), 4)
            m.worst_trade = round(min(pnls), 4)
            invested = sum(costs)
            m.roi = round(m.realized_pnl / invested, 4) if invested else None
            m.avg_position_size = round(invested / len(closed), 4)
            m.avg_hold_seconds = round(
                statistics.fmean(c.hold_seconds for c in closed), 2
            )
            m.max_drawdown = self._max_drawdown(pnls)
            if len(pnls) >= 2:
                m.pnl_volatility = round(statistics.pstdev(pnls), 4)
                m.risk_adjusted = self._risk_adjusted(closed)
                m.consistency = self._consistency(closed)
        else:
            m.notes.append("no closed lots: realized P&L and win rate not calculable")

        # Unrealized P&L needs a current mark for every open lot; count both
        # priced and unpriced so the caller can see how complete the figure is.
        unreal = 0.0
        for (market_id, _outcome), lots in open_lots.items():
            mark = self._mark(market_id)
            for lot in lots:
                if mark is None:
                    m.unrealized_unpriced += 1
                    continue
                m.unrealized_priced += 1
                unreal += (mark - lot.price) * lot.size
        if m.unrealized_priced:
            m.unrealized_pnl = round(unreal, 4)
            if m.unrealized_unpriced:
                m.notes.append(
                    f"unrealized P&L covers {m.unrealized_priced} of "
                    f"{m.unrealized_priced + m.unrealized_unpriced} open lots"
                )
        elif m.n_open_lots:
            m.notes.append("open lots present but no current marks available")

        return m

    def _account(self, rows: Iterable[Any], now: datetime
                 ) -> tuple[list[ClosedLot], dict[tuple[str, str], list[Lot]]]:
        """FIFO lot matching per (market, outcome), settling at resolution."""
        books: dict[tuple[str, str], deque[Lot]] = defaultdict(deque)
        closed: list[ClosedLot] = []

        for r in rows:
            ts = parse_ts(r["ts"])
            if ts is None:
                continue
            key = (r["market_id"], r["outcome"] or "")
            side = (r["side"] or "BUY").upper()
            price = r["price"]
            size = r["size"] or 0.0
            if size <= 0:
                continue

            if side in ("BUY", "B", "BID"):
                books[key].append(Lot(price=price, size=size, ts=ts))
                continue

            # SELL consumes open lots FIFO; unmatched sells are ignored rather
            # than treated as shorts, since the public feed does not always show
            # the opening side.
            remaining = size
            while remaining > 1e-9 and books[key]:
                lot = books[key][0]
                matched = min(remaining, lot.size)
                closed.append(ClosedLot(
                    market_id=r["market_id"], outcome=r["outcome"],
                    entry_price=lot.price, exit_price=price, size=matched,
                    opened_at=lot.ts, closed_at=ts, settled=False,
                ))
                lot.size -= matched
                remaining -= matched
                if lot.size <= 1e-9:
                    books[key].popleft()

        # Settle whatever is still open in markets that have resolved.
        still_open: dict[tuple[str, str], list[Lot]] = {}
        for key, lots in books.items():
            market_id, outcome = key
            mk = self._market(market_id)
            resolved = market_resolution(mk)
            if resolved is None:
                if lots:
                    still_open[key] = list(lots)
                continue
            payout = 1.0 if (outcome or "").lower() == resolved.lower() else 0.0
            close_ts = parse_ts(mk["resolution_date"]) or parse_ts(mk["close_time"]) or now
            for lot in lots:
                closed.append(ClosedLot(
                    market_id=market_id, outcome=outcome,
                    entry_price=lot.price, exit_price=payout, size=lot.size,
                    opened_at=lot.ts, closed_at=close_ts, settled=True,
                ))
        return closed, still_open

    @staticmethod
    def _max_drawdown(pnls: list[float]) -> float:
        """Largest peak-to-trough decline of the cumulative realized curve."""
        peak = 0.0
        equity = 0.0
        worst = 0.0
        for p in pnls:
            equity += p
            peak = max(peak, equity)
            worst = min(worst, equity - peak)
        return round(worst, 4)

    @staticmethod
    def _risk_adjusted(closed: list[ClosedLot]) -> float | None:
        """Sharpe-like ratio on per-lot ROI. Not an annualised Sharpe.

        Prediction-market trades have irregular horizons and no risk-free leg,
        so this is a comparability statistic between traders, nothing more.
        """
        rois = [c.roi for c in closed if c.roi is not None]
        if len(rois) < 2:
            return None
        sd = statistics.pstdev(rois)
        if sd == 0:
            return None
        return round(statistics.fmean(rois) / sd * math.sqrt(len(rois)), 4)

    @staticmethod
    def _consistency(closed: list[ClosedLot]) -> float | None:
        """Share of calendar months in profit. Rewards steadiness over one hit."""
        if not closed:
            return None
        buckets: dict[tuple[int, int], float] = defaultdict(float)
        for c in closed:
            buckets[(c.closed_at.year, c.closed_at.month)] += c.pnl
        if len(buckets) < 2:
            return None
        positive = sum(1 for v in buckets.values() if v > 0)
        return round(positive / len(buckets), 4)

    # ------------------------------------------------------------------ batch

    def compute_all(self, window_days: int = 90, *, min_trades: int = 1,
                    now: datetime | None = None) -> dict[str, TraderMetrics]:
        out: dict[str, TraderMetrics] = {}
        for row in self.store.traders(limit=100_000):
            m = self.compute(row["id"], window_days=window_days, now=now)
            if m.n_trades >= min_trades:
                out[row["id"]] = m
        return out

    def persist(self, metrics: dict[str, TraderMetrics], window_days: int) -> None:
        with self.store.tx():
            for trader_id, m in metrics.items():
                self.store.save_metrics(
                    trader_id, window_days, m.to_dict(),
                    SourceKind(m.source_kind) if m.source_kind in
                    {k.value for k in SourceKind} else SourceKind.DERIVED,
                )

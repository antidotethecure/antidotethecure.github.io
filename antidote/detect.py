"""Detection: sections 7, 8, 27, 28, 29 and 35.

Order matters here.  Every detector runs its candidate through the §35
false-signal filters *before* emitting, because the cheapest alert to handle is
the one that was never raised.  Suppressed candidates are retained with their
suppression reason rather than dropped silently, so the filters themselves can
be audited.
"""

from __future__ import annotations

import statistics
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Iterable

from .config import Config
from .provenance import EpistemicClass, Provenance, SourceKind, utcnow
from .signals import Signal, SignalKind, saturating, score_signal
from .storage import Store, parse_ts
from .traders import TraderMetrics


@dataclass
class MarketContext:
    """Everything a detector needs to judge one market, fetched once."""

    market_id: str
    question: str
    category: str | None
    status: str
    close_time: datetime | None
    price: float | None
    liquidity: float | None
    volume: float | None
    open_interest: float | None
    spread: float | None
    prov: Provenance
    price_history: list[tuple[datetime, float]]
    volume_history: list[float]
    first_seen: datetime | None

    @property
    def minutes_to_close(self) -> float | None:
        if self.close_time is None:
            return None
        return (self.close_time - utcnow()).total_seconds() / 60.0

    @property
    def age_hours(self) -> float | None:
        """How much observation history backs this market.

        Measured from the earliest price observation rather than from the row's
        insert time: the guard exists to catch markets with no baseline to
        compare against, and backfilled history is a baseline. Falling back to
        first_seen keeps cold-start markets correctly flagged.
        """
        earliest = self.price_history[0][0] if self.price_history else self.first_seen
        if earliest is None:
            return None
        return (utcnow() - earliest).total_seconds() / 3600.0


def _describe_performance(tm: TraderMetrics | None) -> str:
    """One-line observed performance summary for the §10 alert field."""
    if tm is None or tm.n_trades == 0:
        return "not calculable from observed data"
    bits: list[str] = []
    if tm.realized_pnl is not None:
        bits.append(f"realized P&L {tm.realized_pnl:+,.0f} over "
                    f"{tm.n_closed_lots} closed lots")
    if tm.roi is not None:
        bits.append(f"ROI {tm.roi:+.1%}")
    if tm.win_rate is not None:
        bits.append(f"win rate {tm.win_rate:.0%}")
    if tm.max_drawdown is not None:
        bits.append(f"max drawdown {tm.max_drawdown:,.0f}")
    if not bits:
        return (f"{tm.n_trades} observed trades in window; P&L not calculable "
                f"(no closed lots)")
    return (f"{'; '.join(bits)} [{tm.window_days}d window] "
            f"- past performance does not imply future performance")


class FalseSignalFilter:
    """Section 35. Returns a list of reasons a candidate should be suppressed."""

    def __init__(self, config: Config):
        self.t = config.thresholds

    def check(self, ctx: MarketContext, *, trade_value: float | None = None,
              price: float | None = None, data_confidence: float = 1.0,
              duplicate: bool = False) -> list[str]:
        reasons: list[str] = []

        if trade_value is not None and trade_value < self.t.min_trade_size:
            reasons.append(
                f"trade value {trade_value:,.0f} below min_trade_size "
                f"{self.t.min_trade_size:,.0f}"
            )
        if ctx.liquidity is not None and ctx.liquidity < self.t.min_liquidity:
            reasons.append(
                f"illiquid market (liquidity {ctx.liquidity:,.0f} < "
                f"{self.t.min_liquidity:,.0f})"
            )
        if ctx.liquidity is None:
            reasons.append("liquidity unknown: cannot rule out an illiquid print")

        p = price if price is not None else ctx.price
        if p is not None:
            if p >= self.t.max_price_for_signal:
                reasons.append(
                    f"price {p:.3f} is at the resolved end of the book; moves "
                    f"here are settlement mechanics, not information"
                )
            elif p <= self.t.min_price_for_signal:
                reasons.append(f"price {p:.3f} too close to zero to be informative")

        mins = ctx.minutes_to_close
        if mins is not None:
            if mins < 0:
                reasons.append("market already past close")
            elif mins < self.t.ignore_within_minutes_of_close:
                reasons.append(
                    f"within {mins:.1f} min of close (< "
                    f"{self.t.ignore_within_minutes_of_close})"
                )
        if ctx.status != "open":
            reasons.append(f"market status is '{ctx.status}', not open")

        age = ctx.age_hours
        if age is not None and age < self.t.min_market_age_hours:
            reasons.append(
                f"market first seen {age:.1f}h ago; no baseline to compare against"
            )
        if ctx.prov.is_stale:
            reasons.append(f"stale data: {ctx.prov.describe()}")
        if data_confidence < 0.35:
            reasons.append(f"data confidence {data_confidence:.0%} too low")
        if duplicate:
            reasons.append("duplicate of a trade already processed")
        return reasons


class Detector:
    def __init__(self, store: Store, config: Config,
                 metrics: dict[str, TraderMetrics] | None = None,
                 ranks: dict[str, int] | None = None):
        self.store = store
        self.config = config
        self.metrics = metrics or {}
        self.ranks = ranks or {}
        self.filter = FalseSignalFilter(config)
        self._ctx_cache: dict[str, MarketContext] = {}

    # ---------------------------------------------------------------- context

    def context(self, market_id: str) -> MarketContext | None:
        if market_id in self._ctx_cache:
            return self._ctx_cache[market_id]
        row = self.store.get_market(market_id)
        if row is None:
            return None
        snaps = self.store.snapshots(market_id, limit=200)
        latest = snaps[0] if snaps else None

        prov = Provenance(
            source=latest["source"] if latest else row["source"],
            source_kind=SourceKind(latest["source_kind"] if latest
                                   else row["source_kind"]),
            fetched_at=parse_ts(latest["fetched_at"]) if latest else utcnow(),
            as_of=parse_ts(latest["ts"]) if latest else None,
            endpoint="market_snapshots",
        )
        history = [(parse_ts(s["ts"]), s["price"]) for s in reversed(snaps)
                   if s["price"] is not None and parse_ts(s["ts"])]
        vols = [s["volume_24h"] for s in reversed(snaps)
                if s["volume_24h"] is not None]

        ctx = MarketContext(
            market_id=market_id,
            question=row["question"],
            category=row["category"],
            status=row["status"],
            close_time=parse_ts(row["close_time"]),
            price=latest["price"] if latest else None,
            liquidity=latest["liquidity"] if latest else None,
            volume=latest["volume"] if latest else None,
            open_interest=latest["open_interest"] if latest else None,
            spread=latest["spread"] if latest else None,
            prov=prov,
            price_history=history,
            volume_history=vols,
            first_seen=parse_ts(row["first_seen"]),
        )
        self._ctx_cache[market_id] = ctx
        return ctx

    # --------------------------------------------------------- large trades

    def large_trades(self, since: datetime | None = None,
                     limit: int = 500) -> list[Signal]:
        """Section 7. Tiers are configuration, not universal truths."""
        since = since or utcnow() - timedelta(hours=24)
        tiers = sorted(self.config.thresholds.large_trade_tiers)
        floor = min(tiers) if tiers else self.config.thresholds.min_trade_size
        rows = self.store.trades(since=since, min_value=floor, limit=limit)

        signals: list[Signal] = []
        seen: set[tuple[str, str, float, float]] = set()
        for r in rows:
            ctx = self.context(r["market_id"])
            if ctx is None:
                continue
            ts = parse_ts(r["ts"]) or utcnow()

            # Near-identical prints inside the dedupe window are one event.
            bucket = round(ts.timestamp() /
                           max(1.0, self.config.thresholds.duplicate_window_seconds))
            key = (r["market_id"], r["trader_id"] or "-", r["price"], bucket)
            duplicate = key in seen
            seen.add(key)

            value = r["value"] or 0.0
            tier = max((t for t in tiers if value >= t), default=None)
            if tier is None:
                continue

            tm = self.metrics.get(r["trader_id"] or "")
            tmd = tm.to_dict() if tm else None
            rank = self.ranks.get(r["trader_id"] or "")

            sig = Signal(
                kind=SignalKind.TRADER if r["trader_id"] else SignalKind.UNUSUAL,
                market_id=r["market_id"],
                trader_id=r["trader_id"],
                ts=ts,
                direction=(r["outcome"] or "").upper() or None,
                provenance=ctx.prov,
                evidence={
                    "trade_id": r["id"], "value": round(value, 2),
                    "tier_crossed": tier, "price": r["price"], "size": r["size"],
                    "side": r["side"], "outcome": r["outcome"],
                    "market_price_now": ctx.price, "liquidity": ctx.liquidity,
                    "trader_rank": rank, "question": ctx.question,
                    "price_before": r["price_before"],
                    "price_after": r["price_after"],
                    "volume": r["volume_before"] or ctx.volume,
                    "trader_performance": _describe_performance(tm),
                },
            )
            sig.interpretation = (
                f"A trade of ${value:,.0f} crossed the ${tier:,.0f} tier"
                + (f" by a trader currently ranked #{rank}" if rank else
                   " by an unranked or anonymous participant")
                + ". Size alone does not indicate information."
            )
            sig.interpretation_class = EpistemicClass.ANALYSIS
            if not r["trader_id"]:
                sig.contrary.append(
                    "Counterparty is anonymous on this platform: no trader "
                    "history can be attached to this print."
                )
            if tm and tm.realized_pnl is not None and tm.realized_pnl < 0:
                sig.contrary.append(
                    f"This trader's realized P&L over the window is "
                    f"{tm.realized_pnl:,.0f}."
                )

            sig.suppressed_by = self.filter.check(
                ctx, trade_value=value, price=r["price"],
                data_confidence=ctx.prov.confidence(), duplicate=duplicate,
            )
            score_signal(
                sig, data_confidence=ctx.prov.confidence(),
                trader_metrics=tmd, trade_value=value, liquidity=ctx.liquidity,
                thresholds=self.config.thresholds,
                historical_hit_rate=self._historical_hit_rate(),
            )
            signals.append(sig)
        return signals

    # -------------------------------------------------------- market movement

    def market_movements(self, limit: int = 200) -> list[Signal]:
        """Section 27: price moves, volume spikes, liquidity and spread changes."""
        out: list[Signal] = []
        t = self.config.thresholds
        for row in self.store.markets(status="open", limit=limit):
            ctx = self.context(row["id"])
            if ctx is None or len(ctx.price_history) < 3:
                continue

            first_price = ctx.price_history[0][1]
            last_price = ctx.price_history[-1][1]
            move = last_price - first_price

            if abs(move) >= t.price_move_threshold:
                sig = Signal(
                    kind=SignalKind.PRICE, market_id=ctx.market_id,
                    direction="YES" if move > 0 else "NO", provenance=ctx.prov,
                    evidence={
                        "price_from": first_price, "price_to": last_price,
                        "move": round(move, 4),
                        "observations": len(ctx.price_history),
                        "window_start": ctx.price_history[0][0].isoformat(),
                    },
                )
                sig.interpretation = (
                    f"Implied probability moved {move:+.1%} across "
                    f"{len(ctx.price_history)} observations."
                )
                sig.contrary.append(
                    "A price move is not itself evidence of mispricing; it may "
                    "be the market correctly repricing public news."
                )
                sig.suppressed_by = self.filter.check(
                    ctx, data_confidence=ctx.prov.confidence()
                )
                score_signal(sig, data_confidence=ctx.prov.confidence(),
                             price_move=move, liquidity=ctx.liquidity,
                             thresholds=t,
                             historical_hit_rate=self._historical_hit_rate())
                out.append(sig)

            # Volume spike against the trailing median.
            if len(ctx.volume_history) >= 5:
                baseline = statistics.median(ctx.volume_history[:-1])
                current = ctx.volume_history[-1]
                if baseline > 0:
                    ratio = current / baseline
                    if ratio >= t.volume_spike_threshold:
                        sig = Signal(
                            kind=SignalKind.VOLUME, market_id=ctx.market_id,
                            provenance=ctx.prov,
                            evidence={"volume_now": current,
                                      "baseline_median": round(baseline, 2),
                                      "ratio": round(ratio, 2)},
                        )
                        sig.interpretation = (
                            f"24h volume is {ratio:.1f}x the trailing median."
                        )
                        sig.suppressed_by = self.filter.check(
                            ctx, data_confidence=ctx.prov.confidence()
                        )
                        score_signal(sig, data_confidence=ctx.prov.confidence(),
                                     volume_ratio=ratio, liquidity=ctx.liquidity,
                                     thresholds=t,
                                     historical_hit_rate=self._historical_hit_rate())
                        out.append(sig)
        return out

    # ------------------------------------------------- consensus and conflict

    def consensus(self, window_minutes: int = 240, min_traders: int = 2,
                  since: datetime | None = None) -> list[Signal]:
        """Sections 28 and 29.

        Several independently ranked traders entering the same market inside one
        window is a consensus signal; the same traders taking opposite sides is
        a conflict signal.  Both are reported.  Neither is a trade instruction.
        """
        since = since or utcnow() - timedelta(minutes=window_minutes)
        watched = set(self.ranks)
        if not watched:
            return []

        rows = self.store.trades(since=since, limit=5000)
        by_market: dict[str, list[Any]] = defaultdict(list)
        for r in rows:
            if r["trader_id"] in watched:
                by_market[r["market_id"]].append(r)

        out: list[Signal] = []
        for market_id, trades in by_market.items():
            traders = {r["trader_id"] for r in trades}
            if len(traders) < min_traders:
                continue
            ctx = self.context(market_id)
            if ctx is None:
                continue

            sides: dict[str, float] = defaultdict(float)
            per_trader_side: dict[str, str] = {}
            for r in trades:
                leg = (r["outcome"] or "?").upper()
                signed = leg if (r["side"] or "BUY").upper() in ("BUY", "B") \
                    else f"NOT {leg}"
                sides[signed] += r["value"] or 0.0
                per_trader_side[r["trader_id"]] = signed

            distinct_sides = set(per_trader_side.values())
            combined = round(sum(sides.values()), 2)
            detail = {
                "n_traders": len(traders),
                "combined_estimated_value": combined,
                "by_side": {k: round(v, 2) for k, v in sides.items()},
                "traders": [
                    {"trader_id": tid, "rank": self.ranks.get(tid),
                     "side": per_trader_side[tid]}
                    for tid in sorted(traders, key=lambda t: self.ranks.get(t, 999))
                ],
                "window_minutes": window_minutes,
                "market_price": ctx.price,
                "liquidity": ctx.liquidity,
            }

            conflicting = len(distinct_sides) > 1
            sig = Signal(
                kind=SignalKind.CONFLICT if conflicting else SignalKind.CONSENSUS,
                market_id=market_id, provenance=ctx.prov, evidence=detail,
                direction=None if conflicting else next(iter(distinct_sides)),
            )
            if conflicting:
                sig.interpretation = (
                    f"{len(traders)} ranked traders took opposing sides in this "
                    f"market within {window_minutes} minutes. Disagreement among "
                    f"ranked traders is not a trade signal in either direction."
                )
                sig.contrary.append(
                    "At most one side of this disagreement can be right; the "
                    "ranking does not tell you which."
                )
            else:
                sig.interpretation = (
                    f"{len(traders)} independently ranked traders took the same "
                    f"side (${combined:,.0f} combined) within {window_minutes} "
                    f"minutes."
                )
                sig.contrary.append(
                    "Ranked traders may be reacting to the same public news, or "
                    "to each other. Correlated entries are not independent "
                    "confirmations."
                )
            sig.suppressed_by = self.filter.check(
                ctx, data_confidence=ctx.prov.confidence()
            )
            score_signal(
                sig, data_confidence=ctx.prov.confidence(),
                trade_value=combined, liquidity=ctx.liquidity,
                confirmations=0 if conflicting else len(traders) - 1,
                thresholds=self.config.thresholds,
                historical_hit_rate=self._historical_hit_rate(),
            )
            out.append(sig)
        return out

    # ------------------------------------------------------------------ utils

    def _historical_hit_rate(self) -> float | None:
        """Section 41 feedback: how often past alerts were scored correct."""
        rows = self.store.outcomes(limit=500)
        scored = [r["signal_correct"] for r in rows
                  if r["signal_correct"] is not None]
        if len(scored) < 10:
            return None
        return sum(scored) / len(scored)

    def run_all(self, since: datetime | None = None) -> list[Signal]:
        signals = self.large_trades(since=since)
        signals += self.market_movements()
        signals += self.consensus(since=since)
        signals.sort(key=lambda s: (-s.confidence, s.ts))
        return signals


def summarise_suppressions(signals: Iterable[Signal]) -> dict[str, int]:
    """Audit view of the §35 filters: what got dropped and why."""
    counts: dict[str, int] = defaultdict(int)
    for s in signals:
        for reason in s.suppressed_by:
            head = reason.split("(")[0].strip().rstrip(":")
            counts[head] += 1
    return dict(sorted(counts.items(), key=lambda kv: -kv[1]))

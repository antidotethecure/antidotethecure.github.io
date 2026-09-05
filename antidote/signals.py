"""Sections 19 and 20: signal taxonomy and confidence scoring.

A signal is an *observation plus an interpretation*, and the two are kept apart:
`evidence` holds what was measured, `interpretation` holds what it might mean.
Confidence scores the former.  It never scores the trade.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from .provenance import EpistemicClass, Provenance, utcnow


class SignalKind(enum.Enum):
    TRADER = "TRADER SIGNAL"
    VOLUME = "VOLUME SIGNAL"
    PRICE = "PRICE SIGNAL"
    LIQUIDITY = "LIQUIDITY SIGNAL"
    NEWS = "NEWS SIGNAL"
    MOMENTUM = "MOMENTUM SIGNAL"
    MEAN_REVERSION = "MEAN-REVERSION SIGNAL"
    CROSS_MARKET = "CROSS-MARKET SIGNAL"
    UNUSUAL = "UNUSUAL ACTIVITY"
    CONSENSUS = "SMART MONEY CONSENSUS"
    CONFLICT = "CONFLICTING SMART MONEY SIGNAL"


@dataclass
class ConfidenceBreakdown:
    """Section 20 inputs, each in [0, 1], with the weight applied to each."""

    data_quality: float = 0.0
    trader_history: float = 0.0
    trade_size: float = 0.0
    market_liquidity: float = 0.0
    price_movement: float = 0.0
    volume_anomaly: float = 0.0
    independent_confirmation: float = 0.0
    news_confirmation: float = 0.0
    historical_signal_performance: float = 0.0

    WEIGHTS = {
        "data_quality": 0.20,
        "trader_history": 0.15,
        "trade_size": 0.10,
        "market_liquidity": 0.12,
        "price_movement": 0.08,
        "volume_anomaly": 0.08,
        "independent_confirmation": 0.12,
        "news_confirmation": 0.05,
        "historical_signal_performance": 0.10,
    }

    def score(self) -> int:
        total = sum(getattr(self, k) * w for k, w in self.WEIGHTS.items())
        return int(round(max(0.0, min(1.0, total)) * 100))

    def missing(self) -> list[str]:
        return [k for k in self.WEIGHTS if getattr(self, k) == 0.0]

    def render(self) -> str:
        lines = []
        for k, w in sorted(self.WEIGHTS.items(), key=lambda kv: -kv[1]):
            v = getattr(self, k)
            lines.append(f"      {k:<32} {v:>5.2f} x {w:.2f} = {v * w:.3f}")
        return "\n".join(lines)


@dataclass
class Signal:
    kind: SignalKind
    market_id: str
    ts: datetime = field(default_factory=utcnow)
    trader_id: str | None = None
    direction: str | None = None          # "YES" | "NO" | None
    confidence: int = 0
    breakdown: ConfidenceBreakdown = field(default_factory=ConfidenceBreakdown)
    # What was measured (OBSERVED).
    evidence: dict[str, Any] = field(default_factory=dict)
    # What it might mean (ANALYSIS / SPECULATION), never stated as fact.
    interpretation: str = ""
    interpretation_class: EpistemicClass = EpistemicClass.ANALYSIS
    contrary: list[str] = field(default_factory=list)
    provenance: Provenance | None = None
    suppressed_by: list[str] = field(default_factory=list)

    @property
    def id(self) -> str:
        stamp = self.ts.strftime("%Y%m%dT%H%M%S")
        who = (self.trader_id or "-").split(":")[-1][:12]
        return f"{self.kind.name}:{self.market_id}:{who}:{stamp}"

    @property
    def suppressed(self) -> bool:
        return bool(self.suppressed_by)

    def to_dict(self) -> dict[str, Any]:
        return {
            "kind": self.kind.value,
            "market_id": self.market_id,
            "trader_id": self.trader_id,
            "ts": self.ts.isoformat(),
            "direction": self.direction,
            "confidence": self.confidence,
            "breakdown": self.breakdown.__dict__,
            "evidence": self.evidence,
            "interpretation": self.interpretation,
            "interpretation_class": self.interpretation_class.value,
            "contrary": self.contrary,
            "suppressed_by": self.suppressed_by,
        }


def saturating(value: float, full: float) -> float:
    """Map a magnitude onto [0,1], reaching 1.0 at `full`."""
    if full <= 0:
        return 0.0
    return max(0.0, min(1.0, value / full))


def score_signal(signal: Signal, *, data_confidence: float,
                 trader_metrics: dict[str, Any] | None = None,
                 trade_value: float | None = None,
                 liquidity: float | None = None,
                 price_move: float | None = None,
                 volume_ratio: float | None = None,
                 confirmations: int = 0,
                 news_hits: int = 0,
                 historical_hit_rate: float | None = None,
                 thresholds: Any = None) -> Signal:
    """Populate a signal's confidence breakdown from available inputs (§20).

    Anything unavailable stays at 0.0 and is listed in `missing()`, so a
    high-scoring signal cannot be built out of absent evidence.
    """
    b = signal.breakdown
    b.data_quality = max(0.0, min(1.0, data_confidence))

    if trader_metrics:
        # Trader history contributes only when there is enough of it.
        closed = trader_metrics.get("n_closed_lots") or 0
        roi = trader_metrics.get("roi")
        ra = trader_metrics.get("risk_adjusted")
        sample = saturating(closed, 40)
        quality = 0.0
        if roi is not None:
            quality = max(quality, saturating(roi, 0.5))
        if ra is not None:
            quality = max(quality, saturating(ra, 3.0))
        b.trader_history = round(sample * quality, 4)

    if trade_value is not None and thresholds is not None:
        tiers = thresholds.large_trade_tiers or [100_000]
        b.trade_size = saturating(trade_value, max(tiers))
    elif trade_value is not None:
        b.trade_size = saturating(trade_value, 100_000)

    if liquidity is not None and thresholds is not None:
        b.market_liquidity = saturating(liquidity, thresholds.min_liquidity * 10)
    elif liquidity is not None:
        b.market_liquidity = saturating(liquidity, 50_000)

    if price_move is not None:
        b.price_movement = saturating(abs(price_move), 0.15)
    if volume_ratio is not None:
        b.volume_anomaly = saturating(volume_ratio - 1.0, 5.0)
    b.independent_confirmation = saturating(confirmations, 3)
    b.news_confirmation = saturating(news_hits, 2)
    if historical_hit_rate is not None:
        b.historical_signal_performance = max(0.0, min(1.0, historical_hit_rate))

    signal.confidence = b.score()
    return signal

"""Section 11: copy-trade feasibility, and section 16: follow rules.

The premise this module exists to refute is "trader bought YES, therefore buy
YES".  By the time an observer sees a trade, the price has usually already
absorbed it.  The verdict answers one question only: *could this still be
entered on remotely similar terms?* -- never *should it be*.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from .config import Config
from .provenance import EpistemicClass, utcnow
from .storage import Store, parse_ts
from .traders import TraderMetrics


class Feasibility(enum.Enum):
    REPLICABLE = "Potentially replicable"
    PRICE_MOVED = "Too much price movement"
    ILLIQUID = "Insufficient liquidity"
    STALE = "Signal appears stale"
    CLOSING = "Market too close to resolution"
    UNKNOWN = "Cannot assess: missing data"


@dataclass
class CopyAssessment:
    verdict: Feasibility
    market_id: str
    observed_at: datetime
    observed_price: float
    current_price: float | None
    price_difference: float | None
    delay_seconds: float
    slippage_estimate: float | None
    liquidity: float | None
    expected_cost_per_share: float | None
    expected_total_cost: float | None
    size_requested: float
    reasons: list[str] = field(default_factory=list)
    news_changed: bool | None = None
    follow_rules: dict[str, bool] = field(default_factory=dict)
    follow_rules_pass: bool | None = None

    @property
    def edge_consumed_pct(self) -> float | None:
        """How much of the move has already happened before we could act."""
        if self.price_difference is None or self.observed_price == 0:
            return None
        return round(self.price_difference / self.observed_price, 4)

    def render(self) -> str:
        lines = [
            "COPY-TRADE FEASIBILITY (§11)",
            f"  VERDICT                : {self.verdict.value}",
            f"  TRADE OBSERVED         : {self.observed_at.isoformat()}",
            f"  PRICE AT OBSERVATION   : {self.observed_price:.4f}",
            f"  CURRENT MARKET PRICE   : "
            f"{'n/a' if self.current_price is None else f'{self.current_price:.4f}'}",
            f"  PRICE DIFFERENCE       : "
            f"{'n/a' if self.price_difference is None else f'{self.price_difference:+.4f}'}",
            f"  TIME DELAY             : {self.delay_seconds:,.0f}s",
            f"  ESTIMATED SLIPPAGE     : "
            f"{'n/a' if self.slippage_estimate is None else f'{self.slippage_estimate:.4f}'}",
            f"  LIQUIDITY              : "
            f"{'unknown' if self.liquidity is None else f'{self.liquidity:,.0f}'}",
            f"  EXPECTED COST/SHARE    : "
            f"{'n/a' if self.expected_cost_per_share is None else f'{self.expected_cost_per_share:.4f}'}",
            f"  EXPECTED TOTAL COST    : "
            f"{'n/a' if self.expected_total_cost is None else f'${self.expected_total_cost:,.2f}'}",
        ]
        if self.edge_consumed_pct is not None:
            lines.append(f"  MOVE ALREADY CONSUMED  : {self.edge_consumed_pct:+.1%}")
        if self.news_changed is not None:
            lines.append(f"  NEWS/EVENT CHANGE      : {self.news_changed}")
        if self.follow_rules:
            lines.append(f"  FOLLOW RULES (§16)     : "
                         f"{'ALL PASS' if self.follow_rules_pass else 'BLOCKED'}")
            for rule, passed in self.follow_rules.items():
                lines.append(f"      [{'PASS' if passed else 'FAIL'}] {rule}")
        for r in self.reasons:
            lines.append(f"  - {r}")
        lines.append(
            f"  [{EpistemicClass.ANALYSIS.value}] Feasibility is not a "
            f"recommendation. 'Potentially replicable' means the mechanics "
            f"still work, not that the trade is good."
        )
        return "\n".join(lines)

    def to_dict(self) -> dict[str, Any]:
        return {
            "verdict": self.verdict.value, "market_id": self.market_id,
            "observed_at": self.observed_at.isoformat(),
            "observed_price": self.observed_price,
            "current_price": self.current_price,
            "price_difference": self.price_difference,
            "delay_seconds": self.delay_seconds,
            "slippage_estimate": self.slippage_estimate,
            "liquidity": self.liquidity,
            "expected_total_cost": self.expected_total_cost,
            "edge_consumed_pct": self.edge_consumed_pct,
            "reasons": self.reasons,
            "follow_rules": self.follow_rules,
            "follow_rules_pass": self.follow_rules_pass,
        }


def estimate_slippage(size_value: float, liquidity: float | None,
                      config: Config) -> float | None:
    """Crude square-root market-impact estimate.

    Real slippage depends on order-book depth, which is not always available.
    This is deliberately pessimistic and is labelled an estimate everywhere it
    surfaces; when a live book *is* available, prefer walking it.
    """
    if liquidity is None or liquidity <= 0:
        return None
    participation = size_value / liquidity
    impact = config.copy.max_slippage_pct * (participation ** 0.5)
    return round(min(impact, 0.25), 6)


class CopyAnalyzer:
    def __init__(self, store: Store, config: Config):
        self.store = store
        self.config = config

    def assess(self, trade_row: Any, *, size_value: float | None = None,
               delay_seconds: float | None = None,
               trader_metrics: TraderMetrics | None = None,
               trader_rank: int | None = None,
               now: datetime | None = None) -> CopyAssessment:
        now = now or utcnow()
        cfg = self.config.copy
        observed_at = parse_ts(trade_row["ts"]) or now
        observed_price = trade_row["price"]
        market_id = trade_row["market_id"]

        snap = self.store.latest_snapshot(market_id)
        market = self.store.get_market(market_id)
        current_price = snap["price"] if snap else None
        liquidity = snap["liquidity"] if snap else trade_row["liquidity"]

        actual_delay = (now - observed_at).total_seconds()
        delay = delay_seconds if delay_seconds is not None else actual_delay
        size_value = size_value or (trade_row["value"] or 0.0)

        diff = (None if current_price is None
                else round(current_price - observed_price, 6))
        slippage = estimate_slippage(size_value, liquidity, self.config)

        cost_per_share = None
        total_cost = None
        if current_price is not None:
            cost_per_share = current_price + (slippage or 0.0)
            cost_per_share = round(cost_per_share * (1 + cfg.fee_rate), 6)
            if cost_per_share > 0:
                shares = size_value / cost_per_share
                total_cost = round(shares * cost_per_share, 2)

        reasons: list[str] = []
        verdict = Feasibility.REPLICABLE

        # A trade timestamped in the future means clock skew, a timezone bug or
        # a bad feed. Copying off it is meaningless, so refuse rather than
        # reporting a negative delay.
        if actual_delay < 0:
            reasons.append(
                f"Trade is timestamped {abs(actual_delay) / 60:.0f} minutes in "
                f"the FUTURE. This indicates clock skew or bad source data; the "
                f"observation cannot be acted on."
            )
            return CopyAssessment(
                verdict=Feasibility.UNKNOWN, market_id=market_id,
                observed_at=observed_at, observed_price=observed_price,
                current_price=current_price, price_difference=diff,
                delay_seconds=actual_delay, slippage_estimate=slippage,
                liquidity=liquidity, expected_cost_per_share=None,
                expected_total_cost=None, size_requested=size_value,
                reasons=reasons,
            )

        if current_price is None:
            verdict = Feasibility.UNKNOWN
            reasons.append("No current market price available for this market.")
        else:
            if abs(diff or 0.0) > cfg.max_price_drift:
                verdict = Feasibility.PRICE_MOVED
                reasons.append(
                    f"Price moved {diff:+.4f} since observation, beyond the "
                    f"{cfg.max_price_drift:.4f} drift limit. The move this "
                    f"trade may have signalled has largely already happened."
                )
        if liquidity is None:
            if verdict is Feasibility.REPLICABLE:
                verdict = Feasibility.UNKNOWN
            reasons.append("Liquidity unknown; execution cost cannot be bounded.")
        elif liquidity < self.config.thresholds.min_liquidity:
            verdict = Feasibility.ILLIQUID
            reasons.append(
                f"Liquidity {liquidity:,.0f} below the {self.config.thresholds.min_liquidity:,.0f} "
                f"minimum; entering may move the price against you."
            )
        elif size_value > liquidity * 0.1:
            verdict = Feasibility.ILLIQUID
            reasons.append(
                f"Requested size is {size_value / liquidity:.0%} of visible "
                f"liquidity; slippage would likely exceed the estimate."
            )

        if actual_delay > cfg.stale_signal_seconds:
            verdict = Feasibility.STALE
            reasons.append(
                f"Signal is {actual_delay / 60:.0f} minutes old (stale beyond "
                f"{cfg.stale_signal_seconds / 60:.0f} minutes)."
            )

        if market and market["close_time"]:
            close = parse_ts(market["close_time"])
            if close:
                mins = (close - now).total_seconds() / 60
                if mins < 0:
                    verdict = Feasibility.CLOSING
                    reasons.append("Market has already closed.")
                elif mins < cfg.follow_min_minutes_to_close:
                    verdict = Feasibility.CLOSING
                    reasons.append(
                        f"Only {mins:.0f} minutes to close; below the "
                        f"{cfg.follow_min_minutes_to_close:.0f} minute floor."
                    )

        rules, rules_pass = self._follow_rules(
            trade_row, trader_metrics, trader_rank, liquidity, market, now
        )

        return CopyAssessment(
            verdict=verdict, market_id=market_id, observed_at=observed_at,
            observed_price=observed_price, current_price=current_price,
            price_difference=diff, delay_seconds=delay,
            slippage_estimate=slippage, liquidity=liquidity,
            expected_cost_per_share=cost_per_share,
            expected_total_cost=total_cost, size_requested=size_value,
            reasons=reasons, follow_rules=rules, follow_rules_pass=rules_pass,
        )

    def _follow_rules(self, trade_row: Any, tm: TraderMetrics | None,
                      rank: int | None, liquidity: float | None,
                      market: Any, now: datetime) -> tuple[dict[str, bool], bool]:
        """Section 16: configurable conjunction. All rules must pass."""
        cfg = self.config.copy
        rules: dict[str, bool] = {}

        rules[f"trader rank <= {cfg.follow_max_rank}"] = (
            rank is not None and rank <= cfg.follow_max_rank
        )
        rules[f"trade size >= ${cfg.follow_min_trade_size:,.0f}"] = (
            (trade_row["value"] or 0.0) >= cfg.follow_min_trade_size
        )
        if cfg.follow_require_positive_90d:
            rules["trader 90d performance positive"] = bool(
                tm and tm.realized_pnl is not None and tm.realized_pnl > 0
            )
        rules[f"liquidity >= ${cfg.follow_min_liquidity:,.0f}"] = (
            liquidity is not None and liquidity >= cfg.follow_min_liquidity
        )
        mins_ok = False
        if market and market["close_time"]:
            close = parse_ts(market["close_time"])
            if close:
                mins_ok = ((close - now).total_seconds() / 60
                           >= cfg.follow_min_minutes_to_close)
        rules[f"at least {cfg.follow_min_minutes_to_close:.0f} min to close"] = mins_ok

        snap = self.store.latest_snapshot(trade_row["market_id"])
        drift_ok = False
        if snap and snap["price"] is not None:
            drift_ok = abs(snap["price"] - trade_row["price"]) <= cfg.max_price_drift
        rules[f"price drift <= {cfg.max_price_drift}"] = drift_ok

        return rules, all(rules.values())

    def assess_trade_id(self, trade_id: str, **kw: Any) -> CopyAssessment | None:
        row = self.store.conn.execute(
            "SELECT * FROM trades WHERE id = ?", (trade_id,)
        ).fetchone()
        return self.assess(row, **kw) if row else None

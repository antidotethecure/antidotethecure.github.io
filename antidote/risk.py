"""Sections 25 and 26: bankroll limits and correlated exposure.

The rule this module enforces above all others: position size is derived from
*your* bankroll and *your* limits, never from the size somebody else traded.  A
$400k print by a ranked trader is information about the market; it is not a
sizing instruction.

Correlation here is structural rather than statistical.  Two markets that
resolve off the same event are 100% correlated regardless of what their price
histories happen to have done, and prediction markets rarely have enough
overlapping history for a sample correlation to be trustworthy.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from .config import Config
from .provenance import EpistemicClass, utcnow
from .storage import Store, parse_ts


@dataclass
class RiskVerdict:
    allowed: bool
    max_allowed_notional: float
    breaches: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    utilisation: dict[str, float] = field(default_factory=dict)

    def render(self) -> str:
        lines = [
            f"RISK CHECK (§25): {'ALLOWED' if self.allowed else 'BLOCKED'}",
            f"  max allowed notional: ${self.max_allowed_notional:,.2f}",
        ]
        for k, v in sorted(self.utilisation.items()):
            lines.append(f"  {k:<28} {v:>6.1%} of limit")
        for b in self.breaches:
            lines.append(f"  [BREACH]  {b}")
        for w in self.warnings:
            lines.append(f"  [WARNING] {w}")
        return "\n".join(lines)


class RiskManager:
    def __init__(self, store: Store, config: Config):
        self.store = store
        self.config = config

    # ------------------------------------------------------------- exposures

    def open_positions(self, portfolio: str) -> list[Any]:
        return self.store.conn.execute(
            "SELECT * FROM paper_positions WHERE portfolio = ? AND status='open'",
            (portfolio,),
        ).fetchall()

    def exposure_by_market(self, portfolio: str) -> dict[str, float]:
        out: dict[str, float] = defaultdict(float)
        for r in self.open_positions(portfolio):
            out[r["market_id"]] += (r["entry_price"] or 0.0) * (r["size"] or 0.0)
        return dict(out)

    def exposure_by_event(self, portfolio: str) -> dict[str, float]:
        """Section 26: group exposure by the underlying event, not the market."""
        out: dict[str, float] = defaultdict(float)
        for r in self.open_positions(portfolio):
            market = self.store.get_market(r["market_id"])
            key = (market["event_key"] if market and market["event_key"]
                   else r["market_id"])
            out[key] += (r["entry_price"] or 0.0) * (r["size"] or 0.0)
        return dict(out)

    def total_exposure(self, portfolio: str) -> float:
        return sum(self.exposure_by_market(portfolio).values())

    def realized_today(self, portfolio: str) -> float:
        start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        rows = self.store.conn.execute(
            "SELECT realized_pnl FROM paper_positions WHERE portfolio = ? "
            "AND status='closed' AND closed_at >= ?",
            (portfolio, start.isoformat()),
        ).fetchall()
        return sum(r["realized_pnl"] or 0.0 for r in rows)

    def opened_today_notional(self, portfolio: str) -> float:
        start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        rows = self.store.conn.execute(
            "SELECT entry_price, size FROM paper_positions WHERE portfolio = ? "
            "AND opened_at >= ?", (portfolio, start.isoformat()),
        ).fetchall()
        return sum((r["entry_price"] or 0.0) * (r["size"] or 0.0) for r in rows)

    # ----------------------------------------------------------------- checks

    def check_new_position(self, portfolio: str, market_id: str,
                           notional: float) -> RiskVerdict:
        cfg = self.config.risk
        bankroll = cfg.bankroll
        breaches: list[str] = []
        warnings: list[str] = []
        util: dict[str, float] = {}

        caps: list[float] = []

        # Per-position cap.
        cap_position = bankroll * cfg.max_position_pct
        caps.append(cap_position)
        util["position size"] = notional / cap_position if cap_position else 0.0
        if notional > cap_position:
            breaches.append(
                f"position ${notional:,.0f} exceeds max_position_pct "
                f"({cfg.max_position_pct:.1%} of ${bankroll:,.0f} = "
                f"${cap_position:,.0f})"
            )

        # Per-market cap, counting what is already on.
        existing_market = self.exposure_by_market(portfolio).get(market_id, 0.0)
        cap_market = bankroll * cfg.max_market_exposure_pct
        caps.append(max(0.0, cap_market - existing_market))
        util["market exposure"] = ((existing_market + notional) / cap_market
                                   if cap_market else 0.0)
        if existing_market + notional > cap_market:
            breaches.append(
                f"market exposure ${existing_market + notional:,.0f} exceeds "
                f"max_market_exposure_pct (${cap_market:,.0f})"
            )

        # Correlated-event cap (§26).
        market = self.store.get_market(market_id)
        event_key = (market["event_key"] if market and market["event_key"]
                     else market_id)
        existing_event = self.exposure_by_event(portfolio).get(event_key, 0.0)
        cap_event = bankroll * cfg.max_correlated_exposure_pct
        caps.append(max(0.0, cap_event - existing_event))
        util["correlated exposure"] = ((existing_event + notional) / cap_event
                                       if cap_event else 0.0)
        if existing_event + notional > cap_event:
            breaches.append(
                f"correlated exposure to event '{event_key}' would reach "
                f"${existing_event + notional:,.0f}, over "
                f"max_correlated_exposure_pct (${cap_event:,.0f})"
            )
        elif existing_event > 0:
            warnings.append(
                f"already exposed ${existing_event:,.0f} to event '{event_key}' "
                f"through other markets; these resolve together"
            )

        # Daily deployment cap.
        today = self.opened_today_notional(portfolio)
        cap_daily = bankroll * cfg.max_daily_exposure_pct
        caps.append(max(0.0, cap_daily - today))
        util["daily exposure"] = ((today + notional) / cap_daily
                                  if cap_daily else 0.0)
        if today + notional > cap_daily:
            breaches.append(
                f"daily deployment ${today + notional:,.0f} exceeds "
                f"max_daily_exposure_pct (${cap_daily:,.0f})"
            )

        # Open-position count.
        n_open = len(self.open_positions(portfolio))
        util["open positions"] = (n_open / cfg.max_open_positions
                                  if cfg.max_open_positions else 0.0)
        if n_open >= cfg.max_open_positions:
            breaches.append(
                f"already holding {n_open} positions (max "
                f"{cfg.max_open_positions})"
            )
            caps.append(0.0)

        # Daily loss stop.
        realized = self.realized_today(portfolio)
        loss_limit = -bankroll * cfg.max_daily_loss_pct
        if realized <= loss_limit:
            breaches.append(
                f"daily loss ${realized:,.0f} has hit the stop "
                f"(${loss_limit:,.0f}); no new positions today"
            )
            caps.append(0.0)
        elif realized < loss_limit * 0.6:
            warnings.append(
                f"today's realized P&L ${realized:,.0f} is approaching the "
                f"daily stop of ${loss_limit:,.0f}"
            )

        # Drawdown stop.
        dd = self.current_drawdown(portfolio)
        if dd is not None and dd <= -bankroll * cfg.max_drawdown_pct:
            breaches.append(
                f"drawdown ${dd:,.0f} exceeds max_drawdown_pct "
                f"({cfg.max_drawdown_pct:.0%} of bankroll)"
            )
            caps.append(0.0)

        return RiskVerdict(
            allowed=not breaches,
            max_allowed_notional=round(max(0.0, min(caps)), 2) if caps else 0.0,
            breaches=breaches, warnings=warnings, utilisation=util,
        )

    def current_drawdown(self, portfolio: str) -> float | None:
        rows = self.store.conn.execute(
            "SELECT realized_pnl FROM paper_positions WHERE portfolio = ? "
            "AND status='closed' AND realized_pnl IS NOT NULL "
            "ORDER BY closed_at ASC", (portfolio,),
        ).fetchall()
        if not rows:
            return None
        peak = 0.0
        equity = 0.0
        worst = 0.0
        for r in rows:
            equity += r["realized_pnl"]
            peak = max(peak, equity)
            worst = min(worst, equity - peak)
        return round(worst, 2)

    def suggest_size(self, market_id: str, portfolio: str = "default"
                     ) -> dict[str, Any]:
        """Size from the operator's own limits. Never from another trader's size."""
        verdict = self.check_new_position(portfolio, market_id, 0.0)
        base = self.config.risk.bankroll * self.config.risk.max_position_pct
        allowed = min(base, verdict.max_allowed_notional)
        return {
            "suggested_notional": round(allowed, 2),
            "basis": (f"{self.config.risk.max_position_pct:.1%} of bankroll "
                      f"${self.config.risk.bankroll:,.0f}, capped by remaining "
                      f"market/event/daily headroom"),
            "epistemic_class": EpistemicClass.ANALYSIS.value,
            "caveat": ("This is a limit, not a suggestion to trade. It is "
                       "derived entirely from your configured bankroll rules "
                       "and is unrelated to any other trader's position size."),
            "risk": verdict.render(),
        }


class CorrelationEngine:
    """Section 26: find positions that depend on the same underlying event."""

    def __init__(self, store: Store, config: Config):
        self.store = store
        self.config = config

    def groups(self, market_ids: list[str] | None = None
               ) -> dict[str, list[dict[str, Any]]]:
        """Cluster markets by their platform-declared event key."""
        if market_ids:
            rows = [self.store.get_market(m) for m in market_ids]
            rows = [r for r in rows if r is not None]
        else:
            rows = self.store.markets(limit=10_000)

        out: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for r in rows:
            key = r["event_key"] or f"__solo__:{r['id']}"
            out[key].append({"market_id": r["id"], "question": r["question"],
                             "category": r["category"], "status": r["status"]})
        return {k: v for k, v in out.items() if not k.startswith("__solo__")
                or len(v) > 1}

    def correlated_with(self, market_id: str) -> list[dict[str, Any]]:
        market = self.store.get_market(market_id)
        if market is None or not market["event_key"]:
            return []
        rows = self.store.conn.execute(
            "SELECT id, question, category, status FROM markets "
            "WHERE event_key = ? AND id != ?", (market["event_key"], market_id),
        ).fetchall()
        return [dict(r) for r in rows]

    def price_correlation(self, market_a: str, market_b: str,
                          min_points: int = 20) -> dict[str, Any]:
        """Sample correlation of overlapping price history.

        Reported with its sample size because prediction markets frequently lack
        enough overlapping observations for this number to mean anything.  When
        the structural event key already links two markets, trust that instead.
        """
        def series(mid: str) -> dict[str, float]:
            rows = self.store.conn.execute(
                "SELECT ts, price FROM market_snapshots WHERE market_id = ? "
                "AND price IS NOT NULL ORDER BY ts", (mid,),
            ).fetchall()
            return {r["ts"][:16]: r["price"] for r in rows}

        a, b = series(market_a), series(market_b)
        shared = sorted(set(a) & set(b))
        if len(shared) < min_points:
            return {
                "correlation": None, "n": len(shared),
                "note": (f"only {len(shared)} overlapping observations; "
                         f"need {min_points} for a usable estimate"),
            }
        xs = [a[k] for k in shared]
        ys = [b[k] for k in shared]
        mx = sum(xs) / len(xs)
        my = sum(ys) / len(ys)
        num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
        dx = sum((x - mx) ** 2 for x in xs) ** 0.5
        dy = sum((y - my) ** 2 for y in ys) ** 0.5
        if dx == 0 or dy == 0:
            return {"correlation": None, "n": len(shared),
                    "note": "zero variance in one series"}
        return {"correlation": round(num / (dx * dy), 4), "n": len(shared),
                "note": "sample correlation of overlapping snapshots"}

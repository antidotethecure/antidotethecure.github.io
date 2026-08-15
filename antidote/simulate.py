"""Sections 13, 14 and 15: paper trading, copy simulation, delay sensitivity.

The delay sweep is the load-bearing part.  A trader-following strategy that
looks strong at zero delay and collapses at 60 seconds was never a strategy --
it was a measurement of how fast the observer could have been, which in practice
they cannot be.  `delay_curve` exists to make that failure mode visible before
any money is involved.
"""

from __future__ import annotations

import math
import statistics
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Iterable

from .config import Config
from .copytrade import estimate_slippage
from .provenance import EpistemicClass, SourceKind, utcnow
from .storage import Store, parse_ts
from .traders import market_resolution


@dataclass
class SimTrade:
    market_id: str
    trader_id: str | None
    outcome: str | None
    entry_ts: datetime
    entry_price: float
    shares: float
    cost: float
    fees: float
    slippage: float
    exit_ts: datetime | None = None
    exit_price: float | None = None
    settled: bool = False
    skipped_reason: str | None = None

    @property
    def gross_pnl(self) -> float | None:
        if self.exit_price is None:
            return None
        return round((self.exit_price - self.entry_price) * self.shares, 6)

    @property
    def net_pnl(self) -> float | None:
        g = self.gross_pnl
        return None if g is None else round(g - self.fees, 6)

    @property
    def roi(self) -> float | None:
        n = self.net_pnl
        return round(n / self.cost, 6) if (n is not None and self.cost) else None


@dataclass
class SimResult:
    label: str
    delay_seconds: float
    size_mode: str
    size_value: float
    n_signals: int = 0
    n_entered: int = 0
    n_skipped: int = 0
    skip_reasons: dict[str, int] = field(default_factory=dict)
    gross_pnl: float = 0.0
    fees: float = 0.0
    slippage_cost: float = 0.0
    net_pnl: float = 0.0
    invested: float = 0.0
    roi: float | None = None
    win_rate: float | None = None
    max_drawdown: float = 0.0
    avg_return: float | None = None
    best_trade: float | None = None
    worst_trade: float | None = None
    sharpe_like: float | None = None
    volatility: float | None = None
    source_kind: str = SourceKind.DERIVED.value
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return dict(self.__dict__)

    def render(self) -> str:
        def f(v: Any, spec: str = ",.2f") -> str:
            return "n/a" if v is None else format(v, spec)
        lines = [
            f"  {self.label}  (delay {self.delay_seconds:,.0f}s, "
            f"{self.size_mode} {self.size_value:g})",
            f"    signals {self.n_signals}  entered {self.n_entered}  "
            f"skipped {self.n_skipped}",
            f"    invested ${f(self.invested)}   gross ${f(self.gross_pnl)}   "
            f"fees ${f(self.fees)}   slippage ${f(self.slippage_cost)}",
            f"    NET ${f(self.net_pnl)}   ROI {f(self.roi, '+.2%')}   "
            f"win rate {f(self.win_rate, '.1%')}",
            f"    max drawdown ${f(self.max_drawdown)}   "
            f"best ${f(self.best_trade)}   worst ${f(self.worst_trade)}",
            f"    risk-adjusted {f(self.sharpe_like, '.3f')}   "
            f"volatility {f(self.volatility)}",
        ]
        if self.skip_reasons:
            top = sorted(self.skip_reasons.items(), key=lambda kv: -kv[1])[:3]
            lines.append("    top skip reasons: " +
                         "; ".join(f"{k} x{v}" for k, v in top))
        return "\n".join(lines)


class CopySimulator:
    """Section 14: "if I had copied this trader's observable trades..."

    Replays a trader's observed entries against the recorded price history,
    charging fees and estimated slippage, and exiting where the trader exited or
    at market resolution.
    """

    def __init__(self, store: Store, config: Config):
        self.store = store
        self.config = config

    def _price_at(self, market_id: str, when: datetime) -> float | None:
        """Nearest recorded price at or after `when`, else the last known."""
        rows = self.store.conn.execute(
            "SELECT ts, price FROM market_snapshots WHERE market_id = ? "
            "AND price IS NOT NULL AND ts >= ? ORDER BY ts ASC LIMIT 1",
            (market_id, when.isoformat()),
        ).fetchone()
        if rows:
            return rows["price"]
        last = self.store.conn.execute(
            "SELECT price FROM market_snapshots WHERE market_id = ? "
            "AND price IS NOT NULL ORDER BY ts DESC LIMIT 1", (market_id,)
        ).fetchone()
        return last["price"] if last else None

    def _exit_for(self, entry: Any, trader_id: str | None) -> tuple[float | None, datetime | None, bool]:
        """Where the copy exits: the trader's own sale, else settlement."""
        sell = self.store.conn.execute(
            "SELECT * FROM trades WHERE market_id = ? AND trader_id IS ? "
            "AND ts > ? AND UPPER(COALESCE(side,'')) IN ('SELL','S','ASK') "
            "ORDER BY ts ASC LIMIT 1",
            (entry["market_id"], trader_id, entry["ts"]),
        ).fetchone()
        if sell:
            return sell["price"], parse_ts(sell["ts"]), False

        market = self.store.get_market(entry["market_id"])
        resolved = market_resolution(market)
        if resolved is not None:
            payout = 1.0 if (entry["outcome"] or "").lower() == resolved.lower() else 0.0
            return payout, parse_ts(market["resolution_date"]) or parse_ts(
                market["close_time"]), True
        return None, None, False

    def simulate(self, trader_id: str, *, delay_seconds: float = 0.0,
                 size_mode: str = "fixed", size_value: float = 100.0,
                 since: datetime | None = None,
                 apply_follow_rules: bool = False,
                 label: str | None = None) -> SimResult:
        cfg = self.config.copy
        rows = self.store.trades(trader_id=trader_id, since=since, limit=100_000)
        entries = [r for r in rows
                   if (r["side"] or "BUY").upper() in ("BUY", "B", "BID")]
        entries.sort(key=lambda r: r["ts"])

        res = SimResult(
            label=label or f"copy {trader_id}", delay_seconds=delay_seconds,
            size_mode=size_mode, size_value=size_value, n_signals=len(entries),
        )
        kinds = {r["source_kind"] for r in rows}
        for weak in (SourceKind.SYNTHETIC.value, SourceKind.FIXTURE.value):
            if weak in kinds:
                res.source_kind = weak
                res.notes.append("SYNTHETIC INPUT: this result is not evidence.")
                break

        sims: list[SimTrade] = []
        bankroll = self.config.risk.bankroll
        equity_curve: list[float] = []
        running = 0.0

        for entry in entries:
            observed_at = parse_ts(entry["ts"])
            if observed_at is None:
                continue
            act_at = observed_at + timedelta(seconds=delay_seconds)

            # The price we would actually pay, at the delayed moment.
            fill_base = self._price_at(entry["market_id"], act_at)
            if fill_base is None:
                res.n_skipped += 1
                res.skip_reasons["no price at execution time"] = \
                    res.skip_reasons.get("no price at execution time", 0) + 1
                continue

            drift = abs(fill_base - entry["price"])
            if drift > cfg.max_price_drift:
                res.n_skipped += 1
                key = f"price drifted > {cfg.max_price_drift}"
                res.skip_reasons[key] = res.skip_reasons.get(key, 0) + 1
                continue

            notional = (size_value if size_mode == "fixed"
                        else bankroll * (size_value or cfg.pct_bankroll))
            liquidity = entry["liquidity"]
            if apply_follow_rules:
                if notional < cfg.follow_min_trade_size:
                    res.n_skipped += 1
                    res.skip_reasons["below follow_min_trade_size"] = \
                        res.skip_reasons.get("below follow_min_trade_size", 0) + 1
                    continue
                if liquidity is not None and liquidity < cfg.follow_min_liquidity:
                    res.n_skipped += 1
                    res.skip_reasons["below follow_min_liquidity"] = \
                        res.skip_reasons.get("below follow_min_liquidity", 0) + 1
                    continue

            slip = estimate_slippage(notional, liquidity, self.config) or 0.0
            fill = min(0.999, fill_base * (1 + slip))
            if fill <= 0:
                continue
            shares = notional / fill
            fees = round(notional * cfg.fee_rate, 6)
            slippage_cost = round((fill - fill_base) * shares, 6)

            exit_price, exit_ts, settled = self._exit_for(entry, trader_id)
            sim = SimTrade(
                market_id=entry["market_id"], trader_id=trader_id,
                outcome=entry["outcome"], entry_ts=act_at, entry_price=fill,
                shares=shares, cost=notional, fees=fees, slippage=slippage_cost,
                exit_ts=exit_ts, exit_price=exit_price, settled=settled,
            )
            if sim.net_pnl is None:
                res.n_skipped += 1
                res.skip_reasons["position still open (no exit or resolution)"] = \
                    res.skip_reasons.get(
                        "position still open (no exit or resolution)", 0) + 1
                continue

            sims.append(sim)
            res.n_entered += 1
            res.invested += notional
            res.fees += fees
            res.slippage_cost += slippage_cost
            res.gross_pnl += sim.gross_pnl or 0.0
            running += sim.net_pnl
            equity_curve.append(running)

        res.n_skipped = res.n_signals - res.n_entered
        res.net_pnl = round(res.gross_pnl - res.fees, 4)
        res.gross_pnl = round(res.gross_pnl, 4)
        res.fees = round(res.fees, 4)
        res.slippage_cost = round(res.slippage_cost, 4)
        res.invested = round(res.invested, 4)

        if sims:
            pnls = [s.net_pnl for s in sims if s.net_pnl is not None]
            rois = [s.roi for s in sims if s.roi is not None]
            res.roi = round(res.net_pnl / res.invested, 6) if res.invested else None
            res.win_rate = round(sum(1 for p in pnls if p > 0) / len(pnls), 4)
            res.best_trade = round(max(pnls), 4)
            res.worst_trade = round(min(pnls), 4)
            res.avg_return = round(statistics.fmean(rois), 6) if rois else None
            res.max_drawdown = _max_drawdown(equity_curve)
            if len(rois) >= 2:
                sd = statistics.pstdev(rois)
                res.volatility = round(sd, 6)
                res.sharpe_like = (round(statistics.fmean(rois) / sd *
                                         math.sqrt(len(rois)), 4) if sd else None)
        else:
            res.notes.append("no simulated entries: nothing survived the filters")
        return res

    # ------------------------------------------------------------ delay sweep

    def delay_curve(self, trader_id: str, *, size_mode: str = "fixed",
                    size_value: float = 100.0,
                    delays: Iterable[float] | None = None,
                    since: datetime | None = None) -> list[SimResult]:
        """Section 15: does the strategy survive realistic execution delay?"""
        delays = delays if delays is not None else self.config.copy.delays_seconds
        return [
            self.simulate(trader_id, delay_seconds=d, size_mode=size_mode,
                          size_value=size_value, since=since,
                          label=f"delay {d}s")
            for d in delays
        ]

    def size_sweep(self, trader_id: str, *, delay_seconds: float = 30.0,
                   sizes: Iterable[float] | None = None,
                   since: datetime | None = None) -> list[SimResult]:
        """Section 14: $100 / $500 / $1,000 / $5,000 per trade."""
        sizes = sizes if sizes is not None else self.config.copy.fixed_sizes
        return [
            self.simulate(trader_id, delay_seconds=delay_seconds,
                          size_mode="fixed", size_value=s, since=since,
                          label=f"${s:,.0f}/trade")
            for s in sizes
        ]


def _max_drawdown(curve: list[float]) -> float:
    peak = 0.0
    worst = 0.0
    for v in curve:
        peak = max(peak, v)
        worst = min(worst, v - peak)
    return round(worst, 4)


def render_delay_curve(results: list[SimResult]) -> str:
    """Make delay decay legible at a glance."""
    lines = [
        "DELAY SENSITIVITY (§15)",
        f"  {'delay':>8}  {'entered':>7}  {'net P&L':>12}  {'ROI':>9}  {'win':>6}",
        f"  {'-' * 8}  {'-' * 7}  {'-' * 12}  {'-' * 9}  {'-' * 6}",
    ]
    for r in results:
        roi = "n/a" if r.roi is None else f"{r.roi:+.2%}"
        wr = "n/a" if r.win_rate is None else f"{r.win_rate:.0%}"
        lines.append(f"  {r.delay_seconds:>7,.0f}s  {r.n_entered:>7}  "
                     f"{r.net_pnl:>12,.2f}  {roi:>9}  {wr:>6}")

    if len(results) >= 2:
        base, worst = results[0], results[-1]
        if base.net_pnl > 0:
            decay = (base.net_pnl - worst.net_pnl) / base.net_pnl
            lines.append(
                f"\n  [{EpistemicClass.ANALYSIS.value}] Net P&L decays "
                f"{decay:.0%} between {base.delay_seconds:,.0f}s and "
                f"{worst.delay_seconds:,.0f}s of delay."
            )
            if worst.net_pnl <= 0 < base.net_pnl:
                lines.append(
                    "  [ANALYSIS] The strategy turns unprofitable under "
                    "realistic delay. Zero-delay results are not achievable by "
                    "an observer and should be disregarded."
                )
    return "\n".join(lines)


# --------------------------------------------------------------- paper trading

class PaperPortfolio:
    """Section 13: paper-trading mode. Simulated only; never touches an exchange."""

    def __init__(self, store: Store, config: Config, name: str = "default"):
        self.store = store
        self.config = config
        self.name = name

    def open_position(self, market_id: str, outcome: str, side: str,
                      price: float, notional: float, *,
                      followed_trader_id: str | None = None,
                      source_trade_id: str | None = None,
                      notes: str = "") -> str | None:
        """Open a simulated position, subject to the §25 risk limits."""
        from .risk import RiskManager
        rm = RiskManager(self.store, self.config)
        verdict = rm.check_new_position(self.name, market_id, notional)
        if not verdict.allowed:
            return None

        snap = self.store.latest_snapshot(market_id)
        liquidity = snap["liquidity"] if snap else None
        slip = estimate_slippage(notional, liquidity, self.config) or 0.0
        fill = min(0.999, price * (1 + slip))
        shares = notional / fill if fill > 0 else 0.0
        fees = round(notional * self.config.copy.fee_rate, 6)

        pid = f"{self.name}-{uuid.uuid4().hex[:12]}"
        self.store.conn.execute(
            """INSERT INTO paper_positions (id, portfolio, market_id, outcome,
                   side, opened_at, entry_price, size, fees, slippage,
                   source_trade_id, followed_trader_id, status, notes)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (pid, self.name, market_id, outcome, side, utcnow().isoformat(),
             fill, shares, fees, round((fill - price) * shares, 6),
             source_trade_id, followed_trader_id, "open", notes),
        )
        return pid

    def close_position(self, position_id: str, exit_price: float) -> float | None:
        row = self.store.conn.execute(
            "SELECT * FROM paper_positions WHERE id = ? AND status = 'open'",
            (position_id,),
        ).fetchone()
        if row is None:
            return None
        pnl = round((exit_price - row["entry_price"]) * row["size"]
                    - (row["fees"] or 0.0), 6)
        self.store.conn.execute(
            "UPDATE paper_positions SET status='closed', closed_at=?, "
            "exit_price=?, realized_pnl=? WHERE id = ?",
            (utcnow().isoformat(), exit_price, pnl, position_id),
        )
        return pnl

    def mark_to_market(self) -> dict[str, Any]:
        """Section 13/30: portfolio state with realized and unrealized P&L."""
        rows = self.store.conn.execute(
            "SELECT * FROM paper_positions WHERE portfolio = ?", (self.name,)
        ).fetchall()
        realized = sum(r["realized_pnl"] or 0.0 for r in rows
                       if r["status"] == "closed")
        unrealized = 0.0
        unpriced = 0
        open_rows = [r for r in rows if r["status"] == "open"]
        exposure = 0.0
        for r in open_rows:
            snap = self.store.latest_snapshot(r["market_id"])
            exposure += (r["entry_price"] or 0.0) * (r["size"] or 0.0)
            if snap and snap["price"] is not None:
                unrealized += (snap["price"] - r["entry_price"]) * r["size"]
            else:
                unpriced += 1

        closed_pnls = [r["realized_pnl"] for r in rows
                       if r["status"] == "closed" and r["realized_pnl"] is not None]
        curve: list[float] = []
        acc = 0.0
        for p in closed_pnls:
            acc += p
            curve.append(acc)

        return {
            "portfolio": self.name,
            "open_positions": len(open_rows),
            "closed_positions": len(closed_pnls),
            "open_exposure": round(exposure, 2),
            "realized_pnl": round(realized, 2),
            "unrealized_pnl": round(unrealized, 2) if len(open_rows) > unpriced else None,
            "unpriced_open_positions": unpriced,
            "total_pnl": round(realized + unrealized, 2),
            "win_rate": (round(sum(1 for p in closed_pnls if p > 0) /
                               len(closed_pnls), 4) if closed_pnls else None),
            "max_drawdown": _max_drawdown(curve),
            "roi": (round((realized + unrealized) / self.config.risk.bankroll, 4)
                    if self.config.risk.bankroll else None),
            "bankroll": self.config.risk.bankroll,
        }

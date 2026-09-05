"""Sections 4, 5 and 23: multi-metric ranking, the watchlist, survivorship bias.

Deliberate design choices:

  * There is no single "top trader" list.  `rank_all` produces every ranking the
    specification asks for, and disagreement between them is information.
  * Sample size is priced in, so ranking by win rate does not simply return
    whoever has traded least.  Win rate uses a Wilson lower bound; returns are
    shrunk toward zero edge.  Neither is shrunk toward the peer mean, which
    would be contaminated by the outlier under judgement.
  * Every ranking carries a survivorship-bias warning, because the trade feed
    only contains traders who were still trading during the window.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable

from .config import Config
from .provenance import EpistemicClass, utcnow
from .storage import Store
from .traders import TraderMetrics


@dataclass
class RankedTrader:
    trader_id: str
    rank: int
    score: float
    metric: str
    window_days: int
    username: str | None = None
    wallet: str | None = None
    platform: str | None = None
    metrics: dict[str, Any] = field(default_factory=dict)
    caveats: list[str] = field(default_factory=list)

    def explain(self) -> str:
        m = self.metrics
        bits = []
        if m.get("realized_pnl") is not None:
            bits.append(f"realized P&L {m['realized_pnl']:+,.0f}")
        if m.get("roi") is not None:
            bits.append(f"ROI {m['roi']:+.1%}")
        if m.get("win_rate") is not None:
            bits.append(f"win rate {m['win_rate']:.0%} over "
                        f"{m.get('n_closed_lots', 0)} closed lots")
        if m.get("risk_adjusted") is not None:
            bits.append(f"risk-adjusted {m['risk_adjusted']:.2f}")
        if m.get("max_drawdown") is not None:
            bits.append(f"max drawdown {m['max_drawdown']:,.0f}")
        return "; ".join(bits) or "insufficient data to characterise"


def _wilson_lower_bound(rate: float | None, n: int, z: float = 1.96
                        ) -> float | None:
    """Lower bound of the Wilson score interval for a proportion.

    This is the right tool for ranking win rates. Shrinking toward the observed
    population mean is not: with a small or skewed peer group the mean is itself
    contaminated by the very outlier being judged, so a 3-for-3 trader gets
    pulled toward a high average and still wins. The Wilson bound instead asks
    "what win rate can this sample actually support?", which is monotonic in
    sample size and needs no peer group at all.

    3 wins from 3 -> ~0.44.  186 wins from 300 (62%) -> ~0.56.
    """
    if rate is None or n <= 0:
        return None
    phat = max(0.0, min(1.0, rate))
    denom = 1 + z * z / n
    centre = phat + z * z / (2 * n)
    margin = z * math.sqrt((phat * (1 - phat) + z * z / (4 * n)) / n)
    return round((centre - margin) / denom, 6)


def _shrink_to_zero(value: float | None, n: int, prior_n: int) -> float | None:
    """Shrink a return figure toward zero edge in proportion to sample size.

    Zero is the honest prior for a trading return: absent evidence, assume no
    edge. Shrinking toward the peer mean would import the same contamination
    problem described above, and would also reward a trader merely for being
    surrounded by unprofitable peers.
    """
    if value is None or n <= 0:
        return None
    weight = n / (n + prior_n)
    return round(weight * value, 6)


# Each ranker maps metrics -> score (higher is better), or None if not rankable.
Ranker = Callable[[TraderMetrics, dict[str, float]], float | None]


def _r_realized_pnl(m: TraderMetrics, _pop: dict[str, float]) -> float | None:
    return m.realized_pnl


def _r_roi(m: TraderMetrics, pop: dict[str, float]) -> float | None:
    return _shrink_to_zero(m.roi, m.n_closed_lots, int(pop.get("prior_n", 30)))


def _r_risk_adjusted(m: TraderMetrics, _pop: dict[str, float]) -> float | None:
    return m.risk_adjusted


def _r_consistency(m: TraderMetrics, _pop: dict[str, float]) -> float | None:
    return m.consistency


def _r_win_rate(m: TraderMetrics, _pop: dict[str, float]) -> float | None:
    return _wilson_lower_bound(m.win_rate, m.n_closed_lots)


def _r_volume(m: TraderMetrics, _pop: dict[str, float]) -> float | None:
    return m.total_volume or None


def _r_drawdown_adjusted(m: TraderMetrics, _pop: dict[str, float]) -> float | None:
    """Return per unit of worst drawdown -- a crude Calmar analogue."""
    if m.realized_pnl is None or not m.max_drawdown:
        return None
    return round(m.realized_pnl / abs(m.max_drawdown), 4)


RANKERS: dict[str, Ranker] = {
    "realized_pnl": _r_realized_pnl,
    "roi": _r_roi,
    "risk_adjusted": _r_risk_adjusted,
    "consistency": _r_consistency,
    "win_rate": _r_win_rate,
    "volume": _r_volume,
    "drawdown_adjusted": _r_drawdown_adjusted,
}

RANKER_LABELS = {
    "realized_pnl": "TOP BY REALIZED PNL",
    "roi": "TOP BY ROI (shrunk toward zero edge for sample size)",
    "risk_adjusted": "TOP BY RISK-ADJUSTED PERFORMANCE",
    "consistency": "TOP BY CONSISTENCY (share of profitable months)",
    "win_rate": "TOP BY WIN RATE (Wilson lower bound)",
    "volume": "TOP BY VOLUME",
    "drawdown_adjusted": "TOP BY RETURN PER UNIT DRAWDOWN",
}


class RankingEngine:
    def __init__(self, store: Store, config: Config):
        self.store = store
        self.config = config

    def eligible(self, metrics: dict[str, TraderMetrics]
                 ) -> dict[str, TraderMetrics]:
        cfg = self.config.ranking
        return {
            tid: m for tid, m in metrics.items()
            if m.n_trades >= cfg.min_trades_for_ranking
            and m.active_days >= min(cfg.min_active_days, m.window_days)
        }

    def rank(self, metrics: dict[str, TraderMetrics], method: str,
             window_days: int, limit: int = 10) -> list[RankedTrader]:
        if method not in RANKERS:
            raise KeyError(f"unknown ranking method: {method}. "
                           f"Known: {', '.join(sorted(RANKERS))}")
        pool = self.eligible(metrics)
        pop = {"prior_n": self.config.ranking.shrinkage_prior_trades}
        ranker = RANKERS[method]
        scored: list[tuple[str, float, TraderMetrics]] = []
        for tid, m in pool.items():
            score = ranker(m, pop)
            if score is not None:
                scored.append((tid, float(score), m))
        scored.sort(key=lambda row: row[1], reverse=True)

        out: list[RankedTrader] = []
        for i, (tid, score, m) in enumerate(scored[:limit], start=1):
            row = self.store.get_trader(tid)
            out.append(RankedTrader(
                trader_id=tid, rank=i, score=round(score, 4), metric=method,
                window_days=window_days,
                username=row["username"] if row else None,
                wallet=row["wallet"] if row else None,
                platform=row["platform"] if row else None,
                metrics=m.to_dict(),
                caveats=self._caveats(m, window_days),
            ))
        return out

    def _caveats(self, m: TraderMetrics, window_days: int) -> list[str]:
        out = list(m.notes)
        # §23 - the feed only contains traders still active in the window.
        out.append(
            "Survivorship bias: this ranking is drawn from traders active in the "
            "observation window. Traders who lost capital and stopped are "
            "systematically absent."
        )
        if m.n_closed_lots < self.config.ranking.shrinkage_prior_trades:
            out.append(
                f"Small sample: only {m.n_closed_lots} closed lots. Rate metrics "
                f"are shrunk toward the population mean and remain noisy."
            )
        if window_days < self.config.ranking.survivorship_warning_threshold:
            out.append(
                f"Short window ({window_days}d): recent form, not established "
                f"skill. Past performance does not imply future performance."
            )
        if m.source_kind in ("synthetic", "fixture"):
            out.append(
                "NOT REAL: computed from fabricated data. This describes no "
                "actual person's performance."
            )
        return out

    def rank_all(self, metrics: dict[str, TraderMetrics], window_days: int,
                 limit: int = 10) -> dict[str, list[RankedTrader]]:
        """Section 4: every ranking, not one."""
        return {name: self.rank(metrics, name, window_days, limit)
                for name in RANKERS}

    # -------------------------------------------------------------- watchlist

    def build_watchlist(self, per_window: dict[int, dict[str, TraderMetrics]],
                        limit: int | None = None) -> list[RankedTrader]:
        """Section 5: dynamic top-N by agreement across metrics and windows.

        A trader earns a place by appearing near the top of several independent
        rankings over several horizons, not by topping one of them once.  The
        list is rebuilt from current data on every call; nobody is permanently
        labelled a top trader.
        """
        limit = limit or self.config.watchlist_size
        points: dict[str, float] = {}
        appearances: dict[str, list[str]] = {}
        best_metrics: dict[str, dict[str, Any]] = {}

        for window_days, metrics in sorted(per_window.items()):
            # Longer windows carry more weight: 7d form is the weakest evidence.
            window_weight = min(1.0, window_days / 90.0)
            for method in RANKERS:
                ranked = self.rank(metrics, method, window_days, limit=limit)
                for r in ranked:
                    # Rank 1 scores `limit` points, decaying linearly.
                    pts = (limit - r.rank + 1) * window_weight
                    points[r.trader_id] = points.get(r.trader_id, 0.0) + pts
                    appearances.setdefault(r.trader_id, []).append(
                        f"#{r.rank} {RANKER_LABELS[method]} ({window_days}d)"
                    )
                    if r.trader_id not in best_metrics or window_days == 90:
                        best_metrics[r.trader_id] = r.metrics

        ordered = sorted(points.items(), key=lambda kv: kv[1], reverse=True)
        out: list[RankedTrader] = []
        for i, (tid, score) in enumerate(ordered[:limit], start=1):
            row = self.store.get_trader(tid)
            m = best_metrics.get(tid, {})
            out.append(RankedTrader(
                trader_id=tid, rank=i, score=round(score, 2),
                metric="composite", window_days=90,
                username=row["username"] if row else None,
                wallet=row["wallet"] if row else None,
                platform=row["platform"] if row else None,
                metrics=m,
                caveats=[
                    f"Qualified via {len(appearances.get(tid, []))} top-{limit} "
                    f"placements across independent metrics and windows.",
                    "Membership is recomputed from current data on every run; "
                    "this is not a permanent designation.",
                    "Survivorship bias applies: only traders active in the "
                    "window can appear here.",
                ],
            ))
        return out

    def persist_watchlist(self, watchlist: list[RankedTrader]) -> None:
        self.store.set_watchlist(
            [(r.trader_id, r.rank, r.explain()) for r in watchlist]
        )


def describe_watchlist_entry(r: RankedTrader, store: Store,
                             now: datetime | None = None) -> str:
    """Section 5: why they are here, what they trade, form, risk, activity."""
    now = now or utcnow()
    m = r.metrics
    cats = m.get("categories") or {}
    top_cats = ", ".join(list(cats)[:3]) or "unknown"
    lines = [
        f"#{r.rank}  {r.username or r.trader_id}  [{r.platform}]",
        f"    WHY ON WATCHLIST : composite score {r.score} across metrics/windows",
        f"    WHAT THEY TRADE  : {top_cats} "
        f"({m.get('markets_traded', 0)} markets, "
        f"concentration HHI {m.get('concentration_hhi')})",
        f"    PERFORMANCE      : {r.explain()}",
        f"    ACTIVITY         : {m.get('n_trades', 0)} trades, "
        f"{m.get('trade_frequency_per_day')}/day, last {m.get('last_trade')}",
    ]
    hold = m.get("avg_hold_seconds")
    if hold:
        lines.append(f"    TYPICAL HOLD     : {hold / 3600:.1f}h")
    risk_bits = []
    if m.get("max_drawdown") is not None:
        risk_bits.append(f"max drawdown {m['max_drawdown']:,.0f}")
    if m.get("pnl_volatility") is not None:
        risk_bits.append(f"P&L volatility {m['pnl_volatility']:,.0f}")
    if m.get("avg_position_size") is not None:
        risk_bits.append(f"avg position {m['avg_position_size']:,.0f}")
    lines.append(f"    RISK PROFILE     : {'; '.join(risk_bits) or 'not calculable'}")
    for c in r.caveats:
        lines.append(f"    [{EpistemicClass.ANALYSIS.value}] caveat: {c}")
    return "\n".join(lines)

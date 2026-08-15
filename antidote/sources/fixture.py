"""Deterministic SYNTHETIC data source.

This exists for one reason: the build environment's egress policy blocks every
real prediction-market host, and an intelligence system that has never had data
flow through it is not a system, it is a folder of untested files.  The fixture
source lets every engine -- ingest, metrics, ranking, detection, alerting,
copy-trade feasibility, paper trading, backtesting, reporting -- be exercised and
tested end to end without a network.

Everything it emits is fabricated:

  * source_kind is SYNTHETIC, so `Provenance.source_kind.is_real` is False and
    `require_real()` refuses to publish or notify on it;
  * every identifier is prefixed SYNTHETIC-, so a fixture trader can never be
    mistaken for, or collide with, a real wallet;
  * the store reports the weakest source kind it holds, so reports and the
    dashboard carry a synthetic-data banner automatically.

These are not real traders.  Their "performance" is drawn from a random number
generator with a fixed seed.  Nothing here is evidence about anybody.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from typing import Any

from ..provenance import SourceKind
from ..storage import Market, Snapshot, Trade, Trader
from .base import Capability, MarketSource

PREFIX = "SYNTHETIC"

CATEGORIES = [
    "Politics", "Sports", "Economics", "Finance",
    "Technology", "Crypto", "Entertainment", "Weather",
]

TEMPLATES = {
    "Politics": "Will {actor} win the {year} {office} race?",
    "Sports": "Will {actor} reach the {year} {office} final?",
    "Economics": "Will {actor} report inflation above {pct}% in {month}?",
    "Finance": "Will {actor} close above ${level} on {month} 30, {year}?",
    "Technology": "Will {actor} ship {office} before {month} {year}?",
    "Crypto": "Will {actor} trade above ${level} during {month} {year}?",
    "Entertainment": "Will {actor} win Best {office} at the {year} awards?",
    "Weather": "Will {actor} record above {pct}mm rainfall in {month}?",
}

ACTORS = [
    "Northgate", "Rivermoor", "Castellan", "Vandermeer", "Ashcombe",
    "Thornbury", "Halloway", "Windermere", "Brackenridge", "Ellesmere",
    "Fairweather", "Kingsbury", "Merrivale", "Ravenswood", "Stonebridge",
]
OFFICES = ["Governor", "Championship", "Model v3", "Feature", "Picture", "Senate"]
MONTHS = ["January", "March", "June", "September", "November"]


class FixtureSource(MarketSource):
    """Generates a self-consistent synthetic market/trader/trade universe."""

    platform = "fixture"
    # FIXTURE rather than SYNTHETIC: both are `is_real == False`, so publishing
    # guards, `require_real()` and the report banners behave identically. The
    # difference is the data-confidence floor -- SYNTHETIC scores 0.30, below the
    # 0.35 minimum the detectors enforce, which would make the alert pipeline
    # untestable and leave operators unable to validate their own thresholds
    # before going live. A seeded, reproducible test corpus is a fixture.
    source_kind = SourceKind.FIXTURE
    docs_url = "(fixture - generated locally, no external source)"
    capabilities = frozenset({
        Capability.MARKETS,
        Capability.SNAPSHOTS,
        Capability.PUBLIC_TRADES,
        Capability.TRADER_IDENTITY,
        Capability.PRICE_HISTORY,
        Capability.OPEN_INTEREST,
        Capability.RESOLUTION_RULES,
    })

    def __init__(self, cfg: Any, *, seed: int = 20260815, n_markets: int = 60,
                 n_traders: int = 30, n_trades: int = 1800, days: int = 120):
        super().__init__(cfg)
        self.seed = seed
        self.n_markets = n_markets
        self.n_traders = n_traders
        self.n_trades = n_trades
        self.days = days
        self._built = False
        self._markets: list[tuple[Market, Snapshot]] = []
        self._traders: list[Trader] = []
        self._trades: list[tuple[Trade, Trader | None]] = []
        self._truth: dict[str, dict[str, Any]] = {}

    # ------------------------------------------------------------------ build

    def _build(self) -> None:
        if self._built:
            return
        rng = random.Random(self.seed)
        now = datetime.now(timezone.utc)
        start = now - timedelta(days=self.days)

        # -- markets --------------------------------------------------------
        for i in range(self.n_markets):
            cat = CATEGORIES[i % len(CATEGORIES)]
            actor = rng.choice(ACTORS)
            question = TEMPLATES[cat].format(
                actor=actor, year=2026, office=rng.choice(OFFICES),
                month=rng.choice(MONTHS), pct=rng.randint(2, 9),
                level=rng.choice([100, 250, 500, 1000, 5000, 70000]),
            )
            ext = f"{PREFIX}-MKT-{i:04d}"
            resolved = i < int(self.n_markets * 0.6)
            close = (start + timedelta(days=rng.uniform(5, self.days * 0.9))
                     if resolved else now + timedelta(days=rng.uniform(0.2, 60)))
            true_prob = round(rng.betavariate(2.2, 2.2), 4)
            outcome = None
            if resolved:
                outcome = "Yes" if rng.random() < true_prob else "No"

            # Markets 0-11 share three event keys so the correlation engine (§26)
            # has genuine overlapping exposure to find.
            event_key = f"{PREFIX}-EVT-{i // 4:03d}" if i < 12 else f"{PREFIX}-EVT-{i:03d}"

            liquidity = round(rng.lognormvariate(9.2, 1.1), 2)
            volume = round(liquidity * rng.uniform(1.5, 20), 2)
            price = (round(min(0.985, max(0.015, true_prob + rng.gauss(0, 0.05))), 4)
                     if not resolved else (1.0 if outcome == "Yes" else 0.0))

            market = Market(
                id=f"{self.platform}:{ext}",
                platform=self.platform,
                external_id=ext,
                question=f"[SYNTHETIC] {question}",
                slug=f"synthetic-market-{i:04d}",
                category=cat,
                status="closed" if resolved else "open",
                close_time=close,
                resolution_source="SYNTHETIC fixture generator (not a real source)",
                resolution_criteria=(
                    "SYNTHETIC market. Resolves YES if the fabricated event "
                    "described above occurs before the close time. This text "
                    "exists to exercise the resolution-rule check (§33); it "
                    "describes no real-world event."
                ),
                resolution_date=close,
                outcomes=["Yes", "No"],
                event_key=event_key,
                raw={"synthetic": True, "true_prob": true_prob,
                     "resolved_outcome": outcome},
            )
            snap = Snapshot(
                market_id=market.id,
                ts=now,
                price=price,
                implied_prob=price,
                volume=volume,
                volume_24h=round(volume * rng.uniform(0.02, 0.25), 2),
                liquidity=liquidity,
                open_interest=round(liquidity * rng.uniform(0.5, 3), 2),
                best_bid=round(max(0.005, price - rng.uniform(0.003, 0.03)), 4),
                best_ask=round(min(0.995, price + rng.uniform(0.003, 0.03)), 4),
            )
            self._markets.append((market, snap))
            self._truth[market.id] = {
                "true_prob": true_prob, "outcome": outcome,
                "resolved": resolved, "price": price, "liquidity": liquidity,
            }

        # -- traders --------------------------------------------------------
        # Each gets a latent edge: how much better than the posted price their
        # entries actually are. Most are near zero; a few are skilled; some are
        # negative. Ranking should recover this ordering -- that is the test.
        for i in range(self.n_traders):
            ext = f"{PREFIX}-0x{i:040x}"
            edge = rng.gauss(0.0, 0.035)
            if i < 4:
                edge = abs(edge) + rng.uniform(0.04, 0.09)   # skilled
            elif i >= self.n_traders - 4:
                edge = -abs(edge) - rng.uniform(0.02, 0.05)  # unskilled
            trader = Trader(
                id=f"{self.platform}:{ext}",
                platform=self.platform,
                external_id=ext,
                username=f"{PREFIX}-trader-{i:02d}",
                wallet=ext,
                raw={"synthetic": True, "latent_edge": round(edge, 4)},
            )
            self._traders.append(trader)

        # -- trades ---------------------------------------------------------
        open_lots: dict[tuple[str, str], list[dict[str, Any]]] = {}
        for n in range(self.n_trades):
            trader = rng.choice(self._traders)
            edge = trader.raw["latent_edge"]
            market, snap = rng.choice(self._markets)
            truth = self._truth[market.id]

            ts = start + timedelta(seconds=rng.uniform(0, self.days * 86400))
            if market.close_time and ts >= market.close_time:
                ts = market.close_time - timedelta(hours=rng.uniform(1, 72))
            if ts <= start:
                continue

            entry = round(min(0.97, max(0.03,
                          truth["true_prob"] + rng.gauss(0, 0.06) - edge)), 4)
            # Share counts chosen so notional spans roughly $100-$500k, which is
            # the range the §7 tier ladder is written against.
            size = round(rng.lognormvariate(8.0, 1.5), 2)
            side = "BUY"
            outcome_leg = "Yes" if rng.random() < 0.62 else "No"
            value = round(entry * size, 2)

            key = (trader.id, market.id)
            open_lots.setdefault(key, []).append(
                {"price": entry, "size": size, "outcome": outcome_leg, "ts": ts}
            )

            trade = Trade(
                id=f"{self.platform}:{PREFIX}-TRD-{n:06d}",
                platform=self.platform,
                market_id=market.id,
                trader_id=trader.id,
                external_id=f"{PREFIX}-TX-{n:06d}",
                ts=ts,
                side=side,
                outcome=outcome_leg,
                price=entry,
                size=size,
                value=value,
                liquidity=truth["liquidity"],
                raw={"synthetic": True},
            )
            self._trades.append((trade, trader))

            # Roughly a third of lots get closed before resolution, which gives
            # the metrics engine both realized-by-exit and realized-by-settlement
            # paths to handle.
            if rng.random() < 0.33:
                hold = timedelta(hours=rng.uniform(2, 400))
                exit_ts = ts + hold
                if market.close_time and exit_ts >= market.close_time:
                    exit_ts = market.close_time - timedelta(minutes=30)
                # Never emit a trade dated in the future: an observation feed
                # cannot contain one, and downstream delay maths would go
                # negative.
                exit_ts = min(exit_ts, now)
                if exit_ts > ts:
                    drift = (truth["true_prob"] - entry) * rng.uniform(0.2, 0.9)
                    exit_price = round(min(0.98, max(0.02,
                                      entry + drift + rng.gauss(0, 0.03))), 4)
                    self._trades.append((
                        Trade(
                            id=f"{self.platform}:{PREFIX}-TRD-{n:06d}-X",
                            platform=self.platform,
                            market_id=market.id,
                            trader_id=trader.id,
                            external_id=f"{PREFIX}-TX-{n:06d}-X",
                            ts=exit_ts,
                            side="SELL",
                            outcome=outcome_leg,
                            price=exit_price,
                            size=size,
                            value=round(exit_price * size, 2),
                            liquidity=truth["liquidity"],
                            raw={"synthetic": True},
                        ),
                        trader,
                    ))

        self._trades.sort(key=lambda pair: pair[0].ts)
        self._built = True

    # ----------------------------------------------------------------- source

    def fetch_markets(self, limit: int = 100, **kw: Any
                      ) -> list[tuple[Market, Snapshot]]:
        self._build()
        return self._markets[:limit]

    def fetch_trades(self, market_id: str | None = None, limit: int = 100,
                     *, since: datetime | None = None, **kw: Any
                     ) -> list[tuple[Trade, Trader | None]]:
        self._build()
        rows = self._trades
        if market_id:
            rows = [r for r in rows if r[0].market_id == market_id]
        if since:
            rows = [r for r in rows if r[0].ts >= since]
        return rows[-limit:] if limit else rows

    def fetch_price_history(self, market_id: str, interval: str = "1d"
                            ) -> list[tuple[datetime, float]]:
        self._build()
        truth = self._truth.get(market_id)
        if not truth:
            return []
        rng = random.Random(f"{self.seed}:{market_id}")
        now = datetime.now(timezone.utc)
        points: list[tuple[datetime, float]] = []
        price = truth["true_prob"] + rng.gauss(0, 0.08)
        for d in range(self.days, 0, -1):
            price += rng.gauss(0, 0.02) + (truth["true_prob"] - price) * 0.05
            points.append((now - timedelta(days=d),
                           round(min(0.99, max(0.01, price)), 4)))
        return points

    def resolution_truth(self, market_id: str) -> dict[str, Any] | None:
        """Ground truth for backtesting. Only meaningful for synthetic data."""
        self._build()
        return self._truth.get(market_id)

    def all_traders(self) -> list[Trader]:
        self._build()
        return list(self._traders)

    def health(self) -> tuple[bool, str]:
        return True, "synthetic source: always available, never real"

    def describe_limits(self) -> list[str]:
        return [
            "ALL DATA IS FABRICATED - describes no real market, trader or trade",
            "performance figures are drawn from a seeded RNG and are not evidence",
            "usable only for testing engine behaviour, never for trading decisions",
        ]

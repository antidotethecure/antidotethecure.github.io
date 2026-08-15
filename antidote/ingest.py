"""Section 2: the ingestion pipeline.

    connect -> index markets -> index public traders -> snapshot prices,
    volume, open interest, liquidity, order book -> record trades

Each stage is independently fallible and independently logged.  A source that
cannot supply a stage is skipped for that stage, never faked.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from .config import Config
from .provenance import SourceKind
from .sources import Capability, MarketSource, SourceUnavailable, active_sources
from .storage import Market, Snapshot, Store, Trade


@dataclass
class IngestResult:
    platform: str
    markets: int = 0
    snapshots: int = 0
    traders: int = 0
    trades: int = 0
    skipped: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    policy_denials: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errors and not self.policy_denials

    def summary(self) -> str:
        bits = [f"{self.platform}: {self.markets} markets",
                f"{self.snapshots} snapshots",
                f"{self.traders} traders", f"{self.trades} trades"]
        line = ", ".join(bits)
        if self.policy_denials:
            line += f" | ACCESS DENIED: {'; '.join(self.policy_denials)}"
        if self.errors:
            line += f" | errors: {'; '.join(self.errors)}"
        if self.skipped:
            line += f" | skipped: {'; '.join(self.skipped)}"
        return line


class Ingestor:
    def __init__(self, store: Store, config: Config):
        self.store = store
        self.config = config

    def run(self, *, platforms: list[str] | None = None, market_limit: int = 100,
            trade_limit: int = 500, with_trades: bool = True,
            with_history: bool = False) -> list[IngestResult]:
        results = []
        for source in active_sources(self.config, only=platforms):
            results.append(self.ingest_source(
                source, market_limit=market_limit, trade_limit=trade_limit,
                with_trades=with_trades, with_history=with_history,
            ))
        return results

    def ingest_source(self, source: MarketSource, *, market_limit: int = 100,
                      trade_limit: int = 500, with_trades: bool = True,
                      with_history: bool = False) -> IngestResult:
        result = IngestResult(platform=source.platform)
        markets = self._ingest_markets(source, market_limit, result)
        if with_history and markets:
            self._ingest_history(source, markets, result)
        if with_trades and markets:
            self._ingest_trades(source, trade_limit, result)
        self.store.log_ingest(
            source.platform, "cycle", result.ok,
            result.markets + result.trades, result.summary(),
        )
        return result

    # --------------------------------------------------------------- markets

    def _ingest_markets(self, source: MarketSource, limit: int,
                        result: IngestResult) -> list[Market]:
        if not source.supports(Capability.MARKETS):
            result.skipped.append("markets (unsupported)")
            return []
        try:
            pairs = source.fetch_markets(limit=limit)
        except SourceUnavailable as exc:
            self._record_failure(result, exc)
            return []
        except NotImplementedError as exc:
            result.skipped.append(f"markets ({exc})")
            return []

        prov = source.provenance("markets")
        markets: list[Market] = []
        filt = self.config.filters
        with self.store.tx():
            for market, snapshot in pairs:
                if not self._passes_filter(market, filt):
                    continue
                self.store.upsert_market(market, prov)
                result.markets += 1
                markets.append(market)
                if snapshot is not None:
                    self.store.add_snapshot(snapshot, prov)
                    result.snapshots += 1

        # Polymarket needs CLOB token ids cached for later book/history lookups.
        cache = getattr(source, "cache_token_ids", None)
        if callable(cache):
            cache(markets)
        return markets

    @staticmethod
    def _passes_filter(market: Market, filt: Any) -> bool:
        """Section 17 filters, applied at ingest to keep the store focused."""
        if filt.only_open and market.status != "open":
            # Closed markets are still stored when explicitly requested, since
            # backtesting and resolution need them; the flag governs live polls.
            return False
        if filt.categories and (market.category or "") not in filt.categories:
            return False
        if filt.exclude_categories and (market.category or "") in filt.exclude_categories:
            return False
        if filt.closing_within_hours is not None and market.close_time:
            from .provenance import utcnow
            hours = (market.close_time - utcnow()).total_seconds() / 3600.0
            if hours > filt.closing_within_hours or hours < 0:
                return False
        return True

    # --------------------------------------------------------------- history

    def _ingest_history(self, source: MarketSource, markets: list[Market],
                        result: IngestResult) -> None:
        """Backfill snapshots from a source's price-history endpoint.

        Without history there is a single snapshot per market, which makes price
        movement undetectable and delayed-fill simulation meaningless: every
        fill would use the one price on record.
        """
        if not source.supports(Capability.PRICE_HISTORY):
            result.skipped.append("price history (unsupported)")
            return
        prov = source.provenance("price_history")
        added = 0
        for market in markets:
            try:
                points = source.fetch_price_history(market.id)
            except (NotImplementedError, SourceUnavailable):
                continue
            if not points:
                continue
            with self.store.tx():
                for ts, price in points:
                    self.store.add_snapshot(
                        Snapshot(market_id=market.id, ts=ts, price=price,
                                 implied_prob=price),
                        prov,
                    )
                    added += 1
        result.snapshots += added

    # ---------------------------------------------------------------- trades

    def _ingest_trades(self, source: MarketSource, limit: int,
                       result: IngestResult) -> None:
        if not source.supports(Capability.PUBLIC_TRADES):
            result.skipped.append("trades (platform exposes none publicly)")
            return
        try:
            pairs = source.fetch_trades(limit=limit)
        except SourceUnavailable as exc:
            self._record_failure(result, exc)
            return
        except NotImplementedError as exc:
            result.skipped.append(f"trades ({exc})")
            return

        prov = source.provenance("trades")
        known = {row["id"] for row in self.store.markets(limit=100_000)}
        identity = source.supports(Capability.TRADER_IDENTITY)
        if not identity:
            result.skipped.append(
                "trader identity (not published by this platform)"
            )

        seen_traders: set[str] = set()
        with self.store.tx():
            for trade, trader in pairs:
                # A trade against a market we have not indexed cannot be
                # contextualised, so it is dropped rather than half-stored.
                if trade.market_id not in known:
                    continue
                if trader is not None and identity:
                    self.store.upsert_trader(trader, prov)
                    if trader.id not in seen_traders:
                        seen_traders.add(trader.id)
                        result.traders += 1
                elif not identity:
                    trade.trader_id = None
                self._enrich(trade)
                if self.store.add_trade(trade, prov):
                    result.trades += 1

    def _enrich(self, trade: Trade) -> None:
        """Attach market context to the trade (§6).

        Pre- and post-trade prices are read from the snapshots bracketing the
        trade's own timestamp, not from the latest snapshot -- using "now" as
        the pre-trade price would be wrong for every historical trade.
        """
        ts = trade.ts.isoformat()
        before = self.store.conn.execute(
            "SELECT price, volume, liquidity FROM market_snapshots "
            "WHERE market_id = ? AND ts <= ? ORDER BY ts DESC LIMIT 1",
            (trade.market_id, ts),
        ).fetchone()
        after = self.store.conn.execute(
            "SELECT price, volume FROM market_snapshots "
            "WHERE market_id = ? AND ts > ? ORDER BY ts ASC LIMIT 1",
            (trade.market_id, ts),
        ).fetchone()

        if before is not None:
            if trade.price_before is None:
                trade.price_before = before["price"]
            if trade.volume_before is None:
                trade.volume_before = before["volume"]
            if trade.liquidity is None:
                trade.liquidity = before["liquidity"]
        if after is not None:
            if trade.price_after is None:
                trade.price_after = after["price"]
            if trade.volume_after is None:
                trade.volume_after = after["volume"]

        if trade.liquidity is None:
            snap = self.store.latest_snapshot(trade.market_id)
            if snap is not None:
                trade.liquidity = snap["liquidity"]

    @staticmethod
    def _record_failure(result: IngestResult, exc: SourceUnavailable) -> None:
        if exc.policy_denial:
            # Never retried, never routed around; reported and left alone.
            result.policy_denials.append(exc.reason)
        else:
            result.errors.append(exc.reason)


def source_health(config: Config) -> list[dict[str, Any]]:
    """Section 45 steps 1-4: what is reachable and what each source can supply."""
    rows: list[dict[str, Any]] = []
    for source in active_sources(config):
        ok, detail = source.health()
        rows.append({
            "platform": source.platform,
            "reachable": ok,
            "detail": detail,
            "source_kind": source.source_kind.value,
            "real_data": source.source_kind.is_real,
            "capabilities": sorted(c.value for c in source.capabilities),
            "limits": source.describe_limits(),
            "docs": source.docs_url,
        })
    return rows

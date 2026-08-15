"""Polymarket adapter (Gamma + CLOB + Data API), public endpoints only.

Polymarket is the richer of the two supported platforms for trader intelligence:
settlement happens on-chain, so the Data API exposes per-trade wallet addresses
and public pseudonyms.  That makes §3 (trader intelligence) and §5 (watchlist)
genuinely possible here, in a way it is not on Kalshi.

IMPORTANT - endpoint shapes are written against Polymarket's published public
API documentation but could NOT be verified live in the build environment, whose
egress policy blocks every polymarket.com host.  Treat the field mappings below
as unverified until `antidote sources health` reports this platform reachable
and a first ingest succeeds.  Field names on these APIs do drift.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from ..provenance import SourceKind
from ..storage import Market, Snapshot, Trade, Trader, parse_ts
from .base import (
    Capability,
    MarketSource,
    coerce_float,
    market_key,
    parse_json_field,
    trader_key,
)

GAMMA = "https://gamma-api.polymarket.com"
CLOB = "https://clob.polymarket.com"
DATA = "https://data-api.polymarket.com"


class PolymarketSource(MarketSource):
    platform = "polymarket"
    source_kind = SourceKind.OFFICIAL_API
    docs_url = "https://docs.polymarket.com/"
    capabilities = frozenset({
        Capability.MARKETS,
        Capability.SNAPSHOTS,
        Capability.ORDERBOOK,
        Capability.PRICE_HISTORY,
        Capability.PUBLIC_TRADES,
        Capability.TRADER_IDENTITY,
        Capability.TRADER_POSITIONS,
        Capability.LEADERBOARD,
        Capability.RESOLUTION_RULES,
    })

    # ---------------------------------------------------------------- markets

    def fetch_markets(self, limit: int = 100, *, offset: int = 0,
                      closed: bool = False, **kw: Any
                      ) -> list[tuple[Market, Snapshot]]:
        payload = self.http.get_json(
            f"{GAMMA}/markets",
            {"limit": limit, "offset": offset,
             "closed": str(closed).lower(), "order": "volume24hr",
             "ascending": "false"},
        )
        rows = payload if isinstance(payload, list) else payload.get("data", [])
        out: list[tuple[Market, Snapshot]] = []
        for row in rows:
            parsed = self._parse_market(row)
            if parsed:
                out.append(parsed)
        return out

    def _parse_market(self, row: dict[str, Any]) -> tuple[Market, Snapshot] | None:
        external_id = str(row.get("conditionId") or row.get("id") or "").strip()
        question = (row.get("question") or row.get("title") or "").strip()
        if not external_id or not question:
            return None

        outcomes = parse_json_field(row.get("outcomes")) or []
        prices = parse_json_field(row.get("outcomePrices")) or []
        if isinstance(outcomes, str):
            outcomes = [outcomes]
        outcomes = [str(o) for o in outcomes]

        # Convention: index 0 is the YES leg on a binary market.
        price = None
        if isinstance(prices, list) and prices:
            price = coerce_float(prices[0])

        closed = bool(row.get("closed"))
        active = row.get("active", True)
        status = "closed" if closed else ("open" if active else "inactive")

        # An event groups markets that resolve off one underlying event; that is
        # exactly the correlated-exposure key §26 needs.
        events = row.get("events") or []
        event_key = None
        if isinstance(events, list) and events:
            first = events[0]
            if isinstance(first, dict):
                event_key = str(first.get("id") or first.get("slug") or "") or None
        event_key = event_key or row.get("eventId") or row.get("groupItemTitle")

        market = Market(
            id=market_key(self.platform, external_id),
            platform=self.platform,
            external_id=external_id,
            question=question,
            slug=row.get("slug"),
            category=(row.get("category") or self._category_from_events(events)),
            status=status,
            close_time=parse_ts(row.get("endDate") or row.get("end_date_iso")),
            # §33 - carry the actual resolution text through, never the headline.
            resolution_source=row.get("resolutionSource") or row.get("umaResolutionStatus"),
            resolution_criteria=row.get("description"),
            resolution_date=parse_ts(row.get("endDate")),
            outcomes=outcomes,
            event_key=str(event_key) if event_key else None,
            raw=row,
        )
        snapshot = Snapshot(
            market_id=market.id,
            ts=datetime.now(timezone.utc),
            price=price,
            implied_prob=price,  # Polymarket prices are already probabilities.
            volume=coerce_float(row.get("volumeNum") or row.get("volume")),
            volume_24h=coerce_float(row.get("volume24hr")),
            liquidity=coerce_float(row.get("liquidityNum") or row.get("liquidity")),
            best_bid=coerce_float(row.get("bestBid")),
            best_ask=coerce_float(row.get("bestAsk")),
        )
        return market, snapshot

    @staticmethod
    def _category_from_events(events: Any) -> str | None:
        if isinstance(events, list) and events and isinstance(events[0], dict):
            tags = events[0].get("tags") or []
            if isinstance(tags, list) and tags:
                first = tags[0]
                if isinstance(first, dict):
                    return first.get("label") or first.get("slug")
                return str(first)
        return None

    # ----------------------------------------------------------------- trades

    def fetch_trades(self, market_id: str | None = None, limit: int = 100,
                     *, offset: int = 0, user: str | None = None, **kw: Any
                     ) -> list[tuple[Trade, Trader | None]]:
        """Public trade feed. Each row carries the taker's public wallet."""
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if market_id:
            params["market"] = self._external(market_id)
        if user:
            params["user"] = user
        rows = self.http.get_json(f"{DATA}/trades", params)
        if not isinstance(rows, list):
            rows = rows.get("data", []) if isinstance(rows, dict) else []

        out: list[tuple[Trade, Trader | None]] = []
        for row in rows:
            parsed = self._parse_trade(row)
            if parsed:
                out.append(parsed)
        return out

    def _parse_trade(self, row: dict[str, Any]) -> tuple[Trade, Trader | None] | None:
        condition_id = str(row.get("conditionId") or "").strip()
        price = coerce_float(row.get("price"))
        size = coerce_float(row.get("size"))
        if not condition_id or price is None or size is None:
            return None

        ts_raw = row.get("timestamp")
        if isinstance(ts_raw, (int, float)):
            ts = datetime.fromtimestamp(float(ts_raw), tz=timezone.utc)
        else:
            ts = parse_ts(str(ts_raw)) or datetime.now(timezone.utc)

        wallet = (row.get("proxyWallet") or row.get("maker_address")
                  or row.get("user") or "")
        trader = None
        trader_id = None
        if wallet:
            trader_id = trader_key(self.platform, wallet.lower())
            trader = Trader(
                id=trader_id,
                platform=self.platform,
                external_id=wallet.lower(),
                # `pseudonym` is Polymarket's public display name.
                username=row.get("pseudonym") or row.get("name"),
                wallet=wallet,
                raw={k: row.get(k) for k in ("pseudonym", "name", "profileImage")
                     if row.get(k)},
            )

        tx = row.get("transactionHash") or row.get("id") or ""
        trade_id = f"{self.platform}:{tx}:{row.get('asset', '')}:{ts.timestamp():.0f}"

        trade = Trade(
            id=trade_id,
            platform=self.platform,
            market_id=market_key(self.platform, condition_id),
            trader_id=trader_id,
            external_id=str(tx) or None,
            ts=ts,
            side=(row.get("side") or "").upper() or None,
            outcome=row.get("outcome"),
            price=price,
            size=size,
            # Polymarket size is in shares; notional is shares x price.
            value=round(price * size, 6),
            raw=row,
        )
        return trade, trader

    # -------------------------------------------------------------- orderbook

    def fetch_orderbook(self, market_id: str) -> dict[str, Any]:
        """CLOB book. Requires the ERC-1155 token id, not the condition id."""
        token_id = self._token_id(market_id)
        if not token_id:
            raise NotImplementedError(
                "no CLOB token id known for this market; ingest markets first"
            )
        return self.http.get_json(f"{CLOB}/book", {"token_id": token_id})

    def fetch_price_history(self, market_id: str, interval: str = "1d"
                            ) -> list[tuple[datetime, float]]:
        token_id = self._token_id(market_id)
        if not token_id:
            raise NotImplementedError("no CLOB token id known for this market")
        payload = self.http.get_json(
            f"{CLOB}/prices-history", {"market": token_id, "interval": interval}
        )
        history = payload.get("history", []) if isinstance(payload, dict) else []
        out: list[tuple[datetime, float]] = []
        for point in history:
            t = point.get("t")
            p = coerce_float(point.get("p"))
            if t is None or p is None:
                continue
            out.append((datetime.fromtimestamp(float(t), tz=timezone.utc), p))
        return out

    def fetch_leaderboard(self, limit: int = 100) -> list[Trader]:
        """Public leaderboard.

        Polymarket has moved this endpoint before.  If it 404s, trader ranking
        still works: it is computed from the observed trade feed rather than
        depending on the platform's own leaderboard.
        """
        rows = self.http.get_json(
            f"{DATA}/leaderboard", {"limit": limit, "window": "30d"}
        )
        if isinstance(rows, dict):
            rows = rows.get("data", [])
        out: list[Trader] = []
        for row in rows or []:
            wallet = (row.get("proxyWallet") or row.get("wallet") or "").lower()
            if not wallet:
                continue
            out.append(Trader(
                id=trader_key(self.platform, wallet),
                platform=self.platform,
                external_id=wallet,
                username=row.get("pseudonym") or row.get("name"),
                wallet=wallet,
                raw=row,
            ))
        return out

    def fetch_positions(self, wallet: str) -> list[dict[str, Any]]:
        """Publicly visible open positions for a wallet (§31)."""
        rows = self.http.get_json(f"{DATA}/positions", {"user": wallet})
        return rows if isinstance(rows, list) else []

    # ------------------------------------------------------------------ utils

    @staticmethod
    def _external(market_id: str) -> str:
        return market_id.split(":", 1)[1] if ":" in market_id else market_id

    def _token_id(self, market_id: str) -> str | None:
        """Best-effort token id from the market's cached raw payload."""
        raw = getattr(self, "_token_cache", {}).get(market_id)
        if raw:
            return raw
        return None

    def cache_token_ids(self, markets: list[Market]) -> None:
        """Record CLOB token ids from ingested markets for later book lookups."""
        cache = getattr(self, "_token_cache", {})
        for m in markets:
            tokens = parse_json_field(m.raw.get("clobTokenIds"))
            if isinstance(tokens, list) and tokens:
                cache[m.id] = str(tokens[0])
        self._token_cache = cache

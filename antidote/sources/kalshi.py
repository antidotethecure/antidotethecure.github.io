"""Kalshi adapter (public Trade API v2, read-only endpoints).

A structural difference from Polymarket that shapes the whole system:

    Kalshi's public trade feed is ANONYMOUS.

Kalshi is a CFTC-regulated exchange; it publishes executed trades (price, size,
timestamp, taker side) but not the identity of the counterparties.  There is no
public wallet, no public username, no public per-account P&L.  So on Kalshi this
system can do market intelligence -- volume, price, liquidity, large prints --
but it CANNOT do trader intelligence, trader ranking, a trader watchlist, or
copy-trading.  The adapter therefore does not advertise TRADER_IDENTITY, and the
engines skip those stages for Kalshi markets rather than inventing identities.

Do not attempt to de-anonymise Kalshi counterparties.  Nothing in this system
should try to re-identify a trader the exchange has chosen not to expose.

IMPORTANT - as with the Polymarket adapter, these endpoint shapes follow Kalshi's
published API documentation but are UNVERIFIED in this build environment, whose
egress policy blocks api.elections.kalshi.com.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from ..provenance import SourceKind
from ..storage import Market, Snapshot, Trade, Trader, parse_ts
from .base import Capability, MarketSource, coerce_float, market_key

BASE = "https://api.elections.kalshi.com/trade-api/v2"


class KalshiSource(MarketSource):
    platform = "kalshi"
    source_kind = SourceKind.OFFICIAL_API
    docs_url = "https://trading-api.readme.io/reference/getting-started"
    capabilities = frozenset({
        Capability.MARKETS,
        Capability.SNAPSHOTS,
        Capability.OPEN_INTEREST,   # Kalshi publishes this; Polymarket does not.
        Capability.PUBLIC_TRADES,   # anonymous prints only
        Capability.RESOLUTION_RULES,
        Capability.ORDERBOOK,
    })

    def _headers(self) -> dict[str, str]:
        """Attach an API key only if the operator supplied one.

        Read-only market data does not require authentication.  A key is used
        purely for the operator's own rate-limit tier, never to reach data the
        public endpoints withhold.
        """
        env = self.cfg.api_key_env
        key = os.environ.get(env) if env else None
        return {"Authorization": f"Bearer {key}"} if key else {}

    # ---------------------------------------------------------------- markets

    def fetch_markets(self, limit: int = 100, *, cursor: str | None = None,
                      status: str = "open", **kw: Any
                      ) -> list[tuple[Market, Snapshot]]:
        payload = self.http.get_json(
            f"{BASE}/markets",
            {"limit": min(limit, 1000), "cursor": cursor, "status": status},
            headers=self._headers(),
        )
        rows = payload.get("markets", []) if isinstance(payload, dict) else []
        out: list[tuple[Market, Snapshot]] = []
        for row in rows:
            parsed = self._parse_market(row)
            if parsed:
                out.append(parsed)
        return out

    def _parse_market(self, row: dict[str, Any]) -> tuple[Market, Snapshot] | None:
        ticker = str(row.get("ticker") or "").strip()
        title = (row.get("title") or row.get("subtitle") or "").strip()
        if not ticker or not title:
            return None

        # Kalshi quotes cents (0-100). Normalise to a 0-1 probability so both
        # platforms speak the same units downstream.
        yes_bid = coerce_float(row.get("yes_bid"))
        yes_ask = coerce_float(row.get("yes_ask"))
        last = coerce_float(row.get("last_price"))
        to_prob = lambda c: None if c is None else round(c / 100.0, 6)  # noqa: E731

        price = to_prob(last)
        if price is None and yes_bid is not None and yes_ask is not None:
            price = round((yes_bid + yes_ask) / 200.0, 6)

        market = Market(
            id=market_key(self.platform, ticker),
            platform=self.platform,
            external_id=ticker,
            question=title,
            slug=row.get("event_ticker"),
            category=row.get("category"),
            status=(row.get("status") or "open"),
            close_time=parse_ts(row.get("close_time")),
            # §33 - Kalshi publishes explicit, unusually precise rules text.
            resolution_source=row.get("settlement_source") or "Kalshi rulebook",
            resolution_criteria=(row.get("rules_primary") or "")
                                + (("\n" + row["rules_secondary"])
                                   if row.get("rules_secondary") else ""),
            resolution_date=parse_ts(row.get("expiration_time")
                                     or row.get("close_time")),
            outcomes=["Yes", "No"],
            # All markets in one Kalshi event share an underlying (§26).
            event_key=row.get("event_ticker"),
            raw=row,
        )
        snapshot = Snapshot(
            market_id=market.id,
            ts=datetime.now(timezone.utc),
            price=price,
            implied_prob=price,
            volume=coerce_float(row.get("volume")),
            volume_24h=coerce_float(row.get("volume_24h")),
            liquidity=coerce_float(row.get("liquidity")),
            open_interest=coerce_float(row.get("open_interest")),
            best_bid=to_prob(yes_bid),
            best_ask=to_prob(yes_ask),
        )
        return market, snapshot

    # ----------------------------------------------------------------- trades

    def fetch_trades(self, market_id: str | None = None, limit: int = 100,
                     *, cursor: str | None = None, **kw: Any
                     ) -> list[tuple[Trade, Trader | None]]:
        """Anonymous public prints. The Trader half of each pair is always None."""
        params: dict[str, Any] = {"limit": min(limit, 1000), "cursor": cursor}
        if market_id:
            params["ticker"] = self._external(market_id)
        payload = self.http.get_json(f"{BASE}/markets/trades", params,
                                     headers=self._headers())
        rows = payload.get("trades", []) if isinstance(payload, dict) else []

        out: list[tuple[Trade, Trader | None]] = []
        for row in rows:
            ticker = str(row.get("ticker") or "")
            count = coerce_float(row.get("count"))
            yes_price = coerce_float(row.get("yes_price"))
            if not ticker or count is None or yes_price is None:
                continue
            ts = parse_ts(row.get("created_time")) or datetime.now(timezone.utc)
            price = round(yes_price / 100.0, 6)
            trade_id = f"{self.platform}:{row.get('trade_id') or ''}"
            out.append((
                Trade(
                    id=trade_id,
                    platform=self.platform,
                    market_id=market_key(self.platform, ticker),
                    # No identity is available, and none is inferred.
                    trader_id=None,
                    external_id=str(row.get("trade_id") or "") or None,
                    ts=ts,
                    side=(row.get("taker_side") or "").upper() or None,
                    outcome="Yes",
                    price=price,
                    size=count,
                    # Kalshi contracts settle at $1, so notional is count x price.
                    value=round(count * price, 6),
                    raw=row,
                ),
                None,
            ))
        return out

    def fetch_orderbook(self, market_id: str) -> dict[str, Any]:
        ticker = self._external(market_id)
        return self.http.get_json(
            f"{BASE}/markets/{ticker}/orderbook", {"depth": 10},
            headers=self._headers(),
        )

    def describe_limits(self) -> list[str]:
        return [
            "public trade prints are anonymous: no trader identity, no wallet, "
            "no per-account P&L",
            "trader ranking, the trader watchlist and copy-trading are not "
            "possible on this platform",
            "order-book depth beyond the top levels may require authentication",
        ]

    @staticmethod
    def _external(market_id: str) -> str:
        return market_id.split(":", 1)[1] if ":" in market_id else market_id

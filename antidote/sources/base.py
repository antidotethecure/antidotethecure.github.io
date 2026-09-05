"""Source abstraction, capability declaration, and a polite HTTP client.

Two rules are enforced here rather than left to each adapter:

1.  A source declares what it can actually provide.  The rest of the system asks
    the capability set instead of assuming; that is what turns every "where
    available" clause in the specification into a real branch.
2.  Rate limits and platform terms are respected.  There is no retry-on-403, no
    header spoofing, no CAPTCHA handling, no authentication bypass.  A refusal
    from a platform is a final answer.
"""

from __future__ import annotations

import enum
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Iterable

from ..config import SourceConfig
from ..provenance import Provenance, SourceKind, utcnow
from ..storage import Market, Snapshot, Trade, Trader

USER_AGENT = "AntidotePredictionOS/0.1 (research; contact via repository owner)"


class Capability(enum.Enum):
    MARKETS = "markets"
    SNAPSHOTS = "snapshots"
    ORDERBOOK = "orderbook"
    OPEN_INTEREST = "open_interest"
    PRICE_HISTORY = "price_history"
    PUBLIC_TRADES = "public_trades"
    TRADER_IDENTITY = "trader_identity"
    TRADER_POSITIONS = "trader_positions"
    LEADERBOARD = "leaderboard"
    RESOLUTION_RULES = "resolution_rules"


class SourceUnavailable(RuntimeError):
    """The source could not be reached, or access was refused."""

    def __init__(self, platform: str, reason: str, *, policy_denial: bool = False):
        super().__init__(f"{platform}: {reason}")
        self.platform = platform
        self.reason = reason
        # A policy denial (403/407 from egress, or platform refusal) must not be
        # retried or worked around.
        self.policy_denial = policy_denial


@dataclass
class RateLimiter:
    per_second: float
    _last: float = field(default=0.0, repr=False)

    def wait(self) -> None:
        if self.per_second <= 0:
            return
        interval = 1.0 / self.per_second
        elapsed = time.monotonic() - self._last
        if elapsed < interval:
            time.sleep(interval - elapsed)
        self._last = time.monotonic()


class HttpClient:
    """Minimal JSON client. Honours rate limits; never bypasses access control."""

    def __init__(self, cfg: SourceConfig):
        self.cfg = cfg
        self.limiter = RateLimiter(cfg.rate_limit_per_second)

    def get_json(self, url: str, params: dict[str, Any] | None = None,
                 headers: dict[str, str] | None = None) -> Any:
        if params:
            clean = {k: v for k, v in params.items() if v is not None}
            url = f"{url}?{urllib.parse.urlencode(clean, doseq=True)}"
        self.limiter.wait()
        req = urllib.request.Request(url, headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
            **(headers or {}),
        })
        try:
            with urllib.request.urlopen(req, timeout=self.cfg.timeout_seconds) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            denial = exc.code in (401, 403, 407, 451)
            raise SourceUnavailable(
                self.cfg.platform,
                f"HTTP {exc.code} from {url}"
                + (" (access denied - not retried by design)" if denial else ""),
                policy_denial=denial,
            ) from exc
        except urllib.error.URLError as exc:
            reason = str(getattr(exc, "reason", exc))
            # The managed egress proxy answers 403 to CONNECT for hosts outside
            # the allow-list; surface that as a policy denial, not a transient.
            denial = "403" in reason or "CONNECT" in reason.upper()
            raise SourceUnavailable(
                self.cfg.platform, f"cannot reach {url}: {reason}",
                policy_denial=denial,
            ) from exc


class MarketSource(ABC):
    """A prediction-market data source."""

    platform: str = "unknown"
    source_kind: SourceKind = SourceKind.OFFICIAL_API
    capabilities: frozenset[Capability] = frozenset()
    # Documented, but unverified in this environment until a live fetch succeeds.
    docs_url: str = ""

    def __init__(self, cfg: SourceConfig):
        self.cfg = cfg
        self.http = HttpClient(cfg)

    def supports(self, cap: Capability) -> bool:
        return cap in self.capabilities

    def provenance(self, endpoint: str, as_of: datetime | None = None,
                   completeness: float = 1.0,
                   notes: tuple[str, ...] = ()) -> Provenance:
        return Provenance(
            source=self.platform,
            source_kind=self.source_kind,
            fetched_at=utcnow(),
            as_of=as_of,
            endpoint=endpoint,
            completeness=completeness,
            notes=notes,
        )

    def health(self) -> tuple[bool, str]:
        """Cheap reachability probe. Returns (ok, detail)."""
        try:
            self.fetch_markets(limit=1)
        except SourceUnavailable as exc:
            return False, exc.reason
        except Exception as exc:  # pragma: no cover - defensive
            return False, f"unexpected error: {exc}"
        return True, "reachable"

    # Subclasses implement what their capability set advertises. The defaults
    # raise rather than silently returning empty, so a missing capability is a
    # loud failure instead of a quiet zero.

    @abstractmethod
    def fetch_markets(self, limit: int = 100, **kw: Any) -> list[tuple[Market, Snapshot]]:
        """Return (market, current snapshot) pairs."""

    def fetch_trades(self, market_id: str | None = None, limit: int = 100,
                     **kw: Any) -> list[tuple[Trade, Trader | None]]:
        raise NotImplementedError(
            f"{self.platform} does not expose public trade data"
        )

    def fetch_orderbook(self, market_id: str) -> dict[str, Any]:
        raise NotImplementedError(f"{self.platform} does not expose an order book")

    def fetch_price_history(self, market_id: str, interval: str = "1d"
                            ) -> list[tuple[datetime, float]]:
        raise NotImplementedError(f"{self.platform} does not expose price history")

    def fetch_leaderboard(self, limit: int = 100) -> list[Trader]:
        raise NotImplementedError(f"{self.platform} does not expose a leaderboard")

    def describe_limits(self) -> list[str]:
        """Human-readable statement of what this source cannot tell us."""
        missing = [c.value for c in Capability if c not in self.capabilities]
        return [f"no {name}" for name in missing]


def market_key(platform: str, external_id: str) -> str:
    return f"{platform}:{external_id}"


def trader_key(platform: str, external_id: str) -> str:
    return f"{platform}:{external_id}"


def coerce_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def parse_json_field(value: Any) -> Any:
    """Several APIs return JSON-encoded strings inside JSON fields."""
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def chunked(items: list[Any], size: int) -> Iterable[list[Any]]:
    for i in range(0, len(items), size):
        yield items[i:i + size]

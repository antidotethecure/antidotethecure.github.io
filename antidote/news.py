"""Section 18: news correlation.

Purpose: when a notable trade happens, check whether there is a *public* reason
for it.  The inference this module is built to prevent is the seductive one --
"a big trader bought and I can find no news, therefore they know something
private."  Absence of news in the feeds this system happens to read is evidence
about the feeds, not about the trader.

No news provider is enabled by default.  Each requires the operator to supply
their own credentials and to accept that provider's terms.  Nothing here scrapes
a site that has not published an API for it.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Protocol

from .config import Config, SourceConfig
from .provenance import EpistemicClass, Provenance, SourceKind, utcnow
from .sources.base import HttpClient, SourceUnavailable
from .storage import Store, parse_ts

STOPWORDS = {
    "will", "the", "a", "an", "of", "in", "on", "at", "to", "be", "by", "for",
    "and", "or", "is", "are", "was", "were", "before", "after", "above",
    "below", "than", "this", "that", "with", "from", "win", "reach", "close",
    "report", "ship", "trade", "record", "during", "any", "how", "many",
}


@dataclass
class NewsItem:
    title: str
    url: str | None
    published: datetime
    source: str
    summary: str = ""
    provenance: Provenance | None = None

    @property
    def id(self) -> str:
        return f"news-{uuid.uuid4().hex[:12]}"


class NewsProvider(Protocol):
    name: str
    def search(self, terms: list[str], since: datetime) -> list[NewsItem]: ...


class NullNewsProvider:
    """The default: no provider configured.

    Returns nothing and says so, rather than silently returning an empty list
    that a caller might read as "no news exists".
    """

    name = "none"

    def search(self, terms: list[str], since: datetime) -> list[NewsItem]:
        raise SourceUnavailable(
            "news",
            "no news provider configured; set one up with credentials you are "
            "authorised to use before relying on news correlation",
        )


class GenericRssProvider:
    """RSS/Atom reader for feeds the operator explicitly opts into.

    Only fetches URLs the operator lists in configuration. It does not discover
    feeds, follow redirects off-host, or crawl.
    """

    name = "rss"

    def __init__(self, feeds: list[str], cfg: SourceConfig | None = None):
        self.feeds = feeds
        self.http = HttpClient(cfg or SourceConfig(platform="news",
                                                   rate_limit_per_second=1.0))

    def search(self, terms: list[str], since: datetime) -> list[NewsItem]:
        import xml.etree.ElementTree as ET
        import urllib.request

        out: list[NewsItem] = []
        lowered = [t.lower() for t in terms]
        for feed in self.feeds:
            try:
                self.http.limiter.wait()
                req = urllib.request.Request(
                    feed, headers={"User-Agent": "AntidotePredictionOS/0.1"})
                with urllib.request.urlopen(req, timeout=15) as resp:
                    root = ET.fromstring(resp.read())
            except Exception as exc:
                raise SourceUnavailable("news", f"{feed}: {exc}") from exc

            for item in root.iter():
                if not item.tag.endswith(("item", "entry")):
                    continue
                title = _text(item, "title")
                if not title:
                    continue
                blob = title.lower()
                if not any(t in blob for t in lowered):
                    continue
                published = (parse_ts(_text(item, "pubDate"))
                             or parse_ts(_text(item, "updated"))
                             or parse_ts(_text(item, "published")) or utcnow())
                if published < since:
                    continue
                out.append(NewsItem(
                    title=title, url=_text(item, "link"), published=published,
                    source=feed, summary=_text(item, "description")[:500],
                    provenance=Provenance(
                        source=feed, source_kind=SourceKind.PUBLIC_WEB,
                        fetched_at=utcnow(), as_of=published,
                    ),
                ))
        return out


def _text(node: Any, tag: str) -> str:
    for child in node:
        if child.tag.endswith(tag):
            return (child.text or child.get("href") or "").strip()
    return ""


def keywords(question: str, limit: int = 6) -> list[str]:
    """Extract search terms from a market question."""
    cleaned = re.sub(r"\[SYNTHETIC\]", "", question)
    words = re.findall(r"[A-Za-z][A-Za-z'&.-]{2,}", cleaned)
    # Proper nouns first: they are the discriminating terms in a market question.
    proper = [w for w in words if w[0].isupper() and w.lower() not in STOPWORDS]
    rest = [w for w in words if w.lower() not in STOPWORDS and w not in proper]
    seen: list[str] = []
    for w in proper + rest:
        if w not in seen:
            seen.append(w)
    return seen[:limit]


@dataclass
class CatalystAssessment:
    market_id: str
    checked: bool
    items: list[NewsItem] = field(default_factory=list)
    reason_unavailable: str | None = None

    @property
    def has_catalyst(self) -> bool | None:
        """True/False only when a search actually ran."""
        return None if not self.checked else bool(self.items)

    def render(self) -> str:
        if not self.checked:
            return (f"NEWS CORRELATION (§18): NOT CHECKED - "
                    f"{self.reason_unavailable}\n"
                    f"  [{EpistemicClass.ANALYSIS.value}] No conclusion can be "
                    f"drawn about whether a public catalyst exists.")
        if not self.items:
            return (
                "NEWS CORRELATION (§18): no matching public items found in the "
                "configured feeds.\n"
                f"  [{EpistemicClass.ANALYSIS.value}] This means the configured "
                "feeds contained nothing matching. It is NOT evidence that no "
                "public catalyst exists, and it is NOT evidence that the trader "
                "holds non-public information."
            )
        lines = [f"NEWS CORRELATION (§18): {len(self.items)} matching item(s)"]
        for item in self.items[:5]:
            lines.append(f"  - [{item.published:%Y-%m-%d %H:%M}] {item.title}")
            if item.url:
                lines.append(f"      {item.url}")
        lines.append(
            f"  [{EpistemicClass.ANALYSIS.value}] A matching headline is a "
            f"plausible public catalyst. Correlation in time is not proof the "
            f"trader acted on it."
        )
        return "\n".join(lines)


class NewsCorrelator:
    def __init__(self, store: Store, config: Config,
                 provider: NewsProvider | None = None):
        self.store = store
        self.config = config
        self.provider = provider or NullNewsProvider()

    def check_market(self, market_id: str, *, window_hours: float = 48.0,
                     around: datetime | None = None) -> CatalystAssessment:
        market = self.store.get_market(market_id)
        if market is None:
            return CatalystAssessment(market_id, False,
                                      reason_unavailable="unknown market")
        anchor = around or utcnow()
        since = anchor - timedelta(hours=window_hours)
        terms = keywords(market["question"])
        if not terms:
            return CatalystAssessment(
                market_id, False,
                reason_unavailable="no usable search terms in market question")
        try:
            items = self.provider.search(terms, since)
        except SourceUnavailable as exc:
            return CatalystAssessment(market_id, False,
                                      reason_unavailable=exc.reason)

        items = [i for i in items if abs((i.published - anchor).total_seconds())
                 <= window_hours * 3600]
        self._persist(market_id, items)
        return CatalystAssessment(market_id, True, items=items)

    def _persist(self, market_id: str, items: list[NewsItem]) -> None:
        if not items:
            return
        with self.store.tx():
            for item in items:
                self.store.conn.execute(
                    """INSERT OR IGNORE INTO news (id, ts, source, url, title,
                           summary, market_id, source_kind, fetched_at)
                       VALUES (?,?,?,?,?,?,?,?,?)""",
                    (item.id, item.published.isoformat(), item.source, item.url,
                     item.title, item.summary, market_id,
                     SourceKind.PUBLIC_WEB.value, utcnow().isoformat()),
                )

    def recent(self, limit: int = 20) -> list[dict[str, Any]]:
        rows = self.store.conn.execute(
            "SELECT * FROM news ORDER BY ts DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]

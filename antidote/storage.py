"""Section 36: the database.

SQLite is the store of record.  Every table that holds an external fact carries
its provenance columns (source, source_kind, fetched_at, as_of) so that nothing
can be read back out without knowing where it came from and how old it is.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator

from .config import DATA_ROOT
from .provenance import Provenance, SourceKind, utcnow

DB_PATH = DATA_ROOT / "antidote.db"

SUBDIRS = [
    "MARKETS", "TRADERS", "TRADES", "ALERTS", "NEWS",
    "BACKTESTS", "PAPER_TRADING", "REPORTS", "CONFIG", "LOGS",
]

SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS markets (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    external_id TEXT NOT NULL,
    question TEXT NOT NULL,
    slug TEXT,
    category TEXT,
    status TEXT,
    close_time TEXT,
    resolution_source TEXT,
    resolution_criteria TEXT,
    resolution_date TEXT,
    outcomes TEXT,
    event_key TEXT,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    source TEXT NOT NULL,
    source_kind TEXT NOT NULL,
    raw TEXT,
    UNIQUE (platform, external_id)
);
CREATE INDEX IF NOT EXISTS idx_markets_cat ON markets(category, status);
CREATE INDEX IF NOT EXISTS idx_markets_close ON markets(close_time);
CREATE INDEX IF NOT EXISTS idx_markets_event ON markets(event_key);

CREATE TABLE IF NOT EXISTS market_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id TEXT NOT NULL REFERENCES markets(id),
    ts TEXT NOT NULL,
    price REAL,
    implied_prob REAL,
    volume REAL,
    volume_24h REAL,
    liquidity REAL,
    open_interest REAL,
    best_bid REAL,
    best_ask REAL,
    spread REAL,
    source TEXT NOT NULL,
    source_kind TEXT NOT NULL,
    fetched_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snap_market_ts ON market_snapshots(market_id, ts);

CREATE TABLE IF NOT EXISTS traders (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    external_id TEXT NOT NULL,
    username TEXT,
    wallet TEXT,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    source TEXT NOT NULL,
    source_kind TEXT NOT NULL,
    raw TEXT,
    UNIQUE (platform, external_id)
);

CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    external_id TEXT,
    market_id TEXT NOT NULL REFERENCES markets(id),
    trader_id TEXT REFERENCES traders(id),
    ts TEXT NOT NULL,
    side TEXT,
    outcome TEXT,
    price REAL NOT NULL,
    size REAL NOT NULL,
    value REAL NOT NULL,
    price_before REAL,
    price_after REAL,
    volume_before REAL,
    volume_after REAL,
    liquidity REAL,
    source TEXT NOT NULL,
    source_kind TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    ingested_at TEXT NOT NULL,
    raw TEXT
);
CREATE INDEX IF NOT EXISTS idx_trades_market_ts ON trades(market_id, ts);
CREATE INDEX IF NOT EXISTS idx_trades_trader_ts ON trades(trader_id, ts);
CREATE INDEX IF NOT EXISTS idx_trades_value ON trades(value);

CREATE TABLE IF NOT EXISTS trader_metrics (
    trader_id TEXT NOT NULL REFERENCES traders(id),
    window_days INTEGER NOT NULL,
    computed_at TEXT NOT NULL,
    metrics TEXT NOT NULL,
    source_kind TEXT NOT NULL,
    PRIMARY KEY (trader_id, window_days)
);

CREATE TABLE IF NOT EXISTS signals (
    id TEXT PRIMARY KEY,
    ts TEXT NOT NULL,
    kind TEXT NOT NULL,
    market_id TEXT REFERENCES markets(id),
    trader_id TEXT REFERENCES traders(id),
    confidence INTEGER NOT NULL,
    direction TEXT,
    components TEXT NOT NULL,
    source_kind TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_signals_ts ON signals(ts);

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    ts TEXT NOT NULL,
    level INTEGER NOT NULL,
    kind TEXT NOT NULL,
    market_id TEXT REFERENCES markets(id),
    trader_id TEXT REFERENCES traders(id),
    fingerprint TEXT NOT NULL,
    cooldown_until TEXT,
    confidence INTEGER,
    payload TEXT NOT NULL,
    rendered TEXT,
    source_kind TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alerts_fp ON alerts(fingerprint, ts);
CREATE INDEX IF NOT EXISTS idx_alerts_ts ON alerts(ts);

CREATE TABLE IF NOT EXISTS alert_outcomes (
    alert_id TEXT PRIMARY KEY REFERENCES alerts(id),
    decision TEXT,
    decided_at TEXT,
    price_at_alert REAL,
    price_after REAL,
    horizon_seconds INTEGER,
    hypothetical_pnl REAL,
    actual_pnl REAL,
    signal_correct INTEGER,
    timing_correct INTEGER,
    notes TEXT,
    recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS paper_positions (
    id TEXT PRIMARY KEY,
    portfolio TEXT NOT NULL,
    market_id TEXT NOT NULL REFERENCES markets(id),
    outcome TEXT,
    side TEXT NOT NULL,
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    entry_price REAL NOT NULL,
    exit_price REAL,
    size REAL NOT NULL,
    fees REAL NOT NULL DEFAULT 0,
    slippage REAL NOT NULL DEFAULT 0,
    realized_pnl REAL,
    source_trade_id TEXT,
    followed_trader_id TEXT,
    status TEXT NOT NULL,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_paper_portfolio ON paper_positions(portfolio, status);

CREATE TABLE IF NOT EXISTS news (
    id TEXT PRIMARY KEY,
    ts TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT,
    title TEXT NOT NULL,
    summary TEXT,
    market_id TEXT REFERENCES markets(id),
    source_kind TEXT NOT NULL,
    fetched_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_news_ts ON news(ts);

CREATE TABLE IF NOT EXISTS backtests (
    id TEXT PRIMARY KEY,
    ts TEXT NOT NULL,
    strategy TEXT NOT NULL,
    config TEXT NOT NULL,
    results TEXT NOT NULL,
    source_kind TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watchlist (
    trader_id TEXT PRIMARY KEY REFERENCES traders(id),
    added_at TEXT NOT NULL,
    rank INTEGER,
    reason TEXT,
    pinned INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ingest_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    platform TEXT NOT NULL,
    kind TEXT NOT NULL,
    ok INTEGER NOT NULL,
    records INTEGER NOT NULL DEFAULT 0,
    detail TEXT
);
"""


def ensure_dirs(root: Path = DATA_ROOT) -> None:
    for name in SUBDIRS:
        (root / name).mkdir(parents=True, exist_ok=True)


def iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


@dataclass
class Market:
    id: str
    platform: str
    external_id: str
    question: str
    slug: str | None = None
    category: str | None = None
    status: str = "open"
    close_time: datetime | None = None
    resolution_source: str | None = None
    resolution_criteria: str | None = None
    resolution_date: datetime | None = None
    outcomes: list[str] = field(default_factory=list)
    # Markets sharing an event_key resolve off the same underlying event and are
    # treated as correlated exposure (§26).
    event_key: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class Snapshot:
    market_id: str
    ts: datetime
    price: float | None = None
    implied_prob: float | None = None
    volume: float | None = None
    volume_24h: float | None = None
    liquidity: float | None = None
    open_interest: float | None = None
    best_bid: float | None = None
    best_ask: float | None = None

    @property
    def spread(self) -> float | None:
        if self.best_bid is None or self.best_ask is None:
            return None
        return round(self.best_ask - self.best_bid, 6)


@dataclass
class Trader:
    id: str
    platform: str
    external_id: str
    username: str | None = None
    wallet: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class Trade:
    id: str
    platform: str
    market_id: str
    ts: datetime
    price: float
    size: float
    value: float
    trader_id: str | None = None
    external_id: str | None = None
    side: str | None = None
    outcome: str | None = None
    price_before: float | None = None
    price_after: float | None = None
    volume_before: float | None = None
    volume_after: float | None = None
    liquidity: float | None = None
    raw: dict[str, Any] = field(default_factory=dict)


class Store:
    """Thin repository over SQLite. All writes carry provenance."""

    def __init__(self, path: Path | None = None):
        self.path = path or DB_PATH
        self.path.parent.mkdir(parents=True, exist_ok=True)
        ensure_dirs(self.path.parent)
        self.conn = sqlite3.connect(self.path, isolation_level=None)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)

    def close(self) -> None:
        self.conn.close()

    def __enter__(self) -> "Store":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()

    @contextmanager
    def tx(self) -> Iterator[sqlite3.Connection]:
        self.conn.execute("BEGIN")
        try:
            yield self.conn
        except Exception:
            self.conn.execute("ROLLBACK")
            raise
        else:
            self.conn.execute("COMMIT")

    # ---------------------------------------------------------------- markets

    def upsert_market(self, m: Market, prov: Provenance) -> str:
        now = iso(utcnow())
        self.conn.execute(
            """
            INSERT INTO markets (id, platform, external_id, question, slug,
                category, status, close_time, resolution_source,
                resolution_criteria, resolution_date, outcomes, event_key,
                first_seen, last_seen, source, source_kind, raw)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
                question=excluded.question, status=excluded.status,
                category=excluded.category, close_time=excluded.close_time,
                resolution_source=excluded.resolution_source,
                resolution_criteria=excluded.resolution_criteria,
                resolution_date=excluded.resolution_date,
                outcomes=excluded.outcomes, event_key=excluded.event_key,
                last_seen=excluded.last_seen, source=excluded.source,
                source_kind=excluded.source_kind, raw=excluded.raw
            """,
            (m.id, m.platform, m.external_id, m.question, m.slug, m.category,
             m.status, iso(m.close_time), m.resolution_source,
             m.resolution_criteria, iso(m.resolution_date),
             json.dumps(m.outcomes), m.event_key, now, now, prov.source,
             prov.source_kind.value, json.dumps(m.raw)),
        )
        return m.id

    def get_market(self, market_id: str) -> sqlite3.Row | None:
        return self.conn.execute(
            "SELECT * FROM markets WHERE id = ?", (market_id,)
        ).fetchone()

    def markets(self, *, status: str | None = None, category: str | None = None,
                limit: int = 500) -> list[sqlite3.Row]:
        sql = "SELECT * FROM markets WHERE 1=1"
        args: list[Any] = []
        if status:
            sql += " AND status = ?"
            args.append(status)
        if category:
            sql += " AND category = ?"
            args.append(category)
        sql += " ORDER BY last_seen DESC LIMIT ?"
        args.append(limit)
        return self.conn.execute(sql, args).fetchall()

    def add_snapshot(self, s: Snapshot, prov: Provenance) -> None:
        self.conn.execute(
            """INSERT INTO market_snapshots (market_id, ts, price, implied_prob,
               volume, volume_24h, liquidity, open_interest, best_bid, best_ask,
               spread, source, source_kind, fetched_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (s.market_id, iso(s.ts), s.price, s.implied_prob, s.volume,
             s.volume_24h, s.liquidity, s.open_interest, s.best_bid, s.best_ask,
             s.spread, prov.source, prov.source_kind.value, iso(prov.fetched_at)),
        )

    def snapshots(self, market_id: str, limit: int = 200) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM market_snapshots WHERE market_id = ? "
            "ORDER BY ts DESC LIMIT ?",
            (market_id, limit),
        ).fetchall()

    def latest_snapshot(self, market_id: str) -> sqlite3.Row | None:
        rows = self.snapshots(market_id, limit=1)
        return rows[0] if rows else None

    # ---------------------------------------------------------------- traders

    def upsert_trader(self, t: Trader, prov: Provenance) -> str:
        now = iso(utcnow())
        self.conn.execute(
            """INSERT INTO traders (id, platform, external_id, username, wallet,
                   first_seen, last_seen, source, source_kind, raw)
               VALUES (?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(id) DO UPDATE SET
                   username=excluded.username, wallet=excluded.wallet,
                   last_seen=excluded.last_seen, raw=excluded.raw""",
            (t.id, t.platform, t.external_id, t.username, t.wallet, now, now,
             prov.source, prov.source_kind.value, json.dumps(t.raw)),
        )
        return t.id

    def get_trader(self, trader_id: str) -> sqlite3.Row | None:
        return self.conn.execute(
            "SELECT * FROM traders WHERE id = ?", (trader_id,)
        ).fetchone()

    def traders(self, limit: int = 1000) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM traders ORDER BY last_seen DESC LIMIT ?", (limit,)
        ).fetchall()

    # ----------------------------------------------------------------- trades

    def add_trade(self, t: Trade, prov: Provenance) -> bool:
        """Insert a trade. Returns False if already present (dedupe by id)."""
        cur = self.conn.execute(
            """INSERT OR IGNORE INTO trades (id, platform, external_id, market_id,
                   trader_id, ts, side, outcome, price, size, value,
                   price_before, price_after, volume_before, volume_after,
                   liquidity, source, source_kind, fetched_at, ingested_at, raw)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (t.id, t.platform, t.external_id, t.market_id, t.trader_id, iso(t.ts),
             t.side, t.outcome, t.price, t.size, t.value, t.price_before,
             t.price_after, t.volume_before, t.volume_after, t.liquidity,
             prov.source, prov.source_kind.value, iso(prov.fetched_at),
             iso(utcnow()), json.dumps(t.raw)),
        )
        return cur.rowcount > 0

    def trades(self, *, market_id: str | None = None, trader_id: str | None = None,
               since: datetime | None = None, min_value: float | None = None,
               limit: int = 500) -> list[sqlite3.Row]:
        sql = "SELECT * FROM trades WHERE 1=1"
        args: list[Any] = []
        if market_id:
            sql += " AND market_id = ?"
            args.append(market_id)
        if trader_id:
            sql += " AND trader_id = ?"
            args.append(trader_id)
        if since:
            sql += " AND ts >= ?"
            args.append(iso(since))
        if min_value is not None:
            sql += " AND value >= ?"
            args.append(min_value)
        sql += " ORDER BY ts DESC LIMIT ?"
        args.append(limit)
        return self.conn.execute(sql, args).fetchall()

    # ---------------------------------------------------------------- metrics

    def save_metrics(self, trader_id: str, window_days: int,
                     metrics: dict[str, Any], source_kind: SourceKind) -> None:
        self.conn.execute(
            """INSERT INTO trader_metrics (trader_id, window_days, computed_at,
                   metrics, source_kind) VALUES (?,?,?,?,?)
               ON CONFLICT(trader_id, window_days) DO UPDATE SET
                   computed_at=excluded.computed_at, metrics=excluded.metrics,
                   source_kind=excluded.source_kind""",
            (trader_id, window_days, iso(utcnow()), json.dumps(metrics),
             source_kind.value),
        )

    def get_metrics(self, trader_id: str, window_days: int) -> dict[str, Any] | None:
        row = self.conn.execute(
            "SELECT metrics FROM trader_metrics WHERE trader_id=? AND window_days=?",
            (trader_id, window_days),
        ).fetchone()
        return json.loads(row["metrics"]) if row else None

    def all_metrics(self, window_days: int) -> dict[str, dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT trader_id, metrics FROM trader_metrics WHERE window_days=?",
            (window_days,),
        ).fetchall()
        return {r["trader_id"]: json.loads(r["metrics"]) for r in rows}

    # ----------------------------------------------------------------- alerts

    def add_alert(self, alert_id: str, ts: datetime, level: int, kind: str,
                  fingerprint: str, payload: dict[str, Any], rendered: str,
                  source_kind: SourceKind, market_id: str | None = None,
                  trader_id: str | None = None, confidence: int | None = None,
                  cooldown_until: datetime | None = None) -> None:
        self.conn.execute(
            """INSERT INTO alerts (id, ts, level, kind, market_id, trader_id,
                   fingerprint, cooldown_until, confidence, payload, rendered,
                   source_kind) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (alert_id, iso(ts), level, kind, market_id, trader_id, fingerprint,
             iso(cooldown_until), confidence, json.dumps(payload), rendered,
             source_kind.value),
        )

    def recent_alert(self, fingerprint: str, since: datetime) -> sqlite3.Row | None:
        return self.conn.execute(
            "SELECT * FROM alerts WHERE fingerprint=? AND ts >= ? "
            "ORDER BY ts DESC LIMIT 1",
            (fingerprint, iso(since)),
        ).fetchone()

    def alerts(self, *, since: datetime | None = None, min_level: int = 1,
               limit: int = 100) -> list[sqlite3.Row]:
        sql = "SELECT * FROM alerts WHERE level >= ?"
        args: list[Any] = [min_level]
        if since:
            sql += " AND ts >= ?"
            args.append(iso(since))
        sql += " ORDER BY ts DESC LIMIT ?"
        args.append(limit)
        return self.conn.execute(sql, args).fetchall()

    def count_alerts_since(self, since: datetime) -> int:
        row = self.conn.execute(
            "SELECT COUNT(*) AS n FROM alerts WHERE ts >= ?", (iso(since),)
        ).fetchone()
        return int(row["n"])

    # --------------------------------------------------------------- learning

    def record_outcome(self, alert_id: str, **fields_: Any) -> None:
        cols = ["alert_id", "recorded_at"] + list(fields_)
        vals = [alert_id, iso(utcnow())] + list(fields_.values())
        placeholders = ",".join("?" * len(cols))
        updates = ",".join(f"{c}=excluded.{c}" for c in cols if c != "alert_id")
        self.conn.execute(
            f"INSERT INTO alert_outcomes ({','.join(cols)}) VALUES ({placeholders}) "
            f"ON CONFLICT(alert_id) DO UPDATE SET {updates}",
            vals,
        )

    def outcomes(self, limit: int = 500) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT o.*, a.kind, a.level, a.confidence FROM alert_outcomes o "
            "JOIN alerts a ON a.id = o.alert_id ORDER BY o.recorded_at DESC LIMIT ?",
            (limit,),
        ).fetchall()

    # -------------------------------------------------------------- watchlist

    def set_watchlist(self, entries: Iterable[tuple[str, int, str]]) -> None:
        """Replace the dynamic watchlist, preserving pinned entries (§5)."""
        self.conn.execute("DELETE FROM watchlist WHERE pinned = 0")
        now = iso(utcnow())
        for trader_id, rank, reason in entries:
            self.conn.execute(
                """INSERT INTO watchlist (trader_id, added_at, rank, reason)
                   VALUES (?,?,?,?)
                   ON CONFLICT(trader_id) DO UPDATE SET
                       rank=excluded.rank, reason=excluded.reason""",
                (trader_id, now, rank, reason),
            )

    def watchlist(self) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT w.*, t.username, t.wallet, t.platform FROM watchlist w "
            "JOIN traders t ON t.id = w.trader_id ORDER BY w.rank"
        ).fetchall()

    # ------------------------------------------------------------------- misc

    def log_ingest(self, platform: str, kind: str, ok: bool, records: int,
                   detail: str = "") -> None:
        self.conn.execute(
            "INSERT INTO ingest_log (ts, platform, kind, ok, records, detail) "
            "VALUES (?,?,?,?,?,?)",
            (iso(utcnow()), platform, kind, 1 if ok else 0, records, detail),
        )

    def save_backtest(self, bt_id: str, strategy: str, config: dict[str, Any],
                      results: dict[str, Any], source_kind: SourceKind) -> None:
        self.conn.execute(
            "INSERT OR REPLACE INTO backtests (id, ts, strategy, config, results, "
            "source_kind) VALUES (?,?,?,?,?,?)",
            (bt_id, iso(utcnow()), strategy, json.dumps(config),
             json.dumps(results), source_kind.value),
        )

    def dominant_source_kind(self) -> SourceKind:
        """The weakest source kind present in the trade table.

        Used to decide whether output must carry a synthetic-data banner: if any
        stored trade is fixture-derived, downstream reports say so.
        """
        rows = self.conn.execute(
            "SELECT DISTINCT source_kind FROM trades"
        ).fetchall()
        kinds = {r["source_kind"] for r in rows}
        for kind in (SourceKind.SYNTHETIC, SourceKind.FIXTURE):
            if kind.value in kinds:
                return kind
        return SourceKind.OFFICIAL_API if kinds else SourceKind.DERIVED

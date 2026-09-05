"""Section 37: configuration.

Every threshold in the system is a config value, never a hard-coded constant.
The defaults below are starting points chosen to be plausible, not authoritative:
the instruction is explicit that trade-size thresholds must not be treated as
universally meaningful.  Tune them per platform and per market category.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field, fields, is_dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_ROOT = ROOT / "ANTIDOTE_PREDICTION_OS"
CONFIG_PATH = DATA_ROOT / "CONFIG" / "config.json"


@dataclass
class RankingConfig:
    """Section 4: ranking is multi-metric; profit alone is not a ranking."""

    method: str = "risk_adjusted"  # see antidote.ranking.RANKERS for the full set
    min_trades_for_ranking: int = 20
    min_active_days: int = 14
    # Windows (days) over which every ranking is recomputed.
    windows: list[int] = field(default_factory=lambda: [7, 30, 90, 365])
    # Shrink small samples toward the population mean so a 3-for-3 trader does
    # not outrank a 400-trade trader on win rate.
    shrinkage_prior_trades: int = 30
    survivorship_warning_threshold: int = 90


@dataclass
class ThresholdConfig:
    """Sections 7, 27, 35: detection thresholds and false-signal guards."""

    # Section 7 - configurable large-trade ladder, in USD.
    large_trade_tiers: list[float] = field(
        default_factory=lambda: [1_000, 5_000, 10_000, 25_000, 50_000, 100_000]
    )
    min_trade_size: float = 1_000.0
    min_liquidity: float = 5_000.0
    # Fraction, e.g. 0.05 == a 5-percentage-point move in implied probability.
    price_move_threshold: float = 0.05
    # Multiple of trailing median volume that counts as a spike.
    volume_spike_threshold: float = 3.0
    spread_widening_threshold: float = 2.5
    # Section 35 - guards.
    min_market_age_hours: float = 1.0
    ignore_within_minutes_of_close: float = 5.0
    max_price_for_signal: float = 0.98
    min_price_for_signal: float = 0.02
    duplicate_window_seconds: float = 2.0


@dataclass
class AlertConfig:
    """Sections 9, 39, 40."""

    min_level_to_emit: int = 2
    cooldown_seconds: dict[str, int] = field(
        default_factory=lambda: {
            "large_trade": 900,
            "price_move": 1800,
            "volume_spike": 1800,
            "consensus": 3600,
            "conflict": 3600,
            "liquidity": 1800,
        }
    )
    max_alerts_per_hour: int = 30
    destinations: list[str] = field(default_factory=lambda: ["dashboard", "log"])
    # Signal-confidence floor (0-100) below which nothing is emitted.
    #
    # Calibration note: confidence uses absolute weights, so evidence the system
    # does not have contributes zero rather than being normalised away (§20).
    # That caps what a single-family signal can score. On live API data a
    # well-evidenced lone price signal reaches ~40; a large trade by a ranked
    # trader in a liquid market reaches ~55-60. Fixture-sourced signals score
    # ~10 lower because fixture data confidence is capped at 0.5.
    # Raise this to 45-55 to require corroboration before anything is emitted.
    min_confidence: int = 30


@dataclass
class RiskConfig:
    """Section 25: bankroll management. Never sized from another trader's size."""

    bankroll: float = 10_000.0
    max_position_pct: float = 0.02
    max_daily_exposure_pct: float = 0.10
    max_market_exposure_pct: float = 0.05
    max_correlated_exposure_pct: float = 0.15
    max_open_positions: int = 20
    max_daily_loss_pct: float = 0.05
    max_drawdown_pct: float = 0.20
    correlation_threshold: float = 0.6


@dataclass
class CopyConfig:
    """Sections 11, 15, 16: copy-trade feasibility and follow rules."""

    delays_seconds: list[int] = field(
        default_factory=lambda: [0, 5, 15, 30, 60, 300, 900, 3600]
    )
    default_delay_seconds: int = 30
    max_price_drift: float = 0.03
    max_slippage_pct: float = 0.02
    fee_rate: float = 0.02
    stale_signal_seconds: int = 900
    # Section 16 - follow rules, all must pass.
    follow_max_rank: int = 10
    follow_min_trade_size: float = 10_000.0
    follow_require_positive_90d: bool = True
    follow_min_liquidity: float = 10_000.0
    follow_min_minutes_to_close: float = 30.0
    sizing_mode: str = "fixed"  # "fixed" | "pct_bankroll"
    fixed_sizes: list[float] = field(default_factory=lambda: [100, 500, 1_000, 5_000])
    pct_bankroll: float = 0.01


@dataclass
class MarketFilterConfig:
    """Section 17."""

    categories: list[str] = field(default_factory=list)  # empty == all
    exclude_categories: list[str] = field(default_factory=list)
    closing_within_hours: float | None = None
    min_volume: float = 0.0
    only_open: bool = True


@dataclass
class SourceConfig:
    platform: str
    enabled: bool = True
    base_url: str = ""
    rate_limit_per_second: float = 5.0
    timeout_seconds: float = 20.0
    # Populated from the environment, never written to disk.
    api_key_env: str | None = None


@dataclass
class Config:
    watchlist_size: int = 10
    poll_interval_seconds: int = 60
    paper_trading_enabled: bool = True
    live_execution_enabled: bool = False  # Section 12: never default-on.
    ranking: RankingConfig = field(default_factory=RankingConfig)
    thresholds: ThresholdConfig = field(default_factory=ThresholdConfig)
    alerts: AlertConfig = field(default_factory=AlertConfig)
    risk: RiskConfig = field(default_factory=RiskConfig)
    copy: CopyConfig = field(default_factory=CopyConfig)
    filters: MarketFilterConfig = field(default_factory=MarketFilterConfig)
    sources: list[SourceConfig] = field(
        default_factory=lambda: [
            SourceConfig(
                platform="polymarket",
                base_url="https://gamma-api.polymarket.com",
                rate_limit_per_second=5.0,
            ),
            SourceConfig(
                platform="kalshi",
                base_url="https://api.elections.kalshi.com/trade-api/v2",
                rate_limit_per_second=5.0,
                api_key_env="KALSHI_API_KEY",
            ),
            SourceConfig(platform="fixture", base_url="", enabled=True),
        ]
    )

    def source(self, platform: str) -> SourceConfig | None:
        for src in self.sources:
            if src.platform == platform:
                return src
        return None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def save(self, path: Path | None = None) -> Path:
        target = path or CONFIG_PATH
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(self.to_dict(), indent=2) + "\n")
        return target

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Config":
        return _build(cls, data)

    @classmethod
    def load(cls, path: Path | None = None) -> "Config":
        target = path or CONFIG_PATH
        if not target.exists():
            cfg = cls()
            cfg.save(target)
            return cfg
        return cls.from_dict(json.loads(target.read_text()))


def _build(cls: type, data: dict[str, Any]) -> Any:
    """Rebuild nested dataclasses from plain dicts, ignoring unknown keys.

    `from __future__ import annotations` makes `field.type` a string, so nested
    dataclasses are resolved by name rather than by inspecting the annotation
    object.
    """
    nested = {
        "ranking": RankingConfig,
        "thresholds": ThresholdConfig,
        "alerts": AlertConfig,
        "risk": RiskConfig,
        "copy": CopyConfig,
        "filters": MarketFilterConfig,
    }
    kwargs: dict[str, Any] = {}
    for f in fields(cls):
        if f.name not in data:
            continue
        raw = data[f.name]
        if f.name in nested and isinstance(raw, dict):
            kwargs[f.name] = _build(nested[f.name], raw)
        elif f.name == "sources" and isinstance(raw, list):
            kwargs[f.name] = [_build(SourceConfig, s) for s in raw]
        else:
            kwargs[f.name] = raw
    return cls(**kwargs)


# Resolved lazily so tests can point DATA_ROOT elsewhere before first access.
_cached: Config | None = None


def get_config(reload: bool = False) -> Config:
    global _cached
    if _cached is None or reload:
        _cached = Config.load()
    return _cached

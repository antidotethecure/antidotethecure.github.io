"""Source registry."""

from __future__ import annotations

from ..config import Config, SourceConfig
from .base import Capability, MarketSource, SourceUnavailable
from .fixture import FixtureSource
from .kalshi import KalshiSource
from .polymarket import PolymarketSource

REGISTRY: dict[str, type[MarketSource]] = {
    "polymarket": PolymarketSource,
    "kalshi": KalshiSource,
    "fixture": FixtureSource,
}


def build_source(cfg: SourceConfig) -> MarketSource:
    cls = REGISTRY.get(cfg.platform)
    if cls is None:
        raise KeyError(f"unknown platform: {cfg.platform}")
    return cls(cfg)


def active_sources(config: Config, *, only: list[str] | None = None
                   ) -> list[MarketSource]:
    out: list[MarketSource] = []
    for src_cfg in config.sources:
        if not src_cfg.enabled:
            continue
        if only and src_cfg.platform not in only:
            continue
        out.append(build_source(src_cfg))
    return out


__all__ = [
    "Capability", "MarketSource", "SourceUnavailable", "REGISTRY",
    "build_source", "active_sources", "PolymarketSource", "KalshiSource",
    "FixtureSource",
]

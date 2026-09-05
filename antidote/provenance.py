"""Epistemic labelling and data-quality tracking.

The master instruction requires that the system distinguish OBSERVED DATA from
INFERRED INFORMATION, ANALYSIS, SPECULATION, ALERT and RECOMMENDATION, and that
it never present speculation as fact.  That is enforced here structurally: every
statement the system emits is a `Claim` carrying its epistemic class and the
provenance of the data behind it.  Renderers print the class; there is no code
path that emits an unlabelled assertion.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class EpistemicClass(enum.Enum):
    """How much epistemic weight a statement carries.

    Ordered from strongest to weakest warrant.  `OBSERVED` is reserved for values
    read directly off a source; anything the system computed is at best
    `INFERRED`, and anything about the future is `SPECULATION`.
    """

    OBSERVED = "OBSERVED DATA"
    INFERRED = "INFERRED INFORMATION"
    ANALYSIS = "ANALYSIS"
    SPECULATION = "SPECULATION"
    ALERT = "ALERT"
    RECOMMENDATION = "RECOMMENDATION"

    @property
    def is_factual(self) -> bool:
        """Only observed data may be stated as fact."""
        return self is EpistemicClass.OBSERVED


class SourceKind(enum.Enum):
    """Where a datum came from, which bounds how far it can be trusted."""

    OFFICIAL_API = "official_api"
    PUBLIC_WEB = "public_web"
    DERIVED = "derived"
    FIXTURE = "fixture"
    SYNTHETIC = "synthetic"
    USER_SUPPLIED = "user_supplied"

    @property
    def is_real(self) -> bool:
        """False for data that does not describe the real world.

        Fixture and synthetic records exist so the engines can be exercised
        without live egress.  They must never be reported as observations of
        actual markets or actual traders.
        """
        return self in (
            SourceKind.OFFICIAL_API,
            SourceKind.PUBLIC_WEB,
            SourceKind.USER_SUPPLIED,
        )


class Staleness(enum.Enum):
    FRESH = "FRESH"
    AGING = "AGING"
    STALE = "STALE"
    UNKNOWN = "UNKNOWN"


@dataclass(frozen=True)
class Provenance:
    """Section 34: data source, timestamp, age, completeness, confidence."""

    source: str
    source_kind: SourceKind
    fetched_at: datetime
    as_of: datetime | None = None
    endpoint: str | None = None
    completeness: float = 1.0
    notes: tuple[str, ...] = ()

    # Age past which a datum is merely aging, then outright stale.
    aging_after: timedelta = timedelta(minutes=5)
    stale_after: timedelta = timedelta(minutes=30)

    @property
    def effective_time(self) -> datetime:
        return self.as_of or self.fetched_at

    def age(self, now: datetime | None = None) -> timedelta:
        return (now or utcnow()) - self.effective_time

    def staleness(self, now: datetime | None = None) -> Staleness:
        age = self.age(now)
        if age >= self.stale_after:
            return Staleness.STALE
        if age >= self.aging_after:
            return Staleness.AGING
        return Staleness.FRESH

    @property
    def is_stale(self) -> bool:
        return self.staleness() is Staleness.STALE

    def confidence(self, now: datetime | None = None) -> float:
        """Data confidence in [0, 1] from source kind, freshness and completeness.

        This scores the *data*, not the trading idea.  Signal confidence (§20)
        consumes this as one of its inputs.
        """
        base = {
            SourceKind.OFFICIAL_API: 1.0,
            SourceKind.PUBLIC_WEB: 0.75,
            SourceKind.USER_SUPPLIED: 0.7,
            SourceKind.DERIVED: 0.85,
            SourceKind.FIXTURE: 0.5,
            SourceKind.SYNTHETIC: 0.3,
        }[self.source_kind]
        decay = {
            Staleness.FRESH: 1.0,
            Staleness.AGING: 0.8,
            Staleness.STALE: 0.4,
            Staleness.UNKNOWN: 0.5,
        }[self.staleness(now)]
        return round(base * decay * max(0.0, min(1.0, self.completeness)), 4)

    def describe(self, now: datetime | None = None) -> str:
        age = self.age(now)
        secs = int(age.total_seconds())
        marker = " [STALE]" if self.staleness(now) is Staleness.STALE else ""
        unreal = "" if self.source_kind.is_real else " [NOT REAL-WORLD DATA]"
        return (
            f"{self.source} ({self.source_kind.value}), age {secs}s, "
            f"completeness {self.completeness:.0%}, "
            f"data confidence {self.confidence(now):.0%}{marker}{unreal}"
        )

    def derive(self, source: str, *, notes: tuple[str, ...] = ()) -> "Provenance":
        """Provenance for something computed from this datum."""
        return Provenance(
            source=source,
            source_kind=SourceKind.DERIVED
            if self.source_kind.is_real
            else self.source_kind,
            fetched_at=utcnow(),
            as_of=self.effective_time,
            completeness=self.completeness,
            notes=self.notes + notes,
            aging_after=self.aging_after,
            stale_after=self.stale_after,
        )


@dataclass
class Claim:
    """A labelled statement. Every user-facing assertion is one of these."""

    text: str
    epistemic_class: EpistemicClass
    provenance: Provenance | None = None
    value: Any = None
    caveats: list[str] = field(default_factory=list)

    def render(self, now: datetime | None = None) -> str:
        parts = [f"[{self.epistemic_class.value}] {self.text}"]
        if self.provenance is not None:
            parts.append(f"    source: {self.provenance.describe(now)}")
        for caveat in self.caveats:
            parts.append(f"    caveat: {caveat}")
        return "\n".join(parts)

    def __str__(self) -> str:  # pragma: no cover - convenience
        return self.render()


def observed(text: str, provenance: Provenance, value: Any = None) -> Claim:
    """An observation. Only legal when the value was read from a source."""
    caveats: list[str] = []
    if not provenance.source_kind.is_real:
        caveats.append(
            "Derived from fixture/synthetic data: describes no real market or trader."
        )
    if provenance.is_stale:
        caveats.append("Underlying data is stale; re-fetch before acting.")
    return Claim(text, EpistemicClass.OBSERVED, provenance, value, caveats)


def inferred(text: str, provenance: Provenance | None = None, value: Any = None,
             caveats: list[str] | None = None) -> Claim:
    return Claim(text, EpistemicClass.INFERRED, provenance, value, caveats or [])


def analysis(text: str, provenance: Provenance | None = None, value: Any = None,
             caveats: list[str] | None = None) -> Claim:
    return Claim(text, EpistemicClass.ANALYSIS, provenance, value, caveats or [])


def speculation(text: str, provenance: Provenance | None = None, value: Any = None,
                caveats: list[str] | None = None) -> Claim:
    base = ["Speculative: not established by the data."]
    return Claim(text, EpistemicClass.SPECULATION, provenance, value,
                 base + (caveats or []))


def recommendation(text: str, provenance: Provenance | None = None,
                   caveats: list[str] | None = None) -> Claim:
    base = [
        "Not financial advice. Requires human review before any action.",
        "Past performance does not imply future performance.",
    ]
    return Claim(text, EpistemicClass.RECOMMENDATION, provenance, None,
                 base + (caveats or []))


class ProvenanceError(RuntimeError):
    """Raised when code tries to assert something it has no warrant for."""


def require_real(provenance: Provenance, action: str) -> None:
    """Guard for operations that must not run on fabricated data.

    Anything that could be mistaken for a real-world claim about a real trader
    -- publishing, notifying, exporting -- routes through here first.
    """
    if not provenance.source_kind.is_real:
        raise ProvenanceError(
            f"Refusing to {action}: data originates from "
            f"{provenance.source_kind.value}, which does not describe real "
            f"markets or real traders."
        )

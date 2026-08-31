"""Sections 8, 9, 10, 39 and 40: alert construction, levels, format, delivery.

Escalation rule (§8): a level is earned by *independent* signals aligning, not by
one signal being large.  A $2m print with no corroboration stays level 3.

Nothing here says "opportunity", "buy", or "edge".  The terminal state of every
alert is WATCH, RESEARCH or HUMAN REVIEW (§10).
"""

from __future__ import annotations

import enum
import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Iterable

from .config import Config, DATA_ROOT
from .provenance import EpistemicClass, SourceKind, utcnow
from .signals import Signal, SignalKind
from .storage import Store, parse_ts


class AlertLevel(enum.IntEnum):
    INFORMATION = 1
    WATCH = 2
    SIGNIFICANT = 3
    HIGH_PRIORITY = 4
    CRITICAL = 5

    @property
    def label(self) -> str:
        return {
            1: "LEVEL 1 - INFORMATION",
            2: "LEVEL 2 - WATCH",
            3: "LEVEL 3 - SIGNIFICANT",
            4: "LEVEL 4 - HIGH PRIORITY",
            5: "LEVEL 5 - CRITICAL",
        }[int(self)]

    @property
    def action(self) -> str:
        return {
            1: "WATCH",
            2: "WATCH",
            3: "RESEARCH",
            4: "HUMAN REVIEW",
            5: "HUMAN REVIEW",
        }[int(self)]


@dataclass
class Alert:
    level: AlertLevel
    kind: str
    market_id: str
    signals: list[Signal]
    ts: datetime = field(default_factory=utcnow)
    trader_id: str | None = None
    confidence: int = 0
    reasons: list[str] = field(default_factory=list)
    contrary: list[str] = field(default_factory=list)
    context: dict[str, Any] = field(default_factory=dict)
    source_kind: SourceKind = SourceKind.DERIVED

    @property
    def fingerprint(self) -> str:
        """Identity for cooldown purposes: same kind, market and trader."""
        raw = f"{self.kind}|{self.market_id}|{self.trader_id or '-'}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    @property
    def id(self) -> str:
        return f"{self.ts.strftime('%Y%m%dT%H%M%S')}-{self.fingerprint}"

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id, "ts": self.ts.isoformat(), "level": int(self.level),
            "level_label": self.level.label, "kind": self.kind,
            "market_id": self.market_id, "trader_id": self.trader_id,
            "confidence": self.confidence, "reasons": self.reasons,
            "contrary": self.contrary, "context": self.context,
            "action": self.level.action,
            "signals": [s.to_dict() for s in self.signals],
        }


class AlertEngine:
    def __init__(self, store: Store, config: Config):
        self.store = store
        self.config = config

    # ------------------------------------------------------------ escalation

    def escalate(self, signals: list[Signal], context: dict[str, Any]
                 ) -> AlertLevel:
        """Section 9. Level rises with independent corroboration, not size."""
        live = [s for s in signals if not s.suppressed]
        if not live:
            return AlertLevel.INFORMATION

        kinds = {s.kind for s in live}
        best = max(s.confidence for s in live)
        # Distinct signal *families* count as independent; two price signals do
        # not corroborate each other.
        families = {
            SignalKind.TRADER: "trader",
            SignalKind.CONSENSUS: "trader",
            SignalKind.CONFLICT: "trader",
            SignalKind.PRICE: "price",
            SignalKind.MOMENTUM: "price",
            SignalKind.MEAN_REVERSION: "price",
            SignalKind.VOLUME: "volume",
            SignalKind.LIQUIDITY: "liquidity",
            SignalKind.NEWS: "news",
            SignalKind.CROSS_MARKET: "cross_market",
            SignalKind.UNUSUAL: "unusual",
        }
        independent = {families.get(k, "other") for k in kinds}

        level = AlertLevel.INFORMATION
        if best >= 40:
            level = AlertLevel.WATCH
        if best >= 55 or context.get("tier_crossed", 0) >= 25_000:
            level = AlertLevel.SIGNIFICANT
        if len(independent) >= 3 and best >= 60:
            level = AlertLevel.HIGH_PRIORITY
        if len(independent) >= 3 and best >= 80 and context.get("ranked_trader"):
            level = AlertLevel.CRITICAL

        # A conflict signal caps the level: the system does not escalate on
        # ranked traders disagreeing with each other (§29).
        if SignalKind.CONFLICT in kinds and level > AlertLevel.SIGNIFICANT:
            level = AlertLevel.SIGNIFICANT
        return level

    def build(self, signals: list[Signal], *, kind: str, market_id: str,
              trader_id: str | None = None,
              extra_context: dict[str, Any] | None = None) -> Alert:
        live = [s for s in signals if not s.suppressed]
        context: dict[str, Any] = dict(extra_context or {})
        for s in live:
            context.update({k: v for k, v in s.evidence.items()
                            if k not in context})
        if trader_id:
            context.setdefault("ranked_trader", context.get("trader_rank"))

        level = self.escalate(signals, context)
        confidence = max((s.confidence for s in live), default=0)

        reasons = [f"[{s.interpretation_class.value}] {s.kind.value}: "
                   f"{s.interpretation}" for s in live]
        contrary: list[str] = []
        for s in live:
            contrary.extend(s.contrary)
        for s in signals:
            for reason in s.suppressed_by:
                contrary.append(f"Suppressed component ({s.kind.value}): {reason}")

        # The alert is only as trustworthy as its weakest input.
        kinds = {s.provenance.source_kind for s in signals if s.provenance}
        weakest = SourceKind.DERIVED
        for candidate in (SourceKind.SYNTHETIC, SourceKind.FIXTURE):
            if candidate in kinds:
                weakest = candidate
                break

        return Alert(
            level=level, kind=kind, market_id=market_id, trader_id=trader_id,
            signals=signals, confidence=confidence, reasons=reasons,
            contrary=contrary, context=context, source_kind=weakest,
        )

    # -------------------------------------------------------------- cooldowns

    def should_emit(self, alert: Alert) -> tuple[bool, str]:
        """Sections 39 and 9: cooldown, rate cap and minimum level/confidence."""
        cfg = self.config.alerts
        if int(alert.level) < cfg.min_level_to_emit:
            return False, (f"level {int(alert.level)} below "
                           f"min_level_to_emit {cfg.min_level_to_emit}")
        if alert.confidence < cfg.min_confidence:
            return False, (f"confidence {alert.confidence} below "
                           f"min_confidence {cfg.min_confidence}")

        cooldown = cfg.cooldown_seconds.get(alert.kind, 900)
        # Critical alerts bypass the cooldown; that is the point of level 5.
        if alert.level < AlertLevel.CRITICAL:
            prior = self.store.recent_alert(
                alert.fingerprint, utcnow() - timedelta(seconds=cooldown)
            )
            if prior is not None:
                return False, (f"cooldown: same {alert.kind} for this "
                               f"market/trader alerted at {prior['ts']}")

        recent = self.store.count_alerts_since(utcnow() - timedelta(hours=1))
        if recent >= cfg.max_alerts_per_hour:
            return False, (f"rate cap: {recent} alerts in the last hour "
                           f"(max {cfg.max_alerts_per_hour})")
        return True, "ok"

    def emit(self, alert: Alert, *, force: bool = False) -> bool:
        ok, why = (True, "forced") if force else self.should_emit(alert)
        if not ok:
            return False
        rendered = render_alert(alert, self.store)
        cooldown = self.config.alerts.cooldown_seconds.get(alert.kind, 900)
        self.store.add_alert(
            alert_id=alert.id, ts=alert.ts, level=int(alert.level),
            kind=alert.kind, fingerprint=alert.fingerprint,
            payload=alert.to_dict(), rendered=rendered,
            source_kind=alert.source_kind, market_id=alert.market_id,
            trader_id=alert.trader_id, confidence=alert.confidence,
            cooldown_until=utcnow() + timedelta(seconds=cooldown),
        )
        for dest in self.config.alerts.destinations:
            deliver(dest, alert, rendered)
        return True

    def process(self, signals: Iterable[Signal]) -> list[Alert]:
        """Group signals by market/trader, build alerts, apply gating."""
        grouped: dict[tuple[str, str | None], list[Signal]] = {}
        for s in signals:
            grouped.setdefault((s.market_id, s.trader_id), []).append(s)

        emitted: list[Alert] = []
        for (market_id, trader_id), group in grouped.items():
            kind = _kind_for(group)
            alert = self.build(group, kind=kind, market_id=market_id,
                               trader_id=trader_id)
            if self.emit(alert):
                emitted.append(alert)
        emitted.sort(key=lambda a: (-int(a.level), -a.confidence))
        return emitted


def _kind_for(signals: list[Signal]) -> str:
    kinds = {s.kind for s in signals}
    if SignalKind.CONFLICT in kinds:
        return "conflict"
    if SignalKind.CONSENSUS in kinds:
        return "consensus"
    if SignalKind.TRADER in kinds:
        return "large_trade"
    if SignalKind.VOLUME in kinds:
        return "volume_spike"
    if SignalKind.PRICE in kinds:
        return "price_move"
    if SignalKind.LIQUIDITY in kinds:
        return "liquidity"
    return "unusual"


# ------------------------------------------------------------------ rendering

def _fmt(value: Any, spec: str = "", dash: str = "not available") -> str:
    if value is None:
        return dash
    if spec and isinstance(value, (int, float)):
        return format(value, spec)
    return str(value)


def render_alert(alert: Alert, store: Store | None = None) -> str:
    """Section 10, exactly."""
    c = alert.context
    market_q = c.get("question")
    if store is not None and not market_q:
        row = store.get_market(alert.market_id)
        market_q = row["question"] if row else alert.market_id

    trader_label = "anonymous / not published by platform"
    if alert.trader_id:
        trader_label = alert.trader_id
        if store is not None:
            row = store.get_trader(alert.trader_id)
            if row and row["username"]:
                trader_label = f"{row['username']} ({row['wallet'] or row['id']})"

    rank = c.get("trader_rank")
    perf = c.get("trader_performance") or "not calculable from observed data"

    lines = [
        "--------------------------------",
        "ANTIDOTE MARKET ALERT",
        "--------------------------------",
        "",
        f"MARKET: {market_q}  [{alert.market_id}]",
        f"TRADER: {trader_label}",
        f"TIME: {alert.ts.isoformat()}",
        f"TRADE: {_fmt(c.get('side'))} {_fmt(c.get('outcome'))} "
        f"size {_fmt(c.get('size'), ',.2f')}",
        f"PRICE: {_fmt(c.get('price'), '.4f')}",
        f"SIZE: ${_fmt(c.get('value'), ',.2f')}",
        f"MARKET PROBABILITY: {_fmt(c.get('market_price_now'), '.1%')}",
        f"PRE-TRADE PRICE: {_fmt(c.get('price_before'), '.4f')}",
        f"POST-TRADE PRICE: {_fmt(c.get('price_after'), '.4f')}",
        f"VOLUME: {_fmt(c.get('volume_now') or c.get('volume'), ',.2f')}",
        f"TRADER RANK: {_fmt(rank, dash='unranked / not applicable')}",
        f"TRADER HISTORICAL PERFORMANCE: {perf}",
        "",
        f"ALERT LEVEL: {alert.level.label}    "
        f"SIGNAL CONFIDENCE: {alert.confidence}/100",
        "",
        "WHY THIS TRIGGERED:",
    ]
    lines += [f"  - {r}" for r in alert.reasons] or ["  - (no live signals)"]

    lines += ["", "OTHER SIGNALS:"]
    others = [f"  - {s.kind.value} (confidence {s.confidence})"
              for s in alert.signals if not s.suppressed]
    lines += others or ["  - none"]

    lines += ["", "CONTRARY SIGNALS:"]
    lines += [f"  - {c_}" for c_ in alert.contrary] or [
        "  - none identified (absence of contrary evidence is not confirmation)"
    ]

    lines += ["", "RISK:"]
    lines += [
        "  - This is an observation, not a recommendation. It may be noise.",
        "  - Position sizing must come from your own bankroll rules (§25), "
        "never from the size another trader traded.",
        f"  - Copy-trade feasibility not assessed in this alert; run "
        f"`antidote copy-check {alert.market_id}` before acting.",
    ]
    if alert.source_kind in (SourceKind.SYNTHETIC, SourceKind.FIXTURE):
        lines.append(
            "  - *** THIS ALERT IS BUILT FROM SYNTHETIC TEST DATA. It describes "
            "no real market, trader or trade. ***"
        )

    prov_lines = []
    for s in alert.signals:
        if s.provenance:
            prov_lines.append(f"  - {s.kind.value}: {s.provenance.describe()}")
    lines += ["", "SOURCE:"] + (prov_lines or ["  - provenance unavailable"])

    lines += [
        "",
        "--------------------------------",
        "",
        f"ACTION: {alert.level.action}",
        "",
        f"[{EpistemicClass.RECOMMENDATION.value}] No position is suggested. "
        "This system does not execute trades. Human decision required.",
        "--------------------------------",
    ]
    return "\n".join(lines)


# ------------------------------------------------------------------ delivery

def deliver(destination: str, alert: Alert, rendered: str) -> bool:
    """Section 40: pluggable destinations.

    Only `dashboard`, `log` and `file` are wired up, because they are the only
    ones that need no third-party credential.  Email/SMS/Telegram/Discord/Slack/
    webhook are declared but deliberately inert: enabling one requires the
    operator to supply their own authorised credentials, and this system will
    not invent an integration it has no permission to use.
    """
    if destination in ("log", "dashboard"):
        log_dir = DATA_ROOT / "LOGS"
        log_dir.mkdir(parents=True, exist_ok=True)
        with (log_dir / "alerts.log").open("a") as fh:
            fh.write(rendered + "\n\n")
        return True
    if destination == "file":
        out = DATA_ROOT / "ALERTS" / f"{alert.id}.txt"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(rendered)
        return True
    if destination == "telegram":
        return _telegram_send(alert)
    if destination in ("email", "sms", "discord", "slack", "webhook"):
        _log_unconfigured(destination, alert)
        return False
    _log_unconfigured(destination, alert)
    return False


def telegram_summary(alert: Alert) -> str:
    """Compact one-screen Telegram message. Full detail stays in the log."""
    c = alert.context
    q = c.get("question") or alert.market_id
    prob = c.get("market_price_now")
    lines = [
        f"ANTIDOTE {alert.level.label}",
        f"{q[:120]}",
        "",
        f"kind: {alert.kind}   confidence: {alert.confidence}/100",
    ]
    if alert.trader_id:
        rank = c.get("trader_rank")
        lines.append(f"trader: #{rank if rank else '?'} {alert.trader_id[-16:]}")
    if c.get("value") is not None:
        lines.append(f"trade: {c.get('side','?')} {c.get('outcome','?')} "
                     f"${c['value']:,.0f} @ {_fmt(c.get('price'), '.3f')}")
    if prob is not None:
        lines.append(f"implied probability: {prob:.0%}")
    lines.append(f"ACTION: {alert.level.action}")
    lines.append("")
    lines.append("Not a recommendation. Run copy-check before acting. "
                 "Size from your own bankroll rules. Human decision required.")
    if alert.source_kind in (SourceKind.SYNTHETIC, SourceKind.FIXTURE):
        lines.append("*** SYNTHETIC TEST DATA — not a real market/trade. ***")
    return "\n".join(lines)


def _telegram_send(alert: Alert, text: str | None = None) -> bool:
    """Send via the Telegram Bot API. Credentials come from the environment.

    TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set. Never stored in the
    repo or config. If missing, this logs 'not_configured' and returns False,
    exactly like any other unconfigured destination.
    """
    import os
    import urllib.parse
    import urllib.request

    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        _log_unconfigured("telegram", alert)
        return False

    body = urllib.parse.urlencode({
        "chat_id": chat_id,
        "text": (text if text is not None else telegram_summary(alert))[:4096],
        "disable_web_page_preview": "true",
    }).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=body, method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            ok = 200 <= resp.status < 300
    except Exception as exc:  # network/credential failure — never crash a scan
        log_dir = DATA_ROOT / "LOGS"
        log_dir.mkdir(parents=True, exist_ok=True)
        with (log_dir / "delivery.log").open("a") as fh:
            fh.write(json.dumps({
                "ts": utcnow().isoformat(), "alert_id": alert.id,
                "destination": "telegram", "status": "error",
                "detail": str(exc)[:200],
            }) + "\n")
        return False
    return ok


def _log_unconfigured(destination: str, alert: Alert) -> None:
    log_dir = DATA_ROOT / "LOGS"
    log_dir.mkdir(parents=True, exist_ok=True)
    with (log_dir / "delivery.log").open("a") as fh:
        fh.write(json.dumps({
            "ts": utcnow().isoformat(), "alert_id": alert.id,
            "destination": destination,
            "status": "not_configured",
            "detail": "destination requires operator-supplied credentials; "
                      "no integration is enabled by default",
        }) + "\n")


def load_alert(store: Store, alert_id: str) -> dict[str, Any] | None:
    row = store.conn.execute(
        "SELECT * FROM alerts WHERE id = ?", (alert_id,)
    ).fetchone()
    if row is None:
        return None
    return {"row": row, "payload": json.loads(row["payload"]),
            "rendered": row["rendered"]}


def explain_alert(store: Store, alert_id: str) -> str:
    """Master command: "Explain why this alert triggered." (§44)"""
    found = load_alert(store, alert_id)
    if not found:
        return f"No alert with id {alert_id}."
    payload = found["payload"]
    lines = [found["rendered"], "", "=" * 60, "SIGNAL CONFIDENCE BREAKDOWN (§20)", "=" * 60]
    for sig in payload.get("signals", []):
        lines.append(f"\n  {sig['kind']}  confidence {sig['confidence']}/100")
        b = sig.get("breakdown", {})
        from .signals import ConfidenceBreakdown
        for k, w in sorted(ConfidenceBreakdown.WEIGHTS.items(), key=lambda kv: -kv[1]):
            v = b.get(k, 0.0)
            flag = "  <- no data" if v == 0.0 else ""
            lines.append(f"      {k:<32} {v:>5.2f} x {w:.2f} = {v * w:.3f}{flag}")
        if sig.get("suppressed_by"):
            lines.append("      SUPPRESSED BY:")
            lines += [f"        - {r}" for r in sig["suppressed_by"]]
    return "\n".join(lines)

"""Section 41: the learning system.

Every alert is scored against what actually happened afterwards, and the results
feed back into `historical_signal_performance` in the §20 confidence model.

The honest part is the scoring rule.  "Was the signal correct?" is only
answerable once the market has moved enough to distinguish a real call from
noise, so an alert whose market barely moved is recorded as INDETERMINATE rather
than being scored as a win or a loss.  Counting flat outcomes as wins is how a
learning system talks itself into believing it works.
"""

from __future__ import annotations

import enum
import json
import statistics
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from .config import Config
from .provenance import EpistemicClass, utcnow
from .storage import Store, parse_ts


class Verdict(enum.Enum):
    CORRECT = "CORRECT"
    INCORRECT = "INCORRECT"
    INDETERMINATE = "INDETERMINATE"
    PENDING = "PENDING"


@dataclass
class AlertReview:
    alert_id: str
    kind: str
    level: int
    confidence: int
    direction: str | None
    price_at_alert: float | None
    price_after: float | None
    horizon_seconds: int
    move: float | None
    verdict: Verdict
    hypothetical_pnl: float | None = None
    note: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {**self.__dict__, "verdict": self.verdict.value}


class LearningSystem:
    # Below this move, the market has not told us anything either way.
    NOISE_FLOOR = 0.01

    def __init__(self, store: Store, config: Config):
        self.store = store
        self.config = config

    # ---------------------------------------------------------------- scoring

    def review_alert(self, alert_id: str, *, horizon_hours: float = 24.0,
                     now: datetime | None = None) -> AlertReview | None:
        now = now or utcnow()
        row = self.store.conn.execute(
            "SELECT * FROM alerts WHERE id = ?", (alert_id,)
        ).fetchone()
        if row is None:
            return None

        payload = json.loads(row["payload"])
        context = payload.get("context", {})
        alert_ts = parse_ts(row["ts"]) or now
        direction = _direction_of(payload)

        price_at = context.get("market_price_now") or context.get("price")
        target = alert_ts + timedelta(hours=horizon_hours)
        after_row = self.store.conn.execute(
            "SELECT price FROM market_snapshots WHERE market_id = ? "
            "AND price IS NOT NULL AND ts >= ? ORDER BY ts ASC LIMIT 1",
            (row["market_id"], target.isoformat()),
        ).fetchone()
        price_after = after_row["price"] if after_row else None

        review = AlertReview(
            alert_id=alert_id, kind=row["kind"], level=row["level"],
            confidence=row["confidence"] or 0, direction=direction,
            price_at_alert=price_at, price_after=price_after,
            horizon_seconds=int(horizon_hours * 3600), move=None,
            verdict=Verdict.PENDING,
        )

        if price_at is None or price_after is None:
            review.note = ("no price observation at the horizon; the outcome "
                           "cannot be scored yet")
            return review

        move = round(price_after - price_at, 6)
        review.move = move

        if abs(move) < self.NOISE_FLOOR:
            review.verdict = Verdict.INDETERMINATE
            review.note = (f"market moved {move:+.4f}, inside the "
                           f"{self.NOISE_FLOOR} noise floor: not scorable")
            return review

        if direction is None:
            review.verdict = Verdict.INDETERMINATE
            review.note = ("alert carried no directional claim, so it cannot be "
                           "right or wrong about direction")
            return review

        went_up = move > 0
        predicted_up = direction.upper() in ("YES", "UP", "BUY")
        review.verdict = (Verdict.CORRECT if went_up == predicted_up
                          else Verdict.INCORRECT)
        # Hypothetical P&L on one unit of notional, before fees.
        review.hypothetical_pnl = round(
            (move if predicted_up else -move) / max(price_at, 1e-6), 6
        )
        review.note = (f"market moved {move:+.4f} against a "
                       f"{'YES' if predicted_up else 'NO'} lean")
        return review

    def record(self, review: AlertReview, *, decision: str | None = None,
               actual_pnl: float | None = None, notes: str = "") -> None:
        """Persist a review. `decision` and `actual_pnl` are the human's input."""
        correct = {Verdict.CORRECT: 1, Verdict.INCORRECT: 0}.get(review.verdict)
        self.store.record_outcome(
            review.alert_id,
            decision=decision,
            decided_at=utcnow().isoformat() if decision else None,
            price_at_alert=review.price_at_alert,
            price_after=review.price_after,
            horizon_seconds=review.horizon_seconds,
            hypothetical_pnl=review.hypothetical_pnl,
            actual_pnl=actual_pnl,
            signal_correct=correct,
            timing_correct=correct,
            notes=notes or review.note,
        )

    def review_all(self, *, horizon_hours: float = 24.0,
                   since: datetime | None = None) -> list[AlertReview]:
        since = since or utcnow() - timedelta(days=30)
        rows = self.store.alerts(since=since, limit=1000)
        out: list[AlertReview] = []
        for row in rows:
            review = self.review_alert(row["id"], horizon_hours=horizon_hours)
            if review is None:
                continue
            if review.verdict is not Verdict.PENDING:
                self.record(review)
            out.append(review)
        return out

    # -------------------------------------------------------------- reporting

    def performance(self) -> dict[str, Any]:
        """How the system's own signals have actually done (§41)."""
        rows = self.store.outcomes(limit=5000)
        scored = [r for r in rows if r["signal_correct"] is not None]
        by_kind: dict[str, list[int]] = defaultdict(list)
        by_level: dict[int, list[int]] = defaultdict(list)
        by_confidence: dict[str, list[int]] = defaultdict(list)

        for r in scored:
            by_kind[r["kind"]].append(r["signal_correct"])
            by_level[r["level"]].append(r["signal_correct"])
            bucket = f"{(r['confidence'] or 0) // 20 * 20}-{(r['confidence'] or 0) // 20 * 20 + 19}"
            by_confidence[bucket].append(r["signal_correct"])

        def rate(vals: list[int]) -> dict[str, Any]:
            return {"n": len(vals),
                    "hit_rate": round(sum(vals) / len(vals), 4) if vals else None,
                    "reliable": len(vals) >= 30}

        pnls = [r["hypothetical_pnl"] for r in scored
                if r["hypothetical_pnl"] is not None]
        return {
            "total_alerts_reviewed": len(rows),
            "scorable": len(scored),
            "indeterminate": len(rows) - len(scored),
            "overall": rate([r["signal_correct"] for r in scored]),
            "by_kind": {k: rate(v) for k, v in by_kind.items()},
            "by_level": {str(k): rate(v) for k, v in by_level.items()},
            "by_confidence_bucket": {k: rate(v) for k, v in
                                     sorted(by_confidence.items())},
            "mean_hypothetical_pnl_per_unit": (round(statistics.fmean(pnls), 6)
                                               if pnls else None),
            "caveat": (
                "Hit rate measures whether the market moved the way an alert "
                "leaned within the horizon. It does not measure profitability "
                "after fees, slippage and execution delay."
            ),
        }

    def calibration(self) -> str:
        """Is a higher confidence score actually associated with a higher hit rate?"""
        perf = self.performance()
        buckets = perf["by_confidence_bucket"]
        if not buckets:
            return ("CALIBRATION: no scored alerts yet. The confidence model is "
                    "running on its priors and has not been validated.")
        lines = ["CALIBRATION (§41): confidence bucket -> observed hit rate", ""]
        usable = []
        for bucket, stats in buckets.items():
            flag = "" if stats["reliable"] else "   (too few to trust)"
            hr = "n/a" if stats["hit_rate"] is None else f"{stats['hit_rate']:.0%}"
            lines.append(f"  {bucket:>8}  n={stats['n']:<5} hit rate {hr}{flag}")
            if stats["reliable"] and stats["hit_rate"] is not None:
                usable.append((bucket, stats["hit_rate"]))

        if len(usable) >= 2:
            rising = all(usable[i][1] <= usable[i + 1][1]
                         for i in range(len(usable) - 1))
            lines.append("")
            lines.append(
                f"  [{EpistemicClass.ANALYSIS.value}] "
                + ("Higher confidence tracks a higher hit rate: the model is "
                   "directionally calibrated."
                   if rising else
                   "Confidence does NOT track hit rate. The scoring weights are "
                   "not earning their keep and should be revisited.")
            )
        else:
            lines.append(
                f"\n  [{EpistemicClass.ANALYSIS.value}] Not enough scored "
                f"alerts in enough buckets to assess calibration."
            )
        return "\n".join(lines)

    def historical_hit_rate(self) -> float | None:
        """Feeds §20. None until there is enough history to be meaningful."""
        perf = self.performance()
        overall = perf["overall"]
        return overall["hit_rate"] if overall["reliable"] else None


def _direction_of(payload: dict[str, Any]) -> str | None:
    for sig in payload.get("signals", []):
        if sig.get("direction"):
            return sig["direction"]
    ctx = payload.get("context", {})
    outcome = ctx.get("outcome")
    side = (ctx.get("side") or "").upper()
    if outcome and side in ("BUY", "B", "BID"):
        return str(outcome).upper()
    return None

"""The quality gate: nothing gets published unless it passes here.

This exists because the underlying platform APIs will not protect you. TikTok's
publish endpoint accepts anything with a short side of 360px or more, so a 380p
clip uploads cleanly, returns success, and looks terrible on the feed -- with no
error anywhere to tell you. The gate is the only place that enforces "1080p or
better", so it is deliberately the one thing every posting path must call.

Design rule: the gate REFUSES. It does not repair. Upscaling a low-resolution
clip with a plain ffmpeg scale filter produces a file that reports 1080p while
carrying 380p worth of real detail, and platform re-encoding makes that look
worse than the original. A refusal is honest; a stretched file is a lie that
also happens to look bad.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

CONFIG_PATH = Path(__file__).with_name("config.json")


def load_config(path: Path | None = None) -> dict[str, Any]:
    return json.loads((path or CONFIG_PATH).read_text())


@dataclass
class Probe:
    """What ffprobe actually found. `ok` is False when we could not look."""

    source: str
    width: int | None = None
    height: int | None = None
    duration_s: float | None = None
    fps: float | None = None
    size_bytes: int | None = None
    codec: str | None = None
    ok: bool = True
    error: str | None = None

    @property
    def short_side(self) -> int | None:
        if self.width is None or self.height is None:
            return None
        return min(self.width, self.height)

    @property
    def long_side(self) -> int | None:
        if self.width is None or self.height is None:
            return None
        return max(self.width, self.height)

    @property
    def label(self) -> str:
        """Human resolution label, by short side -- orientation independent."""
        s = self.short_side
        if s is None:
            return "unknown"
        for threshold, name in ((2160, "4K"), (1440, "1440p"), (1080, "1080p"),
                                (720, "720p"), (480, "480p"), (360, "360p")):
            if s >= threshold:
                return name
        return f"{s}p"

    @property
    def is_vertical(self) -> bool | None:
        if self.width is None or self.height is None:
            return None
        return self.height > self.width

    def aspect(self) -> str | None:
        if not self.width or not self.height:
            return None
        from math import gcd
        g = gcd(self.width, self.height)
        return f"{self.width // g}:{self.height // g}"


@dataclass
class Verdict:
    passed: bool
    probe: Probe
    platform: str
    failures: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def render(self) -> str:
        p = self.probe
        dims = (f"{p.width}x{p.height}" if p.width else "unknown")
        head = "PASS" if self.passed else "REFUSED"
        lines = [f"[{head}] {self.platform:<15} {dims:>11}  {p.label:<7} "
                 f"{p.aspect() or '?':>6}  {p.source[-52:]}"]
        for f_ in self.failures:
            lines.append(f"           reason: {f_}")
        for w in self.warnings:
            lines.append(f"           warn:   {w}")
        return "\n".join(lines)


def have_ffprobe() -> bool:
    return shutil.which("ffprobe") is not None


def probe(source: str, timeout: int = 90) -> Probe:
    """Probe a local path or a URL with ffprobe.

    ffprobe reads remote URLs directly, so a clip can be checked without
    downloading it in full.
    """
    if not have_ffprobe():
        return Probe(source=source, ok=False,
                     error="ffprobe not installed (apt-get install -y ffmpeg)")
    cmd = [
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries",
        "stream=width,height,avg_frame_rate,codec_name:format=duration,size",
        "-of", "json", source,
    ]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True,
                             timeout=timeout)
    except subprocess.TimeoutExpired:
        return Probe(source=source, ok=False, error=f"ffprobe timed out ({timeout}s)")
    if out.returncode != 0:
        return Probe(source=source, ok=False,
                     error=(out.stderr or "ffprobe failed").strip()[:200])

    try:
        data = json.loads(out.stdout)
        stream = (data.get("streams") or [{}])[0]
        fmt = data.get("format") or {}
    except (json.JSONDecodeError, IndexError):
        return Probe(source=source, ok=False, error="unparseable ffprobe output")

    fps = None
    raw_fps = stream.get("avg_frame_rate") or ""
    if "/" in raw_fps:
        num, _, den = raw_fps.partition("/")
        try:
            fps = round(float(num) / float(den), 3) if float(den) else None
        except (ValueError, ZeroDivisionError):
            fps = None

    def _f(v: Any) -> float | None:
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    def _i(v: Any) -> int | None:
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

    return Probe(
        source=source,
        width=_i(stream.get("width")),
        height=_i(stream.get("height")),
        codec=stream.get("codec_name"),
        duration_s=_f(fmt.get("duration")),
        size_bytes=_i(fmt.get("size")),
        fps=fps,
    )


def check(source: str, platform: str, config: dict[str, Any] | None = None,
          probed: Probe | None = None) -> Verdict:
    """Decide whether one clip may be published to one platform."""
    config = config or load_config()
    quality = config["quality"]
    pcfg = config["platforms"].get(platform)
    if pcfg is None:
        return Verdict(False, probed or Probe(source, ok=False),
                       platform, [f"unknown platform '{platform}'"])

    p = probed or probe(source)
    failures: list[str] = []
    warnings: list[str] = []

    if not p.ok:
        # Never let an unverifiable file through. Unknown is not acceptable.
        return Verdict(False, p, platform,
                       [f"could not verify the file: {p.error}"])

    floor = max(int(quality["min_short_side"]),
                int(pcfg.get("min_short_side", 0)))
    if p.short_side is None:
        failures.append("no video stream dimensions found")
    elif p.short_side < floor:
        failures.append(
            f"{p.width}x{p.height} -> short side {p.short_side}px is below the "
            f"{floor}px floor ({p.label}, need "
            f"{'4K' if floor >= 2160 else '1080p'}+)"
        )

    target = pcfg.get("target_aspect")
    if target == "9:16" and p.is_vertical is False:
        failures.append(
            f"landscape {p.aspect()} clip targeted at a vertical surface; "
            f"cropping it to 9:16 discards most of the frame and is how "
            f"low-resolution output happens in the first place"
        )

    max_dur = float(pcfg.get("max_duration_s", quality["max_duration_s"]))
    if p.duration_s is not None:
        if p.duration_s > max_dur:
            failures.append(f"duration {p.duration_s:.1f}s exceeds the "
                            f"{max_dur:.0f}s limit for {platform}")
        elif p.duration_s < float(quality["min_duration_s"]):
            failures.append(f"duration {p.duration_s:.1f}s is below the "
                            f"{quality['min_duration_s']}s minimum")

    if p.size_bytes and p.size_bytes > int(quality["max_upload_bytes"]):
        failures.append(f"file is {p.size_bytes / 1e9:.2f}GB, over the limit")

    if p.fps is not None and not (float(quality["min_fps"]) <= p.fps
                                  <= float(quality["max_fps"])):
        failures.append(f"{p.fps}fps outside the accepted "
                        f"{quality['min_fps']}-{quality['max_fps']} range")

    pref = int(quality.get("preferred_short_side", 0))
    if not failures and p.short_side and p.short_side < pref:
        warnings.append(f"{p.label} passes the {floor}px floor but is below "
                        f"the preferred {pref}px (4K)")

    if config.get("sources", {}).get("prefer") == "generation_cdn":
        uploaded = config["sources"].get("uploaded_media_cdn", "")
        if uploaded and source.startswith(uploaded):
            warnings.append(
                "served from the uploaded-media CDN, which holds re-uploaded "
                "copies; the original render may be higher resolution"
            )

    return Verdict(not failures, p, platform, failures, warnings)


def gate(sources: list[str], platform: str,
         config: dict[str, Any] | None = None) -> tuple[list[Verdict], list[Verdict]]:
    """Split a batch into (publishable, refused)."""
    config = config or load_config()
    passed, refused = [], []
    for src in sources:
        v = check(src, platform, config)
        (passed if v.passed else refused).append(v)
    return passed, refused

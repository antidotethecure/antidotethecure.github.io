"""Tests for the posting quality gate.

The property under test is the one that was actually violated in production:
an under-resolution clip must never reach a publish call, on any platform, and
an unverifiable clip must be treated as a failure rather than a pass.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from posting.gate import Probe, check, load_config


def vid(w: int, h: int, *, dur: float = 20.0, fps: float = 30.0,
        size: int = 5_000_000, src: str = "x.mp4") -> Probe:
    return Probe(source=src, width=w, height=h, duration_s=dur, fps=fps,
                 size_bytes=size)


class TestResolutionFloor(unittest.TestCase):
    def setUp(self) -> None:
        self.cfg = load_config()

    def test_vertical_1080p_passes(self) -> None:
        self.assertTrue(check("x", "tiktok", self.cfg, vid(1080, 1920)).passed)

    def test_vertical_4k_passes(self) -> None:
        self.assertTrue(check("x", "tiktok", self.cfg, vid(2160, 3840)).passed)

    def test_the_actual_bug_is_refused(self) -> None:
        """405x720 -- a 720p landscape clip cropped to vertical."""
        v = check("x", "tiktok", self.cfg, vid(405, 720))
        self.assertFalse(v.passed)
        self.assertTrue(any("below the 1080px floor" in f for f in v.failures))

    def test_720p_refused_on_every_platform(self) -> None:
        for platform in ("tiktok", "youtube_shorts", "instagram", "facebook"):
            with self.subTest(platform=platform):
                self.assertFalse(
                    check("x", platform, self.cfg, vid(720, 1280)).passed)

    def test_landscape_refused_for_vertical_surface(self) -> None:
        """1920x1080 clears the pixel floor but is still wrong for 9:16."""
        v = check("x", "tiktok", self.cfg, vid(1920, 1080))
        self.assertFalse(v.passed)
        self.assertTrue(any("landscape" in f for f in v.failures))

    def test_short_side_governs_regardless_of_orientation(self) -> None:
        self.assertEqual(vid(1080, 1920).short_side, 1080)
        self.assertEqual(vid(1920, 1080).short_side, 1080)
        self.assertEqual(vid(1080, 1920).label, "1080p")
        self.assertEqual(vid(2160, 3840).label, "4K")
        self.assertEqual(vid(405, 720).label, "360p")


class TestFailClosed(unittest.TestCase):
    def setUp(self) -> None:
        self.cfg = load_config()

    def test_unprobeable_is_refused(self) -> None:
        p = Probe(source="x.mp4", ok=False, error="network unreachable")
        v = check("x", "tiktok", self.cfg, p)
        self.assertFalse(v.passed)
        self.assertTrue(any("could not verify" in f for f in v.failures))

    def test_missing_dimensions_refused(self) -> None:
        p = Probe(source="x.mp4", duration_s=10, fps=30)
        self.assertFalse(check("x", "tiktok", self.cfg, p).passed)

    def test_unknown_platform_refused(self) -> None:
        self.assertFalse(check("x", "myspace", self.cfg, vid(1080, 1920)).passed)


class TestPlatformRules(unittest.TestCase):
    def setUp(self) -> None:
        self.cfg = load_config()

    def test_instagram_stories_duration_cap(self) -> None:
        v = check("x", "instagram", self.cfg, vid(1080, 1920, dur=120))
        self.assertFalse(v.passed)
        self.assertTrue(any("55s limit" in f for f in v.failures))

    def test_too_short_refused(self) -> None:
        self.assertFalse(
            check("x", "tiktok", self.cfg, vid(1080, 1920, dur=1.0)).passed)

    def test_fps_out_of_range_refused(self) -> None:
        self.assertFalse(
            check("x", "tiktok", self.cfg, vid(1080, 1920, fps=120)).passed)

    def test_oversize_file_refused(self) -> None:
        self.assertFalse(check("x", "tiktok", self.cfg,
                               vid(1080, 1920, size=2_000_000_000)).passed)


class TestWarnings(unittest.TestCase):
    def setUp(self) -> None:
        self.cfg = load_config()

    def test_1080p_warns_below_preferred_4k(self) -> None:
        v = check("x", "tiktok", self.cfg, vid(1080, 1920))
        self.assertTrue(v.passed)
        self.assertTrue(any("4K" in w for w in v.warnings))

    def test_uploaded_cdn_is_flagged(self) -> None:
        url = self.cfg["sources"]["uploaded_media_cdn"] + "/user_x/a.mp4"
        v = check(url, "tiktok", self.cfg, vid(1080, 1920, src=url))
        self.assertTrue(any("re-uploaded" in w for w in v.warnings))


class TestConfigIntegrity(unittest.TestCase):
    def setUp(self) -> None:
        self.cfg = load_config()

    def test_floor_is_at_least_1080(self) -> None:
        self.assertGreaterEqual(self.cfg["quality"]["min_short_side"], 1080)

    def test_refuse_is_the_failure_mode(self) -> None:
        self.assertEqual(self.cfg["quality"]["on_failure"], "refuse")

    def test_no_credentials_in_config(self) -> None:
        """Keys live in the environment. This file is committed to a repo."""
        blob = Path("posting/config.json").read_text()
        for marker in ("ak_", "sk_", "ok_Mnsz", "api_key\":"):
            self.assertNotIn(marker, blob)

    def test_all_manifest_clips_have_urls(self) -> None:
        total = 0
        for m in self.cfg["manifests"].values():
            for clip in m["clips"]:
                self.assertTrue(clip["url"].startswith("https://"))
                total += 1
        self.assertEqual(total, 153)


if __name__ == "__main__":
    unittest.main(verbosity=2)

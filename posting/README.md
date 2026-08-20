# Posting control point

One place to control every automated video post: TikTok, YouTube Shorts,
Instagram, Facebook.

**`config.json` is the single source of truth.** Resolution policy, which
platforms are live, and all 153 clips with their captions.

## The rule

Nothing publishes below **1080p short side**, on any platform.

"Short side" is orientation-independent: a vertical clip must be at least
1080x1920, a landscape clip at least 1920x1080. Raise the floor to 4K with:

```bash
python3 -m posting.cli set-quality --min 2160
```

The gate **refuses**; it does not repair. Stretching a low-resolution clip with
ffmpeg produces a file that reports 1080p while carrying 380p of real detail,
and platform re-encoding makes that look worse than the original. Refusing is
honest. It also fails closed: a clip that cannot be probed is refused, because
we never publish what we cannot verify.

## Commands

```bash
python3 -m posting.cli status            # policy, platforms, manifests
python3 -m posting.cli audit             # probe every clip, report resolution
python3 -m posting.cli audit --json report.json -v
python3 -m posting.cli check <url> --platform tiktok
python3 -m posting.cli platform facebook --enable
```

`audit` needs `ffprobe` and network access to the CDN:

```bash
apt-get update -y && apt-get install -y ffmpeg
```

It reads headers only, not full downloads, so 153 clips take about a minute.

## Why the clips were low resolution

The posting routines never transcoded anything. `tiktok_prepare_publish` has no
resolution parameter at all -- it takes a hosted URL and hands it to TikTok. And
TikTok's floor through that API is 360px, so a 380p file uploaded cleanly,
returned success, and never raised an error anywhere.

The resolution was lost earlier, at generation. Recent renders:

| model | dimensions | aspect |
|---|---|---|
| kling3_0_turbo | 1280x720 | 16:9 |
| seedance_2_5 | 1280x720 | 16:9 |
| seedance_2_0 | 1440x1080 | 4:3 |

None are 9:16. Crop a 1280x720 landscape clip to vertical and about 405x720 of
real pixels survive; scale that back up to fill a vertical frame and you get
what was being posted. **Generate at 9:16 and 1080p+ in the first place** --
that is the fix, and it costs nothing beyond what generation already costs.

Two CDNs are involved, and they are not interchangeable:

- `d8j0ntlcm91z4.cloudfront.net` -- generation output (`rawUrl`), the originals
- `d2ol7oe51mr4n9.cloudfront.net` -- uploaded media, re-uploaded copies

All 153 manifest URLs point at the **uploaded** CDN. None point at the
generation CDN. If an original render is higher resolution than its re-uploaded
copy, repointing the manifest is a free fix -- `audit` will show the gap.

## Pipelines this replaces

| Routine | Platform | Notes |
|---|---|---|
| `trig_012AxtNFGguCWRFNTXe7d29E` | TikTok | 83 clips, 13x/day |
| `trig_01VHmwSzfrNBuSf37VgXdbFt` | TikTok | 42 clips, 2x/day |
| `trig_016XMVvKZoB3fnRqKYoU8Cwm` | YouTube | 28 clips, 2x/day |
| `trig_01QuJiQnJhzfDVPDrwRq8BCU` | Instagram Stories | different architecture, see below |
| Facebook | -- | does not exist |

**Instagram is a separate defect.** That routine downloads your own already-
published Instagram reels with `yt-dlp -f "best[ext=mp4]/best"`, trims with
ffmpeg, and re-uploads to Stories. Instagram compresses on upload, so this is a
generation-loss loop: each pass through it degrades further, and there is no
resolution check anywhere. Post from the original master file instead of
re-downloading published video.

That routine also carries a Composio API key in plaintext in its prompt. This
config reads credentials from the environment (`COMPOSIO_API_KEY`,
`COMPOSIO_ORG`) and never stores them, since this repo is public. Rotate that
key when you migrate.

## Migration

These four routines were created through the HTTP API, so an agent cannot edit
or disable them -- only you can, from the Routines UI.

1. Disable the four posting routines above.
2. `apt-get install -y ffmpeg` somewhere with CDN access, then run `audit`.
3. Fix or regenerate whatever it refuses.
4. Re-run `audit` until it reports 0 refused.
5. Re-enable posting through this config.

Facebook needs a Page connector authorised in Composio before
`platform facebook --enable` will do anything.

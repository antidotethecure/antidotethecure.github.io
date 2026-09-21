#!/bin/bash
# ============================================================
# Antidote — batch-trim food reviews to their highlighted 1:05+ section
#
# WHY THIS RUNS ON YOUR MAC:
# Claude can't touch these video files (they're on your Mac, and the cloud
# sandbox has no video tools). Your Mac can. This cuts each review to the
# highlight window YOU pick, and refuses to output anything under 1:05.
#
# ONE-TIME SETUP:
#   Install ffmpeg:  open Terminal, paste:  brew install ffmpeg
#   (If you don't have brew:  https://brew.sh — one paste-and-go install.)
#
# HOW TO USE:
#   1) Put this file AND a file called  highlights.csv  in your reviews folder.
#   2) Fill in highlights.csv, one line per clip you want (see format below).
#   3) Double-click this file (trim_highlights.command).  Trimmed clips land
#      in a new  trimmed/  subfolder, each named the same as the source.
#
# highlights.csv FORMAT — three columns, comma-separated, no spaces around commas:
#   filename.mp4,START,END
# START/END can be seconds (e.g. 42) or mm:ss (e.g. 0:42).  END-START must be
# >= 65 seconds (1:05) or the row is skipped with a warning.
# Lines starting with # are ignored. Example highlights.csv:
#   # filename, start, end
#   Arayaki Habachi.mp4,0:12,1:25
#   Cali Chilli.mp4,30,140
# ============================================================
cd "$(dirname "$0")" || exit 1
CSV="highlights.csv"
OUT="trimmed"
MIN=65

command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg not found. Run:  brew install ffmpeg"; read -r _; exit 1; }
[ -f "$CSV" ] || { echo "No highlights.csv found in this folder. Create it first (see the header of this file)."; read -r _; exit 1; }
mkdir -p "$OUT"

to_sec(){ case "$1" in *:*) IFS=: read -r m s <<<"$1"; echo $((10#$m*60 + 10#$s));; *) echo "$1";; esac; }

ok=0; skip=0
while IFS=, read -r name start end; do
  [ -z "$name" ] && continue
  case "$name" in \#*) continue;; esac
  name="$(echo "$name" | sed 's/^ *//;s/ *$//')"
  [ -f "$name" ] || { echo "SKIP (not found): $name"; skip=$((skip+1)); continue; }
  s=$(to_sec "$(echo "$start"|tr -d ' ')"); e=$(to_sec "$(echo "$end"|tr -d ' ')")
  dur=$((e - s))
  if [ "$dur" -lt "$MIN" ]; then
    echo "SKIP ($dur s < 1:05): $name  — widen the window"; skip=$((skip+1)); continue
  fi
  echo "Trimming $name  [$start -> $end]  = ${dur}s"
  # re-encode for a clean, frame-accurate cut; -movflags +faststart for TikTok
  ffmpeg -y -loglevel error -ss "$s" -to "$e" -i "$name" \
    -c:v libx264 -preset veryfast -crf 18 -c:a aac -movflags +faststart \
    "$OUT/$name" && ok=$((ok+1)) || { echo "  ! ffmpeg failed on $name"; skip=$((skip+1)); }
done < "$CSV"

echo ""
echo "==== DONE ===="
echo "Trimmed OK: $ok    Skipped: $skip"
echo "Trimmed clips are in:  $(pwd)/$OUT"
echo "All outputs are >= 1:05. Next: upload these to TikTok (or send them so they get into the posting system)."
read -r _

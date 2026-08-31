#!/usr/bin/env bash
# ANTIDOTE — Polymarket follow loop, one cycle.
# Runs on a machine that can reach polymarket.com (e.g. your Mac).
# Alert-only. Places no trades. Writes alerts to ANTIDOTE_PREDICTION_OS/LOGS/alerts.log.
#
# One-time setup on your Mac:
#   1. Install Python 3.11+ (python3 --version to check).
#   2. git clone https://github.com/antidotethecure/antidotethecure.github.io
#   3. cd antidotethecure.github.io
#   4. bash scripts/run-follow.sh            # run it once by hand first
#
# To run it every 10 minutes, add this to `crontab -e` (fix the path):
#   */10 * * * * cd /FULL/PATH/antidotethecure.github.io && bash scripts/run-follow.sh >> follow.cron.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

PY=python3

echo "== $(date -u +%FT%TZ) ANTIDOTE follow cycle =="

# 1. Is Polymarket reachable from here? (It is NOT from the cloud sandbox.)
if ! $PY -m antidote.cli sources 2>/dev/null | grep -q '"platform": "polymarket"'; then
  echo "  antidote not importable or sources failed — check Python/setup." ; exit 1
fi

# 2. Pull fresh Polymarket data (markets + trades w/ wallets + price history).
$PY -m antidote.cli ingest --platform polymarket --markets 300 --trades 2000 --history

# 3. Refresh trader rankings / watchlist from the new data.
$PY -m antidote.cli rank >/dev/null

# 4. Follow the ranked traders: alert on qualifying moves + copy-feasibility.
#    --min-prob 0 recommended (a probability floor alone does not create edge).
$PY -m antidote.cli follow --hours 6 --size 1000 --min-prob 0

echo "  alerts (if any) appended to ANTIDOTE_PREDICTION_OS/LOGS/alerts.log"
echo "== cycle done =="

#!/usr/bin/env bash
# ANTIDOTE — Polymarket follow loop, one cycle. Alert-only; places no trades.
# Runs on a machine that can reach polymarket.com AND api.telegram.org (your Mac).
#
# ── ONE-TIME SETUP ────────────────────────────────────────────────────────
# A) Get the code:
#      git clone https://github.com/antidotethecure/antidotethecure.github.io
#      cd antidotethecure.github.io
#
# B) Set up the Telegram bot (2 minutes, in the Telegram app):
#      1. Message @BotFather → /newbot → follow prompts → copy the BOT TOKEN.
#      2. Message @userinfobot (or your new bot, then open
#         https://api.telegram.org/bot<TOKEN>/getUpdates) to get your CHAT ID.
#      3. Put both in your shell profile (~/.zshrc), then reopen the terminal:
#           export TELEGRAM_BOT_TOKEN="123456:AA...your token..."
#           export TELEGRAM_CHAT_ID="123456789"
#
# C) Verify Telegram works:
#      python3 -m antidote.cli test-alert        # should ping your phone
#
# D) Run one cycle by hand:
#      bash scripts/run-follow.sh
#
# E) Automate every 10 minutes — `crontab -e`, add (fix the path, and note cron
#    does not read ~/.zshrc, so the exports are repeated inline here):
#   */10 * * * * cd /FULL/PATH/antidotethecure.github.io && \
#     TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy bash scripts/run-follow.sh \
#     >> follow.cron.log 2>&1
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."
PY=python3

echo "== $(date -u +%FT%TZ) ANTIDOTE follow cycle =="

# Turn on Telegram delivery only if credentials are present in the environment.
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  $PY -m antidote.cli config --set 'alerts.destinations=["dashboard","log","telegram"]' >/dev/null
  echo "  telegram delivery: ON"
else
  echo "  telegram delivery: off (set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)"
fi

# 1. Pull fresh Polymarket data (markets + trades w/ wallets + price history).
$PY -m antidote.cli ingest --platform polymarket --markets 300 --trades 2000 --history

# 2. Refresh trader rankings / watchlist from the new data.
$PY -m antidote.cli rank >/dev/null

# 3. Follow ranked traders: alert on qualifying moves + copy-feasibility.
#    --min-prob 0 recommended (a probability floor alone does not create edge).
$PY -m antidote.cli follow --hours 6 --size 1000 --min-prob 0

echo "  full alert detail also in ANTIDOTE_PREDICTION_OS/LOGS/alerts.log"
echo "== cycle done =="

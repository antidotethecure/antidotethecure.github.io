---
name: antidote-polymarket
description: >
  Research and alerting workflow for following top Polymarket traders with the
  ANTIDOTE prediction-market system. Use when the user wants to find top
  Polymarket traders, watch specific wallets, get alerted when a watched trader
  makes a move, check whether a trade is still copyable, simulate copying a
  trader, or run paper trades. Polymarket only — trader-following does not work
  on Kalshi (its trades are anonymous). This is alert-only: it never places a
  real trade, and it never promises a profit or a daily income figure.
---

# ANTIDOTE — Polymarket trader-following

This skill drives the `antidote` CLI (in this repo) to follow top **Polymarket**
traders and surface high-quality signals for a human to decide on. Read the
whole file before running commands.

## Say this plainly to the user, once, up front

- **No system guarantees $X/day.** Results depend on capital, edge, discipline,
  and variance. This tool makes you faster at finding and weighing signals; it
  cannot manufacture an income floor. Do not repeat any "$1,500/day" style
  claim as if the tool delivers it.
- **This is alert-only.** `live_execution_enabled` defaults to `false` and there
  is no order path in the code. Any real trade is placed by the human, on their
  own platform, by hand.
- **"Immediately" = the poll interval.** There is no per-trade push. A watched
  trader's move is seen on the next ingest cycle (e.g. every few minutes when
  run as a routine).
- **High implied probability is NOT "safe money."** A market at 80% pays ~$0.25
  on the dollar and still loses 1 time in 5. The edge is finding *mispriced*
  odds, not buying the heaviest favorite. If the user insists on a probability
  floor, honor it via `--min-prob` but state this caveat.
- **Kalshi cannot do any of this.** Kalshi trades are anonymous — no wallet, no
  per-trader history. Trader-following is Polymarket-only, by design.

## Environment reality

Polymarket's APIs (`gamma-api`, `clob`, `data-api`) are **blocked from the
cloud build sandbox** and the adapters are **unverified against live endpoints**
(field names may drift). So:

- Run `antidote sources` first. If Polymarket shows UNAVAILABLE, live ingest
  will not work *from here* — it must run somewhere with real internet access to
  polymarket.com. Say so instead of pretending data flowed.
- Until a live ingest succeeds, you can exercise the whole workflow on the
  `fixture` source, which is clearly labelled synthetic and never real.

## Workflow

Always start from the repo root. Add `--include-closed` when you need resolved
markets (ranking history, backtests).

1. **Check reachability + capabilities**
   ```
   python3 -m antidote.cli sources
   ```
   Confirms whether Polymarket is reachable and that it exposes trader identity.

2. **Ingest Polymarket** (markets, public trades w/ wallets, price history)
   ```
   python3 -m antidote.cli ingest --platform polymarket --markets 300 --trades 2000 --history
   ```
   On the sandbox this will report a policy denial — that is expected; run it
   where the APIs are reachable.

3. **Rank traders & build the dynamic watchlist**
   ```
   python3 -m antidote.cli rank
   python3 -m antidote.cli traders --by risk_adjusted --window 90
   ```
   Ranking is multi-metric and sample-size-adjusted — never "who made the most."
   To pin specific wallets the user names:
   ```
   python3 -m antidote.cli watch <trader_id> [<trader_id> ...]
   ```

4. **Follow the watched traders** (the core "alert me when they trade" step)
   ```
   python3 -m antidote.cli follow --hours 24 --size 1000 --min-prob 0.80
   ```
   For each qualifying move it prints the market, signal confidence, current
   implied probability vs the floor, and a **copy-feasibility verdict**, and
   emits an alert through the configured destinations. `--min-prob 0` disables
   the probability floor (recommended — see the caveat above).

5. **Before treating any alert as actionable: copy-feasibility**
   ```
   python3 -m antidote.cli copy-check <trade_id> --size 1000
   ```
   Tells you if the price has already moved past the point where copying is
   worth it. Most "smart money" trades are uncopyable by the time you see them.

6. **Simulate before believing** — fees, slippage, realistic delay
   ```
   python3 -m antidote.cli simulate <trader_id> --size 1000 --delay 30
   ```
   If the strategy only works at zero delay, it does not work.

7. **Paper-trade the process for weeks before any real money**
   ```
   python3 -m antidote.cli paper status
   ```
   Only after paper results consistently beat break-even should real money even
   be discussed — and then position size comes from the user's own bankroll
   rules (`antidote risk`), never from another trader's size.

## Running it as a recurring alert

To make step 4 recur, schedule a routine (in an environment with Polymarket
access) that runs `ingest --platform polymarket` then `follow`, every N minutes.
Alert destinations are configured in `ANTIDOTE_PREDICTION_OS/CONFIG/config.json`
under `alerts.destinations` — `dashboard`/`log`/`file` work with no credentials;
email/SMS/Telegram/etc. are declared but inert until the user supplies their own
authorized credentials. Do not enable a destination the user has not set up.

## Hard limits — do not cross

- Never place, or offer to place, a real trade.
- Never present a signal as a guaranteed win or quote a daily-profit figure.
- Never fabricate a trader, a track record, or a view/þperformance number.
- Never try to de-anonymise Kalshi counterparties or route Kalshi through this.
- If asked for leaked/copyrighted source data, refuse — unrelated to this skill
  but the same standing rule.

## The one question to settle before real money

Paper vs. real, and the bankroll. Everything responsible about sizing depends on
it. Default to paper until the user explicitly says otherwise.

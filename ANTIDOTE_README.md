# ANTIDOTE PREDICTION MARKET INTELLIGENCE OS

A research and monitoring system for legally accessible prediction-market data.

**It does not place trades. It does not guarantee profits. It does not assume a
trader who has done well will keep doing well.**

Every statement it produces carries an epistemic label — `OBSERVED DATA`,
`INFERRED INFORMATION`, `ANALYSIS`, `SPECULATION`, `ALERT`, `RECOMMENDATION` —
and the provenance of the data behind it. Human review is required before any
action.

---

## Read this first: what this build can and cannot do

### Live data is blocked in the environment this was built in

The egress policy of the build environment returns `403` on CONNECT for every
prediction-market host:

| Host | Result |
|---|---|
| `gamma-api.polymarket.com` | 403 — blocked by egress policy |
| `clob.polymarket.com` | 403 — blocked by egress policy |
| `data-api.polymarket.com` | 403 — blocked by egress policy |
| `api.elections.kalshi.com` | 403 — blocked by egress policy |

So **no live market data has ever flowed through this build.** Consequences you
must not gloss over:

1. **The Polymarket and Kalshi adapters are UNVERIFIED.** They are written
   against each platform's published public API documentation, but no response
   has ever been parsed from the real endpoints. Field names on these APIs drift.
   Expect to fix the field mappings on first live run. Everything else — the
   pipeline, engines, filters, scoring — is exercised and tested.
2. **Every number you will see out of the box is fabricated.** The fixture
   source generates a seeded synthetic universe so the engines can be run and
   tested. It describes no real market, trader or trade.
3. Run `antidote sources` from a network that permits these hosts to see real
   reachability.

### Kalshi cannot support trader intelligence — structurally

Kalshi publishes executed trades but **not counterparty identity**. There is no
public wallet, username or per-account P&L. On Kalshi this system does market
intelligence only: volume, price, liquidity, large prints, open interest.

Trader ranking, the watchlist and copy-trading work on **Polymarket**, where
settlement is on-chain and the Data API exposes per-trade wallet addresses and
public pseudonyms.

The Kalshi adapter therefore does not advertise `TRADER_IDENTITY`, and the
engines skip those stages rather than inventing identities. **Do not attempt to
de-anonymise Kalshi counterparties.**

---

## Install and first run

No third-party dependencies. Python 3.11+.

```bash
python3 -m antidote.cli init                       # inspect environment, build DB
python3 -m antidote.cli --include-closed ingest \
    --platform fixture --markets 100 --trades 100000 --history
python3 -m antidote.cli rank                       # metrics + watchlist
python3 -m antidote.cli --include-closed scan --hours 3000
python3 -m antidote.cli report
python3 -m antidote.cli dashboard
```

Run the tests:

```bash
python3 -m unittest discover -s tests -v           # 76 tests
```

### Going live

```bash
# 1. Confirm the platforms are reachable from your network
python3 -m antidote.cli sources

# 2. Ingest real markets, then verify the adapter parsed them sanely
python3 -m antidote.cli ingest --platform polymarket --markets 200 --trades 1000
python3 -m antidote.cli market <market-id>

# 3. Disable the fixture source so synthetic rows never mix with real ones
python3 -m antidote.cli config --set 'sources=[]'   # then re-add real ones, or
                                                    # edit CONFIG/config.json
```

---

## Commands

| Command | Master command it serves (§44) |
|---|---|
| `traders --by risk_adjusted` | "Show me the top 10 traders" |
| `trades --min-value 10000` | "Show me trades over $10,000" |
| `watch <ids...>` | "Watch these five traders" |
| `traders --window 90` | "Best-performing traders over 90 days" |
| `scan` | Detect signals, emit alerts |
| `alerts` / `explain <id>` | "Explain why this alert triggered" |
| `moves` | "Today's biggest market moves" |
| `consensus` | "Where smart money agrees / disagrees" |
| `copy-check <trade-id>` | Copy-trade feasibility |
| `simulate <trader-id>` | "Simulate copying this trader" |
| `backtest <strategy>` | "Backtest this strategy" |
| `paper status\|open\|close` | "Run paper trading" |
| `risk` | Bankroll and correlated exposure |
| `report` | "Give me the daily intelligence report" |
| `dashboard` | Static HTML dashboard |
| `learn` | Score past alerts, show calibration |
| `monitor` | Real-time alert loop (alert-only) |

---

## Design decisions worth knowing about

These are the places where the implementation takes a position. If you disagree
with one, it is configuration or a small change — but know it is deliberate.

**Absent evidence lowers confidence rather than being normalised away.**
Signal confidence (§20) uses absolute weights across nine inputs. A signal with
no news corroboration and no independent confirmation *cannot* score highly,
even if everything measurable about it is extreme. This means a lone price
signal tops out near 40/100 on live data, and levels 4–5 are genuinely hard to
reach. That is intended: §8 says a high-priority alert requires multiple
independent signals aligning. Raise `alerts.min_confidence` to 45–55 to demand
corroboration before anything is emitted.

**Escalation counts signal *families*, not signals.** Three price signals are
one piece of evidence, not three. Only distinct families (trader / price /
volume / liquidity / news / cross-market) count toward the independence
requirement.

**A conflict signal caps the alert level.** Ranked traders disagreeing with each
other never escalates past level 3 (§29). Disagreement is not a trade signal in
either direction.

**Win rate is ranked by a Wilson lower bound; returns are shrunk toward zero.**
Shrinking toward the *peer mean* — the obvious approach — is contaminated: with
a small peer group, a 3-for-3 trader inflates the very mean they are shrunk
toward and still wins. Zero edge is the honest prior for a return.

**Backtests select traders point-in-time.** A trader-following strategy picks
its traders using only data from before the test period. Selecting on full
history and then "testing" on a slice of it is the most common way a backtest
lies, and it is specifically prevented (§23).

**Only the out-of-sample period is treated as evidence,** and any period with
under 20 trades is labelled `UNRELIABLE` regardless of how good the return
looks.

**Position size never derives from another trader's size.** `suggest_size`
reads only your bankroll and your configured limits. A $400k print by a ranked
trader is information about the market, not a sizing instruction (§25).

**Correlation is structural, not statistical.** Markets that resolve off the
same underlying event are treated as fully correlated regardless of what their
price histories did, because prediction markets rarely have enough overlapping
history for a sample correlation to be trustworthy (§26).

**Flat outcomes are `INDETERMINATE`, not wins.** The learning system (§41) only
scores an alert once the market moved past a noise floor. Counting flat outcomes
as correct is how a system talks itself into believing it works.

**The dashboard is written to `ANTIDOTE_PREDICTION_OS/REPORTS/`, not the repo
root.** This repository is published as a public GitHub Pages site. Putting the
dashboard in the site root would publish your watchlist, thresholds, positions
and risk limits to anyone who guesses the URL.

---

## Architecture

```
antidote/
  provenance.py   epistemic labels, staleness, data confidence, require_real()
  config.py       every threshold (§37) — no hard-coded magic numbers
  storage.py      SQLite; provenance columns on every external fact
  sources/
    base.py       capability declaration, rate limiting, polite HTTP
    polymarket.py Gamma + CLOB + Data API   (UNVERIFIED — see above)
    kalshi.py     public Trade API v2       (UNVERIFIED — anonymous prints)
    fixture.py    seeded synthetic universe (NOT REAL — for testing only)
  ingest.py       §2 pipeline
  traders.py      §3 FIFO lot accounting, per-window metrics
  ranking.py      §4 multi-metric ranking, §5 watchlist, §23 survivorship
  signals.py      §19 taxonomy, §20 confidence
  detect.py       §7 large trades, §27 movement, §28/29 consensus, §35 filters
  alerts.py       §9 levels, §10 format, §39 cooldowns, §40 destinations
  copytrade.py    §11 feasibility, §16 follow rules
  simulate.py     §13 paper trading, §14 copy sim, §15 delay sweep
  risk.py         §25 bankroll limits, §26 correlation engine
  backtest.py     §21 engine, §22 train/test/OOS, §24 regimes
  news.py         §18 correlation (no provider enabled by default)
  learning.py     §41 outcome scoring and calibration
  report.py       §31 trader, §32 market, §33 resolution, §38 daily
  dashboard.py    §30 static HTML
  cli.py          §44 master commands
```

Data lives in `ANTIDOTE_PREDICTION_OS/` (§36): `MARKETS/ TRADERS/ TRADES/
ALERTS/ NEWS/ BACKTESTS/ PAPER_TRADING/ REPORTS/ CONFIG/ LOGS/` plus
`antidote.db`.

---

## Compliance posture (§43)

- Public and official endpoints only. No authentication bypass, no CAPTCHA
  handling, no rate-limit evasion, no access-control circumvention.
- A `403`/`401`/`407` is treated as a final answer. `SourceUnavailable` carries
  a `policy_denial` flag; denials are reported and **never retried or routed
  around**.
- Rate limits are respected per source via a configurable limiter.
- No de-anonymisation of counterparties a platform has chosen not to expose.
- `live_execution_enabled` defaults to `False` and nothing in this codebase can
  place an order. There is no exchange credential handling and no order path.
- Alert destinations beyond `dashboard`/`log`/`file` are declared but inert.
  Enabling one requires you to supply credentials you are authorised to use.
- No news provider is enabled by default; the RSS reader only fetches feeds you
  explicitly list.
- Before adding any execution capability, research the platform rules, API
  terms, and the financial regulations of your jurisdiction. Prediction-market
  legality varies significantly by location.

---

## Known limitations

- **Adapters unverified against live APIs** (see top of this document).
- **Delay sensitivity needs sub-daily snapshots.** The delay sweep (§15) is only
  as granular as your snapshot history. With daily snapshots — as the fixture
  generates — a 0s and a 900s delay resolve to the same price, and the curve
  looks flat. Run `monitor` at a short poll interval to build the minute-level
  history this analysis actually needs.
- **Slippage is a square-root impact estimate**, not a book walk. When an order
  book is available, walking it is strictly better.
- **News correlation is unconfigured**, so `has_catalyst` is `None` rather than
  `False`. Absence of news in feeds you have not configured is evidence about
  your configuration, not about the trader.
- **Regime analysis covers volatility only.** Election periods and sports
  seasons need a calendar the system does not have; supply one rather than
  letting it guess.
- **Unmatched sells are ignored, not treated as shorts.** The public feed does
  not reliably show the opening side of a position.
- **Backtests score only resolved markets**, biasing toward faster-resolving
  ones.
- **Confidence weights are priors, not calibrated values.** They have never been
  fitted against real outcomes. `antidote learn` reports whether higher
  confidence actually tracks a higher hit rate; until it has ~30 scored alerts,
  it will tell you it cannot say.

---

## The point

The objective is not "copy whoever made the most money." It is to identify
high-quality signals, state honestly how much they are worth, and put a human in
front of every decision.

Every signal must answer: who, what, when, how much, why, how reliable, what has
happened historically, what would invalidate it, what happens under execution
delay, and what the risk is.

Then you decide.

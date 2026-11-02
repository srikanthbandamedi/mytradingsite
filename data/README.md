# 5-minute bars from Robinhood

One CSV per stock, merged from every bar download the T-V3 backtests used.
Range: Feb 23 – Oct 30, 2026 (Feb 23 – Mar 20 is the 20-day warm-up before the Mar 23 test start).

Columns: `begins_at_utc` (bar start, UTC), `open`, `high`, `low`, `close`, `volume`, `session`.
`session` is `reg` for regular hours. A few Nasdaq stocks also have `pre` / `post` bars from the extended-hours tests (Jul–Oct).
Gap-fill (interpolated) bars were dropped.

Shorter files: ABBV BRK.B CVX JNJ JPM LLY MA V WMT XOM (Jun 30 – Oct 23 only), TRI (from May 4), SNDQ (from Apr 23), MUZ (from Jun 9).

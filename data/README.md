# 5-minute bars from Robinhood

One CSV per stock, merged from every bar download the T-V3 backtests used.
Range: Feb 23 – Nov 6, 2026 (Feb 23 – Mar 20 is the 20-day warm-up before the Mar 23 test start).

Nov 7, 2026 update: added regular-hours bars Oct 31 – Nov 5 for the 247 stocks the daily 7:30 AM picker fetches (S&P 201-300, Nasdaq 100, S&P 100, QQQ), plus Nov 6 for the stocks the dry runs traded. 58 new stocks (S&P 100 names not tested before) start Sep 3. A few days have 76-77 bars because Robinhood skips 5-minute bars with no trades.

Columns: `begins_at_utc` (bar start, UTC), `open`, `high`, `low`, `close`, `volume`, `session`.
`session` is `reg` for regular hours. A few Nasdaq stocks also have `pre` / `post` bars from the extended-hours tests (Jul–Oct).
Gap-fill (interpolated) bars were dropped.

Shorter files: the 58 stocks added Nov 7 (from Sep 3); ABBV BRK.B CVX JNJ JPM LLY MA V WMT XOM (from Jun 30), TRI (from May 4), SNDQ (from Apr 23), MUZ (from Jun 9).

# S&P 500 ranks 301-400 and 401-500 backtest (2026-11-02)

Same setup as `../sp500_101_300/`: T-V3 trend rule, $2,000 per buy, stop orders, trail after +1%, no buys after 2:55 PM CT, **no QQQ rule**. Trading Mar 23 - Oct 30, 2026 (bars from Feb 23 for the 20-day warm-up).

Picker: each morning take the 20 stocks with the highest 20-day average 5-minute ADX, keep the 10 with the best 20-day price gain. Only those 10 can be bought.

Ranks come from Robinhood market caps on Nov 2, 2026 (`sp_caps.json`). Only 78 stocks in ranks 401-500 still trade; the rest were bought out or delisted. The S&P member list is from memory and may miss a few 2025-26 additions.

| Group | Stock list | 2 slots | Drawdown | 5 slots | Drawdown |
|---|---|---|---|---|---|
| 301-400 | ADX then momentum top 10 | +$1,213 | -$506 | +$1,087 | -$680 |
| 301-400 | All 100, no picker | +$759 | -$1,157 | +$164 | -$1,748 |
| 401-500 | ADX then momentum top 10 | +$1,235 | -$768 | +$2,388 | -$726 |
| 401-500 | All 78, no picker | +$767 | -$1,093 | -$23 | -$2,909 |

Run: `python3 run.py 301_400` (needs the bars in `../../data/bars_5min`). Results in `results/`.

# S&P 500 ranks 101–200 and 201–300 (Nov 2, 2026)

Live T-V3 rule, $2,000 per buy, no QQQ rule, trading Mar 23 – Oct 30, 2026.
Each morning: top 20 stocks by 20-day average 5-minute ADX, then the 10 with the best 20-day price gain. Only those 10 can be bought.

| Group | Picker, 2 slots | Picker, 5 slots | All 100, 2 slots | All 100, 5 slots |
|---|---|---|---|---|
| Ranks 101–200 | +$630 (max drop −$416) | +$1,328 (−$397) | +$366 (−$1,149) | +$1,564 (−$1,737) |
| Ranks 201–300 | +$2,207 (−$568) | +$3,516 (−$653) | −$69 (−$1,007) | −$728 (−$2,063) |

Files
- `rank_101_200.txt`, `rank_201_300.txt`: the stocks in each group. `sp_caps.json`: market caps used (Robinhood scanner, Nov 2, 2026).
- `results/summary_*.csv`: totals, win rate, drawdown, by month. `results/trades_*.csv`: every trade. `results/daily_lists_*.csv`: the 10 stocks allowed each day.
- `run.py`: the test script (needs the T-V3 rule code from the project folder to run). Bars are in `../../data/bars_5min/`.

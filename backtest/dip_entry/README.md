# Buy on the dip after the signal (Nov 4, 2026)

**Question:** after a buy signal the price often drops 0.5–1% before it rises. What if we place the limit buy *below* the signal price (0.25%, 0.5%, 1%, or at the stop price) and wait for it to fill? Once it fills, the stop order goes the usual distance below the actual fill price.

**Answer: no. Today's rule (buy at the signal price) wins in every case**, on both lists, with 2 or 5 slots.

Live T-V3 rule, $2,000 per buy, ADX-then-momentum top 10 picked each morning, trading Mar 23 – Oct 30, 2026. S&P 201–300 has no QQQ rule (like live); Nasdaq 100 keeps the QQQ rule (like the dry run). A resting dip order holds a slot, is cancelled at 2:55 PM CT, and in the "30 min" runs is cancelled after 6 bars. If the fill bar also reaches the new stop, it counts as stopped out in that bar.

### 2 slots (live setup): total profit (max drop)

| Entry | S&P 201–300 | Nasdaq 100 |
|---|---|---|
| **Today: buy at signal price** | **+$2,207 (−$568)** | **+$2,206 (−$427)** |
| Limit 0.25% below, rest of day | +$435 (−$453) | +$455 (−$366) |
| Limit 0.5% below, rest of day | −$33 (−$330) | +$778 (−$238) |
| Limit 1% below, rest of day | −$89 (−$208) | +$608 (−$131) |
| Limit at stop price, rest of day | +$139 (−$266) | +$105 (−$138) |
| Limit 0.25% below, 30 min | +$618 (−$513) | +$704 (−$351) |
| Limit 0.5% below, 30 min | +$456 (−$341) | +$371 (−$279) |
| Limit 1% below, 30 min | +$418 (−$176) | −$4 (−$312) |
| Limit at stop price, 30 min | +$26 (−$231) | +$155 (−$362) |

### 5 slots

| Entry | S&P 201–300 | Nasdaq 100 |
|---|---|---|
| **Today: buy at signal price** | **+$3,516 (−$653)** | **+$3,069 (−$670)** |
| Best dip version | +$909 (0.25%, 30 min) | +$793 (0.5%, rest of day) |

### Why
The dip version only buys the trades that dip, and those are the losers. Splitting today's trades (2 slots) by whether the price later fell 0.5% below the buy price that day:

| | Dipped 0.5% | Never dipped 0.5% |
|---|---|---|
| S&P 201–300 | 510 trades, −$3,182 | 467 trades, **+$5,389** |
| Nasdaq 100 | 449 trades, −$2,495 | 362 trades, **+$4,701** |

All of the profit comes from the buys that keep going up right away, and a dip limit order never fills on those. The dips you see after a buy are real, but they are mostly the start of trades that end up losing. Waiting for a dip raises the win rate (37% → 41–47%) and shrinks the max drop, but makes much less money.

Files: `run.py` (the test), `why.py` (the dipped/never-dipped split), `results/summary_*.csv` (all runs, with months, fill rate), `results/trades_*.csv` (every trade, with signal price and fill price), `results/why_*.txt`.

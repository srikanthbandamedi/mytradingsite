# Trade Log website

A static site that shows the daily buy and sell log from my trading algorithm.
No server or build step. GitHub Pages hosts it for free.

## How logs get onto the site

Each trading day is one plain-text file in `logs/`, named `YYYY-MM-DD.txt`, in the
algorithm's normal format. Each pass starts with a `Live, <time> CT` line:

```text
Live, 2:58 CT

The AMZN stop filled at 2:55 CT: sold 7 shares at $253.28, a loss of $3.34 after fees.
Placed a buy for 4 ADI with a limit of $424.88.

Day P&L: -$3.34 realized.

Time (CT)<TAB>Call<TAB>Seconds since previous
2:58:02<TAB>get_equity_orders (stops)<TAB>—
2:58:43<TAB>place_equity_order (ADI buy)<TAB>17.4
```

The site shows the newest pass first and reads each pass like this:
- Each line of text is shown as a paragraph. A line with a question in it is highlighted.
- Tab-separated lines become a collapsible "API calls" table.
- The `Day P&L:` line feeds the day's P/L shown at the top and in the list of days.
- Sold / bought / buy order / stop raised / blocked are picked up as labels.

To publish, append each pass to that day's file and push:

```bash
python scripts/build_index.py   # updates logs/index.json, the list of days
git add logs && git commit -m "Logs for 2026-11-02" && git push
```

If you forget to run `build_index.py`, the **Update log index** GitHub Action rebuilds
`logs/index.json` after every push that touches `logs/`.

Structured `YYYY-MM-DD.json` files (`{"trades":[{time, action, symbol, quantity, price, pnl, reason}]}`)
are also supported.

## Preview locally

```bash
python -m http.server 8000   # then open http://localhost:8000
```

# Trade Log website

A static site that shows the daily buy and sell log from my trading algorithm.
No server or build step. GitHub Pages hosts it for free.

## How logs get onto the site

Each trading day is one JSON file in `logs/`, named `YYYY-MM-DD.json`:

```json
{
  "date": "2026-10-30",
  "trades": [
    {
      "time": "2026-10-30T09:35:12-04:00",
      "action": "BUY",
      "symbol": "AAPL",
      "quantity": 10,
      "price": 228.15,
      "reason": "Price crossed above the 20-day moving average."
    },
    {
      "time": "2026-10-30T15:41:03-04:00",
      "action": "SELL",
      "symbol": "AAPL",
      "quantity": 10,
      "price": 230.02,
      "pnl": 18.70,
      "reason": "Hit the take-profit target."
    }
  ]
}
```

- `action` is `BUY` or `SELL`. `pnl` is optional; when present the day's realized P/L is shown.
- Alternate field names also work: `side`, `ticker`, `qty`, `timestamp`, `reasoning`.
- A plain array of trades (without the `{"trades": ...}` wrapper) also works.

To publish a day, the algorithm (or you) adds the file and pushes:

```bash
python scripts/build_index.py   # updates logs/index.json, the list of days
git add logs && git commit -m "Logs for 2026-10-30" && git push
```

If you forget to run `build_index.py`, the **Update log index** GitHub Action rebuilds
`logs/index.json` after every push that touches `logs/`.

The two files in `logs/` marked SAMPLE DATA are examples. Delete them once real logs arrive.

## Preview locally

```bash
python -m http.server 8000   # then open http://localhost:8000
```

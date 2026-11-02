"""Rebuild logs/index.json from the daily log files in logs/.

Each day is one file named YYYY-MM-DD.txt (the algo's plain-text updates)
or YYYY-MM-DD.json (structured trades). Run this after adding a new day,
or let the GitHub Action do it automatically on every push.
"""
import json
import re
from pathlib import Path

LOGS = Path(__file__).resolve().parent.parent / "logs"
DAY_FILE = re.compile(r"^(\d{4}-\d{2}-\d{2})\.(txt|md|json)$")
PNL = re.compile(r"Day P&L:\s*(-?\$-?[\d,]+(?:\.\d+)?)", re.I)

days = {}
for f in LOGS.iterdir():
    m = DAY_FILE.match(f.name)
    if not m:
        continue
    date, ext = m.groups()
    entry = {"date": date, "file": f.name}
    if ext == "json":
        try:
            data = json.loads(f.read_text())
        except json.JSONDecodeError as e:
            print(f"Skipping {f.name}: not valid JSON ({e})")
            continue
        trades = data if isinstance(data, list) else data.get("trades", [])
        entry["entries"] = len(trades)
    else:
        text = f.read_text(encoding="utf-8")
        entry["entries"] = len(re.findall(r"^Live,", text, re.M))
        pnls = PNL.findall(text)
        if pnls:
            entry["pnl"] = pnls[-1]
    # If a day has both .txt and .json, prefer the text log.
    if date not in days or ext != "json":
        days[date] = entry

ordered = [days[d] for d in sorted(days, reverse=True)]
(LOGS / "index.json").write_text(json.dumps({"days": ordered}, indent=2) + "\n")
print(f"Indexed {len(ordered)} day(s)")

"""Rebuild logs/index.json from the daily log files in logs/.

Each day is one file named YYYY-MM-DD.json. Run this after adding a new day,
or let the GitHub Action do it automatically on every push.
"""
import json
import re
from pathlib import Path

LOGS = Path(__file__).resolve().parent.parent / "logs"
DAY_FILE = re.compile(r"^\d{4}-\d{2}-\d{2}\.json$")

days = []
for f in sorted(LOGS.glob("*.json"), reverse=True):
    if not DAY_FILE.match(f.name):
        continue
    try:
        data = json.loads(f.read_text())
    except json.JSONDecodeError as e:
        print(f"Skipping {f.name}: not valid JSON ({e})")
        continue
    trades = data if isinstance(data, list) else data.get("trades", [])
    days.append({"date": f.stem, "trades": len(trades)})

(LOGS / "index.json").write_text(json.dumps({"days": days}, indent=2) + "\n")
print(f"Indexed {len(days)} day(s)")

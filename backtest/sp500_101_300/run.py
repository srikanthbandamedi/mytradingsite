"""S&P 500 market-cap ranks 101-200 and 201-300 (2026-11-02 request).
Live T-V3 rule, $2,000 per buy, NO QQQ filter. Each morning: top 20 by 20-day avg 5-min ADX, then top 10 of those by
20-day momentum; only those 10 may be bought (held stocks still managed). Bars Feb 23-Oct 30, trading Mar 23-Oct 30.
usage: python3 run.py 101_200|201_300 [SLOTS ...]"""
import os, sys, pickle, csv
HERE = os.path.dirname(os.path.abspath(__file__)); BT = os.path.dirname(HERE); ND = os.path.join(BT, 'ndx100')
grp = sys.argv[1]; SL = [int(x) for x in sys.argv[2:]] or [2, 5]
src = open(os.path.join(ND, 'ndx100_test.py')).read().split('import sys as _s')[0]
# skip loading the Nasdaq 100 universe; we load our own below
src = src.replace("for s in NEW:\n    add(s,", "for s in []:\n    add(s,").replace("for s in OLD + EXTRA:", "for s in []:")
src = src.replace("            if cands and not VWOK.get(t, True):", "            cands = [c for c in cands if ALLOW is None or c[0] in ALLOW.get(day, ())]\n            if cands and not VWOK.get(t, True):")
g = {'__file__': os.path.join(ND, 'ndx100_test.py'), 'ALLOW': None}
exec(src, g)
g['VWOK'] = {}                      # QQQ rule removed: every bar counts as OK
g['START'], g['END'] = '2026-03-23', '2026-10-30'
SYMS = open(os.path.join(HERE, 'rank_%s.txt' % grp)).read().split()
for s in SYMS:
    p = os.path.join(HERE, 'bars', s + '.csv')
    if not os.path.exists(p): p = os.path.join(ND, 'bars', s + '.csv')
    g['add'](s, p, lambda k: True)
data = g['data']
for s in SYMS: data[s] = dict(sorted(data[s].items()))
R = g['R']

def reg(bs): return [b for b in bs if 8 * 60 + 30 <= b['t'].hour * 60 + b['t'].minute < 15 * 60]
DAY = {}
for s in SYMS:
    for k, bs in data[s].items():
        r = reg(bs)
        if len(r) > 60: DAY.setdefault(s, {})[k] = r[-1]['c']
ALLDAYS = sorted(set().union(*(DAY[s] for s in SYMS)))
ap = os.path.join(HERE, 'day_adx_%s.pkl' % grp)
if os.path.exists(ap): DADX = pickle.load(open(ap, 'rb'))
else:
    DADX = {}
    for s in SYMS:
        ks = sorted(data[s])
        for p_, k_ in zip(ks, ks[1:]):
            d_ = R.build_day(data[s][p_], data[s][k_], R.LIVE_MODE)
            x_ = [v for v in d_['adx'][d_['k0']:] if v is not None]
            if x_: DADX.setdefault(s, {})[k_] = sum(x_) / len(x_)
    pickle.dump(DADX, open(ap, 'wb'))

def mom(s, day):
    c = [DAY[s][k] for k in sorted(DAY[s]) if k < day][-21:]
    return c[-1] / c[0] - 1 if len(c) >= 15 else None
def adx20(s, day):
    v = [DADX[s][k] for k in sorted(DADX.get(s, {})) if k < day][-20:]
    return sum(v) / len(v) if len(v) >= 14 else None
ALLOW, LISTS = {}, {}
for day in ALLDAYS:
    m = {s: mom(s, day) for s in SYMS}; a = {s: adx20(s, day) for s in SYMS}
    ok = [s for s in SYMS if m[s] is not None and a[s] is not None]
    top = sorted(sorted(ok, key=lambda s: -a[s])[:20], key=lambda s: -m[s])[:10]
    ALLOW[day] = set(top); LISTS[day] = top
with open(os.path.join(HERE, 'results', 'daily_lists_%s.csv' % grp), 'w') as fh:
    for d in ALLDAYS:
        if d >= g['START']: fh.write(d + ',' + ' '.join(LISTS[d]) + '\n')

rows = []
for slots in SL:
    for name, allow in (('ADX then momentum top 10', ALLOW), ('all 100, no picker', None)):
        g['ALLOW'] = allow
        tr = g['run'](SYMS, slots)
        row = g['summ']('ranks %s | %s | %d slots' % (grp.replace('_', '-'), name, slots), tr); rows.append(row); print(row, flush=True)
        per = {}
        for x in tr: per[x['symbol']] = per.get(x['symbol'], 0) + x['pnl_usd']
        row['top_winners'] = ' '.join('%s %+d' % kv for kv in sorted(per.items(), key=lambda kv: -kv[1])[:5])
        row['top_losers'] = ' '.join('%s %+d' % kv for kv in sorted(per.items(), key=lambda kv: kv[1])[:5])
        fn = 'trades_%s_%s_%dslots.csv' % (grp, 'adxmom' if allow else 'all', slots)
        with open(os.path.join(HERE, 'results', fn), 'w', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=list(tr[0])); w.writeheader(); w.writerows(tr)
with open(os.path.join(HERE, 'results', 'summary_%s.csv' % grp), 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)

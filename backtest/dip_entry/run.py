"""Dip-entry test (user request 2026-11-04): when the buy signal fires, instead of buying at the signal price,
place a limit buy BELOW it and wait for the dip. Once it fills, the stop order goes the usual distance
(signal price - first stop) below the actual fill price.
Entry modes: close (today's rule), pct:X (limit X% below signal close), stop (limit = the stop price).
Order life: 'day' (rests until 2:55 PM CT) or N bars of 5 min. A resting order holds a slot.
Same simulator, picker and period as sp_mid/run.py (Mar 23-Oct 30, $2,000 per buy, ADX-then-momentum top 10).
usage: python3 run.py sp201_300|ndx100"""
import os, sys, pickle, csv, math
HERE = os.path.dirname(os.path.abspath(__file__)); BT = os.path.dirname(HERE); ND = os.path.join(BT, 'ndx100'); SPM = os.path.join(BT, 'sp_mid')
grp = sys.argv[1]
src = open(os.path.join(ND, 'ndx100_test.py')).read().split('import sys as _s')[0]
if grp != 'ndx100':
    src = src.replace("for s in NEW:\n    add(s,", "for s in []:\n    add(s,").replace("for s in OLD + EXTRA:", "for s in []:")
g = {'__file__': os.path.join(ND, 'ndx100_test.py')}
exec(src, g)
g['START'], g['END'] = '2026-03-23', '2026-10-30'
if grp == 'ndx100':
    SYMS = g['SYMS']                  # QQQ rule kept (as in the Nasdaq dry run)
else:
    g['VWOK'] = {}                    # S&P: no QQQ rule (as live)
    SYMS = open(os.path.join(SPM, 'rank_201_300.txt')).read().split()
    for s in SYMS:
        p = os.path.join(SPM, 'bars', s + '.csv')
        if not os.path.exists(p): p = os.path.join(ND, 'bars', s + '.csv')
        g['add'](s, p, lambda k: True)
data, R, OL, RANK = g['data'], g['R'], g['OL'], g['RANK']
for s in SYMS: data[s] = dict(sorted(data[s].items()))

# ---- ADX-then-momentum daily list (same as sp_mid/run.py)
def reg(bs): return [b for b in bs if 8 * 60 + 30 <= b['t'].hour * 60 + b['t'].minute < 15 * 60]
DAY = {}
for s in SYMS:
    for k, bs in data[s].items():
        r = reg(bs)
        if len(r) > 60: DAY.setdefault(s, {})[k] = r[-1]['c']
ALLDAYS = sorted(set().union(*(DAY[s] for s in SYMS if s in DAY)))
ap = os.path.join(SPM, 'day_adx_201_300.pkl') if grp != 'ndx100' else os.path.join(HERE, 'day_adx_ndx100.pkl')
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
    c = [DAY[s][k] for k in sorted(DAY.get(s, {})) if k < day][-21:]
    return c[-1] / c[0] - 1 if len(c) >= 15 else None
def adx20(s, day):
    v = [DADX[s][k] for k in sorted(DADX.get(s, {})) if k < day][-20:]
    return sum(v) / len(v) if len(v) >= 14 else None
ALLOW = {}
for day in ALLDAYS:
    m = {s: mom(s, day) for s in SYMS}; a = {s: adx20(s, day) for s in SYMS}
    ok = [s for s in SYMS if m[s] is not None and a[s] is not None]
    ALLOW[day] = set(sorted(sorted(ok, key=lambda s: -a[s])[:20], key=lambda s: -m[s])[:10])


def run(syms, slots, mode='close', pct=0.5, life='day', BUY=2000.0, start_after=1.0, step_pct=0.1):
    days = sorted(set().union(*(data[s] for s in syms)))
    pos, pend, trades, ds = {}, {}, [], {}
    stats = dict(signals=0, filled=0, expired=0, same_bar_stop=0)
    def close_trade(s, p, t, px, why):
        trades.append(dict(symbol=s, signal_at=p['sig_at'], signal_px=round(p['sig_px'], 4), buy_at=p['at'],
                           sell_at=t.strftime('%Y-%m-%d %H:%M'), buy=round(p['price'], 4), sell=round(px, 4), why=why,
                           pnl_usd=round((px / p['price'] - 1) * BUY, 2)))
    for day in days:
        if day < g['START'] or day > g['END']:
            continue
        ds = {}
        for s in syms:
            by = data[s]
            if day in by and any(k < day for k in by):
                ds[s] = R.build_day(by[max(k for k in by if k < day)], by[day], R.LIVE_MODE)
        times = sorted({t for d in ds.values() for t in d['t'][d['k0']:]})
        idx = {s: {t: i for i, t in enumerate(d['t']) if i >= d['k0']} for s, d in ds.items()}
        for t in times:
            hm = t.strftime('%H:%M')
            # resting dip orders: fill, or cancel at 2:55 PM CT / when their life runs out
            for s in list(pend):
                q = pend[s]
                j = idx.get(s, {}).get(t)
                if hm >= '14:55' or (life != 'day' and q['bars'] >= life):
                    pend.pop(s); stats['expired'] += 1; continue
                if j is None or t <= q['t_sig']:
                    continue
                q['bars'] += 1
                o, lo = OL.get((s, t), (ds[s]['c'][j], ds[s]['c'][j]))
                if lo <= q['limit']:
                    px = min(q['limit'], o)
                    st = math.floor(round((px - q['gap']) * 100, 6)) / 100
                    pend.pop(s); stats['filled'] += 1
                    p = dict(price=px, peak=px, stop=st, gap=q['gap'], t_buy=t, at=t.strftime('%Y-%m-%d %H:%M'),
                             sig_at=q['sig_at'], sig_px=q['sig_px'])
                    if lo <= st:      # bar also reached the new stop: assume the worst, stopped in the same bar
                        stats['same_bar_stop'] += 1
                        close_trade(s, p, t, st, 'stop order (same bar as fill)')
                        continue
                    pos[s] = p
            cands = []
            for s in [s for s in syms if s in pos] + [s for s in syms if s not in pos]:
                j = idx.get(s, {}).get(t)
                if j is None or s in pend:
                    continue
                d = ds[s]
                p = pos.get(s)
                if p and t > p['t_buy']:
                    o, lo = OL.get((s, t), (d['c'][j], d['c'][j]))
                    if lo <= p['stop']:
                        pos.pop(s); close_trade(s, p, t, min(p['stop'], o), 'stop order'); continue
                if p and t == p['t_buy']:
                    continue
                act, why = R.decide(d, j, dict(price=p['price'], peak=p['peak'], stop=p['stop']) if p else None, R.LIVE_MODE)
                if act == 'sell':
                    pos.pop(s); close_trade(s, p, t, d['c'][j], why)
                elif act == 'buy':
                    if ALLOW_ON is None or s in ALLOW_ON.get(day, ()):
                        cands.append((s, d, j, why))
                elif act == 'hold':
                    p['peak'] = max(p['peak'], d['c'][j])
                    if p['peak'] >= p['price'] * (1 + start_after / 100):
                        new = math.floor(round((p['peak'] - p['gap']) * 100, 6)) / 100
                        if new - p['stop'] >= max(0.01, p['peak'] * step_pct / 100):
                            p['stop'] = new
            if cands and not g['VWOK'].get(t, True):
                continue
            if hm >= '14:55':
                continue
            free = slots - len(pos) - len(pend)
            if len(cands) > free:
                cands = RANK(cands)
            for s, d, j, why in cands[:max(free, 0)]:
                stats['signals'] += 1
                c = d['c'][j]
                st = math.floor(R.stop_price(d, j, R.LIVE_MODE) * 100) / 100
                at = t.strftime('%Y-%m-%d %H:%M')
                if mode == 'close':
                    stats['filled'] += 1
                    pos[s] = dict(price=c, peak=c, stop=st, gap=c - st, t_buy=t, at=at, sig_at=at, sig_px=c)
                else:
                    lim = st if mode == 'stop' else c * (1 - pct / 100)
                    pend[s] = dict(limit=math.floor(lim * 100) / 100, gap=c - st, t_sig=t, sig_at=at, sig_px=c, bars=0)
    for s, p in pos.items():
        d = ds.get(s)
        if d:
            trades.append(dict(symbol=s, signal_at=p['sig_at'], signal_px=round(p['sig_px'], 4), buy_at=p['at'],
                               sell_at=g['END'] + ' 15:00', buy=round(p['price'], 4), sell=d['c'][-1],
                               why='still open at end', pnl_usd=round((d['c'][-1] / p['price'] - 1) * BUY, 2)))
    return trades, stats


VARIANTS = [('Today: buy at signal price', 'close', 0, 'day')]
for life, lname in (('day', 'rest of day'), (6, '30 min')):
    for pc in (0.25, 0.5, 1.0):
        VARIANTS.append(('Limit %.2g%% below, %s' % (pc, lname), 'pct', pc, life))
    VARIANTS.append(('Limit at stop price, %s' % lname, 'stop', 0, life))
rows = []
for slots in (2, 5):
    for name, mode, pc, life in VARIANTS:
        ALLOW_ON = ALLOW
        tr, st = run(SYMS, slots, mode, pc, life)
        row = g['summ']('%s | %s | %d slots' % (grp, name, slots), tr)
        row.update(signals=st['signals'], filled=st['filled'], fill_rate=round(100 * st['filled'] / max(st['signals'], 1), 1),
                   same_bar_stop=st['same_bar_stop'])
        rows.append(row); print(row, flush=True)
        slug = '%s_%dslots_%s_%s_%s' % (grp, slots, mode, pc, life)
        if tr:
            with open(os.path.join(HERE, 'results', 'trades_%s.csv' % slug), 'w', newline='') as fh:
                w = csv.DictWriter(fh, fieldnames=list(tr[0])); w.writeheader(); w.writerows(tr)
with open(os.path.join(HERE, 'results', 'summary_%s.csv' % grp), 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)

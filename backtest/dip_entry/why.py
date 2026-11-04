"""Why dip entries lose: split today's-rule trades by whether price later dipped 0.5% below the signal price that day."""
import sys, csv, os
from datetime import datetime
src = open('run.py').read().split('VARIANTS = [')[0]
sys.argv = ['run.py', sys.argv[1]]; g = {'__file__': os.path.abspath('run.py')}; exec(src, g)
data, R = g['data'], g['R']
grp = sys.argv[1]
out = []
for slots in (2,):
    fn = 'results/trades_%s_%dslots_close_0_day.csv' % (grp, slots)
    rows = list(csv.DictReader(open(fn)))
    for x in rows:
        s = x['symbol']; t0 = datetime.strptime(x['buy_at'], '%Y-%m-%d %H:%M'); day = x['buy_at'][:10]
        bs = [b for b in data[s].get(day, []) if b['t'].replace(tzinfo=None) > t0 and b['t'].strftime('%H:%M') < '14:55']
        px = float(x['buy']); lo = min([b['l'] for b in bs], default=px)
        x['dip'] = (px - lo) / px * 100
    for cut in (0.25, 0.5, 1.0):
        a = [float(x['pnl_usd']) for x in rows if x['dip'] >= cut]; b = [float(x['pnl_usd']) for x in rows if x['dip'] < cut]
        out.append('%s %d slots: dipped >=%.2g%%: %d trades %+d ; never dipped: %d trades %+d' % (grp, slots, cut, len(a), sum(a), len(b), sum(b)))
print('\n'.join(out))
open('results/why_%s.txt' % grp, 'w').write('\n'.join(out) + '\n')

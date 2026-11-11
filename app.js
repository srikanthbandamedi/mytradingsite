// Reads logs/index.json (list of days), then one day's log: logs/<date>.txt (text updates) or logs/<date>.json (trade rows).
(function () {
  const listEl = document.getElementById('day-list');
  const selectEl = document.getElementById('day-select');
  const viewEl = document.getElementById('day-view');
  let days = [];
  let filter = 'ALL';
  let current = null;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => (n == null || isNaN(n)) ? '–' : Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  const signed = (n) => (n > 0 ? '+' : '') + money(n);

  // Logs are read straight from the repo (2026-11-06), so a log push shows up within minutes
  // without waiting for a GitHub Pages deploy. Falls back to the deployed copy if that fails.
  const RAW = 'https://raw.githubusercontent.com/srikanthbandamedi/mytradingsite/main/';
  async function fetchLog(path) {
    const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!local) {
      try {
        const res = await fetch(`${RAW}${path}?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) return res;
      } catch (e) { /* fall back below */ }
    }
    return fetch(path, { cache: 'no-store' });
  }

  async function getJSON(path) {
    const res = await fetchLog(path);
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  }

  // Accept a few common field names so the algo's output doesn't have to match exactly.
  function normalize(t) {
    const pick = (...keys) => keys.map((k) => t[k]).find((v) => v !== undefined && v !== null && v !== '');
    const qty = Number(pick('quantity', 'qty', 'shares', 'size'));
    const price = Number(pick('price', 'fill_price', 'avg_price'));
    const pnl = pick('pnl', 'profit', 'realized_pnl');
    return {
      time: pick('time', 'timestamp', 'datetime'),
      action: String(pick('action', 'side', 'type') || '').toUpperCase(),
      symbol: pick('symbol', 'ticker'),
      qty: isNaN(qty) ? null : qty,
      price: isNaN(price) ? null : price,
      pnl: pnl == null ? null : Number(pnl),
      reason: pick('reason', 'reasoning', 'rationale', 'note'),
    };
  }

  function fmtTime(t) {
    if (!t) return '';
    const d = new Date(t);
    if (isNaN(d)) return esc(t); // plain "09:31:05" style strings
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function fmtDate(iso) {
    const d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  function renderDayList() {
    listEl.innerHTML = days.map((d) =>
      `<li><a href="#${esc(d.date)}" data-date="${esc(d.date)}">${esc(d.date)}${d.tabs ? `<span class="count" title="S&amp;P 201-300 / Nasdaq 100">${esc(Object.values(d.tabs).join(' / '))}</span>` : `<span class="count ${pnlClass(d.pnl)}">${esc(d.pnl ?? (d.entries || d.trades || ''))}</span>`}</a></li>`
    ).join('');
    selectEl.innerHTML = days.map((d) => `<option value="${esc(d.date)}">${esc(d.date)}</option>`).join('');
  }

  function markActive(date) {
    listEl.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.dataset.date === date));
    selectEl.value = date;
  }

  function renderDay(date, trades) {
    const buys = trades.filter((t) => t.action === 'BUY');
    const sells = trades.filter((t) => t.action === 'SELL');
    const value = (arr) => arr.reduce((s, t) => s + (t.qty ?? 0) * (t.price ?? 0), 0);
    const pnlTrades = trades.filter((t) => t.pnl != null && !isNaN(t.pnl));
    const pnl = pnlTrades.reduce((s, t) => s + t.pnl, 0);
    const shown = filter === 'ALL' ? trades : trades.filter((t) => t.action === filter);

    viewEl.innerHTML = `
      <h1>${esc(fmtDate(date))}</h1>
      <p class="muted">${trades.length} trade${trades.length === 1 ? '' : 's'}</p>
      <div class="summary">
        <div class="stat"><div class="label">Buys</div><div class="value">${buys.length}</div></div>
        <div class="stat"><div class="label">Sells</div><div class="value">${sells.length}</div></div>
        <div class="stat"><div class="label">Bought</div><div class="value">${money(value(buys))}</div></div>
        <div class="stat"><div class="label">Sold</div><div class="value">${money(value(sells))}</div></div>
        ${pnlTrades.length ? `<div class="stat"><div class="label">Realized P/L</div><div class="value ${pnl >= 0 ? 'pos' : 'neg'}">${signed(pnl)}</div></div>` : ''}
      </div>
      <div class="filters" role="group" aria-label="Filter trades">
        ${['ALL', 'BUY', 'SELL'].map((f) => `<button data-filter="${f}" class="${f === filter ? 'on' : ''}">${f === 'ALL' ? 'All' : f === 'BUY' ? 'Buys' : 'Sells'}</button>`).join('')}
      </div>
      ${shown.length ? shown.map((t) => `
        <article class="trade">
          <div class="trade-head">
            <span class="badge ${esc(t.action)}">${esc(t.action)}</span>
            <span class="symbol">${esc(t.symbol)}</span>
            <span class="time">${fmtTime(t.time)}</span>
            <span class="num">${t.qty ?? '–'} × ${money(t.price)}</span>
          </div>
          ${t.reason ? `<p class="reason">${esc(t.reason)}</p>` : ''}
          ${t.pnl != null && !isNaN(t.pnl) ? `<div class="extra">P/L on this trade: <span class="${t.pnl >= 0 ? 'pos' : 'neg'}">${signed(t.pnl)}</span></div>` : ''}
        </article>`).join('') : '<p class="empty">No trades match this filter.</p>'}
    `;
    viewEl.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
      filter = b.dataset.filter;
      renderDay(date, trades);
    }));
  }

  function pnlClass(v) {
    if (v == null) return '';
    const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
    return isNaN(n) || n === 0 ? '' : n > 0 ? 'pos' : 'neg';
  }

  // Plain-text logs: one "Live, <time>" section per pass of the algo.
  function parseText(text) {
    const parts = text.replace(/\r\n/g, '\n').split(/^Live,[ \t]*/m);
    const entries = [];
    parts.forEach((part, i) => {
      if (!part.trim()) return;
      const lines = part.split('\n');
      const title = i === 0 ? '' : lines.shift().trim();
      const blocks = [];
      let table = null;
      let afterTable = false;
      for (const line of lines) {
        if (line.includes('\t')) {
          if (!table) { table = []; blocks.push({ type: 'table', rows: table }); }
          table.push(line.split('\t').map((c) => c.trim()));
          continue;
        }
        if (table) { table = null; afterTable = true; }
        if (!line.trim()) continue;
        const t = line.trim();
        if (/^Day P&L:/i.test(t)) blocks.push({ type: 'pnl', text: t });
        else if (t.includes('?')) blocks.push({ type: 'question', text: t });
        else blocks.push({ type: afterTable ? 'note' : 'p', text: t });
      }
      const prose = blocks.filter((b) => b.type !== 'table').map((b) => b.text).join(' ');
      const tags = [];
      if (/\bsold\b/i.test(prose)) tags.push(['SELL', 'Sold']);
      if (/\bbought ([A-Z.]+ )?\d+/i.test(prose)) tags.push(['BUY', 'Bought']);
      if (/placed a buy/i.test(prose)) tags.push(['ORDER', 'Buy order']);
      if (/raised .*stop/i.test(prose)) tags.push(['STOP', 'Stop raised']);
      if (/blocked|error/i.test(prose)) tags.push(['WARN', 'Issue']);
      const pnlBlock = blocks.filter((b) => b.type === 'pnl').pop();
      const pnl = pnlBlock && (pnlBlock.text.match(/-?\$-?[\d,]+(?:\.\d+)?/) || [])[0];
      entries.push({ title, blocks, tags, pnl });
    });
    return entries;
  }

  function renderTable(rows) {
    const [head, ...body] = rows;
    return `<details class="calls"><summary>API calls (${body.length})</summary>
      <div class="table-scroll"><table>
        <thead><tr>${head.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div></details>`;
  }

  // Tabs (2026-11-03): entries titled "H:MM CT (dry run, S&P 201-300)" or "(..., Nasdaq 100)" go in their own tab.
  const TABS = ['S&P 201-300', 'Nasdaq 100'];
  let tab = null;
  function tabOf(e) { return TABS.find((t) => e.title.includes(t)) || 'Other'; }

  // Top-10 tabs (2026-11-03): logs/lists/<date>.json from the 7:30 AM picker.
  const LIST_TAB = (name) => 'Top 10: ' + name;

  // Options tabs (2026-11-10): logs/options/<date>.json. User asked for two tabs, near term and long term expiry,
  // sorted by the calls-to-puts ratio, with no 10/20-day average filter. Robinhood's scanner can only split by
  // expiry for dollar premium (up to 7 days out), so near = expiring within 7 days, long = everything later.
  const OPT_TABS = { 'Options: near term': 'near', 'Options: long term': 'long' };
  let optTime = null;

  function renderTextDay(date, all, lists, opts) {
    const names = [...TABS, 'Other'].filter((t) => all.some((e) => tabOf(e) === t));
    const listNames = lists ? Object.keys(lists.lists || {}).map(LIST_TAB) : [];
    const optNames = opts && (opts.snapshots || []).length ? Object.keys(OPT_TABS) : [];
    if (!listNames.length && !optNames.length && names.length < 2 && names[0] === 'Other') { renderEntries(date, all, ''); return; }
    const allNames = [...names, ...listNames, ...optNames];
    if (tab === 'Options') tab = optNames[0];
    if (!allNames.includes(tab)) tab = allNames[0];
    const tabBar = `<div class="tabs" role="tablist">${allNames.map((t) => {
      const es = all.filter((e) => tabOf(e) === t);
      const p = [...es].reverse().find((e) => e.pnl)?.pnl;
      return `<button role="tab" aria-selected="${t === tab}" data-tab="${esc(t)}" class="${t === tab ? 'on' : ''}">${esc(t === 'Other' ? 'Main bot' : t)}${p ? ` <span class="${pnlClass(p)}">${esc(p)}</span>` : ''}</button>`;
    }).join('')}</div>`;
    if (OPT_TABS[tab]) renderOptions(date, opts, OPT_TABS[tab], tabBar, () => renderTextDay(date, all, lists, opts));
    else if (listNames.includes(tab)) renderList(date, lists, tab.replace('Top 10: ', ''), tabBar);
    else renderEntries(date, all.filter((e) => tabOf(e) === tab), tabBar);
    viewEl.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      tab = b.dataset.tab;
      renderTextDay(date, all, lists, opts);
    }));
  }

  const int = (n) => (n == null ? '–' : Number(n).toLocaleString());
  const usd = (n) => (n == null ? '–' : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);
  // Highest calls-to-puts first; calls with no puts at the very top, no trades at the bottom.
  const ratioKey = (x) => (!x || (!x.call_premium && !x.put_premium) ? -2 : x.put_premium ? x.ratio : x.call_premium ? Infinity : -1);

  function renderOptions(date, opts, term, tabBar, rerender) {
    const snaps = opts.snapshots.filter((s) => s.rows.some((r) => r[term]));
    const label = (s) => s.label === 'close' ? 'Close' : `${s.time} CT`;
    const head = `<h1>${esc(fmtDate(date))}</h1>${tabBar}
      <p class="muted">${term === 'near' ? 'Options expiring within 7 days' : 'Options expiring more than 7 days out'}, from Robinhood's options scanner, for today's list stocks and anything the bot holds. Sorted by calls to puts, measured in dollars traded (Robinhood splits only dollars, not contracts, by expiry). Every stock is shown, with no volume or average filter. The last three columns count contracts across all expiries, since Robinhood only splits dollars by expiry.</p>`;
    if (!snaps.length) { viewEl.innerHTML = `${head}<p class="empty">No near / long term split was recorded for this day (it started with the Nov 10 close).</p>`; return; }
    if (!snaps.some((s) => label(s) === optTime)) optTime = label(snaps[snaps.length - 1]);
    const snap = snaps.find((s) => label(s) === optTime);
    const rows = [...snap.rows].sort((a, b) => ratioKey(b[term]) - ratioKey(a[term]) || ((b[term]?.call_premium || 0) - (a[term]?.call_premium || 0)));
    viewEl.innerHTML = `${head}
      <div class="filters" role="group" aria-label="Snapshot time">
        ${snaps.map((s) => `<button data-opt="${esc(label(s))}" class="${label(s) === optTime ? 'on' : ''}">${esc(label(s))}</button>`).join('')}
      </div>
      <div class="table-scroll"><table class="toplist options">
        <thead><tr><th>Stock</th><th>List</th><th class="num">Price</th><th class="num">Calls $</th><th class="num">Puts $</th><th class="num">Calls / puts</th><th class="num" title="All expiries">Calls (contracts)</th><th class="num" title="All expiries">Puts (contracts)</th><th class="num" title="All expiries">Contract ratio</th></tr></thead>
        <tbody>${rows.map((r) => {
          const x = r[term] || {};
          const ratio = !x.call_premium && !x.put_premium ? '<span class="muted">no trades</span>'
            : !x.put_premium ? '<span class="pos">calls only</span>'
            : `<span class="${x.ratio >= 2 ? 'pos' : x.ratio <= 0.67 ? 'neg' : ''}">${Number(x.ratio).toFixed(2)}</span>`;
          return `<tr><td class="symbol">${esc(r.symbol)}</td><td>${esc((r.lists || []).join(', ') || 'held')}</td>
            <td class="num">${money(r.last)}${r.pct_change != null ? ` <span class="${r.pct_change >= 0 ? 'pos' : 'neg'}">${r.pct_change > 0 ? '+' : ''}${Number(r.pct_change).toFixed(1)}%</span>` : ''}</td>
            <td class="num">${usd(x.call_premium)}</td><td class="num">${usd(x.put_premium)}</td><td class="num">${ratio}</td>
            <td class="num">${int(r.call_vol)}</td><td class="num">${int(r.put_vol)}</td>
            <td class="num">${r.calls_to_puts == null ? (r.call_vol ? '<span class="pos">calls only</span>' : '–') : `<span class="${r.calls_to_puts >= 2 ? 'pos' : r.calls_to_puts <= 0.67 ? 'neg' : ''}">${Number(r.calls_to_puts).toFixed(2)}</span>`}</td></tr>`;
        }).join('')}</tbody>
      </table></div>
      <p class="muted">Green: calls at least 2x puts. Red: puts at least 1.5x calls. For information only; it does not change any trades.</p>`;
    viewEl.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => { optTime = b.dataset.opt; rerender(); }));
  }

  function renderList(date, lists, name, tabBar) {
    const L = lists.lists[name];
    viewEl.innerHTML = `
      <h1>${esc(fmtDate(date))}</h1>
      ${tabBar}
      <p class="muted">The ${esc(name)} stocks the bot may buy today. Each morning it takes the 20 stocks with the highest 20-day average ADX, then keeps the 10 with the biggest 20-day price gain. Data through ${esc(L.data_through)}; ${esc(L.stocks_ranked)} stocks ranked.</p>
      <div class="table-scroll"><table class="toplist">
        <thead><tr><th>#</th><th>Stock</th><th class="num">20-day avg ADX</th><th class="num">20-day gain</th></tr></thead>
        <tbody>${L.top10.map((r) => `<tr><td>${r.rank}</td><td class="symbol">${esc(r.symbol)}</td><td class="num">${Number(r.adx20).toFixed(1)}</td><td class="num ${r.mom20_pct >= 0 ? 'pos' : 'neg'}">${r.mom20_pct > 0 ? '+' : ''}${Number(r.mom20_pct).toFixed(1)}%</td></tr>`).join('')}</tbody>
      </table></div>`;
  }

  function renderEntries(date, entries, tabBar) {
    if (!entries.length) { viewEl.innerHTML = `<h1>${esc(fmtDate(date))}</h1>${tabBar}<p class="empty">No updates yet.</p>`; return; }
    const last = entries[entries.length - 1];
    const pnl = [...entries].reverse().find((e) => e.pnl)?.pnl;
    const count = (k) => entries.filter((e) => e.tags.some((t) => t[0] === k)).length;
    viewEl.innerHTML = `
      <h1>${esc(fmtDate(date))}</h1>
      ${tabBar}
      <p class="muted">${entries.length} update${entries.length === 1 ? '' : 's'}, newest first</p>
      <div class="summary">
        ${pnl ? `<div class="stat"><div class="label">Realized P/L</div><div class="value ${pnlClass(pnl)}">${esc(pnl)}</div></div>` : ''}
        <div class="stat"><div class="label">Last update</div><div class="value">${esc((last.title || '–').replace(/\s*\(.*\)$/, ''))}</div></div>
        <div class="stat"><div class="label">Sells</div><div class="value">${count('SELL')}</div></div>
        <div class="stat"><div class="label">Buy orders</div><div class="value">${count('ORDER') + count('BUY')}</div></div>
      </div>
      ${[...entries].reverse().map((e) => `
        <article class="trade">
          <div class="trade-head">
            ${e.title ? `<span class="symbol">${esc(e.title)}</span>` : ''}
            ${e.tags.map(([k, label]) => `<span class="badge ${k}">${esc(label)}</span>`).join('')}
          </div>
          ${e.blocks.map((b) => b.type === 'table' ? renderTable(b.rows)
            : b.type === 'pnl' ? `<p class="day-pnl">${esc(b.text)}</p>`
            : `<p class="${b.type}">${esc(b.text)}</p>`).join('')}
        </article>`).join('')}
    `;
  }

  async function show(date) {
    if (!date) return;
    markActive(date);
    current = date;
    viewEl.innerHTML = '<p class="muted">Loading…</p>';
    try {
      const day = days.find((d) => d.date === date) || {};
      const lists = day.lists ? await getJSON(`logs/${day.lists}`).catch(() => null) : null;
      const opts = day.options ? await getJSON(`logs/${day.options}`).catch(() => null) : null;
      const file = day.file === undefined ? `${date}.json` : day.file;
      if (!file || !file.endsWith('.json')) {
        let text = '';
        if (file) {
          const res = await fetchLog(`logs/${encodeURIComponent(file)}`);
          if (!res.ok) throw new Error(res.status);
          text = await res.text();
        }
        if (current !== date) return;
        const entries = parseText(text);
        if (!entries.length && !lists && !opts) throw new Error('empty');
        renderTextDay(date, entries, lists, opts);
        return;
      }
      const data = await getJSON(`logs/${encodeURIComponent(file)}`);
      if (current !== date) return;
      const raw = Array.isArray(data) ? data : (data.trades || []);
      const trades = raw.map(normalize).sort((a, b) => String(a.time).localeCompare(String(b.time)));
      renderDay(date, trades);
    } catch (e) {
      viewEl.innerHTML = `<p class="empty">Couldn't load the log for ${esc(date)}.</p>`;
    }
  }

  function route() {
    const want = decodeURIComponent(location.hash.slice(1));
    const date = days.some((d) => d.date === want) ? want : days[0]?.date;
    show(date);
  }

  async function init() {
    try {
      const idx = await getJSON('logs/index.json');
      days = (idx.days || idx).slice().sort((a, b) => b.date.localeCompare(a.date));
    } catch (e) {
      viewEl.innerHTML = '<p class="empty">No logs found yet.</p>';
      return;
    }
    if (!days.length) { viewEl.innerHTML = '<p class="empty">No logs published yet.</p>'; return; }
    renderDayList();
    selectEl.addEventListener('change', () => { location.hash = selectEl.value; });
    window.addEventListener('hashchange', route);
    route();
  }

  init();
})();

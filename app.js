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

  async function getJSON(path) {
    const res = await fetch(path, { cache: 'no-store' });
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
      `<li><a href="#${esc(d.date)}" data-date="${esc(d.date)}">${esc(d.date)}<span class="count ${pnlClass(d.pnl)}">${esc(d.pnl ?? d.entries ?? d.trades ?? '')}</span></a></li>`
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
      if (/\bbought \d+/i.test(prose)) tags.push(['BUY', 'Bought']);
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

  function renderTextDay(date, entries) {
    const last = entries[entries.length - 1];
    const pnl = [...entries].reverse().find((e) => e.pnl)?.pnl;
    const count = (k) => entries.filter((e) => e.tags.some((t) => t[0] === k)).length;
    viewEl.innerHTML = `
      <h1>${esc(fmtDate(date))}</h1>
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
      const file = days.find((d) => d.date === date)?.file || `${date}.json`;
      if (!file.endsWith('.json')) {
        const res = await fetch(`logs/${encodeURIComponent(file)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(res.status);
        const text = await res.text();
        if (current !== date) return;
        renderTextDay(date, parseText(text));
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

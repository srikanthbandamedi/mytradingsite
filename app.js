// Reads logs/index.json (list of days) and logs/<date>.json (one day's trades).
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
      `<li><a href="#${esc(d.date)}" data-date="${esc(d.date)}">${esc(d.date)}<span class="count">${d.trades ?? ''}</span></a></li>`
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

  async function show(date) {
    if (!date) return;
    markActive(date);
    current = date;
    viewEl.innerHTML = '<p class="muted">Loading…</p>';
    try {
      const data = await getJSON(`logs/${encodeURIComponent(date)}.json`);
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

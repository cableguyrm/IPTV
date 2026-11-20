'use strict';

/* =========================================================================
   StockStart front-end
   - PracticeBroker: a pretend market that runs in your browser
   - AlpacaBroker:   talks to the local server, which talks to Alpaca
   Both expose the same methods, so the screens don't care which one is used.
   ========================================================================= */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) =>
  n == null || Number.isNaN(n) ? '—' : (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signedMoney = (n) => (n > 0 ? '+' : '') + money(n);
const pct = (n) => (n == null || !Number.isFinite(n) ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(2) + '%');
const shares = (n) => {
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toLocaleString('en-US', { maximumFractionDigits: 6 });
};
const cls = (n) => (n > 0 ? 'up' : n < 0 ? 'down' : '');
const round6 = (n) => Math.round(n * 1e6) / 1e6;

const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem('stockstart.' + k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('stockstart.' + k, JSON.stringify(v));
    } catch {
      /* storage unavailable: keep going in memory */
    }
  },
};

async function api(path, { method = 'GET', body } = {}) {
  const r = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-StockStart': '1' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
}

/* ------------------------------------------------------------------------
   Practice broker (pretend prices, pretend money)
   ------------------------------------------------------------------------ */

const PRACTICE_STOCKS = {
  SPY: { name: 'S&P 500 index fund (500 big US companies)', price: 560, vol: 0.0015 },
  AAPL: { name: 'Apple', price: 190, vol: 0.003 },
  MSFT: { name: 'Microsoft', price: 420, vol: 0.003 },
  GOOGL: { name: 'Alphabet (Google)', price: 170, vol: 0.0035 },
  AMZN: { name: 'Amazon', price: 185, vol: 0.0035 },
  NVDA: { name: 'NVIDIA', price: 120, vol: 0.006 },
  TSLA: { name: 'Tesla', price: 240, vol: 0.008 },
  KO: { name: 'Coca-Cola', price: 62, vol: 0.0015 },
  DIS: { name: 'Disney', price: 95, vol: 0.003 },
  NKE: { name: 'Nike', price: 80, vol: 0.003 },
};
const PRACTICE_START_CASH = 10000;
const TICK_MS = 2000;
const HISTORY_LEN = 240;

function gauss() {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

class PracticeBroker {
  constructor() {
    this.mode = 'practice';
    this.listeners = new Set();
    this.load();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  freshState() {
    return { cash: PRACTICE_START_CASH, positions: {}, orders: [], realized: 0, startValue: PRACTICE_START_CASH, nextId: 1 };
  }

  load() {
    this.state = store.get('practice', null) || this.freshState();
    const saved = store.get('practicePrices', {});
    this.prices = {};
    this.hist = {};
    const now = Date.now();
    for (const [sym, info] of Object.entries(PRACTICE_STOCKS)) {
      // Build some made-up history that ends at the current price.
      let p = saved[sym] || info.price;
      const hist = [];
      for (let i = 0; i < HISTORY_LEN; i++) {
        hist.push({ t: now - i * TICK_MS, p });
        p = p / (1 + info.vol * gauss());
      }
      this.hist[sym] = hist.reverse();
      this.prices[sym] = this.hist[sym][HISTORY_LEN - 1].p;
    }
  }

  save() {
    store.set('practice', this.state);
    store.set('practicePrices', this.prices);
  }

  reset() {
    this.state = this.freshState();
    store.set('practicePrices', {});
    this.load();
    this.save();
    this.emit();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit() {
    this.listeners.forEach((fn) => fn());
  }

  tick() {
    const now = Date.now();
    for (const [sym, info] of Object.entries(PRACTICE_STOCKS)) {
      // Random walk with a tiny pull back toward the starting price so it doesn't drift forever.
      const p = this.prices[sym];
      const pull = ((info.price - p) / info.price) * 0.002;
      const next = Math.max(1, p * (1 + 0.00005 + pull + info.vol * gauss()));
      this.prices[sym] = next;
      this.hist[sym].push({ t: now, p: next });
      if (this.hist[sym].length > HISTORY_LEN) this.hist[sym].shift();
    }
    this.processOpenOrders();
    this.save();
    this.emit();
  }

  requireSymbol(sym) {
    if (!PRACTICE_STOCKS[sym]) {
      throw new Error(`Practice mode has these pretend stocks: ${Object.keys(PRACTICE_STOCKS).join(', ')}. Switch to Paper mode to look up any real stock.`);
    }
  }

  symbols() {
    return Object.keys(PRACTICE_STOCKS);
  }

  async clock() {
    return { is_open: true };
  }

  async quote(sym) {
    this.requireSymbol(sym);
    return { symbol: sym, name: PRACTICE_STOCKS[sym].name, price: this.prices[sym], prevClose: this.hist[sym][0].p, tradable: true, fractionable: true };
  }

  async history(sym) {
    this.requireSymbol(sym);
    return this.hist[sym].map((h) => ({ t: h.t, p: h.p }));
  }

  async positions() {
    return Object.entries(this.state.positions).map(([symbol, pos]) => {
      const price = this.prices[symbol];
      const value = pos.qty * price;
      const cost = pos.qty * pos.avgCost;
      return { symbol, qty: pos.qty, avgCost: pos.avgCost, price, value, pl: value - cost, plPct: cost ? ((value - cost) / cost) * 100 : 0 };
    });
  }

  async account() {
    const pos = await this.positions();
    const invested = pos.reduce((s, p) => s + p.value, 0);
    const equity = this.state.cash + invested;
    return { cash: this.state.cash, buyingPower: this.state.cash, equity, invested, baseline: this.state.startValue, baselineLabel: 'since you started', realized: this.state.realized };
  }

  async orders() {
    return this.state.orders.slice().reverse();
  }

  committedSellQty(sym) {
    return this.state.orders.filter((o) => o.status === 'open' && o.side === 'sell' && o.symbol === sym).reduce((s, o) => s + o.qty, 0);
  }

  async placeOrder(o) {
    const sym = o.symbol;
    this.requireSymbol(sym);
    const qty = round6(Number(o.qty));
    if (!(qty > 0)) throw new Error('Number of shares must be more than 0.');
    if (o.type !== 'market' && !Number.isInteger(qty)) throw new Error('Fractional (partial) shares only work with market orders. Use a whole number of shares.');
    const price = this.prices[sym];
    const owned = this.state.positions[sym] ? this.state.positions[sym].qty : 0;
    if (o.side === 'sell' && qty > round6(owned - this.committedSellQty(sym))) {
      throw new Error(`You can only sell shares you own. You have ${shares(owned)} ${sym}` + (this.committedSellQty(sym) ? ` (and ${shares(this.committedSellQty(sym))} are already in waiting sell orders).` : '.'));
    }
    if (o.side === 'buy') {
      const est = qty * (o.type === 'limit' ? Math.min(o.limit_price, price) : price);
      if (est > this.state.cash + 1e-9) throw new Error(`Not enough cash. This costs about ${money(est)} and you have ${money(this.state.cash)}.`);
    }
    const order = {
      id: 'p' + this.state.nextId++,
      symbol: sym,
      side: o.side,
      type: o.type,
      qty,
      limitPrice: o.type === 'limit' ? Number(o.limit_price) : null,
      stopPrice: o.type === 'stop' ? Number(o.stop_price) : null,
      tif: o.time_in_force || 'day',
      status: 'open',
      time: Date.now(),
    };
    this.state.orders.push(order);
    if (o.type === 'market') this.fill(order, price);
    else this.processOpenOrders();
    this.save();
    this.emit();
    return order;
  }

  processOpenOrders() {
    const today = new Date().toDateString();
    for (const o of this.state.orders) {
      if (o.status !== 'open') continue;
      if (o.tif === 'day' && new Date(o.time).toDateString() !== today) {
        o.status = 'expired';
        o.reason = 'It was a "today only" order and the day ended';
        continue;
      }
      const p = this.prices[o.symbol];
      if (o.type === 'limit' && o.side === 'buy' && p <= o.limitPrice) this.fill(o, p);
      else if (o.type === 'limit' && o.side === 'sell' && p >= o.limitPrice) this.fill(o, p);
      else if (o.type === 'stop' && p <= o.stopPrice) this.fill(o, p);
    }
  }

  fill(o, price) {
    const s = this.state;
    if (o.side === 'buy') {
      const cost = o.qty * price;
      if (cost > s.cash + 1e-9) {
        o.status = 'rejected';
        o.reason = 'Not enough cash when the price was reached';
        return;
      }
      s.cash -= cost;
      const pos = s.positions[o.symbol] || { qty: 0, avgCost: 0 };
      pos.avgCost = (pos.qty * pos.avgCost + cost) / (pos.qty + o.qty);
      pos.qty = round6(pos.qty + o.qty);
      s.positions[o.symbol] = pos;
    } else {
      const pos = s.positions[o.symbol];
      if (!pos || pos.qty + 1e-9 < o.qty) {
        o.status = 'rejected';
        o.reason = "You didn't own enough shares any more";
        return;
      }
      s.cash += o.qty * price;
      s.realized += (price - pos.avgCost) * o.qty;
      o.realized = (price - pos.avgCost) * o.qty;
      pos.qty = round6(pos.qty - o.qty);
      if (pos.qty <= 1e-9) delete s.positions[o.symbol];
    }
    o.status = 'filled';
    o.filledPrice = price;
    o.filledQty = o.qty;
    o.filledTime = Date.now();
  }

  async cancelOrder(id) {
    const o = this.state.orders.find((x) => x.id === id);
    if (o && o.status === 'open') o.status = 'canceled';
    this.save();
    this.emit();
  }
}

/* ------------------------------------------------------------------------
   Alpaca broker (paper = real prices/pretend money, live = real money)
   ------------------------------------------------------------------------ */

const REAL_PICKS = ['SPY', 'VOO', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'KO', 'DIS', 'NKE'];

class AlpacaBroker {
  constructor(mode) {
    this.mode = mode;
    this.assetCache = {};
  }
  onChange() {
    return () => {};
  }
  symbols() {
    return REAL_PICKS;
  }
  clock() {
    return api(`/${this.mode}/clock`);
  }
  async quote(sym) {
    const [q, asset] = await Promise.all([api(`/${this.mode}/quote/${sym}`), this.asset(sym)]);
    return { symbol: sym, name: asset.name, price: q.price, prevClose: q.prevClose, tradable: asset.tradable, fractionable: asset.fractionable };
  }
  async asset(sym) {
    if (!this.assetCache[sym]) this.assetCache[sym] = await api(`/${this.mode}/asset/${sym}`);
    return this.assetCache[sym];
  }
  async history(sym) {
    const bars = await api(`/${this.mode}/bars/${sym}`);
    return bars.map((b) => ({ t: Date.parse(b.t), p: b.c }));
  }
  async positions() {
    const list = await api(`/${this.mode}/positions`);
    return list.map((p) => ({
      symbol: p.symbol,
      qty: Number(p.qty),
      avgCost: Number(p.avg_entry_price),
      price: Number(p.current_price),
      value: Number(p.market_value),
      pl: Number(p.unrealized_pl),
      plPct: Number(p.unrealized_plpc) * 100,
    }));
  }
  async account() {
    const a = await api(`/${this.mode}/account`);
    const equity = Number(a.equity);
    const cash = Number(a.cash);
    return {
      cash,
      buyingPower: Number(a.buying_power),
      equity,
      invested: Number(a.long_market_value || 0),
      baseline: Number(a.last_equity),
      baselineLabel: 'today',
      status: a.status,
      blocked: a.trading_blocked || a.account_blocked,
    };
  }
  async orders() {
    const list = await api(`/${this.mode}/orders`);
    return list.map((o) => ({
      id: o.id,
      symbol: o.symbol,
      side: o.side,
      type: o.type,
      qty: Number(o.qty),
      filledQty: Number(o.filled_qty),
      filledPrice: o.filled_avg_price ? Number(o.filled_avg_price) : null,
      limitPrice: o.limit_price ? Number(o.limit_price) : null,
      stopPrice: o.stop_price ? Number(o.stop_price) : null,
      tif: o.time_in_force,
      status: o.status,
      time: Date.parse(o.submitted_at || o.created_at),
    }));
  }
  placeOrder(o) {
    return api(`/${this.mode}/orders`, { method: 'POST', body: o });
  }
  cancelOrder(id) {
    return api(`/${this.mode}/orders/${id}`, { method: 'DELETE' });
  }
}

/* ------------------------------------------------------------------------
   App state & mode switching
   ------------------------------------------------------------------------ */

const MODES = {
  practice: { label: 'Practice', banner: '🟢 PRACTICE MODE · pretend money, pretend prices. Experiment freely!' },
  paper: { label: 'Paper', banner: '🔵 PAPER MODE · real market prices, pretend money' },
  live: { label: 'Live', banner: '🔴 LIVE MODE · REAL MONEY · every order uses your actual funds' },
};

const app = {
  mode: 'practice',
  broker: null,
  practice: null,
  status: { paper: {}, live: {} },
  tab: store.get('tab', 'learn'),
  symbol: 'AAPL',
  side: 'buy',
  quote: null,
  position: null,
  account: null,
  liveUnlocked: false,
  unsub: null,
  pollTimer: null,
  busy: false,
};

async function loadStatus() {
  try {
    app.status = await api('/status');
  } catch {
    app.status = { paper: {}, live: {}, maxLiveOrderUsd: 500 };
  }
  for (const m of ['paper', 'live']) {
    const pill = $(`#${m}-status`);
    pill.textContent = app.status[m].configured ? `✓ Saved (${app.status[m].keyHint})` : 'Not set up';
    pill.classList.toggle('ok', Boolean(app.status[m].configured));
  }
  $('#max-live').value = app.status.maxLiveOrderUsd || 500;
}

async function setMode(mode, { force = false } = {}) {
  if (mode !== 'practice' && !force) {
    if (!app.status[mode] || !app.status[mode].configured) {
      toast(`To use ${MODES[mode].label} mode, first add your ${mode} API keys on the Settings tab.`, 'error');
      setTab('settings');
      return;
    }
    if (mode === 'live' && !app.liveUnlocked) {
      const ok = await modal({
        title: '🔴 Switch to LIVE trading?',
        html: `<p>Live mode uses <b>real money</b> from your Alpaca brokerage account. Losses are real.</p>
               <p>Each buy is limited to <b>${money(app.status.maxLiveOrderUsd)}</b> (change this in Settings).</p>
               <label for="live-type">Type <b>REAL MONEY</b> to continue:</label>
               <input id="live-type" autocomplete="off">`,
        okText: 'Switch to Live',
        danger: true,
        validate: () => $('#live-type').value.trim().toUpperCase() === 'REAL MONEY' || 'Please type REAL MONEY exactly.',
      });
      if (!ok) return;
      app.liveUnlocked = true;
    }
  }
  app.mode = mode;
  store.set('mode', mode === 'live' ? 'practice' : mode); // never re-open straight into live mode
  if (app.unsub) app.unsub();
  if (mode === 'practice') {
    app.practice = app.practice || new PracticeBroker();
    app.broker = app.practice;
  } else {
    app.broker = new AlpacaBroker(mode);
  }
  document.body.dataset.mode = mode;
  $('#banner').textContent = MODES[mode].banner;
  $$('.mode-switch button').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === mode);
    b.setAttribute('aria-checked', b.dataset.mode === mode);
  });
  renderQuickPicks();
  if (!app.broker.symbols().includes(app.symbol) && mode === 'practice') app.symbol = 'AAPL';
  app.unsub = app.broker.onChange(() => refresh({ light: true }));
  clearInterval(app.pollTimer);
  if (mode !== 'practice') app.pollTimer = setInterval(() => refresh({ light: true }), 10000);
  await selectSymbol(app.symbol);
  refresh();
}

function setTab(tab) {
  app.tab = tab;
  store.set('tab', tab);
  $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.tab').forEach((s) => s.classList.toggle('active', s.id === 'tab-' + tab));
  if (tab === 'trade') requestAnimationFrame(drawChart);
  refresh();
}

async function refresh({ light = false } = {}) {
  if (!app.broker) return;
  try {
    if (app.tab === 'trade') await refreshTrade(light);
    else if (app.tab === 'portfolio') await renderPortfolio();
    else if (app.tab === 'orders') await renderOrders();
  } catch (e) {
    if (!light) toast(e.message, 'error');
  }
}

/* ------------------------------------------------------------------------
   Trade tab
   ------------------------------------------------------------------------ */

let chartPoints = [];

function renderQuickPicks() {
  $('#quick-picks').innerHTML =
    '<span class="muted small" style="align-self:center">Popular:</span>' +
    app.broker
      .symbols()
      .map((s) => `<button type="button" data-sym="${s}" class="${s === app.symbol ? 'active' : ''}">${s}</button>`)
      .join('');
}

async function selectSymbol(sym) {
  sym = String(sym || '').trim().toUpperCase();
  if (!sym) return;
  app.symbol = sym;
  $('#symbol-input').value = sym;
  $$('#quick-picks button').forEach((b) => b.classList.toggle('active', b.dataset.sym === sym));
  app.quote = null;
  chartPoints = [];
  $('#quote').innerHTML = '<p class="muted">Loading…</p>';
  drawChart();
  try {
    const [q, hist] = await Promise.all([app.broker.quote(sym), app.broker.history(sym)]);
    if (app.symbol !== sym) return;
    app.quote = q;
    chartPoints = hist;
    $('#chart-caption').textContent =
      app.mode === 'practice' ? 'Price over the last few minutes (simulated, updates every 2 seconds).' : 'Daily closing price over roughly the last 6 months.';
    await refreshTrade(false);
  } catch (e) {
    app.quote = null;
    $('#quote').innerHTML = `<p class="down">${esc(e.message)}</p>`;
    $('#chart-caption').textContent = '';
    updateSummary();
  }
}

async function refreshTrade(light) {
  if (app.quote) {
    if (app.mode === 'practice') {
      app.quote = await app.broker.quote(app.symbol);
      chartPoints = await app.broker.history(app.symbol);
    } else if (light) {
      const q = await app.broker.quote(app.symbol);
      app.quote = q;
    }
  }
  const [positions, account, clock] = await Promise.all([app.broker.positions(), app.broker.account(), light && app.mode === 'practice' ? null : app.broker.clock()]);
  app.account = account;
  app.position = positions.find((p) => p.symbol === app.symbol) || null;
  if (clock) renderMarketStatus(clock, account);
  renderQuote();
  drawChart();
  updateSummary();
}

function renderMarketStatus(clock, account) {
  const el = $('#market-status');
  el.className = 'notice';
  if (app.mode === 'practice') {
    el.innerHTML = '🟢 The practice market is always open.';
  } else if (account && account.blocked) {
    el.classList.add('warn');
    el.innerHTML = '⚠️ Alpaca says trading is blocked on this account. Check your Alpaca dashboard.';
  } else if (clock.is_open) {
    el.innerHTML = '🟢 The US stock market is <b>open</b> now.';
  } else {
    el.classList.add('warn');
    const next = clock.next_open ? new Date(clock.next_open).toLocaleString([], { weekday: 'long', hour: 'numeric', minute: '2-digit' }) : 'the next trading day';
    el.innerHTML = `🌙 The US stock market is <b>closed</b> now. It opens ${esc(next)} (your time). Orders you place now will wait until then. Prices shown are the latest available.`;
  }
}

function renderQuote() {
  const q = app.quote;
  if (!q) return;
  const chg = q.prevClose ? q.price - q.prevClose : null;
  const chgPct = q.prevClose ? (chg / q.prevClose) * 100 : null;
  const since = app.mode === 'practice' ? 'on the chart' : 'today';
  const pos = app.position;
  $('#quote').innerHTML = `
    <div class="sym">${esc(q.symbol)} · ${esc(q.name || '')}</div>
    <div class="price">${money(q.price)}</div>
    <div class="chg ${cls(chg)}">${chg == null ? '' : `${signedMoney(chg)} (${pct(chgPct)}) ${since}`}</div>
    <div class="owned small muted">${
      pos ? `You own <b>${shares(pos.qty)}</b> shares, worth ${money(pos.value)} (<span class="${cls(pos.pl)}">${signedMoney(pos.pl)}</span>).` : "You don't own any of this stock yet."
    } Price is for <b>one</b> share.</div>
    ${q.tradable === false ? '<p class="down">This one can\'t be traded through Alpaca.</p>' : ''}`;
}

function drawChart() {
  const canvas = $('#chart');
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = rect.width;
  const H = rect.height;
  ctx.clearRect(0, 0, W, H);
  const css = getComputedStyle(document.body);
  const muted = css.getPropertyValue('--muted').trim();
  const lineCol = css.getPropertyValue('--line').trim();
  if (chartPoints.length < 2) {
    ctx.fillStyle = muted;
    ctx.font = '14px system-ui';
    ctx.fillText(app.quote ? 'Not enough price history to draw a chart.' : '', 10, H / 2);
    return;
  }
  const ps = chartPoints.map((x) => x.p);
  let min = Math.min(...ps);
  let max = Math.max(...ps);
  if (max === min) {
    max += 1;
    min -= 1;
  }
  const padL = 8;
  const padR = 70;
  const padT = 12;
  const padB = 22;
  const x = (i) => padL + (i / (ps.length - 1)) * (W - padL - padR);
  const y = (p) => padT + (1 - (p - min) / (max - min)) * (H - padT - padB);
  const up = ps[ps.length - 1] >= ps[0];
  const col = css.getPropertyValue(up ? '--up' : '--down').trim();

  // grid + labels
  ctx.strokeStyle = lineCol;
  ctx.fillStyle = muted;
  ctx.font = '12px system-ui';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const v = min + ((max - min) * i) / 3;
    const yy = y(v);
    ctx.beginPath();
    ctx.moveTo(padL, yy);
    ctx.lineTo(W - padR, yy);
    ctx.stroke();
    ctx.fillText(money(v), W - padR + 6, yy + 4);
  }
  const fmtT = (t) => (app.mode === 'practice' ? new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }));
  ctx.fillText(fmtT(chartPoints[0].t), padL, H - 5);
  const lastLabel = app.mode === 'practice' ? 'now' : fmtT(chartPoints[chartPoints.length - 1].t);
  ctx.fillText(lastLabel, W - padR - ctx.measureText(lastLabel).width, H - 5);

  // area + line
  ctx.beginPath();
  ps.forEach((p, i) => (i ? ctx.lineTo(x(i), y(p)) : ctx.moveTo(x(i), y(p))));
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineTo(x(ps.length - 1), H - padB);
  ctx.lineTo(x(0), H - padB);
  ctx.closePath();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = col;
  ctx.fill();
  ctx.globalAlpha = 1;
}

const TYPE_HELP = {
  buy: {
    market: 'Buys right away at the best price available now. Simple and fast.',
    limit: 'Buys only if the price drops to your price (or lower). If it never gets there, nothing happens.',
  },
  sell: {
    market: 'Sells right away at the best price available now.',
    limit: 'Sells only if the price rises to your price (or higher). Good for locking in a target profit.',
    stop: 'A safety net: if the price falls to your stop price, your shares are sold automatically to limit the loss.',
  },
};

function orderFromForm() {
  return {
    symbol: app.symbol,
    side: app.side,
    qty: Number($('#qty').value),
    type: $('#order-type').value,
    price: Number($('#order-price').value),
    tif: $('#tif').value,
  };
}

function updateTicket() {
  $$('.side-toggle button').forEach((b) => b.classList.toggle('active', b.dataset.side === app.side));
  const typeSel = $('#order-type');
  const stopOpt = typeSel.querySelector('option[value="stop"]');
  stopOpt.hidden = app.side === 'buy';
  stopOpt.disabled = app.side === 'buy';
  if (app.side === 'buy' && typeSel.value === 'stop') typeSel.value = 'market';
  const type = typeSel.value;
  $('#type-help').textContent = TYPE_HELP[app.side][type];
  $('#price-row').hidden = type === 'market';
  $('#price-label').textContent = type === 'stop' ? 'Stop price (sell if it falls to this)' : app.side === 'buy' ? 'Limit price (the most you will pay per share)' : 'Limit price (the least you will accept per share)';
  const btn = $('#review-btn');
  btn.textContent = app.side === 'buy' ? 'Review buy order' : 'Review sell order';
  updateSummary();
}

function problemsWith(o) {
  const q = app.quote;
  if (!q || !q.price) return 'Pick a stock first.';
  if (!(o.qty > 0)) return 'Enter how many shares (more than 0).';
  if (o.type !== 'market' && !Number.isInteger(o.qty)) return 'Partial shares only work with Market orders. Use a whole number.';
  if (q.fractionable === false && !Number.isInteger(o.qty)) return 'This stock can only be traded in whole shares.';
  if (o.type !== 'market' && !(o.price > 0)) return 'Enter a price for this order type.';
  if (o.side === 'sell') {
    const owned = app.position ? app.position.qty : 0;
    if (owned <= 0) return `You don't own any ${o.symbol}, so there's nothing to sell. (This app doesn't allow "short selling".)`;
    if (o.qty > owned + 1e-9) return `You only own ${shares(owned)} shares of ${o.symbol}.`;
    if (o.type === 'stop' && o.price >= q.price) return 'A stop-loss price should be below the current price.';
  }
  if (o.side === 'buy' && app.account) {
    const est = o.qty * (o.type === 'limit' ? Math.min(o.price, q.price) : q.price);
    if (est > app.account.buyingPower + 1e-9) return `Not enough money: this costs about ${money(est)} and you can spend ${money(app.account.buyingPower)}.`;
    if (app.mode === 'live' && o.qty * Math.max(o.type === 'limit' ? o.price : 0, q.price) > app.status.maxLiveOrderUsd)
      return `Above your live safety limit of ${money(app.status.maxLiveOrderUsd)} per buy. Buy fewer shares or change the limit in Settings.`;
  }
  return null;
}

function describe(o) {
  const q = app.quote;
  const n = `<b>${shares(o.qty)}</b> share${o.qty === 1 ? '' : 's'} of <b>${esc(o.symbol)}</b>`;
  const wait = o.tif === 'gtc' ? 'It will keep waiting until it happens or you cancel it.' : 'If that doesn\'t happen today, the order is canceled automatically.';
  if (o.type === 'market') {
    const est = o.qty * q.price;
    if (o.side === 'buy') {
      return `You are about to <b>buy</b> ${n} right now at about ${money(q.price)} each, for about <b>${money(est)}</b> in total.` +
        (app.account ? ` You'd have about ${money(app.account.buyingPower - est)} left to spend.` : '');
    }
    const pl = app.position ? (q.price - app.position.avgCost) * o.qty : null;
    return `You are about to <b>sell</b> ${n} right now at about ${money(q.price)} each, getting about <b>${money(est)}</b>.` +
      (pl != null ? ` Compared to what you paid, that's a <span class="${cls(pl)}">${pl >= 0 ? 'gain' : 'loss'} of about ${money(Math.abs(pl))}</span>.` : '');
  }
  if (o.type === 'limit') {
    return o.side === 'buy'
      ? `You'll <b>buy</b> ${n} only if the price drops to <b>${money(o.price)}</b> or lower (now ${money(q.price)}). Max cost: <b>${money(o.qty * o.price)}</b>. ${wait}` +
          (o.price >= q.price ? ' <i>Your limit is at or above today\'s price, so it will probably happen right away.</i>' : '')
      : `You'll <b>sell</b> ${n} only if the price rises to <b>${money(o.price)}</b> or higher (now ${money(q.price)}). You'd get at least <b>${money(o.qty * o.price)}</b>. ${wait}` +
          (o.price <= q.price ? ' <i>Your limit is at or below today\'s price, so it will probably happen right away.</i>' : '');
  }
  return `If the price falls to <b>${money(o.price)}</b> (now ${money(q.price)}), ${n} will be <b>sold automatically</b> at the best price available then. In a fast drop, that can be a bit below ${money(o.price)}. ${wait}`;
}

function updateSummary() {
  const o = orderFromForm();
  const problem = problemsWith(o);
  const el = $('#order-summary');
  el.innerHTML = problem ? `<span class="err">${esc(problem)}</span>` : describe(o);
  $('#review-btn').disabled = Boolean(problem) || app.busy;
  const q = app.quote;
  $('#qty-hint').textContent = q && o.qty > 0 ? `${shares(o.qty)} × ${money(q.price)} ≈ ${money(o.qty * q.price)}` : '';
}

async function reviewOrder() {
  const o = orderFromForm();
  const problem = problemsWith(o);
  if (problem) return toast(problem, 'error');
  const live = app.mode === 'live';
  const ok = await modal({
    title: `${live ? '🔴 REAL MONEY · ' : ''}Confirm your ${o.side} order`,
    html:
      `<p>${describe(o)}</p>` +
      (app.mode === 'practice' ? '<p class="muted small">Practice mode: pretend money.</p>' : '') +
      (app.mode === 'paper' ? '<p class="muted small">Paper mode: real prices, pretend money.</p>' : '') +
      (live ? '<label class="confirm-check"><input type="checkbox" id="live-ok"> I understand this order uses my real money and can lose value.</label>' : ''),
    okText: `Confirm ${o.side}`,
    danger: live,
    validate: () => !live || $('#live-ok').checked || 'Tick the box to confirm this real-money order.',
  });
  if (!ok) return;
  app.busy = true;
  updateSummary();
  try {
    const body = { symbol: o.symbol, side: o.side, qty: o.qty, type: o.type, time_in_force: o.type === 'market' ? 'day' : o.tif };
    if (o.type === 'limit') body.limit_price = o.price;
    if (o.type === 'stop') body.stop_price = o.price;
    if (live) body.confirmLive = 'REAL MONEY';
    const res = await app.broker.placeOrder(body);
    const done = res.status === 'filled';
    toast(done ? `Done! Your order to ${o.side} ${shares(o.qty)} ${o.symbol} went through.` : `Order sent. Track it on the Orders tab.`, 'success');
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    app.busy = false;
    await refresh();
  }
}

/* ------------------------------------------------------------------------
   Portfolio & orders tabs
   ------------------------------------------------------------------------ */

function stat(label, value, hint, klass = '') {
  return `<div class="stat"><div class="label">${label}</div><div class="value ${klass}">${value}</div><div class="hint">${hint}</div></div>`;
}

async function renderPortfolio() {
  const [a, positions] = await Promise.all([app.broker.account(), app.broker.positions()]);
  const unreal = positions.reduce((s, p) => s + p.pl, 0);
  const change = a.equity - a.baseline;
  $('#account-cards').innerHTML =
    stat('Total account value', money(a.equity), 'cash + what your stocks are worth now') +
    stat('Cash', money(a.cash), 'money not invested yet') +
    stat('Invested', money(a.invested), 'current value of your stocks') +
    stat('Unrealized profit/loss', signedMoney(unreal), "on stocks you still own (not locked in until you sell)", cls(unreal)) +
    stat(`Change ${a.baselineLabel}`, signedMoney(change), a.baseline ? pct((change / a.baseline) * 100) : '', cls(change)) +
    (a.realized != null ? stat('Realized profit/loss', signedMoney(a.realized), 'locked in from stocks you sold', cls(a.realized)) : '');

  if (!positions.length) {
    $('#positions').innerHTML = `<div class="empty">You don't own any stocks yet.<br><button class="btn primary" data-goto="trade" style="margin-top:12px">Go to Trade and buy your first one</button></div>`;
    return;
  }
  $('#positions').innerHTML = `<div class="table-scroll"><table class="table">
    <thead><tr><th>Stock</th><th>Shares</th><th>Avg cost</th><th>Price now</th><th>Value</th><th>Profit/Loss</th><th></th></tr></thead>
    <tbody>${positions
      .map(
        (p) => `<tr>
        <td><button class="linkbtn" data-trade="${esc(p.symbol)}" data-side="buy">${esc(p.symbol)}</button></td>
        <td>${shares(p.qty)}</td><td>${money(p.avgCost)}</td><td>${money(p.price)}</td><td>${money(p.value)}</td>
        <td class="${cls(p.pl)}">${signedMoney(p.pl)} (${pct(p.plPct)})</td>
        <td><button class="btn small-btn" data-trade="${esc(p.symbol)}" data-side="sell">Sell</button></td></tr>`
      )
      .join('')}</tbody></table></div>`;
}

const STATUS_WORDS = {
  open: ['Waiting', ''],
  new: ['Waiting', ''],
  accepted: ['Waiting', ''],
  pending_new: ['Waiting', ''],
  accepted_for_bidding: ['Waiting', ''],
  held: ['Waiting', ''],
  partially_filled: ['Partly done', ''],
  filled: ['Done ✓', 'done'],
  done_for_day: ['Paused for today', ''],
  canceled: ['Canceled', ''],
  pending_cancel: ['Canceling…', ''],
  expired: ['Expired', ''],
  replaced: ['Replaced', ''],
  rejected: ['Rejected', 'bad'],
  suspended: ['Suspended', 'bad'],
};
const CANCELABLE = new Set(['open', 'new', 'accepted', 'pending_new', 'partially_filled', 'held', 'accepted_for_bidding', 'done_for_day']);

async function renderOrders() {
  const orders = await app.broker.orders();
  if (!orders.length) {
    $('#orders').innerHTML = '<div class="empty">No orders yet. Orders you place on the Trade tab show up here.</div>';
    return;
  }
  $('#orders').innerHTML = `<div class="table-scroll"><table class="table">
    <thead><tr><th>When</th><th>Order</th><th>Type</th><th>Status</th><th>Filled at</th><th></th></tr></thead>
    <tbody>${orders
      .map((o) => {
        const [word, k] = STATUS_WORDS[o.status] || [o.status, ''];
        const typeText =
          o.type === 'limit' ? `Limit ${money(o.limitPrice)}` : o.type === 'stop' ? `Stop-loss ${money(o.stopPrice)}` : o.type === 'market' ? 'Market' : esc(o.type);
        return `<tr>
          <td class="small">${new Date(o.time).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
          <td><b class="${o.side === 'buy' ? 'up' : 'down'}">${o.side === 'buy' ? 'Buy' : 'Sell'}</b> ${shares(o.qty)} ${esc(o.symbol)}</td>
          <td>${typeText}${o.tif === 'gtc' ? ' <span class="muted small">(until canceled)</span>' : ''}</td>
          <td><span class="status ${k}">${word}</span>${o.reason ? `<div class="small muted">${esc(o.reason)}</div>` : ''}</td>
          <td>${o.filledPrice ? money(o.filledPrice) : '—'}${o.realized != null ? ` <span class="small ${cls(o.realized)}">(${signedMoney(o.realized)})</span>` : ''}</td>
          <td>${CANCELABLE.has(o.status) ? `<button class="btn small-btn" data-cancel="${esc(o.id)}">Cancel</button>` : ''}</td></tr>`;
      })
      .join('')}</tbody></table></div>`;
}

/* ------------------------------------------------------------------------
   Learn tab (renders TUTORIAL.md)
   ------------------------------------------------------------------------ */

function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function markdown(src) {
  const lines = src.replace(/\r/g, '').split('\n');
  let out = '';
  let i = 0;
  const isBlock = (l) => /^(#{1,4}\s|>|\||\s*[-*]\s|\s*\d+\.\s|---+$)/.test(l);
  while (i < lines.length) {
    const l = lines[i];
    let m;
    if (!l.trim()) {
      i++;
    } else if ((m = l.match(/^(#{1,4})\s+(.*)/))) {
      out += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`;
      i++;
    } else if (/^---+$/.test(l)) {
      out += '<hr>';
      i++;
    } else if (l.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''));
      out += `<blockquote>${buf.filter(Boolean).map((b) => `<p>${inline(b)}</p>`).join('')}</blockquote>`;
    } else if (l.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
      const body = rows.slice(2).map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
      out += `<div class="table-scroll"><table><thead><tr>${cells(rows[0]).map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
    } else if (/^\s*[-*]\s/.test(l) || /^\s*\d+\.\s/.test(l)) {
      const ordered = /^\s*\d+\.\s/.test(l);
      const re = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
      const items = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, ''));
      const li = items
        .map((t) => {
          const c = t.match(/^\[( |x)\]\s+(.*)/);
          return c ? `<li class="check"><label><input type="checkbox" ${c[1] === 'x' ? 'checked' : ''}> ${inline(c[2])}</label></li>` : `<li>${inline(t)}</li>`;
        })
        .join('');
      out += ordered ? `<ol>${li}</ol>` : `<ul>${li}</ul>`;
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() && !isBlock(lines[i])) buf.push(lines[i++]);
      out += `<p>${inline(buf.join(' '))}</p>`;
    }
  }
  return out;
}

const learn = { lessons: [], current: store.get('lesson', 0), done: new Set(store.get('lessonsDone', [])) };

async function loadTutorial() {
  try {
    const r = await fetch('/tutorial.md');
    if (!r.ok) throw new Error();
    const text = await r.text();
    const parts = text.split(/^## /m);
    const intro = parts.shift();
    const title = (intro.match(/^# (.*)/m) || [, 'Start here'])[1];
    learn.lessons = [{ title: 'Start here', body: intro.replace(/^# .*\n/, `## ${title}\n`) }];
    for (const p of parts) {
      const nl = p.indexOf('\n');
      learn.lessons.push({ title: p.slice(0, nl).trim(), body: '## ' + p });
    }
  } catch {
    learn.lessons = [{ title: 'Tutorial', body: '## Tutorial\n\nCould not load the tutorial. Make sure you started the app with `node server.js`.' }];
  }
  if (learn.current >= learn.lessons.length) learn.current = 0;
  renderLesson();
}

function renderLesson() {
  const L = learn.lessons;
  $('#lesson-list').innerHTML = L.map(
    (l, i) => `<li><button data-lesson="${i}" class="${i === learn.current ? 'current' : ''}"><span class="tick">${learn.done.has(i) ? '✓' : ''}</span><span>${esc(l.title)}</span></button></li>`
  ).join('');
  $('#lesson-body').innerHTML = markdown(L[learn.current].body);
  const n = learn.done.size;
  $('#lesson-progress-bar').style.width = (n / L.length) * 100 + '%';
  $('#lesson-progress-text').textContent = `${n} of ${L.length} lessons done`;
  $('#lesson-prev').disabled = learn.current === 0;
  const last = learn.current === L.length - 1;
  $('#lesson-next').textContent = last ? (learn.done.has(learn.current) ? 'Go practice! →' : 'Mark done & start practicing →') : 'Mark done & next →';
}

function gotoLesson(i) {
  learn.current = Math.max(0, Math.min(learn.lessons.length - 1, i));
  store.set('lesson', learn.current);
  renderLesson();
  $('.lesson').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ------------------------------------------------------------------------
   Modal & toast
   ------------------------------------------------------------------------ */

function modal({ title, html, okText = 'OK', danger = false, validate }) {
  return new Promise((resolve) => {
    const m = $('#modal');
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = html;
    const ok = $('#modal-ok');
    ok.textContent = okText;
    ok.className = 'btn ' + (danger ? 'danger' : 'primary');
    m.hidden = false;
    const first = $('#modal-body input');
    (first || ok).focus();
    const close = (val) => {
      m.hidden = true;
      ok.onclick = null;
      $('#modal-cancel').onclick = null;
      m.onkeydown = null;
      resolve(val);
    };
    ok.onclick = () => {
      const v = validate ? validate() : true;
      if (v !== true) return toast(v, 'error');
      close(true);
    };
    $('#modal-cancel').onclick = () => close(false);
    m.onkeydown = (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') ok.click();
    };
  });
}

let toastTimer;
function toast(msg, kind = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast ' + kind;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), kind === 'error' ? 7000 : 4000);
}

/* ------------------------------------------------------------------------
   Wiring
   ------------------------------------------------------------------------ */

function wire() {
  $$('.mode-switch button').forEach((b) => b.addEventListener('click', () => b.dataset.mode !== app.mode && setMode(b.dataset.mode)));
  $$('.tabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));

  // learn
  $('#lesson-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lesson]');
    if (b) gotoLesson(Number(b.dataset.lesson));
  });
  $('#lesson-prev').addEventListener('click', () => gotoLesson(learn.current - 1));
  $('#lesson-next').addEventListener('click', () => {
    learn.done.add(learn.current);
    store.set('lessonsDone', [...learn.done]);
    if (learn.current === learn.lessons.length - 1) {
      renderLesson();
      setTab('trade');
    } else gotoLesson(learn.current + 1);
  });

  // trade
  $('#symbol-form').addEventListener('submit', (e) => {
    e.preventDefault();
    selectSymbol($('#symbol-input').value);
  });
  $('#quick-picks').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sym]');
    if (b) selectSymbol(b.dataset.sym);
  });
  $$('.side-toggle button').forEach((b) =>
    b.addEventListener('click', () => {
      app.side = b.dataset.side;
      updateTicket();
    })
  );
  $('#order-type').addEventListener('change', () => {
    const q = app.quote;
    if (q && $('#order-type').value !== 'market' && !$('#order-price').value) {
      const factor = $('#order-type').value === 'stop' ? 0.95 : app.side === 'buy' ? 0.98 : 1.05;
      $('#order-price').value = (q.price * factor).toFixed(2);
    }
    updateTicket();
  });
  ['#qty', '#order-price', '#tif'].forEach((s) => $(s).addEventListener('input', updateSummary));
  $('#qty-max').addEventListener('click', () => {
    const q = app.quote;
    if (!q) return;
    if (app.side === 'sell') {
      $('#qty').value = app.position ? app.position.qty : 0;
    } else if (app.account) {
      let cap = app.account.buyingPower;
      if (app.mode === 'live') cap = Math.min(cap, app.status.maxLiveOrderUsd);
      const price = $('#order-type').value === 'limit' && Number($('#order-price').value) > 0 ? Math.max(Number($('#order-price').value), 0) : q.price;
      $('#qty').value = Math.max(0, Math.floor((cap * 0.995) / price));
    }
    updateSummary();
  });
  $('#review-btn').addEventListener('click', reviewOrder);

  // portfolio & orders (event delegation)
  document.addEventListener('click', async (e) => {
    const goto = e.target.closest('[data-goto]');
    if (goto) setTab(goto.dataset.goto);
    const tr = e.target.closest('[data-trade]');
    if (tr) {
      app.side = tr.dataset.side;
      setTab('trade');
      await selectSymbol(tr.dataset.trade);
      if (app.side === 'sell' && app.position) $('#qty').value = app.position.qty;
      updateTicket();
    }
    const c = e.target.closest('[data-cancel]');
    if (c) {
      c.disabled = true;
      try {
        await app.broker.cancelOrder(c.dataset.cancel);
        toast('Order canceled.', 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
      renderOrders().catch(() => {});
    }
  });

  // settings
  $('#reset-practice').addEventListener('click', async () => {
    const ok = await modal({ title: 'Reset practice account?', html: '<p>This clears your practice stocks and orders and gives you a fresh $10,000 of pretend money.</p>', okText: 'Reset' });
    if (!ok) return;
    app.practice = app.practice || new PracticeBroker();
    app.practice.reset();
    toast('Practice account reset. You have $10,000 of pretend money.', 'success');
    refresh();
  });
  $$('.key-form').forEach((form) => {
    const mode = form.dataset.mode;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const key = form.key.value.trim();
      const secret = form.secret.value.trim();
      if (!key || !secret) return toast('Paste both the API Key ID and the Secret Key.', 'error');
      if (mode === 'live' && key.startsWith('PK')) {
        const go = await modal({ title: 'Are these paper keys?', html: '<p>Keys starting with <b>PK</b> are usually <b>paper</b> keys. Live keys usually start with <b>AK</b>. Save anyway?</p>', okText: 'Save anyway' });
        if (!go) return;
      }
      try {
        const r = await api('/keys', { method: 'POST', body: { mode, key, secret } });
        form.reset();
        await loadStatus();
        if (r.warning) toast(`Saved, but the test failed: ${r.warning}`, 'error');
        else toast(`Connected! Your ${mode} account (${r.account.status}) is worth ${money(Number(r.account.equity))}.`, 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    });
    form.querySelector('.remove-keys').addEventListener('click', async () => {
      const ok = await modal({ title: `Remove ${mode} keys?`, html: `<p>The app will forget your ${mode} keys. You can paste them again any time.</p>`, okText: 'Remove' });
      if (!ok) return;
      await api(`/keys?mode=${mode}`, { method: 'DELETE' }).catch((err) => toast(err.message, 'error'));
      await loadStatus();
      if (app.mode === mode) setMode('practice');
      toast(`${mode} keys removed.`);
    });
  });
  $('#limit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/keys', { method: 'POST', body: { maxLiveOrderUsd: Number($('#max-live').value) } });
      await loadStatus();
      toast(`Live safety limit set to ${money(app.status.maxLiveOrderUsd)} per buy.`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  window.addEventListener('resize', () => app.tab === 'trade' && drawChart());
}

(async function start() {
  wire();
  await loadStatus();
  setTab(app.tab);
  loadTutorial();
  const saved = store.get('mode', 'practice');
  await setMode(saved === 'paper' && app.status.paper.configured ? 'paper' : 'practice', { force: true });
  updateTicket();
})();

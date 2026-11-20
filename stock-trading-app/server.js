// StockStart — a beginner-friendly stock trading app.
// Zero dependencies: needs only Node.js 18 or newer.  Run:  node server.js
//
// What this server does:
//   1. Serves the web app (the files in ./public) to your browser.
//   2. Safely forwards requests to the Alpaca broker for "Paper" (pretend money,
//      real prices) and "Live" (real money) modes. Your API keys stay on your
//      own computer, in keys.local.json, and are never sent to the browser.
//
// "Practice" mode runs entirely in your browser and never talks to this server's
// broker routes.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '127.0.0.1'; // only reachable from your own computer
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const KEY_FILE = path.join(ROOT, 'keys.local.json');

const TRADING_URL = {
  paper: 'https://paper-api.alpaca.markets',
  live: 'https://api.alpaca.markets',
};
const DATA_URL = 'https://data.alpaca.markets';
const DEFAULT_MAX_LIVE_ORDER_USD = 500;

// ---------- configuration (keys) ----------

function readKeyFile() {
  try {
    return JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function getConfig() {
  const f = readKeyFile();
  return {
    paper: {
      key: process.env.ALPACA_PAPER_KEY || (f.paper && f.paper.key) || '',
      secret: process.env.ALPACA_PAPER_SECRET || (f.paper && f.paper.secret) || '',
    },
    live: {
      key: process.env.ALPACA_LIVE_KEY || (f.live && f.live.key) || '',
      secret: process.env.ALPACA_LIVE_SECRET || (f.live && f.live.secret) || '',
    },
    maxLiveOrderUsd:
      Number(process.env.MAX_LIVE_ORDER_USD) ||
      Number(f.maxLiveOrderUsd) ||
      DEFAULT_MAX_LIVE_ORDER_USD,
  };
}

function writeKeyFile(data) {
  fs.writeFileSync(KEY_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

// ---------- helpers ----------

function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  const payload = isBuf || typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': isBuf || typeof body === 'string' ? headers['Content-Type'] || 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 100_000) {
        reject(new Error('Request too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function alpaca(mode, base, pathAndQuery, options = {}) {
  const creds = getConfig()[mode];
  if (!creds.key || !creds.secret) {
    throw new ApiError(400, `No ${mode} API keys saved yet. Add them on the Settings tab.`);
  }
  let resp;
  try {
    resp = await fetch(base + pathAndQuery, {
      method: options.method || 'GET',
      headers: {
        'APCA-API-KEY-ID': creds.key,
        'APCA-API-SECRET-KEY': creds.secret,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (e) {
    throw new ApiError(502, `Could not reach Alpaca (${e.cause ? e.cause.code || e.cause.message : e.message}). Check your internet connection.`);
  }
  const text = await resp.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  if (!resp.ok) {
    let msg = (json && (json.message || json.error)) || text || resp.statusText;
    if (resp.status === 401 || resp.status === 403) {
      msg = `Alpaca rejected your ${mode} keys (${msg}). Double-check them on the Settings tab — paper and live keys are different.`;
    }
    throw new ApiError(resp.status, msg);
  }
  return json;
}

const trading = (mode, p, o) => alpaca(mode, TRADING_URL[mode], p, o);
const data = (mode, p) => alpaca(mode, DATA_URL, p);

const SYMBOL_RE = /^[A-Z][A-Z0-9.]{0,9}$/;
function cleanSymbol(s) {
  const sym = String(s || '').trim().toUpperCase();
  if (!SYMBOL_RE.test(sym)) throw new ApiError(400, `"${s}" doesn't look like a ticker symbol (examples: AAPL, MSFT, SPY).`);
  return sym;
}

async function latestPrice(mode, symbol) {
  const snap = await data(mode, `/v2/stocks/${encodeURIComponent(symbol)}/snapshot?feed=iex`);
  const price =
    (snap.latestTrade && snap.latestTrade.p) ||
    (snap.minuteBar && snap.minuteBar.c) ||
    (snap.dailyBar && snap.dailyBar.c) ||
    (snap.prevDailyBar && snap.prevDailyBar.c);
  const prevClose = snap.prevDailyBar ? snap.prevDailyBar.c : null;
  return { symbol, price, prevClose, snapshot: snap };
}

// ---------- order validation (extra safety on top of the broker's own checks) ----------

async function validateOrder(mode, body) {
  const symbol = cleanSymbol(body.symbol);
  const side = body.side;
  if (side !== 'buy' && side !== 'sell') throw new ApiError(400, 'Side must be "buy" or "sell".');
  const qty = Number(body.qty);
  if (!(qty > 0) || !Number.isFinite(qty)) throw new ApiError(400, 'Number of shares must be more than 0.');
  const type = body.type;
  if (!['market', 'limit', 'stop'].includes(type)) throw new ApiError(400, 'Order type must be market, limit or stop.');

  const order = { symbol, side, qty: String(qty), type, time_in_force: 'day' };
  if (type === 'limit') {
    const lp = Number(body.limit_price);
    if (!(lp > 0)) throw new ApiError(400, 'A limit order needs a limit price above 0.');
    order.limit_price = lp.toFixed(lp >= 1 ? 2 : 4);
    order.time_in_force = body.time_in_force === 'gtc' ? 'gtc' : 'day';
  }
  if (type === 'stop') {
    if (side !== 'sell') throw new ApiError(400, 'In this app, stop orders are only for selling (a "stop-loss").');
    const sp = Number(body.stop_price);
    if (!(sp > 0)) throw new ApiError(400, 'A stop-loss needs a stop price above 0.');
    order.stop_price = sp.toFixed(sp >= 1 ? 2 : 4);
    order.time_in_force = body.time_in_force === 'gtc' ? 'gtc' : 'day';
  }
  if (!Number.isInteger(qty) && type !== 'market') {
    throw new ApiError(400, 'Fractional (partial) shares only work with market orders. Use a whole number of shares.');
  }

  if (mode === 'live') {
    if (body.confirmLive !== 'REAL MONEY') {
      throw new ApiError(400, 'Live orders must be confirmed in the app before they are sent.');
    }
    if (side === 'buy') {
      const { maxLiveOrderUsd } = getConfig();
      const { price } = await latestPrice(mode, symbol);
      const est = qty * Number(type === 'limit' ? Math.max(order.limit_price, price || 0) : price || 0);
      if (!price) throw new ApiError(400, `Couldn't get a current price for ${symbol}, so the safety limit can't be checked. Order not sent.`);
      if (est > maxLiveOrderUsd) {
        throw new ApiError(
          400,
          `Safety limit: this buy is about $${est.toFixed(2)}, which is above your live limit of $${maxLiveOrderUsd}. ` +
            'Buy fewer shares, or raise the limit on the Settings tab.'
        );
      }
    }
  }
  return order;
}

// ---------- API routes ----------

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
  const method = req.method;

  // Simple protection: state-changing requests must come from our own page.
  if (method !== 'GET' && req.headers['x-stockstart'] !== '1') {
    throw new ApiError(403, 'Forbidden');
  }

  if (parts[1] === 'status' && method === 'GET') {
    const c = getConfig();
    return send(res, 200, {
      paper: { configured: Boolean(c.paper.key && c.paper.secret), keyHint: c.paper.key ? c.paper.key.slice(0, 4) + '…' : '' },
      live: { configured: Boolean(c.live.key && c.live.secret), keyHint: c.live.key ? c.live.key.slice(0, 4) + '…' : '' },
      maxLiveOrderUsd: c.maxLiveOrderUsd,
    });
  }

  if (parts[1] === 'keys') {
    const file = readKeyFile();
    if (method === 'POST') {
      const body = await readBody(req);
      if (body.maxLiveOrderUsd !== undefined) {
        const m = Number(body.maxLiveOrderUsd);
        if (!(m > 0)) throw new ApiError(400, 'The live safety limit must be a number above 0.');
        file.maxLiveOrderUsd = m;
      }
      if (body.mode) {
        if (body.mode !== 'paper' && body.mode !== 'live') throw new ApiError(400, 'Mode must be paper or live.');
        const key = String(body.key || '').trim();
        const secret = String(body.secret || '').trim();
        if (!key || !secret) throw new ApiError(400, 'Please paste both the API Key ID and the Secret Key.');
        file[body.mode] = { key, secret };
      }
      writeKeyFile(file);
      let account = null;
      let warning = null;
      if (body.mode) {
        try {
          const a = await trading(body.mode, '/v2/account');
          account = { status: a.status, equity: a.equity, currency: a.currency };
        } catch (e) {
          warning = e.message;
        }
      }
      return send(res, 200, { ok: true, account, warning });
    }
    if (method === 'DELETE') {
      const mode = url.searchParams.get('mode');
      if (mode !== 'paper' && mode !== 'live') throw new ApiError(400, 'Mode must be paper or live.');
      delete file[mode];
      writeKeyFile(file);
      return send(res, 200, { ok: true });
    }
  }

  const mode = parts[1];
  if (mode !== 'paper' && mode !== 'live') throw new ApiError(404, 'Not found');
  const what = parts[2];

  if (method === 'GET' && what === 'account') return send(res, 200, await trading(mode, '/v2/account'));
  if (method === 'GET' && what === 'clock') return send(res, 200, await trading(mode, '/v2/clock'));
  if (method === 'GET' && what === 'positions') return send(res, 200, await trading(mode, '/v2/positions'));
  if (method === 'GET' && what === 'orders') {
    return send(res, 200, await trading(mode, '/v2/orders?status=all&limit=100&direction=desc&nested=false'));
  }
  if (method === 'GET' && what === 'asset' && parts[3]) {
    const sym = cleanSymbol(parts[3]);
    try {
      return send(res, 200, await trading(mode, `/v2/assets/${encodeURIComponent(sym)}`));
    } catch (e) {
      if (e.status === 404) throw new ApiError(404, `No stock found with the symbol ${sym}.`);
      throw e;
    }
  }
  if (method === 'GET' && what === 'quote' && parts[3]) {
    const sym = cleanSymbol(parts[3]);
    const q = await latestPrice(mode, sym);
    return send(res, 200, { symbol: sym, price: q.price, prevClose: q.prevClose });
  }
  if (method === 'GET' && what === 'bars' && parts[3]) {
    const sym = cleanSymbol(parts[3]);
    const start = new Date(Date.now() - 200 * 24 * 3600 * 1000).toISOString();
    const r = await data(mode, `/v2/stocks/${encodeURIComponent(sym)}/bars?timeframe=1Day&start=${start}&limit=1000&adjustment=split&feed=iex`);
    return send(res, 200, (r.bars || []).map((b) => ({ t: b.t, c: b.c })));
  }
  if (method === 'POST' && what === 'orders') {
    const body = await readBody(req);
    const order = await validateOrder(mode, body);
    return send(res, 200, await trading(mode, '/v2/orders', { method: 'POST', body: order }));
  }
  if (method === 'DELETE' && what === 'orders' && parts[3]) {
    const id = parts[3];
    if (!/^[0-9a-f-]{10,64}$/i.test(id)) throw new ApiError(400, 'Bad order id');
    await trading(mode, `/v2/orders/${id}`, { method: 'DELETE' });
    return send(res, 200, { ok: true });
  }

  throw new ApiError(404, 'Not found');
}

// ---------- static files ----------

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, url) {
  let filePath;
  if (url.pathname === '/tutorial.md') {
    filePath = path.join(ROOT, 'TUTORIAL.md');
  } else {
    const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    filePath = path.normalize(path.join(PUBLIC_DIR, rel));
    if (!filePath.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, 'Forbidden');
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, buf, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream' });
  });
}

// ---------- server ----------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, url);
    } catch (e) {
      send(res, e.status || 500, { error: e.message || 'Something went wrong' });
    }
    return;
  }
  serveStatic(req, res, url);
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log('');
    console.log('  StockStart is running!');
    console.log(`  Open this in your web browser:  http://localhost:${PORT}`);
    console.log('  (Press Ctrl+C here to stop it.)');
    console.log('');
  });
}

module.exports = { server, validateOrder };

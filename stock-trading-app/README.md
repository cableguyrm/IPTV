# 📈 StockStart: learn stock trading from zero, then practice and trade

A beginner-friendly app with a built-in tutorial and three modes:

| Mode | Money | Prices | Setup |
|---|---|---|---|
| 🟢 **Practice** | Pretend $10,000 | Simulated | None. Works immediately |
| 🔵 **Paper** | Pretend | **Real** market prices | Free [Alpaca](https://alpaca.markets) account |
| 🔴 **Live** | **Real money** | Real market prices | Approved and funded Alpaca brokerage account |

> This app is for education. It is not financial advice. Trading can lose money.

## How to start it (about 2 minutes)

1. **Install Node.js** (version 18 or newer) from <https://nodejs.org>. Choose the "LTS" button and install it like any other program.
2. **Download this folder** (`stock-trading-app`) to your computer.
3. **Open a terminal in the folder:**
   - **Windows:** open the folder in File Explorer, click the address bar, type `cmd`, press Enter.
   - **Mac:** right-click the folder in Finder → *New Terminal at Folder*.
4. **Type this and press Enter:**
   ```
   node server.js
   ```
5. **Open <http://localhost:3000>** in your web browser.

To stop it, go back to the terminal and press `Ctrl + C`. Nothing to install with npm, because the app has no dependencies.

## What to do first

1. Read the **📘 Learn** tab, top to bottom (about 30 minutes).
2. Make trades in **Practice** mode until the numbers on the Portfolio tab make sense.
3. Get free Alpaca **paper** keys and practice with real prices for a few weeks (Learn → lesson 11 shows how).
4. Only then, and only with money you can afford to lose, consider **Live** mode.

## Safety features

- API keys are stored only on your computer in `keys.local.json` (never committed to git, never sent to the browser).
- The server only accepts connections from your own computer.
- Live mode: you must type **REAL MONEY** to unlock it, tick a confirmation box on every order, and every buy is capped by a **safety limit** (default $500, changeable in Settings). The cap is enforced by the server too, not just the screen.
- The app re-opens in Practice mode every time, never straight into Live.
- No short selling: you can only sell shares you own.

## Advanced (optional)

Instead of pasting keys in Settings, you can set environment variables:
`ALPACA_PAPER_KEY`, `ALPACA_PAPER_SECRET`, `ALPACA_LIVE_KEY`, `ALPACA_LIVE_SECRET`, `MAX_LIVE_ORDER_USD`, `PORT`.

Real-price data comes from Alpaca's free IEX feed, which is accurate for learning but can differ by a few cents from the full market feed.

## Files

- `TUTORIAL.md`: the full beginner tutorial (also shown in the Learn tab)
- `server.js`: tiny local server that safely connects to Alpaca
- `public/`: the web app (HTML, CSS, JavaScript)

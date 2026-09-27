# Leo — starter strategy design

A starting point to **backtest and paper-trade**, not a recommendation to trade real money.
Every number below is a parameter to test, not a known-good setting. Nothing here goes live
until it has passed the evaluation gates at the bottom.

## Division of labour

| Layer | Decides | Can it trade? |
|---|---|---|
| **Strategy rules** (Freqtrade, code) | Entries, exits, stops: fully deterministic and backtestable | Yes, within risk limits |
| **Risk engine** (code, no AI) | Position size, max exposure, daily loss stop, kill switch | Vetoes anything |
| **Leo** (Claude) | Market regime, news/event risk, explaining signals | **No.** It can only *pause* or *flag*; never open trades |
| **Operator** (you) | Approves live trades in early live phase | Final say |

Leo never generates the trade signal itself. LLM "confidence" isn't a calibrated probability,
and rules can be backtested while an LLM's judgement can't.

## Strategy A: trend-following pullback (primary)

Market: BTC/USDT and ETH/USDT spot on Binance. Signal timeframe 4h, regime filter 1d.

**Regime filter (1d):** only long when daily close > EMA200 and EMA50 > EMA200.
Otherwise flat. Spot only, no shorting in v1.

**Entry (4h), all must hold:**
1. 4h trend up: EMA20 > EMA50 > EMA200
2. Pullback: price touched or dipped below EMA20 within the last 3 candles
3. Resumption: current candle closes back above EMA20
4. RSI(14) between 40 and 65 (not already overextended)
5. Leo event gate: no high-impact event flagged in the next 12h (FOMC, CPI, major unlock, exchange incident)

**Exit:**
- Initial stop: entry − 2 × ATR(14), placed on the exchange at entry
- Trailing stop: once price is +1.5 × ATR in profit, trail at 2.5 × ATR below the highest close
- Trend exit: 4h close below EMA50
- Time stop: exit if not +1 × ATR after 30 candles (~5 days)

**Sizing:** risk a fixed fraction of equity per trade (start 0.5%) = (equity × 0.5%) / (entry − stop).
Cap any single position at 25% of equity.

## Strategy B: range mean-reversion (research only)

Only when Leo's regime read is "range" (EMAs flat/tangled, ATR% low): buy near the lower
Bollinger Band (20, 2) with RSI < 30, exit at the middle band, stop 1.5 × ATR below entry.
Kept separate so it can be switched off independently, because range strategies fail hard when a trend starts.

## Risk engine (hard limits, code-enforced)

- Max open positions: 2
- Max total exposure: 50% of equity
- Daily loss stop: −2% of equity → no new entries until next UTC day
- Weekly drawdown stop: −5% → trading paused, operator must re-enable
- Every order must carry a stop-loss; orders without one are rejected
- Exchange API key: trade-only, **withdrawals disabled**, IP-whitelisted to the bot server
- Kill switch on the Leo dashboard and Telegram: cancel open orders, stop new entries

## Evaluation gates

1. **Backtest** ≥ 3 years including the 2022 bear market, with realistic fees (0.1%) and slippage.
   Compare against simply holding BTC. Look at max drawdown, profit factor, number of trades,
   and the worst month, not just total return.
2. **Walk-forward:** tune on older data, test on the most recent 12 months you didn't tune on.
   If results collapse out-of-sample, the rules are overfit.
3. **Paper trading** (Freqtrade dry-run) for at least 4–6 weeks. Live fills must roughly match the backtest.
4. **Small live** with operator approval on every trade and minimal size, only after 1–3 pass.

## Phase 2 build (next)

- Freqtrade in dry-run on a small VPS, Strategy A implemented as a `IStrategy` class
- Leo reads Freqtrade's REST API: open trades, P&L, signals, and explains them in chat
- Leo's event gate exposed to the strategy as a simple on/off flag
- Approval queue + Telegram alerts + kill switch on the dashboard

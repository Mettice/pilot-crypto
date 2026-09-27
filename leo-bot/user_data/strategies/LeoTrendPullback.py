"""
Leo — Strategy A: trend-following pullback (see docs/leo/STRATEGY.md).

Long-only spot. Signal timeframe 4h, regime filter 1d.
Every number here is a parameter under test, not a known-good setting.
"""

from datetime import datetime, timedelta

import talib.abstract as ta
from pandas import DataFrame

from freqtrade.persistence import Trade
from freqtrade.strategy import IStrategy, informative, stoploss_from_absolute


class LeoTrendPullback(IStrategy):
    INTERFACE_VERSION = 3

    timeframe = "4h"
    can_short = False
    process_only_new_candles = True
    # EMA200 on the daily filter needs ~200 days of history = 1200 4h candles
    startup_candle_count = 1250

    # Hard backstop only; the real stop is ATR-based in custom_stoploss
    stoploss = -0.25
    use_custom_stoploss = True
    minimal_roi = {"0": 100}  # no fixed take-profit; exits are rule-based
    use_exit_signal = True
    exit_profit_only = False

    # --- Parameters (docs/leo/STRATEGY.md) ---
    risk_per_trade = 0.005  # 0.5% of equity at risk per trade
    max_position_share = 0.25  # cap any single position at 25% of equity
    stop_atr = 2.0  # initial stop: entry - 2 x ATR
    trail_trigger_atr = 1.5  # start trailing once +1.5 x ATR in profit
    trail_atr = 2.5  # trail 2.5 x ATR below the highest close
    time_stop_candles = 30  # exit if not +1 x ATR after 30 candles
    rsi_min, rsi_max = 40, 65

    @property
    def protections(self):
        # Risk engine, part 1 (part 2 is max_open_trades / tradable_balance_ratio in config)
        return [
            # Daily loss stop: -2% over the last 24h pauses new entries for 24h
            {
                "method": "MaxDrawdown",
                "lookback_period_candles": 6,
                "trade_limit": 1,
                "stop_duration_candles": 6,
                "max_allowed_drawdown": 0.02,
            },
            # Weekly drawdown stop: -5% over 7 days pauses new entries for a week
            {
                "method": "MaxDrawdown",
                "lookback_period_candles": 42,
                "trade_limit": 1,
                "stop_duration_candles": 42,
                "max_allowed_drawdown": 0.05,
            },
        ]

    @informative("1d")
    def populate_indicators_1d(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema50"] = ta.EMA(dataframe, timeperiod=50)
        dataframe["ema200"] = ta.EMA(dataframe, timeperiod=200)
        return dataframe

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema20"] = ta.EMA(dataframe, timeperiod=20)
        dataframe["ema50"] = ta.EMA(dataframe, timeperiod=50)
        dataframe["ema200"] = ta.EMA(dataframe, timeperiod=200)
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)
        dataframe["atr"] = ta.ATR(dataframe, timeperiod=14)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        daily_uptrend = (dataframe["close_1d"] > dataframe["ema200_1d"]) & (
            dataframe["ema50_1d"] > dataframe["ema200_1d"]
        )
        stacked_4h = (dataframe["ema20"] > dataframe["ema50"]) & (dataframe["ema50"] > dataframe["ema200"])
        touched_ema20 = (dataframe["low"] <= dataframe["ema20"]).astype(int).rolling(3).max() == 1
        resumed = dataframe["close"] > dataframe["ema20"]
        rsi_ok = dataframe["rsi"].between(self.rsi_min, self.rsi_max)

        dataframe.loc[
            daily_uptrend & stacked_4h & touched_ema20 & resumed & rsi_ok & (dataframe["volume"] > 0),
            ["enter_long", "enter_tag"],
        ] = (1, "trend_pullback")
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Exit when the daily regime that allowed the entry breaks. (v1 exited on a
        # 4h close below EMA50: 79 of 80 such exits lost, cutting trades on noise.)
        regime_broken = dataframe["close_1d"] < dataframe["ema200_1d"]
        dataframe.loc[regime_broken, ["exit_long", "exit_tag"]] = (1, "regime_exit")
        return dataframe

    # --- helpers ---

    def _entry_atr(self, pair: str, trade: Trade) -> float | None:
        """ATR on the signal candle the trade was opened from."""
        df, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
        before = df.loc[df["date"] < trade.open_date_utc]
        if before.empty:
            return None
        return float(before["atr"].iloc[-1])

    def custom_stake_amount(
        self,
        pair: str,
        current_time: datetime,
        current_rate: float,
        proposed_stake: float,
        min_stake: float | None,
        max_stake: float,
        leverage: float,
        entry_tag: str | None,
        side: str,
        **kwargs,
    ) -> float:
        # Fixed-fractional sizing: lose risk_per_trade of equity if the initial stop is hit
        df, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
        atr = float(df["atr"].iloc[-1])
        stop_distance = (self.stop_atr * atr) / current_rate
        equity = self.wallets.get_total_stake_amount()
        stake = equity * self.risk_per_trade / stop_distance
        stake = min(stake, equity * self.max_position_share, max_stake)
        return max(stake, min_stake or 0)

    def custom_stoploss(
        self,
        pair: str,
        trade: Trade,
        current_time: datetime,
        current_rate: float,
        current_profit: float,
        after_fill: bool,
        **kwargs,
    ) -> float | None:
        entry_atr = self._entry_atr(pair, trade)
        if entry_atr is None:
            return None
        stop = trade.open_rate - self.stop_atr * entry_atr

        # Once +1.5 ATR in profit, trail 2.5 ATR below the highest close since entry
        if current_rate >= trade.open_rate + self.trail_trigger_atr * entry_atr:
            df, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
            since = df.loc[df["date"] >= trade.open_date_utc]
            highest_close = max(float(since["close"].max()) if not since.empty else 0, current_rate)
            stop = max(stop, highest_close - self.trail_atr * float(df["atr"].iloc[-1]))

        return stoploss_from_absolute(stop, current_rate, is_short=False, leverage=trade.leverage)

    def custom_exit(
        self, pair: str, trade: Trade, current_time: datetime, current_rate: float, current_profit: float, **kwargs
    ):
        # Time stop: the trend didn't follow through
        if current_time - trade.open_date_utc < timedelta(hours=4 * self.time_stop_candles):
            return None
        entry_atr = self._entry_atr(pair, trade)
        if entry_atr is not None and current_rate < trade.open_rate + entry_atr:
            return "time_stop"
        return None

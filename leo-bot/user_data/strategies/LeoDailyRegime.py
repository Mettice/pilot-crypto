"""
Leo — Strategy B candidate: daily trend regime (benchmark / research).

Hold BTC and ETH while the daily uptrend holds (close > EMA200 and EMA50 > EMA200),
go to cash when the daily close drops below EMA200. A classic trend filter,
tested as the baseline Strategy A has to beat.
"""

import talib.abstract as ta
from pandas import DataFrame

from freqtrade.strategy import IStrategy


class LeoDailyRegime(IStrategy):
    INTERFACE_VERSION = 3

    timeframe = "1d"
    can_short = False
    process_only_new_candles = True
    startup_candle_count = 210

    stoploss = -0.25  # disaster backstop only
    minimal_roi = {"0": 100}
    use_exit_signal = True

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema50"] = ta.EMA(dataframe, timeperiod=50)
        dataframe["ema200"] = ta.EMA(dataframe, timeperiod=200)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        uptrend = (dataframe["close"] > dataframe["ema200"]) & (dataframe["ema50"] > dataframe["ema200"])
        dataframe.loc[uptrend & (dataframe["volume"] > 0), ["enter_long", "enter_tag"]] = (1, "daily_uptrend")
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[dataframe["close"] < dataframe["ema200"], ["exit_long", "exit_tag"]] = (1, "regime_exit")
        return dataframe

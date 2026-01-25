"""
Backtesting Engine

Supports multiple strategies:
- SMA Crossover
- RSI Oversold/Overbought
- MACD
- Price Breakout
"""
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

from .metrics import Trade, EquityPoint, BacktestMetrics, calculate_trade_pnl


class StrategyType(str, Enum):
    SMA_CROSSOVER = "sma_crossover"
    RSI = "rsi"
    MACD = "macd"
    BREAKOUT = "breakout"
    CUSTOM = "custom"


@dataclass
class Strategy:
    """Strategy configuration."""
    name: str
    type: StrategyType
    params: Dict = field(default_factory=dict)

    # Position management
    position_size: str = "fixed"  # "fixed" or "percent"
    capital_per_trade: float = 100000  # For fixed
    capital_percent: float = 10  # For percent

    # Risk management
    stop_loss_pct: Optional[float] = None  # e.g., 5 for 5%
    take_profit_pct: Optional[float] = None  # e.g., 10 for 10%
    trailing_stop_pct: Optional[float] = None

    @classmethod
    def from_dict(cls, data: Dict) -> 'Strategy':
        """Create strategy from dictionary."""
        return cls(
            name=data.get('name', 'Custom Strategy'),
            type=StrategyType(data.get('type', 'custom')),
            params=data.get('params', {}),
            position_size=data.get('position_size', 'fixed'),
            capital_per_trade=data.get('capital_per_trade', 100000),
            capital_percent=data.get('capital_percent', 10),
            stop_loss_pct=data.get('stop_loss_pct'),
            take_profit_pct=data.get('take_profit_pct'),
            trailing_stop_pct=data.get('trailing_stop_pct'),
        )

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            'name': self.name,
            'type': self.type.value,
            'params': self.params,
            'position_size': self.position_size,
            'capital_per_trade': self.capital_per_trade,
            'capital_percent': self.capital_percent,
            'stop_loss_pct': self.stop_loss_pct,
            'take_profit_pct': self.take_profit_pct,
            'trailing_stop_pct': self.trailing_stop_pct,
        }


class BacktestEngine:
    """Main backtesting engine."""

    BROKERAGE_PCT = 0.0003  # 0.03% per trade (Zerodha-like)
    STT_PCT = 0.001  # 0.1% STT on sell
    GST_PCT = 0.18  # 18% GST on brokerage

    def __init__(
        self,
        symbols: List[str],
        strategy: Strategy,
        start_date: datetime,
        end_date: datetime,
        initial_capital: float = 100000
    ):
        self.symbols = symbols
        self.strategy = strategy
        self.start_date = start_date
        self.end_date = end_date
        self.initial_capital = initial_capital

        # State
        self.cash = initial_capital
        self.positions: Dict[str, Trade] = {}  # symbol -> open trade
        self.trades: List[Trade] = []
        self.equity_curve: List[EquityPoint] = []

        # Data storage
        self.data: Dict[str, pd.DataFrame] = {}

    def load_data(self) -> bool:
        """Load historical data for all symbols."""
        for symbol in self.symbols:
            try:
                # Add .NS suffix for Indian stocks
                ticker = f"{symbol}.NS"
                df = yf.download(
                    ticker,
                    start=self.start_date - timedelta(days=100),  # Extra for indicators
                    end=self.end_date + timedelta(days=1),
                    progress=False
                )

                if df.empty:
                    # Try without suffix (for indices)
                    ticker = symbol
                    df = yf.download(
                        ticker,
                        start=self.start_date - timedelta(days=100),
                        end=self.end_date + timedelta(days=1),
                        progress=False
                    )

                if df.empty:
                    print(f"Warning: No data for {symbol}")
                    continue

                # Calculate indicators
                df = self._calculate_indicators(df)
                self.data[symbol] = df

            except Exception as e:
                print(f"Error loading {symbol}: {e}")
                continue

        return len(self.data) > 0

    def _calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate technical indicators."""
        # Handle MultiIndex columns from yfinance
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        # Simple Moving Averages
        df['SMA_20'] = df['Close'].rolling(window=20).mean()
        df['SMA_50'] = df['Close'].rolling(window=50).mean()
        df['SMA_200'] = df['Close'].rolling(window=200).mean()

        # Exponential Moving Averages
        df['EMA_12'] = df['Close'].ewm(span=12, adjust=False).mean()
        df['EMA_26'] = df['Close'].ewm(span=26, adjust=False).mean()

        # MACD
        df['MACD'] = df['EMA_12'] - df['EMA_26']
        df['MACD_Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
        df['MACD_Hist'] = df['MACD'] - df['MACD_Signal']

        # RSI
        df['RSI'] = self._calculate_rsi(df['Close'], 14)

        # Bollinger Bands
        df['BB_Middle'] = df['Close'].rolling(window=20).mean()
        bb_std = df['Close'].rolling(window=20).std()
        df['BB_Upper'] = df['BB_Middle'] + 2 * bb_std
        df['BB_Lower'] = df['BB_Middle'] - 2 * bb_std

        # ATR for position sizing
        df['ATR'] = self._calculate_atr(df, 14)

        # Price breakout levels
        df['High_20'] = df['High'].rolling(window=20).max()
        df['Low_20'] = df['Low'].rolling(window=20).min()

        return df

    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate RSI."""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))

    def _calculate_atr(self, df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate Average True Range."""
        high = df['High']
        low = df['Low']
        close = df['Close'].shift(1)

        tr1 = high - low
        tr2 = abs(high - close)
        tr3 = abs(low - close)

        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        return tr.rolling(window=period).mean()

    def run(self) -> BacktestMetrics:
        """Run the backtest."""
        if not self.data:
            raise ValueError("No data loaded. Call load_data() first.")

        # Get all trading dates
        all_dates = set()
        for symbol, df in self.data.items():
            all_dates.update(df.index.tolist())

        trading_dates = sorted([d for d in all_dates
                               if self.start_date <= d.replace(tzinfo=None) <= self.end_date])

        # Run simulation day by day
        for date in trading_dates:
            self._process_day(date)

        # Close any remaining positions at end
        self._close_all_positions(trading_dates[-1] if trading_dates else self.end_date)

        # Calculate metrics
        return BacktestMetrics(
            trades=self.trades,
            equity_curve=self.equity_curve,
            initial_capital=self.initial_capital,
            start_date=self.start_date,
            end_date=self.end_date
        )

    def _process_day(self, date: datetime):
        """Process a single trading day."""
        # Check exits first (stop loss, take profit, exit signals)
        self._check_exits(date)

        # Check entry signals
        self._check_entries(date)

        # Record equity
        self._record_equity(date)

    def _check_exits(self, date: datetime):
        """Check exit conditions for open positions."""
        positions_to_close = []

        for symbol, trade in self.positions.items():
            if symbol not in self.data:
                continue

            df = self.data[symbol]
            if date not in df.index:
                continue

            row = df.loc[date]
            current_price = row['Close']

            exit_signal = None

            # Stop loss
            if self.strategy.stop_loss_pct:
                if trade.trade_type == 'LONG':
                    stop_price = trade.entry_price * (1 - self.strategy.stop_loss_pct / 100)
                    if current_price <= stop_price:
                        exit_signal = f"Stop Loss at {self.strategy.stop_loss_pct}%"
                else:
                    stop_price = trade.entry_price * (1 + self.strategy.stop_loss_pct / 100)
                    if current_price >= stop_price:
                        exit_signal = f"Stop Loss at {self.strategy.stop_loss_pct}%"

            # Take profit
            if not exit_signal and self.strategy.take_profit_pct:
                if trade.trade_type == 'LONG':
                    target_price = trade.entry_price * (1 + self.strategy.take_profit_pct / 100)
                    if current_price >= target_price:
                        exit_signal = f"Take Profit at {self.strategy.take_profit_pct}%"
                else:
                    target_price = trade.entry_price * (1 - self.strategy.take_profit_pct / 100)
                    if current_price <= target_price:
                        exit_signal = f"Take Profit at {self.strategy.take_profit_pct}%"

            # Strategy exit signal
            if not exit_signal:
                strategy_exit = self._get_exit_signal(symbol, date, row, trade)
                if strategy_exit:
                    exit_signal = strategy_exit

            if exit_signal:
                positions_to_close.append((symbol, current_price, date, exit_signal))

        # Close positions
        for symbol, price, date, signal in positions_to_close:
            self._close_position(symbol, price, date, signal)

    def _check_entries(self, date: datetime):
        """Check entry signals for all symbols."""
        for symbol in self.symbols:
            # Skip if already have position
            if symbol in self.positions:
                continue

            if symbol not in self.data:
                continue

            df = self.data[symbol]
            if date not in df.index:
                continue

            row = df.loc[date]
            signal = self._get_entry_signal(symbol, date, row)

            if signal:
                entry_price = row['Close']
                self._open_position(symbol, entry_price, date, signal[0], signal[1])

    def _get_entry_signal(self, symbol: str, date: datetime, row: pd.Series) -> Optional[Tuple[str, str]]:
        """Get entry signal based on strategy. Returns (signal_name, trade_type)."""
        strategy_type = self.strategy.type
        params = self.strategy.params

        if strategy_type == StrategyType.SMA_CROSSOVER:
            return self._sma_crossover_entry(symbol, date, row, params)
        elif strategy_type == StrategyType.RSI:
            return self._rsi_entry(row, params)
        elif strategy_type == StrategyType.MACD:
            return self._macd_entry(symbol, date, row, params)
        elif strategy_type == StrategyType.BREAKOUT:
            return self._breakout_entry(row, params)

        return None

    def _get_exit_signal(self, symbol: str, date: datetime, row: pd.Series, trade: Trade) -> Optional[str]:
        """Get exit signal based on strategy."""
        strategy_type = self.strategy.type
        params = self.strategy.params

        if strategy_type == StrategyType.SMA_CROSSOVER:
            return self._sma_crossover_exit(symbol, date, row, params, trade)
        elif strategy_type == StrategyType.RSI:
            return self._rsi_exit(row, params, trade)
        elif strategy_type == StrategyType.MACD:
            return self._macd_exit(symbol, date, row, params, trade)
        elif strategy_type == StrategyType.BREAKOUT:
            return self._breakout_exit(row, params, trade)

        return None

    # ==========================================================================
    # STRATEGY IMPLEMENTATIONS
    # ==========================================================================

    def _sma_crossover_entry(self, symbol: str, date: datetime, row: pd.Series, params: Dict) -> Optional[Tuple[str, str]]:
        """SMA Crossover entry signal."""
        fast_period = params.get('fast_period', 20)
        slow_period = params.get('slow_period', 50)

        fast_ma = f'SMA_{fast_period}' if f'SMA_{fast_period}' in row.index else 'SMA_20'
        slow_ma = f'SMA_{slow_period}' if f'SMA_{slow_period}' in row.index else 'SMA_50'

        # Get previous day data
        df = self.data[symbol]
        idx = df.index.get_loc(date)
        if idx < 1:
            return None

        prev_row = df.iloc[idx - 1]

        # Check for crossover
        if pd.isna(row[fast_ma]) or pd.isna(row[slow_ma]):
            return None

        current_fast_above = row[fast_ma] > row[slow_ma]
        prev_fast_above = prev_row[fast_ma] > prev_row[slow_ma]

        if current_fast_above and not prev_fast_above:
            return (f"SMA {fast_period}/{slow_period} Golden Cross", "LONG")
        elif not current_fast_above and prev_fast_above:
            return (f"SMA {fast_period}/{slow_period} Death Cross", "SHORT")

        return None

    def _sma_crossover_exit(self, symbol: str, date: datetime, row: pd.Series, params: Dict, trade: Trade) -> Optional[str]:
        """SMA Crossover exit signal."""
        fast_period = params.get('fast_period', 20)
        slow_period = params.get('slow_period', 50)

        fast_ma = f'SMA_{fast_period}' if f'SMA_{fast_period}' in row.index else 'SMA_20'
        slow_ma = f'SMA_{slow_period}' if f'SMA_{slow_period}' in row.index else 'SMA_50'

        if pd.isna(row[fast_ma]) or pd.isna(row[slow_ma]):
            return None

        df = self.data[symbol]
        idx = df.index.get_loc(date)
        if idx < 1:
            return None

        prev_row = df.iloc[idx - 1]

        current_fast_above = row[fast_ma] > row[slow_ma]
        prev_fast_above = prev_row[fast_ma] > prev_row[slow_ma]

        # Exit long on death cross
        if trade.trade_type == 'LONG' and not current_fast_above and prev_fast_above:
            return "SMA Death Cross Exit"
        # Exit short on golden cross
        elif trade.trade_type == 'SHORT' and current_fast_above and not prev_fast_above:
            return "SMA Golden Cross Exit"

        return None

    def _rsi_entry(self, row: pd.Series, params: Dict) -> Optional[Tuple[str, str]]:
        """RSI entry signal."""
        oversold = params.get('oversold', 30)
        overbought = params.get('overbought', 70)

        rsi = row.get('RSI')
        if pd.isna(rsi):
            return None

        if rsi < oversold:
            return (f"RSI Oversold ({rsi:.1f})", "LONG")
        elif rsi > overbought:
            return (f"RSI Overbought ({rsi:.1f})", "SHORT")

        return None

    def _rsi_exit(self, row: pd.Series, params: Dict, trade: Trade) -> Optional[str]:
        """RSI exit signal."""
        exit_level = params.get('exit_level', 50)

        rsi = row.get('RSI')
        if pd.isna(rsi):
            return None

        # Exit long when RSI reaches neutral or overbought
        if trade.trade_type == 'LONG' and rsi > exit_level:
            return f"RSI Exit ({rsi:.1f})"
        # Exit short when RSI reaches neutral or oversold
        elif trade.trade_type == 'SHORT' and rsi < (100 - exit_level):
            return f"RSI Exit ({rsi:.1f})"

        return None

    def _macd_entry(self, symbol: str, date: datetime, row: pd.Series, params: Dict) -> Optional[Tuple[str, str]]:
        """MACD entry signal."""
        macd = row.get('MACD')
        signal = row.get('MACD_Signal')

        if pd.isna(macd) or pd.isna(signal):
            return None

        df = self.data[symbol]
        idx = df.index.get_loc(date)
        if idx < 1:
            return None

        prev_row = df.iloc[idx - 1]
        prev_macd = prev_row.get('MACD')
        prev_signal = prev_row.get('MACD_Signal')

        if pd.isna(prev_macd) or pd.isna(prev_signal):
            return None

        # MACD crossover
        current_above = macd > signal
        prev_above = prev_macd > prev_signal

        if current_above and not prev_above:
            return ("MACD Bullish Crossover", "LONG")
        elif not current_above and prev_above:
            return ("MACD Bearish Crossover", "SHORT")

        return None

    def _macd_exit(self, symbol: str, date: datetime, row: pd.Series, params: Dict, trade: Trade) -> Optional[str]:
        """MACD exit signal."""
        macd = row.get('MACD')
        signal = row.get('MACD_Signal')

        if pd.isna(macd) or pd.isna(signal):
            return None

        df = self.data[symbol]
        idx = df.index.get_loc(date)
        if idx < 1:
            return None

        prev_row = df.iloc[idx - 1]
        prev_macd = prev_row.get('MACD')
        prev_signal = prev_row.get('MACD_Signal')

        if pd.isna(prev_macd) or pd.isna(prev_signal):
            return None

        current_above = macd > signal
        prev_above = prev_macd > prev_signal

        if trade.trade_type == 'LONG' and not current_above and prev_above:
            return "MACD Bearish Exit"
        elif trade.trade_type == 'SHORT' and current_above and not prev_above:
            return "MACD Bullish Exit"

        return None

    def _breakout_entry(self, row: pd.Series, params: Dict) -> Optional[Tuple[str, str]]:
        """Breakout entry signal."""
        period = params.get('period', 20)
        close = row['Close']

        high_col = f'High_{period}' if f'High_{period}' in row.index else 'High_20'
        low_col = f'Low_{period}' if f'Low_{period}' in row.index else 'Low_20'

        high_breakout = row.get(high_col)
        low_breakout = row.get(low_col)

        if pd.isna(high_breakout) or pd.isna(low_breakout):
            return None

        if close >= high_breakout:
            return (f"{period}-day High Breakout", "LONG")
        elif close <= low_breakout:
            return (f"{period}-day Low Breakout", "SHORT")

        return None

    def _breakout_exit(self, row: pd.Series, params: Dict, trade: Trade) -> Optional[str]:
        """Breakout exit signal - exit on opposite breakout or middle band."""
        period = params.get('period', 20)

        # Use middle of range as exit
        high_col = f'High_{period}' if f'High_{period}' in row.index else 'High_20'
        low_col = f'Low_{period}' if f'Low_{period}' in row.index else 'Low_20'

        high_level = row.get(high_col)
        low_level = row.get(low_col)

        if pd.isna(high_level) or pd.isna(low_level):
            return None

        middle = (high_level + low_level) / 2
        close = row['Close']

        if trade.trade_type == 'LONG' and close < middle:
            return "Breakout Middle Exit"
        elif trade.trade_type == 'SHORT' and close > middle:
            return "Breakout Middle Exit"

        return None

    # ==========================================================================
    # POSITION MANAGEMENT
    # ==========================================================================

    def _open_position(self, symbol: str, price: float, date: datetime, signal: str, trade_type: str):
        """Open a new position."""
        # Calculate position size
        if self.strategy.position_size == 'percent':
            capital = self.cash * (self.strategy.capital_percent / 100)
        else:
            capital = min(self.strategy.capital_per_trade, self.cash)

        if capital <= 0:
            return

        quantity = int(capital / price)
        if quantity <= 0:
            return

        cost = quantity * price
        fees = self._calculate_fees(cost, is_buy=True)
        total_cost = cost + fees

        if total_cost > self.cash:
            return

        # Convert pandas Timestamp to Python datetime if needed
        entry_dt = date.to_pydatetime() if hasattr(date, 'to_pydatetime') else date

        # Create trade
        trade = Trade(
            symbol=symbol,
            trade_type=trade_type,
            entry_date=entry_dt,
            exit_date=None,
            entry_price=price,
            exit_price=None,
            quantity=quantity,
            entry_signal=signal,
            exit_signal=None,
            fees=fees
        )

        self.positions[symbol] = trade
        self.cash -= total_cost

    def _close_position(self, symbol: str, price: float, date: datetime, signal: str):
        """Close an existing position."""
        if symbol not in self.positions:
            return

        trade = self.positions[symbol]
        # Convert pandas Timestamp to Python datetime if needed
        exit_dt = date.to_pydatetime() if hasattr(date, 'to_pydatetime') else date
        trade.exit_date = exit_dt
        trade.exit_price = price
        trade.exit_signal = signal

        # Calculate fees and PnL
        proceeds = trade.quantity * price
        exit_fees = self._calculate_fees(proceeds, is_buy=False)
        trade.fees += exit_fees

        # Calculate PnL
        trade = calculate_trade_pnl(trade)

        # Update cash
        self.cash += proceeds - exit_fees

        # Move to closed trades
        self.trades.append(trade)
        del self.positions[symbol]

    def _close_all_positions(self, date: datetime):
        """Close all remaining positions at market close."""
        symbols_to_close = list(self.positions.keys())
        for symbol in symbols_to_close:
            if symbol in self.data and date in self.data[symbol].index:
                price = self.data[symbol].loc[date]['Close']
                self._close_position(symbol, price, date, "End of Backtest")

    def _calculate_fees(self, amount: float, is_buy: bool) -> float:
        """Calculate trading fees."""
        brokerage = amount * self.BROKERAGE_PCT
        gst = brokerage * self.GST_PCT
        stt = amount * self.STT_PCT if not is_buy else 0  # STT only on sell

        return brokerage + gst + stt

    def _record_equity(self, date: datetime):
        """Record daily equity."""
        positions_value = 0
        for symbol, trade in self.positions.items():
            if symbol in self.data and date in self.data[symbol].index:
                current_price = self.data[symbol].loc[date]['Close']
                positions_value += trade.quantity * current_price

        equity = self.cash + positions_value

        # Calculate daily return
        prev_equity = self.equity_curve[-1].equity if self.equity_curve else self.initial_capital
        daily_return = (equity - prev_equity) / prev_equity if prev_equity > 0 else 0

        # Calculate drawdown
        peak_equity = max(p.equity for p in self.equity_curve) if self.equity_curve else equity
        peak_equity = max(peak_equity, equity)
        drawdown = (peak_equity - equity) / peak_equity if peak_equity > 0 else 0

        point = EquityPoint(
            date=date,
            equity=equity,
            cash=self.cash,
            positions_value=positions_value,
            daily_return=daily_return,
            drawdown=drawdown
        )

        self.equity_curve.append(point)


# ==========================================================================
# PRESET STRATEGIES
# ==========================================================================

PRESET_STRATEGIES = {
    'sma_20_50': Strategy(
        name="SMA 20/50 Crossover",
        type=StrategyType.SMA_CROSSOVER,
        params={'fast_period': 20, 'slow_period': 50},
        stop_loss_pct=5,
        take_profit_pct=10
    ),
    'sma_50_200': Strategy(
        name="SMA 50/200 Crossover (Golden/Death Cross)",
        type=StrategyType.SMA_CROSSOVER,
        params={'fast_period': 50, 'slow_period': 200},
        stop_loss_pct=8,
        take_profit_pct=15
    ),
    'rsi_30_70': Strategy(
        name="RSI 30/70",
        type=StrategyType.RSI,
        params={'oversold': 30, 'overbought': 70, 'exit_level': 50},
        stop_loss_pct=5,
        take_profit_pct=10
    ),
    'rsi_20_80': Strategy(
        name="RSI 20/80 (Extreme)",
        type=StrategyType.RSI,
        params={'oversold': 20, 'overbought': 80, 'exit_level': 50},
        stop_loss_pct=7,
        take_profit_pct=12
    ),
    'macd_default': Strategy(
        name="MACD Default",
        type=StrategyType.MACD,
        params={},
        stop_loss_pct=5,
        take_profit_pct=10
    ),
    'breakout_20': Strategy(
        name="20-Day Breakout",
        type=StrategyType.BREAKOUT,
        params={'period': 20},
        stop_loss_pct=5,
        take_profit_pct=10
    ),
}

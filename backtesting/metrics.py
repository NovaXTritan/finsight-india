"""
Backtesting Metrics Calculator

Calculates performance metrics for backtests including:
- Total Return, CAGR
- Sharpe Ratio, Sortino Ratio
- Max Drawdown
- Win Rate, Profit Factor
"""
import numpy as np
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass


@dataclass
class Trade:
    """Represents a single trade."""
    symbol: str
    trade_type: str  # 'LONG' or 'SHORT'
    entry_date: datetime
    exit_date: Optional[datetime]
    entry_price: float
    exit_price: Optional[float]
    quantity: int
    entry_signal: str
    exit_signal: Optional[str]
    pnl: Optional[float] = None
    return_pct: Optional[float] = None
    fees: float = 0


@dataclass
class EquityPoint:
    """Daily equity snapshot."""
    date: datetime
    equity: float
    cash: float
    positions_value: float
    daily_return: float = 0
    drawdown: float = 0


class BacktestMetrics:
    """Calculate comprehensive backtest metrics."""

    TRADING_DAYS_PER_YEAR = 252
    RISK_FREE_RATE = 0.06  # 6% for India

    def __init__(
        self,
        trades: List[Trade],
        equity_curve: List[EquityPoint],
        initial_capital: float,
        start_date: datetime,
        end_date: datetime
    ):
        self.trades = trades
        self.equity_curve = equity_curve
        self.initial_capital = initial_capital
        self.start_date = start_date
        self.end_date = end_date

        # Calculate metrics
        self._calculate_all()

    def _calculate_all(self):
        """Calculate all metrics."""
        # Basic metrics
        self.final_capital = self.equity_curve[-1].equity if self.equity_curve else self.initial_capital
        self.total_return = (self.final_capital - self.initial_capital) / self.initial_capital

        # Time-based metrics
        days = (self.end_date - self.start_date).days
        years = days / 365.25
        self.cagr = self._calculate_cagr(years)

        # Trade-based metrics
        self._calculate_trade_metrics()

        # Risk metrics
        self._calculate_risk_metrics()

    def _calculate_cagr(self, years: float) -> float:
        """Calculate Compound Annual Growth Rate."""
        if years <= 0 or self.initial_capital <= 0:
            return 0
        return (self.final_capital / self.initial_capital) ** (1 / years) - 1

    def _calculate_trade_metrics(self):
        """Calculate trade-related metrics."""
        closed_trades = [t for t in self.trades if t.exit_date is not None and t.pnl is not None]

        self.total_trades = len(closed_trades)

        if not closed_trades:
            self.winning_trades = 0
            self.losing_trades = 0
            self.win_rate = 0
            self.avg_win = 0
            self.avg_loss = 0
            self.profit_factor = 0
            self.avg_trade_return = 0
            return

        winning = [t for t in closed_trades if t.pnl > 0]
        losing = [t for t in closed_trades if t.pnl <= 0]

        self.winning_trades = len(winning)
        self.losing_trades = len(losing)
        self.win_rate = len(winning) / len(closed_trades) if closed_trades else 0

        # Average win/loss
        self.avg_win = np.mean([t.pnl for t in winning]) if winning else 0
        self.avg_loss = abs(np.mean([t.pnl for t in losing])) if losing else 0

        # Profit factor
        gross_profit = sum(t.pnl for t in winning) if winning else 0
        gross_loss = abs(sum(t.pnl for t in losing)) if losing else 0
        self.profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf') if gross_profit > 0 else 0

        # Average trade return
        self.avg_trade_return = np.mean([t.return_pct for t in closed_trades if t.return_pct is not None])

    def _calculate_risk_metrics(self):
        """Calculate risk-adjusted metrics."""
        if len(self.equity_curve) < 2:
            self.sharpe_ratio = 0
            self.sortino_ratio = 0
            self.max_drawdown = 0
            self.max_drawdown_duration = 0
            return

        # Daily returns
        equities = [p.equity for p in self.equity_curve]
        returns = np.diff(equities) / equities[:-1]

        # Sharpe Ratio (annualized)
        excess_returns = returns - (self.RISK_FREE_RATE / self.TRADING_DAYS_PER_YEAR)
        self.sharpe_ratio = self._calculate_sharpe(excess_returns)

        # Sortino Ratio (only downside deviation)
        self.sortino_ratio = self._calculate_sortino(excess_returns)

        # Max Drawdown
        self.max_drawdown, self.max_drawdown_duration = self._calculate_max_drawdown(equities)

    def _calculate_sharpe(self, excess_returns: np.ndarray) -> float:
        """Calculate annualized Sharpe Ratio."""
        if len(excess_returns) == 0 or np.std(excess_returns) == 0:
            return 0
        return np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(self.TRADING_DAYS_PER_YEAR)

    def _calculate_sortino(self, excess_returns: np.ndarray) -> float:
        """Calculate annualized Sortino Ratio."""
        if len(excess_returns) == 0:
            return 0

        # Only consider negative returns for downside deviation
        negative_returns = excess_returns[excess_returns < 0]
        if len(negative_returns) == 0:
            return float('inf') if np.mean(excess_returns) > 0 else 0

        downside_std = np.std(negative_returns)
        if downside_std == 0:
            return 0

        return np.mean(excess_returns) / downside_std * np.sqrt(self.TRADING_DAYS_PER_YEAR)

    def _calculate_max_drawdown(self, equities: List[float]) -> tuple:
        """Calculate maximum drawdown and duration."""
        if not equities:
            return 0, 0

        peak = equities[0]
        max_dd = 0
        max_dd_duration = 0
        current_dd_start = 0

        for i, equity in enumerate(equities):
            if equity > peak:
                peak = equity
                current_dd_start = i

            dd = (peak - equity) / peak
            if dd > max_dd:
                max_dd = dd
                max_dd_duration = i - current_dd_start

        return max_dd, max_dd_duration

    def to_dict(self) -> Dict:
        """Convert metrics to dictionary."""
        return {
            'initial_capital': self.initial_capital,
            'final_capital': round(self.final_capital, 2),
            'total_return': round(self.total_return * 100, 2),  # Percentage
            'cagr': round(self.cagr * 100, 2),  # Percentage
            'sharpe_ratio': round(self.sharpe_ratio, 2),
            'sortino_ratio': round(self.sortino_ratio, 2),
            'max_drawdown': round(self.max_drawdown * 100, 2),  # Percentage
            'max_drawdown_duration': self.max_drawdown_duration,
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'losing_trades': self.losing_trades,
            'win_rate': round(self.win_rate * 100, 2),  # Percentage
            'profit_factor': round(self.profit_factor, 2) if self.profit_factor != float('inf') else 999,
            'avg_win': round(self.avg_win, 2),
            'avg_loss': round(self.avg_loss, 2),
            'avg_trade_return': round(self.avg_trade_return * 100, 2) if self.avg_trade_return else 0,
        }


def calculate_trade_pnl(trade: Trade) -> Trade:
    """Calculate PnL for a closed trade."""
    if trade.exit_price is None:
        return trade

    if trade.trade_type == 'LONG':
        gross_pnl = (trade.exit_price - trade.entry_price) * trade.quantity
    else:  # SHORT
        gross_pnl = (trade.entry_price - trade.exit_price) * trade.quantity

    trade.pnl = gross_pnl - trade.fees
    trade.return_pct = trade.pnl / (trade.entry_price * trade.quantity)

    return trade

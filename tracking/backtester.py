"""
Backtesting & Attribution Module

This is what separates qualitative claims from quantitative proof.

Tracks:
- P&L per signal type
- Drawdown tracking
- False positive cost
- Missed opportunity cost
- Attribution of returns to factors
"""
import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from enum import Enum
import json


# =============================================================================
# PERFORMANCE METRICS
# =============================================================================

@dataclass
class SignalPerformance:
    """Performance metrics for a signal type."""
    pattern_type: str
    symbol: str
    
    # Core metrics
    total_signals: int = 0
    true_positives: int = 0      # Profitable signals acted on
    false_positives: int = 0     # Unprofitable signals acted on
    true_negatives: int = 0      # Correctly ignored (would have lost)
    false_negatives: int = 0     # Missed opportunities (ignored but profitable)
    
    # P&L
    gross_pnl: float = 0.0       # Total P&L if all signals acted on
    realized_pnl: float = 0.0    # Actual P&L from acted signals
    opportunity_cost: float = 0.0 # P&L from missed good signals
    
    # Returns
    avg_return: float = 0.0
    max_return: float = 0.0
    min_return: float = 0.0
    win_rate: float = 0.0
    
    # Risk
    max_drawdown: float = 0.0
    sharpe_ratio: float = 0.0
    sortino_ratio: float = 0.0
    
    # Time
    avg_hold_time_hours: float = 0.0
    first_signal: Optional[datetime] = None
    last_signal: Optional[datetime] = None
    
    def precision(self) -> float:
        """Precision = TP / (TP + FP)"""
        denom = self.true_positives + self.false_positives
        return self.true_positives / denom if denom > 0 else 0.0
    
    def recall(self) -> float:
        """Recall = TP / (TP + FN)"""
        denom = self.true_positives + self.false_negatives
        return self.true_positives / denom if denom > 0 else 0.0
    
    def f1_score(self) -> float:
        """F1 = 2 * (precision * recall) / (precision + recall)"""
        p, r = self.precision(), self.recall()
        return 2 * p * r / (p + r) if (p + r) > 0 else 0.0
    
    def to_dict(self) -> dict:
        return {
            "pattern_type": self.pattern_type,
            "symbol": self.symbol,
            "total_signals": self.total_signals,
            "precision": f"{self.precision():.2%}",
            "recall": f"{self.recall():.2%}",
            "f1_score": f"{self.f1_score():.2%}",
            "win_rate": f"{self.win_rate:.2%}",
            "realized_pnl": f"${self.realized_pnl:,.2f}",
            "opportunity_cost": f"${self.opportunity_cost:,.2f}",
            "max_drawdown": f"{self.max_drawdown:.2%}",
            "sharpe_ratio": f"{self.sharpe_ratio:.2f}",
            "avg_return": f"{self.avg_return:.2%}"
        }


@dataclass
class AgentAttribution:
    """Attribution of agent decisions to outcomes."""
    
    # How much value the agent added
    agent_value_add: float = 0.0  # P&L with agent - P&L without agent
    
    # Breakdown by decision type
    ignore_value: float = 0.0     # Value from correctly ignoring
    review_value: float = 0.0     # Value from review recommendations
    execute_value: float = 0.0    # Value from execute recommendations
    
    # Mistakes
    false_ignore_cost: float = 0.0  # Cost of wrongly ignoring
    false_alert_cost: float = 0.0   # Cost of wrong alerts
    
    # Attribution factors
    regime_attribution: float = 0.0   # How much regime detection helped
    timing_attribution: float = 0.0   # How much timing helped
    pattern_attribution: float = 0.0  # How much pattern selection helped
    
    def total_attribution(self) -> float:
        return self.regime_attribution + self.timing_attribution + self.pattern_attribution


# =============================================================================
# BACKTESTER
# =============================================================================

@dataclass
class Trade:
    """Simulated trade for backtesting."""
    anomaly_id: str
    symbol: str
    pattern_type: str
    entry_price: float
    entry_time: datetime
    exit_price: Optional[float] = None
    exit_time: Optional[datetime] = None
    return_pct: Optional[float] = None
    agent_decision: str = ""
    user_action: str = ""


class Backtester:
    """
    Systematic backtesting engine.
    
    Provides:
    1. P&L per signal type
    2. Drawdown tracking
    3. False positive/negative analysis
    4. Opportunity cost calculation
    """
    
    def __init__(self, initial_capital: float = 100000.0):
        self.initial_capital = initial_capital
        self.capital = initial_capital
        
        # Trade history
        self.trades: List[Trade] = []
        self.equity_curve: List[Tuple[datetime, float]] = []
        
        # Performance by pattern
        self.performance: Dict[str, SignalPerformance] = {}
        
        # Running metrics
        self.peak_capital = initial_capital
        self.max_drawdown = 0.0
    
    def record_trade(
        self,
        anomaly_id: str,
        symbol: str,
        pattern_type: str,
        entry_price: float,
        entry_time: datetime,
        exit_price: float,
        exit_time: datetime,
        agent_decision: str,
        user_action: str
    ):
        """Record a completed trade."""
        return_pct = (exit_price - entry_price) / entry_price
        
        trade = Trade(
            anomaly_id=anomaly_id,
            symbol=symbol,
            pattern_type=pattern_type,
            entry_price=entry_price,
            entry_time=entry_time,
            exit_price=exit_price,
            exit_time=exit_time,
            return_pct=return_pct,
            agent_decision=agent_decision,
            user_action=user_action
        )
        
        self.trades.append(trade)
        
        # Update capital
        if user_action in ["traded", "reviewed"]:
            pnl = self.capital * return_pct * 0.1  # Assume 10% position size
            self.capital += pnl
            
            # Track equity curve
            self.equity_curve.append((exit_time, self.capital))
            
            # Update peak and drawdown
            if self.capital > self.peak_capital:
                self.peak_capital = self.capital
            
            drawdown = (self.peak_capital - self.capital) / self.peak_capital
            self.max_drawdown = max(self.max_drawdown, drawdown)
        
        # Update performance metrics
        self._update_performance(trade)
    
    def record_missed_opportunity(
        self,
        anomaly_id: str,
        symbol: str,
        pattern_type: str,
        potential_return: float,
        agent_decision: str
    ):
        """Record a signal that was ignored but would have been profitable."""
        key = f"{pattern_type}|{symbol}"
        
        if key not in self.performance:
            self.performance[key] = SignalPerformance(
                pattern_type=pattern_type,
                symbol=symbol
            )
        
        perf = self.performance[key]
        perf.total_signals += 1
        
        if potential_return > 0.005:  # Would have been profitable
            perf.false_negatives += 1
            perf.opportunity_cost += self.capital * potential_return * 0.1
        else:
            perf.true_negatives += 1
    
    def _update_performance(self, trade: Trade):
        """Update performance metrics from trade."""
        key = f"{trade.pattern_type}|{trade.symbol}"
        
        if key not in self.performance:
            self.performance[key] = SignalPerformance(
                pattern_type=trade.pattern_type,
                symbol=trade.symbol
            )
        
        perf = self.performance[key]
        perf.total_signals += 1
        
        profitable = trade.return_pct > 0
        acted = trade.user_action in ["traded", "reviewed"]
        
        if acted:
            if profitable:
                perf.true_positives += 1
            else:
                perf.false_positives += 1
            
            perf.realized_pnl += self.capital * trade.return_pct * 0.1
        
        # Update return statistics
        if perf.total_signals == 1:
            perf.first_signal = trade.entry_time
            perf.avg_return = trade.return_pct
            perf.max_return = trade.return_pct
            perf.min_return = trade.return_pct
        else:
            n = perf.total_signals
            perf.avg_return = ((n - 1) * perf.avg_return + trade.return_pct) / n
            perf.max_return = max(perf.max_return, trade.return_pct)
            perf.min_return = min(perf.min_return, trade.return_pct)
        
        perf.last_signal = trade.exit_time
        perf.win_rate = perf.true_positives / max(1, perf.true_positives + perf.false_positives)
        perf.max_drawdown = self.max_drawdown
        
        # Calculate Sharpe (simplified)
        if len(self.trades) >= 5:
            returns = [t.return_pct for t in self.trades if t.return_pct is not None]
            if returns:
                perf.sharpe_ratio = np.mean(returns) / (np.std(returns) + 0.0001) * np.sqrt(252)
    
    def calculate_attribution(self) -> AgentAttribution:
        """
        Calculate how much value the agent added.
        
        Compares:
        - P&L with agent recommendations
        - P&L if all signals were traded
        - P&L if all signals were ignored
        """
        attribution = AgentAttribution()
        
        # Calculate value from different decision types
        for trade in self.trades:
            pnl = trade.return_pct * 0.1 * self.initial_capital if trade.return_pct else 0
            
            if trade.agent_decision == "IGNORE":
                if trade.return_pct and trade.return_pct < 0:
                    # Correctly ignored a losing trade
                    attribution.ignore_value += abs(pnl)
                elif trade.return_pct and trade.return_pct > 0.005:
                    # Wrongly ignored a winning trade
                    attribution.false_ignore_cost += pnl
            
            elif trade.agent_decision in ["REVIEW", "EXECUTE"]:
                if trade.user_action == "traded":
                    if trade.return_pct and trade.return_pct > 0:
                        attribution.execute_value += pnl
                    else:
                        attribution.false_alert_cost += abs(pnl)
        
        # Net value add
        attribution.agent_value_add = (
            attribution.ignore_value +
            attribution.execute_value -
            attribution.false_ignore_cost -
            attribution.false_alert_cost
        )
        
        return attribution
    
    def generate_report(self) -> Dict:
        """Generate comprehensive backtesting report."""
        attribution = self.calculate_attribution()
        
        report = {
            "summary": {
                "initial_capital": f"${self.initial_capital:,.2f}",
                "final_capital": f"${self.capital:,.2f}",
                "total_return": f"{(self.capital - self.initial_capital) / self.initial_capital:.2%}",
                "max_drawdown": f"{self.max_drawdown:.2%}",
                "total_trades": len(self.trades),
                "winning_trades": sum(1 for t in self.trades if t.return_pct and t.return_pct > 0),
                "losing_trades": sum(1 for t in self.trades if t.return_pct and t.return_pct <= 0)
            },
            "agent_attribution": {
                "value_add": f"${attribution.agent_value_add:,.2f}",
                "ignore_value": f"${attribution.ignore_value:,.2f}",
                "execute_value": f"${attribution.execute_value:,.2f}",
                "false_ignore_cost": f"${attribution.false_ignore_cost:,.2f}",
                "false_alert_cost": f"${attribution.false_alert_cost:,.2f}"
            },
            "performance_by_pattern": {
                k: v.to_dict() for k, v in self.performance.items()
            }
        }
        
        return report


# =============================================================================
# FAILURE METRICS (Evaluation Discipline)
# =============================================================================

@dataclass
class FailureMetrics:
    """
    Explicit failure metrics.
    
    Elite systems are defined by how they fail, not how they succeed.
    """
    # Thresholds
    max_acceptable_false_positive_rate: float = 0.40  # 40%
    max_acceptable_drawdown: float = 0.15             # 15%
    min_acceptable_precision: float = 0.50            # 50%
    min_acceptable_sharpe: float = 0.5                # 0.5
    max_confidence_drift: float = 0.20                # 20% drift
    
    # Actual values
    actual_false_positive_rate: float = 0.0
    actual_drawdown: float = 0.0
    actual_precision: float = 0.0
    actual_sharpe: float = 0.0
    confidence_drift: float = 0.0
    
    # Violations
    violations: List[str] = field(default_factory=list)
    
    def check_all(self) -> bool:
        """Check all failure conditions and return True if passing."""
        self.violations = []
        
        if self.actual_false_positive_rate > self.max_acceptable_false_positive_rate:
            self.violations.append(
                f"False positive rate {self.actual_false_positive_rate:.1%} exceeds max {self.max_acceptable_false_positive_rate:.1%}"
            )
        
        if self.actual_drawdown > self.max_acceptable_drawdown:
            self.violations.append(
                f"Drawdown {self.actual_drawdown:.1%} exceeds max {self.max_acceptable_drawdown:.1%}"
            )
        
        if self.actual_precision < self.min_acceptable_precision:
            self.violations.append(
                f"Precision {self.actual_precision:.1%} below min {self.min_acceptable_precision:.1%}"
            )
        
        if self.actual_sharpe < self.min_acceptable_sharpe:
            self.violations.append(
                f"Sharpe {self.actual_sharpe:.2f} below min {self.min_acceptable_sharpe:.2f}"
            )
        
        if self.confidence_drift > self.max_confidence_drift:
            self.violations.append(
                f"Confidence drift {self.confidence_drift:.1%} exceeds max {self.max_confidence_drift:.1%}"
            )
        
        return len(self.violations) == 0
    
    def status_report(self) -> str:
        """Generate status report."""
        lines = ["FAILURE METRICS CHECK", "=" * 50]
        
        checks = [
            ("False Positive Rate", self.actual_false_positive_rate, 
             self.max_acceptable_false_positive_rate, "<="),
            ("Max Drawdown", self.actual_drawdown, 
             self.max_acceptable_drawdown, "<="),
            ("Precision", self.actual_precision, 
             self.min_acceptable_precision, ">="),
            ("Sharpe Ratio", self.actual_sharpe, 
             self.min_acceptable_sharpe, ">="),
            ("Confidence Drift", self.confidence_drift, 
             self.max_confidence_drift, "<="),
        ]
        
        for name, actual, threshold, op in checks:
            if op == "<=" and actual <= threshold:
                status = "✓ PASS"
            elif op == ">=" and actual >= threshold:
                status = "✓ PASS"
            else:
                status = "✗ FAIL"
            
            if name in ["Sharpe Ratio"]:
                lines.append(f"{name:<25} {actual:>8.2f} {op} {threshold:.2f}  {status}")
            else:
                lines.append(f"{name:<25} {actual:>8.1%} {op} {threshold:.1%}  {status}")
        
        lines.append("=" * 50)
        
        if self.violations:
            lines.append("VIOLATIONS:")
            for v in self.violations:
                lines.append(f"  ⚠ {v}")
        else:
            lines.append("✅ All checks passing")
        
        return "\n".join(lines)


class FailureMonitor:
    """
    Continuous monitoring for failure conditions.
    """
    
    def __init__(self, backtester: Backtester):
        self.backtester = backtester
        self.metrics = FailureMetrics()
        
        # Historical confidence for drift detection
        self.confidence_history: List[Tuple[datetime, float]] = []
    
    def update(self, current_confidence: float = None):
        """Update failure metrics from current state."""
        # Calculate from backtester
        trades = self.backtester.trades
        
        if trades:
            acted_trades = [t for t in trades if t.user_action in ["traded", "reviewed"]]
            if acted_trades:
                losing = sum(1 for t in acted_trades if t.return_pct and t.return_pct <= 0)
                self.metrics.actual_false_positive_rate = losing / len(acted_trades)
                
                winning = sum(1 for t in acted_trades if t.return_pct and t.return_pct > 0)
                self.metrics.actual_precision = winning / len(acted_trades)
        
        self.metrics.actual_drawdown = self.backtester.max_drawdown
        
        # Get Sharpe from first performance entry
        if self.backtester.performance:
            first_perf = list(self.backtester.performance.values())[0]
            self.metrics.actual_sharpe = first_perf.sharpe_ratio
        
        # Confidence drift
        if current_confidence is not None:
            self.confidence_history.append((datetime.now(), current_confidence))
            
            if len(self.confidence_history) >= 10:
                recent = [c for _, c in self.confidence_history[-10:]]
                older = [c for _, c in self.confidence_history[-20:-10]] if len(self.confidence_history) >= 20 else recent
                
                if older:
                    self.metrics.confidence_drift = abs(np.mean(recent) - np.mean(older))
    
    def check(self) -> Tuple[bool, str]:
        """Check failure conditions and return status."""
        passing = self.metrics.check_all()
        report = self.metrics.status_report()
        return passing, report

"""
Causal Learning Module - The Core Intelligence Upgrade

Moves from: "This signal worked"
To: "This signal worked BECAUSE regime X + feature Y + timing Z"

This is what separates FinSight from every other signal tool.
"""
import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from enum import Enum
import json

# =============================================================================
# MARKET REGIME DETECTION
# =============================================================================

class MarketRegime(str, Enum):
    """Market regime classification."""
    TRENDING_UP = "trending_up"
    TRENDING_DOWN = "trending_down"
    RANGING = "ranging"
    HIGH_VOLATILITY = "high_volatility"
    LOW_VOLATILITY = "low_volatility"
    BREAKOUT = "breakout"
    UNKNOWN = "unknown"


class TimeHorizon(str, Enum):
    """Trading time horizon."""
    SCALP = "scalp"           # < 1 hour
    INTRADAY = "intraday"     # 1-8 hours
    SWING = "swing"           # 1-5 days
    POSITIONAL = "positional" # 5+ days


class SignalSource(str, Enum):
    """Signal origin classification."""
    TECHNICAL = "technical"   # Price/volume patterns
    SENTIMENT = "sentiment"   # News/social
    MACRO = "macro"           # Economic events
    FLOW = "flow"             # Order flow/institutional
    COMPOSITE = "composite"   # Multiple sources


@dataclass
class RegimeContext:
    """Complete context for a signal."""
    regime: MarketRegime
    horizon: TimeHorizon
    source: SignalSource
    volatility_percentile: float  # 0-100
    trend_strength: float         # -1 to 1
    volume_regime: str            # "high", "normal", "low"
    time_of_day: str              # "open", "mid", "close", "after_hours"
    day_of_week: int              # 0-4 (Mon-Fri)
    
    def to_dict(self) -> dict:
        return {
            "regime": self.regime.value,
            "horizon": self.horizon.value,
            "source": self.source.value,
            "volatility_percentile": self.volatility_percentile,
            "trend_strength": self.trend_strength,
            "volume_regime": self.volume_regime,
            "time_of_day": self.time_of_day,
            "day_of_week": self.day_of_week
        }
    
    def signature(self) -> str:
        """Unique signature for this context combination."""
        return f"{self.regime.value}|{self.horizon.value}|{self.source.value}|{self.volume_regime}"


class RegimeDetector:
    """
    Detects current market regime from price data.
    
    This is crucial - signals that work in trending markets
    often fail in ranging markets.
    """
    
    def __init__(self, lookback_periods: int = 20):
        self.lookback = lookback_periods
    
    def detect(self, data: pd.DataFrame) -> RegimeContext:
        """
        Analyze price data to determine current regime.
        
        Args:
            data: DataFrame with columns [datetime, open, high, low, close, volume]
        
        Returns:
            RegimeContext with full classification
        """
        if len(data) < self.lookback:
            return self._default_context()
        
        # Ensure lowercase columns
        data.columns = [c.lower() for c in data.columns]
        
        # Calculate indicators
        returns = data['close'].pct_change().dropna()
        volatility = returns.rolling(self.lookback).std().iloc[-1]
        volatility_history = returns.rolling(self.lookback).std()
        
        # Trend detection (using EMA slope)
        ema_short = data['close'].ewm(span=8).mean()
        ema_long = data['close'].ewm(span=21).mean()
        trend_strength = (ema_short.iloc[-1] - ema_long.iloc[-1]) / ema_long.iloc[-1]
        
        # Regime classification
        regime = self._classify_regime(data, trend_strength, volatility, volatility_history)
        
        # Volatility percentile
        vol_percentile = (volatility_history < volatility).mean() * 100
        
        # Volume regime
        avg_volume = data['volume'].rolling(self.lookback).mean().iloc[-1]
        current_volume = data['volume'].iloc[-1]
        if current_volume > avg_volume * 1.5:
            volume_regime = "high"
        elif current_volume < avg_volume * 0.5:
            volume_regime = "low"
        else:
            volume_regime = "normal"
        
        # Time context
        last_time = pd.to_datetime(data.iloc[-1].get('datetime', datetime.now()))
        time_of_day = self._classify_time(last_time)
        
        return RegimeContext(
            regime=regime,
            horizon=TimeHorizon.INTRADAY,  # Default, can be adjusted
            source=SignalSource.TECHNICAL,  # Default for price-based
            volatility_percentile=vol_percentile,
            trend_strength=float(trend_strength),
            volume_regime=volume_regime,
            time_of_day=time_of_day,
            day_of_week=last_time.weekday()
        )
    
    def _classify_regime(
        self, 
        data: pd.DataFrame, 
        trend: float, 
        vol: float,
        vol_history: pd.Series
    ) -> MarketRegime:
        """Classify the current market regime."""
        
        # High volatility check
        vol_threshold = vol_history.quantile(0.8)
        if vol > vol_threshold:
            return MarketRegime.HIGH_VOLATILITY
        
        # Low volatility check
        if vol < vol_history.quantile(0.2):
            return MarketRegime.LOW_VOLATILITY
        
        # Trend check
        if abs(trend) > 0.02:  # 2% trend
            if trend > 0:
                return MarketRegime.TRENDING_UP
            else:
                return MarketRegime.TRENDING_DOWN
        
        # Breakout check (price near recent high/low with volume)
        recent_high = data['high'].tail(self.lookback).max()
        recent_low = data['low'].tail(self.lookback).min()
        current_close = data['close'].iloc[-1]
        
        if current_close >= recent_high * 0.99:
            return MarketRegime.BREAKOUT
        
        return MarketRegime.RANGING
    
    def _classify_time(self, dt: datetime) -> str:
        """Classify time of day for US markets."""
        hour = dt.hour
        if hour < 10:
            return "open"
        elif hour < 14:
            return "mid"
        elif hour < 16:
            return "close"
        else:
            return "after_hours"
    
    def _default_context(self) -> RegimeContext:
        """Return default context when data is insufficient."""
        return RegimeContext(
            regime=MarketRegime.UNKNOWN,
            horizon=TimeHorizon.INTRADAY,
            source=SignalSource.TECHNICAL,
            volatility_percentile=50.0,
            trend_strength=0.0,
            volume_regime="normal",
            time_of_day="mid",
            day_of_week=0
        )


# =============================================================================
# CAUSAL LEARNING ENGINE
# =============================================================================

@dataclass
class CausalOutcome:
    """Outcome with full causal context."""
    anomaly_id: str
    pattern_type: str
    symbol: str
    context: RegimeContext
    agent_decision: str
    user_action: str
    returns: Dict[str, float]  # {"15m": 0.01, "1h": 0.02, ...}
    was_profitable: bool
    timestamp: datetime
    
    # Causal attribution
    regime_contribution: float = 0.0  # How much regime explained outcome
    timing_contribution: float = 0.0  # How much timing explained outcome
    pattern_contribution: float = 0.0 # How much pattern itself explained outcome


class CausalLearner:
    """
    Learns causal relationships between signals and outcomes.
    
    Key insight: A signal's success depends on CONTEXT.
    
    We learn:
    1. Which regimes favor which signals
    2. Which time horizons work for which patterns
    3. Which signal combinations work together
    4. How confidence should decay over time
    """
    
    def __init__(self, decay_halflife_days: int = 30):
        self.decay_halflife = decay_halflife_days
        
        # Learned relationships
        # Key: "pattern_type|regime|horizon" -> success rate
        self.context_success: Dict[str, List[float]] = {}
        
        # Pattern success by regime
        # Key: "pattern_type|regime" -> [outcomes]
        self.regime_patterns: Dict[str, List[bool]] = {}
        
        # Temporal patterns
        # Key: "pattern_type|time_of_day|day_of_week" -> success rate
        self.temporal_patterns: Dict[str, List[bool]] = {}
        
        # Regime transition success
        # Key: "from_regime|to_regime|pattern" -> success rate
        self.regime_transitions: Dict[str, List[bool]] = {}
    
    def record_outcome(self, outcome: CausalOutcome):
        """
        Record an outcome with full causal context.
        
        This is where learning happens.
        """
        ctx = outcome.context
        pattern = outcome.pattern_type
        success = outcome.was_profitable
        
        # 1. Context-specific success
        context_key = f"{pattern}|{ctx.regime.value}|{ctx.horizon.value}"
        if context_key not in self.context_success:
            self.context_success[context_key] = []
        self.context_success[context_key].append(1.0 if success else 0.0)
        
        # 2. Regime-pattern relationship
        regime_key = f"{pattern}|{ctx.regime.value}"
        if regime_key not in self.regime_patterns:
            self.regime_patterns[regime_key] = []
        self.regime_patterns[regime_key].append(success)
        
        # 3. Temporal pattern
        temporal_key = f"{pattern}|{ctx.time_of_day}|{ctx.day_of_week}"
        if temporal_key not in self.temporal_patterns:
            self.temporal_patterns[temporal_key] = []
        self.temporal_patterns[temporal_key].append(success)
    
    def get_context_confidence(
        self, 
        pattern_type: str, 
        context: RegimeContext
    ) -> Tuple[float, str]:
        """
        Get confidence adjustment based on causal learning.
        
        Returns:
            Tuple of (confidence_multiplier, explanation)
        """
        ctx = context
        
        # Look up context-specific success rate
        context_key = f"{pattern_type}|{ctx.regime.value}|{ctx.horizon.value}"
        regime_key = f"{pattern_type}|{ctx.regime.value}"
        temporal_key = f"{pattern_type}|{ctx.time_of_day}|{ctx.day_of_week}"
        
        factors = []
        explanations = []
        
        # Context success factor
        if context_key in self.context_success:
            outcomes = self.context_success[context_key]
            if len(outcomes) >= 5:
                success_rate = self._weighted_mean(outcomes)
                factors.append(success_rate)
                if success_rate > 0.6:
                    explanations.append(f"Pattern works well in {ctx.regime.value} regime ({success_rate:.0%})")
                elif success_rate < 0.4:
                    explanations.append(f"Pattern struggles in {ctx.regime.value} regime ({success_rate:.0%})")
        
        # Regime factor
        if regime_key in self.regime_patterns:
            outcomes = self.regime_patterns[regime_key]
            if len(outcomes) >= 3:
                success_rate = self._weighted_mean([1.0 if o else 0.0 for o in outcomes])
                factors.append(success_rate)
        
        # Temporal factor
        if temporal_key in self.temporal_patterns:
            outcomes = self.temporal_patterns[temporal_key]
            if len(outcomes) >= 3:
                success_rate = self._weighted_mean([1.0 if o else 0.0 for o in outcomes])
                if success_rate > 0.7:
                    explanations.append(f"Good timing: {ctx.time_of_day} on day {ctx.day_of_week}")
                elif success_rate < 0.3:
                    explanations.append(f"Poor timing: {ctx.time_of_day} on day {ctx.day_of_week}")
        
        # Combine factors
        if not factors:
            return 1.0, "No historical context available"
        
        # Geometric mean of factors (so a 0.5 factor reduces confidence)
        combined = np.exp(np.mean(np.log(np.array(factors) + 0.1)))  # +0.1 to avoid log(0)
        
        explanation = "; ".join(explanations) if explanations else "Based on historical context"
        
        return combined, explanation
    
    def _weighted_mean(self, values: List[float]) -> float:
        """Calculate weighted mean with temporal decay."""
        if not values:
            return 0.5
        
        n = len(values)
        # Newer values get higher weight
        weights = [np.exp(-i / (n * 0.5)) for i in range(n)]
        weights = weights[::-1]  # Reverse so newest has highest weight
        
        return np.average(values, weights=weights)
    
    def get_regime_insights(self, pattern_type: str) -> Dict[str, dict]:
        """
        Get insights about how a pattern performs in different regimes.
        
        This is gold for explainability.
        """
        insights = {}
        
        for regime in MarketRegime:
            key = f"{pattern_type}|{regime.value}"
            if key in self.regime_patterns:
                outcomes = self.regime_patterns[key]
                if len(outcomes) >= 3:
                    success_rate = sum(outcomes) / len(outcomes)
                    insights[regime.value] = {
                        "success_rate": success_rate,
                        "sample_size": len(outcomes),
                        "recommendation": self._regime_recommendation(success_rate)
                    }
        
        return insights
    
    def _regime_recommendation(self, success_rate: float) -> str:
        """Generate recommendation based on success rate."""
        if success_rate >= 0.7:
            return "FAVORABLE - High confidence in this regime"
        elif success_rate >= 0.5:
            return "NEUTRAL - Standard confidence"
        elif success_rate >= 0.3:
            return "CAUTIOUS - Reduce position size"
        else:
            return "AVOID - Pattern historically fails here"
    
    def suggest_threshold_adjustment(
        self, 
        pattern_type: str, 
        context: RegimeContext,
        current_threshold: float
    ) -> Tuple[float, str]:
        """
        Suggest threshold adjustment based on causal learning.
        
        In favorable regimes: lower threshold (catch more signals)
        In unfavorable regimes: raise threshold (be more selective)
        """
        confidence, explanation = self.get_context_confidence(pattern_type, context)
        
        if confidence > 1.2:
            # Favorable context - lower threshold
            new_threshold = current_threshold * 0.9
            reason = f"Lowering threshold in favorable context: {explanation}"
        elif confidence < 0.8:
            # Unfavorable context - raise threshold
            new_threshold = current_threshold * 1.15
            reason = f"Raising threshold in unfavorable context: {explanation}"
        else:
            new_threshold = current_threshold
            reason = "Threshold unchanged - neutral context"
        
        # Bounds
        new_threshold = max(2.0, min(5.0, new_threshold))
        
        return new_threshold, reason


# =============================================================================
# CONFIDENCE DECAY
# =============================================================================

class ConfidenceDecay:
    """
    Implements temporal decay for confidence scores.
    
    Key insight: Older success should count less.
    Markets change. What worked 6 months ago may not work now.
    """
    
    def __init__(self, halflife_days: int = 30):
        self.halflife = halflife_days
    
    def decay_weight(self, days_ago: float) -> float:
        """
        Calculate decay weight for an outcome.
        
        Uses exponential decay: weight = 0.5^(days/halflife)
        
        Examples (with 30-day halflife):
            - Today: weight = 1.0
            - 30 days ago: weight = 0.5
            - 60 days ago: weight = 0.25
            - 90 days ago: weight = 0.125
        """
        return 0.5 ** (days_ago / self.halflife)
    
    def weighted_success_rate(
        self, 
        outcomes: List[Tuple[datetime, bool]]
    ) -> float:
        """
        Calculate success rate with temporal decay.
        
        Args:
            outcomes: List of (timestamp, was_successful) tuples
        
        Returns:
            Decay-weighted success rate
        """
        if not outcomes:
            return 0.5  # Prior: 50%
        
        now = datetime.now()
        weighted_sum = 0.0
        total_weight = 0.0
        
        for timestamp, success in outcomes:
            days_ago = (now - timestamp).total_seconds() / 86400
            weight = self.decay_weight(days_ago)
            
            weighted_sum += weight * (1.0 if success else 0.0)
            total_weight += weight
        
        if total_weight == 0:
            return 0.5
        
        return weighted_sum / total_weight

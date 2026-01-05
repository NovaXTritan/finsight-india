"""
Enhanced Decision Agent - With Real Authority

Key upgrade: Agent is a DECISION-MAKER, not just an analyst.

Decision States:
- IGNORE: Don't show to user
- MONITOR: Add to watchlist, no action
- REVIEW: Needs human attention
- EXECUTE: High confidence, simulate/alert

The agent can:
- Reject its own signals
- Request more data
- Downgrade confidence
- Escalate to human review
"""
import json
import requests
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from enum import Enum
import numpy as np

import config
from config import PatternQuality
from learning.causal_learner import (
    CausalLearner, RegimeDetector, RegimeContext, 
    MarketRegime, ConfidenceDecay
)


# =============================================================================
# ENHANCED DECISION STATES
# =============================================================================

class DecisionState(str, Enum):
    """
    Agent decision states with clear authority levels.
    
    This is what separates an agent from an analyst.
    """
    IGNORE = "IGNORE"       # Signal rejected - don't show
    MONITOR = "MONITOR"     # Add to watchlist - passive tracking
    REVIEW = "REVIEW"       # Needs human attention - show alert
    EXECUTE = "EXECUTE"     # High confidence - simulate trade / send alert


class RejectionReason(str, Enum):
    """Why the agent rejected a signal."""
    LOW_CONFIDENCE = "low_confidence"
    UNFAVORABLE_REGIME = "unfavorable_regime"
    POOR_HISTORY = "poor_history"
    INSUFFICIENT_DATA = "insufficient_data"
    CONFLICTING_SIGNALS = "conflicting_signals"
    TIMING = "timing"


class EscalationReason(str, Enum):
    """Why the agent escalated to human."""
    HIGH_UNCERTAINTY = "high_uncertainty"
    REGIME_CHANGE = "regime_change"
    UNUSUAL_PATTERN = "unusual_pattern"
    CONFLICTING_EVIDENCE = "conflicting_evidence"
    FIRST_OCCURRENCE = "first_occurrence"


# =============================================================================
# COMPOSITE CONFIDENCE SCORING
# =============================================================================

@dataclass
class CompositeConfidence:
    """
    Multi-dimensional confidence score.
    
    This is how hedge funds think about certainty.
    """
    # Individual components (0-1)
    statistical: float      # Signal strength (z-score normalized)
    behavioral: float       # Historical user reliability
    regime: float           # Has this worked in current regime?
    data_quality: float     # Data completeness/freshness
    
    # Uncertainty penalty (0-1, lower is better)
    uncertainty: float
    
    # Final composite (calculated)
    composite: float = 0.0
    
    # Explanation
    breakdown: str = ""
    
    def __post_init__(self):
        """Calculate composite score."""
        # Weighted combination
        weights = {
            "statistical": 0.25,
            "behavioral": 0.30,
            "regime": 0.25,
            "data_quality": 0.20
        }
        
        raw_score = (
            weights["statistical"] * self.statistical +
            weights["behavioral"] * self.behavioral +
            weights["regime"] * self.regime +
            weights["data_quality"] * self.data_quality
        )
        
        # Apply uncertainty penalty
        self.composite = raw_score * (1 - self.uncertainty * 0.5)
        
        # Generate breakdown
        self.breakdown = self._generate_breakdown()
    
    def _generate_breakdown(self) -> str:
        """Human-readable confidence breakdown."""
        parts = []
        
        if self.statistical >= 0.7:
            parts.append(f"Strong signal ({self.statistical:.0%})")
        elif self.statistical < 0.4:
            parts.append(f"Weak signal ({self.statistical:.0%})")
        
        if self.behavioral >= 0.7:
            parts.append(f"Good history ({self.behavioral:.0%})")
        elif self.behavioral < 0.4:
            parts.append(f"Poor history ({self.behavioral:.0%})")
        
        if self.regime >= 0.7:
            parts.append("Favorable regime")
        elif self.regime < 0.4:
            parts.append("Unfavorable regime")
        
        if self.uncertainty >= 0.3:
            parts.append(f"High uncertainty ({self.uncertainty:.0%})")
        
        return "; ".join(parts) if parts else "Balanced confidence"


class ConfidenceCalculator:
    """
    Calculates composite confidence from multiple signals.
    """
    
    def __init__(
        self, 
        causal_learner: CausalLearner = None,
        decay: ConfidenceDecay = None
    ):
        self.causal = causal_learner or CausalLearner()
        self.decay = decay or ConfidenceDecay()
    
    def calculate(
        self,
        z_score: float,
        pattern_type: str,
        context: RegimeContext,
        history: Optional[PatternQuality] = None,
        data_points: int = 0,
        conflicting_signals: int = 0
    ) -> CompositeConfidence:
        """
        Calculate composite confidence score.
        
        Args:
            z_score: Statistical signal strength
            pattern_type: Type of pattern detected
            context: Current market regime context
            history: User's historical performance with this pattern
            data_points: Number of data points used
            conflicting_signals: Number of conflicting signals present
        
        Returns:
            CompositeConfidence with full breakdown
        """
        # 1. Statistical confidence (normalize z-score to 0-1)
        # z=2 -> 0.4, z=3 -> 0.6, z=4 -> 0.8, z=5 -> 1.0
        statistical = min(1.0, max(0.0, (z_score - 1) / 4))
        
        # 2. Behavioral confidence (from user history)
        if history and history.sample_size >= 5:
            # Weight by accuracy and trade rate
            behavioral = (
                0.6 * history.accuracy +
                0.2 * history.trade_rate +
                0.2 * history.agent_accuracy
            )
        else:
            behavioral = 0.5  # Prior: neutral
        
        # 3. Regime confidence (from causal learning)
        regime_mult, _ = self.causal.get_context_confidence(pattern_type, context)
        regime = min(1.0, max(0.0, regime_mult))
        
        # 4. Data quality
        if data_points >= 50:
            data_quality = 1.0
        elif data_points >= 30:
            data_quality = 0.8
        elif data_points >= 20:
            data_quality = 0.6
        else:
            data_quality = 0.4
        
        # 5. Uncertainty penalty
        uncertainty = 0.0
        
        # Unknown regime increases uncertainty
        if context.regime == MarketRegime.UNKNOWN:
            uncertainty += 0.2
        
        # Low sample size increases uncertainty
        if history is None or history.sample_size < 10:
            uncertainty += 0.15
        
        # Conflicting signals increase uncertainty
        if conflicting_signals > 0:
            uncertainty += 0.1 * min(conflicting_signals, 3)
        
        # High volatility increases uncertainty
        if context.volatility_percentile > 80:
            uncertainty += 0.1
        
        uncertainty = min(1.0, uncertainty)
        
        return CompositeConfidence(
            statistical=statistical,
            behavioral=behavioral,
            regime=regime,
            data_quality=data_quality,
            uncertainty=uncertainty
        )


# =============================================================================
# ENHANCED DECISION AGENT
# =============================================================================

@dataclass
class EnhancedDecision:
    """Decision with full context and authority."""
    state: DecisionState
    confidence: CompositeConfidence
    
    # Action details
    reason: str
    risk_assessment: str
    
    # Agent authority actions
    rejected: bool = False
    rejection_reason: Optional[RejectionReason] = None
    escalated: bool = False
    escalation_reason: Optional[EscalationReason] = None
    requested_more_data: bool = False
    
    # Invalidation condition (when would this be wrong?)
    invalidation: str = ""
    
    # Signal story for humans
    story: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            "state": self.state.value,
            "confidence": {
                "composite": self.confidence.composite,
                "statistical": self.confidence.statistical,
                "behavioral": self.confidence.behavioral,
                "regime": self.confidence.regime,
                "uncertainty": self.confidence.uncertainty,
                "breakdown": self.confidence.breakdown
            },
            "reason": self.reason,
            "risk_assessment": self.risk_assessment,
            "rejected": self.rejected,
            "rejection_reason": self.rejection_reason.value if self.rejection_reason else None,
            "escalated": self.escalated,
            "escalation_reason": self.escalation_reason.value if self.escalation_reason else None,
            "invalidation": self.invalidation,
            "story": self.story
        }


class EnhancedAgent:
    """
    Decision agent with real authority.
    
    Key capabilities:
    1. Reject signals it doesn't trust
    2. Request more data when uncertain
    3. Escalate to human review when appropriate
    4. Provide invalidation conditions
    5. Generate human-readable signal stories
    """
    
    def __init__(
        self,
        base_url: str = None,
        causal_learner: CausalLearner = None,
        regime_detector: RegimeDetector = None
    ):
        self.base_url = base_url or config.LM_STUDIO_URL
        self.model = config.LM_STUDIO_MODEL
        self._available = None
        
        # Learning components
        self.causal = causal_learner or CausalLearner()
        self.regime_detector = regime_detector or RegimeDetector()
        self.confidence_calc = ConfidenceCalculator(self.causal)
        
        # Statistics
        self.stats = {
            "total_decisions": 0,
            "rejected": 0,
            "escalated": 0,
            "by_state": {s.value: 0 for s in DecisionState}
        }
    
    def is_available(self) -> bool:
        """Check if LM Studio is running."""
        if self._available is not None:
            return self._available
        
        try:
            resp = requests.get(f"{self.base_url}/models", timeout=5)
            self._available = resp.status_code == 200
        except:
            self._available = False
        
        return self._available
    
    def decide(
        self,
        anomaly: dict,
        data: Optional[dict] = None,
        history: Optional[PatternQuality] = None,
        context: Optional[RegimeContext] = None
    ) -> EnhancedDecision:
        """
        Make authoritative decision on anomaly.
        
        The agent can:
        - Accept and classify (IGNORE/MONITOR/REVIEW/EXECUTE)
        - Reject with reason
        - Escalate to human
        - Request more data
        """
        self.stats["total_decisions"] += 1
        
        # Get context if not provided
        if context is None:
            context = self.regime_detector._default_context()
        
        # Calculate composite confidence
        confidence = self.confidence_calc.calculate(
            z_score=anomaly.get("z_score", 2.0),
            pattern_type=anomaly.get("type", "unknown"),
            context=context,
            history=history,
            data_points=data.get("data_points", 0) if data else 0,
            conflicting_signals=data.get("conflicting_signals", 0) if data else 0
        )
        
        # Decision logic with authority
        decision = self._make_decision(anomaly, confidence, context, history)
        
        # Track stats
        self.stats["by_state"][decision.state.value] += 1
        if decision.rejected:
            self.stats["rejected"] += 1
        if decision.escalated:
            self.stats["escalated"] += 1
        
        # Generate signal story
        decision.story = self._generate_story(anomaly, confidence, context, decision)
        
        return decision
    
    def _make_decision(
        self,
        anomaly: dict,
        confidence: CompositeConfidence,
        context: RegimeContext,
        history: Optional[PatternQuality]
    ) -> EnhancedDecision:
        """
        Core decision logic with rejection/escalation authority.
        """
        z = anomaly.get("z_score", 2.0)
        pattern = anomaly.get("type", "unknown")
        
        # === REJECTION CHECKS (Agent exercises authority to reject) ===
        
        # Reject: Poor historical performance
        if history and history.sample_size >= 15 and history.accuracy < 0.25:
            return EnhancedDecision(
                state=DecisionState.IGNORE,
                confidence=confidence,
                reason=f"Rejected: Pattern has {history.accuracy:.0%} accuracy over {history.sample_size} samples",
                risk_assessment="Low risk - historically unreliable pattern",
                rejected=True,
                rejection_reason=RejectionReason.POOR_HISTORY,
                invalidation="Would reconsider if next 5 signals show >50% success"
            )
        
        # Reject: Unfavorable regime with low z-score
        if context.regime != MarketRegime.UNKNOWN:
            regime_conf, _ = self.causal.get_context_confidence(pattern, context)
            if regime_conf < 0.4 and z < 3.5:
                return EnhancedDecision(
                    state=DecisionState.IGNORE,
                    confidence=confidence,
                    reason=f"Rejected: Pattern underperforms in {context.regime.value} regime",
                    risk_assessment="Low risk - regime unfavorable",
                    rejected=True,
                    rejection_reason=RejectionReason.UNFAVORABLE_REGIME,
                    invalidation=f"Would reconsider if regime changes or z-score exceeds 4.0"
                )
        
        # Reject: Insufficient data
        if confidence.data_quality < 0.5:
            return EnhancedDecision(
                state=DecisionState.IGNORE,
                confidence=confidence,
                reason="Rejected: Insufficient data for reliable signal",
                risk_assessment="Unknown risk - data quality too low",
                rejected=True,
                rejection_reason=RejectionReason.INSUFFICIENT_DATA,
                requested_more_data=True,
                invalidation="Need at least 30 data points for analysis"
            )
        
        # === ESCALATION CHECKS (Agent defers to human) ===
        
        # Escalate: High uncertainty
        if confidence.uncertainty >= 0.4:
            return EnhancedDecision(
                state=DecisionState.REVIEW,
                confidence=confidence,
                reason=f"Escalated: High uncertainty ({confidence.uncertainty:.0%})",
                risk_assessment="Uncertain - human judgment needed",
                escalated=True,
                escalation_reason=EscalationReason.HIGH_UNCERTAINTY,
                invalidation="Uncertainty factors: " + confidence.breakdown
            )
        
        # Escalate: First occurrence of this context combination
        context_key = f"{pattern}|{context.regime.value}"
        if context_key not in self.causal.regime_patterns:
            return EnhancedDecision(
                state=DecisionState.REVIEW,
                confidence=confidence,
                reason=f"Escalated: First time seeing {pattern} in {context.regime.value} regime",
                risk_assessment="Unknown - no historical precedent",
                escalated=True,
                escalation_reason=EscalationReason.FIRST_OCCURRENCE,
                invalidation="Need human input to establish baseline"
            )
        
        # === STANDARD DECISION STATES ===
        
        composite = confidence.composite
        
        # EXECUTE: Very high confidence + favorable conditions
        if composite >= 0.75 and z >= 4.0:
            return EnhancedDecision(
                state=DecisionState.EXECUTE,
                confidence=confidence,
                reason=f"High confidence signal: {confidence.breakdown}",
                risk_assessment=self._assess_risk(z, context),
                invalidation=f"Invalid if price retraces >2% or regime shifts to {self._opposite_regime(context.regime)}"
            )
        
        # REVIEW: Medium-high confidence
        if composite >= 0.55:
            return EnhancedDecision(
                state=DecisionState.REVIEW,
                confidence=confidence,
                reason=f"Worth reviewing: {confidence.breakdown}",
                risk_assessment=self._assess_risk(z, context),
                invalidation=f"Skip if volume normalizes or z-score drops below 2.5"
            )
        
        # MONITOR: Low-medium confidence but worth watching
        if composite >= 0.35 and z >= 2.5:
            return EnhancedDecision(
                state=DecisionState.MONITOR,
                confidence=confidence,
                reason=f"Added to watchlist: {confidence.breakdown}",
                risk_assessment="Low priority - monitor for confirmation",
                invalidation="Upgrade to REVIEW if z-score exceeds 3.5"
            )
        
        # IGNORE: Low confidence
        return EnhancedDecision(
            state=DecisionState.IGNORE,
            confidence=confidence,
            reason=f"Below threshold: {confidence.breakdown}",
            risk_assessment="Minimal risk in ignoring",
            invalidation="Would reconsider with stronger signal"
        )
    
    def _assess_risk(self, z_score: float, context: RegimeContext) -> str:
        """Generate risk assessment."""
        risks = []
        
        if context.volatility_percentile > 70:
            risks.append("high volatility environment")
        
        if context.volume_regime == "low":
            risks.append("low volume may cause slippage")
        
        if context.time_of_day in ["open", "close"]:
            risks.append(f"{context.time_of_day} session - higher noise")
        
        if z_score > 5:
            risks.append("extreme signal may indicate data issue")
        
        if not risks:
            return "Standard risk profile"
        
        return "Risks: " + ", ".join(risks)
    
    def _opposite_regime(self, regime: MarketRegime) -> str:
        """Get opposite regime for invalidation condition."""
        opposites = {
            MarketRegime.TRENDING_UP: "trending_down",
            MarketRegime.TRENDING_DOWN: "trending_up",
            MarketRegime.HIGH_VOLATILITY: "low_volatility",
            MarketRegime.LOW_VOLATILITY: "high_volatility",
            MarketRegime.RANGING: "breakout",
            MarketRegime.BREAKOUT: "ranging",
        }
        return opposites.get(regime, "unknown")
    
    def _generate_story(
        self,
        anomaly: dict,
        confidence: CompositeConfidence,
        context: RegimeContext,
        decision: EnhancedDecision
    ) -> Dict[str, str]:
        """
        Generate human-readable signal story.
        
        Format:
        - Context: What's happening in the market
        - Trigger: Why this signal, why now
        - Risk: What could go wrong
        - Invalidation: What would make this wrong
        """
        symbol = anomaly.get("symbol", "Unknown")
        pattern = anomaly.get("type", "unknown")
        z = anomaly.get("z_score", 0)
        
        # Context
        context_story = f"{symbol} is in a {context.regime.value.replace('_', ' ')} market "
        context_story += f"with {context.volume_regime} volume. "
        context_story += f"Volatility is in the {context.volatility_percentile:.0f}th percentile."
        
        # Trigger
        trigger_story = f"Detected {pattern.replace('_', ' ')} with z-score {z:.1f}. "
        if confidence.behavioral >= 0.6:
            trigger_story += f"This pattern has worked well for you historically ({confidence.behavioral:.0%} reliability)."
        elif confidence.behavioral <= 0.4:
            trigger_story += f"Note: This pattern has mixed results in your history ({confidence.behavioral:.0%} reliability)."
        
        # Risk
        risk_story = decision.risk_assessment
        
        # Invalidation
        invalidation_story = decision.invalidation
        
        return {
            "context": context_story,
            "trigger": trigger_story,
            "risk": risk_story,
            "invalidation": invalidation_story
        }
    
    def print_stats(self):
        """Print agent decision statistics."""
        print("""
+==============================================================+
|           ENHANCED AGENT STATISTICS                          |
+==============================================================+""")
        print(f"| Total Decisions:      {self.stats['total_decisions']:>6}                            |")
        print(f"| Rejected (authority): {self.stats['rejected']:>6} ({self.stats['rejected']/max(1,self.stats['total_decisions'])*100:>5.1f}%)               |")
        print(f"| Escalated to human:   {self.stats['escalated']:>6} ({self.stats['escalated']/max(1,self.stats['total_decisions'])*100:>5.1f}%)               |")
        print("+--------------------------------------------------------------+")
        print("| Decision Distribution:                                       |")
        for state, count in self.stats["by_state"].items():
            pct = count / max(1, self.stats["total_decisions"]) * 100
            bar = "#" * int(pct / 5)
            print(f"|   {state:<8}: {count:>4} ({pct:>5.1f}%) {bar:<20}      |")
        print("+==============================================================+")


def get_enhanced_agent(
    base_url: str = None,
    causal_learner: CausalLearner = None
) -> EnhancedAgent:
    """Factory function for enhanced agent."""
    return EnhancedAgent(base_url, causal_learner)

"""
LM Studio Agent - Local LLM for decision making.

Decisions: IGNORE | REVIEW | ALERT

Rules:
- IGNORE: Pattern failed >70% historically, or low z-score
- REVIEW: Uncertain, worth checking
- ALERT: High confidence + high historical accuracy
"""
import json
import requests
from typing import Optional
from dataclasses import dataclass

import config
from config import AgentDecision, Decision, PatternQuality

class LMStudioAgent:
    """
    Decision agent using local LLM via LM Studio.
    
    Cost: FREE (runs locally)
    
    Setup:
    1. Download LM Studio from https://lmstudio.ai/
    2. Download a model (Llama 3.2 3B Instruct recommended)
    3. Start server on port 1234
    """
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or config.LM_STUDIO_URL
        self.model = config.LM_STUDIO_MODEL
        self._available = None
        
        # Stats
        self.stats = {
            "total_decisions": 0,
            "rule_based": 0,
            "llm_calls": 0,
            "decisions": {"IGNORE": 0, "REVIEW": 0, "ALERT": 0}
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
        context: dict,
        history: Optional[PatternQuality] = None
    ) -> AgentDecision:
        """
        Make decision on anomaly.
        
        Args:
            anomaly: {type, symbol, severity, z_score, price, volume}
            context: {news, sector_move, calendar}
            history: User's historical pattern quality
        
        Returns:
            AgentDecision with action, confidence, reason
        """
        self.stats["total_decisions"] += 1
        
        # Rule-based filtering (saves LLM calls)
        rule_decision = self._rule_based_filter(anomaly, history)
        if rule_decision:
            self.stats["rule_based"] += 1
            self.stats["decisions"][rule_decision.action.value] += 1
            return rule_decision
        
        # Use LLM for uncertain cases
        if not self.is_available():
            # Fallback to simple heuristic
            return self._heuristic_decision(anomaly, history)
        
        self.stats["llm_calls"] += 1
        
        # Build prompt
        history_text = ""
        if history:
            history_text = f"""
Historical pattern quality for {anomaly['type']} on {anomaly['symbol']}:
- Accuracy: {history.accuracy*100:.0f}%
- You review: {history.review_rate*100:.0f}% of these
- You trade: {history.trade_rate*100:.0f}% when reviewed
- Average return: {history.avg_return*100:.2f}%
- Sample size: {history.sample_size}
"""
        
        prompt = f"""You are a trading signal quality agent. Decide if this anomaly deserves human attention.

Anomaly:
- Symbol: {anomaly['symbol']}
- Type: {anomaly['type']}
- Severity: {anomaly['severity']}
- Z-Score: {anomaly['z_score']}
- Price: ${anomaly['price']:.2f}
- Volume: {anomaly['volume']:,}
{history_text}

Decision rules:
- IGNORE: Pattern accuracy <30%, or z-score <2.5, or user rarely trades this
- REVIEW: Uncertain, moderate z-score, worth checking
- ALERT: High z-score (>4), good historical accuracy (>50%), user often trades

Respond ONLY with valid JSON:
{{"decision": "IGNORE" or "REVIEW" or "ALERT", "confidence": 0.0-1.0, "reason": "one sentence max", "risk_if_ignored": "low" or "medium" or "high"}}
"""
        
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": config.TEMPERATURE,
                    "max_tokens": config.MAX_TOKENS
                },
                timeout=30
            )
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Parse JSON from response
            # Handle potential markdown code blocks
            content = content.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            
            decision_data = json.loads(content)
            
            decision = AgentDecision(
                action=Decision(decision_data["decision"]),
                confidence=float(decision_data["confidence"]),
                reason=decision_data["reason"],
                risk_if_ignored=decision_data.get("risk_if_ignored", "medium")
            )
            
            self.stats["decisions"][decision.action.value] += 1
            return decision
            
        except Exception as e:
            print(f"  LLM error: {e}")
            return self._heuristic_decision(anomaly, history)
    
    def _rule_based_filter(
        self, 
        anomaly: dict, 
        history: Optional[PatternQuality]
    ) -> Optional[AgentDecision]:
        """Quick rule-based filtering to save LLM calls."""
        
        z = anomaly["z_score"]
        
        # Very low z-score -> always ignore
        if z < 2.0:
            return AgentDecision(
                action=Decision.IGNORE,
                confidence=0.95,
                reason="Z-score too low to be significant",
                risk_if_ignored="low"
            )
        
        # Very high z-score without bad history -> always alert
        if z >= 5.0:
            if not history or history.accuracy >= 0.3:
                return AgentDecision(
                    action=Decision.ALERT,
                    confidence=0.9,
                    reason=f"Very high z-score ({z:.1f}σ) - significant anomaly",
                    risk_if_ignored="high"
                )
        
        # Bad historical accuracy -> ignore
        if history and history.sample_size >= 10 and history.accuracy < 0.2:
            return AgentDecision(
                action=Decision.IGNORE,
                confidence=0.85,
                reason=f"This pattern has only {history.accuracy*100:.0f}% historical accuracy",
                risk_if_ignored="low"
            )
        
        # Let LLM handle uncertain cases
        return None
    
    def _heuristic_decision(
        self, 
        anomaly: dict, 
        history: Optional[PatternQuality]
    ) -> AgentDecision:
        """Fallback heuristic when LLM unavailable."""
        z = anomaly["z_score"]
        
        if z >= 4.0:
            action = Decision.ALERT
            confidence = 0.7
        elif z >= 3.0:
            action = Decision.REVIEW
            confidence = 0.6
        else:
            action = Decision.IGNORE
            confidence = 0.5
        
        self.stats["decisions"][action.value] += 1
        
        return AgentDecision(
            action=action,
            confidence=confidence,
            reason=f"Heuristic: z={z:.1f}",
            risk_if_ignored="medium" if z >= 3 else "low"
        )
    
    def print_stats(self):
        """Print agent statistics."""
        print("""
╔══════════════════════════════════════╗
║  LM STUDIO AGENT STATISTICS          ║
╠══════════════════════════════════════╣""")
        print(f"║ Total Decisions:    {self.stats['total_decisions']:>6}          ║")
        print(f"║ Rule-Based:         {self.stats['rule_based']:>6} ({self.stats['rule_based']/max(1,self.stats['total_decisions'])*100:.1f}%)    ║")
        print(f"║ LLM Calls:          {self.stats['llm_calls']:>6}          ║")
        print(f"║ Cost: FREE                           ║")
        print("╠──────────────────────────────────────╣")
        for decision, count in self.stats["decisions"].items():
            pct = count / max(1, self.stats["total_decisions"]) * 100
            print(f"║ {decision}:           {count:>6} ({pct:.1f}%)    ║")
        print("╚══════════════════════════════════════╝")


def get_agent(base_url: str = None) -> LMStudioAgent:
    """Factory function to get agent instance."""
    return LMStudioAgent(base_url)

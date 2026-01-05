"""
Adaptive Learning - Improve detection thresholds based on outcomes.
"""
from typing import Dict, List, Tuple
from datetime import datetime, timedelta

import config
from database.db import Database

class AdaptiveLearner:
    """
    Uses outcome data to improve detection over time.
    
    Adjusts:
    - Z-score thresholds per pattern per symbol
    - Decision rules based on user behavior
    """
    
    def __init__(self, db: Database):
        self.db = db
    
    async def analyze_and_adapt(self, user_id: str) -> Dict[str, any]:
        """
        Analyze recent outcomes and suggest threshold adjustments.
        
        Returns:
            Dict with adjustments and insights
        """
        insights = {
            "patterns": [],
            "adjustments": [],
            "summary": ""
        }
        
        async with self.db.pool.acquire() as conn:
            # Get pattern quality scores
            patterns = await conn.fetch("""
                SELECT * FROM pattern_quality
                WHERE user_id = $1 AND sample_size >= 5
                ORDER BY sample_size DESC
            """, user_id)
            
            for pattern in patterns:
                pattern_insight = self._analyze_pattern(pattern)
                insights["patterns"].append(pattern_insight)
                
                # Suggest adjustment if needed
                adjustment = self._suggest_adjustment(pattern)
                if adjustment:
                    insights["adjustments"].append(adjustment)
                    
                    # Apply adjustment
                    await conn.execute("""
                        INSERT INTO detection_thresholds
                        (user_id, pattern_type, symbol, z_score_threshold, reason)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (user_id, pattern_type, symbol) DO UPDATE SET
                            z_score_threshold = $4,
                            reason = $5,
                            updated_at = NOW()
                    """, user_id, pattern["pattern_type"], pattern["symbol"],
                        adjustment["new_threshold"], adjustment["reason"])
        
        # Generate summary
        n_adj = len(insights["adjustments"])
        if n_adj > 0:
            insights["summary"] = f"Made {n_adj} threshold adjustments based on {len(patterns)} patterns analyzed."
        else:
            insights["summary"] = f"Analyzed {len(patterns)} patterns. No adjustments needed."
        
        return insights
    
    def _analyze_pattern(self, pattern: dict) -> dict:
        """Analyze a single pattern's quality."""
        return {
            "pattern_type": pattern["pattern_type"],
            "symbol": pattern["symbol"],
            "accuracy": f"{pattern['accuracy']*100:.1f}%",
            "sample_size": pattern["sample_size"],
            "agent_accuracy": f"{pattern['agent_accuracy']*100:.1f}%",
            "user_engagement": f"{pattern['review_rate']*100:.1f}% reviewed, {pattern['trade_rate']*100:.1f}% traded",
            "avg_return": f"{pattern['avg_return']*100:.2f}%"
        }
    
    def _suggest_adjustment(self, pattern: dict) -> dict:
        """Suggest threshold adjustment based on pattern quality."""
        
        # Get current threshold
        current = config.DETECTION_THRESHOLDS.get(
            pattern["pattern_type"], {}
        ).get("z_score", 3.0)
        
        accuracy = pattern["accuracy"]
        sample_size = pattern["sample_size"]
        
        # Not enough data
        if sample_size < 10:
            return None
        
        # Low accuracy -> raise threshold (fewer signals)
        if accuracy < 0.3:
            return {
                "pattern_type": pattern["pattern_type"],
                "symbol": pattern["symbol"],
                "old_threshold": current,
                "new_threshold": min(current + 0.5, 5.0),
                "reason": f"Low accuracy ({accuracy*100:.0f}%) - raising threshold to reduce noise"
            }
        
        # High accuracy + high review rate -> lower threshold (more signals)
        if accuracy > 0.6 and pattern["review_rate"] > 0.5:
            return {
                "pattern_type": pattern["pattern_type"],
                "symbol": pattern["symbol"],
                "old_threshold": current,
                "new_threshold": max(current - 0.3, 2.0),
                "reason": f"High accuracy ({accuracy*100:.0f}%) and engagement - lowering threshold"
            }
        
        return None
    
    async def get_user_thresholds(self, user_id: str) -> Dict[str, Dict[str, float]]:
        """Get personalized thresholds for user."""
        thresholds = {}
        
        async with self.db.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT pattern_type, symbol, z_score_threshold
                FROM detection_thresholds
                WHERE user_id = $1
            """, user_id)
            
            for row in rows:
                key = f"{row['pattern_type']}_{row['symbol']}"
                thresholds[key] = row["z_score_threshold"]
        
        return thresholds

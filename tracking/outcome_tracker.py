"""
Outcome Tracker - Track what happens after each anomaly.

This is the data that makes FinSight better over time.
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional
from functools import partial
import yfinance as yf

import config
from database.db import Database


def _fetch_price_sync(symbol: str) -> Optional[float]:
    """
    Synchronous price fetch - runs in thread pool to avoid blocking event loop.
    """
    try:
        ticker = yf.Ticker(symbol)
        return ticker.info.get("regularMarketPrice")
    except Exception:
        return None

class OutcomeTracker:
    """
    Tracks outcomes for each anomaly:
    1. Forward returns (15m, 1h, 4h, 1d)
    2. User action (ignored, reviewed, traded)
    3. Whether signal was profitable
    4. Whether agent decision was correct
    """
    
    def __init__(self, db: Database, intervals: list = None):
        self.db = db
        self.intervals = intervals or config.OUTCOME_INTERVALS
        self.tracking_tasks: Dict[str, asyncio.Task] = {}
    
    async def start_tracking(
        self,
        anomaly_id: str,
        user_id: str,
        symbol: str,
        entry_price: float,
        agent_decision: str,
        agent_confidence: float
    ):
        """Start tracking outcomes for an anomaly."""
        task = asyncio.create_task(
            self._track_outcome(
                anomaly_id, user_id, symbol, entry_price,
                agent_decision, agent_confidence
            )
        )
        self.tracking_tasks[anomaly_id] = task
    
    async def _track_outcome(
        self,
        anomaly_id: str,
        user_id: str,
        symbol: str,
        entry_price: float,
        agent_decision: str,
        agent_confidence: float
    ):
        """Track forward returns at each interval."""
        returns = {}

        for interval_name, seconds in self.intervals:
            await asyncio.sleep(seconds)

            try:
                # Get current price - run in thread pool to avoid blocking event loop
                loop = asyncio.get_event_loop()
                current_price = await loop.run_in_executor(
                    None,  # Use default thread pool
                    _fetch_price_sync,
                    symbol
                )

                if current_price:
                    ret = (current_price - entry_price) / entry_price
                    returns[f"return_{interval_name}"] = ret
                    print(f"  📊 {symbol} {interval_name}: {ret*100:+.2f}%")
            except Exception as e:
                print(f"  ⚠️  Error tracking {symbol} at {interval_name}: {e}")
        
        # Get user action (default to ignored if no action logged)
        user_action = await self._get_user_action(anomaly_id, user_id)
        
        # Determine if profitable
        best_return = max(returns.values()) if returns else 0
        was_profitable = best_return >= config.PROFITABLE_THRESHOLD
        
        # Determine if agent was correct
        agent_correct = self._evaluate_agent(
            agent_decision, user_action, was_profitable
        )
        
        # Save outcome
        async with self.db.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO anomaly_outcomes
                (anomaly_id, user_id, agent_decision, agent_confidence,
                 user_action, return_15m, return_1h, return_4h, return_1d,
                 was_profitable, agent_correct)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """,
                anomaly_id, user_id, agent_decision, agent_confidence,
                user_action,
                returns.get("return_15m"),
                returns.get("return_1h"),
                returns.get("return_4h"),
                returns.get("return_1d"),
                was_profitable,
                agent_correct
            )
        
        # Update pattern quality
        await self._update_pattern_quality(anomaly_id, user_id)
        
        # Cleanup
        self.tracking_tasks.pop(anomaly_id, None)
    
    async def _get_user_action(self, anomaly_id: str, user_id: str) -> str:
        """Get user action or default to ignored."""
        async with self.db.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT action FROM user_actions
                WHERE anomaly_id = $1 AND user_id = $2
                ORDER BY timestamp DESC LIMIT 1
            """, anomaly_id, user_id)
            
            return row["action"] if row else "ignored"
    
    def _evaluate_agent(
        self, 
        agent_decision: str, 
        user_action: str,
        was_profitable: bool
    ) -> bool:
        """Evaluate if agent decision was correct."""
        # Agent said IGNORE
        if agent_decision == "IGNORE":
            # Correct if signal wasn't profitable anyway
            return not was_profitable
        
        # Agent said REVIEW or ALERT
        else:
            # Correct if user acted AND it was profitable
            if user_action in ["reviewed", "traded"]:
                return was_profitable
            # Correct if user ignored AND it wasn't profitable
            return not was_profitable
    
    async def _update_pattern_quality(self, anomaly_id: str, user_id: str):
        """Recalculate pattern quality metrics."""
        async with self.db.pool.acquire() as conn:
            # Get anomaly details
            anomaly = await conn.fetchrow("""
                SELECT pattern_type, symbol FROM anomalies WHERE id = $1
            """, anomaly_id)
            
            if not anomaly:
                return
            
            pattern_type = anomaly["pattern_type"]
            symbol = anomaly["symbol"]
            
            # Calculate metrics from outcomes
            stats = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as sample_size,
                    AVG(CASE WHEN was_profitable THEN 1.0 ELSE 0.0 END) as accuracy,
                    AVG(CASE WHEN user_action = 'reviewed' OR user_action = 'traded' THEN 1.0 ELSE 0.0 END) as review_rate,
                    AVG(CASE WHEN user_action = 'traded' THEN 1.0 ELSE 0.0 END) as trade_rate,
                    AVG(COALESCE(return_1d, return_4h, return_1h, 0)) as avg_return,
                    AVG(CASE WHEN agent_correct THEN 1.0 ELSE 0.0 END) as agent_accuracy
                FROM anomaly_outcomes ao
                JOIN anomalies a ON ao.anomaly_id = a.id
                WHERE ao.user_id = $1 AND a.pattern_type = $2 AND a.symbol = $3
            """, user_id, pattern_type, symbol)
            
            if stats and stats["sample_size"] > 0:
                await self.db.update_pattern_quality(
                    user_id=user_id,
                    pattern_type=pattern_type,
                    symbol=symbol,
                    accuracy=float(stats["accuracy"] or 0),
                    review_rate=float(stats["review_rate"] or 0),
                    trade_rate=float(stats["trade_rate"] or 0),
                    avg_return=float(stats["avg_return"] or 0),
                    sample_size=int(stats["sample_size"]),
                    agent_accuracy=float(stats["agent_accuracy"] or 0)
                )

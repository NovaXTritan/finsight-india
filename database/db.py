"""
Database operations for FinSight.
"""
import asyncpg
from typing import Optional
from datetime import datetime

import config

class Database:
    """Async PostgreSQL database handler."""
    
    def __init__(self, url: str = None):
        self.url = url or config.DATABASE_URL
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self):
        """Create connection pool."""
        self.pool = await asyncpg.create_pool(self.url, min_size=2, max_size=10)
        print("[OK] Database connected")
    
    async def close(self):
        """Close connection pool."""
        if self.pool:
            await self.pool.close()
    
    async def save_anomaly(
        self, 
        anomaly_id: str,
        symbol: str,
        pattern_type: str,
        severity: str,
        z_score: float,
        price: float,
        volume: int,
        detected_at: datetime,
        agent_decision: str = None,
        agent_confidence: float = None,
        agent_reason: str = None
    ):
        """Save detected anomaly."""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO anomalies 
                (id, symbol, pattern_type, severity, z_score, price, volume, 
                 detected_at, agent_decision, agent_confidence, agent_reason)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (id) DO UPDATE SET
                    agent_decision = $9,
                    agent_confidence = $10,
                    agent_reason = $11
            """, anomaly_id, symbol, pattern_type, severity, z_score, 
                price, volume, detected_at, agent_decision, 
                agent_confidence, agent_reason)
    
    async def save_user_action(
        self, 
        anomaly_id: str, 
        user_id: str, 
        action: str,
        notes: str = None
    ):
        """Record user action on anomaly."""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO user_actions (anomaly_id, user_id, action, notes)
                VALUES ($1, $2, $3, $4)
            """, anomaly_id, user_id, action, notes)
    
    async def get_pattern_quality(
        self, 
        user_id: str, 
        pattern_type: str, 
        symbol: str
    ) -> Optional[config.PatternQuality]:
        """Get quality metrics for a pattern."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM pattern_quality
                WHERE user_id = $1 AND pattern_type = $2 AND symbol = $3
            """, user_id, pattern_type, symbol)
            
            if row:
                return config.PatternQuality(
                    pattern_type=row["pattern_type"],
                    symbol=row["symbol"],
                    accuracy=row["accuracy"],
                    review_rate=row["review_rate"],
                    trade_rate=row["trade_rate"],
                    avg_return=row["avg_return"],
                    sample_size=row["sample_size"],
                    agent_accuracy=row["agent_accuracy"]
                )
            return None
    
    async def update_pattern_quality(
        self,
        user_id: str,
        pattern_type: str,
        symbol: str,
        accuracy: float,
        review_rate: float,
        trade_rate: float,
        avg_return: float,
        sample_size: int,
        agent_accuracy: float
    ):
        """Update pattern quality metrics."""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO pattern_quality 
                (user_id, pattern_type, symbol, accuracy, review_rate, 
                 trade_rate, avg_return, sample_size, agent_accuracy, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                ON CONFLICT (user_id, pattern_type, symbol) DO UPDATE SET
                    accuracy = $4,
                    review_rate = $5,
                    trade_rate = $6,
                    avg_return = $7,
                    sample_size = $8,
                    agent_accuracy = $9,
                    updated_at = NOW()
            """, user_id, pattern_type, symbol, accuracy, review_rate,
                trade_rate, avg_return, sample_size, agent_accuracy)
    
    async def get_pending_anomalies(self, user_id: str, limit: int = 20):
        """Get anomalies pending user action."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT a.* FROM anomalies a
                LEFT JOIN user_actions ua ON a.id = ua.anomaly_id AND ua.user_id = $1
                WHERE ua.id IS NULL
                AND a.agent_decision != 'IGNORE'
                ORDER BY a.detected_at DESC
                LIMIT $2
            """, user_id, limit)
            return rows
    
    async def get_recent_outcomes(self, user_id: str, days: int = 30):
        """Get recent outcome data."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT * FROM anomaly_outcomes
                WHERE user_id = $1 
                AND created_at > NOW() - make_interval(days => $2)
                ORDER BY created_at DESC
            """, user_id, days)
            return rows

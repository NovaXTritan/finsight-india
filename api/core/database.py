"""
API Database - Extends existing database with user management
"""
import asyncpg
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from api.core.config import get_settings
from api.core.auth import hash_password, verify_password

settings = get_settings()


class APIDatabase:
    """
    Extended database for API operations.
    Adds user management on top of existing FinSight database.
    """
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self):
        """Create connection pool."""
        self.pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=2,
            max_size=10
        )
    
    async def close(self):
        """Close connection pool."""
        if self.pool:
            await self.pool.close()
    
    # =========================================================================
    # USER MANAGEMENT (NEW)
    # =========================================================================
    
    async def create_user(
        self, 
        email: str, 
        password: str, 
        name: str
    ) -> Optional[Dict[str, Any]]:
        """Create a new user account."""
        async with self.pool.acquire() as conn:
            # Check if email exists
            existing = await conn.fetchrow(
                "SELECT id FROM users WHERE email = $1", 
                email.lower()
            )
            if existing:
                return None  # Email already registered
            
            # Create user
            user_id = str(uuid.uuid4())
            hashed = hash_password(password)
            
            await conn.execute("""
                INSERT INTO users (id, email, password_hash, name, tier, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, user_id, email.lower(), hashed, name, "free", datetime.utcnow())
            
            return {
                "id": user_id,
                "email": email.lower(),
                "name": name,
                "tier": "free"
            }
    
    async def authenticate_user(
        self, 
        email: str, 
        password: str
    ) -> Optional[Dict[str, Any]]:
        """Authenticate user by email and password."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT id, email, password_hash, name, tier, created_at
                FROM users WHERE email = $1
            """, email.lower())
            
            if not row:
                return None
            
            if not verify_password(password, row["password_hash"]):
                return None
            
            return {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "tier": row["tier"],
                "created_at": row["created_at"]
            }
    
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT id, email, name, tier, created_at
                FROM users WHERE id = $1
            """, user_id)
            
            if row:
                return dict(row)
            return None
    
    async def update_user_tier(self, user_id: str, tier: str) -> bool:
        """Update user subscription tier."""
        async with self.pool.acquire() as conn:
            result = await conn.execute("""
                UPDATE users SET tier = $1, updated_at = $2
                WHERE id = $3
            """, tier, datetime.utcnow(), user_id)
            return "UPDATE 1" in result
    
    # =========================================================================
    # WATCHLIST (NEW - Per User)
    # =========================================================================
    
    async def get_watchlist(self, user_id: str) -> List[str]:
        """Get user's watchlist symbols."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT symbol FROM user_watchlist
                WHERE user_id = $1
                ORDER BY added_at DESC
            """, user_id)
            return [row["symbol"] for row in rows]
    
    async def add_to_watchlist(self, user_id: str, symbol: str) -> bool:
        """Add symbol to user's watchlist."""
        async with self.pool.acquire() as conn:
            # Check tier limit
            user = await self.get_user(user_id)
            if not user:
                return False
            
            tier_limit = settings.tier_limits.get(user["tier"], {}).get("symbols", 5)
            
            current_count = await conn.fetchval("""
                SELECT COUNT(*) FROM user_watchlist WHERE user_id = $1
            """, user_id)
            
            if current_count >= tier_limit:
                return False  # Limit reached
            
            # Add symbol
            await conn.execute("""
                INSERT INTO user_watchlist (user_id, symbol, added_at)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, symbol) DO NOTHING
            """, user_id, symbol.upper(), datetime.utcnow())
            
            return True
    
    async def remove_from_watchlist(self, user_id: str, symbol: str) -> bool:
        """Remove symbol from user's watchlist."""
        async with self.pool.acquire() as conn:
            result = await conn.execute("""
                DELETE FROM user_watchlist
                WHERE user_id = $1 AND symbol = $2
            """, user_id, symbol.upper())
            return "DELETE 1" in result
    
    async def get_watchlist_count(self, user_id: str) -> int:
        """Get count of symbols in watchlist."""
        async with self.pool.acquire() as conn:
            return await conn.fetchval("""
                SELECT COUNT(*) FROM user_watchlist WHERE user_id = $1
            """, user_id)
    
    # =========================================================================
    # SIGNALS (Extends existing)
    # =========================================================================
    
    async def get_signals_for_user(
        self, 
        user_id: str, 
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get signals for user's watchlist symbols."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    a.id,
                    a.symbol,
                    a.pattern_type,
                    a.severity,
                    a.z_score,
                    a.price,
                    a.volume,
                    a.detected_at,
                    a.agent_decision,
                    a.agent_confidence,
                    a.agent_reason
                FROM anomalies a
                INNER JOIN user_watchlist w ON a.symbol = w.symbol
                WHERE w.user_id = $1
                ORDER BY a.detected_at DESC
                LIMIT $2 OFFSET $3
            """, user_id, limit, offset)
            
            return [dict(row) for row in rows]
    
    async def get_signal_count_for_user(self, user_id: str) -> int:
        """Get total signal count for user's watchlist."""
        async with self.pool.acquire() as conn:
            return await conn.fetchval("""
                SELECT COUNT(*)
                FROM anomalies a
                INNER JOIN user_watchlist w ON a.symbol = w.symbol
                WHERE w.user_id = $1
            """, user_id)
    
    async def get_latest_signals(
        self, 
        user_id: str, 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get latest signals for user."""
        return await self.get_signals_for_user(user_id, limit=limit, offset=0)
    
    # =========================================================================
    # USER ACTIONS (Extends existing)
    # =========================================================================
    
    async def record_user_action(
        self,
        user_id: str,
        anomaly_id: str,
        action: str,
        notes: str = None
    ):
        """Record user action on a signal."""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO user_actions (anomaly_id, user_id, action, notes, created_at)
                VALUES ($1, $2, $3, $4, $5)
            """, anomaly_id, user_id, action, notes, datetime.utcnow())
    
    # =========================================================================
    # STATS
    # =========================================================================
    
    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user statistics."""
        async with self.pool.acquire() as conn:
            # Watchlist count
            watchlist_count = await conn.fetchval("""
                SELECT COUNT(*) FROM user_watchlist WHERE user_id = $1
            """, user_id)
            
            # Signal count (last 30 days)
            signal_count = await conn.fetchval("""
                SELECT COUNT(*)
                FROM anomalies a
                INNER JOIN user_watchlist w ON a.symbol = w.symbol
                WHERE w.user_id = $1
                AND a.detected_at > NOW() - INTERVAL '30 days'
            """, user_id)
            
            # Action count
            action_count = await conn.fetchval("""
                SELECT COUNT(*) FROM user_actions WHERE user_id = $1
            """, user_id)
            
            return {
                "watchlist_count": watchlist_count or 0,
                "signals_30d": signal_count or 0,
                "actions_total": action_count or 0
            }


# Global database instance
db = APIDatabase()


async def get_db() -> APIDatabase:
    """Dependency to get database instance."""
    return db

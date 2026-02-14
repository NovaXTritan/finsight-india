"""
API Database - Extends existing database with user management
"""
import asyncpg
import asyncio
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
            max_size=20,
            command_timeout=30,
            statement_cache_size=100,
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
            
            # Auto-assign unlimited tier for premium emails
            tier = "unlimited" if email.lower() in settings.premium_emails else "free"

            await conn.execute("""
                INSERT INTO users (id, email, password_hash, name, tier, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, user_id, email.lower(), hashed, name, tier, datetime.utcnow())

            return {
                "id": user_id,
                "email": email.lower(),
                "name": name,
                "tier": tier
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

            tier = row["tier"]
            # Auto-upgrade premium emails to unlimited tier
            if email.lower() in settings.premium_emails and tier != "unlimited":
                await conn.execute(
                    "UPDATE users SET tier = $1, updated_at = $2 WHERE id = $3",
                    "unlimited", datetime.utcnow(), row["id"]
                )
                tier = "unlimited"

            return {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "tier": tier,
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
            # Check tier limit using the same connection
            user_row = await conn.fetchrow("""
                SELECT tier FROM users WHERE id = $1
            """, user_id)
            if not user_row:
                return False

            tier_limit = settings.tier_limits.get(user_row["tier"], {}).get("symbols", 5)

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
                    a.agent_reason,
                    a.context,
                    a.sources,
                    a.thought_process
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


    # =========================================================================
    # PORTFOLIO - HOLDINGS
    # =========================================================================

    async def get_holdings(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all holdings for a user with current market prices."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, symbol, quantity, avg_price, invested_value, notes, updated_at
                FROM user_holdings
                WHERE user_id = $1
                ORDER BY invested_value DESC
            """, user_id)

            if not rows:
                return []

            # Batch fetch all prices concurrently instead of one-by-one
            holding_dicts = [dict(row) for row in rows]
            prices = await asyncio.gather(*[
                self._get_current_price(h["symbol"]) for h in holding_dicts
            ])

            holdings = []
            for h, current_price in zip(holding_dicts, prices):
                if current_price:
                    h["current_price"] = current_price["price"]
                    h["current_value"] = h["quantity"] * current_price["price"]
                    h["gain_loss"] = h["current_value"] - float(h["invested_value"])
                    h["gain_loss_pct"] = (h["gain_loss"] / float(h["invested_value"]) * 100) if h["invested_value"] else 0
                    h["day_change"] = h["quantity"] * current_price.get("change", 0)
                    h["day_change_pct"] = current_price.get("change_pct", 0)
                else:
                    h["current_price"] = None
                    h["current_value"] = float(h["invested_value"])
                    h["gain_loss"] = 0
                    h["gain_loss_pct"] = 0
                    h["day_change"] = 0
                    h["day_change_pct"] = 0

                h["invested_value"] = float(h["invested_value"])
                h["avg_price"] = float(h["avg_price"])
                holdings.append(h)

            return holdings

    def _get_current_price_sync(self, symbol: str) -> Optional[Dict[str, float]]:
        """Get current price for a symbol using yfinance (blocking)."""
        try:
            import yfinance as yf
            ticker = yf.Ticker(f"{symbol}.NS")
            info = ticker.info
            price = info.get("currentPrice") or info.get("regularMarketPrice")
            prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose")
            if price:
                change = price - prev_close if prev_close else 0
                change_pct = (change / prev_close * 100) if prev_close else 0
                return {"price": price, "change": change, "change_pct": change_pct}
        except Exception:
            pass
        return None

    async def _get_current_price(self, symbol: str) -> Optional[Dict[str, float]]:
        """Get current price without blocking the event loop."""
        return await asyncio.to_thread(self._get_current_price_sync, symbol)

    async def get_holding(self, user_id: str, symbol: str) -> Optional[Dict[str, Any]]:
        """Get a specific holding."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT id, symbol, quantity, avg_price, invested_value, notes, updated_at
                FROM user_holdings
                WHERE user_id = $1 AND symbol = $2
            """, user_id, symbol)

            if row:
                h = dict(row)
                h["invested_value"] = float(h["invested_value"])
                h["avg_price"] = float(h["avg_price"])
                return h
            return None

    async def create_holding(
        self,
        user_id: str,
        symbol: str,
        quantity: int,
        avg_price: float,
        notes: str = None
    ) -> Optional[Dict[str, Any]]:
        """Create a new holding."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO user_holdings (user_id, symbol, quantity, avg_price, notes, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, symbol, quantity, avg_price, invested_value, notes, updated_at
            """, user_id, symbol, quantity, avg_price, notes, datetime.utcnow())

            if row:
                h = dict(row)
                h["invested_value"] = float(h["invested_value"])
                h["avg_price"] = float(h["avg_price"])
                # Add market data
                current_price = await self._get_current_price(symbol)
                if current_price:
                    h["current_price"] = current_price["price"]
                    h["current_value"] = quantity * current_price["price"]
                    h["gain_loss"] = h["current_value"] - h["invested_value"]
                    h["gain_loss_pct"] = (h["gain_loss"] / h["invested_value"] * 100) if h["invested_value"] else 0
                    h["day_change"] = quantity * current_price.get("change", 0)
                    h["day_change_pct"] = current_price.get("change_pct", 0)
                else:
                    h["current_price"] = None
                    h["current_value"] = h["invested_value"]
                    h["gain_loss"] = 0
                    h["gain_loss_pct"] = 0
                    h["day_change"] = 0
                    h["day_change_pct"] = 0
                return h
            return None

    async def update_holding(
        self,
        user_id: str,
        symbol: str,
        quantity: int = None,
        avg_price: float = None,
        notes: str = None
    ) -> Optional[Dict[str, Any]]:
        """Update an existing holding."""
        async with self.pool.acquire() as conn:
            # Build dynamic update query
            updates = ["updated_at = $3"]
            params = [user_id, symbol, datetime.utcnow()]
            param_idx = 4

            if quantity is not None:
                updates.append(f"quantity = ${param_idx}")
                params.append(quantity)
                param_idx += 1

            if avg_price is not None:
                updates.append(f"avg_price = ${param_idx}")
                params.append(avg_price)
                param_idx += 1

            if notes is not None:
                updates.append(f"notes = ${param_idx}")
                params.append(notes)
                param_idx += 1

            query = f"""
                UPDATE user_holdings
                SET {", ".join(updates)}
                WHERE user_id = $1 AND symbol = $2
                RETURNING id, symbol, quantity, avg_price, invested_value, notes, updated_at
            """

            row = await conn.fetchrow(query, *params)

            if row:
                h = dict(row)
                h["invested_value"] = float(h["invested_value"])
                h["avg_price"] = float(h["avg_price"])
                # Add market data
                current_price = await self._get_current_price(symbol)
                if current_price:
                    h["current_price"] = current_price["price"]
                    h["current_value"] = h["quantity"] * current_price["price"]
                    h["gain_loss"] = h["current_value"] - h["invested_value"]
                    h["gain_loss_pct"] = (h["gain_loss"] / h["invested_value"] * 100) if h["invested_value"] else 0
                    h["day_change"] = h["quantity"] * current_price.get("change", 0)
                    h["day_change_pct"] = current_price.get("change_pct", 0)
                else:
                    h["current_price"] = None
                    h["current_value"] = h["invested_value"]
                    h["gain_loss"] = 0
                    h["gain_loss_pct"] = 0
                    h["day_change"] = 0
                    h["day_change_pct"] = 0
                return h
            return None

    async def delete_holding(self, user_id: str, symbol: str) -> bool:
        """Delete a holding."""
        async with self.pool.acquire() as conn:
            result = await conn.execute("""
                DELETE FROM user_holdings
                WHERE user_id = $1 AND symbol = $2
            """, user_id, symbol)
            return "DELETE 1" in result

    # =========================================================================
    # PORTFOLIO - TRANSACTIONS
    # =========================================================================

    async def get_transactions(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
        symbol: str = None,
        tx_type: str = None
    ) -> tuple:
        """Get transactions with optional filters."""
        async with self.pool.acquire() as conn:
            # Build query with filters
            where_clauses = ["user_id = $1"]
            params = [user_id]
            param_idx = 2

            if symbol:
                where_clauses.append(f"symbol = ${param_idx}")
                params.append(symbol)
                param_idx += 1

            if tx_type:
                where_clauses.append(f"type = ${param_idx}")
                params.append(tx_type)
                param_idx += 1

            where_sql = " AND ".join(where_clauses)

            # Get total count
            total = await conn.fetchval(f"""
                SELECT COUNT(*) FROM transactions WHERE {where_sql}
            """, *params)

            # Get transactions
            params.extend([limit, offset])
            rows = await conn.fetch(f"""
                SELECT id, symbol, type, quantity, price, amount, fees,
                       transaction_date, notes, created_at
                FROM transactions
                WHERE {where_sql}
                ORDER BY transaction_date DESC, created_at DESC
                LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """, *params)

            transactions = []
            for row in rows:
                t = dict(row)
                t["price"] = float(t["price"]) if t["price"] else None
                t["amount"] = float(t["amount"]) if t["amount"] else None
                t["fees"] = float(t["fees"]) if t["fees"] else 0
                t["transaction_date"] = t["transaction_date"].strftime("%Y-%m-%d")
                transactions.append(t)

            return transactions, total

    async def create_transaction(
        self,
        user_id: str,
        symbol: str,
        tx_type: str,
        quantity: int = None,
        price: float = None,
        amount: float = None,
        fees: float = 0,
        transaction_date: any = None,
        notes: str = None
    ) -> Optional[Dict[str, Any]]:
        """Create a new transaction."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO transactions
                (user_id, symbol, type, quantity, price, amount, fees, transaction_date, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, symbol, type, quantity, price, amount, fees, transaction_date, notes, created_at
            """, user_id, symbol, tx_type, quantity, price, amount, fees, transaction_date, notes)

            if row:
                t = dict(row)
                t["price"] = float(t["price"]) if t["price"] else None
                t["amount"] = float(t["amount"]) if t["amount"] else None
                t["fees"] = float(t["fees"]) if t["fees"] else 0
                t["transaction_date"] = t["transaction_date"].strftime("%Y-%m-%d")
                return t
            return None

    async def update_holding_from_transaction(
        self,
        user_id: str,
        symbol: str,
        tx_type: str,
        quantity: int,
        price: float
    ):
        """Update holding based on transaction."""
        if tx_type not in ('BUY', 'SELL', 'BONUS', 'SPLIT'):
            return

        existing = await self.get_holding(user_id, symbol)

        if tx_type == 'BUY':
            if existing:
                # Calculate new average price
                total_cost = existing["invested_value"] + (quantity * price)
                total_qty = existing["quantity"] + quantity
                new_avg = total_cost / total_qty
                await self.update_holding(user_id, symbol, quantity=total_qty, avg_price=new_avg)
            else:
                await self.create_holding(user_id, symbol, quantity, price)

        elif tx_type == 'SELL':
            if existing:
                new_qty = existing["quantity"] - quantity
                if new_qty <= 0:
                    await self.delete_holding(user_id, symbol)
                else:
                    await self.update_holding(user_id, symbol, quantity=new_qty)

        elif tx_type in ('BONUS', 'SPLIT'):
            if existing:
                new_qty = existing["quantity"] + quantity
                # Adjust average price for bonus/split
                new_avg = existing["invested_value"] / new_qty
                await self.update_holding(user_id, symbol, quantity=new_qty, avg_price=new_avg)

    # =========================================================================
    # PORTFOLIO - SNAPSHOTS & PERFORMANCE
    # =========================================================================

    async def get_portfolio_snapshots(
        self,
        user_id: str,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get portfolio snapshots for the last N days."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT snapshot_date, total_value, total_invested, total_gain_loss, gain_loss_pct
                FROM portfolio_snapshots
                WHERE user_id = $1 AND snapshot_date > CURRENT_DATE - $2
                ORDER BY snapshot_date ASC
            """, user_id, days)

            return [dict(row) for row in rows]

    async def create_portfolio_snapshot(self, user_id: str) -> bool:
        """Create a daily portfolio snapshot."""
        holdings = await self.get_holdings(user_id)

        if not holdings:
            return False

        total_invested = sum(h["invested_value"] for h in holdings)
        total_value = sum(h.get("current_value", h["invested_value"]) for h in holdings)
        total_gain_loss = total_value - total_invested
        gain_loss_pct = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0

        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO portfolio_snapshots
                (user_id, total_value, total_invested, total_gain_loss, gain_loss_pct, snapshot_date)
                VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
                ON CONFLICT (user_id, snapshot_date)
                DO UPDATE SET total_value = $2, total_invested = $3,
                              total_gain_loss = $4, gain_loss_pct = $5
            """, user_id, total_value, total_invested, total_gain_loss, gain_loss_pct)

        return True

    async def calculate_xirr(self, user_id: str) -> Optional[float]:
        """Calculate XIRR from all transactions."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT type, amount, transaction_date
                FROM transactions
                WHERE user_id = $1 AND type IN ('BUY', 'SELL', 'DIVIDEND')
                ORDER BY transaction_date
            """, user_id)

            if not rows:
                return None

            # Prepare cashflows for XIRR
            cashflows = []
            dates = []

            for row in rows:
                if row["type"] == 'BUY':
                    cashflows.append(-float(row["amount"]))  # Outflow
                else:
                    cashflows.append(float(row["amount"]))  # Inflow
                dates.append(row["transaction_date"])

            # Add current portfolio value as final inflow
            holdings = await self.get_holdings(user_id)
            if holdings:
                current_value = sum(h.get("current_value", h["invested_value"]) for h in holdings)
                cashflows.append(current_value)
                dates.append(datetime.utcnow().date())

            # Calculate XIRR using Newton-Raphson
            try:
                xirr = self._calculate_xirr_newton(cashflows, dates)
                return round(xirr * 100, 2) if xirr else None
            except Exception:
                return None

    def _calculate_xirr_newton(
        self,
        cashflows: List[float],
        dates: List[any],
        guess: float = 0.1,
        max_iter: int = 100,
        tol: float = 1e-6
    ) -> Optional[float]:
        """Calculate XIRR using Newton-Raphson method."""
        from datetime import date

        if not cashflows or not dates:
            return None

        # Convert dates to day fractions
        base_date = dates[0]
        day_fracs = [(d - base_date).days / 365.0 for d in dates]

        rate = guess
        for _ in range(max_iter):
            npv = sum(cf / ((1 + rate) ** t) for cf, t in zip(cashflows, day_fracs))
            dnpv = sum(-t * cf / ((1 + rate) ** (t + 1)) for cf, t in zip(cashflows, day_fracs))

            if abs(dnpv) < tol:
                break

            new_rate = rate - npv / dnpv

            if abs(new_rate - rate) < tol:
                return new_rate

            rate = new_rate

        return rate if abs(npv) < tol else None


    # =========================================================================
    # SCREENER - FUNDAMENTALS
    # =========================================================================

    async def get_screener_filter_options(self) -> Dict[str, Any]:
        """Get min/max ranges for all filterable fields."""
        async with self.pool.acquire() as conn:
            ranges = await conn.fetchrow("""
                SELECT
                    MIN(pe_ratio) as pe_min, MAX(pe_ratio) as pe_max,
                    MIN(pb_ratio) as pb_min, MAX(pb_ratio) as pb_max,
                    MIN(roe) as roe_min, MAX(roe) as roe_max,
                    MIN(dividend_yield) as div_yield_min, MAX(dividend_yield) as div_yield_max,
                    MIN(debt_to_equity) as de_min, MAX(debt_to_equity) as de_max,
                    MIN(market_cap) as mcap_min, MAX(market_cap) as mcap_max,
                    MIN(current_ratio) as cr_min, MAX(current_ratio) as cr_max,
                    MIN(eps) as eps_min, MAX(eps) as eps_max,
                    MIN(beta) as beta_min, MAX(beta) as beta_max
                FROM stock_fundamentals
            """)

            sectors = await conn.fetch("""
                SELECT DISTINCT sector FROM stock_fundamentals
                WHERE sector IS NOT NULL ORDER BY sector
            """)

            industries = await conn.fetch("""
                SELECT DISTINCT industry FROM stock_fundamentals
                WHERE industry IS NOT NULL ORDER BY industry
            """)

            return {
                "pe_ratio": {"min": float(ranges["pe_min"] or 0), "max": float(ranges["pe_max"] or 100)},
                "pb_ratio": {"min": float(ranges["pb_min"] or 0), "max": float(ranges["pb_max"] or 50)},
                "roe": {"min": float(ranges["roe_min"] or -100), "max": float(ranges["roe_max"] or 100)},
                "dividend_yield": {"min": float(ranges["div_yield_min"] or 0), "max": float(ranges["div_yield_max"] or 20)},
                "debt_to_equity": {"min": float(ranges["de_min"] or 0), "max": float(ranges["de_max"] or 500)},
                "market_cap": {"min": int(ranges["mcap_min"] or 0), "max": int(ranges["mcap_max"] or 1e13)},
                "current_ratio": {"min": float(ranges["cr_min"] or 0), "max": float(ranges["cr_max"] or 10)},
                "eps": {"min": float(ranges["eps_min"] or -100), "max": float(ranges["eps_max"] or 1000)},
                "beta": {"min": float(ranges["beta_min"] or 0), "max": float(ranges["beta_max"] or 3)},
                "sectors": [row["sector"] for row in sectors],
                "industries": [row["industry"] for row in industries],
            }

    async def run_screener(
        self,
        filters: Dict[str, Any],
        limit: int = 50,
        offset: int = 0,
        sort_by: str = "market_cap",
        sort_order: str = "desc"
    ) -> tuple:
        """Run stock screener with filters."""
        async with self.pool.acquire() as conn:
            # Build WHERE clauses
            where_clauses = ["1=1"]
            params = []
            param_idx = 1

            # PE ratio filter
            if filters.get("pe_min") is not None:
                where_clauses.append(f"pe_ratio >= ${param_idx}")
                params.append(filters["pe_min"])
                param_idx += 1
            if filters.get("pe_max") is not None:
                where_clauses.append(f"pe_ratio <= ${param_idx}")
                params.append(filters["pe_max"])
                param_idx += 1

            # PB ratio filter
            if filters.get("pb_min") is not None:
                where_clauses.append(f"pb_ratio >= ${param_idx}")
                params.append(filters["pb_min"])
                param_idx += 1
            if filters.get("pb_max") is not None:
                where_clauses.append(f"pb_ratio <= ${param_idx}")
                params.append(filters["pb_max"])
                param_idx += 1

            # ROE filter
            if filters.get("roe_min") is not None:
                where_clauses.append(f"roe >= ${param_idx}")
                params.append(filters["roe_min"])
                param_idx += 1
            if filters.get("roe_max") is not None:
                where_clauses.append(f"roe <= ${param_idx}")
                params.append(filters["roe_max"])
                param_idx += 1

            # Dividend yield filter
            if filters.get("dividend_yield_min") is not None:
                where_clauses.append(f"dividend_yield >= ${param_idx}")
                params.append(filters["dividend_yield_min"])
                param_idx += 1
            if filters.get("dividend_yield_max") is not None:
                where_clauses.append(f"dividend_yield <= ${param_idx}")
                params.append(filters["dividend_yield_max"])
                param_idx += 1

            # Debt to equity filter
            if filters.get("debt_to_equity_max") is not None:
                where_clauses.append(f"debt_to_equity <= ${param_idx}")
                params.append(filters["debt_to_equity_max"])
                param_idx += 1

            # Current ratio filter
            if filters.get("current_ratio_min") is not None:
                where_clauses.append(f"current_ratio >= ${param_idx}")
                params.append(filters["current_ratio_min"])
                param_idx += 1

            # Market cap filter
            if filters.get("market_cap_min") is not None:
                where_clauses.append(f"market_cap >= ${param_idx}")
                params.append(filters["market_cap_min"])
                param_idx += 1
            if filters.get("market_cap_max") is not None:
                where_clauses.append(f"market_cap <= ${param_idx}")
                params.append(filters["market_cap_max"])
                param_idx += 1

            # EPS filter
            if filters.get("eps_min") is not None:
                where_clauses.append(f"eps >= ${param_idx}")
                params.append(filters["eps_min"])
                param_idx += 1

            # Beta filter
            if filters.get("beta_min") is not None:
                where_clauses.append(f"beta >= ${param_idx}")
                params.append(filters["beta_min"])
                param_idx += 1
            if filters.get("beta_max") is not None:
                where_clauses.append(f"beta <= ${param_idx}")
                params.append(filters["beta_max"])
                param_idx += 1

            # Sectors filter
            if filters.get("sectors"):
                where_clauses.append(f"sector = ANY(${param_idx})")
                params.append(filters["sectors"])
                param_idx += 1

            # Industries filter
            if filters.get("industries"):
                where_clauses.append(f"industry = ANY(${param_idx})")
                params.append(filters["industries"])
                param_idx += 1

            # Near 52-week high filter
            if filters.get("near_52w_high") is not None:
                where_clauses.append(f"price_to_52w_high >= ${param_idx}")
                params.append(100 - filters["near_52w_high"])
                param_idx += 1

            # Near 52-week low filter
            if filters.get("near_52w_low") is not None:
                where_clauses.append(f"price_to_52w_low <= ${param_idx}")
                params.append(100 + filters["near_52w_low"])
                param_idx += 1

            # F&O filter
            if filters.get("is_fno") is not None:
                where_clauses.append(f"is_fno = ${param_idx}")
                params.append(filters["is_fno"])
                param_idx += 1

            where_sql = " AND ".join(where_clauses)

            # Validate sort column
            valid_sort_columns = [
                "symbol", "name", "market_cap", "pe_ratio", "pb_ratio", "roe",
                "dividend_yield", "debt_to_equity", "current_ratio", "eps",
                "current_price", "price_to_52w_high", "beta"
            ]
            if sort_by not in valid_sort_columns:
                sort_by = "market_cap"

            order_dir = "DESC" if sort_order.lower() == "desc" else "ASC"

            # Get total count
            total = await conn.fetchval(f"""
                SELECT COUNT(*) FROM stock_fundamentals WHERE {where_sql}
            """, *params)

            # Get results
            params.extend([limit, offset])
            rows = await conn.fetch(f"""
                SELECT * FROM stock_fundamentals
                WHERE {where_sql}
                ORDER BY {sort_by} {order_dir} NULLS LAST
                LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """, *params)

            stocks = []
            for row in rows:
                stock = dict(row)
                # Convert Decimal to float
                for key in ["pe_ratio", "pb_ratio", "ps_ratio", "dividend_yield", "roe",
                           "roce", "debt_to_equity", "current_ratio", "eps", "book_value",
                           "face_value", "high_52w", "low_52w", "current_price",
                           "price_to_52w_high", "price_to_52w_low", "beta"]:
                    if stock.get(key) is not None:
                        stock[key] = float(stock[key])
                stocks.append(stock)

            return stocks, total

    def _fetch_fundamentals_sync(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch stock fundamentals from Yahoo Finance (blocking)."""
        try:
            import yfinance as yf
            ticker = yf.Ticker(f"{symbol}.NS")
            info = ticker.info

            if not info or info.get("regularMarketPrice") is None:
                ticker = yf.Ticker(f"{symbol}.BO")
                info = ticker.info

            if not info or info.get("regularMarketPrice") is None:
                return None

            current_price = info.get("currentPrice") or info.get("regularMarketPrice")
            high_52w = info.get("fiftyTwoWeekHigh")
            low_52w = info.get("fiftyTwoWeekLow")

            price_to_52w_high = round((current_price / high_52w) * 100, 2) if current_price and high_52w else None
            price_to_52w_low = round((current_price / low_52w) * 100, 2) if current_price and low_52w else None

            return {
                "symbol": symbol,
                "name": info.get("shortName") or info.get("longName") or symbol,
                "sector": info.get("sector"),
                "industry": info.get("industry"),
                "market_cap": info.get("marketCap"),
                "pe_ratio": info.get("trailingPE"),
                "pb_ratio": info.get("priceToBook"),
                "ps_ratio": info.get("priceToSalesTrailing12Months"),
                "dividend_yield": (info.get("dividendYield") or 0) * 100 if info.get("dividendYield") else 0,
                "roe": (info.get("returnOnEquity") or 0) * 100 if info.get("returnOnEquity") else None,
                "debt_to_equity": info.get("debtToEquity"),
                "current_ratio": info.get("currentRatio"),
                "eps": info.get("trailingEps"),
                "book_value": info.get("bookValue"),
                "high_52w": high_52w,
                "low_52w": low_52w,
                "current_price": current_price,
                "price_to_52w_high": price_to_52w_high,
                "price_to_52w_low": price_to_52w_low,
                "avg_volume_30d": info.get("averageVolume"),
                "beta": info.get("beta"),
                "is_fno": False,
            }
        except Exception:
            return None

    async def get_stock_fundamentals(
        self,
        symbol: str,
        refresh: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Get fundamentals for a single stock."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM stock_fundamentals WHERE symbol = $1
            """, symbol)

            if row and not refresh:
                stock = dict(row)
                for key in ["pe_ratio", "pb_ratio", "ps_ratio", "dividend_yield", "roe",
                           "roce", "debt_to_equity", "current_ratio", "eps", "book_value",
                           "face_value", "high_52w", "low_52w", "current_price",
                           "price_to_52w_high", "price_to_52w_low", "beta"]:
                    if stock.get(key) is not None:
                        stock[key] = float(stock[key])
                return stock

            # Fetch from Yahoo Finance in a thread to avoid blocking the event loop
            fundamentals = await asyncio.to_thread(self._fetch_fundamentals_sync, symbol)

            if not fundamentals:
                return dict(row) if row else None

            # Save to database
            await conn.execute("""
                INSERT INTO stock_fundamentals (
                    symbol, name, sector, industry, market_cap, pe_ratio, pb_ratio,
                    ps_ratio, dividend_yield, roe, debt_to_equity, current_ratio,
                    eps, book_value, high_52w, low_52w, current_price,
                    price_to_52w_high, price_to_52w_low, avg_volume_30d, beta, is_fno, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW())
                ON CONFLICT (symbol) DO UPDATE SET
                    name = EXCLUDED.name, sector = EXCLUDED.sector, industry = EXCLUDED.industry,
                    market_cap = EXCLUDED.market_cap, pe_ratio = EXCLUDED.pe_ratio, pb_ratio = EXCLUDED.pb_ratio,
                    ps_ratio = EXCLUDED.ps_ratio, dividend_yield = EXCLUDED.dividend_yield, roe = EXCLUDED.roe,
                    debt_to_equity = EXCLUDED.debt_to_equity, current_ratio = EXCLUDED.current_ratio,
                    eps = EXCLUDED.eps, book_value = EXCLUDED.book_value, high_52w = EXCLUDED.high_52w,
                    low_52w = EXCLUDED.low_52w, current_price = EXCLUDED.current_price,
                    price_to_52w_high = EXCLUDED.price_to_52w_high, price_to_52w_low = EXCLUDED.price_to_52w_low,
                    avg_volume_30d = EXCLUDED.avg_volume_30d, beta = EXCLUDED.beta, updated_at = NOW()
            """, *[fundamentals.get(k) for k in [
                "symbol", "name", "sector", "industry", "market_cap", "pe_ratio", "pb_ratio",
                "ps_ratio", "dividend_yield", "roe", "debt_to_equity", "current_ratio",
                "eps", "book_value", "high_52w", "low_52w", "current_price",
                "price_to_52w_high", "price_to_52w_low", "avg_volume_30d", "beta", "is_fno"
            ]])

            return fundamentals

    async def refresh_fundamentals(self, symbols: List[str] = None):
        """Refresh fundamentals for specified symbols or all."""
        from data.nifty500 import NIFTY_500
        symbols = symbols or NIFTY_500[:50]  # Limit to first 50 for demo

        for symbol in symbols:
            try:
                await self.get_stock_fundamentals(symbol, refresh=True)
            except Exception:
                pass

    # =========================================================================
    # SCREENER - SAVED SCREENERS
    # =========================================================================

    async def get_saved_screeners(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's saved screeners."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, name, filters, is_public, created_at, updated_at
                FROM saved_screeners
                WHERE user_id = $1
                ORDER BY updated_at DESC
            """, user_id)
            return [dict(row) for row in rows]

    async def get_saved_screener(self, screener_id: int, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific saved screener."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT id, name, filters, is_public, created_at, updated_at
                FROM saved_screeners
                WHERE id = $1 AND (user_id = $2 OR is_public = true)
            """, screener_id, user_id)
            return dict(row) if row else None

    async def save_screener(
        self,
        user_id: str,
        name: str,
        filters: dict,
        is_public: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Save a screener configuration."""
        import json
        async with self.pool.acquire() as conn:
            try:
                row = await conn.fetchrow("""
                    INSERT INTO saved_screeners (user_id, name, filters, is_public, updated_at)
                    VALUES ($1, $2, $3, $4, NOW())
                    ON CONFLICT (user_id, name) DO UPDATE SET
                        filters = EXCLUDED.filters,
                        is_public = EXCLUDED.is_public,
                        updated_at = NOW()
                    RETURNING id, name, filters, is_public, created_at, updated_at
                """, user_id, name, json.dumps(filters), is_public)
                return dict(row) if row else None
            except Exception:
                return None

    async def delete_screener(self, screener_id: int, user_id: str) -> bool:
        """Delete a saved screener."""
        async with self.pool.acquire() as conn:
            result = await conn.execute("""
                DELETE FROM saved_screeners
                WHERE id = $1 AND user_id = $2
            """, screener_id, user_id)
            return "DELETE 1" in result

    async def get_public_screeners(self) -> List[Dict[str, Any]]:
        """Get all public screeners."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, name, filters, is_public, created_at, updated_at
                FROM saved_screeners
                WHERE is_public = true
                ORDER BY created_at DESC
                LIMIT 50
            """)
            return [dict(row) for row in rows]

    async def get_sector_counts(self) -> List[Dict[str, Any]]:
        """Get sectors with stock counts."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT sector, COUNT(*) as count
                FROM stock_fundamentals
                WHERE sector IS NOT NULL
                GROUP BY sector
                ORDER BY count DESC
            """)
            return [{"sector": row["sector"], "count": row["count"]} for row in rows]

    async def get_industry_counts(self, sector: str = None) -> List[Dict[str, Any]]:
        """Get industries with stock counts."""
        async with self.pool.acquire() as conn:
            if sector:
                rows = await conn.fetch("""
                    SELECT industry, COUNT(*) as count
                    FROM stock_fundamentals
                    WHERE industry IS NOT NULL AND sector = $1
                    GROUP BY industry
                    ORDER BY count DESC
                """, sector)
            else:
                rows = await conn.fetch("""
                    SELECT industry, COUNT(*) as count
                    FROM stock_fundamentals
                    WHERE industry IS NOT NULL
                    GROUP BY industry
                    ORDER BY count DESC
                """)
            return [{"industry": row["industry"], "count": row["count"]} for row in rows]

    # =========================================================================
    # BACKTESTING
    # =========================================================================

    async def create_backtest_run(
        self,
        user_id: str,
        name: str,
        strategy: dict,
        symbols: List[str],
        start_date: any,
        end_date: any,
        initial_capital: float
    ) -> str:
        """Create a new backtest run record."""
        import json
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO backtest_runs
                (user_id, name, strategy, symbols, start_date, end_date, initial_capital)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            """, user_id, name, json.dumps(strategy), symbols, start_date, end_date, initial_capital)
            return str(row["id"])

    async def update_backtest_status(
        self,
        backtest_id: str,
        status: str,
        error_message: str = None
    ):
        """Update backtest status."""
        async with self.pool.acquire() as conn:
            if status == 'completed':
                await conn.execute("""
                    UPDATE backtest_runs
                    SET status = $2, completed_at = NOW()
                    WHERE id = $1
                """, backtest_id, status)
            elif status == 'failed':
                await conn.execute("""
                    UPDATE backtest_runs
                    SET status = $2, error_message = $3, completed_at = NOW()
                    WHERE id = $1
                """, backtest_id, status, error_message)
            else:
                await conn.execute("""
                    UPDATE backtest_runs
                    SET status = $2
                    WHERE id = $1
                """, backtest_id, status)

    async def save_backtest_results(
        self,
        backtest_id: str,
        metrics: dict,
        trades: list,
        equity_curve: list
    ):
        """Save backtest results (trades, equity curve, metrics)."""
        async with self.pool.acquire() as conn:
            # Update metrics in backtest_runs
            await conn.execute("""
                UPDATE backtest_runs
                SET
                    final_capital = $2,
                    total_return = $3,
                    cagr = $4,
                    sharpe_ratio = $5,
                    sortino_ratio = $6,
                    max_drawdown = $7,
                    win_rate = $8,
                    profit_factor = $9,
                    total_trades = $10,
                    winning_trades = $11,
                    losing_trades = $12,
                    avg_win = $13,
                    avg_loss = $14
                WHERE id = $1
            """,
                backtest_id,
                metrics.get('final_capital'),
                metrics.get('total_return'),
                metrics.get('cagr'),
                metrics.get('sharpe_ratio'),
                metrics.get('sortino_ratio'),
                metrics.get('max_drawdown'),
                metrics.get('win_rate'),
                metrics.get('profit_factor'),
                metrics.get('total_trades', 0),
                metrics.get('winning_trades', 0),
                metrics.get('losing_trades', 0),
                metrics.get('avg_win'),
                metrics.get('avg_loss')
            )

            # Save trades in batch
            if trades:
                trade_rows = []
                for trade in trades:
                    entry_dt = trade.entry_date
                    exit_dt = trade.exit_date
                    if hasattr(entry_dt, 'to_pydatetime'):
                        entry_dt = entry_dt.to_pydatetime()
                    if exit_dt is not None and hasattr(exit_dt, 'to_pydatetime'):
                        exit_dt = exit_dt.to_pydatetime()
                    trade_rows.append((
                        backtest_id, trade.symbol, trade.trade_type,
                        entry_dt, exit_dt, trade.entry_price, trade.exit_price,
                        trade.quantity, trade.entry_signal, trade.exit_signal,
                        trade.pnl, trade.return_pct, trade.fees, trade.exit_date is None
                    ))
                await conn.executemany("""
                    INSERT INTO backtest_trades
                    (backtest_id, symbol, trade_type, entry_date, exit_date, entry_price,
                     exit_price, quantity, entry_signal, exit_signal, pnl, return_pct, fees, is_open)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                """, trade_rows)

            # Save equity curve in batch
            if equity_curve:
                curve_rows = [(
                    backtest_id,
                    point.date.date() if hasattr(point.date, 'date') else point.date,
                    point.equity, point.cash, point.positions_value,
                    point.daily_return, point.drawdown
                ) for point in equity_curve]
                await conn.executemany("""
                    INSERT INTO backtest_equity_curve
                    (backtest_id, date, equity, cash, positions_value, daily_return, drawdown)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (backtest_id, date) DO UPDATE SET
                        equity = EXCLUDED.equity,
                        cash = EXCLUDED.cash,
                        positions_value = EXCLUDED.positions_value,
                        daily_return = EXCLUDED.daily_return,
                        drawdown = EXCLUDED.drawdown
                """, curve_rows)

    async def get_backtest_run(self, backtest_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a backtest run by ID."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT id, user_id, name, strategy, symbols, start_date, end_date,
                       initial_capital, final_capital, total_return, cagr, sharpe_ratio,
                       sortino_ratio, max_drawdown, win_rate, profit_factor, total_trades,
                       winning_trades, losing_trades, avg_win, avg_loss, status,
                       error_message, created_at, completed_at
                FROM backtest_runs
                WHERE id = $1 AND user_id = $2
            """, backtest_id, user_id)

            if not row:
                return None

            import json as json_lib
            from api.models.schemas import BacktestRun

            # Parse strategy JSON if it's a string
            strategy = row['strategy']
            if isinstance(strategy, str):
                strategy = json_lib.loads(strategy)

            # Parse symbols if it's a string
            symbols = row['symbols']
            if isinstance(symbols, str):
                symbols = json_lib.loads(symbols)

            return BacktestRun(
                id=str(row['id']),
                user_id=row['user_id'],
                name=row['name'],
                strategy=strategy,
                symbols=symbols,
                start_date=row['start_date'].isoformat(),
                end_date=row['end_date'].isoformat(),
                initial_capital=float(row['initial_capital']),
                final_capital=float(row['final_capital']) if row['final_capital'] else None,
                total_return=float(row['total_return']) if row['total_return'] else None,
                cagr=float(row['cagr']) if row['cagr'] else None,
                sharpe_ratio=float(row['sharpe_ratio']) if row['sharpe_ratio'] else None,
                sortino_ratio=float(row['sortino_ratio']) if row['sortino_ratio'] else None,
                max_drawdown=float(row['max_drawdown']) if row['max_drawdown'] else None,
                win_rate=float(row['win_rate']) if row['win_rate'] else None,
                profit_factor=float(row['profit_factor']) if row['profit_factor'] else None,
                total_trades=row['total_trades'] or 0,
                winning_trades=row['winning_trades'] or 0,
                losing_trades=row['losing_trades'] or 0,
                avg_win=float(row['avg_win']) if row['avg_win'] else None,
                avg_loss=float(row['avg_loss']) if row['avg_loss'] else None,
                status=row['status'],
                error_message=row['error_message'],
                created_at=row['created_at'],
                completed_at=row['completed_at']
            )

    async def list_backtest_runs(
        self,
        user_id: str,
        page: int = 1,
        per_page: int = 20,
        status_filter: str = None
    ) -> tuple:
        """List user's backtest runs."""
        async with self.pool.acquire() as conn:
            where_clauses = ["user_id = $1"]
            params = [user_id]
            param_idx = 2

            if status_filter:
                where_clauses.append(f"status = ${param_idx}")
                params.append(status_filter)
                param_idx += 1

            where_sql = " AND ".join(where_clauses)

            # Get total count
            total = await conn.fetchval(f"""
                SELECT COUNT(*) FROM backtest_runs WHERE {where_sql}
            """, *params)

            # Get runs
            offset = (page - 1) * per_page
            params.extend([per_page, offset])

            rows = await conn.fetch(f"""
                SELECT id, user_id, name, strategy, symbols, start_date, end_date,
                       initial_capital, final_capital, total_return, cagr, sharpe_ratio,
                       sortino_ratio, max_drawdown, win_rate, profit_factor, total_trades,
                       winning_trades, losing_trades, avg_win, avg_loss, status,
                       error_message, created_at, completed_at
                FROM backtest_runs
                WHERE {where_sql}
                ORDER BY created_at DESC
                LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """, *params)

            import json as json_lib
            from api.models.schemas import BacktestRun
            runs = []
            for row in rows:
                # Parse strategy JSON if it's a string
                strategy = row['strategy']
                if isinstance(strategy, str):
                    strategy = json_lib.loads(strategy)

                # Parse symbols if it's a string
                symbols = row['symbols']
                if isinstance(symbols, str):
                    symbols = json_lib.loads(symbols)

                runs.append(BacktestRun(
                    id=str(row['id']),
                    user_id=row['user_id'],
                    name=row['name'],
                    strategy=strategy,
                    symbols=symbols,
                    start_date=row['start_date'].isoformat(),
                    end_date=row['end_date'].isoformat(),
                    initial_capital=float(row['initial_capital']),
                    final_capital=float(row['final_capital']) if row['final_capital'] else None,
                    total_return=float(row['total_return']) if row['total_return'] else None,
                    cagr=float(row['cagr']) if row['cagr'] else None,
                    sharpe_ratio=float(row['sharpe_ratio']) if row['sharpe_ratio'] else None,
                    sortino_ratio=float(row['sortino_ratio']) if row['sortino_ratio'] else None,
                    max_drawdown=float(row['max_drawdown']) if row['max_drawdown'] else None,
                    win_rate=float(row['win_rate']) if row['win_rate'] else None,
                    profit_factor=float(row['profit_factor']) if row['profit_factor'] else None,
                    total_trades=row['total_trades'] or 0,
                    winning_trades=row['winning_trades'] or 0,
                    losing_trades=row['losing_trades'] or 0,
                    avg_win=float(row['avg_win']) if row['avg_win'] else None,
                    avg_loss=float(row['avg_loss']) if row['avg_loss'] else None,
                    status=row['status'],
                    error_message=row['error_message'],
                    created_at=row['created_at'],
                    completed_at=row['completed_at']
                ))

            return runs, total

    async def get_backtest_trades(self, backtest_id: str) -> List[Dict[str, Any]]:
        """Get all trades for a backtest."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, symbol, trade_type, entry_date, exit_date, entry_price,
                       exit_price, quantity, entry_signal, exit_signal, pnl, return_pct,
                       fees, is_open
                FROM backtest_trades
                WHERE backtest_id = $1
                ORDER BY entry_date
            """, backtest_id)

            from api.models.schemas import BacktestTrade
            return [BacktestTrade(
                id=row['id'],
                symbol=row['symbol'],
                trade_type=row['trade_type'],
                entry_date=row['entry_date'],
                exit_date=row['exit_date'],
                entry_price=float(row['entry_price']),
                exit_price=float(row['exit_price']) if row['exit_price'] else None,
                quantity=row['quantity'],
                entry_signal=row['entry_signal'],
                exit_signal=row['exit_signal'],
                pnl=float(row['pnl']) if row['pnl'] else None,
                return_pct=float(row['return_pct']) if row['return_pct'] else None,
                fees=float(row['fees']),
                is_open=row['is_open']
            ) for row in rows]

    async def get_backtest_trades_paginated(
        self,
        backtest_id: str,
        page: int = 1,
        per_page: int = 50,
        symbol: str = None
    ) -> tuple:
        """Get paginated trades for a backtest."""
        async with self.pool.acquire() as conn:
            where_clauses = ["backtest_id = $1"]
            params = [backtest_id]
            param_idx = 2

            if symbol:
                where_clauses.append(f"symbol = ${param_idx}")
                params.append(symbol)
                param_idx += 1

            where_sql = " AND ".join(where_clauses)

            # Get total count
            total = await conn.fetchval(f"""
                SELECT COUNT(*) FROM backtest_trades WHERE {where_sql}
            """, *params)

            # Get trades
            offset = (page - 1) * per_page
            params.extend([per_page, offset])

            rows = await conn.fetch(f"""
                SELECT id, symbol, trade_type, entry_date, exit_date, entry_price,
                       exit_price, quantity, entry_signal, exit_signal, pnl, return_pct,
                       fees, is_open
                FROM backtest_trades
                WHERE {where_sql}
                ORDER BY entry_date
                LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """, *params)

            from api.models.schemas import BacktestTrade
            trades = [BacktestTrade(
                id=row['id'],
                symbol=row['symbol'],
                trade_type=row['trade_type'],
                entry_date=row['entry_date'],
                exit_date=row['exit_date'],
                entry_price=float(row['entry_price']),
                exit_price=float(row['exit_price']) if row['exit_price'] else None,
                quantity=row['quantity'],
                entry_signal=row['entry_signal'],
                exit_signal=row['exit_signal'],
                pnl=float(row['pnl']) if row['pnl'] else None,
                return_pct=float(row['return_pct']) if row['return_pct'] else None,
                fees=float(row['fees']),
                is_open=row['is_open']
            ) for row in rows]

            return trades, total

    async def get_backtest_equity_curve(self, backtest_id: str) -> List[Dict[str, Any]]:
        """Get equity curve for a backtest."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT date, equity, cash, positions_value, daily_return, drawdown
                FROM backtest_equity_curve
                WHERE backtest_id = $1
                ORDER BY date
            """, backtest_id)

            return [{
                'date': row['date'],
                'equity': float(row['equity']),
                'cash': float(row['cash']) if row['cash'] else 0,
                'positions_value': float(row['positions_value']) if row['positions_value'] else 0,
                'daily_return': float(row['daily_return']) if row['daily_return'] else 0,
                'drawdown': float(row['drawdown']) if row['drawdown'] else 0
            } for row in rows]

    async def delete_backtest(self, backtest_id: str):
        """Delete a backtest and all associated data."""
        async with self.pool.acquire() as conn:
            # Cascade delete will handle trades and equity curve
            await conn.execute("""
                DELETE FROM backtest_runs WHERE id = $1
            """, backtest_id)


# Global database instance
db = APIDatabase()


async def get_db() -> APIDatabase:
    """Dependency to get database instance."""
    return db

"""
Signal Outcome Tracker

Tracks every signal at 1, 3, 5, 10, 30 day horizons.
Computes hit rates and aggregate statistics for the track record.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import asyncpg

logger = logging.getLogger(__name__)

HORIZONS = [1, 3, 5, 10, 30]
HIT_THRESHOLD_PCT = 2.0  # A signal "hit" if price moved >= 2% in any direction


class OutcomeTracker:

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def ensure_table(self):
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS signal_outcomes (
                    id SERIAL PRIMARY KEY,
                    signal_id TEXT NOT NULL REFERENCES anomalies(id) ON DELETE CASCADE,
                    horizon_days INT NOT NULL,
                    price_at_signal DECIMAL(12,2) NOT NULL,
                    price_at_horizon DECIMAL(12,2),
                    return_pct FLOAT,
                    was_correct BOOLEAN,
                    tracked_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(signal_id, horizon_days)
                );
                CREATE INDEX IF NOT EXISTS idx_signal_outcomes_signal ON signal_outcomes(signal_id);
                CREATE INDEX IF NOT EXISTS idx_signal_outcomes_horizon ON signal_outcomes(horizon_days);
            """)

    async def track_outcomes(self) -> Dict:
        """
        Find all signals eligible for outcome tracking and compute outcomes.
        Run this daily after market data is updated.
        """
        results = {"tracked": 0, "skipped": 0, "errors": 0}

        for horizon in HORIZONS:
            try:
                count = await self._track_horizon(horizon)
                results["tracked"] += count
            except Exception as e:
                logger.error(f"Error tracking {horizon}d outcomes: {e}")
                results["errors"] += 1

        logger.info(f"Outcome tracking complete: {results}")
        return results

    async def _track_horizon(self, horizon_days: int) -> int:
        """Track outcomes for a single horizon."""
        async with self.pool.acquire() as conn:
            # Find signals old enough for this horizon, without an outcome yet
            eligible = await conn.fetch("""
                SELECT a.id, a.symbol, a.price, a.detected_at, a.pattern_type
                FROM anomalies a
                WHERE a.detected_at < NOW() - $1::interval
                AND NOT EXISTS (
                    SELECT 1 FROM signal_outcomes so
                    WHERE so.signal_id = a.id AND so.horizon_days = $2
                )
                ORDER BY a.detected_at DESC
                LIMIT 500
            """, timedelta(days=horizon_days), horizon_days)

            if not eligible:
                return 0

            tracked = 0
            for row in eligible:
                signal_id = row["id"]
                symbol = row["symbol"]
                price_at_signal = float(row["price"])
                detected_at = row["detected_at"]

                # Find the closing price N trading days after the signal
                target_date = detected_at + timedelta(days=horizon_days)
                price_at_horizon = await conn.fetchval("""
                    SELECT close FROM market_data
                    WHERE symbol = $1 AND trade_date >= $2::date
                    ORDER BY trade_date ASC
                    LIMIT 1
                """, symbol, target_date)

                if price_at_horizon is None:
                    continue

                price_at_horizon = float(price_at_horizon)
                return_pct = ((price_at_horizon - price_at_signal) / price_at_signal) * 100
                was_correct = abs(return_pct) >= HIT_THRESHOLD_PCT

                await conn.execute("""
                    INSERT INTO signal_outcomes (signal_id, horizon_days, price_at_signal, price_at_horizon, return_pct, was_correct)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (signal_id, horizon_days) DO NOTHING
                """, signal_id, horizon_days, price_at_signal, price_at_horizon, return_pct, was_correct)
                tracked += 1

            logger.info(f"{horizon_days}d: tracked {tracked}/{len(eligible)} signals")
            return tracked

    async def get_track_record(self) -> Dict:
        """Get aggregate track record statistics."""
        async with self.pool.acquire() as conn:
            total_signals = await conn.fetchval("SELECT COUNT(*) FROM anomalies")

            # Overall hit rates per horizon
            hit_rates = {}
            for horizon in HORIZONS:
                row = await conn.fetchrow("""
                    SELECT
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE was_correct) as hits,
                        AVG(return_pct) as avg_return,
                        AVG(ABS(return_pct)) as avg_abs_return
                    FROM signal_outcomes
                    WHERE horizon_days = $1
                """, horizon)
                total = row["total"] or 0
                hits = row["hits"] or 0
                hit_rates[f"{horizon}d"] = {
                    "total": total,
                    "hits": hits,
                    "hit_rate": round((hits / total * 100) if total > 0 else 0, 1),
                    "avg_return": round(float(row["avg_return"] or 0), 3),
                    "avg_abs_return": round(float(row["avg_abs_return"] or 0), 3),
                }

            # By signal type
            by_type_rows = await conn.fetch("""
                SELECT
                    a.pattern_type,
                    COUNT(DISTINCT a.id) as count,
                    COUNT(so.id) FILTER (WHERE so.horizon_days = 3) as tracked_3d,
                    COUNT(so.id) FILTER (WHERE so.horizon_days = 3 AND so.was_correct) as hits_3d,
                    AVG(so.return_pct) FILTER (WHERE so.horizon_days = 3) as avg_return_3d
                FROM anomalies a
                LEFT JOIN signal_outcomes so ON a.id = so.signal_id
                GROUP BY a.pattern_type
                ORDER BY count DESC
            """)
            by_type = {}
            for r in by_type_rows:
                tracked = r["tracked_3d"] or 0
                hits = r["hits_3d"] or 0
                by_type[r["pattern_type"]] = {
                    "count": r["count"],
                    "hit_rate_3d": round((hits / tracked * 100) if tracked > 0 else 0, 1),
                    "avg_return_3d": round(float(r["avg_return_3d"] or 0), 3),
                }

            # By stock (top 20)
            by_stock_rows = await conn.fetch("""
                SELECT
                    a.symbol,
                    COUNT(DISTINCT a.id) as count,
                    COUNT(so.id) FILTER (WHERE so.horizon_days = 3) as tracked_3d,
                    COUNT(so.id) FILTER (WHERE so.horizon_days = 3 AND so.was_correct) as hits_3d,
                    AVG(so.return_pct) FILTER (WHERE so.horizon_days = 3) as avg_return_3d
                FROM anomalies a
                LEFT JOIN signal_outcomes so ON a.id = so.signal_id
                GROUP BY a.symbol
                ORDER BY count DESC
                LIMIT 20
            """)
            by_stock = {}
            for r in by_stock_rows:
                tracked = r["tracked_3d"] or 0
                hits = r["hits_3d"] or 0
                by_stock[r["symbol"]] = {
                    "count": r["count"],
                    "hit_rate_3d": round((hits / tracked * 100) if tracked > 0 else 0, 1),
                    "avg_return_3d": round(float(r["avg_return_3d"] or 0), 3),
                }

            # Recent signals with outcomes
            recent = await conn.fetch("""
                SELECT
                    a.id, a.symbol, a.pattern_type, a.severity, a.z_score,
                    a.price, a.detected_at, a.confidence_level,
                    so3.return_pct as return_3d, so3.was_correct as correct_3d,
                    so5.return_pct as return_5d, so5.was_correct as correct_5d
                FROM anomalies a
                LEFT JOIN signal_outcomes so3 ON a.id = so3.signal_id AND so3.horizon_days = 3
                LEFT JOIN signal_outcomes so5 ON a.id = so5.signal_id AND so5.horizon_days = 5
                ORDER BY a.detected_at DESC
                LIMIT 20
            """)

            recent_signals = []
            for r in recent:
                recent_signals.append({
                    "id": r["id"],
                    "symbol": r["symbol"],
                    "pattern_type": r["pattern_type"],
                    "severity": r["severity"],
                    "z_score": float(r["z_score"]),
                    "price": float(r["price"]),
                    "detected_at": r["detected_at"].isoformat(),
                    "confidence_level": r["confidence_level"] or 1,
                    "return_3d": round(float(r["return_3d"]), 2) if r["return_3d"] is not None else None,
                    "correct_3d": r["correct_3d"],
                    "return_5d": round(float(r["return_5d"]), 2) if r["return_5d"] is not None else None,
                    "correct_5d": r["correct_5d"],
                })

            return {
                "total_signals": total_signals,
                "hit_rates": hit_rates,
                "by_signal_type": by_type,
                "by_stock": by_stock,
                "recent_signals": recent_signals,
                "last_updated": datetime.now().isoformat(),
            }

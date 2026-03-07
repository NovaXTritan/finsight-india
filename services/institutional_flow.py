"""
Institutional Flow Detection

Detects when institutional buyers/sellers are active using:
1. Volume-based delivery analysis (high volume + price direction)
2. FII/DII daily flow data
3. Large trade detection from market_data volume spikes

Feeds into the triangulation scoring system as Level 3/4 evidence.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import asyncpg

logger = logging.getLogger(__name__)


class InstitutionalFlowDetector:

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def analyze_stock(self, symbol: str) -> Dict:
        """
        Analyze a stock for institutional flow signals.
        Returns dict with detected institutional activity indicators.
        """
        signals = {}

        volume_signal = await self._analyze_volume_delivery(symbol)
        if volume_signal:
            signals["volume_delivery"] = volume_signal

        accumulation = await self._detect_accumulation_distribution(symbol)
        if accumulation:
            signals["accumulation"] = accumulation

        return signals

    async def _analyze_volume_delivery(self, symbol: str) -> Optional[str]:
        """
        Analyze volume patterns to infer institutional activity.
        High volume + small price change = institutional accumulation/distribution.
        High volume + big price move = momentum/retail driven.
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT trade_date, open, high, low, close, volume
                    FROM market_data
                    WHERE symbol = $1
                    ORDER BY trade_date DESC
                    LIMIT 21
                """, symbol)

                if len(rows) < 15:
                    return None

                today = rows[0]
                baseline = rows[1:21]

                today_vol = float(today["volume"])
                avg_vol = sum(float(r["volume"]) for r in baseline) / len(baseline)

                if avg_vol == 0:
                    return None

                vol_ratio = today_vol / avg_vol
                today_range_pct = abs(float(today["close"]) - float(today["open"])) / float(today["open"]) * 100
                avg_range = sum(
                    abs(float(r["close"]) - float(r["open"])) / float(r["open"]) * 100
                    for r in baseline
                ) / len(baseline)

                # High volume + small body = institutional accumulation/distribution
                if vol_ratio >= 1.8 and today_range_pct < avg_range * 0.7:
                    direction = "accumulation" if float(today["close"]) > float(today["open"]) else "distribution"
                    return (
                        f"Volume is {vol_ratio:.1f}x average but price body is narrow "
                        f"({today_range_pct:.2f}% vs avg {avg_range:.2f}%). "
                        f"Pattern suggests institutional {direction}."
                    )

                # Very high volume with price move = strong conviction
                if vol_ratio >= 2.5:
                    direction = "buying" if float(today["close"]) > float(today["open"]) else "selling"
                    return (
                        f"Very high volume at {vol_ratio:.1f}x average with clear {direction} pressure. "
                        f"Likely institutional participation."
                    )

                return None
        except Exception as e:
            logger.debug(f"Volume delivery analysis error for {symbol}: {e}")
            return None

    async def _detect_accumulation_distribution(self, symbol: str) -> Optional[str]:
        """
        Detect multi-day accumulation/distribution using Chaikin-style analysis.
        If close is consistently in upper half of range with rising volume = accumulation.
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT trade_date, high, low, close, volume
                    FROM market_data
                    WHERE symbol = $1
                    ORDER BY trade_date DESC
                    LIMIT 10
                """, symbol)

                if len(rows) < 5:
                    return None

                # Calculate CLV (Close Location Value) for last 5 days
                clv_scores = []
                for r in rows[:5]:
                    high = float(r["high"])
                    low = float(r["low"])
                    close = float(r["close"])
                    if high == low:
                        clv = 0
                    else:
                        clv = ((close - low) - (high - close)) / (high - low)
                    clv_scores.append(clv)

                avg_clv = sum(clv_scores) / len(clv_scores)

                # Consistent accumulation: CLV > 0.3 for most days
                if avg_clv > 0.3:
                    days_positive = sum(1 for c in clv_scores if c > 0)
                    return (
                        f"Close in upper half of daily range for {days_positive}/5 recent sessions "
                        f"(avg CLV: {avg_clv:.2f}). Suggests steady accumulation."
                    )
                elif avg_clv < -0.3:
                    days_negative = sum(1 for c in clv_scores if c < 0)
                    return (
                        f"Close in lower half of daily range for {days_negative}/5 recent sessions "
                        f"(avg CLV: {avg_clv:.2f}). Suggests steady distribution."
                    )

                return None
        except Exception as e:
            logger.debug(f"Accumulation analysis error for {symbol}: {e}")
            return None

    async def get_market_flow_summary(self) -> Dict:
        """
        Get aggregate market flow indicators from recent data.
        Analyzes broad market volume trends.
        """
        try:
            async with self.pool.acquire() as conn:
                # Get aggregate volume trend for Nifty 50 stocks
                today_vol = await conn.fetchval("""
                    SELECT SUM(volume) FROM market_data
                    WHERE trade_date = (SELECT MAX(trade_date) FROM market_data)
                """)

                prev_vol = await conn.fetchval("""
                    SELECT SUM(volume) FROM market_data
                    WHERE trade_date = (
                        SELECT MAX(trade_date) FROM market_data
                        WHERE trade_date < (SELECT MAX(trade_date) FROM market_data)
                    )
                """)

                # Count advancing vs declining stocks
                advances = await conn.fetchval("""
                    SELECT COUNT(*) FROM (
                        SELECT symbol FROM market_data m1
                        WHERE trade_date = (SELECT MAX(trade_date) FROM market_data)
                        AND close > (
                            SELECT close FROM market_data m2
                            WHERE m2.symbol = m1.symbol
                            AND m2.trade_date = (
                                SELECT MAX(trade_date) FROM market_data
                                WHERE trade_date < (SELECT MAX(trade_date) FROM market_data)
                            )
                        )
                    ) adv
                """)

                total_stocks = await conn.fetchval("""
                    SELECT COUNT(DISTINCT symbol) FROM market_data
                    WHERE trade_date = (SELECT MAX(trade_date) FROM market_data)
                """)

                declines = (total_stocks or 0) - (advances or 0)

                return {
                    "market_volume_today": int(today_vol or 0),
                    "market_volume_prev": int(prev_vol or 0),
                    "volume_change_pct": round(
                        ((int(today_vol or 0) - int(prev_vol or 1)) / int(prev_vol or 1)) * 100, 1
                    ) if prev_vol else 0,
                    "advances": advances or 0,
                    "declines": declines,
                    "advance_decline_ratio": round(
                        (advances or 0) / max(declines, 1), 2
                    ),
                }
        except Exception as e:
            logger.error(f"Market flow summary error: {e}")
            return {}

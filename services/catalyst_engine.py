"""
Catalyst Context Engine

For each signal, gathers context on WHY it might have fired:
- News mentions from RSS feeds
- Market-level context (Nifty change, broad sell-off)
- Volume/delivery analysis
- Historical pattern match
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import asyncpg

logger = logging.getLogger(__name__)


class CatalystEngine:

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def get_catalyst_context(self, symbol: str, signal_data: Dict) -> Dict:
        """
        Build catalyst context for a signal.
        Returns dict with identified catalysts.
        """
        context = {}

        # 1. Market-level context
        market_ctx = await self._get_market_context()
        if market_ctx:
            context["market_context"] = market_ctx

        # 2. Historical pattern similarity
        pattern_ctx = await self._get_pattern_history(
            symbol,
            signal_data.get("pattern_type", ""),
            signal_data.get("z_score", 0),
        )
        if pattern_ctx:
            context["historical_pattern"] = pattern_ctx

        # 3. Volume analysis
        volume_ctx = await self._get_volume_context(symbol)
        if volume_ctx:
            context["volume_analysis"] = volume_ctx

        # 4. Sector context
        sector_ctx = await self._get_sector_context(symbol)
        if sector_ctx:
            context["sector_context"] = sector_ctx

        if not context:
            context["note"] = "No specific catalyst identified. Signal is based on statistical anomaly only."

        return context

    async def _get_market_context(self) -> Optional[str]:
        """Check broad market conditions from Nifty 50 data."""
        try:
            async with self.pool.acquire() as conn:
                # Get last 2 days of NIFTY data (use any large-cap as proxy if index not in DB)
                rows = await conn.fetch("""
                    SELECT trade_date, close, volume
                    FROM market_data
                    WHERE symbol IN ('NIFTY', 'RELIANCE')
                    ORDER BY trade_date DESC
                    LIMIT 5
                """)

                if len(rows) < 2:
                    return None

                today_close = float(rows[0]["close"])
                prev_close = float(rows[1]["close"])
                change_pct = ((today_close - prev_close) / prev_close) * 100

                if abs(change_pct) >= 1.0:
                    direction = "up" if change_pct > 0 else "down"
                    return f"Broad market {direction} {abs(change_pct):.1f}% today. Signal may reflect sector-wide movement rather than stock-specific catalyst."

                return None
        except Exception as e:
            logger.debug(f"Market context error: {e}")
            return None

    async def _get_pattern_history(self, symbol: str, pattern_type: str, z_score: float) -> Optional[str]:
        """Check how many times this pattern occurred before and what happened."""
        try:
            async with self.pool.acquire() as conn:
                # Count previous signals of same type for this stock
                past_signals = await conn.fetch("""
                    SELECT a.id, a.detected_at, a.z_score, a.price,
                           so.return_pct, so.was_correct
                    FROM anomalies a
                    LEFT JOIN signal_outcomes so ON a.id = so.signal_id AND so.horizon_days = 3
                    WHERE a.symbol = $1 AND a.pattern_type = $2
                    ORDER BY a.detected_at DESC
                    LIMIT 20
                """, symbol, pattern_type)

                if len(past_signals) < 2:
                    return None

                total = len(past_signals)
                with_outcomes = [s for s in past_signals if s["return_pct"] is not None]
                hits = [s for s in with_outcomes if s["was_correct"]]

                if with_outcomes:
                    hit_rate = len(hits) / len(with_outcomes) * 100
                    avg_return = sum(float(s["return_pct"]) for s in with_outcomes) / len(with_outcomes)
                    return (
                        f"This is the {self._ordinal(total)} {pattern_type.replace('_', ' ')} signal on {symbol}. "
                        f"Of {len(with_outcomes)} past signals with tracked outcomes, "
                        f"{hit_rate:.0f}% resulted in a >= 2% move (avg return: {avg_return:+.1f}%)."
                    )
                else:
                    return f"This is the {self._ordinal(total)} {pattern_type.replace('_', ' ')} signal on {symbol}. No outcome data yet for previous signals."

        except Exception as e:
            logger.debug(f"Pattern history error: {e}")
            return None

    async def _get_volume_context(self, symbol: str) -> Optional[str]:
        """Analyze volume patterns for delivery/accumulation signals."""
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT trade_date, volume, close
                    FROM market_data
                    WHERE symbol = $1
                    ORDER BY trade_date DESC
                    LIMIT 21
                """, symbol)

                if len(rows) < 15:
                    return None

                today_vol = float(rows[0]["volume"])
                baseline_vols = [float(r["volume"]) for r in rows[1:]]
                avg_vol = sum(baseline_vols) / len(baseline_vols)

                if avg_vol == 0:
                    return None

                vol_ratio = today_vol / avg_vol

                if vol_ratio >= 2.0:
                    return (
                        f"Volume is {vol_ratio:.1f}x the 20-day average "
                        f"({today_vol/100000:.1f}L vs avg {avg_vol/100000:.1f}L). "
                        f"Elevated volume often indicates institutional activity or news-driven trading."
                    )
                elif vol_ratio <= 0.5:
                    return (
                        f"Volume is unusually low at {vol_ratio:.1f}x average. "
                        f"Low volume moves can reverse quickly."
                    )
                return None
        except Exception as e:
            logger.debug(f"Volume context error: {e}")
            return None

    async def _get_sector_context(self, symbol: str) -> Optional[str]:
        """Check if other stocks in the same approximate sector are also signaling."""
        try:
            async with self.pool.acquire() as conn:
                # Check other signals from today
                today_signals = await conn.fetch("""
                    SELECT symbol, pattern_type, z_score
                    FROM anomalies
                    WHERE detected_at > CURRENT_DATE
                    AND symbol != $1
                    ORDER BY z_score DESC
                    LIMIT 10
                """, symbol)

                if today_signals:
                    other_symbols = [r["symbol"] for r in today_signals]
                    return (
                        f"{len(today_signals)} other signal(s) detected today: "
                        f"{', '.join(other_symbols[:5])}. "
                        f"Multiple concurrent signals may indicate broad market event."
                    )
                return None
        except Exception as e:
            logger.debug(f"Sector context error: {e}")
            return None

    @staticmethod
    def _ordinal(n: int) -> str:
        if 11 <= (n % 100) <= 13:
            suffix = "th"
        else:
            suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
        return f"{n}{suffix}"


def compute_confidence_level(anomaly: Dict, catalyst_context: Dict) -> int:
    """
    Compute confidence level (1-5) based on triangulation of evidence.

    Level 1: Statistical anomaly only (single Z > 2.0)
    Level 2: Multiple dimensions (volume + price, or price + volatility)
    Level 3: Level 2 + historical pattern support
    Level 4: Level 3 + sector/market confirmation
    Level 5: Level 4 + extreme Z-score (> 4.0)
    """
    level = 1
    zscores = anomaly.get("zscores", {})
    patterns = anomaly.get("patterns_detected", [])

    # Level 2: Multiple anomaly dimensions
    anomaly_dimensions = sum(1 for k in ["volume", "price", "range"] if abs(zscores.get(k, 0)) >= 2.0)
    breakout = 1 if (zscores.get("breakout_high", 0) or zscores.get("breakout_low", 0)) else 0
    if anomaly_dimensions + breakout >= 2:
        level = 2

    # Level 3: Historical pattern support
    if catalyst_context.get("historical_pattern"):
        hist_text = catalyst_context["historical_pattern"]
        # If we have past outcome data
        if "%" in hist_text and "past signals" in hist_text:
            level = max(level, 3)

    # Level 4: Market/sector confirmation
    if catalyst_context.get("sector_context") or catalyst_context.get("market_context"):
        if level >= 3:
            level = 4

    # Level 5: Extreme statistical significance
    max_z = anomaly.get("max_zscore", 0)
    if max_z >= 4.0 and level >= 4:
        level = 5

    return level

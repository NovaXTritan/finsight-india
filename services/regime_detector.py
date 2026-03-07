"""
Market Regime Detector

Classifies the current market as:
- BULL: Trending up, strong breadth, low volatility
- BEAR: Trending down, weak breadth, high volatility
- SIDEWAYS: Low volatility, mixed signals, no clear trend
- VOLATILE: High VIX-equivalent, large swings, regime transition

Uses market_data table for all calculations (no external API calls).

Impact on signals:
- BEAR: bullish signals get confidence -1
- BULL: bearish signals get confidence -1
- VOLATILE: all signals get confidence +1 (anomalies more meaningful)
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
import asyncpg
import numpy as np

logger = logging.getLogger(__name__)

REGIMES = {
    "BULL": {
        "label": "Bull Market",
        "color": "green",
        "description": "Market trending up with strong breadth. Bullish signals preferred.",
    },
    "BEAR": {
        "label": "Bear Market",
        "color": "red",
        "description": "Market trending down with weak breadth. Caution on bullish signals.",
    },
    "SIDEWAYS": {
        "label": "Sideways",
        "color": "yellow",
        "description": "No clear trend. Range-bound trading. Wait for breakout confirmation.",
    },
    "VOLATILE": {
        "label": "Volatile",
        "color": "orange",
        "description": "High volatility, large swings. Anomaly signals carry more weight.",
    },
}


class RegimeDetector:

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def detect_regime(self) -> Dict:
        """
        Detect current market regime.
        Returns regime classification with supporting data.
        """
        scores = {
            "trend": 0,       # -2 to +2
            "breadth": 0,     # -2 to +2
            "volatility": 0,  # 0 to +2
            "momentum": 0,    # -2 to +2
        }
        details = {}

        # 1. Trend: 20-day return of a broad market proxy
        trend_data = await self._calculate_trend()
        if trend_data:
            scores["trend"] = trend_data["score"]
            details["trend"] = trend_data

        # 2. Breadth: advance-decline ratio
        breadth_data = await self._calculate_breadth()
        if breadth_data:
            scores["breadth"] = breadth_data["score"]
            details["breadth"] = breadth_data

        # 3. Volatility: rolling 10-day standard deviation of returns
        vol_data = await self._calculate_volatility()
        if vol_data:
            scores["volatility"] = vol_data["score"]
            details["volatility"] = vol_data

        # 4. Momentum: % of stocks above 20-day moving average
        momentum_data = await self._calculate_momentum()
        if momentum_data:
            scores["momentum"] = momentum_data["score"]
            details["momentum"] = momentum_data

        # Classify regime
        regime, confidence = self._classify(scores)

        return {
            "regime": regime,
            "regime_info": REGIMES[regime],
            "confidence": confidence,
            "scores": scores,
            "details": details,
            "timestamp": datetime.now().isoformat(),
        }

    async def _calculate_trend(self) -> Optional[Dict]:
        """Calculate 20-day market trend using large-cap proxy."""
        try:
            async with self.pool.acquire() as conn:
                # Use RELIANCE as broad market proxy (highest weight in Nifty)
                rows = await conn.fetch("""
                    SELECT trade_date, close
                    FROM market_data
                    WHERE symbol = 'RELIANCE'
                    ORDER BY trade_date DESC
                    LIMIT 25
                """)

                if len(rows) < 20:
                    return None

                current = float(rows[0]["close"])
                twenty_ago = float(rows[19]["close"])
                five_ago = float(rows[4]["close"])

                return_20d = ((current - twenty_ago) / twenty_ago) * 100
                return_5d = ((current - five_ago) / five_ago) * 100

                if return_20d > 3:
                    score = 2
                elif return_20d > 1:
                    score = 1
                elif return_20d < -3:
                    score = -2
                elif return_20d < -1:
                    score = -1
                else:
                    score = 0

                return {
                    "score": score,
                    "return_20d": round(return_20d, 2),
                    "return_5d": round(return_5d, 2),
                    "description": f"Market {'up' if return_20d > 0 else 'down'} {abs(return_20d):.1f}% over 20 days",
                }
        except Exception as e:
            logger.debug(f"Trend calculation error: {e}")
            return None

    async def _calculate_breadth(self) -> Optional[Dict]:
        """Calculate market breadth using advance-decline ratio."""
        try:
            async with self.pool.acquire() as conn:
                latest_date = await conn.fetchval("SELECT MAX(trade_date) FROM market_data")
                prev_date = await conn.fetchval(
                    "SELECT MAX(trade_date) FROM market_data WHERE trade_date < $1",
                    latest_date
                )

                if not latest_date or not prev_date:
                    return None

                # Count advancing vs declining
                ad_data = await conn.fetch("""
                    SELECT
                        t.symbol,
                        t.close as today_close,
                        y.close as prev_close
                    FROM market_data t
                    JOIN market_data y ON t.symbol = y.symbol AND y.trade_date = $2
                    WHERE t.trade_date = $1
                """, latest_date, prev_date)

                advances = sum(1 for r in ad_data if float(r["today_close"]) > float(r["prev_close"]))
                declines = sum(1 for r in ad_data if float(r["today_close"]) < float(r["prev_close"]))
                total = len(ad_data)

                if total == 0:
                    return None

                ad_ratio = advances / max(declines, 1)
                pct_advancing = (advances / total) * 100

                if pct_advancing > 65:
                    score = 2
                elif pct_advancing > 55:
                    score = 1
                elif pct_advancing < 35:
                    score = -2
                elif pct_advancing < 45:
                    score = -1
                else:
                    score = 0

                return {
                    "score": score,
                    "advances": advances,
                    "declines": declines,
                    "ad_ratio": round(ad_ratio, 2),
                    "pct_advancing": round(pct_advancing, 1),
                    "description": f"{advances}/{total} stocks advancing (A/D ratio: {ad_ratio:.2f})",
                }
        except Exception as e:
            logger.debug(f"Breadth calculation error: {e}")
            return None

    async def _calculate_volatility(self) -> Optional[Dict]:
        """Calculate market volatility from rolling returns."""
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT trade_date, close
                    FROM market_data
                    WHERE symbol = 'RELIANCE'
                    ORDER BY trade_date DESC
                    LIMIT 25
                """)

                if len(rows) < 15:
                    return None

                closes = [float(r["close"]) for r in reversed(rows)]
                returns = [(closes[i] - closes[i-1]) / closes[i-1] * 100 for i in range(1, len(closes))]

                vol_10d = np.std(returns[-10:]) if len(returns) >= 10 else np.std(returns)
                vol_20d = np.std(returns[-20:]) if len(returns) >= 20 else vol_10d

                # Annualized volatility proxy
                ann_vol = vol_10d * np.sqrt(252)

                if ann_vol > 25:
                    score = 2  # Very volatile
                elif ann_vol > 18:
                    score = 1  # Elevated
                else:
                    score = 0  # Normal

                return {
                    "score": score,
                    "vol_10d": round(float(vol_10d), 3),
                    "vol_20d": round(float(vol_20d), 3),
                    "annualized": round(float(ann_vol), 1),
                    "description": f"10-day volatility: {vol_10d:.2f}% daily (annualized ~{ann_vol:.0f}%)",
                }
        except Exception as e:
            logger.debug(f"Volatility calculation error: {e}")
            return None

    async def _calculate_momentum(self) -> Optional[Dict]:
        """Calculate % of stocks above their 20-day moving average."""
        try:
            async with self.pool.acquire() as conn:
                # For each stock, check if latest close > 20-day SMA
                result = await conn.fetch("""
                    WITH latest AS (
                        SELECT symbol, close
                        FROM market_data
                        WHERE trade_date = (SELECT MAX(trade_date) FROM market_data)
                    ),
                    sma20 AS (
                        SELECT symbol, AVG(close) as sma
                        FROM market_data
                        WHERE trade_date >= (SELECT MAX(trade_date) FROM market_data) - INTERVAL '30 days'
                        GROUP BY symbol
                        HAVING COUNT(*) >= 15
                    )
                    SELECT
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE l.close > s.sma) as above_sma
                    FROM latest l
                    JOIN sma20 s ON l.symbol = s.symbol
                """)

                if not result or not result[0]["total"]:
                    return None

                total = result[0]["total"]
                above = result[0]["above_sma"]
                pct_above = (above / total) * 100

                if pct_above > 65:
                    score = 2
                elif pct_above > 55:
                    score = 1
                elif pct_above < 35:
                    score = -2
                elif pct_above < 45:
                    score = -1
                else:
                    score = 0

                return {
                    "score": score,
                    "above_20sma": above,
                    "total": total,
                    "pct_above": round(pct_above, 1),
                    "description": f"{above}/{total} stocks ({pct_above:.0f}%) above 20-day SMA",
                }
        except Exception as e:
            logger.debug(f"Momentum calculation error: {e}")
            return None

    def _classify(self, scores: Dict) -> Tuple[str, float]:
        """Classify regime from component scores."""
        trend = scores["trend"]
        breadth = scores["breadth"]
        volatility = scores["volatility"]
        momentum = scores["momentum"]

        # High volatility overrides other signals
        if volatility >= 2:
            confidence = 0.7 + (volatility * 0.1)
            return "VOLATILE", min(confidence, 0.95)

        # Bull: positive trend + breadth + momentum
        bull_score = max(0, trend) + max(0, breadth) + max(0, momentum)
        bear_score = abs(min(0, trend)) + abs(min(0, breadth)) + abs(min(0, momentum))

        if bull_score >= 4:
            return "BULL", min(0.6 + bull_score * 0.08, 0.95)
        elif bear_score >= 4:
            return "BEAR", min(0.6 + bear_score * 0.08, 0.95)
        elif bull_score >= 2 and volatility == 0:
            return "BULL", 0.55 + bull_score * 0.05
        elif bear_score >= 2 and volatility == 0:
            return "BEAR", 0.55 + bear_score * 0.05
        else:
            return "SIDEWAYS", 0.5 + abs(bull_score - bear_score) * 0.05

    def adjust_signal_confidence(self, regime: str, signal: Dict) -> int:
        """
        Adjust signal confidence_level based on market regime.
        Returns adjusted confidence_level (1-5).
        """
        level = signal.get("confidence_level", 1)
        pattern = signal.get("pattern_type", "")

        is_bullish = pattern in ("breakout_high",)
        is_bearish = pattern in ("breakout_low",)

        if regime == "BEAR" and is_bullish:
            level = max(1, level - 1)
        elif regime == "BULL" and is_bearish:
            level = max(1, level - 1)
        elif regime == "VOLATILE":
            level = min(5, level + 1)

        return level

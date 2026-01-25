"""
Real-Time Anomaly Detection for Indian Stocks

Analyzes stocks using Yahoo Finance data and generates signals
only when genuine statistical anomalies are detected.
"""
import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import logging
import yfinance as yf
import numpy as np
import asyncpg

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RealAnomalyDetector:
    """
    Detects real anomalies in stock price and volume data.

    Uses Z-score based detection with configurable thresholds.
    Only generates signals when statistically significant anomalies occur.
    """

    def __init__(self, db_url: str):
        self.db_url = db_url
        self.pool: Optional[asyncpg.Pool] = None

        # Detection thresholds
        self.volume_threshold = 2.0  # Z-score threshold for volume
        self.price_threshold = 2.0   # Z-score threshold for price move
        self.range_threshold = 2.0   # Z-score threshold for volatility

        # Lookback period for baseline
        self.lookback_days = 20

    async def connect(self):
        """Connect to database."""
        self.pool = await asyncpg.create_pool(self.db_url, min_size=1, max_size=5)
        logger.info("Connected to database")

    async def close(self):
        """Close database connection."""
        if self.pool:
            await self.pool.close()

    def fetch_stock_data(self, symbol: str) -> Optional[Dict]:
        """
        Fetch stock data from Yahoo Finance.

        Returns dict with today's data and historical baseline.
        """
        try:
            # Determine the correct Yahoo Finance symbol
            # Indian stocks use .NS (NSE) or .BO (BSE)
            # US stocks don't need suffix
            indian_stocks = [
                'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'HDFC',
                'KOTAKBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'HINDUNILVR',
                'BAJFINANCE', 'MARUTI', 'AXISBANK', 'LT', 'ASIANPAINT',
                'TATAMOTORS', 'SUNPHARMA', 'WIPRO', 'ULTRACEMCO', 'TITAN',
                'NESTLEIND', 'TECHM', 'POWERGRID', 'NTPC', 'M&M', 'ONGC',
                'JSWSTEEL', 'TATASTEEL', 'ADANIENT', 'ADANIPORTS', 'COALINDIA',
                'BPCL', 'GRASIM', 'DIVISLAB', 'DRREDDY', 'CIPLA', 'EICHERMOT',
                'HEROMOTOCO', 'BAJAJFINSV', 'BRITANNIA', 'APOLLOHOSP', 'SBILIFE',
                'HCLTECH', 'INDUSINDBK', 'TATACONSUM', 'UPL', 'VEDL', 'HINDALCO',
            ]

            if symbol.upper() in indian_stocks or not any(c.isalpha() and c.isupper() for c in symbol[-2:]):
                yf_symbol = f"{symbol}.NS"
            else:
                # Try as-is for US stocks
                yf_symbol = symbol

            ticker = yf.Ticker(yf_symbol)

            # Get 25 days of data (20 days baseline + recent days)
            hist = ticker.history(period="25d")

            if len(hist) < 15:
                logger.warning(f"Insufficient data for {symbol}: {len(hist)} days")
                return None

            # Get current info
            info = ticker.info

            # Today's data (most recent)
            today = hist.iloc[-1]

            # Baseline (previous 20 days, excluding today)
            baseline = hist.iloc[-21:-1] if len(hist) >= 21 else hist.iloc[:-1]

            return {
                "symbol": symbol,
                "today": {
                    "date": hist.index[-1],
                    "open": today["Open"],
                    "high": today["High"],
                    "low": today["Low"],
                    "close": today["Close"],
                    "volume": today["Volume"],
                    "range": today["High"] - today["Low"],
                },
                "baseline": {
                    "volume_mean": baseline["Volume"].mean(),
                    "volume_std": baseline["Volume"].std(),
                    "close_mean": baseline["Close"].mean(),
                    "close_std": baseline["Close"].std(),
                    "range_mean": (baseline["High"] - baseline["Low"]).mean(),
                    "range_std": (baseline["High"] - baseline["Low"]).std(),
                    "high_20d": baseline["High"].max(),
                    "low_20d": baseline["Low"].min(),
                },
                "info": {
                    "name": info.get("shortName", symbol),
                    "sector": info.get("sector", "Unknown"),
                    "market_cap": info.get("marketCap", 0),
                    "prev_close": info.get("previousClose", today["Close"]),
                }
            }
        except Exception as e:
            logger.error(f"Error fetching {symbol}: {e}")
            return None

    def calculate_zscores(self, data: Dict) -> Dict[str, float]:
        """Calculate Z-scores for various metrics."""
        today = data["today"]
        baseline = data["baseline"]

        zscores = {}

        # Volume Z-score
        if baseline["volume_std"] > 0:
            zscores["volume"] = (today["volume"] - baseline["volume_mean"]) / baseline["volume_std"]
        else:
            zscores["volume"] = 0

        # Price change Z-score (today's move vs typical daily moves)
        prev_close = data["info"]["prev_close"]
        price_change = (today["close"] - prev_close) / prev_close if prev_close > 0 else 0
        daily_returns = np.diff(np.log(data.get("closes", [prev_close, today["close"]])))
        if baseline["close_std"] > 0:
            # Use percentage change relative to typical volatility
            typical_vol = baseline["close_std"] / baseline["close_mean"]
            zscores["price"] = price_change / typical_vol if typical_vol > 0 else 0
        else:
            zscores["price"] = 0

        # Range (volatility) Z-score
        if baseline["range_std"] > 0:
            zscores["range"] = (today["range"] - baseline["range_mean"]) / baseline["range_std"]
        else:
            zscores["range"] = 0

        # Breakout detection
        zscores["breakout_high"] = 1 if today["high"] > baseline["high_20d"] else 0
        zscores["breakout_low"] = 1 if today["low"] < baseline["low_20d"] else 0

        return zscores

    def detect_anomaly(self, data: Dict, zscores: Dict) -> Optional[Dict]:
        """
        Detect if current data represents an anomaly.

        Returns anomaly details if detected, None otherwise.
        """
        anomalies = []
        max_zscore = 0
        pattern_type = None

        # Check volume spike
        if abs(zscores["volume"]) >= self.volume_threshold:
            anomalies.append("volume_spike")
            if abs(zscores["volume"]) > max_zscore:
                max_zscore = abs(zscores["volume"])
                pattern_type = "volume_spike"

        # Check price momentum
        if abs(zscores["price"]) >= self.price_threshold:
            anomalies.append("price_momentum")
            if abs(zscores["price"]) > max_zscore:
                max_zscore = abs(zscores["price"])
                pattern_type = "price_momentum"

        # Check volatility surge
        if abs(zscores["range"]) >= self.range_threshold:
            anomalies.append("volatility_surge")
            if abs(zscores["range"]) > max_zscore:
                max_zscore = abs(zscores["range"])
                pattern_type = "volatility_surge"

        # Check breakout with volume confirmation
        if zscores["breakout_high"] and zscores["volume"] > 1.5:
            anomalies.append("breakout_high")
            pattern_type = "breakout_high"
            max_zscore = max(max_zscore, zscores["volume"])

        if zscores["breakout_low"] and zscores["volume"] > 1.5:
            anomalies.append("breakout_low")
            pattern_type = "breakout_low"
            max_zscore = max(max_zscore, zscores["volume"])

        if not anomalies:
            return None

        # Determine severity
        if max_zscore >= 4.0:
            severity = "critical"
        elif max_zscore >= 3.0:
            severity = "high"
        elif max_zscore >= 2.5:
            severity = "medium"
        else:
            severity = "low"

        return {
            "pattern_type": pattern_type,
            "patterns_detected": anomalies,
            "max_zscore": max_zscore,
            "severity": severity,
            "zscores": zscores,
        }

    def generate_context(self, data: Dict, anomaly: Dict) -> str:
        """Generate human-readable context for the anomaly."""
        symbol = data["symbol"]
        today = data["today"]
        baseline = data["baseline"]
        pattern = anomaly["pattern_type"]
        zscore = anomaly["max_zscore"]

        vol_ratio = today["volume"] / baseline["volume_mean"] if baseline["volume_mean"] > 0 else 1
        price_change = ((today["close"] - data["info"]["prev_close"]) / data["info"]["prev_close"] * 100) if data["info"]["prev_close"] > 0 else 0

        if pattern == "volume_spike":
            return (
                f"{symbol} detected with unusual volume - {vol_ratio:.1f}x the 20-day average. "
                f"Today's volume of {today['volume']/100000:.1f} Lakh shares vs average of {baseline['volume_mean']/100000:.1f} Lakh. "
                f"This level of activity occurs in less than {self._zscore_to_percentile(zscore):.1f}% of trading days, "
                f"suggesting significant institutional interest or news-driven trading."
            )
        elif pattern == "price_momentum":
            direction = "upward" if price_change > 0 else "downward"
            return (
                f"{symbol} showing strong {direction} momentum with a {abs(price_change):.2f}% move. "
                f"This is {zscore:.1f} standard deviations from typical daily moves. "
                f"Such moves occur less than {self._zscore_to_percentile(zscore):.1f}% of the time, "
                f"indicating a significant shift in market sentiment."
            )
        elif pattern == "volatility_surge":
            range_ratio = today["range"] / baseline["range_mean"] if baseline["range_mean"] > 0 else 1
            return (
                f"{symbol} experiencing elevated volatility - today's range of Rs {today['range']:.2f} is "
                f"{range_ratio:.1f}x the 20-day average. This volatility expansion suggests "
                f"uncertainty or positioning ahead of a significant move."
            )
        elif pattern == "breakout_high":
            return (
                f"{symbol} broke above its 20-day high of Rs {baseline['high_20d']:.2f} on {vol_ratio:.1f}x volume. "
                f"This breakout pattern with volume confirmation often precedes sustained upward moves. "
                f"The stock closed at Rs {today['close']:.2f}."
            )
        elif pattern == "breakout_low":
            return (
                f"{symbol} broke below its 20-day low of Rs {baseline['low_20d']:.2f} on {vol_ratio:.1f}x volume. "
                f"This breakdown pattern with volume confirmation suggests potential further downside. "
                f"The stock closed at Rs {today['close']:.2f}."
            )
        else:
            return f"{symbol} showing unusual activity with Z-score of {zscore:.2f}."

    def generate_sources(self, data: Dict) -> str:
        """Generate sources string showing data used."""
        today = data["today"]
        baseline = data["baseline"]
        info = data["info"]

        vol_ratio = today["volume"] / baseline["volume_mean"] if baseline["volume_mean"] > 0 else 1
        price_change = ((today["close"] - info["prev_close"]) / info["prev_close"] * 100) if info["prev_close"] > 0 else 0

        sources = [
            f"Yahoo Finance Real-time",
            f"Price: Rs {today['close']:.2f} ({price_change:+.2f}%)",
            f"Volume: {today['volume']/100000:.1f}L ({vol_ratio:.1f}x avg)",
            f"Range: Rs {today['low']:.2f} - Rs {today['high']:.2f}",
            f"20-day baseline: {self.lookback_days} days",
            f"Sector: {info['sector']}",
        ]

        return " | ".join(sources)

    def generate_thought_process(self, data: Dict, anomaly: Dict) -> str:
        """Generate AI thought process explaining the analysis."""
        today = data["today"]
        baseline = data["baseline"]
        info = data["info"]
        zscores = anomaly["zscores"]

        vol_ratio = today["volume"] / baseline["volume_mean"] if baseline["volume_mean"] > 0 else 1
        price_change = ((today["close"] - info["prev_close"]) / info["prev_close"] * 100) if info["prev_close"] > 0 else 0

        lines = [
            f"1. VOLUME ANALYSIS: Today's volume {today['volume']/100000:.1f}L vs 20-day avg {baseline['volume_mean']/100000:.1f}L = {vol_ratio:.1f}x",
            f"   Z-Score: {zscores['volume']:.2f} {'- ANOMALY DETECTED' if abs(zscores['volume']) >= 2 else '- Normal range'}",
            f"",
            f"2. PRICE ACTION: Closed at Rs {today['close']:.2f} ({price_change:+.2f}% from previous close)",
            f"   Z-Score: {zscores['price']:.2f} {'- ANOMALY DETECTED' if abs(zscores['price']) >= 2 else '- Normal range'}",
            f"",
            f"3. VOLATILITY: Day range Rs {today['range']:.2f} vs avg Rs {baseline['range_mean']:.2f}",
            f"   Z-Score: {zscores['range']:.2f} {'- ANOMALY DETECTED' if abs(zscores['range']) >= 2 else '- Normal range'}",
            f"",
            f"4. BREAKOUT CHECK:",
            f"   20-day High: Rs {baseline['high_20d']:.2f} - {'BROKEN' if zscores['breakout_high'] else 'Intact'}",
            f"   20-day Low: Rs {baseline['low_20d']:.2f} - {'BROKEN' if zscores['breakout_low'] else 'Intact'}",
            f"",
            f"5. SEVERITY: {anomaly['severity'].upper()} (Max Z-Score: {anomaly['max_zscore']:.2f})",
            f"",
            f"CONCLUSION: {anomaly['pattern_type'].replace('_', ' ').title()} detected.",
            f"Statistical probability of this occurring by chance: <{self._zscore_to_percentile(anomaly['max_zscore']):.1f}%",
        ]

        return "\n".join(lines)

    def _zscore_to_percentile(self, zscore: float) -> float:
        """Convert Z-score to approximate percentile (one-tailed)."""
        # Approximate: Z=2 -> 2.3%, Z=3 -> 0.13%, Z=4 -> 0.003%
        from scipy import stats
        return (1 - stats.norm.cdf(abs(zscore))) * 100

    def determine_decision(self, anomaly: Dict, data: Dict) -> tuple:
        """
        Determine trading decision based on anomaly.

        Returns (decision, confidence, reason)
        """
        pattern = anomaly["pattern_type"]
        severity = anomaly["severity"]
        zscores = anomaly["zscores"]

        # Base confidence from Z-score
        confidence = min(0.95, 0.5 + (anomaly["max_zscore"] - 2) * 0.15)

        if pattern == "breakout_high" and zscores["volume"] > 2:
            decision = "EXECUTE"
            reason = "Bullish breakout with strong volume confirmation"
        elif pattern == "breakout_low" and zscores["volume"] > 2:
            decision = "ALERT"
            reason = "Bearish breakdown - potential short or exit signal"
        elif pattern == "volume_spike":
            if zscores["price"] > 0:
                decision = "MONITOR"
                reason = "High volume with positive price action - watch for follow-through"
            else:
                decision = "REVIEW"
                reason = "High volume selling pressure - needs further analysis"
        elif pattern == "price_momentum":
            decision = "MONITOR"
            reason = f"Strong {'bullish' if zscores['price'] > 0 else 'bearish'} momentum"
        elif pattern == "volatility_surge":
            decision = "REVIEW"
            reason = "Elevated volatility suggests upcoming move"
        else:
            decision = "MONITOR"
            reason = "Unusual activity detected"

        return decision, round(confidence, 2), reason

    async def analyze_symbol(self, symbol: str) -> Optional[Dict]:
        """
        Analyze a single symbol for anomalies.

        Returns signal dict if anomaly detected, None otherwise.
        """
        # Fetch data
        data = self.fetch_stock_data(symbol)
        if not data:
            return None

        # Calculate Z-scores
        zscores = self.calculate_zscores(data)

        # Detect anomaly
        anomaly = self.detect_anomaly(data, zscores)
        if not anomaly:
            logger.info(f"{symbol}: No anomaly detected")
            return None

        # Generate signal
        decision, confidence, reason = self.determine_decision(anomaly, data)

        signal = {
            "id": f"sig-{uuid.uuid4().hex[:8]}",
            "symbol": symbol,
            "pattern_type": anomaly["pattern_type"],
            "severity": anomaly["severity"],
            "z_score": round(anomaly["max_zscore"], 2),
            "price": round(data["today"]["close"], 2),
            "volume": int(data["today"]["volume"]),
            "detected_at": datetime.now(),
            "agent_decision": decision,
            "agent_confidence": confidence,
            "agent_reason": reason,
            "context": self.generate_context(data, anomaly),
            "sources": self.generate_sources(data),
            "thought_process": self.generate_thought_process(data, anomaly),
        }

        logger.info(f"{symbol}: ANOMALY DETECTED - {anomaly['pattern_type']} ({anomaly['severity']})")
        return signal

    async def save_signal(self, signal: Dict):
        """Save signal to database."""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO anomalies (
                    id, symbol, pattern_type, severity, z_score, price, volume,
                    detected_at, agent_decision, agent_confidence, agent_reason,
                    context, sources, thought_process
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (id) DO NOTHING
            """,
                signal["id"], signal["symbol"], signal["pattern_type"],
                signal["severity"], signal["z_score"], signal["price"],
                signal["volume"], signal["detected_at"], signal["agent_decision"],
                signal["agent_confidence"], signal["agent_reason"],
                signal["context"], signal["sources"], signal["thought_process"]
            )

    async def run_detection(self, symbols: List[str]) -> List[Dict]:
        """
        Run detection on a list of symbols.

        Returns list of detected signals.
        """
        signals = []

        for symbol in symbols:
            try:
                signal = await self.analyze_symbol(symbol)
                if signal:
                    await self.save_signal(signal)
                    signals.append(signal)
            except Exception as e:
                logger.error(f"Error analyzing {symbol}: {e}")

        return signals

    async def get_all_watchlist_symbols(self) -> List[str]:
        """Get all unique symbols from all user watchlists."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("SELECT DISTINCT symbol FROM user_watchlist")
            return [row["symbol"] for row in rows]


async def run_detector(db_url: str):
    """Run the detector once."""
    detector = RealAnomalyDetector(db_url)

    try:
        await detector.connect()

        # Get all symbols from watchlists
        symbols = await detector.get_all_watchlist_symbols()
        logger.info(f"Analyzing {len(symbols)} symbols: {symbols}")

        # Run detection
        signals = await detector.run_detection(symbols)

        logger.info(f"Detection complete. Found {len(signals)} anomalies.")
        return signals

    finally:
        await detector.close()


if __name__ == "__main__":
    import os

    # Get database URL from environment or use default
    db_url = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/finsight")

    # Run detector
    signals = asyncio.run(run_detector(db_url))

    if signals:
        print(f"\n{'='*60}")
        print(f"DETECTED {len(signals)} ANOMALIES")
        print(f"{'='*60}")
        for s in signals:
            print(f"\n{s['symbol']}: {s['pattern_type']} ({s['severity']})")
            print(f"  Decision: {s['agent_decision']} ({s['agent_confidence']*100:.0f}% confidence)")
            print(f"  Reason: {s['agent_reason']}")
    else:
        print("\nNo anomalies detected. Market activity is within normal parameters.")

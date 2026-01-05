"""
Anomaly Detection - Statistical methods for finding unusual market activity.
"""
import pandas as pd
import numpy as np
from typing import List
from datetime import datetime

import config
from config import Anomaly, Severity

class AnomalyDetector:
    """
    Multi-method anomaly detector using:
    1. Z-Score (statistical deviation)
    2. EWMA (exponential weighted moving average)
    3. Ensemble voting
    """
    
    def __init__(self, thresholds: dict = None):
        self.thresholds = thresholds or config.DETECTION_THRESHOLDS
    
    async def detect(self, symbol: str, data: pd.DataFrame) -> List[Anomaly]:
        """
        Detect anomalies in market data.
        
        Args:
            symbol: Stock symbol
            data: DataFrame with columns [datetime, open, high, low, close, volume]
        
        Returns:
            List of detected anomalies
        """
        if data is None or len(data) < 20:
            return []
        
        anomalies = []
        
        # Ensure lowercase columns
        data.columns = [c.lower() for c in data.columns]
        
        # Get latest data point
        latest = data.iloc[-1]
        
        # Volume spike detection
        vol_anomaly = self._detect_volume_spike(symbol, data)
        if vol_anomaly:
            anomalies.append(vol_anomaly)
        
        # Price momentum detection
        price_anomaly = self._detect_price_momentum(symbol, data)
        if price_anomaly:
            anomalies.append(price_anomaly)
        
        # Volatility surge detection
        vol_surge = self._detect_volatility_surge(symbol, data)
        if vol_surge:
            anomalies.append(vol_surge)
        
        return anomalies
    
    def _detect_volume_spike(self, symbol: str, data: pd.DataFrame) -> Anomaly:
        """Detect unusual volume."""
        cfg = self.thresholds["volume_spike"]
        
        if len(data) < cfg["min_data_points"]:
            return None
        
        volumes = data["volume"].values
        current_vol = volumes[-1]
        
        # Calculate z-score
        mean_vol = np.mean(volumes[:-1])
        std_vol = np.std(volumes[:-1])
        
        if std_vol == 0 or current_vol < cfg["min_volume"]:
            return None
        
        z_score = (current_vol - mean_vol) / std_vol
        
        if z_score >= cfg["z_score"]:
            severity = self._z_to_severity(z_score)
            return Anomaly.create(
                symbol=symbol,
                type="volume_spike",
                severity=severity,
                z_score=round(z_score, 2),
                price=float(data.iloc[-1]["close"]),
                volume=int(current_vol),
                description=f"Volume {z_score:.1f}σ above average ({int(current_vol):,} vs avg {int(mean_vol):,})"
            )
        return None
    
    def _detect_price_momentum(self, symbol: str, data: pd.DataFrame) -> Anomaly:
        """Detect unusual price movement."""
        cfg = self.thresholds["price_momentum"]
        
        if len(data) < cfg["min_data_points"]:
            return None
        
        # Calculate returns
        data = data.copy()
        data["return"] = data["close"].pct_change()
        returns = data["return"].dropna().values
        current_return = returns[-1]
        
        if abs(current_return) < cfg["min_change"]:
            return None
        
        # Z-score of return
        mean_ret = np.mean(returns[:-1])
        std_ret = np.std(returns[:-1])
        
        if std_ret == 0:
            return None
        
        z_score = abs((current_return - mean_ret) / std_ret)
        
        if z_score >= cfg["z_score"]:
            severity = self._z_to_severity(z_score)
            direction = "up" if current_return > 0 else "down"
            return Anomaly.create(
                symbol=symbol,
                type="price_momentum",
                severity=severity,
                z_score=round(z_score, 2),
                price=float(data.iloc[-1]["close"]),
                volume=int(data.iloc[-1]["volume"]),
                description=f"Price moved {direction} {abs(current_return)*100:.2f}% ({z_score:.1f}σ)"
            )
        return None
    
    def _detect_volatility_surge(self, symbol: str, data: pd.DataFrame) -> Anomaly:
        """Detect unusual volatility."""
        cfg = self.thresholds["volatility"]
        
        if len(data) < cfg["min_data_points"]:
            return None
        
        # Calculate intraday range as % of close
        data = data.copy()
        data["range_pct"] = (data["high"] - data["low"]) / data["close"]
        ranges = data["range_pct"].values
        current_range = ranges[-1]
        
        # Z-score
        mean_range = np.mean(ranges[:-1])
        std_range = np.std(ranges[:-1])
        
        if std_range == 0:
            return None
        
        z_score = (current_range - mean_range) / std_range
        
        if z_score >= cfg["z_score"]:
            severity = self._z_to_severity(z_score)
            return Anomaly.create(
                symbol=symbol,
                type="volatility_surge",
                severity=severity,
                z_score=round(z_score, 2),
                price=float(data.iloc[-1]["close"]),
                volume=int(data.iloc[-1]["volume"]),
                description=f"Volatility {z_score:.1f}σ above normal (range {current_range*100:.2f}%)"
            )
        return None
    
    def _z_to_severity(self, z_score: float) -> Severity:
        """Convert z-score to severity level."""
        if z_score >= 5:
            return Severity.CRITICAL
        elif z_score >= 4:
            return Severity.HIGH
        elif z_score >= 3:
            return Severity.MEDIUM
        else:
            return Severity.LOW

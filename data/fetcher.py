"""
Smart Data Fetcher - Free tier combo with fallback logic.
"""
import asyncio
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
import requests
import time

import config

class SmartDataFetcher:
    """
    Fetches market data using free tier APIs with fallback:
    1. yfinance (primary, unlimited)
    2. Alpha Vantage (5 calls/min, 500/day)
    3. Twelve Data (8 calls/min, 800/day)
    """
    
    def __init__(self):
        self.alpha_key = config.ALPHA_VANTAGE_KEY
        self.twelve_key = config.TWELVE_DATA_KEY
        self.call_counts = {"alpha": 0, "twelve": 0}
        self.last_reset = datetime.now()
    
    def _reset_counts_if_needed(self):
        """Reset API call counts daily."""
        if datetime.now().date() > self.last_reset.date():
            self.call_counts = {"alpha": 0, "twelve": 0}
            self.last_reset = datetime.now()
    
    def fetch(self, symbol: str, period: str = "5d", interval: str = "5m") -> Optional[pd.DataFrame]:
        """
        Fetch market data with fallback logic.
        
        Args:
            symbol: Stock symbol (e.g., "AAPL")
            period: Data period (e.g., "5d", "1mo")
            interval: Data interval (e.g., "5m", "1h", "1d")
        
        Returns:
            DataFrame with OHLCV data or None
        """
        self._reset_counts_if_needed()
        
        # Try yfinance first (most reliable, no rate limits)
        df = self._fetch_yfinance(symbol, period, interval)
        if df is not None and not df.empty:
            return df
        
        # Fallback to Alpha Vantage
        if self.call_counts["alpha"] < 500:
            df = self._fetch_alpha_vantage(symbol, interval)
            if df is not None and not df.empty:
                return df
        
        # Fallback to Twelve Data
        if self.call_counts["twelve"] < 800:
            df = self._fetch_twelve_data(symbol, interval)
            if df is not None and not df.empty:
                return df
        
        print(f"⚠️  Could not fetch data for {symbol}")
        return None
    
    def _fetch_yfinance(self, symbol: str, period: str, interval: str) -> Optional[pd.DataFrame]:
        """Fetch from yfinance."""
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)
            if not df.empty:
                df = df.reset_index()
                df.columns = [c.lower() for c in df.columns]
                return df
        except Exception as e:
            print(f"  yfinance error: {e}")
        return None
    
    def _fetch_alpha_vantage(self, symbol: str, interval: str) -> Optional[pd.DataFrame]:
        """Fetch from Alpha Vantage."""
        if self.alpha_key == "demo":
            return None
            
        try:
            # Map interval
            av_interval = {"5m": "5min", "15m": "15min", "1h": "60min", "1d": "daily"}.get(interval, "5min")
            
            if av_interval == "daily":
                url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&apikey={self.alpha_key}"
            else:
                url = f"https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol={symbol}&interval={av_interval}&apikey={self.alpha_key}"
            
            resp = requests.get(url, timeout=10)
            data = resp.json()
            
            self.call_counts["alpha"] += 1
            time.sleep(12)  # Rate limit: 5 calls/minute
            
            # Parse response
            ts_key = [k for k in data.keys() if "Time Series" in k]
            if ts_key:
                ts_data = data[ts_key[0]]
                df = pd.DataFrame.from_dict(ts_data, orient="index")
                df.index = pd.to_datetime(df.index)
                df.columns = ["open", "high", "low", "close", "volume"]
                df = df.astype(float)
                df = df.sort_index()
                df = df.reset_index().rename(columns={"index": "datetime"})
                return df
        except Exception as e:
            print(f"  Alpha Vantage error: {e}")
        return None
    
    def _fetch_twelve_data(self, symbol: str, interval: str) -> Optional[pd.DataFrame]:
        """Fetch from Twelve Data."""
        if self.twelve_key == "demo":
            return None
            
        try:
            url = f"https://api.twelvedata.com/time_series?symbol={symbol}&interval={interval}&outputsize=100&apikey={self.twelve_key}"
            resp = requests.get(url, timeout=10)
            data = resp.json()
            
            self.call_counts["twelve"] += 1
            time.sleep(8)  # Rate limit: 8 calls/minute
            
            if "values" in data:
                df = pd.DataFrame(data["values"])
                df["datetime"] = pd.to_datetime(df["datetime"])
                df = df.sort_values("datetime")
                for col in ["open", "high", "low", "close", "volume"]:
                    df[col] = df[col].astype(float)
                return df
        except Exception as e:
            print(f"  Twelve Data error: {e}")
        return None
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """Get current price for outcome tracking."""
        try:
            ticker = yf.Ticker(symbol)
            return ticker.info.get("regularMarketPrice") or ticker.info.get("currentPrice")
        except:
            return None

    # =========================================================================
    # ASYNC METHODS - Use these from async contexts to avoid blocking event loop
    # =========================================================================

    async def fetch_async(self, symbol: str, period: str = "5d", interval: str = "5m") -> Optional[pd.DataFrame]:
        """
        Async version of fetch - runs blocking calls in thread pool.

        Use this from async code to avoid blocking the event loop.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.fetch, symbol, period, interval)

    async def get_current_price_async(self, symbol: str) -> Optional[float]:
        """
        Async version of get_current_price - runs in thread pool.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.get_current_price, symbol)

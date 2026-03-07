"""
SmartAPI Client - Angel One market data integration.

Replaces yfinance and market_fallback.py as the primary data source.
Provides real OHLCV data with PostgreSQL caching.
"""
import os
import json
import logging
import time
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any
from pathlib import Path

import requests
import pyotp
import asyncpg
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SmartAPI imports — graceful if not installed
try:
    from SmartApi import SmartConnect
    SMARTAPI_AVAILABLE = True
except ImportError:
    SMARTAPI_AVAILABLE = False
    logger.warning("smartapi-python not installed. Run: pip install smartapi-python")


# =============================================================================
# NIFTY 50 SYMBOL-TO-TOKEN MAPPING
# =============================================================================
# Tokens fetched from Angel One instrument master.
# These are NSE equity segment tokens for Nifty 50 constituents.
# Updated dynamically via fetch_instrument_tokens() on first use.

NIFTY50_SYMBOLS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "HINDUNILVR", "SBIN", "BHARTIARTL", "KOTAKBANK", "ITC",
    "LT", "AXISBANK", "ASIANPAINT", "MARUTI", "TITAN",
    "BAJFINANCE", "SUNPHARMA", "WIPRO", "TATAMOTORS", "HCLTECH",
    "POWERGRID", "NTPC", "ULTRACEMCO", "ONGC", "TATASTEEL",
    "JSWSTEEL", "ADANIENT", "ADANIPORTS", "TECHM", "NESTLEIND",
    "COALINDIA", "BAJAJ-AUTO", "BRITANNIA", "M&M", "INDUSINDBK",
    "DIVISLAB", "DRREDDY", "CIPLA", "EICHERMOT", "GRASIM",
    "APOLLOHOSP", "HEROMOTOCO", "BPCL", "SBILIFE", "BAJAJFINSV",
    "TATACONSUM", "HINDALCO", "LTIM", "SHRIRAMFIN", "HDFCLIFE",
]

# Instrument master URL
INSTRUMENT_MASTER_URL = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"

# Cache directory for instrument master
CACHE_DIR = Path(__file__).parent / ".cache"


class SmartAPIClient:
    """
    Angel One SmartAPI client for real market data.

    Handles authentication (TOTP), instrument mapping, and historical OHLCV.
    Caches data in PostgreSQL to minimize API calls.
    """

    def __init__(
        self,
        api_key: str = "",
        client_code: str = "",
        pin: str = "",
        totp_secret: str = "",
        db_url: str = "",
    ):
        self.api_key = api_key or os.getenv("ANGEL_API_KEY", "")
        self.client_code = client_code or os.getenv("ANGEL_CLIENT_CODE", "")
        self.pin = pin or os.getenv("ANGEL_PIN", "")
        self.totp_secret = totp_secret or os.getenv("ANGEL_TOTP_SECRET", "")
        self.db_url = db_url or os.getenv("DATABASE_URL", "")

        self.conn: SmartConnect = None
        self.auth_token: str = None
        self.pool: Optional[asyncpg.Pool] = None

        # Symbol → token mapping (loaded from instrument master)
        self._token_map: Dict[str, str] = {}
        self._last_auth: Optional[datetime] = None

    # =========================================================================
    # AUTHENTICATION
    # =========================================================================

    def authenticate(self) -> bool:
        """
        Authenticate with Angel One SmartAPI using TOTP.
        Returns True on success, False on failure.
        """
        if not SMARTAPI_AVAILABLE:
            logger.error("smartapi-python not installed")
            return False

        if not all([self.api_key, self.client_code, self.pin, self.totp_secret]):
            logger.error("Missing SmartAPI credentials. Set ANGEL_API_KEY, ANGEL_CLIENT_CODE, ANGEL_PIN, ANGEL_TOTP_SECRET")
            return False

        try:
            self.conn = SmartConnect(api_key=self.api_key)
            totp = pyotp.TOTP(self.totp_secret).now()

            data = self.conn.generateSession(
                self.client_code,
                self.pin,
                totp,
            )

            if data.get("status"):
                self.auth_token = data["data"]["jwtToken"]
                self._last_auth = datetime.now()
                logger.info(f"SmartAPI authenticated for client {self.client_code}")
                return True
            else:
                logger.error(f"SmartAPI auth failed: {data.get('message', 'Unknown error')}")
                return False

        except Exception as e:
            logger.error(f"SmartAPI auth error: {e}")
            return False

    def _ensure_auth(self) -> bool:
        """Re-authenticate if token is stale (>6 hours)."""
        if self._last_auth and (datetime.now() - self._last_auth).seconds < 21600:
            return True
        return self.authenticate()

    # =========================================================================
    # INSTRUMENT TOKEN MAPPING
    # =========================================================================

    def load_instrument_tokens(self) -> Dict[str, str]:
        """
        Load NSE equity symbol-to-token mapping from Angel One instrument master.
        Caches to disk for 24 hours.
        """
        if self._token_map:
            return self._token_map

        # Try disk cache first
        CACHE_DIR.mkdir(exist_ok=True)
        cache_file = CACHE_DIR / "instrument_tokens.json"

        if cache_file.exists():
            mtime = datetime.fromtimestamp(cache_file.stat().st_mtime)
            if (datetime.now() - mtime).total_seconds() < 86400:
                try:
                    with open(cache_file, "r") as f:
                        self._token_map = json.load(f)
                    logger.info(f"Loaded {len(self._token_map)} tokens from cache")
                    return self._token_map
                except Exception:
                    pass

        # Download fresh instrument master
        logger.info("Downloading Angel One instrument master...")
        try:
            resp = requests.get(INSTRUMENT_MASTER_URL, timeout=30)
            resp.raise_for_status()
            instruments = resp.json()

            # Filter NSE equity segment and build symbol → token map
            for inst in instruments:
                if inst.get("exch_seg") == "NSE" and inst.get("symbol", "").endswith("-EQ"):
                    symbol = inst["symbol"].replace("-EQ", "")
                    self._token_map[symbol] = inst["token"]

            # Save cache
            with open(cache_file, "w") as f:
                json.dump(self._token_map, f)

            logger.info(f"Loaded {len(self._token_map)} NSE equity tokens")
            return self._token_map

        except Exception as e:
            logger.error(f"Failed to load instrument master: {e}")
            return self._token_map

    def get_token(self, symbol: str) -> Optional[str]:
        """Get SmartAPI token for a symbol."""
        if not self._token_map:
            self.load_instrument_tokens()
        return self._token_map.get(symbol)

    # =========================================================================
    # HISTORICAL DATA
    # =========================================================================

    def get_historical_data(
        self,
        symbol: str,
        days: int = 60,
        interval: str = "ONE_DAY",
    ) -> Optional[pd.DataFrame]:
        """
        Fetch historical OHLCV candles from SmartAPI.

        Args:
            symbol: NSE ticker (e.g., "RELIANCE")
            days: Number of calendar days to fetch
            interval: ONE_MINUTE, FIVE_MINUTE, FIFTEEN_MINUTE,
                      THIRTY_MINUTE, ONE_HOUR, ONE_DAY

        Returns:
            DataFrame with columns: date, open, high, low, close, volume
            or None on failure.
        """
        if not self._ensure_auth():
            logger.error("Cannot fetch data — not authenticated")
            return None

        token = self.get_token(symbol)
        if not token:
            logger.error(f"No SmartAPI token found for {symbol}")
            return None

        to_date = datetime.now()
        from_date = to_date - timedelta(days=days)

        try:
            params = {
                "exchange": "NSE",
                "symboltoken": token,
                "interval": interval,
                "fromdate": from_date.strftime("%Y-%m-%d 09:15"),
                "todate": to_date.strftime("%Y-%m-%d 15:30"),
            }

            data = self.conn.getCandleData(params)

            if not data or not data.get("status") or not data.get("data"):
                logger.warning(f"No candle data returned for {symbol}: {data}")
                return None

            candles = data["data"]
            df = pd.DataFrame(candles, columns=["datetime", "open", "high", "low", "close", "volume"])
            df["date"] = pd.to_datetime(df["datetime"]).dt.date
            df = df.drop(columns=["datetime"])

            # For daily data, deduplicate by date (keep last)
            if interval == "ONE_DAY":
                df = df.drop_duplicates(subset=["date"], keep="last")

            df = df.sort_values("date").reset_index(drop=True)
            logger.info(f"{symbol}: fetched {len(df)} candles ({days} days)")
            return df

        except Exception as e:
            logger.error(f"Failed to fetch candles for {symbol}: {e}")
            return None

    def get_historical_data_chunked(
        self,
        symbol: str,
        total_days: int = 365,
        chunk_days: int = 60,
        interval: str = "ONE_DAY",
    ) -> Optional[pd.DataFrame]:
        """
        Fetch historical data in chunks (SmartAPI limits to ~60 days per request for daily).

        Returns combined DataFrame or None.
        """
        if not self._ensure_auth():
            return None

        token = self.get_token(symbol)
        if not token:
            logger.error(f"No SmartAPI token found for {symbol}")
            return None

        all_dfs = []
        to_date = datetime.now()

        remaining = total_days
        while remaining > 0:
            fetch_days = min(remaining, chunk_days)
            from_date = to_date - timedelta(days=fetch_days)

            try:
                params = {
                    "exchange": "NSE",
                    "symboltoken": token,
                    "interval": interval,
                    "fromdate": from_date.strftime("%Y-%m-%d 09:15"),
                    "todate": to_date.strftime("%Y-%m-%d 15:30"),
                }
                data = self.conn.getCandleData(params)

                if data and data.get("status") and data.get("data"):
                    candles = data["data"]
                    df = pd.DataFrame(candles, columns=["datetime", "open", "high", "low", "close", "volume"])
                    df["date"] = pd.to_datetime(df["datetime"]).dt.date
                    df = df.drop(columns=["datetime"])
                    all_dfs.append(df)
                else:
                    logger.warning(f"{symbol}: no data for chunk ending {to_date.date()}")

            except Exception as e:
                logger.error(f"{symbol}: chunk fetch error for {to_date.date()}: {e}")

            to_date = from_date - timedelta(days=1)
            remaining -= fetch_days
            time.sleep(0.3)  # Rate limit courtesy

        if not all_dfs:
            return None

        combined = pd.concat(all_dfs, ignore_index=True)
        combined = combined.drop_duplicates(subset=["date"], keep="last")
        combined = combined.sort_values("date").reset_index(drop=True)
        logger.info(f"{symbol}: total {len(combined)} daily candles")
        return combined

    # =========================================================================
    # DATABASE CACHING
    # =========================================================================

    async def connect_db(self):
        """Connect to PostgreSQL."""
        if not self.db_url:
            logger.error("No DATABASE_URL configured")
            return
        self.pool = await asyncpg.create_pool(
            self.db_url, min_size=1, max_size=5,
            statement_cache_size=0,
        )

    async def close_db(self):
        """Close database pool."""
        if self.pool:
            await self.pool.close()

    async def save_candles_to_db(self, symbol: str, df: pd.DataFrame, source: str = "smartapi"):
        """
        Save OHLCV data to market_data table using batch inserts.
        Uses UPSERT (ON CONFLICT UPDATE) to overwrite stale data.
        """
        if self.pool is None or df is None or df.empty:
            return 0

        # Build batch
        batch = []
        for _, row in df.iterrows():
            batch.append((
                symbol, row["date"],
                float(row["open"]), float(row["high"]),
                float(row["low"]), float(row["close"]),
                int(row["volume"]), source
            ))

        rows_saved = 0
        async with self.pool.acquire() as conn:
            chunk_size = 50
            for ci in range(0, len(batch), chunk_size):
                chunk = batch[ci:ci + chunk_size]
                values_parts = []
                params = []
                for idx, row_data in enumerate(chunk):
                    base = idx * 8
                    values_parts.append(
                        f"(${base+1}, ${base+2}, ${base+3}, ${base+4}, ${base+5}, ${base+6}, ${base+7}, ${base+8})"
                    )
                    params.extend(row_data)
                sql = f"""
                    INSERT INTO market_data (symbol, trade_date, open, high, low, close, volume, source)
                    VALUES {', '.join(values_parts)}
                    ON CONFLICT (symbol, trade_date)
                    DO UPDATE SET open=EXCLUDED.open, high=EXCLUDED.high,
                                 low=EXCLUDED.low, close=EXCLUDED.close,
                                 volume=EXCLUDED.volume, fetched_at=NOW(),
                                 source=EXCLUDED.source
                """
                try:
                    await conn.execute(sql, *params)
                    rows_saved += len(chunk)
                except Exception as e:
                    logger.error(f"Batch insert error for {symbol}: {e}")

        return rows_saved

    async def get_cached_data(
        self,
        symbol: str,
        days: int = 25,
    ) -> Optional[pd.DataFrame]:
        """
        Get cached OHLCV data from market_data table.

        Returns DataFrame or None if insufficient data.
        """
        if self.pool is None:
            return None

        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT trade_date, open, high, low, close, volume, fetched_at
                FROM market_data
                WHERE symbol = $1
                ORDER BY trade_date DESC
                LIMIT $2
            """, symbol, days)

        if not rows or len(rows) < 5:
            return None

        df = pd.DataFrame([dict(r) for r in rows])
        df = df.sort_values("trade_date").reset_index(drop=True)

        # Check staleness — if newest data is > 2 days old, flag it
        newest = df["trade_date"].iloc[-1]
        today = date.today()
        days_stale = (today - newest).days
        df.attrs["is_stale"] = days_stale > 3  # Allow weekends
        df.attrs["days_stale"] = days_stale

        return df

    async def fetch_and_cache(
        self,
        symbol: str,
        days: int = 60,
    ) -> Optional[pd.DataFrame]:
        """
        Fetch fresh data from SmartAPI and cache it in the database.
        Falls back to cached data if SmartAPI fails.

        Returns DataFrame with is_stale attribute.
        """
        # Try SmartAPI first
        df = self.get_historical_data(symbol, days=days)
        if df is not None and not df.empty:
            saved = await self.save_candles_to_db(symbol, df)
            logger.info(f"{symbol}: saved {saved} candles to DB")
            df.attrs["is_stale"] = False
            return df

        # Fallback to cached data
        logger.warning(f"{symbol}: SmartAPI failed, trying cached data")
        cached = await self.get_cached_data(symbol, days)
        if cached is not None:
            logger.info(f"{symbol}: using cached data ({cached.attrs.get('days_stale', '?')} days stale)")
            return cached

        logger.error(f"{symbol}: no data available (SmartAPI failed, no cache)")
        return None

    # =========================================================================
    # DETECTION HELPER — provides data in the format real_detector.py expects
    # =========================================================================

    async def get_detection_data(self, symbol: str) -> Optional[Dict]:
        """
        Get stock data formatted for the detection engine.

        Returns dict matching the format of RealAnomalyDetector.fetch_stock_data().
        Tries: SmartAPI → cached DB → None (never fake data).
        """
        # Try to get at least 25 days of data
        df = await self.fetch_and_cache(symbol, days=35)

        if df is None or len(df) < 15:
            # Try cache-only as last resort
            df = await self.get_cached_data(symbol, days=30)
            if df is None or len(df) < 15:
                logger.warning(f"{symbol}: insufficient data for detection ({len(df) if df is not None else 0} days)")
                return None

        # Extract today and baseline
        today_row = df.iloc[-1]
        baseline = df.iloc[-21:-1] if len(df) >= 21 else df.iloc[:-1]

        if len(baseline) < 10:
            logger.warning(f"{symbol}: insufficient baseline data ({len(baseline)} days)")
            return None

        prev_close = df.iloc[-2]["close"] if len(df) >= 2 else today_row["close"]

        return {
            "symbol": symbol,
            "today": {
                "date": today_row["trade_date"],
                "open": float(today_row["open"]),
                "high": float(today_row["high"]),
                "low": float(today_row["low"]),
                "close": float(today_row["close"]),
                "volume": int(today_row["volume"]),
                "range": float(today_row["high"] - today_row["low"]),
            },
            "baseline": {
                "volume_mean": float(baseline["volume"].mean()),
                "volume_std": float(baseline["volume"].std()),
                "close_mean": float(baseline["close"].mean()),
                "close_std": float(baseline["close"].std()),
                "range_mean": float((baseline["high"] - baseline["low"]).mean()),
                "range_std": float((baseline["high"] - baseline["low"]).std()),
                "high_20d": float(baseline["high"].max()),
                "low_20d": float(baseline["low"].min()),
            },
            "info": {
                "name": symbol,
                "sector": "Unknown",
                "market_cap": 0,
                "prev_close": float(prev_close),
            },
            "data_source": "smartapi" if not df.attrs.get("is_stale") else "cached",
            "is_stale": df.attrs.get("is_stale", False),
        }


# =============================================================================
# MODULE-LEVEL SINGLETON
# =============================================================================

_client: Optional[SmartAPIClient] = None


def get_smartapi_client() -> SmartAPIClient:
    """Get or create the singleton SmartAPI client."""
    global _client
    if _client is None:
        _client = SmartAPIClient()
    return _client

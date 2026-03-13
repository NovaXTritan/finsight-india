"""
SmartAPI Client - Low-latency Angel One market data integration.

Key optimizations:
- httpx.AsyncClient with connection pooling (keep-alive, TLS reuse)
- Market Quote API: batch prices in 1 API call instead of N separate calls
- In-memory price cache (5s TTL) to avoid redundant fetches
- Concurrent historical data fetches via asyncio.gather
- Reduced timeouts (5s data, 10s auth) for faster failover
- Sync methods preserved for backward compat (backfill, backtesting)
"""
import os
import json
import logging
import time
import asyncio
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any, Tuple
from pathlib import Path

import httpx
import requests
import pyotp
import asyncpg
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SMARTAPI_AVAILABLE = True

SMARTAPI_BASE = "https://apiconnect.angelone.in"
SMARTAPI_ENDPOINTS = {
    "login": "/rest/auth/angelbroking/user/v1/loginByPassword",
    "candle": "/rest/secure/angelbroking/historical/v1/getCandleData",
    "quote": "/rest/secure/angelbroking/market/v1/quote/",
    "logout": "/rest/secure/angelbroking/user/v1/logout",
}


# =============================================================================
# NIFTY 50 SYMBOL-TO-TOKEN MAPPING
# =============================================================================

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

INSTRUMENT_MASTER_URL = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"

CACHE_DIR = Path("/tmp/.smartapi_cache") if os.getenv("ENVIRONMENT") == "production" else Path(__file__).parent / ".cache"

# Common headers for all SmartAPI requests
_BASE_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-UserType": "USER",
    "X-SourceID": "WEB",
    "X-ClientLocalIP": "127.0.0.1",
    "X-ClientPublicIP": "127.0.0.1",
    "X-MACAddress": "00:00:00:00:00:00",
}


class SmartAPIClient:
    """
    Angel One SmartAPI client — async-first with sync backward compat.

    Async methods (use from FastAPI routes):
      - authenticate_async, get_market_quote, get_live_price_async,
        get_batch_prices_async, get_historical_data_async,
        get_intraday_candles_async

    Sync methods (use from scripts/backtesting):
      - authenticate, get_historical_data, get_historical_data_chunked,
        get_live_price, get_intraday_candles, get_batch_prices
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

        self.auth_token: str = None
        self.refresh_token: str = None
        self.feed_token: str = None
        self.pool: Optional[asyncpg.Pool] = None

        # Symbol ↔ token mappings
        self._token_map: Dict[str, str] = {}
        self._reverse_token_map: Dict[str, str] = {}  # token → symbol
        self._last_auth: Optional[datetime] = None

        # Async HTTP client with connection pooling
        self._http: Optional[httpx.AsyncClient] = None

        # Sync HTTP session with connection pooling (for sync methods)
        self._sync_session: Optional[requests.Session] = None

        # Price cache: symbol → (timestamp, data)
        self._price_cache: Dict[str, Tuple[float, Dict]] = {}
        self._price_cache_ttl = 5  # seconds

        # Concurrency limiter for API calls
        self._semaphore = asyncio.Semaphore(10)

    # =========================================================================
    # HTTP CLIENT MANAGEMENT
    # =========================================================================

    async def _get_http(self) -> httpx.AsyncClient:
        """Get persistent httpx.AsyncClient with connection pooling."""
        if self._http is None or self._http.is_closed:
            self._http = httpx.AsyncClient(
                base_url=SMARTAPI_BASE,
                limits=httpx.Limits(
                    max_connections=20,
                    max_keepalive_connections=10,
                    keepalive_expiry=30,
                ),
                timeout=httpx.Timeout(5.0, connect=3.0),
            )
        return self._http

    def _get_sync_session(self) -> requests.Session:
        """Get persistent requests.Session with connection pooling."""
        if self._sync_session is None:
            self._sync_session = requests.Session()
            adapter = requests.adapters.HTTPAdapter(
                pool_connections=10,
                pool_maxsize=10,
                max_retries=1,
            )
            self._sync_session.mount("https://", adapter)
        return self._sync_session

    async def close(self):
        """Close all connections."""
        if self._http and not self._http.is_closed:
            await self._http.aclose()
            self._http = None
        if self._sync_session:
            self._sync_session.close()
            self._sync_session = None
        if self.pool:
            await self.pool.close()
            self.pool = None

    # =========================================================================
    # HEADERS
    # =========================================================================

    def _login_headers(self) -> Dict:
        """Headers for login (no auth token)."""
        return {**_BASE_HEADERS, "X-PrivateKey": self.api_key}

    def _api_headers(self) -> Dict:
        """Headers for authenticated API calls."""
        return {
            **_BASE_HEADERS,
            "X-PrivateKey": self.api_key,
            "Authorization": f"Bearer {self.auth_token}",
        }

    # =========================================================================
    # AUTHENTICATION — ASYNC (primary)
    # =========================================================================

    async def authenticate_async(self) -> bool:
        """Authenticate with Angel One via async httpx + TOTP."""
        if not all([self.api_key, self.client_code, self.pin, self.totp_secret]):
            logger.error("Missing SmartAPI credentials")
            return False

        try:
            totp = pyotp.TOTP(self.totp_secret).now()
            http = await self._get_http()

            resp = await http.post(
                SMARTAPI_ENDPOINTS["login"],
                json={
                    "clientcode": self.client_code,
                    "password": self.pin,
                    "totp": totp,
                },
                headers=self._login_headers(),
                timeout=10.0,
            )
            data = resp.json()

            if data.get("status"):
                self.auth_token = data["data"]["jwtToken"]
                self.refresh_token = data["data"].get("refreshToken", "")
                self.feed_token = data["data"].get("feedToken", "")
                self._last_auth = datetime.now()
                logger.info(f"SmartAPI authenticated (async) for {self.client_code}")
                return True
            else:
                logger.error(f"SmartAPI auth failed: {data.get('message', 'Unknown')}")
                return False

        except Exception as e:
            logger.error(f"SmartAPI auth error: {e}")
            return False

    async def _ensure_auth_async(self) -> bool:
        """Re-authenticate if token is stale (>6 hours)."""
        if self._last_auth and (datetime.now() - self._last_auth).seconds < 21600:
            return True
        return await self.authenticate_async()

    # =========================================================================
    # AUTHENTICATION — SYNC (backward compat for scripts)
    # =========================================================================

    def authenticate(self) -> bool:
        """Authenticate with Angel One via sync requests + TOTP."""
        if not all([self.api_key, self.client_code, self.pin, self.totp_secret]):
            logger.error("Missing SmartAPI credentials")
            return False

        try:
            totp = pyotp.TOTP(self.totp_secret).now()
            session = self._get_sync_session()

            resp = session.post(
                f"{SMARTAPI_BASE}{SMARTAPI_ENDPOINTS['login']}",
                json={
                    "clientcode": self.client_code,
                    "password": self.pin,
                    "totp": totp,
                },
                headers=self._login_headers(),
                timeout=10,
            )
            data = resp.json()

            if data.get("status"):
                self.auth_token = data["data"]["jwtToken"]
                self.refresh_token = data["data"].get("refreshToken", "")
                self.feed_token = data["data"].get("feedToken", "")
                self._last_auth = datetime.now()
                logger.info(f"SmartAPI authenticated for {self.client_code}")
                return True
            else:
                logger.error(f"SmartAPI auth failed: {data.get('message', 'Unknown')}")
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
        Load NSE equity symbol-to-token mapping from instrument master.
        Caches to disk for 24 hours. Builds reverse map for Quote API.
        """
        if self._token_map:
            return self._token_map

        CACHE_DIR.mkdir(exist_ok=True)
        cache_file = CACHE_DIR / "instrument_tokens.json"

        if cache_file.exists():
            mtime = datetime.fromtimestamp(cache_file.stat().st_mtime)
            if (datetime.now() - mtime).total_seconds() < 86400:
                try:
                    with open(cache_file, "r") as f:
                        self._token_map = json.load(f)
                    self._reverse_token_map = {v: k for k, v in self._token_map.items()}
                    logger.info(f"Loaded {len(self._token_map)} tokens from cache")
                    return self._token_map
                except Exception:
                    pass

        logger.info("Downloading Angel One instrument master...")
        try:
            resp = requests.get(INSTRUMENT_MASTER_URL, timeout=30)
            resp.raise_for_status()
            instruments = resp.json()

            for inst in instruments:
                if inst.get("exch_seg") == "NSE" and inst.get("symbol", "").endswith("-EQ"):
                    symbol = inst["symbol"].replace("-EQ", "")
                    self._token_map[symbol] = inst["token"]

            with open(cache_file, "w") as f:
                json.dump(self._token_map, f)

            self._reverse_token_map = {v: k for k, v in self._token_map.items()}
            logger.info(f"Loaded {len(self._token_map)} NSE equity tokens")
            return self._token_map

        except Exception as e:
            logger.error(f"Failed to load instrument master: {e}")
            return self._token_map

    async def load_instrument_tokens_async(self) -> Dict[str, str]:
        """Async version — downloads instrument master via httpx."""
        if self._token_map:
            return self._token_map

        CACHE_DIR.mkdir(exist_ok=True)
        cache_file = CACHE_DIR / "instrument_tokens.json"

        if cache_file.exists():
            mtime = datetime.fromtimestamp(cache_file.stat().st_mtime)
            if (datetime.now() - mtime).total_seconds() < 86400:
                try:
                    with open(cache_file, "r") as f:
                        self._token_map = json.load(f)
                    self._reverse_token_map = {v: k for k, v in self._token_map.items()}
                    logger.info(f"Loaded {len(self._token_map)} tokens from cache")
                    return self._token_map
                except Exception:
                    pass

        logger.info("Downloading instrument master (async)...")
        try:
            async with httpx.AsyncClient(timeout=30.0) as tmp:
                resp = await tmp.get(INSTRUMENT_MASTER_URL)
                resp.raise_for_status()
                instruments = resp.json()

            for inst in instruments:
                if inst.get("exch_seg") == "NSE" and inst.get("symbol", "").endswith("-EQ"):
                    symbol = inst["symbol"].replace("-EQ", "")
                    self._token_map[symbol] = inst["token"]

            with open(cache_file, "w") as f:
                json.dump(self._token_map, f)

            self._reverse_token_map = {v: k for k, v in self._token_map.items()}
            logger.info(f"Loaded {len(self._token_map)} NSE equity tokens (async)")
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
    # PRICE CACHE
    # =========================================================================

    def _get_cached_price(self, symbol: str) -> Optional[Dict]:
        """Get price from short-lived cache."""
        if symbol in self._price_cache:
            ts, data = self._price_cache[symbol]
            if (time.time() - ts) < self._price_cache_ttl:
                return data
        return None

    def _set_cached_price(self, symbol: str, data: Dict):
        """Cache a price entry."""
        self._price_cache[symbol] = (time.time(), data)

    def _set_cached_prices(self, prices: Dict[str, Dict]):
        """Cache multiple price entries at once."""
        now = time.time()
        for symbol, data in prices.items():
            self._price_cache[symbol] = (now, data)

    # =========================================================================
    # MARKET QUOTE API — THE BIG WIN
    # 1 API call for N symbols instead of N separate candle requests
    # =========================================================================

    async def get_market_quote(
        self,
        symbols: List[str],
        mode: str = "FULL",
    ) -> Dict[str, Dict]:
        """
        Get market quotes for multiple symbols in ONE API call.

        Args:
            symbols: List of NSE tickers (e.g., ["RELIANCE", "TCS", "INFY"])
            mode: "LTP" (fastest), "OHLC", or "FULL" (all data incl 52W, volume)

        Returns:
            Dict of symbol → quote data. For FULL mode includes:
            price, open, high, low, close, volume, change, change_pct,
            high_52w, low_52w, timestamp, data_source
        """
        if not symbols:
            return {}

        # Check cache first — return cached symbols, fetch only missing
        cached_results = {}
        uncached_symbols = []
        for sym in symbols:
            cached = self._get_cached_price(sym)
            if cached:
                cached_results[sym] = cached
            else:
                uncached_symbols.append(sym)

        if not uncached_symbols:
            return cached_results

        if not await self._ensure_auth_async():
            return cached_results

        # Ensure token map is loaded
        if not self._token_map:
            await self.load_instrument_tokens_async()

        # Build token list for API call
        nse_tokens = []
        token_to_symbol = {}
        for sym in uncached_symbols:
            token = self._token_map.get(sym)
            if token:
                nse_tokens.append(token)
                token_to_symbol[token] = sym

        if not nse_tokens:
            return cached_results

        try:
            http = await self._get_http()
            resp = await http.post(
                SMARTAPI_ENDPOINTS["quote"],
                json={
                    "mode": mode,
                    "exchangeTokens": {"NSE": nse_tokens},
                },
                headers=self._api_headers(),
            )
            data = resp.json()

            if not data.get("status") or not data.get("data"):
                logger.warning(f"Quote API failed: {data.get('message', '')}")
                return cached_results

            # Parse response
            fetched = data["data"].get("fetched", [])
            new_prices = {}

            for item in fetched:
                token = item.get("symbolToken", "")
                symbol = token_to_symbol.get(token) or self._reverse_token_map.get(token, "")
                if not symbol:
                    continue

                if mode == "LTP":
                    entry = {
                        "symbol": symbol,
                        "price": item.get("ltp", 0),
                        "data_source": "smartapi",
                    }
                elif mode == "OHLC":
                    entry = {
                        "symbol": symbol,
                        "price": item.get("ltp", 0),
                        "open": item.get("open", 0),
                        "high": item.get("high", 0),
                        "low": item.get("low", 0),
                        "close": item.get("close", 0),
                        "data_source": "smartapi",
                    }
                else:  # FULL
                    ltp = item.get("ltp", 0)
                    entry = {
                        "symbol": symbol,
                        "price": ltp,
                        "open": item.get("open", 0),
                        "high": item.get("high", 0),
                        "low": item.get("low", 0),
                        "close": item.get("close", 0),
                        "volume": item.get("tradeVolume", 0),
                        "change": item.get("netChange", 0),
                        "change_pct": item.get("percentChange", 0),
                        "high_52w": item.get("52WeekHigh"),
                        "low_52w": item.get("52WeekLow"),
                        "avg_price": item.get("avgPrice", 0),
                        "lower_circuit": item.get("lowerCircuit", 0),
                        "upper_circuit": item.get("upperCircuit", 0),
                        "total_buy_qty": item.get("totBuyQuan", 0),
                        "total_sell_qty": item.get("totSellQuan", 0),
                        "timestamp": item.get("exchFeedTime", ""),
                        "data_source": "smartapi",
                    }

                new_prices[symbol] = entry

            # Cache all new prices
            self._set_cached_prices(new_prices)

            # Merge cached + new
            return {**cached_results, **new_prices}

        except Exception as e:
            logger.error(f"Quote API error: {e}")
            return cached_results

    # =========================================================================
    # LIVE PRICE — ASYNC (uses Quote API for speed)
    # =========================================================================

    async def get_live_price_async(self, symbol: str) -> Optional[Dict]:
        """Get live price for a single symbol using Quote LTP API."""
        # Check cache first
        cached = self._get_cached_price(symbol)
        if cached:
            return cached

        result = await self.get_market_quote([symbol], mode="FULL")
        return result.get(symbol)

    # =========================================================================
    # BATCH PRICES — ASYNC (uses Quote API — 1 call for all)
    # =========================================================================

    async def get_batch_prices_async(self, symbols: List[str]) -> Dict[str, Dict]:
        """
        Get latest prices for multiple symbols in ONE API call.
        Replaces the old sequential get_batch_prices.
        """
        # Quote API can handle ~50 symbols per call
        # Split into chunks of 50 if needed
        all_results = {}
        chunk_size = 50

        for i in range(0, len(symbols), chunk_size):
            chunk = symbols[i:i + chunk_size]
            result = await self.get_market_quote(chunk, mode="FULL")
            all_results.update(result)

        return all_results

    # =========================================================================
    # HISTORICAL DATA — ASYNC
    # =========================================================================

    async def get_historical_data_async(
        self,
        symbol: str,
        days: int = 60,
        interval: str = "ONE_DAY",
    ) -> Optional[pd.DataFrame]:
        """Fetch historical OHLCV candles from SmartAPI (async)."""
        if not await self._ensure_auth_async():
            return None

        if not self._token_map:
            await self.load_instrument_tokens_async()

        token = self._token_map.get(symbol)
        if not token:
            logger.error(f"No SmartAPI token found for {symbol}")
            return None

        to_date = datetime.now()
        from_date = to_date - timedelta(days=days)

        try:
            http = await self._get_http()
            async with self._semaphore:
                resp = await http.post(
                    SMARTAPI_ENDPOINTS["candle"],
                    json={
                        "exchange": "NSE",
                        "symboltoken": token,
                        "interval": interval,
                        "fromdate": from_date.strftime("%Y-%m-%d 09:15"),
                        "todate": to_date.strftime("%Y-%m-%d 15:30"),
                    },
                    headers=self._api_headers(),
                )
            data = resp.json()

            if not data or not data.get("status") or not data.get("data"):
                logger.warning(f"No candle data for {symbol}: {data.get('message', '')}")
                return None

            candles = data["data"]
            df = pd.DataFrame(candles, columns=["datetime", "open", "high", "low", "close", "volume"])
            df["date"] = pd.to_datetime(df["datetime"]).dt.date
            df = df.drop(columns=["datetime"])

            if interval == "ONE_DAY":
                df = df.drop_duplicates(subset=["date"], keep="last")

            df = df.sort_values("date").reset_index(drop=True)
            logger.info(f"{symbol}: fetched {len(df)} candles async ({days} days)")
            return df

        except Exception as e:
            logger.error(f"Failed to fetch candles for {symbol}: {e}")
            return None

    async def get_batch_historical_async(
        self,
        symbols: List[str],
        days: int = 5,
    ) -> Dict[str, pd.DataFrame]:
        """
        Fetch historical data for multiple symbols concurrently.
        Uses asyncio.gather with semaphore for rate limiting.
        """
        async def _fetch_one(sym: str) -> Tuple[str, Optional[pd.DataFrame]]:
            df = await self.get_historical_data_async(sym, days=days)
            return (sym, df)

        tasks = [_fetch_one(sym) for sym in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        output = {}
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Batch historical error: {result}")
            elif result[1] is not None:
                output[result[0]] = result[1]

        return output

    # =========================================================================
    # INTRADAY CANDLES — ASYNC
    # =========================================================================

    INTERVAL_MAP = {
        "1m": "ONE_MINUTE",
        "5m": "FIVE_MINUTE",
        "15m": "FIFTEEN_MINUTE",
        "30m": "THIRTY_MINUTE",
        "1h": "ONE_HOUR",
        "1d": "ONE_DAY",
    }

    async def get_intraday_candles_async(
        self,
        symbol: str,
        interval: str = "5m",
        days: int = 5,
    ) -> Optional[List[Dict]]:
        """Get intraday OHLCV candles from SmartAPI (async)."""
        if not await self._ensure_auth_async():
            return None

        if not self._token_map:
            await self.load_instrument_tokens_async()

        token = self._token_map.get(symbol)
        if not token:
            return None

        smartapi_interval = self.INTERVAL_MAP.get(interval, "FIVE_MINUTE")
        now = datetime.now()
        from_dt = now - timedelta(days=days)

        try:
            http = await self._get_http()
            async with self._semaphore:
                resp = await http.post(
                    SMARTAPI_ENDPOINTS["candle"],
                    json={
                        "exchange": "NSE",
                        "symboltoken": token,
                        "interval": smartapi_interval,
                        "fromdate": from_dt.strftime("%Y-%m-%d 09:15"),
                        "todate": now.strftime("%Y-%m-%d 15:30"),
                    },
                    headers=self._api_headers(),
                )
            data = resp.json()
            if not data or not data.get("status") or not data.get("data"):
                return None

            candles = [
                {
                    "datetime": c[0],
                    "open": c[1],
                    "high": c[2],
                    "low": c[3],
                    "close": c[4],
                    "volume": c[5],
                }
                for c in data["data"]
            ]

            logger.info(f"{symbol}: {len(candles)} {interval} candles (async)")
            return candles

        except Exception as e:
            logger.error(f"Intraday error for {symbol}: {e}")
            return None

    # =========================================================================
    # SYNC METHODS — backward compat for scripts/backtesting
    # These use requests.Session with connection pooling
    # =========================================================================

    def get_historical_data(
        self,
        symbol: str,
        days: int = 60,
        interval: str = "ONE_DAY",
    ) -> Optional[pd.DataFrame]:
        """Fetch historical OHLCV candles (sync, for scripts)."""
        if not self._ensure_auth():
            return None

        token = self.get_token(symbol)
        if not token:
            logger.error(f"No SmartAPI token found for {symbol}")
            return None

        to_date = datetime.now()
        from_date = to_date - timedelta(days=days)

        try:
            session = self._get_sync_session()
            resp = session.post(
                f"{SMARTAPI_BASE}{SMARTAPI_ENDPOINTS['candle']}",
                json={
                    "exchange": "NSE",
                    "symboltoken": token,
                    "interval": interval,
                    "fromdate": from_date.strftime("%Y-%m-%d 09:15"),
                    "todate": to_date.strftime("%Y-%m-%d 15:30"),
                },
                headers=self._api_headers(),
                timeout=10,
            )
            data = resp.json()

            if not data or not data.get("status") or not data.get("data"):
                logger.warning(f"No candle data for {symbol}: {data.get('message', '')}")
                return None

            candles = data["data"]
            df = pd.DataFrame(candles, columns=["datetime", "open", "high", "low", "close", "volume"])
            df["date"] = pd.to_datetime(df["datetime"]).dt.date
            df = df.drop(columns=["datetime"])

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
        """Fetch historical data in chunks (sync, for scripts)."""
        if not self._ensure_auth():
            return None

        token = self.get_token(symbol)
        if not token:
            logger.error(f"No SmartAPI token found for {symbol}")
            return None

        session = self._get_sync_session()
        all_dfs = []
        to_date = datetime.now()
        remaining = total_days

        while remaining > 0:
            fetch_days = min(remaining, chunk_days)
            from_date = to_date - timedelta(days=fetch_days)

            try:
                resp = session.post(
                    f"{SMARTAPI_BASE}{SMARTAPI_ENDPOINTS['candle']}",
                    json={
                        "exchange": "NSE",
                        "symboltoken": token,
                        "interval": interval,
                        "fromdate": from_date.strftime("%Y-%m-%d 09:15"),
                        "todate": to_date.strftime("%Y-%m-%d 15:30"),
                    },
                    headers=self._api_headers(),
                    timeout=10,
                )
                data = resp.json()

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
            time.sleep(0.3)

        if not all_dfs:
            return None

        combined = pd.concat(all_dfs, ignore_index=True)
        combined = combined.drop_duplicates(subset=["date"], keep="last")
        combined = combined.sort_values("date").reset_index(drop=True)
        logger.info(f"{symbol}: total {len(combined)} daily candles")
        return combined

    def get_live_price(self, symbol: str) -> Optional[Dict]:
        """Get live price via 1-min candle (sync, backward compat)."""
        if not self._ensure_auth():
            return None

        token = self.get_token(symbol)
        if not token:
            return None

        try:
            now = datetime.now()
            from_dt = now - timedelta(hours=8)
            session = self._get_sync_session()

            resp = session.post(
                f"{SMARTAPI_BASE}{SMARTAPI_ENDPOINTS['candle']}",
                json={
                    "exchange": "NSE",
                    "symboltoken": token,
                    "interval": "ONE_MINUTE",
                    "fromdate": from_dt.strftime("%Y-%m-%d 09:15"),
                    "todate": now.strftime("%Y-%m-%d %H:%M"),
                },
                headers=self._api_headers(),
                timeout=10,
            )
            data = resp.json()
            if not data or not data.get("status") or not data.get("data"):
                return None

            candles = data["data"]
            if not candles:
                return None

            latest = candles[-1]
            return {
                "symbol": symbol,
                "price": latest[4],
                "open": latest[1],
                "high": latest[2],
                "low": latest[3],
                "volume": latest[5],
                "timestamp": latest[0],
                "data_source": "smartapi",
            }

        except Exception as e:
            logger.error(f"SmartAPI live price error for {symbol}: {e}")
            return None

    def get_intraday_candles(
        self,
        symbol: str,
        interval: str = "5m",
        days: int = 5,
    ) -> Optional[List[Dict]]:
        """Get intraday candles (sync, backward compat)."""
        if not self._ensure_auth():
            return None

        token = self.get_token(symbol)
        if not token:
            return None

        smartapi_interval = self.INTERVAL_MAP.get(interval, "FIVE_MINUTE")
        now = datetime.now()
        from_dt = now - timedelta(days=days)

        try:
            session = self._get_sync_session()
            resp = session.post(
                f"{SMARTAPI_BASE}{SMARTAPI_ENDPOINTS['candle']}",
                json={
                    "exchange": "NSE",
                    "symboltoken": token,
                    "interval": smartapi_interval,
                    "fromdate": from_dt.strftime("%Y-%m-%d 09:15"),
                    "todate": now.strftime("%Y-%m-%d 15:30"),
                },
                headers=self._api_headers(),
                timeout=10,
            )
            data = resp.json()
            if not data or not data.get("status") or not data.get("data"):
                return None

            candles = [
                {
                    "datetime": c[0],
                    "open": c[1],
                    "high": c[2],
                    "low": c[3],
                    "close": c[4],
                    "volume": c[5],
                }
                for c in data["data"]
            ]

            logger.info(f"{symbol}: {len(candles)} {interval} candles")
            return candles

        except Exception as e:
            logger.error(f"Intraday error for {symbol}: {e}")
            return None

    def get_batch_prices(self, symbols: List[str]) -> Dict[str, Dict]:
        """Get batch prices (sync, backward compat). Sequential with rate limit."""
        if not self._ensure_auth():
            return {}

        session = self._get_sync_session()
        prices = {}
        for symbol in symbols:
            try:
                result = self.get_live_price(symbol)
                if result:
                    prices[symbol] = result
                time.sleep(0.1)
            except Exception as e:
                logger.warning(f"Batch price error for {symbol}: {e}")

        return prices

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
        """Save OHLCV data to market_data table using batch UPSERT."""
        if self.pool is None or df is None or df.empty:
            return 0

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
        """Get cached OHLCV data from market_data table."""
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

        newest = df["trade_date"].iloc[-1]
        today = date.today()
        days_stale = (today - newest).days
        df.attrs["is_stale"] = days_stale > 3
        df.attrs["days_stale"] = days_stale

        return df

    async def fetch_and_cache(
        self,
        symbol: str,
        days: int = 60,
    ) -> Optional[pd.DataFrame]:
        """Fetch from SmartAPI (async) and cache in DB. Falls back to cached data."""
        # Try async SmartAPI first
        df = await self.get_historical_data_async(symbol, days=days)
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
    # DETECTION HELPER
    # =========================================================================

    async def get_detection_data(self, symbol: str) -> Optional[Dict]:
        """Get stock data formatted for the detection engine."""
        df = await self.fetch_and_cache(symbol, days=35)

        if df is None or len(df) < 15:
            df = await self.get_cached_data(symbol, days=30)
            if df is None or len(df) < 15:
                logger.warning(f"{symbol}: insufficient data for detection ({len(df) if df is not None else 0} days)")
                return None

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

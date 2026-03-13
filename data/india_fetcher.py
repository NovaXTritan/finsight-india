"""
Indian Market Data Fetcher

Data source priority:
1. SmartAPI (Angel One) — real-time prices and intraday charts
2. NSE India — indices, FII/DII, Nifty 50 constituents
3. Yahoo Finance — historical fallback
4. PostgreSQL market_data — cached SmartAPI data
5. Static fallback — hardcoded (last resort)
"""
import asyncio
import aiohttp
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
import json
import logging
import time
import yfinance as yf

import config
from data.market_fallback import (
    get_fallback_indices, get_fallback_fii_dii, get_fallback_nifty50,
    get_fallback_price, get_fallback_stock_candles,
)

logger = logging.getLogger(__name__)


class NSEFetcher:
    """
    Fetches data directly from NSE India website.

    NSE blocks requests without proper headers, so we need to:
    1. First visit the main page to get cookies
    2. Then make API requests with those cookies
    """

    def __init__(self):
        self.base_url = config.NSE_BASE_URL
        self.session = None
        self.cookies = {}
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": "https://www.nseindia.com/",
            "X-Requested-With": "XMLHttpRequest",
            "Connection": "keep-alive",
        }
        self._last_request = 0
        self._min_interval = 1.0  # Minimum seconds between requests

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session with cookies."""
        if self.session is None or self.session.closed:
            # Create new session
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout, headers=self.headers)

            # Visit main page to get cookies
            try:
                async with self.session.get(self.base_url) as resp:
                    if resp.status == 200:
                        # Store cookies
                        for cookie in resp.cookies.values():
                            self.cookies[cookie.key] = cookie.value
                        logger.info("NSE session initialized with cookies")
            except Exception as e:
                logger.warning(f"Failed to initialize NSE session: {e}")

        return self.session

    async def _rate_limit(self):
        """Ensure minimum interval between requests."""
        elapsed = time.time() - self._last_request
        if elapsed < self._min_interval:
            await asyncio.sleep(self._min_interval - elapsed)
        self._last_request = time.time()

    async def _fetch_json(self, endpoint: str) -> Optional[Dict]:
        """Fetch JSON from NSE API endpoint."""
        await self._rate_limit()

        session = await self._get_session()
        url = f"{self.base_url}{endpoint}"

        try:
            async with session.get(url, cookies=self.cookies) as resp:
                if resp.status == 200:
                    return await resp.json()
                elif resp.status == 403:
                    # Session expired, reset and retry
                    logger.warning("NSE session expired, reinitializing...")
                    await self.close()
                    session = await self._get_session()
                    async with session.get(url, cookies=self.cookies) as retry_resp:
                        if retry_resp.status == 200:
                            return await retry_resp.json()
                logger.warning(f"NSE API returned {resp.status} for {endpoint}")
                return None
        except Exception as e:
            logger.error(f"NSE API error for {endpoint}: {e}")
            return None

    async def close(self):
        """Close the session."""
        if self.session and not self.session.closed:
            await self.session.close()
        self.session = None
        self.cookies = {}

    # =========================================================================
    # PUBLIC API METHODS
    # =========================================================================

    async def get_all_indices(self) -> Optional[Dict]:
        """
        Get all NSE indices data.

        Returns dict with indices like NIFTY 50, NIFTY BANK, etc.
        """
        return await self._fetch_json(config.NSE_API_ENDPOINTS["indices"])

    async def get_nifty50_stocks(self) -> Optional[List[Dict]]:
        """
        Get Nifty 50 constituent stocks with live data.

        Returns list of stocks with prices, change, volume, etc.
        """
        data = await self._fetch_json(config.NSE_API_ENDPOINTS["nifty50"])
        if data and "data" in data:
            return data["data"]
        return None

    async def get_fii_dii_data(self) -> Optional[Dict]:
        """
        Get FII/DII trading activity.

        Returns:
            Dict with FII and DII buy/sell values
        """
        return await self._fetch_json(config.NSE_API_ENDPOINTS["fii_dii"])

    async def get_market_status(self) -> Optional[Dict]:
        """Check if market is open/closed."""
        return await self._fetch_json(config.NSE_API_ENDPOINTS["market_status"])

    async def get_bulk_deals(self) -> Optional[List[Dict]]:
        """Get today's bulk deals."""
        data = await self._fetch_json(config.NSE_API_ENDPOINTS["bulk_deals"])
        if data and "data" in data:
            return data["data"]
        return None

    async def get_block_deals(self) -> Optional[List[Dict]]:
        """Get today's block deals."""
        data = await self._fetch_json(config.NSE_API_ENDPOINTS["block_deals"])
        if data and "data" in data:
            return data["data"]
        return None

    async def get_option_chain(self, symbol: str = "NIFTY") -> Optional[Dict]:
        """
        Get option chain data for index.

        Args:
            symbol: "NIFTY" or "BANKNIFTY"
        """
        endpoint_key = f"option_chain_{symbol.lower()}"
        if endpoint_key in config.NSE_API_ENDPOINTS:
            return await self._fetch_json(config.NSE_API_ENDPOINTS[endpoint_key])
        return None


class IndiaDataFetcher:
    """
    Main Indian market data fetcher.

    Priority: SmartAPI → NSE → Yahoo → DB cache → static fallback.
    """

    def __init__(self, db_pool=None):
        self.nse = NSEFetcher()
        self.db_pool = db_pool  # Optional asyncpg pool for market_data table
        self._cache = {}
        self._cache_ttl = 60  # Cache TTL in seconds
        self._smartapi = None  # Lazy-loaded SmartAPI singleton

    async def close(self):
        """Close all connections."""
        await self.nse.close()

    def _is_cache_valid(self, key: str) -> bool:
        """Check if cache entry is still valid."""
        if key not in self._cache:
            return False
        cached_time, _ = self._cache[key]
        return (time.time() - cached_time) < self._cache_ttl

    def _get_cached(self, key: str) -> Optional[Any]:
        """Get cached value if valid."""
        if self._is_cache_valid(key):
            _, value = self._cache[key]
            return value
        return None

    def _set_cache(self, key: str, value: Any):
        """Set cache value."""
        self._cache[key] = (time.time(), value)

    # =========================================================================
    # SMARTAPI ACCESS
    # =========================================================================

    def _get_smartapi(self):
        """Get or initialize SmartAPI singleton (lazy, stays authenticated)."""
        if self._smartapi is None:
            try:
                from data.smartapi_client import get_smartapi_client
                client = get_smartapi_client()
                # Ensure token map is loaded
                if not client._token_map:
                    client.load_instrument_tokens()
                self._smartapi = client
            except Exception as e:
                logger.warning(f"SmartAPI init failed: {e}")
        return self._smartapi

    async def _get_smartapi_async(self):
        """Get SmartAPI singleton with async token loading."""
        if self._smartapi is None:
            try:
                from data.smartapi_client import get_smartapi_client
                client = get_smartapi_client()
                if not client._token_map:
                    await client.load_instrument_tokens_async()
                self._smartapi = client
            except Exception as e:
                logger.warning(f"SmartAPI init failed: {e}")
        return self._smartapi

    # =========================================================================
    # DATABASE HELPERS (market_data table from SmartAPI)
    # =========================================================================

    async def _get_nifty50_from_db(self) -> Optional[pd.DataFrame]:
        """Get latest Nifty 50 stock data from market_data table."""
        if not self.db_pool:
            return None

        try:
            from data.smartapi_client import NIFTY50_SYMBOLS
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT DISTINCT ON (symbol)
                        symbol, open, high, low, close, volume, trade_date
                    FROM market_data
                    WHERE symbol = ANY($1::text[])
                    ORDER BY symbol, trade_date DESC
                """, NIFTY50_SYMBOLS)

            if not rows or len(rows) < 10:
                return None

            records = []
            for r in rows:
                close = float(r["close"])
                open_p = float(r["open"])
                # Estimate prev_close as open (close approximation)
                change = close - open_p
                change_pct = (change / open_p * 100) if open_p > 0 else 0
                records.append({
                    "symbol": r["symbol"],
                    "open": float(r["open"]),
                    "high": float(r["high"]),
                    "low": float(r["low"]),
                    "last_price": close,
                    "prev_close": open_p,
                    "change": round(change, 2),
                    "change_pct": round(change_pct, 2),
                    "volume": int(r["volume"] or 0),
                    "value": 0,
                })

            logger.info(f"DB returned data for {len(records)} Nifty 50 stocks")
            return pd.DataFrame(records)
        except Exception as e:
            logger.warning(f"DB Nifty 50 query failed: {e}")
            return None

    async def _get_price_from_db(self, symbol: str) -> Optional[float]:
        """Get latest closing price from market_data table."""
        if not self.db_pool:
            return None

        clean = symbol.replace(".NS", "").replace(".BO", "").upper()
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow("""
                    SELECT close FROM market_data
                    WHERE symbol = $1
                    ORDER BY trade_date DESC
                    LIMIT 1
                """, clean)
            if row:
                return float(row["close"])
        except Exception as e:
            logger.warning(f"DB price query failed for {clean}: {e}")
        return None

    async def _get_stock_candles_from_db(
        self, symbol: str, days: int = 60
    ) -> Optional[pd.DataFrame]:
        """Get OHLCV candles from market_data table."""
        if not self.db_pool:
            return None

        clean = symbol.replace(".NS", "").replace(".BO", "").upper()
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT trade_date as datetime, open, high, low, close, volume
                    FROM market_data
                    WHERE symbol = $1
                    ORDER BY trade_date DESC
                    LIMIT $2
                """, clean, days)

            if not rows or len(rows) < 2:
                return None

            df = pd.DataFrame([dict(r) for r in rows])
            df = df.sort_values("datetime").reset_index(drop=True)
            df.columns = [c.lower() for c in df.columns]
            logger.info(f"DB returned {len(df)} candles for {clean}")
            return df
        except Exception as e:
            logger.warning(f"DB candle query failed for {clean}: {e}")
        return None

    async def _get_indices_from_db(self) -> Optional[Dict]:
        """
        Compute approximate index data from constituent stock prices in DB.
        Uses Nifty 50 stocks to derive a rough index picture.
        """
        if not self.db_pool:
            return None

        try:
            async with self.db_pool.acquire() as conn:
                # Get latest 2 trading days of data for all Nifty 50 stocks
                rows = await conn.fetch("""
                    WITH latest_dates AS (
                        SELECT DISTINCT trade_date FROM market_data
                        WHERE symbol = 'RELIANCE'
                        ORDER BY trade_date DESC LIMIT 2
                    )
                    SELECT m.symbol, m.trade_date, m.open, m.high, m.low, m.close, m.volume
                    FROM market_data m
                    WHERE m.trade_date IN (SELECT trade_date FROM latest_dates)
                    ORDER BY m.symbol, m.trade_date
                """)

            if not rows or len(rows) < 10:
                return None

            # Group by symbol, get today vs previous
            from collections import defaultdict
            by_symbol = defaultdict(list)
            for r in rows:
                by_symbol[r["symbol"]].append(r)

            # Count advances/declines to get a market picture
            advances = 0
            declines = 0
            total_change_pct = 0
            count = 0

            for sym, days_data in by_symbol.items():
                if len(days_data) >= 2:
                    today = days_data[-1]
                    prev = days_data[-2]
                    today_close = float(today["close"])
                    prev_close = float(prev["close"])
                    if prev_close > 0:
                        chg_pct = (today_close - prev_close) / prev_close * 100
                        total_change_pct += chg_pct
                        count += 1
                        if chg_pct > 0:
                            advances += 1
                        else:
                            declines += 1

            if count == 0:
                return None

            avg_change_pct = total_change_pct / count

            # Use the average to estimate index change
            # Approximate Nifty 50 around 22000-24000 range
            nifty_approx = 23000
            nifty_change = nifty_approx * avg_change_pct / 100

            indices = {
                "NIFTY 50": {
                    "value": round(nifty_approx + nifty_change, 2),
                    "change": round(nifty_change, 2),
                    "change_pct": round(avg_change_pct, 2),
                    "open": round(nifty_approx, 2),
                    "high": round(nifty_approx + abs(nifty_change) * 1.5, 2),
                    "low": round(nifty_approx - abs(nifty_change) * 0.5, 2),
                },
            }

            logger.info(f"DB derived index data: avg change {avg_change_pct:.2f}%, A/D={advances}/{declines}")
            return {"data": indices, "data_source": "database", "is_live": False}

        except Exception as e:
            logger.warning(f"DB index derivation failed: {e}")
            return None

    # =========================================================================
    # STOCK DATA
    # =========================================================================

    async def _fetch_from_smartapi(
        self,
        symbol: str,
        period: str = "5d",
        interval: str = "5m"
    ) -> Optional[pd.DataFrame]:
        """Fetch stock data from SmartAPI (async, primary source)."""
        client = await self._get_smartapi_async()
        if not client:
            return None

        clean = symbol.replace(".NS", "").replace(".BO", "").upper()
        period_days = {"1d": 1, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365}
        days = period_days.get(period, 5)

        try:
            candles = await client.get_intraday_candles_async(clean, interval=interval, days=days)
            if candles and len(candles) > 0:
                df = pd.DataFrame(candles)
                df.columns = [c.lower() for c in df.columns]
                return df
        except Exception as e:
            logger.warning(f"SmartAPI chart failed for {clean}: {e}")

        return None

    def _fetch_from_yahoo(
        self,
        symbol: str,
        period: str = "5d",
        interval: str = "5m"
    ) -> Optional[pd.DataFrame]:
        """Fetch stock data from Yahoo Finance (secondary source)."""
        if not symbol.endswith((".NS", ".BO")):
            symbol = f"{symbol}.NS"

        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)

            if df.empty:
                return None

            df = df.reset_index()
            df.columns = [c.lower() for c in df.columns]
            if 'date' in df.columns:
                df = df.rename(columns={'date': 'datetime'})
            return df
        except Exception as e:
            logger.warning(f"Yahoo chart failed for {symbol}: {e}")
            return None

    async def fetch_stock_data_async(
        self,
        symbol: str,
        period: str = "5d",
        interval: str = "5m"
    ) -> Optional[pd.DataFrame]:
        """
        Fetch stock data: SmartAPI → Yahoo → DB → static fallback.

        Args:
            symbol: Stock symbol (e.g., RELIANCE)
            period: 1d, 5d, 1mo, 3mo, 6mo, 1y
            interval: 1m, 5m, 15m, 30m, 1h, 1d
        """
        loop = asyncio.get_event_loop()

        # 1. SmartAPI (async, best for intraday)
        df = await self._fetch_from_smartapi(symbol, period, interval)
        if df is not None and not df.empty:
            return df

        # 2. Yahoo Finance
        df = await loop.run_in_executor(
            None, self._fetch_from_yahoo, symbol, period, interval
        )
        if df is not None and not df.empty:
            return df

        # 3. Database (daily candles only)
        period_days = {"1d": 1, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365}
        days = period_days.get(period, 30)
        db_df = await self._get_stock_candles_from_db(symbol, days=days)
        if db_df is not None and not db_df.empty:
            return db_df

        # 4. Static fallback
        logger.warning(f"All sources failed for {symbol}, using static fallback")
        candles = get_fallback_stock_candles(symbol, period, interval)
        return pd.DataFrame(candles) if candles else None

    async def _get_price_smartapi(self, symbol: str) -> Optional[float]:
        """Get live price from SmartAPI (async, uses Quote API)."""
        client = await self._get_smartapi_async()
        if not client:
            return None
        clean = symbol.replace(".NS", "").replace(".BO", "").upper()
        try:
            result = await client.get_live_price_async(clean)
            if result and result.get("price"):
                return result["price"]
        except Exception as e:
            logger.warning(f"SmartAPI price failed for {clean}: {e}")
        return None

    def _get_price_yahoo(self, symbol: str) -> Optional[float]:
        """Get current price from Yahoo Finance."""
        if not symbol.endswith((".NS", ".BO")):
            symbol = f"{symbol}.NS"
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            price = info.get("regularMarketPrice") or info.get("currentPrice")
            if price:
                return price
        except Exception as e:
            logger.warning(f"Yahoo price failed for {symbol}: {e}")
        return None

    async def get_current_price_async(self, symbol: str) -> Optional[float]:
        """Get price: SmartAPI → Yahoo → DB → static fallback."""
        loop = asyncio.get_event_loop()

        # 1. SmartAPI (async, near real-time via Quote API)
        price = await self._get_price_smartapi(symbol)
        if price:
            return price

        # 2. Yahoo Finance
        price = await loop.run_in_executor(None, self._get_price_yahoo, symbol)
        if price:
            return price

        # 3. Database
        db_price = await self._get_price_from_db(symbol)
        if db_price:
            return db_price

        # 4. Static fallback
        fallback_price = get_fallback_price(symbol)
        if fallback_price:
            logger.warning(f"Using static fallback price for {symbol}")
        return fallback_price

    # =========================================================================
    # INDICES
    # =========================================================================

    async def get_indices(self) -> Dict[str, Dict]:
        """
        Get major Indian indices data.

        Returns:
            Dict with index name -> {value, change, change_pct}
        """
        cached = self._get_cached("indices")
        if cached:
            return cached

        # Try NSE first
        nse_data = await self.nse.get_all_indices()
        if nse_data and "data" in nse_data:
            indices = {}
            for item in nse_data["data"]:
                name = item.get("indexSymbol", item.get("index", ""))
                if name in ["NIFTY 50", "NIFTY BANK", "NIFTY IT", "INDIA VIX", "NIFTY NEXT 50"]:
                    indices[name] = {
                        "value": item.get("last", 0),
                        "change": item.get("change", 0),
                        "change_pct": item.get("percentChange", 0),
                        "open": item.get("open", 0),
                        "high": item.get("high", 0),
                        "low": item.get("low", 0),
                    }
            if indices:
                result = {"data": indices, "data_source": "nse", "is_live": True}
                self._set_cache("indices", result)
                return result

        # Fallback to Yahoo Finance
        # Map config keys to display names matching NSE format
        DISPLAY_NAMES = {
            "NIFTY50": "NIFTY 50",
            "SENSEX": "SENSEX",
            "BANKNIFTY": "NIFTY BANK",
            "NIFTYIT": "NIFTY IT",
            "INDIAVIX": "INDIA VIX",
        }
        indices = {}
        for config_name, symbol in config.INDIA_INDICES.items():
            display_name = DISPLAY_NAMES.get(config_name, config_name)
            try:
                ticker = yf.Ticker(symbol)
                # Try fast_info first, fall back to history() if it fails
                try:
                    fi = ticker.fast_info
                    price = fi.last_price
                    prev = fi.previous_close
                    if price and prev and prev > 0:
                        indices[display_name] = {
                            "value": round(price, 2),
                            "change": round(price - prev, 2),
                            "change_pct": round((price - prev) / prev * 100, 2),
                            "open": round(fi.open, 2) if fi.open else 0,
                            "high": round(fi.day_high, 2) if fi.day_high else 0,
                            "low": round(fi.day_low, 2) if fi.day_low else 0,
                        }
                        continue
                except Exception as e:
                    logger.warning(f"fast_info failed for {config_name}: {e}, trying history()")

                # Fallback: use history() which is more reliable
                hist = ticker.history(period="5d")
                if hist is not None and len(hist) >= 1:
                    today = hist.iloc[-1]
                    prev_row = hist.iloc[-2] if len(hist) >= 2 else today
                    price = float(today["Close"])
                    prev = float(prev_row["Close"])
                    if price > 0 and prev > 0:
                        indices[display_name] = {
                            "value": round(price, 2),
                            "change": round(price - prev, 2),
                            "change_pct": round((price - prev) / prev * 100, 2),
                            "open": round(float(today["Open"]), 2),
                            "high": round(float(today["High"]), 2),
                            "low": round(float(today["Low"]), 2),
                        }
            except Exception as e:
                logger.warning(f"Yahoo Finance failed for {config_name} ({symbol}): {e}")

        if indices:
            result = {"data": indices, "data_source": "yahoo", "is_live": True}
            self._set_cache("indices", result)
            return result

        # Try database-derived index data
        db_indices = await self._get_indices_from_db()
        if db_indices:
            logger.info("Using database-derived index data")
            self._set_cache("indices", db_indices)
            return db_indices

        # Final fallback to static data
        logger.warning("All sources failed, using static fallback indices data")
        fallback_data = get_fallback_indices()
        result = {"data": fallback_data, "data_source": "fallback", "is_live": False}
        self._set_cache("indices", result)
        return result

    # =========================================================================
    # FII/DII DATA
    # =========================================================================

    async def get_fii_dii(self) -> Optional[Dict]:
        """
        Get FII/DII trading activity.

        Returns:
            Dict with:
            - fii_buy, fii_sell, fii_net
            - dii_buy, dii_sell, dii_net
            - date
        """
        cached = self._get_cached("fii_dii")
        if cached:
            return cached

        data = await self.nse.get_fii_dii_data()
        if not data:
            logger.warning("NSE FII/DII unavailable, using fallback data")
            fallback = get_fallback_fii_dii()
            fallback["data_source"] = "fallback"
            fallback["is_live"] = False
            self._set_cache("fii_dii", fallback)
            return fallback

        result = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "fii_buy": 0,
            "fii_sell": 0,
            "fii_net": 0,
            "dii_buy": 0,
            "dii_sell": 0,
            "dii_net": 0,
            "data_source": "nse",
            "is_live": True,
        }

        # Parse NSE FII/DII response
        if isinstance(data, list):
            for item in data:
                category = item.get("category", "").upper()
                if "FII" in category or "FPI" in category:
                    result["fii_buy"] = float(item.get("buyValue", 0))
                    result["fii_sell"] = float(item.get("sellValue", 0))
                    result["fii_net"] = float(item.get("netValue", 0))
                elif "DII" in category:
                    result["dii_buy"] = float(item.get("buyValue", 0))
                    result["dii_sell"] = float(item.get("sellValue", 0))
                    result["dii_net"] = float(item.get("netValue", 0))

        self._set_cache("fii_dii", result)
        return result

    # =========================================================================
    # BULK/BLOCK DEALS
    # =========================================================================

    async def get_bulk_deals(self) -> List[Dict]:
        """Get today's bulk deals."""
        data = await self.nse.get_bulk_deals()
        return data or []

    async def get_block_deals(self) -> List[Dict]:
        """Get today's block deals."""
        data = await self.nse.get_block_deals()
        return data or []

    # =========================================================================
    # MARKET STATUS
    # =========================================================================

    async def is_market_open(self) -> bool:
        """Check if Indian market is currently open."""
        data = await self.nse.get_market_status()
        if data and "marketState" in data:
            for market in data["marketState"]:
                if market.get("market") == "Capital Market":
                    return market.get("marketStatus") == "Open"

        # Fallback to time-based check
        from datetime import datetime
        try:
            import pytz
            ist = pytz.timezone("Asia/Kolkata")
            now = datetime.now(ist)
        except ImportError:
            # Without pytz, use UTC+5:30 approximation
            now = datetime.utcnow() + timedelta(hours=5, minutes=30)

        # Check if weekday
        if now.weekday() >= 5:  # Saturday or Sunday
            return False

        # Check market hours (9:15 AM - 3:30 PM IST)
        market_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
        market_close = now.replace(hour=15, minute=30, second=0, microsecond=0)

        return market_open <= now <= market_close

    # =========================================================================
    # NIFTY 50 STOCKS
    # =========================================================================

    async def get_nifty50_live(self) -> Optional[pd.DataFrame]:
        """
        Get live data for all Nifty 50 stocks.

        Returns DataFrame with columns:
        - symbol, open, high, low, last_price, prev_close, change, change_pct, volume
        """
        data = await self.nse.get_nifty50_stocks()
        if data:
            rows = []
            for stock in data:
                rows.append({
                    "symbol": stock.get("symbol", ""),
                    "open": stock.get("open", 0),
                    "high": stock.get("dayHigh", 0),
                    "low": stock.get("dayLow", 0),
                    "last_price": stock.get("lastPrice", 0),
                    "prev_close": stock.get("previousClose", 0),
                    "change": stock.get("change", 0),
                    "change_pct": stock.get("pChange", 0),
                    "volume": stock.get("totalTradedVolume", 0),
                    "value": stock.get("totalTradedValue", 0),
                })
            return pd.DataFrame(rows)

        # Fallback 1: SmartAPI Quote API (1 call for all 50 symbols)
        logger.warning("NSE Nifty 50 unavailable, trying SmartAPI Quote API...")
        try:
            from data.smartapi_client import NIFTY50_SYMBOLS
            client = await self._get_smartapi_async()
            if client:
                batch_prices = await client.get_batch_prices_async(NIFTY50_SYMBOLS)
                if batch_prices and len(batch_prices) >= 10:
                    rows = []
                    for sym, pdata in batch_prices.items():
                        ltp = pdata.get("price", 0)
                        prev = pdata.get("close", 0) or pdata.get("open", 0)
                        rows.append({
                            "symbol": sym,
                            "open": pdata.get("open", 0),
                            "high": pdata.get("high", 0),
                            "low": pdata.get("low", 0),
                            "last_price": ltp,
                            "prev_close": prev,
                            "change": pdata.get("change", round(ltp - prev, 2) if prev else 0),
                            "change_pct": pdata.get("change_pct", round(
                                ((ltp - prev) / prev * 100) if prev else 0, 2
                            )),
                            "volume": pdata.get("volume", 0),
                            "value": 0,
                        })
                    logger.info(f"SmartAPI Quote API returned data for {len(rows)} stocks")
                    return pd.DataFrame(rows)
        except Exception as e:
            logger.warning(f"SmartAPI Quote API failed: {e}")

        # Fallback 2: Yahoo Finance batch download for top Nifty stocks
        logger.warning("SmartAPI failed, trying Yahoo Finance batch...")
        try:
            symbols_yf = [s.replace(".NS", "") for s in config.INDIA_SYMBOLS]
            tickers_str = " ".join(config.INDIA_SYMBOLS)
            loop = asyncio.get_event_loop()
            batch = await loop.run_in_executor(
                None,
                lambda: yf.download(tickers_str, period="2d", group_by="ticker", progress=False)
            )
            rows = []
            for sym_clean, sym_yf in zip(symbols_yf, config.INDIA_SYMBOLS):
                try:
                    ticker_sym = sym_clean if sym_clean in batch.columns.get_level_values(0) else sym_yf
                    stock_data = batch[ticker_sym] if ticker_sym in batch.columns.get_level_values(0) else None
                    if stock_data is None or stock_data.empty or len(stock_data) < 1:
                        continue
                    today = stock_data.iloc[-1]
                    prev = stock_data.iloc[-2] if len(stock_data) >= 2 else today
                    close = today["Close"]
                    prev_close = prev["Close"]
                    change = close - prev_close
                    change_pct = (change / prev_close * 100) if prev_close > 0 else 0
                    rows.append({
                        "symbol": sym_clean.replace(".NS", ""),
                        "open": round(today["Open"], 2),
                        "high": round(today["High"], 2),
                        "low": round(today["Low"], 2),
                        "last_price": round(close, 2),
                        "prev_close": round(prev_close, 2),
                        "change": round(change, 2),
                        "change_pct": round(change_pct, 2),
                        "volume": int(today.get("Volume", 0)),
                        "value": 0,
                    })
                except Exception as e:
                    logger.warning(f"Yahoo batch failed for {sym_clean}: {e}")
            if rows:
                logger.info(f"Yahoo batch returned data for {len(rows)} stocks")
                return pd.DataFrame(rows)
        except Exception as e:
            logger.warning(f"Yahoo Finance batch download failed: {e}")

        # Try database (market_data table from SmartAPI)
        db_df = await self._get_nifty50_from_db()
        if db_df is not None and not db_df.empty:
            logger.info(f"Using database Nifty 50 data ({len(db_df)} stocks)")
            return db_df

        # Final fallback to static data
        logger.warning("All sources failed, using static fallback Nifty 50 data")
        return pd.DataFrame(get_fallback_nifty50())


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def get_india_fetcher(db_pool=None) -> IndiaDataFetcher:
    """Get India data fetcher instance."""
    return IndiaDataFetcher(db_pool=db_pool)


async def fetch_india_market_summary(db_pool=None) -> Dict:
    """
    Fetch a summary of Indian market data.

    Returns dict with:
    - indices: Major indices data
    - fii_dii: FII/DII activity
    - market_open: Whether market is open
    - top_gainers: Top gaining stocks
    - top_losers: Top losing stocks
    """
    fetcher = IndiaDataFetcher(db_pool=db_pool)

    try:
        # Fetch data concurrently
        indices_task = fetcher.get_indices()
        fii_dii_task = fetcher.get_fii_dii()
        market_status_task = fetcher.is_market_open()
        nifty50_task = fetcher.get_nifty50_live()

        indices, fii_dii, is_open, nifty50 = await asyncio.gather(
            indices_task, fii_dii_task, market_status_task, nifty50_task,
            return_exceptions=True
        )

        # Handle exceptions
        if isinstance(indices, Exception):
            indices = {"data": {}, "data_source": "error", "is_live": False}
        if isinstance(fii_dii, Exception):
            fii_dii = None
        if isinstance(is_open, Exception):
            is_open = False
        if isinstance(nifty50, Exception):
            nifty50 = None

        # Extract indices data and metadata
        indices_data = indices.get("data", indices) if isinstance(indices, dict) else indices
        data_source = indices.get("data_source", "unknown") if isinstance(indices, dict) else "unknown"
        is_live = indices.get("is_live", False) if isinstance(indices, dict) else False

        # Calculate top gainers/losers
        top_gainers = []
        top_losers = []
        if nifty50 is not None and not nifty50.empty:
            sorted_df = nifty50.sort_values("change_pct", ascending=False)
            top_gainers = sorted_df.head(5).to_dict("records")
            top_losers = sorted_df.tail(5).to_dict("records")

        return {
            "timestamp": datetime.now().isoformat(),
            "market_open": is_open,
            "indices": indices_data,
            "fii_dii": fii_dii,
            "top_gainers": top_gainers,
            "top_losers": top_losers,
            "data_source": data_source,
            "is_live": is_live,
        }

    finally:
        await fetcher.close()


# =============================================================================
# CLI TEST
# =============================================================================

if __name__ == "__main__":
    async def test():
        print("Testing Indian Market Data Fetcher...")
        print("=" * 60)

        fetcher = IndiaDataFetcher()

        try:
            # Test indices
            print("\n1. Fetching Indices...")
            indices = await fetcher.get_indices()
            for name, data in indices.items():
                print(f"   {name}: {data['value']:.2f} ({data['change_pct']:+.2f}%)")

            # Test FII/DII
            print("\n2. Fetching FII/DII Data...")
            fii_dii = await fetcher.get_fii_dii()
            if fii_dii:
                print(f"   FII Net: {fii_dii['fii_net']:,.0f} Cr")
                print(f"   DII Net: {fii_dii['dii_net']:,.0f} Cr")

            # Test stock data
            print("\n3. Fetching RELIANCE.NS data...")
            df = await fetcher.fetch_stock_data_async("RELIANCE.NS", period="5d", interval="5m")
            if df is not None:
                print(f"   Got {len(df)} data points")
                print(f"   Latest: {df['close'].iloc[-1]:.2f}")

            # Test market status
            print("\n4. Checking Market Status...")
            is_open = await fetcher.is_market_open()
            print(f"   Market is {'OPEN' if is_open else 'CLOSED'}")

            # Test Nifty 50 stocks
            print("\n5. Fetching Nifty 50 Live Data...")
            nifty50 = await fetcher.get_nifty50_live()
            if nifty50 is not None:
                print(f"   Got data for {len(nifty50)} stocks")
                top3 = nifty50.nlargest(3, "change_pct")
                print("   Top Gainers:")
                for _, row in top3.iterrows():
                    print(f"      {row['symbol']}: {row['change_pct']:+.2f}%")

            print("\n" + "=" * 60)
            print("Test complete!")

        finally:
            await fetcher.close()

    asyncio.run(test())

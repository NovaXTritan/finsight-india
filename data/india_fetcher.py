"""
Indian Market Data Fetcher

Fetches data from:
1. NSE India (indices, FII/DII, bulk deals)
2. Yahoo Finance (stock prices with .NS suffix)
3. News RSS feeds

NSE requires proper headers to avoid 403 errors.
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

    Combines:
    - NSE direct API for real-time data
    - Yahoo Finance for historical data and prices
    """

    def __init__(self):
        self.nse = NSEFetcher()
        self._cache = {}
        self._cache_ttl = 60  # Cache TTL in seconds

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
    # STOCK DATA
    # =========================================================================

    def fetch_stock_data(
        self,
        symbol: str,
        period: str = "5d",
        interval: str = "5m"
    ) -> Optional[pd.DataFrame]:
        """
        Fetch historical stock data using Yahoo Finance.

        Args:
            symbol: Stock symbol (with or without .NS suffix)
            period: Data period (5d, 1mo, 3mo, etc.)
            interval: Data interval (1m, 5m, 15m, 1h, 1d, etc.)

        Returns:
            DataFrame with OHLCV data
        """
        # Ensure .NS suffix for Indian stocks
        if not symbol.endswith((".NS", ".BO")):
            symbol = f"{symbol}.NS"

        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)

            if df.empty:
                logger.warning(f"No data returned for {symbol}")
                return None

            # Standardize column names
            df = df.reset_index()
            df.columns = [c.lower() for c in df.columns]

            # Rename 'date' or 'datetime' to 'datetime'
            if 'date' in df.columns:
                df = df.rename(columns={'date': 'datetime'})

            return df

        except Exception as e:
            logger.error(f"Error fetching {symbol}: {e}")
            return None

    async def fetch_stock_data_async(
        self,
        symbol: str,
        period: str = "5d",
        interval: str = "5m"
    ) -> Optional[pd.DataFrame]:
        """Async version - runs in thread pool."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self.fetch_stock_data, symbol, period, interval
        )

    def get_current_price(self, symbol: str) -> Optional[float]:
        """Get current price for a stock."""
        if not symbol.endswith((".NS", ".BO")):
            symbol = f"{symbol}.NS"

        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            return info.get("regularMarketPrice") or info.get("currentPrice")
        except Exception as e:
            logger.error(f"Error getting price for {symbol}: {e}")
            return None

    async def get_current_price_async(self, symbol: str) -> Optional[float]:
        """Async version - runs in thread pool."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.get_current_price, symbol)

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
                self._set_cache("indices", indices)
                return indices

        # Fallback to Yahoo Finance
        indices = {}
        for name, symbol in config.INDIA_INDICES.items():
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                indices[name] = {
                    "value": info.get("regularMarketPrice", 0),
                    "change": info.get("regularMarketChange", 0),
                    "change_pct": info.get("regularMarketChangePercent", 0),
                }
            except Exception as e:
                logger.warning(f"Failed to fetch {name}: {e}")

        if indices:
            self._set_cache("indices", indices)
        return indices

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
            return None

        result = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "fii_buy": 0,
            "fii_sell": 0,
            "fii_net": 0,
            "dii_buy": 0,
            "dii_sell": 0,
            "dii_net": 0,
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
        if not data:
            return None

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


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def get_india_fetcher() -> IndiaDataFetcher:
    """Get India data fetcher instance."""
    return IndiaDataFetcher()


async def fetch_india_market_summary() -> Dict:
    """
    Fetch a summary of Indian market data.

    Returns dict with:
    - indices: Major indices data
    - fii_dii: FII/DII activity
    - market_open: Whether market is open
    - top_gainers: Top gaining stocks
    - top_losers: Top losing stocks
    """
    fetcher = IndiaDataFetcher()

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
            indices = {}
        if isinstance(fii_dii, Exception):
            fii_dii = None
        if isinstance(is_open, Exception):
            is_open = False
        if isinstance(nifty50, Exception):
            nifty50 = None

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
            "indices": indices,
            "fii_dii": fii_dii,
            "top_gainers": top_gainers,
            "top_losers": top_losers,
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

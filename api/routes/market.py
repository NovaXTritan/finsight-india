"""
Indian Market API Routes

Endpoints for:
- Market indices (Nifty, Sensex, etc.)
- FII/DII activity
- Bulk/Block deals
- News aggregation
- Market status
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime
import asyncio
import time

from api.core.auth import get_current_user_id
from api.core.config import get_settings

# Import Indian market modules (this is India-specific app)
from data.india_fetcher import IndiaDataFetcher, fetch_india_market_summary
from data.india_news import IndiaNewsAggregator, fetch_latest_news, fetch_news_for_watchlist

settings = get_settings()
router = APIRouter(prefix="/market", tags=["Indian Market"])


# =============================================================================
# MODULE-LEVEL TTL CACHE
# Avoids re-fetching market data that doesn't change every second.
# Each entry: (timestamp, data)
# =============================================================================
_cache: Dict[str, Tuple[float, Any]] = {}

# TTL in seconds per endpoint
_CACHE_TTL = {
    "summary": 60,      # 1 minute - composite endpoint
    "indices": 30,       # 30 seconds - indices change frequently
    "fii_dii": 300,      # 5 minutes - updated infrequently
    "nifty50": 30,       # 30 seconds
    "bulk_deals": 300,   # 5 minutes
    "block_deals": 300,  # 5 minutes
    "news": 120,         # 2 minutes
}


def _get_cached(key: str) -> Optional[Any]:
    """Return cached data if still within TTL, else None."""
    if key in _cache:
        cached_at, data = _cache[key]
        ttl = _CACHE_TTL.get(key, 60)
        if (time.time() - cached_at) < ttl:
            return data
    return None


def _set_cache(key: str, data: Any):
    """Store data in cache with current timestamp."""
    _cache[key] = (time.time(), data)


@router.get("/summary")
async def get_market_summary(
    user_id: str = Depends(get_current_user_id)
):
    """
    Get comprehensive Indian market summary.

    Returns:
    - Market status (open/closed)
    - Major indices (Nifty 50, Sensex, Bank Nifty, India VIX)
    - FII/DII activity
    - Top gainers and losers
    """
    cached = _get_cached("summary")
    if cached is not None:
        return cached

    try:
        summary = await fetch_india_market_summary()
        _set_cache("summary", summary)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/indices")
async def get_indices(
    user_id: str = Depends(get_current_user_id)
):
    """
    Get major Indian indices data.

    Returns current values for:
    - NIFTY 50
    - SENSEX
    - BANK NIFTY
    - NIFTY IT
    - INDIA VIX
    """
    cached = _get_cached("indices")
    if cached is not None:
        return cached

    fetcher = IndiaDataFetcher()
    try:
        indices = await fetcher.get_indices()
        result = {"indices": indices, "timestamp": datetime.now().isoformat()}
        _set_cache("indices", result)
        return result
    finally:
        await fetcher.close()


@router.get("/fii-dii")
async def get_fii_dii(
    user_id: str = Depends(get_current_user_id)
):
    """
    Get FII/DII trading activity.

    Returns:
    - FII buy/sell/net values (in Crores)
    - DII buy/sell/net values (in Crores)
    - Date of data
    """
    cached = _get_cached("fii_dii")
    if cached is not None:
        return cached

    fetcher = IndiaDataFetcher()
    try:
        data = await fetcher.get_fii_dii()
        if not data:
            raise HTTPException(status_code=503, detail="FII/DII data unavailable")
        _set_cache("fii_dii", data)
        return data
    finally:
        await fetcher.close()


@router.get("/bulk-deals")
async def get_bulk_deals(
    user_id: str = Depends(get_current_user_id)
):
    """
    Get today's bulk deals.

    Bulk deals are transactions where total quantity traded is more than
    0.5% of the company's listed shares.
    """
    cached = _get_cached("bulk_deals")
    if cached is not None:
        return cached

    fetcher = IndiaDataFetcher()
    try:
        deals = await fetcher.get_bulk_deals()
        result = {"deals": deals, "count": len(deals), "date": datetime.now().strftime("%Y-%m-%d")}
        _set_cache("bulk_deals", result)
        return result
    finally:
        await fetcher.close()


@router.get("/block-deals")
async def get_block_deals(
    user_id: str = Depends(get_current_user_id)
):
    """
    Get today's block deals.

    Block deals are single transactions of minimum 5 lakh shares
    or minimum value of Rs 10 crore.
    """
    cached = _get_cached("block_deals")
    if cached is not None:
        return cached

    fetcher = IndiaDataFetcher()
    try:
        deals = await fetcher.get_block_deals()
        result = {"deals": deals, "count": len(deals), "date": datetime.now().strftime("%Y-%m-%d")}
        _set_cache("block_deals", result)
        return result
    finally:
        await fetcher.close()


@router.get("/status")
async def get_market_status(
    user_id: str = Depends(get_current_user_id)
):
    """
    Check if Indian market is currently open.

    Market hours: 9:15 AM - 3:30 PM IST (Mon-Fri)
    """
    fetcher = IndiaDataFetcher()
    try:
        is_open = await fetcher.is_market_open()
        return {
            "is_open": is_open,
            "market": "NSE/BSE",
            "timezone": "Asia/Kolkata",
            "hours": "09:15 - 15:30 IST",
            "checked_at": datetime.now().isoformat()
        }
    finally:
        await fetcher.close()


@router.get("/nifty50")
async def get_nifty50_stocks(
    user_id: str = Depends(get_current_user_id)
):
    """
    Get live data for all Nifty 50 stocks.

    Returns list of stocks with:
    - symbol, open, high, low, last_price
    - prev_close, change, change_pct
    - volume, value
    """
    cached = _get_cached("nifty50")
    if cached is not None:
        return cached

    fetcher = IndiaDataFetcher()
    try:
        df = await fetcher.get_nifty50_live()
        if df is None or df.empty:
            raise HTTPException(status_code=503, detail="Nifty 50 data unavailable")

        stocks = df.to_dict("records")
        result = {
            "stocks": stocks,
            "count": len(stocks),
            "timestamp": datetime.now().isoformat()
        }
        _set_cache("nifty50", result)
        return result
    finally:
        await fetcher.close()


# =============================================================================
# NEWS ENDPOINTS
# =============================================================================

@router.get("/news")
async def get_news(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(50, ge=1, le=200),
    symbol: Optional[str] = None,
    category: Optional[str] = Query(None, pattern="^(all|markets|economy|stocks|ipo)$")
):
    """
    Get latest market news from Indian financial publications.

    Args:
        limit: Maximum number of news items (default 50, max 200)
        symbol: Filter by stock symbol (optional)
        category: Filter by category - all, markets, economy, stocks, ipo (optional)

    Returns list of news items with:
    - title, summary, url, source
    - published_at, sentiment, category
    - symbols (mentioned stocks)
    """
    # Only cache unfiltered requests
    cache_key = None
    if not symbol and (not category or category == "all"):
        cache_key = f"news:{limit}"
        cached = _get_cached(cache_key)
        if cached is not None:
            return cached

    aggregator = IndiaNewsAggregator()

    if symbol:
        # Filter by specific symbol
        items = await aggregator.fetch_for_symbol(symbol, max_age_hours=24)
    else:
        items = await aggregator.fetch_all(max_age_hours=24)

    # Filter by category if specified
    if category and category != "all":
        items = [item for item in items if item.category == category]

    # Convert to dict and limit
    news = [item.to_dict() for item in items[:limit]]

    # Get category counts for tabs
    all_items = await aggregator.fetch_all(max_age_hours=24)
    category_counts = {
        "all": len(all_items),
        "markets": sum(1 for i in all_items if i.category == "markets"),
        "economy": sum(1 for i in all_items if i.category == "economy"),
        "stocks": sum(1 for i in all_items if i.category == "stocks"),
        "ipo": sum(1 for i in all_items if i.category == "ipo"),
    }

    result = {
        "news": news,
        "count": len(news),
        "category_counts": category_counts,
        "timestamp": datetime.now().isoformat()
    }

    if cache_key:
        _set_cache(cache_key, result)

    return result


@router.get("/news/watchlist")
async def get_news_for_user_watchlist(
    user_id: str = Depends(get_current_user_id)
):
    """
    Get news for stocks in user's watchlist.

    Returns news items grouped by symbol.
    """
    # Get user's watchlist
    from api.core.database import db
    watchlist = await db.get_watchlist(user_id)

    if not watchlist:
        return {"news_by_symbol": {}, "message": "No symbols in watchlist"}

    # Fetch news for watchlist
    news_by_symbol = await fetch_news_for_watchlist(watchlist)

    return {
        "news_by_symbol": news_by_symbol,
        "symbols_with_news": list(news_by_symbol.keys()),
        "timestamp": datetime.now().isoformat()
    }


# =============================================================================
# STOCK DATA ENDPOINTS
# =============================================================================

@router.get("/stock/{symbol}")
async def get_stock_data(
    symbol: str,
    period: str = Query("5d", pattern="^(1d|5d|1mo|3mo|6mo|1y)$"),
    interval: str = Query("5m", pattern="^(1m|5m|15m|30m|1h|1d)$"),
    user_id: str = Depends(get_current_user_id)
):
    """
    Get historical stock data.

    Args:
        symbol: Stock symbol (e.g., RELIANCE, TCS)
        period: Data period (1d, 5d, 1mo, 3mo, 6mo, 1y)
        interval: Data interval (1m, 5m, 15m, 30m, 1h, 1d)

    Returns OHLCV data as list of candles.
    """
    fetcher = IndiaDataFetcher()
    try:
        df = await fetcher.fetch_stock_data_async(symbol, period=period, interval=interval)

        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

        # Convert to list of dicts
        candles = df.to_dict("records")

        return {
            "symbol": symbol,
            "period": period,
            "interval": interval,
            "candles": candles,
            "count": len(candles)
        }
    finally:
        await fetcher.close()


@router.get("/stock/{symbol}/price")
async def get_stock_price(
    symbol: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get current price for a stock.

    Args:
        symbol: Stock symbol (e.g., RELIANCE, TCS)

    Returns current market price.
    """
    fetcher = IndiaDataFetcher()
    try:
        price = await fetcher.get_current_price_async(symbol)

        if price is None:
            raise HTTPException(status_code=404, detail=f"Price not found for {symbol}")

        return {
            "symbol": symbol,
            "price": price,
            "currency": "INR",
            "timestamp": datetime.now().isoformat()
        }
    finally:
        await fetcher.close()

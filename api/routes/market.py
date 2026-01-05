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
from typing import List, Dict, Optional
from datetime import datetime
import asyncio

from api.core.auth import get_current_user_id
from api.core.config import get_settings

# Import Indian market modules
import config
if config.MARKET == "INDIA":
    from data.india_fetcher import IndiaDataFetcher, fetch_india_market_summary
    from data.india_news import IndiaNewsAggregator, fetch_latest_news, fetch_news_for_watchlist

settings = get_settings()
router = APIRouter(prefix="/market", tags=["Indian Market"])


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
    if config.MARKET != "INDIA":
        raise HTTPException(
            status_code=400,
            detail="Market summary only available for Indian market"
        )

    try:
        summary = await fetch_india_market_summary()
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
    if config.MARKET != "INDIA":
        raise HTTPException(
            status_code=400,
            detail="Indices only available for Indian market"
        )

    fetcher = IndiaDataFetcher()
    try:
        indices = await fetcher.get_indices()
        return {"indices": indices, "timestamp": datetime.now().isoformat()}
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
    if config.MARKET != "INDIA":
        raise HTTPException(
            status_code=400,
            detail="FII/DII data only available for Indian market"
        )

    fetcher = IndiaDataFetcher()
    try:
        data = await fetcher.get_fii_dii()
        if not data:
            raise HTTPException(status_code=503, detail="FII/DII data unavailable")
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
    if config.MARKET != "INDIA":
        raise HTTPException(
            status_code=400,
            detail="Bulk deals only available for Indian market"
        )

    fetcher = IndiaDataFetcher()
    try:
        deals = await fetcher.get_bulk_deals()
        return {"deals": deals, "count": len(deals), "date": datetime.now().strftime("%Y-%m-%d")}
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
    if config.MARKET != "INDIA":
        raise HTTPException(
            status_code=400,
            detail="Block deals only available for Indian market"
        )

    fetcher = IndiaDataFetcher()
    try:
        deals = await fetcher.get_block_deals()
        return {"deals": deals, "count": len(deals), "date": datetime.now().strftime("%Y-%m-%d")}
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
    if config.MARKET != "INDIA":
        raise HTTPException(
            status_code=400,
            detail="Market status only available for Indian market"
        )

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
    if config.MARKET != "INDIA":
        raise HTTPException(
            status_code=400,
            detail="Nifty 50 data only available for Indian market"
        )

    fetcher = IndiaDataFetcher()
    try:
        df = await fetcher.get_nifty50_live()
        if df is None or df.empty:
            raise HTTPException(status_code=503, detail="Nifty 50 data unavailable")

        stocks = df.to_dict("records")
        return {
            "stocks": stocks,
            "count": len(stocks),
            "timestamp": datetime.now().isoformat()
        }
    finally:
        await fetcher.close()


# =============================================================================
# NEWS ENDPOINTS
# =============================================================================

@router.get("/news")
async def get_news(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(50, ge=1, le=200),
    symbol: Optional[str] = None
):
    """
    Get latest market news from Indian financial publications.

    Args:
        limit: Maximum number of news items (default 50, max 200)
        symbol: Filter by stock symbol (optional)

    Returns list of news items with:
    - title, summary, url, source
    - published_at, sentiment
    - symbols (mentioned stocks)
    """
    if config.MARKET != "INDIA":
        raise HTTPException(
            status_code=400,
            detail="News aggregation only available for Indian market"
        )

    aggregator = IndiaNewsAggregator()

    if symbol:
        # Filter by specific symbol
        items = await aggregator.fetch_for_symbol(symbol, max_age_hours=24)
    else:
        items = await aggregator.fetch_all(max_age_hours=24)

    # Convert to dict and limit
    news = [item.to_dict() for item in items[:limit]]

    return {
        "news": news,
        "count": len(news),
        "timestamp": datetime.now().isoformat()
    }


@router.get("/news/watchlist")
async def get_news_for_user_watchlist(
    user_id: str = Depends(get_current_user_id)
):
    """
    Get news for stocks in user's watchlist.

    Returns news items grouped by symbol.
    """
    if config.MARKET != "INDIA":
        raise HTTPException(
            status_code=400,
            detail="News aggregation only available for Indian market"
        )

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
    if config.MARKET != "INDIA":
        raise HTTPException(
            status_code=400,
            detail="Stock data only available for Indian market"
        )

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
    if config.MARKET != "INDIA":
        raise HTTPException(
            status_code=400,
            detail="Stock price only available for Indian market"
        )

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

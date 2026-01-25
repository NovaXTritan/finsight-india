"""
Watchlist Routes - Manage symbols you're tracking
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
import asyncio
import logging

from api.core.config import get_settings
from api.core.auth import get_current_user_id
from api.core.database import APIDatabase, get_db
from api.models.schemas import WatchlistAdd, WatchlistResponse, MessageResponse

logger = logging.getLogger(__name__)

settings = get_settings()
router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


@router.get("", response_model=WatchlistResponse)
async def get_watchlist(
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get your watchlist.
    
    Returns all symbols you're currently tracking.
    """
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    symbols = await db.get_watchlist(user_id)
    tier_limit = settings.tier_limits.get(user["tier"], {}).get("symbols", 5)
    
    return WatchlistResponse(
        symbols=symbols,
        count=len(symbols),
        limit=tier_limit
    )


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    data: WatchlistAdd,
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Add a symbol to your watchlist.
    
    - Symbol will be uppercased automatically
    - Limited by your subscription tier
    - Free: 5 symbols, Pro: 25, Serious: 100
    """
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if already at limit
    current_count = await db.get_watchlist_count(user_id)
    tier_limit = settings.tier_limits.get(user["tier"], {}).get("symbols", 5)
    
    if current_count >= tier_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Watchlist limit reached ({tier_limit} symbols for {user['tier']} tier). Upgrade to add more."
        )
    
    symbol = data.symbol.upper().strip()
    
    # Basic validation (allow up to 15 chars for Indian stocks like BHARTIARTL)
    if len(symbol) > 15 or len(symbol) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid symbol format. Symbol must be 1-15 characters."
        )

    # Allow alphanumeric and common symbols (& for M&M)
    if not all(c.isalnum() or c in '&-' for c in symbol):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid symbol format. Only letters, numbers, & and - allowed."
        )
    
    success = await db.add_to_watchlist(user_id, symbol)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add symbol. It may already be in your watchlist."
        )
    
    return MessageResponse(
        message=f"{symbol} added to watchlist",
        success=True
    )


@router.delete("/{symbol}", response_model=MessageResponse)
async def remove_from_watchlist(
    symbol: str,
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Remove a symbol from your watchlist.
    """
    success = await db.remove_from_watchlist(user_id, symbol.upper())
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{symbol.upper()} not found in your watchlist"
        )
    
    return MessageResponse(
        message=f"{symbol.upper()} removed from watchlist",
        success=True
    )


@router.get("/check/{symbol}")
async def check_symbol_in_watchlist(
    symbol: str,
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Check if a symbol is in your watchlist.
    """
    symbols = await db.get_watchlist(user_id)
    is_watching = symbol.upper() in symbols

    return {
        "symbol": symbol.upper(),
        "in_watchlist": is_watching
    }


@router.get("/enriched")
async def get_enriched_watchlist(
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get watchlist with enriched data including live prices, fundamentals, and sparkline data.

    Returns for each symbol:
    - Current price and day change
    - 5-day price history for sparkline
    - 52-week high/low position
    - Key fundamentals (PE, Market Cap)
    """
    import yfinance as yf
    from datetime import datetime, timedelta

    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    symbols = await db.get_watchlist(user_id)
    if not symbols:
        return {
            "symbols": [],
            "count": 0,
            "timestamp": datetime.now().isoformat()
        }

    async def fetch_stock_data(symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch enriched data for a single stock."""
        try:
            ticker = yf.Ticker(f"{symbol}.NS")

            # Get current info
            info = ticker.info

            # Get 5-day history for sparkline
            hist = ticker.history(period="5d")
            sparkline_data = []
            if not hist.empty:
                sparkline_data = [
                    {"date": d.strftime("%Y-%m-%d"), "price": round(p, 2)}
                    for d, p in zip(hist.index, hist['Close'])
                ]

            current_price = info.get('currentPrice') or info.get('regularMarketPrice')
            prev_close = info.get('previousClose') or info.get('regularMarketPreviousClose')

            day_change = None
            day_change_pct = None
            if current_price and prev_close:
                day_change = round(current_price - prev_close, 2)
                day_change_pct = round((day_change / prev_close) * 100, 2)

            high_52w = info.get('fiftyTwoWeekHigh')
            low_52w = info.get('fiftyTwoWeekLow')

            # Calculate position in 52-week range
            position_52w = None
            if current_price and high_52w and low_52w and high_52w != low_52w:
                position_52w = round(((current_price - low_52w) / (high_52w - low_52w)) * 100, 1)

            return {
                "symbol": symbol,
                "name": info.get('shortName') or info.get('longName') or symbol,
                "current_price": current_price,
                "prev_close": prev_close,
                "day_change": day_change,
                "day_change_pct": day_change_pct,
                "high_52w": high_52w,
                "low_52w": low_52w,
                "position_52w": position_52w,
                "pe_ratio": info.get('trailingPE'),
                "market_cap": info.get('marketCap'),
                "volume": info.get('volume') or info.get('regularMarketVolume'),
                "avg_volume": info.get('averageVolume'),
                "sparkline": sparkline_data,
                "last_updated": datetime.now().isoformat()
            }
        except Exception as e:
            logger.warning(f"Failed to fetch data for {symbol}: {e}")
            return {
                "symbol": symbol,
                "name": symbol,
                "error": str(e),
                "sparkline": []
            }

    # Fetch data for all symbols concurrently (limit to 10 at a time)
    enriched_data = []

    # Process in batches to avoid rate limits
    batch_size = 10
    for i in range(0, len(symbols), batch_size):
        batch = symbols[i:i + batch_size]
        tasks = [fetch_stock_data(symbol) for symbol in batch]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Error fetching stock data: {result}")
            elif result:
                enriched_data.append(result)

    return {
        "symbols": enriched_data,
        "count": len(enriched_data),
        "timestamp": datetime.now().isoformat()
    }

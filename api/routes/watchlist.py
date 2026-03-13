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

# Demo watchlist for development (when database is not available)
DEMO_WATCHLIST = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"]
_demo_watchlist = list(DEMO_WATCHLIST)  # Mutable copy for session


@router.get("", response_model=WatchlistResponse)
async def get_watchlist(
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get your watchlist.

    Returns all symbols you're currently tracking.
    """
    # Demo mode - return demo watchlist when database unavailable
    if db.pool is None:
        return WatchlistResponse(
            symbols=_demo_watchlist,
            count=len(_demo_watchlist),
            limit=25
        )

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

    # Demo mode - use in-memory watchlist
    if db.pool is None:
        if symbol in _demo_watchlist:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to add symbol. It may already be in your watchlist."
            )
        if len(_demo_watchlist) >= 25:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Watchlist limit reached (25 symbols for pro tier). Upgrade to add more."
            )
        _demo_watchlist.append(symbol)
        return MessageResponse(
            message=f"{symbol} added to watchlist",
            success=True
        )

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
    symbol_upper = symbol.upper()

    # Demo mode - use in-memory watchlist
    if db.pool is None:
        if symbol_upper not in _demo_watchlist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{symbol_upper} not found in your watchlist"
            )
        _demo_watchlist.remove(symbol_upper)
        return MessageResponse(
            message=f"{symbol_upper} removed from watchlist",
            success=True
        )

    success = await db.remove_from_watchlist(user_id, symbol_upper)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{symbol_upper} not found in your watchlist"
        )

    return MessageResponse(
        message=f"{symbol_upper} removed from watchlist",
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
    # Demo mode
    if db.pool is None:
        return {
            "symbol": symbol.upper(),
            "in_watchlist": symbol.upper() in _demo_watchlist
        }

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
    Get watchlist with enriched data: live prices (SmartAPI), sparkline (DB),
    52W high/low (DB), with yfinance as fallback.
    """
    from datetime import datetime, timedelta
    from data.smartapi_client import get_smartapi_client
    import time

    # Demo mode - use in-memory watchlist
    if db.pool is None:
        symbols = _demo_watchlist
    else:
        user = await db.get_user(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        symbols = await db.get_watchlist(user_id)

    if not symbols:
        return {"symbols": [], "count": 0, "timestamp": datetime.now().isoformat()}

    # Initialize SmartAPI client once (async)
    client = get_smartapi_client()
    if not client._token_map:
        await client.load_instrument_tokens_async()

    # --- 1. Batch fetch all live prices in ONE API call ---
    live_prices: Dict[str, Dict] = {}
    try:
        live_prices = await client.get_batch_prices_async(symbols)
        if live_prices:
            logger.info(f"Quote API returned {len(live_prices)} prices in 1 call")
    except Exception as e:
        logger.warning(f"SmartAPI Quote API batch failed: {e}")

    async def _get_db_history(symbol: str, days: int = 250):
        """Get historical data from market_data table."""
        if not db.pool:
            return []
        try:
            rows = await db.pool.fetch("""
                SELECT trade_date, open, high, low, close, volume
                FROM market_data WHERE symbol = $1
                ORDER BY trade_date DESC LIMIT $2
            """, symbol, days)
            return rows
        except Exception:
            return []

    async def fetch_stock_data(symbol: str) -> Optional[Dict[str, Any]]:
        """Enrich with DB history. Live price already fetched via batch Quote API."""

        current_price = None
        day_open = None
        volume = None
        data_source = "unknown"
        high_52w = None
        low_52w = None

        # --- 1. Use pre-fetched Quote API data ---
        quote = live_prices.get(symbol)
        if quote and quote.get("price"):
            current_price = quote["price"]
            day_open = quote.get("open")
            volume = quote.get("volume")
            high_52w = quote.get("high_52w")
            low_52w = quote.get("low_52w")
            data_source = "smartapi"

        # --- 2. DB: sparkline + 52W high/low + prev close ---
        db_rows = await _get_db_history(symbol, 250)

        sparkline_data = []
        prev_close = None
        avg_volume = None

        if db_rows:
            recent = db_rows[:5]
            sparkline_data = [
                {"date": str(r["trade_date"]), "price": round(float(r["close"]), 2)}
                for r in reversed(recent)
            ]

            if len(db_rows) >= 2:
                prev_close = float(db_rows[1]["close"])
            elif len(db_rows) == 1:
                prev_close = float(db_rows[0]["open"])

            # 52W high/low from DB if Quote API didn't provide
            if high_52w is None:
                highs = [float(r["high"]) for r in db_rows]
                if highs:
                    high_52w = max(highs)
            if low_52w is None:
                lows = [float(r["low"]) for r in db_rows]
                if lows:
                    low_52w = min(lows)

            vols = [int(r["volume"]) for r in db_rows[:20] if r["volume"]]
            if vols:
                avg_volume = int(sum(vols) / len(vols))

            if current_price is None:
                current_price = float(db_rows[0]["close"])
                day_open = float(db_rows[0]["open"])
                volume = int(db_rows[0]["volume"] or 0)
                data_source = "database"

        # --- 3. Fallback to yfinance if still no price ---
        if current_price is None:
            try:
                import yfinance as yf
                hist = yf.Ticker(f"{symbol}.NS").history(period="5d")
                if not hist.empty:
                    current_price = round(float(hist['Close'].iloc[-1]), 2)
                    if len(hist) >= 2:
                        prev_close = round(float(hist['Close'].iloc[-2]), 2)
                    day_open = round(float(hist['Open'].iloc[-1]), 2)
                    volume = int(hist['Volume'].iloc[-1])
                    sparkline_data = [
                        {"date": d.strftime("%Y-%m-%d"), "price": round(float(p), 2)}
                        for d, p in zip(hist.index, hist['Close'])
                    ]
                    data_source = "yahoo"
            except Exception as yf_err:
                logger.warning(f"yfinance also failed for {symbol}: {yf_err}")

        if current_price is None:
            return None

        # Use quote change data if available, else compute
        if quote and quote.get("change_pct") is not None:
            day_change = quote.get("change", 0)
            day_change_pct = quote.get("change_pct", 0)
            if prev_close is None:
                prev_close = round(current_price - day_change, 2) if day_change else day_open
        else:
            if prev_close is None:
                prev_close = day_open
            day_change = round(current_price - prev_close, 2) if prev_close else 0
            day_change_pct = round((day_change / prev_close) * 100, 2) if prev_close else 0

        position_52w = None
        if high_52w and low_52w and high_52w != low_52w:
            position_52w = round(((current_price - low_52w) / (high_52w - low_52w)) * 100, 1)

        return {
            "symbol": symbol,
            "name": symbol,
            "current_price": current_price,
            "prev_close": prev_close,
            "day_change": day_change,
            "day_change_pct": day_change_pct,
            "high_52w": high_52w,
            "low_52w": low_52w,
            "position_52w": position_52w,
            "pe_ratio": None,
            "market_cap": None,
            "volume": volume,
            "avg_volume": avg_volume,
            "sparkline": sparkline_data,
            "last_updated": datetime.now().isoformat(),
            "data_source": data_source,
        }

    # Fetch DB history for all symbols concurrently (prices already fetched)
    enriched_data = []
    tasks = [fetch_stock_data(sym) for sym in symbols]
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

"""
Watchlist Routes - Manage symbols you're tracking
"""
from fastapi import APIRouter, Depends, HTTPException, status

from api.core.config import get_settings
from api.core.auth import get_current_user_id
from api.core.database import APIDatabase, get_db
from api.models.schemas import WatchlistAdd, WatchlistResponse, MessageResponse

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

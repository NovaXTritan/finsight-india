"""
Stock Screener Routes - Filter stocks by fundamentals
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from typing import Optional, List
from datetime import datetime
import json
import logging

from api.core.config import get_settings
from api.core.auth import get_current_user_id
from api.core.database import APIDatabase, get_db
from api.models.schemas import (
    ScreenerFilters, ScreenerResult, ScreenerFilterOptions,
    StockFundamentals, SavedScreener, SavedScreenerCreate,
    SavedScreenerList, MessageResponse
)
from data.nifty500 import NIFTY_50, NIFTY_NEXT_50

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/screener", tags=["Screener"])


# =============================================================================
# FILTER OPTIONS
# =============================================================================

@router.get("/filters", response_model=ScreenerFilterOptions)
async def get_filter_options(
    db: APIDatabase = Depends(get_db)
):
    """
    Get available filter options with min/max ranges.

    Use this to populate filter UI with appropriate ranges.
    """
    options = await db.get_screener_filter_options()
    return ScreenerFilterOptions(**options)


# =============================================================================
# RUN SCREENER
# =============================================================================

@router.post("/run", response_model=ScreenerResult)
async def run_screener(
    filters: ScreenerFilters,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    sort_by: str = Query("market_cap", description="Field to sort by"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Run stock screener with filters.

    Supported filters:
    - **pe_min/pe_max**: P/E ratio range
    - **pb_min/pb_max**: P/B ratio range
    - **roe_min/roe_max**: Return on Equity range
    - **dividend_yield_min/max**: Dividend yield range
    - **debt_to_equity_max**: Maximum debt-to-equity ratio
    - **current_ratio_min**: Minimum current ratio
    - **market_cap_min/max**: Market cap range
    - **sectors**: List of sectors to include
    - **industries**: List of industries to include
    - **near_52w_high**: Within X% of 52-week high
    - **near_52w_low**: Within X% of 52-week low
    - **is_fno**: Only F&O stocks
    - **eps_min**: Minimum EPS
    - **beta_min/max**: Beta range
    """
    offset = (page - 1) * per_page

    stocks, total = await db.run_screener(
        filters=filters.model_dump(exclude_none=True),
        limit=per_page,
        offset=offset,
        sort_by=sort_by,
        sort_order=sort_order
    )

    return ScreenerResult(
        stocks=[StockFundamentals(**s) for s in stocks],
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + per_page) < total,
        filters_applied=filters.model_dump(exclude_none=True)
    )


# =============================================================================
# STOCK FUNDAMENTALS
# =============================================================================

@router.get("/stock/{symbol}", response_model=StockFundamentals)
async def get_stock_fundamentals(
    symbol: str,
    refresh: bool = Query(False, description="Force refresh from Yahoo Finance"),
    db: APIDatabase = Depends(get_db)
):
    """
    Get fundamental data for a single stock.

    Set refresh=true to fetch latest data from Yahoo Finance.
    """
    fundamentals = await db.get_stock_fundamentals(symbol.upper(), refresh=refresh)

    if not fundamentals:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fundamentals not found for {symbol.upper()}"
        )

    return StockFundamentals(**fundamentals)


@router.post("/refresh")
async def refresh_fundamentals(
    background_tasks: BackgroundTasks,
    symbols: Optional[List[str]] = None,
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Trigger a background refresh of fundamentals data.

    If symbols provided, only refresh those. Otherwise refresh all stale data.
    """
    background_tasks.add_task(db.refresh_fundamentals, symbols)

    return {
        "message": "Fundamentals refresh started in background",
        "symbols": symbols or "all stale"
    }


# =============================================================================
# SAVED SCREENERS
# =============================================================================

@router.get("/saved", response_model=SavedScreenerList)
async def get_saved_screeners(
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get user's saved screeners.
    """
    screeners = await db.get_saved_screeners(user_id)

    return SavedScreenerList(
        screeners=[SavedScreener(**s) for s in screeners],
        total=len(screeners)
    )


@router.post("/save", response_model=SavedScreener, status_code=status.HTTP_201_CREATED)
async def save_screener(
    data: SavedScreenerCreate,
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Save a screener configuration.

    The filters will be saved as JSON and can be loaded later.
    """
    screener = await db.save_screener(
        user_id=user_id,
        name=data.name,
        filters=data.filters,
        is_public=data.is_public
    )

    if not screener:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to save screener. Name may already exist."
        )

    return SavedScreener(**screener)


@router.get("/saved/{screener_id}", response_model=SavedScreener)
async def get_saved_screener(
    screener_id: int,
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get a specific saved screener by ID.
    """
    screener = await db.get_saved_screener(screener_id, user_id)

    if not screener:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screener not found"
        )

    return SavedScreener(**screener)


@router.delete("/saved/{screener_id}", response_model=MessageResponse)
async def delete_screener(
    screener_id: int,
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Delete a saved screener.
    """
    success = await db.delete_screener(screener_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screener not found"
        )

    return MessageResponse(message="Screener deleted")


# =============================================================================
# PUBLIC SCREENERS
# =============================================================================

@router.get("/public", response_model=SavedScreenerList)
async def get_public_screeners(
    db: APIDatabase = Depends(get_db)
):
    """
    Get all public screeners.

    These are screeners shared by other users.
    """
    screeners = await db.get_public_screeners()

    return SavedScreenerList(
        screeners=[SavedScreener(**s) for s in screeners],
        total=len(screeners)
    )


# =============================================================================
# PRESET SCREENERS
# =============================================================================

@router.get("/presets")
async def get_preset_screeners():
    """
    Get predefined screener presets.

    These are common screening strategies.
    """
    return {
        "presets": [
            {
                "name": "Value Stocks",
                "description": "Low PE, Low PB, High Dividend Yield",
                "filters": {
                    "pe_max": 15,
                    "pb_max": 2,
                    "dividend_yield_min": 2
                }
            },
            {
                "name": "Growth Stocks",
                "description": "High ROE, Positive EPS Growth",
                "filters": {
                    "roe_min": 15,
                    "eps_min": 10
                }
            },
            {
                "name": "Quality Stocks",
                "description": "High ROE, Low Debt, Good Current Ratio",
                "filters": {
                    "roe_min": 15,
                    "debt_to_equity_max": 50,
                    "current_ratio_min": 1.5
                }
            },
            {
                "name": "Large Caps",
                "description": "Market cap above 50,000 Cr",
                "filters": {
                    "market_cap_min": 500000000000
                }
            },
            {
                "name": "Mid Caps",
                "description": "Market cap between 10,000-50,000 Cr",
                "filters": {
                    "market_cap_min": 100000000000,
                    "market_cap_max": 500000000000
                }
            },
            {
                "name": "Small Caps",
                "description": "Market cap below 10,000 Cr",
                "filters": {
                    "market_cap_max": 100000000000
                }
            },
            {
                "name": "Near 52-Week Low",
                "description": "Stocks within 10% of 52-week low",
                "filters": {
                    "near_52w_low": 10
                }
            },
            {
                "name": "Near 52-Week High",
                "description": "Stocks within 5% of 52-week high",
                "filters": {
                    "near_52w_high": 5
                }
            },
            {
                "name": "Dividend Champions",
                "description": "High dividend yield with good financials",
                "filters": {
                    "dividend_yield_min": 3,
                    "pe_max": 25,
                    "debt_to_equity_max": 100
                }
            },
            {
                "name": "F&O Stocks Only",
                "description": "Only futures & options enabled stocks",
                "filters": {
                    "is_fno": True
                }
            }
        ]
    }


# =============================================================================
# SECTORS LIST
# =============================================================================

@router.get("/sectors")
async def get_sectors(
    db: APIDatabase = Depends(get_db)
):
    """
    Get list of all available sectors with stock counts.
    """
    sectors = await db.get_sector_counts()
    return {"sectors": sectors}


@router.get("/industries")
async def get_industries(
    sector: Optional[str] = None,
    db: APIDatabase = Depends(get_db)
):
    """
    Get list of all available industries, optionally filtered by sector.
    """
    industries = await db.get_industry_counts(sector)
    return {"industries": industries}


# =============================================================================
# DATABASE STATUS & AUTO-POPULATION
# =============================================================================

@router.get("/status")
async def get_screener_status(
    db: APIDatabase = Depends(get_db)
):
    """
    Get status of the screener database.

    Returns count of stocks with fundamentals data and whether population is needed.
    """
    async with db.pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM stock_fundamentals")
        stale_count = await conn.fetchval("""
            SELECT COUNT(*) FROM stock_fundamentals
            WHERE updated_at < NOW() - INTERVAL '7 days'
        """)

    needs_population = count < 50
    needs_refresh = stale_count > count * 0.5

    return {
        "total_stocks": count,
        "stale_stocks": stale_count,
        "needs_population": needs_population,
        "needs_refresh": needs_refresh,
        "message": (
            "Database needs population. Run /screener/populate to add stock data."
            if needs_population else
            "Database is up to date." if not needs_refresh else
            f"{stale_count} stocks have stale data. Consider refreshing."
        )
    }


@router.post("/populate")
async def populate_screener_data(
    background_tasks: BackgroundTasks,
    mode: str = Query("priority", pattern="^(priority|top100|all)$"),
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Populate the screener database with stock fundamentals.

    Modes:
    - **priority**: NIFTY 50 stocks only (fastest)
    - **top100**: NIFTY 50 + NIFTY Next 50 stocks
    - **all**: All NIFTY 500 stocks (takes longer)
    """
    from data.fundamentals_fetcher import FundamentalsFetcher
    from data.nifty500 import NIFTY_500

    if mode == "priority":
        symbols = NIFTY_50
    elif mode == "top100":
        symbols = list(set(NIFTY_50 + NIFTY_NEXT_50))
    else:
        symbols = NIFTY_500

    async def populate_task():
        fetcher = FundamentalsFetcher(settings.database_url)
        await fetcher.connect()
        try:
            stats = await fetcher.fetch_and_save_batch(
                symbols=symbols,
                batch_size=5,
                delay=1.0
            )
            logger.info(f"Population complete: {stats}")
        finally:
            await fetcher.close()

    background_tasks.add_task(populate_task)

    return {
        "message": f"Population started in background for {len(symbols)} stocks",
        "mode": mode,
        "symbols_count": len(symbols)
    }

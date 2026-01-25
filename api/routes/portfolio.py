"""
Portfolio Routes - Track holdings, transactions, and P&L
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from datetime import datetime, date

from api.core.config import get_settings
from api.core.auth import get_current_user_id
from api.core.database import APIDatabase, get_db
from api.models.schemas import (
    HoldingCreate, HoldingUpdate, Holding, HoldingList,
    TransactionCreate, Transaction, TransactionList,
    PortfolioSummary, PortfolioPerformance, MessageResponse
)

settings = get_settings()
router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


# =============================================================================
# HOLDINGS
# =============================================================================

@router.get("", response_model=HoldingList)
async def get_portfolio(
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get all holdings with current market values.

    Returns portfolio holdings with real-time P&L calculations.
    """
    holdings = await db.get_holdings(user_id)

    # Calculate portfolio totals
    total_invested = sum(h["invested_value"] for h in holdings)
    total_current = sum(h.get("current_value", h["invested_value"]) for h in holdings)
    total_gain_loss = total_current - total_invested
    total_gain_loss_pct = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0

    day_change = sum(h.get("day_change", 0) or 0 for h in holdings)
    day_change_pct = (day_change / (total_current - day_change) * 100) if (total_current - day_change) > 0 else 0

    return HoldingList(
        holdings=[Holding(**h) for h in holdings],
        total_invested=round(total_invested, 2),
        total_current_value=round(total_current, 2),
        total_gain_loss=round(total_gain_loss, 2),
        total_gain_loss_pct=round(total_gain_loss_pct, 2),
        day_change=round(day_change, 2),
        day_change_pct=round(day_change_pct, 2)
    )


@router.post("/holdings", response_model=Holding, status_code=status.HTTP_201_CREATED)
async def add_holding(
    data: HoldingCreate,
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Add a new holding to portfolio.

    - Symbol will be uppercased automatically
    - If symbol already exists, use PUT to update
    """
    symbol = data.symbol.upper().strip()

    # Validate symbol format
    if not all(c.isalnum() or c in '&-' for c in symbol):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid symbol format"
        )

    # Check if holding already exists
    existing = await db.get_holding(user_id, symbol)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Holding for {symbol} already exists. Use PUT to update."
        )

    holding = await db.create_holding(
        user_id=user_id,
        symbol=symbol,
        quantity=data.quantity,
        avg_price=data.avg_price,
        notes=data.notes
    )

    if not holding:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create holding"
        )

    return Holding(**holding)


@router.put("/holdings/{symbol}", response_model=Holding)
async def update_holding(
    symbol: str,
    data: HoldingUpdate,
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Update an existing holding.

    Use this to adjust quantity or average price after additional purchases.
    """
    symbol = symbol.upper().strip()

    existing = await db.get_holding(user_id, symbol)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No holding found for {symbol}"
        )

    updated = await db.update_holding(
        user_id=user_id,
        symbol=symbol,
        quantity=data.quantity,
        avg_price=data.avg_price,
        notes=data.notes
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update holding"
        )

    return Holding(**updated)


@router.delete("/holdings/{symbol}", response_model=MessageResponse)
async def delete_holding(
    symbol: str,
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Remove a holding from portfolio.

    This does not create a SELL transaction. Use transactions for proper tracking.
    """
    symbol = symbol.upper().strip()

    success = await db.delete_holding(user_id, symbol)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No holding found for {symbol}"
        )

    return MessageResponse(message=f"{symbol} removed from portfolio")


# =============================================================================
# TRANSACTIONS
# =============================================================================

@router.get("/transactions", response_model=TransactionList)
async def get_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    symbol: Optional[str] = None,
    type: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get transaction history.

    Supports filtering by symbol and transaction type.
    """
    offset = (page - 1) * per_page

    transactions, total = await db.get_transactions(
        user_id=user_id,
        limit=per_page,
        offset=offset,
        symbol=symbol.upper() if symbol else None,
        tx_type=type
    )

    return TransactionList(
        transactions=[Transaction(**t) for t in transactions],
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + per_page) < total
    )


@router.post("/transactions", response_model=Transaction, status_code=status.HTTP_201_CREATED)
async def add_transaction(
    data: TransactionCreate,
    update_holding: bool = Query(True, description="Auto-update holdings based on transaction"),
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Add a new transaction.

    - BUY/SELL: Requires quantity and price
    - DIVIDEND: Requires amount
    - SPLIT/BONUS: Requires quantity (new shares received)

    If update_holding=True (default), holdings will be automatically adjusted.
    """
    symbol = data.symbol.upper().strip()

    # Validate based on transaction type
    if data.type in ('BUY', 'SELL'):
        if not data.quantity or not data.price:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{data.type} transactions require quantity and price"
            )
        amount = data.quantity * data.price + (data.fees if data.type == 'BUY' else -data.fees)
    elif data.type == 'DIVIDEND':
        if not data.amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DIVIDEND transactions require amount"
            )
        amount = data.amount
    else:  # SPLIT, BONUS
        if not data.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{data.type} transactions require quantity"
            )
        amount = 0

    # Parse transaction date
    try:
        tx_date = datetime.strptime(data.transaction_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD"
        )

    # For SELL, check if we have enough shares
    if data.type == 'SELL':
        holding = await db.get_holding(user_id, symbol)
        if not holding or holding["quantity"] < data.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient shares. You have {holding['quantity'] if holding else 0} shares of {symbol}"
            )

    transaction = await db.create_transaction(
        user_id=user_id,
        symbol=symbol,
        tx_type=data.type,
        quantity=data.quantity,
        price=data.price,
        amount=amount,
        fees=data.fees,
        transaction_date=tx_date,
        notes=data.notes
    )

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create transaction"
        )

    # Auto-update holdings
    if update_holding:
        await db.update_holding_from_transaction(
            user_id=user_id,
            symbol=symbol,
            tx_type=data.type,
            quantity=data.quantity,
            price=data.price
        )

    return Transaction(**transaction)


# =============================================================================
# SUMMARY & PERFORMANCE
# =============================================================================

@router.get("/summary", response_model=PortfolioSummary)
async def get_portfolio_summary(
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get portfolio summary with key metrics.

    Includes total P&L, day change, and top performers.
    """
    holdings = await db.get_holdings(user_id)

    if not holdings:
        return PortfolioSummary(
            total_invested=0,
            total_current_value=0,
            total_gain_loss=0,
            total_gain_loss_pct=0,
            day_change=0,
            day_change_pct=0,
            holdings_count=0
        )

    # Calculate totals
    total_invested = sum(h["invested_value"] for h in holdings)
    total_current = sum(h.get("current_value", h["invested_value"]) for h in holdings)
    total_gain_loss = total_current - total_invested
    total_gain_loss_pct = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0

    day_change = sum(h.get("day_change", 0) or 0 for h in holdings)
    prev_value = total_current - day_change
    day_change_pct = (day_change / prev_value * 100) if prev_value > 0 else 0

    # Find top gainer/loser by percentage
    holdings_with_change = [h for h in holdings if h.get("gain_loss_pct") is not None]
    top_gainer = max(holdings_with_change, key=lambda x: x["gain_loss_pct"])["symbol"] if holdings_with_change else None
    top_loser = min(holdings_with_change, key=lambda x: x["gain_loss_pct"])["symbol"] if holdings_with_change else None

    return PortfolioSummary(
        total_invested=round(total_invested, 2),
        total_current_value=round(total_current, 2),
        total_gain_loss=round(total_gain_loss, 2),
        total_gain_loss_pct=round(total_gain_loss_pct, 2),
        day_change=round(day_change, 2),
        day_change_pct=round(day_change_pct, 2),
        holdings_count=len(holdings),
        top_gainer=top_gainer,
        top_loser=top_loser
    )


@router.get("/performance", response_model=PortfolioPerformance)
async def get_portfolio_performance(
    days: int = Query(30, ge=7, le=365, description="Number of days of history"),
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get historical portfolio performance.

    Returns daily values for charting and XIRR calculation.
    """
    snapshots = await db.get_portfolio_snapshots(user_id, days)

    if not snapshots:
        return PortfolioPerformance(
            dates=[],
            values=[],
            invested=[],
            returns=[],
            xirr=None,
            cagr=None
        )

    dates = [s["snapshot_date"].strftime("%Y-%m-%d") for s in snapshots]
    values = [float(s["total_value"]) for s in snapshots]
    invested = [float(s["total_invested"]) for s in snapshots]
    returns = [float(s["gain_loss_pct"]) for s in snapshots]

    # Calculate XIRR from transactions
    xirr = await db.calculate_xirr(user_id)

    # Calculate CAGR
    if len(snapshots) >= 2 and invested[0] > 0:
        years = days / 365
        cagr = ((values[-1] / invested[0]) ** (1 / years) - 1) * 100 if years > 0 else 0
    else:
        cagr = None

    return PortfolioPerformance(
        dates=dates,
        values=values,
        invested=invested,
        returns=returns,
        xirr=xirr,
        cagr=round(cagr, 2) if cagr else None
    )

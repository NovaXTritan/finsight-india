"""
Signals Routes - Get and interact with anomaly signals
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query

from api.core.auth import get_current_user_id
from api.core.database import APIDatabase, get_db
from api.models.schemas import Signal, SignalList, SignalAction, MessageResponse

router = APIRouter(prefix="/signals", tags=["Signals"])


@router.get("", response_model=SignalList)
async def get_signals(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get signals for your watchlist symbols.
    
    Signals are anomalies detected by FinSight's detection engine.
    Only shows signals for symbols in your watchlist.
    
    - **page**: Page number (starts at 1)
    - **per_page**: Results per page (max 100)
    """
    offset = (page - 1) * per_page
    
    signals = await db.get_signals_for_user(
        user_id=user_id,
        limit=per_page,
        offset=offset
    )
    
    total = await db.get_signal_count_for_user(user_id)
    
    return SignalList(
        signals=[Signal(**s) for s in signals],
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + len(signals)) < total
    )


@router.get("/latest", response_model=list[Signal])
async def get_latest_signals(
    limit: int = Query(5, ge=1, le=20, description="Number of signals"),
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get the latest signals for your watchlist.
    
    Quick endpoint for dashboards and real-time updates.
    """
    signals = await db.get_latest_signals(user_id=user_id, limit=limit)
    return [Signal(**s) for s in signals]


@router.get("/{signal_id}", response_model=Signal)
async def get_signal(
    signal_id: str,
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get details of a specific signal.
    """
    async with db.pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT
                a.id, a.symbol, a.pattern_type, a.severity,
                a.z_score, a.price, a.volume, a.detected_at,
                a.agent_decision, a.agent_confidence, a.agent_reason,
                a.context, a.sources, a.thought_process
            FROM anomalies a
            INNER JOIN user_watchlist w ON a.symbol = w.symbol
            WHERE a.id = $1 AND w.user_id = $2
        """, signal_id, user_id)
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Signal not found or not in your watchlist"
            )
        
        return Signal(**dict(row))


@router.post("/{signal_id}/action", response_model=MessageResponse)
async def record_signal_action(
    signal_id: str,
    action: SignalAction,
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Record your action on a signal.
    
    This helps FinSight learn your preferences.
    
    Actions:
    - **ignored**: You saw it but didn't act
    - **reviewed**: You researched it further
    - **traded**: You made a trade based on this signal
    """
    # Verify signal exists and is accessible
    async with db.pool.acquire() as conn:
        exists = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM anomalies a
                INNER JOIN user_watchlist w ON a.symbol = w.symbol
                WHERE a.id = $1 AND w.user_id = $2
            )
        """, signal_id, user_id)
        
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Signal not found or not in your watchlist"
            )
    
    await db.record_user_action(
        user_id=user_id,
        anomaly_id=signal_id,
        action=action.action,
        notes=action.notes
    )
    
    return MessageResponse(
        message=f"Action '{action.action}' recorded for signal",
        success=True
    )


@router.get("/symbol/{symbol}", response_model=list[Signal])
async def get_signals_by_symbol(
    symbol: str,
    limit: int = Query(10, ge=1, le=50),
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get signals for a specific symbol.
    
    Symbol must be in your watchlist.
    """
    # Check if symbol is in watchlist
    watchlist = await db.get_watchlist(user_id)
    
    if symbol.upper() not in watchlist:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{symbol.upper()} is not in your watchlist"
        )
    
    async with db.pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT
                id, symbol, pattern_type, severity,
                z_score, price, volume, detected_at,
                agent_decision, agent_confidence, agent_reason,
                context, sources, thought_process
            FROM anomalies
            WHERE symbol = $1
            ORDER BY detected_at DESC
            LIMIT $2
        """, symbol.upper(), limit)
        
        return [Signal(**dict(row)) for row in rows]


@router.post("/detect", response_model=MessageResponse)
async def run_detection(
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Trigger real-time anomaly detection for your watchlist.

    This analyzes all symbols in your watchlist using real market data
    and generates signals only when genuine statistical anomalies are detected.

    Note: Detection is based on Z-score analysis. Signals are rare and only
    appear when unusual volume, price, or volatility patterns occur.
    """
    import asyncio
    from detection.real_detector import RealAnomalyDetector
    from api.core.config import get_settings

    settings = get_settings()

    # Get user's watchlist
    watchlist = await db.get_watchlist(user_id)

    if not watchlist:
        return MessageResponse(
            message="No symbols in watchlist. Add symbols first.",
            success=False
        )

    # Run detection
    detector = RealAnomalyDetector(settings.database_url)

    try:
        await detector.connect()
        signals = await detector.run_detection(watchlist)

        if signals:
            return MessageResponse(
                message=f"Detection complete. Found {len(signals)} anomalies: {', '.join(s['symbol'] for s in signals)}",
                success=True
            )
        else:
            return MessageResponse(
                message="Detection complete. No anomalies detected - market activity is within normal parameters.",
                success=True
            )
    finally:
        await detector.close()

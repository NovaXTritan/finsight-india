"""
Signals Routes - Get and interact with anomaly signals
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from datetime import datetime, timedelta
import random
import uuid

from api.core.auth import get_current_user_id
from api.core.database import APIDatabase, get_db
from api.models.schemas import Signal, SignalList, SignalAction, MessageResponse


# Demo signals for demonstration purposes
DEMO_SIGNALS = [
    {
        "id": str(uuid.uuid4()),
        "symbol": "RELIANCE",
        "pattern_type": "volume_spike",
        "severity": "high",
        "z_score": 3.5,
        "price": 2890.50,
        "volume": 15000000,
        "detected_at": (datetime.now() - timedelta(hours=2)).isoformat(),
        "agent_decision": "MONITOR",
        "agent_confidence": 0.85,
        "agent_reason": "Unusual volume detected. 3.5x above 20-day average. Could indicate institutional activity ahead of quarterly results.",
        "context": "Volume spike detected 3.5 standard deviations above the 20-day average. Previous similar patterns have preceded 2-3% price moves within 48 hours.",
        "is_demo": True
    },
    {
        "id": str(uuid.uuid4()),
        "symbol": "INFY",
        "pattern_type": "breakout",
        "severity": "medium",
        "z_score": 2.8,
        "price": 1520.00,
        "volume": 8500000,
        "detected_at": (datetime.now() - timedelta(hours=5)).isoformat(),
        "agent_decision": "BUY_CONSIDERATION",
        "agent_confidence": 0.72,
        "agent_reason": "Stock breaking out of 52-week consolidation range with above-average volume. Technical setup suggests potential upside.",
        "context": "Price crossed above 1500 resistance level which held for 3 months. RSI at 65 indicates momentum without overbought conditions.",
        "is_demo": True
    },
    {
        "id": str(uuid.uuid4()),
        "symbol": "TATAMOTORS",
        "pattern_type": "volatility_surge",
        "severity": "high",
        "z_score": 4.2,
        "price": 785.25,
        "volume": 22000000,
        "detected_at": (datetime.now() - timedelta(hours=8)).isoformat(),
        "agent_decision": "ALERT",
        "agent_confidence": 0.91,
        "agent_reason": "Extreme volatility detected. Intraday range exceeds 4% which is 4.2 standard deviations above normal. News catalyst likely.",
        "context": "EV segment announcement expected. Options IV spiking. Historical pattern suggests major move within 24 hours.",
        "is_demo": True
    },
    {
        "id": str(uuid.uuid4()),
        "symbol": "HDFCBANK",
        "pattern_type": "unusual_options_activity",
        "severity": "medium",
        "z_score": 2.5,
        "price": 1650.00,
        "volume": 12000000,
        "detected_at": (datetime.now() - timedelta(hours=12)).isoformat(),
        "agent_decision": "RESEARCH",
        "agent_confidence": 0.68,
        "agent_reason": "Unusual call buying detected at 1700 strike. Open interest increased 200% in a single session.",
        "context": "Smart money appears to be positioning for upside. RBI policy meeting next week could be the catalyst.",
        "is_demo": True
    },
    {
        "id": str(uuid.uuid4()),
        "symbol": "BHARTIARTL",
        "pattern_type": "price_divergence",
        "severity": "low",
        "z_score": 1.8,
        "price": 1425.00,
        "volume": 6500000,
        "detected_at": (datetime.now() - timedelta(hours=18)).isoformat(),
        "agent_decision": "WATCH",
        "agent_confidence": 0.55,
        "agent_reason": "Price diverging from sector trend. While NIFTY IT is down 1%, BHARTIARTL shows resilience with 0.5% gain.",
        "context": "Relative strength indicating potential sector rotation. 5G spectrum news flow positive.",
        "is_demo": True
    },
    {
        "id": str(uuid.uuid4()),
        "symbol": "TCS",
        "pattern_type": "support_test",
        "severity": "medium",
        "z_score": 2.1,
        "price": 3850.00,
        "volume": 4200000,
        "detected_at": (datetime.now() - timedelta(hours=24)).isoformat(),
        "agent_decision": "OPPORTUNITY",
        "agent_confidence": 0.75,
        "agent_reason": "Stock testing 200-day moving average support at 3820. Historical bounce rate at this level is 78%.",
        "context": "Long-term uptrend intact. Current test of 200 DMA could be buying opportunity with defined risk at 3750.",
        "is_demo": True
    },
]

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


@router.get("/demo")
async def get_demo_signals():
    """
    Get sample demo signals for demonstration purposes.

    These are pre-generated signals showing various pattern types
    to help users understand what real signals look like.

    Pattern types include:
    - volume_spike: Unusual trading volume
    - breakout: Price breaking key levels
    - volatility_surge: Extreme price movement
    - unusual_options_activity: Anomalous options trading
    - price_divergence: Sector/index divergence
    - support_test: Testing key support levels
    """
    return {
        "signals": DEMO_SIGNALS,
        "total": len(DEMO_SIGNALS),
        "is_demo": True,
        "message": "These are sample signals for demonstration. Real signals appear when anomalies are detected in your watchlist."
    }


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

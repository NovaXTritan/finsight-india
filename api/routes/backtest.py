"""
Backtesting API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
import traceback

from api.core.auth import get_current_user_id
from api.core.database import db
from api.models.schemas import (
    BacktestCreate, BacktestRun, BacktestRunList, BacktestTrade, BacktestTradeList,
    EquityCurvePoint, EquityCurve, BacktestResult, MessageResponse
)
from backtesting.engine import BacktestEngine, Strategy, PRESET_STRATEGIES

router = APIRouter(prefix="/backtest", tags=["Backtesting"])


# =============================================================================
# RUN BACKTEST
# =============================================================================

@router.post("/run", response_model=BacktestRun, status_code=status.HTTP_201_CREATED)
async def run_backtest(
    config: BacktestCreate,
    user_id: str = Depends(get_current_user_id)
):
    """
    Run a backtest with the specified configuration.

    Strategies available:
    - **sma_crossover**: Simple Moving Average crossover
    - **rsi**: RSI oversold/overbought
    - **macd**: MACD crossover
    - **breakout**: Price breakout

    Position sizing:
    - **fixed**: Fixed amount per trade (capital_per_trade)
    - **percent**: Percentage of available capital (capital_percent)
    """
    # Validate dates
    if config.start_date >= config.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before end date"
        )

    if config.end_date > date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date cannot be in the future"
        )

    if not config.symbols:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one symbol is required"
        )

    # Create strategy
    strategy = Strategy.from_dict(config.strategy)

    # Create backtest record
    backtest_id = await db.create_backtest_run(
        user_id=user_id,
        name=config.name,
        strategy=config.strategy,
        symbols=config.symbols,
        start_date=config.start_date,
        end_date=config.end_date,
        initial_capital=config.initial_capital
    )

    # Update status to running
    await db.update_backtest_status(backtest_id, 'running')

    try:
        # Run backtest synchronously (for now)
        engine = BacktestEngine(
            symbols=config.symbols,
            strategy=strategy,
            start_date=datetime.combine(config.start_date, datetime.min.time()),
            end_date=datetime.combine(config.end_date, datetime.max.time()),
            initial_capital=config.initial_capital
        )

        # Load data
        if not engine.load_data():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to load historical data for symbols"
            )

        # Run simulation
        metrics = engine.run()

        # Save results
        await db.save_backtest_results(
            backtest_id=backtest_id,
            metrics=metrics.to_dict(),
            trades=engine.trades,
            equity_curve=engine.equity_curve
        )

        # Update status to completed
        await db.update_backtest_status(backtest_id, 'completed')

        # Fetch and return the completed backtest
        return await db.get_backtest_run(backtest_id, user_id)

    except HTTPException:
        raise
    except Exception as e:
        # Update status to failed
        await db.update_backtest_status(backtest_id, 'failed', str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backtest failed: {str(e)}"
        )


# =============================================================================
# LIST BACKTESTS
# =============================================================================

@router.get("/jobs", response_model=BacktestRunList)
async def list_backtests(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, pattern="^(pending|running|completed|failed)$"),
    user_id: str = Depends(get_current_user_id)
):
    """
    List user's backtest runs.

    Supports filtering by status and pagination.
    """
    runs, total = await db.list_backtest_runs(
        user_id=user_id,
        page=page,
        per_page=per_page,
        status_filter=status
    )

    return BacktestRunList(
        runs=runs,
        total=total,
        page=page,
        per_page=per_page,
        has_more=page * per_page < total
    )


# =============================================================================
# GET BACKTEST DETAILS
# =============================================================================

@router.get("/{backtest_id}", response_model=BacktestResult)
async def get_backtest(
    backtest_id: UUID,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get detailed results for a specific backtest.

    Returns metrics, summary stats, and basic info.
    """
    backtest = await db.get_backtest_run(str(backtest_id), user_id)

    if not backtest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest not found"
        )

    # Get trade summary
    trades = await db.get_backtest_trades(str(backtest_id))

    return BacktestResult(
        run=backtest,
        trade_count=len(trades),
        symbols_traded=list(set(t.symbol for t in trades))
    )


# =============================================================================
# GET BACKTEST TRADES
# =============================================================================

@router.get("/{backtest_id}/trades", response_model=BacktestTradeList)
async def get_backtest_trades(
    backtest_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    symbol: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get individual trades for a backtest.

    Supports filtering by symbol and pagination.
    """
    # Verify ownership
    backtest = await db.get_backtest_run(str(backtest_id), user_id)
    if not backtest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest not found"
        )

    trades, total = await db.get_backtest_trades_paginated(
        backtest_id=str(backtest_id),
        page=page,
        per_page=per_page,
        symbol=symbol
    )

    return BacktestTradeList(
        trades=trades,
        total=total,
        page=page,
        per_page=per_page,
        has_more=page * per_page < total
    )


# =============================================================================
# GET EQUITY CURVE
# =============================================================================

@router.get("/{backtest_id}/equity-curve", response_model=EquityCurve)
async def get_equity_curve(
    backtest_id: UUID,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get equity curve data for charting.

    Returns daily equity values, drawdown, and returns.
    """
    # Verify ownership
    backtest = await db.get_backtest_run(str(backtest_id), user_id)
    if not backtest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest not found"
        )

    curve_data = await db.get_backtest_equity_curve(str(backtest_id))

    return EquityCurve(
        dates=[p['date'].isoformat() for p in curve_data],
        equity=[p['equity'] for p in curve_data],
        cash=[p['cash'] for p in curve_data],
        positions_value=[p['positions_value'] for p in curve_data],
        daily_returns=[p['daily_return'] for p in curve_data],
        drawdown=[p['drawdown'] for p in curve_data]
    )


# =============================================================================
# DELETE BACKTEST
# =============================================================================

@router.delete("/{backtest_id}", response_model=MessageResponse)
async def delete_backtest(
    backtest_id: UUID,
    user_id: str = Depends(get_current_user_id)
):
    """
    Delete a backtest and all associated data.
    """
    # Verify ownership
    backtest = await db.get_backtest_run(str(backtest_id), user_id)
    if not backtest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest not found"
        )

    await db.delete_backtest(str(backtest_id))

    return MessageResponse(message="Backtest deleted successfully")


# =============================================================================
# PRESET STRATEGIES
# =============================================================================

@router.get("/presets/list")
async def get_preset_strategies(
    user_id: str = Depends(get_current_user_id)
):
    """
    Get list of preset strategy configurations.

    Use these as starting points for your backtests.
    """
    presets = []
    for key, strategy in PRESET_STRATEGIES.items():
        presets.append({
            'id': key,
            'name': strategy.name,
            'type': strategy.type.value,
            'config': strategy.to_dict()
        })

    return {'presets': presets}


# =============================================================================
# COMPARE BACKTESTS
# =============================================================================

@router.post("/compare")
async def compare_backtests(
    backtest_ids: List[UUID],
    user_id: str = Depends(get_current_user_id)
):
    """
    Compare multiple backtests side by side.

    Returns metrics for all specified backtests.
    """
    if len(backtest_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 backtests required for comparison"
        )

    if len(backtest_ids) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 backtests can be compared"
        )

    results = []
    for bid in backtest_ids:
        backtest = await db.get_backtest_run(str(bid), user_id)
        if backtest:
            results.append({
                'id': str(bid),
                'name': backtest.name,
                'strategy': backtest.strategy.get('name', 'Unknown'),
                'total_return': backtest.total_return,
                'sharpe_ratio': backtest.sharpe_ratio,
                'max_drawdown': backtest.max_drawdown,
                'win_rate': backtest.win_rate,
                'total_trades': backtest.total_trades,
                'profit_factor': backtest.profit_factor
            })

    return {'backtests': results}


# =============================================================================
# STRATEGY TYPES
# =============================================================================

@router.get("/strategies/types")
async def get_strategy_types(
    user_id: str = Depends(get_current_user_id)
):
    """
    Get available strategy types with their parameters.
    """
    return {
        'types': [
            {
                'id': 'sma_crossover',
                'name': 'SMA Crossover',
                'description': 'Buy when fast SMA crosses above slow SMA, sell on opposite',
                'params': [
                    {'name': 'fast_period', 'type': 'int', 'default': 20, 'min': 5, 'max': 100},
                    {'name': 'slow_period', 'type': 'int', 'default': 50, 'min': 10, 'max': 200}
                ]
            },
            {
                'id': 'rsi',
                'name': 'RSI',
                'description': 'Buy on oversold, sell on overbought RSI levels',
                'params': [
                    {'name': 'oversold', 'type': 'int', 'default': 30, 'min': 10, 'max': 40},
                    {'name': 'overbought', 'type': 'int', 'default': 70, 'min': 60, 'max': 90},
                    {'name': 'exit_level', 'type': 'int', 'default': 50, 'min': 40, 'max': 60}
                ]
            },
            {
                'id': 'macd',
                'name': 'MACD',
                'description': 'Buy on MACD bullish crossover, sell on bearish crossover',
                'params': []
            },
            {
                'id': 'breakout',
                'name': 'Breakout',
                'description': 'Buy on N-day high breakout, sell on N-day low breakout',
                'params': [
                    {'name': 'period', 'type': 'int', 'default': 20, 'min': 5, 'max': 50}
                ]
            }
        ]
    }

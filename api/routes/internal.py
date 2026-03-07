"""
Internal Routes - Protected endpoints for scheduled tasks.

These endpoints are called by Cloud Scheduler or manually.
Protected by SCHEDULER_SECRET header.
"""
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header, status

from api.core.config import get_settings
from api.core.database import get_db
from data.smartapi_client import SmartAPIClient, NIFTY50_SYMBOLS
from detection.real_detector import RealAnomalyDetector

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/internal", tags=["Internal"])


def _verify_scheduler_secret(x_scheduler_secret: str = Header(None)):
    """Verify the scheduler secret header."""
    if not settings.scheduler_secret:
        # No secret configured — allow in development
        if settings.environment == "production":
            raise HTTPException(status_code=403, detail="SCHEDULER_SECRET not configured")
        return

    if x_scheduler_secret != settings.scheduler_secret:
        raise HTTPException(status_code=403, detail="Invalid scheduler secret")


@router.post("/run-detection")
async def run_detection(x_scheduler_secret: str = Header(None)):
    """
    Run the full detection pipeline:
    1. Fetch today's data from SmartAPI for all Nifty 50 stocks
    2. Save to market_data table
    3. Run Z-score anomaly detection
    4. Save detected signals to anomalies table

    Protected by X-Scheduler-Secret header.
    Called by Cloud Scheduler at 15:45 IST on weekdays.
    """
    _verify_scheduler_secret(x_scheduler_secret)

    start_time = datetime.now()
    results = {
        "started_at": start_time.isoformat(),
        "data_fetched": 0,
        "signals_detected": 0,
        "symbols_analyzed": 0,
        "errors": [],
    }

    # Step 1: Fetch fresh market data
    client = SmartAPIClient()
    if client.authenticate():
        client.load_instrument_tokens()
        await client.connect_db()

        for symbol in NIFTY50_SYMBOLS:
            try:
                df = client.get_historical_data(symbol, days=5)
                if df is not None and not df.empty:
                    saved = await client.save_candles_to_db(symbol, df)
                    results["data_fetched"] += saved
            except Exception as e:
                results["errors"].append(f"{symbol}: data fetch - {str(e)}")

            # Rate limit
            import asyncio
            await asyncio.sleep(0.3)

        await client.close_db()
        logger.info(f"Data fetch complete: {results['data_fetched']} rows saved")
    else:
        results["errors"].append("SmartAPI authentication failed — running detection on cached data only")
        logger.warning("SmartAPI auth failed, using cached data for detection")

    # Step 2: Run detection
    detector = RealAnomalyDetector(settings.database_url)
    try:
        await detector.connect()

        # Get all watchlist symbols + Nifty 50 (union)
        watchlist_symbols = await detector.get_all_watchlist_symbols()
        all_symbols = list(set(watchlist_symbols + NIFTY50_SYMBOLS))
        results["symbols_analyzed"] = len(all_symbols)

        signals = await detector.run_detection(all_symbols)
        results["signals_detected"] = len(signals)

        logger.info(f"Detection complete: {len(signals)} signals from {len(all_symbols)} symbols")

    except Exception as e:
        results["errors"].append(f"Detection error: {str(e)}")
        logger.error(f"Detection pipeline error: {e}")
    finally:
        await detector.close()

    # Step 3: Track outcomes for past signals
    try:
        from services.outcome_tracker import OutcomeTracker
        tracker = OutcomeTracker(detector.pool if detector.pool else None)
        if tracker.pool is None:
            # Re-connect for outcome tracking
            import asyncpg
            tracker.pool = await asyncpg.create_pool(
                settings.database_url, min_size=1, max_size=3, statement_cache_size=0
            )
        await tracker.ensure_table()
        outcome_results = await tracker.track_outcomes()
        results["outcomes_tracked"] = outcome_results.get("tracked", 0)
        if tracker.pool and tracker.pool != detector.pool:
            await tracker.pool.close()
    except Exception as e:
        results["errors"].append(f"Outcome tracking error: {str(e)}")
        logger.error(f"Outcome tracking error: {e}")

    # Step 4: Detect market regime and adjust signal confidence
    try:
        import asyncpg
        regime_pool = await asyncpg.create_pool(
            settings.database_url, min_size=1, max_size=3, statement_cache_size=0
        )
        from services.regime_detector import RegimeDetector
        regime_detector = RegimeDetector(regime_pool)
        regime_result = await regime_detector.detect_regime()
        results["regime"] = regime_result["regime"]
        results["regime_confidence"] = regime_result["confidence"]

        # Adjust confidence levels of today's signals
        if signals:
            async with regime_pool.acquire() as conn:
                for sig in signals:
                    adjusted = regime_detector.adjust_signal_confidence(
                        regime_result["regime"], sig
                    )
                    if adjusted != sig.get("confidence_level", 1):
                        await conn.execute(
                            "UPDATE anomalies SET confidence_level = $1 WHERE id = $2",
                            adjusted, sig["id"]
                        )
            results["regime_adjustments"] = len(signals)

        await regime_pool.close()
    except Exception as e:
        results["errors"].append(f"Regime detection error: {str(e)}")
        logger.error(f"Regime detection error: {e}")

    results["completed_at"] = datetime.now().isoformat()
    results["duration_seconds"] = (datetime.now() - start_time).total_seconds()

    return results


@router.post("/fetch-data")
async def fetch_market_data(
    x_scheduler_secret: str = Header(None),
    symbols: list = None,
    days: int = 5,
):
    """
    Fetch and cache market data only (no detection).
    Useful for ad-hoc data refresh.
    """
    _verify_scheduler_secret(x_scheduler_secret)

    target_symbols = symbols or NIFTY50_SYMBOLS
    client = SmartAPIClient()

    if not client.authenticate():
        raise HTTPException(
            status_code=503,
            detail="SmartAPI authentication failed"
        )

    client.load_instrument_tokens()
    await client.connect_db()

    fetched = 0
    errors = []

    for symbol in target_symbols:
        try:
            df = client.get_historical_data(symbol, days=days)
            if df is not None and not df.empty:
                saved = await client.save_candles_to_db(symbol, df)
                fetched += saved
        except Exception as e:
            errors.append(f"{symbol}: {str(e)}")

        import asyncio
        await asyncio.sleep(0.3)

    await client.close_db()

    return {
        "symbols_requested": len(target_symbols),
        "rows_saved": fetched,
        "errors": errors,
    }


@router.get("/data-status")
async def data_status(x_scheduler_secret: str = Header(None)):
    """Check market_data table status — how fresh is the data?"""
    _verify_scheduler_secret(x_scheduler_secret)

    db = await get_db()
    if db.pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    async with db.pool.acquire() as conn:
        stats = await conn.fetchrow("""
            SELECT
                COUNT(DISTINCT symbol) as symbol_count,
                COUNT(*) as total_rows,
                MAX(trade_date) as newest_date,
                MIN(trade_date) as oldest_date,
                MAX(fetched_at) as last_fetched
            FROM market_data
        """)

        # Per-symbol freshness
        stale = await conn.fetch("""
            SELECT symbol, MAX(trade_date) as latest_date
            FROM market_data
            GROUP BY symbol
            HAVING MAX(trade_date) < CURRENT_DATE - INTERVAL '3 days'
            ORDER BY latest_date ASC
        """)

    return {
        "symbol_count": stats["symbol_count"],
        "total_rows": stats["total_rows"],
        "newest_date": str(stats["newest_date"]) if stats["newest_date"] else None,
        "oldest_date": str(stats["oldest_date"]) if stats["oldest_date"] else None,
        "last_fetched": stats["last_fetched"].isoformat() if stats["last_fetched"] else None,
        "stale_symbols": [{"symbol": r["symbol"], "latest": str(r["latest_date"])} for r in stale],
    }

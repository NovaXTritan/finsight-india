"""
Historical Data Backfill Script

Populates the market_data table with daily OHLCV for Nifty 50 stocks.
Supports two data sources: Angel One SmartAPI (preferred) and Yahoo Finance (fallback).

Usage:
    python -m scripts.backfill_historical --source yfinance
    python -m scripts.backfill_historical --source smartapi
    python -m scripts.backfill_historical --source yfinance --symbols RELIANCE TCS
    python -m scripts.backfill_historical --source yfinance --days 60

Idempotent: safe to run multiple times (uses UPSERT).
"""
import asyncio
import argparse
import os
import sys
import time
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.smartapi_client import NIFTY50_SYMBOLS


async def backfill_yfinance(symbols: list, total_days: int = 365):
    """Backfill using Yahoo Finance (works locally, blocked on cloud)."""
    import yfinance as yf
    import asyncpg
    from dotenv import load_dotenv

    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set in environment")
        return

    print("=" * 60)
    print(f"FinSight Historical Data Backfill (Yahoo Finance)")
    print(f"Symbols: {len(symbols)} | Period: {total_days} days")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    pool = await asyncpg.create_pool(db_url, min_size=1, max_size=5, statement_cache_size=0)

    # Ensure table exists
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS market_data (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                trade_date DATE NOT NULL,
                open DECIMAL(12,2),
                high DECIMAL(12,2),
                low DECIMAL(12,2),
                close DECIMAL(12,2),
                volume BIGINT,
                fetched_at TIMESTAMPTZ DEFAULT NOW(),
                source VARCHAR(20) DEFAULT 'yfinance',
                UNIQUE(symbol, trade_date)
            );
            CREATE INDEX IF NOT EXISTS idx_market_data_symbol_date ON market_data(symbol, trade_date DESC);
        """)

    # Map period
    if total_days <= 7:
        period = "5d"
    elif total_days <= 30:
        period = "1mo"
    elif total_days <= 90:
        period = "3mo"
    elif total_days <= 180:
        period = "6mo"
    elif total_days <= 365:
        period = "1y"
    else:
        period = "2y"

    total_rows = 0
    success = 0
    failed = []

    for i, symbol in enumerate(symbols, 1):
        yf_symbol = f"{symbol}.NS"
        print(f"[{i}/{len(symbols)}] {symbol}...", end=" ", flush=True)
        start = time.time()

        try:
            ticker = yf.Ticker(yf_symbol)
            hist = ticker.history(period=period)

            if hist.empty or len(hist) < 5:
                print(f"NO DATA ({len(hist)} rows)")
                failed.append(symbol)
                continue

            # Build batch VALUES for a single bulk INSERT
            batch = []
            for dt, row in hist.iterrows():
                trade_date = dt.date()
                batch.append((
                    symbol, trade_date,
                    float(row["Open"]), float(row["High"]),
                    float(row["Low"]), float(row["Close"]),
                    int(row["Volume"]), "yfinance"
                ))

            rows_saved = 0
            async with pool.acquire() as conn:
                # Batch insert in chunks of 50 rows via single SQL
                chunk_size = 50
                for ci in range(0, len(batch), chunk_size):
                    chunk = batch[ci:ci + chunk_size]
                    # Build multi-row VALUES clause
                    values_parts = []
                    params = []
                    for idx, row_data in enumerate(chunk):
                        base = idx * 8
                        values_parts.append(
                            f"(${base+1}, ${base+2}, ${base+3}, ${base+4}, ${base+5}, ${base+6}, ${base+7}, ${base+8})"
                        )
                        params.extend(row_data)
                    sql = f"""
                        INSERT INTO market_data (symbol, trade_date, open, high, low, close, volume, source)
                        VALUES {', '.join(values_parts)}
                        ON CONFLICT (symbol, trade_date)
                        DO UPDATE SET open=EXCLUDED.open, high=EXCLUDED.high,
                                     low=EXCLUDED.low, close=EXCLUDED.close,
                                     volume=EXCLUDED.volume, fetched_at=NOW(),
                                     source=EXCLUDED.source
                    """
                    await conn.execute(sql, *params)
                    rows_saved += len(chunk)

            total_rows += rows_saved
            elapsed = time.time() - start
            print(f"{len(hist)} days fetched, {rows_saved} rows saved ({elapsed:.1f}s)")
            success += 1

        except Exception as e:
            print(f"ERROR: {e}")
            failed.append(symbol)

        time.sleep(0.5)  # Rate limit

    await pool.close()

    print("\n" + "=" * 60)
    print(f"Backfill Complete (Yahoo Finance)")
    print(f"  Success: {success}/{len(symbols)} symbols")
    print(f"  Total rows: {total_rows:,}")
    if failed:
        print(f"  Failed: {', '.join(failed)}")
    print(f"  Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)


async def backfill_smartapi(symbols: list, total_days: int = 365):
    """Backfill using Angel One SmartAPI."""
    from dotenv import load_dotenv
    load_dotenv()
    from data.smartapi_client import SmartAPIClient

    client = SmartAPIClient()

    print("=" * 60)
    print(f"FinSight Historical Data Backfill (SmartAPI)")
    print(f"Symbols: {len(symbols)} | Days: {total_days}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    if not client.authenticate():
        print("ERROR: SmartAPI authentication failed.")
        print("Check ANGEL_API_KEY, ANGEL_CLIENT_CODE, ANGEL_PIN, ANGEL_TOTP_SECRET")
        return

    tokens = client.load_instrument_tokens()
    if not tokens:
        print("ERROR: Failed to load instrument tokens")
        return

    valid_symbols = [s for s in symbols if client.get_token(s)]
    missing = [s for s in symbols if not client.get_token(s)]
    if missing:
        print(f"\nWARNING: No tokens for: {', '.join(missing)}")

    print(f"\nFetching data for {len(valid_symbols)} symbols...\n")
    await client.connect_db()

    total_rows = 0
    success = 0
    failed = []

    for i, symbol in enumerate(valid_symbols, 1):
        print(f"[{i}/{len(valid_symbols)}] {symbol}...", end=" ", flush=True)
        start = time.time()

        try:
            if total_days > 90:
                df = client.get_historical_data_chunked(symbol, total_days=total_days, chunk_days=60)
            else:
                df = client.get_historical_data(symbol, days=total_days)

            if df is not None and not df.empty:
                saved = await client.save_candles_to_db(symbol, df)
                total_rows += saved
                elapsed = time.time() - start
                print(f"{len(df)} days, {saved} rows ({elapsed:.1f}s)")
                success += 1
            else:
                print("NO DATA")
                failed.append(symbol)
        except Exception as e:
            print(f"ERROR: {e}")
            failed.append(symbol)

        time.sleep(0.5)

    await client.close_db()

    print("\n" + "=" * 60)
    print(f"Backfill Complete (SmartAPI)")
    print(f"  Success: {success}/{len(valid_symbols)} symbols")
    print(f"  Total rows: {total_rows:,}")
    if failed:
        print(f"  Failed: {', '.join(failed)}")
    print(f"  Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Backfill historical market data")
    parser.add_argument(
        "--source", choices=["smartapi", "yfinance"], default="yfinance",
        help="Data source (default: yfinance)"
    )
    parser.add_argument(
        "--symbols", nargs="+", default=None,
        help="Specific symbols (default: all Nifty 50)"
    )
    parser.add_argument(
        "--days", type=int, default=365,
        help="Calendar days to fetch (default: 365)"
    )
    args = parser.parse_args()

    symbols = args.symbols or NIFTY50_SYMBOLS

    if args.source == "yfinance":
        asyncio.run(backfill_yfinance(symbols, args.days))
    else:
        asyncio.run(backfill_smartapi(symbols, args.days))


if __name__ == "__main__":
    main()

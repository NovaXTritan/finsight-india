#!/usr/bin/env python3
"""
Stock Fundamentals Population Script
Populates the stock_fundamentals table with data from Yahoo Finance
"""
import asyncio
import logging
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

from data.nifty500 import NIFTY_50, NIFTY_NEXT_50, NIFTY_MIDCAP_100, FNO_STOCKS
from data.fundamentals_fetcher import FundamentalsFetcher

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Top 200 stocks to populate (high priority)
TOP_200_STOCKS = list(set(
    NIFTY_50 + NIFTY_NEXT_50 + NIFTY_MIDCAP_100[:100]
))


async def populate_fundamentals(
    db_url: str,
    symbols: list = None,
    batch_size: int = 10,
    delay: float = 1.5
):
    """
    Populate stock fundamentals for the given symbols.

    Args:
        db_url: Database connection URL
        symbols: List of symbols to populate (default: TOP_200_STOCKS)
        batch_size: Number of stocks to fetch per batch
        delay: Delay between batches (seconds)
    """
    symbols = symbols or TOP_200_STOCKS

    logger.info(f"Starting population for {len(symbols)} stocks...")
    logger.info(f"Batch size: {batch_size}, Delay: {delay}s")

    fetcher = FundamentalsFetcher(db_url)

    try:
        await fetcher.connect()
        logger.info("Connected to database")

        stats = await fetcher.fetch_and_save_batch(
            symbols=symbols,
            batch_size=batch_size,
            delay=delay
        )

        logger.info(f"\nPopulation complete!")
        logger.info(f"Success: {stats['success']}")
        logger.info(f"Failed: {stats['failed']}")
        logger.info(f"Skipped: {stats['skipped']}")

        return stats

    except Exception as e:
        logger.error(f"Error during population: {e}")
        raise
    finally:
        await fetcher.close()
        logger.info("Database connection closed")


async def populate_priority_stocks(db_url: str):
    """Populate only high-priority stocks (NIFTY 50 + FNO stocks)."""
    priority = list(set(NIFTY_50 + FNO_STOCKS[:50]))
    return await populate_fundamentals(db_url, priority, batch_size=5, delay=1.0)


async def populate_all_stocks(db_url: str):
    """Populate all Nifty 500 stocks."""
    from data.nifty500 import NIFTY_500
    return await populate_fundamentals(db_url, NIFTY_500, batch_size=20, delay=2.0)


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description='Populate stock fundamentals')
    parser.add_argument(
        '--mode',
        choices=['priority', 'top200', 'all'],
        default='top200',
        help='Population mode: priority (NIFTY 50 + top FNO), top200 (default), all (NIFTY 500)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=10,
        help='Batch size for fetching'
    )
    parser.add_argument(
        '--delay',
        type=float,
        default=1.5,
        help='Delay between batches in seconds'
    )

    args = parser.parse_args()

    # Load environment
    load_dotenv()
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/finsight")

    logger.info(f"Mode: {args.mode}")
    logger.info(f"Database URL: {db_url[:50]}...")

    if args.mode == 'priority':
        asyncio.run(populate_priority_stocks(db_url))
    elif args.mode == 'all':
        asyncio.run(populate_all_stocks(db_url))
    else:
        asyncio.run(populate_fundamentals(
            db_url,
            batch_size=args.batch_size,
            delay=args.delay
        ))


if __name__ == "__main__":
    main()

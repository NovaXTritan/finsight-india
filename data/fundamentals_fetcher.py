"""
Stock Fundamentals Fetcher
Fetches fundamental data from Yahoo Finance for Indian stocks
"""
import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import yfinance as yf
import asyncpg

from data.nifty500 import NIFTY_500, FNO_STOCKS, SECTOR_MAPPING

logger = logging.getLogger(__name__)


class FundamentalsFetcher:
    """Fetches and caches stock fundamentals from Yahoo Finance."""

    def __init__(self, db_url: str):
        self.db_url = db_url
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        """Create database connection pool."""
        self.pool = await asyncpg.create_pool(self.db_url, min_size=2, max_size=10)

    async def close(self):
        """Close database connection pool."""
        if self.pool:
            await self.pool.close()

    def _get_sector(self, symbol: str, yf_sector: str = None) -> str:
        """Get sector for a symbol, using mapping or Yahoo Finance data."""
        # Check our mapping first
        for sector, symbols in SECTOR_MAPPING.items():
            if symbol in symbols:
                return sector
        # Fall back to Yahoo Finance sector
        return yf_sector or "Other"

    async def fetch_single_stock(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch fundamentals for a single stock from Yahoo Finance."""
        try:
            ticker = yf.Ticker(f"{symbol}.NS")
            info = ticker.info

            if not info or info.get("regularMarketPrice") is None:
                # Try .BO suffix for BSE
                ticker = yf.Ticker(f"{symbol}.BO")
                info = ticker.info

            if not info or info.get("regularMarketPrice") is None:
                logger.warning(f"No data found for {symbol}")
                return None

            # Extract fundamentals
            current_price = info.get("currentPrice") or info.get("regularMarketPrice")
            high_52w = info.get("fiftyTwoWeekHigh")
            low_52w = info.get("fiftyTwoWeekLow")

            # Calculate price relative to 52-week range
            price_to_52w_high = None
            price_to_52w_low = None
            if current_price and high_52w:
                price_to_52w_high = round((current_price / high_52w) * 100, 2)
            if current_price and low_52w:
                price_to_52w_low = round((current_price / low_52w) * 100, 2)

            fundamentals = {
                "symbol": symbol,
                "name": info.get("shortName") or info.get("longName") or symbol,
                "sector": self._get_sector(symbol, info.get("sector")),
                "industry": info.get("industry"),
                "market_cap": info.get("marketCap"),
                "pe_ratio": info.get("trailingPE"),
                "pb_ratio": info.get("priceToBook"),
                "ps_ratio": info.get("priceToSalesTrailing12Months"),
                "dividend_yield": (info.get("dividendYield") or 0) * 100 if info.get("dividendYield") else 0,
                "roe": (info.get("returnOnEquity") or 0) * 100 if info.get("returnOnEquity") else None,
                "roce": None,  # Not directly available from yfinance
                "debt_to_equity": info.get("debtToEquity"),
                "current_ratio": info.get("currentRatio"),
                "eps": info.get("trailingEps"),
                "book_value": info.get("bookValue"),
                "face_value": None,  # Not available from yfinance
                "high_52w": high_52w,
                "low_52w": low_52w,
                "current_price": current_price,
                "price_to_52w_high": price_to_52w_high,
                "price_to_52w_low": price_to_52w_low,
                "avg_volume_30d": info.get("averageVolume"),
                "beta": info.get("beta"),
                "is_fno": symbol in FNO_STOCKS,
            }

            return fundamentals

        except Exception as e:
            logger.error(f"Error fetching {symbol}: {e}")
            return None

    async def save_fundamentals(self, fundamentals: Dict[str, Any]) -> bool:
        """Save fundamentals to database."""
        if not fundamentals:
            return False

        async with self.pool.acquire() as conn:
            try:
                await conn.execute("""
                    INSERT INTO stock_fundamentals (
                        symbol, name, sector, industry, market_cap, pe_ratio, pb_ratio,
                        ps_ratio, dividend_yield, roe, roce, debt_to_equity, current_ratio,
                        eps, book_value, face_value, high_52w, low_52w, current_price,
                        price_to_52w_high, price_to_52w_low, avg_volume_30d, beta, is_fno, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                        $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW()
                    )
                    ON CONFLICT (symbol) DO UPDATE SET
                        name = EXCLUDED.name,
                        sector = EXCLUDED.sector,
                        industry = EXCLUDED.industry,
                        market_cap = EXCLUDED.market_cap,
                        pe_ratio = EXCLUDED.pe_ratio,
                        pb_ratio = EXCLUDED.pb_ratio,
                        ps_ratio = EXCLUDED.ps_ratio,
                        dividend_yield = EXCLUDED.dividend_yield,
                        roe = EXCLUDED.roe,
                        roce = EXCLUDED.roce,
                        debt_to_equity = EXCLUDED.debt_to_equity,
                        current_ratio = EXCLUDED.current_ratio,
                        eps = EXCLUDED.eps,
                        book_value = EXCLUDED.book_value,
                        face_value = EXCLUDED.face_value,
                        high_52w = EXCLUDED.high_52w,
                        low_52w = EXCLUDED.low_52w,
                        current_price = EXCLUDED.current_price,
                        price_to_52w_high = EXCLUDED.price_to_52w_high,
                        price_to_52w_low = EXCLUDED.price_to_52w_low,
                        avg_volume_30d = EXCLUDED.avg_volume_30d,
                        beta = EXCLUDED.beta,
                        is_fno = EXCLUDED.is_fno,
                        updated_at = NOW()
                """,
                    fundamentals["symbol"],
                    fundamentals["name"],
                    fundamentals["sector"],
                    fundamentals["industry"],
                    fundamentals["market_cap"],
                    fundamentals["pe_ratio"],
                    fundamentals["pb_ratio"],
                    fundamentals["ps_ratio"],
                    fundamentals["dividend_yield"],
                    fundamentals["roe"],
                    fundamentals["roce"],
                    fundamentals["debt_to_equity"],
                    fundamentals["current_ratio"],
                    fundamentals["eps"],
                    fundamentals["book_value"],
                    fundamentals["face_value"],
                    fundamentals["high_52w"],
                    fundamentals["low_52w"],
                    fundamentals["current_price"],
                    fundamentals["price_to_52w_high"],
                    fundamentals["price_to_52w_low"],
                    fundamentals["avg_volume_30d"],
                    fundamentals["beta"],
                    fundamentals["is_fno"],
                )
                return True
            except Exception as e:
                logger.error(f"Error saving {fundamentals['symbol']}: {e}")
                return False

    async def fetch_and_save_batch(
        self,
        symbols: List[str],
        batch_size: int = 10,
        delay: float = 1.0
    ) -> Dict[str, int]:
        """Fetch and save fundamentals for a batch of symbols."""
        stats = {"success": 0, "failed": 0, "skipped": 0}

        for i in range(0, len(symbols), batch_size):
            batch = symbols[i:i + batch_size]
            logger.info(f"Processing batch {i // batch_size + 1}: {batch}")

            for symbol in batch:
                fundamentals = await self.fetch_single_stock(symbol)
                if fundamentals:
                    saved = await self.save_fundamentals(fundamentals)
                    if saved:
                        stats["success"] += 1
                    else:
                        stats["failed"] += 1
                else:
                    stats["skipped"] += 1

            # Rate limiting
            if i + batch_size < len(symbols):
                await asyncio.sleep(delay)

        return stats

    async def refresh_all(self, symbols: List[str] = None) -> Dict[str, int]:
        """Refresh fundamentals for all Nifty 500 stocks."""
        symbols = symbols or NIFTY_500
        logger.info(f"Refreshing fundamentals for {len(symbols)} stocks...")
        return await self.fetch_and_save_batch(symbols)

    async def refresh_stale(self, hours: int = 24) -> Dict[str, int]:
        """Refresh only stale data (older than specified hours)."""
        async with self.pool.acquire() as conn:
            # Get symbols that need refresh
            stale_symbols = await conn.fetch("""
                SELECT symbol FROM stock_fundamentals
                WHERE updated_at < NOW() - INTERVAL '%s hours'
                UNION
                SELECT unnest($1::text[]) AS symbol
                WHERE NOT EXISTS (
                    SELECT 1 FROM stock_fundamentals sf
                    WHERE sf.symbol = unnest
                )
            """, hours, NIFTY_500)

            symbols = [row["symbol"] for row in stale_symbols]
            # Also include symbols not in database
            existing = await conn.fetch("SELECT symbol FROM stock_fundamentals")
            existing_symbols = {row["symbol"] for row in existing}
            missing = [s for s in NIFTY_500 if s not in existing_symbols]
            symbols = list(set(symbols + missing))

        if symbols:
            logger.info(f"Refreshing {len(symbols)} stale/missing stocks...")
            return await self.fetch_and_save_batch(symbols)

        return {"success": 0, "failed": 0, "skipped": 0}

    async def get_fundamentals(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get fundamentals for a single symbol from cache or fetch."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM stock_fundamentals WHERE symbol = $1
            """, symbol)

            if row:
                return dict(row)

            # Not in cache, fetch it
            fundamentals = await self.fetch_single_stock(symbol)
            if fundamentals:
                await self.save_fundamentals(fundamentals)
            return fundamentals

    async def get_filter_ranges(self) -> Dict[str, Any]:
        """Get min/max ranges for all filterable fields."""
        async with self.pool.acquire() as conn:
            ranges = await conn.fetchrow("""
                SELECT
                    MIN(pe_ratio) as pe_min, MAX(pe_ratio) as pe_max,
                    MIN(pb_ratio) as pb_min, MAX(pb_ratio) as pb_max,
                    MIN(roe) as roe_min, MAX(roe) as roe_max,
                    MIN(dividend_yield) as div_yield_min, MAX(dividend_yield) as div_yield_max,
                    MIN(debt_to_equity) as de_min, MAX(debt_to_equity) as de_max,
                    MIN(market_cap) as mcap_min, MAX(market_cap) as mcap_max,
                    MIN(current_ratio) as cr_min, MAX(current_ratio) as cr_max,
                    MIN(eps) as eps_min, MAX(eps) as eps_max,
                    MIN(beta) as beta_min, MAX(beta) as beta_max
                FROM stock_fundamentals
                WHERE pe_ratio IS NOT NULL
            """)

            sectors = await conn.fetch("""
                SELECT DISTINCT sector FROM stock_fundamentals
                WHERE sector IS NOT NULL
                ORDER BY sector
            """)

            industries = await conn.fetch("""
                SELECT DISTINCT industry FROM stock_fundamentals
                WHERE industry IS NOT NULL
                ORDER BY industry
            """)

            return {
                "pe_ratio": {"min": float(ranges["pe_min"] or 0), "max": float(ranges["pe_max"] or 100)},
                "pb_ratio": {"min": float(ranges["pb_min"] or 0), "max": float(ranges["pb_max"] or 50)},
                "roe": {"min": float(ranges["roe_min"] or -100), "max": float(ranges["roe_max"] or 100)},
                "dividend_yield": {"min": float(ranges["div_yield_min"] or 0), "max": float(ranges["div_yield_max"] or 20)},
                "debt_to_equity": {"min": float(ranges["de_min"] or 0), "max": float(ranges["de_max"] or 500)},
                "market_cap": {"min": int(ranges["mcap_min"] or 0), "max": int(ranges["mcap_max"] or 1e13)},
                "current_ratio": {"min": float(ranges["cr_min"] or 0), "max": float(ranges["cr_max"] or 10)},
                "eps": {"min": float(ranges["eps_min"] or -100), "max": float(ranges["eps_max"] or 1000)},
                "beta": {"min": float(ranges["beta_min"] or 0), "max": float(ranges["beta_max"] or 3)},
                "sectors": [row["sector"] for row in sectors],
                "industries": [row["industry"] for row in industries],
            }


async def run_refresh(db_url: str, symbols: List[str] = None):
    """Standalone function to refresh fundamentals."""
    fetcher = FundamentalsFetcher(db_url)
    await fetcher.connect()
    try:
        stats = await fetcher.refresh_all(symbols)
        print(f"Refresh complete: {stats}")
    finally:
        await fetcher.close()


if __name__ == "__main__":
    import os
    from dotenv import load_dotenv

    load_dotenv()
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/finsight")

    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_refresh(db_url))

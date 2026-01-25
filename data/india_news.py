"""
Indian Market News Aggregator

Fetches news from major Indian financial publications via RSS feeds.
Also fetches news from Yahoo Finance for major stocks.
Tags news with relevant stock symbols and categories.
"""
import asyncio
import aiohttp
import feedparser
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Set
from dataclasses import dataclass, field
import logging
from bs4 import BeautifulSoup
import hashlib

try:
    import yfinance as yf
    HAS_YFINANCE = True
except ImportError:
    HAS_YFINANCE = False

import config

logger = logging.getLogger(__name__)


@dataclass
class NewsItem:
    """Represents a news article."""
    id: str
    title: str
    summary: str
    url: str
    source: str
    published_at: datetime
    symbols: List[str] = field(default_factory=list)
    sentiment: Optional[str] = None  # positive, negative, neutral
    category: str = "markets"  # markets, economy, stocks, ipo
    priority: int = 2

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "title": self.title,
            "summary": self.summary,
            "url": self.url,
            "source": self.source,
            "published_at": self.published_at.isoformat(),
            "symbols": self.symbols,
            "sentiment": self.sentiment,
            "category": self.category,
            "priority": self.priority,
        }


class IndiaNewsAggregator:
    """
    Aggregates news from Indian financial RSS feeds.

    Features:
    - Fetches from multiple sources concurrently
    - Tags news with mentioned stock symbols
    - Basic sentiment detection
    - Deduplication
    """

    # Stock name patterns for tagging
    STOCK_PATTERNS = {
        # Major stocks with common variations
        "RELIANCE": ["reliance", "ril", "reliance industries", "mukesh ambani"],
        "TCS": ["tcs", "tata consultancy", "tata consultancy services"],
        "HDFCBANK": ["hdfc bank", "hdfcbank"],
        "INFY": ["infosys", "infy"],
        "ICICIBANK": ["icici bank", "icicibank"],
        "HINDUNILVR": ["hindustan unilever", "hul", "hindunilvr"],
        "SBIN": ["sbi", "state bank", "state bank of india"],
        "BHARTIARTL": ["bharti airtel", "airtel", "bharti"],
        "KOTAKBANK": ["kotak", "kotak bank", "kotak mahindra"],
        "ITC": ["itc limited", "itc ltd", r"\bitc\b"],
        "LT": ["larsen", "l&t", "larsen & toubro", "larsen and toubro"],
        "AXISBANK": ["axis bank", "axisbank"],
        "ASIANPAINT": ["asian paints", "asianpaint"],
        "MARUTI": ["maruti", "maruti suzuki"],
        "TITAN": ["titan company", "titan"],
        "BAJFINANCE": ["bajaj finance", "bajfinance"],
        "SUNPHARMA": ["sun pharma", "sun pharmaceutical", "sunpharma"],
        "WIPRO": ["wipro"],
        "TATAMOTORS": ["tata motors", "tatamotors"],
        "HCLTECH": ["hcl tech", "hcl technologies", "hcltech"],
        # Additional popular stocks
        "ADANIENT": ["adani enterprises", "adani", "adanient"],
        "ADANIPORTS": ["adani ports", "adaniports"],
        "TATASTEEL": ["tata steel", "tatasteel"],
        "POWERGRID": ["power grid", "powergrid"],
        "NTPC": ["ntpc"],
        "ONGC": ["ongc", "oil and natural gas"],
        "COALINDIA": ["coal india", "coalindia"],
        "JSWSTEEL": ["jsw steel", "jswsteel"],
        "ULTRACEMCO": ["ultratech", "ultratech cement", "ultracemco"],
        "TECHM": ["tech mahindra", "techm"],
        "HDFCLIFE": ["hdfc life", "hdfclife"],
        "SBILIFE": ["sbi life", "sbilife"],
        "DIVISLAB": ["divis", "divi's lab", "divislab"],
        "DRREDDY": ["dr reddy", "dr. reddy", "drreddy"],
        "CIPLA": ["cipla"],
        "EICHERMOT": ["eicher", "royal enfield", "eichermot"],
        "HEROMOTOCO": ["hero motocorp", "hero moto", "heromotoco"],
        "BAJAJ-AUTO": ["bajaj auto"],
        "M&M": ["mahindra", "m&m", "mahindra and mahindra"],
        "NESTLEIND": ["nestle india", "nestleind"],
        "BRITANNIA": ["britannia"],
        "HINDALCO": ["hindalco"],
        "GRASIM": ["grasim"],
        "INDUSINDBK": ["indusind bank", "indusindbk"],
        "BAJAJFINSV": ["bajaj finserv", "bajajfinsv"],
        "APOLLOHOSP": ["apollo hospitals", "apollohosp"],
    }

    # Sentiment keywords
    POSITIVE_KEYWORDS = [
        "rally", "surge", "jump", "gain", "rise", "up", "high", "record",
        "profit", "growth", "bullish", "outperform", "upgrade", "buy",
        "positive", "strong", "beat", "exceed", "boom", "soar", "advance"
    ]
    NEGATIVE_KEYWORDS = [
        "fall", "drop", "decline", "loss", "down", "low", "crash", "plunge",
        "bearish", "underperform", "downgrade", "sell", "negative", "weak",
        "miss", "disappoint", "slump", "sink", "tumble", "slide", "retreat"
    ]

    # Category detection keywords
    CATEGORY_KEYWORDS = {
        "ipo": ["ipo", "initial public offering", "public issue", "listing",
                "grey market", "gmp", "allotment", "subscription", "anchor"],
        "economy": ["gdp", "inflation", "rbi", "repo rate", "monetary policy",
                    "fiscal", "budget", "trade deficit", "cpi", "iip", "gst collection",
                    "forex", "current account", "pmi", "manufacturing index",
                    "economic growth", "economy", "macro"],
        "stocks": ["buy", "sell", "target", "upgrade", "downgrade", "rating",
                   "results", "earnings", "quarterly", "dividend", "bonus",
                   "stock split", "buyback", "fy24", "fy25", "q1", "q2", "q3", "q4"],
    }

    # Major stocks for Yahoo Finance news
    YAHOO_NEWS_SYMBOLS = [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
        "HINDUNILVR.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "LT.NS"
    ]

    def __init__(self):
        self.feeds = config.INDIA_NEWS_FEEDS
        self.seen_ids: Set[str] = set()
        self._compiled_patterns = self._compile_patterns()

    def _compile_patterns(self) -> Dict[str, List[re.Pattern]]:
        """Compile regex patterns for stock matching."""
        compiled = {}
        for symbol, patterns in self.STOCK_PATTERNS.items():
            compiled[symbol] = [
                re.compile(p if p.startswith(r"\b") else rf"\b{re.escape(p)}\b", re.IGNORECASE)
                for p in patterns
            ]
        return compiled

    def _generate_id(self, title: str, url: str) -> str:
        """Generate unique ID for news item."""
        content = f"{title}:{url}"
        return hashlib.md5(content.encode()).hexdigest()[:12]

    def _extract_symbols(self, text: str) -> List[str]:
        """Extract mentioned stock symbols from text."""
        symbols = []
        text_lower = text.lower()

        for symbol, patterns in self._compiled_patterns.items():
            for pattern in patterns:
                if pattern.search(text_lower):
                    symbols.append(symbol)
                    break  # Only add symbol once

        return list(set(symbols))

    def _detect_sentiment(self, text: str) -> str:
        """Simple keyword-based sentiment detection."""
        text_lower = text.lower()

        positive_count = sum(1 for kw in self.POSITIVE_KEYWORDS if kw in text_lower)
        negative_count = sum(1 for kw in self.NEGATIVE_KEYWORDS if kw in text_lower)

        if positive_count > negative_count + 1:
            return "positive"
        elif negative_count > positive_count + 1:
            return "negative"
        return "neutral"

    def _detect_category(self, text: str) -> str:
        """Detect news category based on keywords."""
        text_lower = text.lower()

        # Check categories in priority order
        for category, keywords in self.CATEGORY_KEYWORDS.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return category

        # Default to markets
        return "markets"

    def _clean_html(self, text: str) -> str:
        """Remove HTML tags from text."""
        if not text:
            return ""
        soup = BeautifulSoup(text, "html.parser")
        return soup.get_text(separator=" ", strip=True)

    def _parse_date(self, date_str: str) -> datetime:
        """Parse date from RSS feed."""
        if not date_str:
            return datetime.now()

        try:
            # feedparser usually provides a struct_time
            import time
            if hasattr(date_str, "tm_year"):
                return datetime(*date_str[:6])
        except:
            pass

        # Try common formats
        formats = [
            "%a, %d %b %Y %H:%M:%S %z",
            "%a, %d %b %Y %H:%M:%S %Z",
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%d %H:%M:%S",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(str(date_str), fmt)
            except ValueError:
                continue

        return datetime.now()

    async def _fetch_feed(
        self,
        session: aiohttp.ClientSession,
        feed_config: Dict
    ) -> List[NewsItem]:
        """Fetch and parse a single RSS feed."""
        name = feed_config["name"]
        url = feed_config["url"]
        priority = feed_config.get("priority", 2)

        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status != 200:
                    logger.warning(f"Failed to fetch {name}: HTTP {resp.status}")
                    return []

                content = await resp.text()

        except asyncio.TimeoutError:
            logger.warning(f"Timeout fetching {name}")
            return []
        except Exception as e:
            logger.error(f"Error fetching {name}: {e}")
            return []

        # Parse feed
        try:
            feed = feedparser.parse(content)
        except Exception as e:
            logger.error(f"Error parsing {name}: {e}")
            return []

        items = []
        for entry in feed.entries[:20]:  # Limit to 20 most recent
            try:
                title = entry.get("title", "")
                summary = self._clean_html(entry.get("summary", entry.get("description", "")))
                link = entry.get("link", "")
                published = entry.get("published_parsed") or entry.get("updated_parsed")

                # Generate ID
                item_id = self._generate_id(title, link)

                # Skip duplicates
                if item_id in self.seen_ids:
                    continue
                self.seen_ids.add(item_id)

                # Extract symbols, sentiment, and category
                full_text = f"{title} {summary}"
                symbols = self._extract_symbols(full_text)
                sentiment = self._detect_sentiment(full_text)
                category = self._detect_category(full_text)

                news_item = NewsItem(
                    id=item_id,
                    title=title[:500],  # Limit length
                    summary=summary[:1000] if summary else "",
                    url=link,
                    source=name,
                    published_at=self._parse_date(published),
                    symbols=symbols,
                    sentiment=sentiment,
                    category=category,
                    priority=priority,
                )
                items.append(news_item)

            except Exception as e:
                logger.debug(f"Error parsing entry in {name}: {e}")
                continue

        logger.info(f"Fetched {len(items)} items from {name}")
        return items

    async def _fetch_yahoo_news(self) -> List[NewsItem]:
        """Fetch news from Yahoo Finance for major Indian stocks."""
        if not HAS_YFINANCE:
            logger.warning("yfinance not installed, skipping Yahoo Finance news")
            return []

        items = []

        def fetch_stock_news(symbol: str) -> List[Dict]:
            """Fetch news for a single stock (runs in thread)."""
            try:
                ticker = yf.Ticker(symbol)
                return ticker.news or []
            except Exception as e:
                logger.debug(f"Error fetching Yahoo news for {symbol}: {e}")
                return []

        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()

        for symbol in self.YAHOO_NEWS_SYMBOLS[:5]:  # Limit to top 5 to avoid rate limits
            try:
                news_list = await loop.run_in_executor(None, fetch_stock_news, symbol)

                for article in news_list[:3]:  # Max 3 per symbol
                    try:
                        title = article.get("title", "")
                        link = article.get("link", "")
                        publisher = article.get("publisher", "Yahoo Finance")
                        publish_time = article.get("providerPublishTime", 0)

                        # Generate ID
                        item_id = self._generate_id(title, link)
                        if item_id in self.seen_ids:
                            continue
                        self.seen_ids.add(item_id)

                        # Parse timestamp
                        if publish_time:
                            published_at = datetime.fromtimestamp(publish_time)
                        else:
                            published_at = datetime.now()

                        # Get symbol from ticker
                        stock_symbol = symbol.replace(".NS", "").replace(".BO", "")
                        symbols = [stock_symbol]

                        # Detect sentiment and category
                        sentiment = self._detect_sentiment(title)
                        category = self._detect_category(title)

                        news_item = NewsItem(
                            id=item_id,
                            title=title[:500],
                            summary="",  # Yahoo doesn't provide summary in free tier
                            url=link,
                            source=f"Yahoo Finance ({publisher})",
                            published_at=published_at,
                            symbols=symbols,
                            sentiment=sentiment,
                            category=category if category != "markets" else "stocks",
                            priority=1,  # High priority for Yahoo news
                        )
                        items.append(news_item)
                    except Exception as e:
                        logger.debug(f"Error parsing Yahoo article: {e}")
                        continue
            except Exception as e:
                logger.debug(f"Error processing Yahoo news for {symbol}: {e}")
                continue

        logger.info(f"Fetched {len(items)} items from Yahoo Finance")
        return items

    async def fetch_all(self, max_age_hours: int = 24, include_yahoo: bool = True) -> List[NewsItem]:
        """
        Fetch news from all configured feeds and Yahoo Finance.

        Args:
            max_age_hours: Only return news from last N hours
            include_yahoo: Whether to include Yahoo Finance news

        Returns:
            List of NewsItem, sorted by published_at (newest first)
        """
        async with aiohttp.ClientSession(
            headers={"User-Agent": "FinSight News Aggregator/1.0"}
        ) as session:
            # Fetch all feeds concurrently
            tasks = [self._fetch_feed(session, feed) for feed in self.feeds]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        # Also fetch Yahoo Finance news
        yahoo_items = []
        if include_yahoo:
            try:
                yahoo_items = await self._fetch_yahoo_news()
            except Exception as e:
                logger.error(f"Yahoo Finance news error: {e}")

        # Flatten and filter
        all_items = []
        cutoff = datetime.now() - timedelta(hours=max_age_hours)

        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Feed fetch error: {result}")
                continue
            for item in result:
                if item.published_at >= cutoff:
                    all_items.append(item)

        # Add Yahoo items (already filtered by recency)
        for item in yahoo_items:
            if item.published_at >= cutoff:
                all_items.append(item)

        # Sort by date (newest first), then by priority
        all_items.sort(key=lambda x: (x.published_at, -x.priority), reverse=True)

        return all_items

    async def fetch_for_symbol(self, symbol: str, max_age_hours: int = 24) -> List[NewsItem]:
        """
        Fetch news mentioning a specific symbol.

        Args:
            symbol: Stock symbol (without .NS suffix)
            max_age_hours: Only return news from last N hours

        Returns:
            List of NewsItem mentioning the symbol
        """
        all_news = await self.fetch_all(max_age_hours)
        symbol_clean = symbol.replace(".NS", "").replace(".BO", "")
        return [item for item in all_news if symbol_clean in item.symbols]

    def clear_cache(self):
        """Clear seen IDs cache."""
        self.seen_ids.clear()


# =============================================================================
# DATABASE INTEGRATION
# =============================================================================

async def save_news_to_db(db, news_items: List[NewsItem]):
    """
    Save news items to database.

    Requires a 'news' table with columns:
    id, source, title, url, summary, sentiment, symbols, published_at, created_at
    """
    if not news_items:
        return

    async with db.pool.acquire() as conn:
        for item in news_items:
            try:
                await conn.execute("""
                    INSERT INTO news (id, source, title, url, summary, sentiment, symbols, published_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (id) DO NOTHING
                """,
                    item.id,
                    item.source,
                    item.title,
                    item.url,
                    item.summary,
                    item.sentiment,
                    item.symbols,
                    item.published_at
                )
            except Exception as e:
                logger.debug(f"Error saving news item: {e}")


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def get_news_aggregator() -> IndiaNewsAggregator:
    """Get news aggregator instance."""
    return IndiaNewsAggregator()


async def fetch_latest_news(max_items: int = 50) -> List[Dict]:
    """
    Fetch latest news as list of dicts.

    Args:
        max_items: Maximum number of items to return

    Returns:
        List of news items as dictionaries
    """
    aggregator = IndiaNewsAggregator()
    items = await aggregator.fetch_all(max_age_hours=24)
    return [item.to_dict() for item in items[:max_items]]


async def fetch_news_for_watchlist(symbols: List[str]) -> Dict[str, List[Dict]]:
    """
    Fetch news for a list of symbols.

    Args:
        symbols: List of stock symbols

    Returns:
        Dict mapping symbol -> list of news items
    """
    aggregator = IndiaNewsAggregator()
    all_news = await aggregator.fetch_all(max_age_hours=24)

    result = {}
    for symbol in symbols:
        symbol_clean = symbol.replace(".NS", "").replace(".BO", "")
        matching = [item.to_dict() for item in all_news if symbol_clean in item.symbols]
        if matching:
            result[symbol_clean] = matching

    return result


# =============================================================================
# CLI TEST
# =============================================================================

if __name__ == "__main__":
    async def test():
        print("Testing Indian News Aggregator...")
        print("=" * 60)

        aggregator = IndiaNewsAggregator()

        print("\n1. Fetching all news...")
        news = await aggregator.fetch_all(max_age_hours=24)
        print(f"   Found {len(news)} news items")

        if news:
            print("\n2. Latest 5 news items:")
            for item in news[:5]:
                symbols_str = ", ".join(item.symbols) if item.symbols else "None"
                print(f"\n   [{item.source}] {item.title[:80]}...")
                print(f"   Symbols: {symbols_str} | Sentiment: {item.sentiment}")
                print(f"   URL: {item.url}")

            print("\n3. News by symbol count:")
            symbol_counts = {}
            for item in news:
                for symbol in item.symbols:
                    symbol_counts[symbol] = symbol_counts.get(symbol, 0) + 1

            for symbol, count in sorted(symbol_counts.items(), key=lambda x: -x[1])[:10]:
                print(f"   {symbol}: {count} mentions")

            print("\n4. Sentiment distribution:")
            sentiments = {"positive": 0, "negative": 0, "neutral": 0}
            for item in news:
                if item.sentiment:
                    sentiments[item.sentiment] += 1
            for sentiment, count in sentiments.items():
                print(f"   {sentiment}: {count} ({count/len(news)*100:.1f}%)")

        print("\n" + "=" * 60)
        print("Test complete!")

    asyncio.run(test())

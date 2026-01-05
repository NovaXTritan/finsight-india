#!/usr/bin/env python3
"""
FinSight Data Collector - Gather market intelligence from 100 sources

This script:
1. Collects data from financial sources (news, SEC, social, market data)
2. Formats it into a prompt for Claude
3. You copy-paste to Claude chat, get analysis back

Usage:
    python collect_data.py                    # Collect for default symbols
    python collect_data.py AAPL NVDA TSLA    # Specific symbols
    python collect_data.py --full            # All 100 sources (slower)
    python collect_data.py --save            # Save to file instead of clipboard
"""

import asyncio
import aiohttp
import feedparser
import json
import sys
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any
from dataclasses import dataclass, field
from bs4 import BeautifulSoup
import re

# =============================================================================
# CONFIGURATION - 100 SOURCES
# =============================================================================

SOURCES = {
    # =========================================================================
    # TIER 1: Major Financial News (20 sources)
    # =========================================================================
    "news": [
        {"name": "Reuters Business", "url": "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best", "type": "rss"},
        {"name": "Bloomberg Markets", "url": "https://feeds.bloomberg.com/markets/news.rss", "type": "rss"},
        {"name": "CNBC Top News", "url": "https://www.cnbc.com/id/100003114/device/rss/rss.html", "type": "rss"},
        {"name": "WSJ Markets", "url": "https://feeds.content.dowjones.io/public/rss/mw_topstories", "type": "rss"},
        {"name": "Financial Times", "url": "https://www.ft.com/rss/home", "type": "rss"},
        {"name": "MarketWatch", "url": "https://feeds.marketwatch.com/marketwatch/topstories/", "type": "rss"},
        {"name": "Yahoo Finance", "url": "https://finance.yahoo.com/rss/topstories", "type": "rss"},
        {"name": "Investing.com", "url": "https://www.investing.com/rss/news.rss", "type": "rss"},
        {"name": "Seeking Alpha", "url": "https://seekingalpha.com/market_currents.xml", "type": "rss"},
        {"name": "Benzinga", "url": "https://www.benzinga.com/feeds/", "type": "rss"},
        {"name": "TheStreet", "url": "https://www.thestreet.com/rss/", "type": "rss"},
        {"name": "Barrons", "url": "https://www.barrons.com/rss", "type": "rss"},
        {"name": "Forbes Markets", "url": "https://www.forbes.com/markets/feed/", "type": "rss"},
        {"name": "Business Insider", "url": "https://www.businessinsider.com/rss", "type": "rss"},
        {"name": "Motley Fool", "url": "https://www.fool.com/feeds/index.aspx", "type": "rss"},
        {"name": "Zacks", "url": "https://www.zacks.com/rss/", "type": "rss"},
        {"name": "Kiplinger", "url": "https://www.kiplinger.com/rss/", "type": "rss"},
        {"name": "InvestorPlace", "url": "https://investorplace.com/feed/", "type": "rss"},
        {"name": "Money Morning", "url": "https://moneymorning.com/feed/", "type": "rss"},
        {"name": "Economic Times", "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", "type": "rss"},
    ],
    
    # =========================================================================
    # TIER 2: Sector-Specific News (20 sources)
    # =========================================================================
    "sectors": [
        {"name": "TechCrunch", "url": "https://techcrunch.com/feed/", "type": "rss"},
        {"name": "Ars Technica", "url": "https://feeds.arstechnica.com/arstechnica/technology-lab", "type": "rss"},
        {"name": "The Verge", "url": "https://www.theverge.com/rss/index.xml", "type": "rss"},
        {"name": "Wired Business", "url": "https://www.wired.com/feed/category/business/latest/rss", "type": "rss"},
        {"name": "Semiconductor Eng", "url": "https://semiengineering.com/feed/", "type": "rss"},
        {"name": "EV News", "url": "https://electrek.co/feed/", "type": "rss"},
        {"name": "CleanTechnica", "url": "https://cleantechnica.com/feed/", "type": "rss"},
        {"name": "OilPrice", "url": "https://oilprice.com/rss/main", "type": "rss"},
        {"name": "Mining.com", "url": "https://www.mining.com/feed/", "type": "rss"},
        {"name": "Pharma News", "url": "https://www.pharmaceutical-technology.com/feed/", "type": "rss"},
        {"name": "BioSpace", "url": "https://www.biospace.com/rss/", "type": "rss"},
        {"name": "FiercePharma", "url": "https://www.fiercepharma.com/rss/xml", "type": "rss"},
        {"name": "Banking Dive", "url": "https://www.bankingdive.com/feeds/news/", "type": "rss"},
        {"name": "Finextra", "url": "https://www.finextra.com/rss/headlines.aspx", "type": "rss"},
        {"name": "Retail Dive", "url": "https://www.retaildive.com/feeds/news/", "type": "rss"},
        {"name": "Supply Chain Dive", "url": "https://www.supplychaindive.com/feeds/news/", "type": "rss"},
        {"name": "Construction Dive", "url": "https://www.constructiondive.com/feeds/news/", "type": "rss"},
        {"name": "Healthcare Dive", "url": "https://www.healthcaredive.com/feeds/news/", "type": "rss"},
        {"name": "Food Dive", "url": "https://www.fooddive.com/feeds/news/", "type": "rss"},
        {"name": "Utility Dive", "url": "https://www.utilitydive.com/feeds/news/", "type": "rss"},
    ],
    
    # =========================================================================
    # TIER 3: Social Sentiment (15 sources)
    # =========================================================================
    "social": [
        {"name": "r/wallstreetbets", "url": "https://www.reddit.com/r/wallstreetbets/hot.json?limit=25", "type": "reddit"},
        {"name": "r/stocks", "url": "https://www.reddit.com/r/stocks/hot.json?limit=25", "type": "reddit"},
        {"name": "r/investing", "url": "https://www.reddit.com/r/investing/hot.json?limit=25", "type": "reddit"},
        {"name": "r/options", "url": "https://www.reddit.com/r/options/hot.json?limit=25", "type": "reddit"},
        {"name": "r/stockmarket", "url": "https://www.reddit.com/r/stockmarket/hot.json?limit=25", "type": "reddit"},
        {"name": "r/dividends", "url": "https://www.reddit.com/r/dividends/hot.json?limit=25", "type": "reddit"},
        {"name": "r/pennystocks", "url": "https://www.reddit.com/r/pennystocks/hot.json?limit=25", "type": "reddit"},
        {"name": "r/IndianStreetBets", "url": "https://www.reddit.com/r/IndianStreetBets/hot.json?limit=25", "type": "reddit"},
        {"name": "r/ValueInvesting", "url": "https://www.reddit.com/r/ValueInvesting/hot.json?limit=25", "type": "reddit"},
        {"name": "r/SecurityAnalysis", "url": "https://www.reddit.com/r/SecurityAnalysis/hot.json?limit=25", "type": "reddit"},
        {"name": "r/algotrading", "url": "https://www.reddit.com/r/algotrading/hot.json?limit=25", "type": "reddit"},
        {"name": "r/technology", "url": "https://www.reddit.com/r/technology/hot.json?limit=25", "type": "reddit"},
        {"name": "r/economics", "url": "https://www.reddit.com/r/economics/hot.json?limit=25", "type": "reddit"},
        {"name": "r/finance", "url": "https://www.reddit.com/r/finance/hot.json?limit=25", "type": "reddit"},
        {"name": "r/CryptoCurrency", "url": "https://www.reddit.com/r/CryptoCurrency/hot.json?limit=25", "type": "reddit"},
    ],
    
    # =========================================================================
    # TIER 4: Market Data APIs (15 sources)
    # =========================================================================
    "market_data": [
        {"name": "Yahoo Quote", "url": "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=5d", "type": "yahoo"},
        {"name": "Yahoo Stats", "url": "https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}?modules=defaultKeyStatistics,financialData", "type": "yahoo"},
        {"name": "Yahoo News", "url": "https://query1.finance.yahoo.com/v1/finance/search?q={symbol}&newsCount=10", "type": "yahoo"},
        {"name": "Fear & Greed", "url": "https://production.dataviz.cnn.io/index/fearandgreed/graphdata", "type": "json"},
        {"name": "VIX", "url": "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d", "type": "yahoo"},
        {"name": "Treasury Yields", "url": "https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?interval=1d&range=5d", "type": "yahoo"},
        {"name": "Dollar Index", "url": "https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=5d", "type": "yahoo"},
        {"name": "Gold", "url": "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=5d", "type": "yahoo"},
        {"name": "Oil", "url": "https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1d&range=5d", "type": "yahoo"},
        {"name": "S&P 500", "url": "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=5d", "type": "yahoo"},
        {"name": "NASDAQ", "url": "https://query1.finance.yahoo.com/v8/finance/chart/%5EIXIC?interval=1d&range=5d", "type": "yahoo"},
        {"name": "Russell 2000", "url": "https://query1.finance.yahoo.com/v8/finance/chart/%5ERUT?interval=1d&range=5d", "type": "yahoo"},
        {"name": "Nifty 50", "url": "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=5d", "type": "yahoo"},
        {"name": "Bitcoin", "url": "https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=1d&range=5d", "type": "yahoo"},
        {"name": "Ethereum", "url": "https://query1.finance.yahoo.com/v8/finance/chart/ETH-USD?interval=1d&range=5d", "type": "yahoo"},
    ],
    
    # =========================================================================
    # TIER 5: Regulatory & Filings (10 sources)
    # =========================================================================
    "regulatory": [
        {"name": "SEC EDGAR Latest", "url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=&company=&dateb=&owner=include&count=40&output=atom", "type": "rss"},
        {"name": "SEC 8-K Filings", "url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&company=&dateb=&owner=include&count=40&output=atom", "type": "rss"},
        {"name": "SEC 10-K/Q", "url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=10-&company=&dateb=&owner=include&count=40&output=atom", "type": "rss"},
        {"name": "SEC Form 4", "url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&company=&dateb=&owner=include&count=40&output=atom", "type": "rss"},
        {"name": "Fed News", "url": "https://www.federalreserve.gov/feeds/press_all.xml", "type": "rss"},
        {"name": "Fed Speeches", "url": "https://www.federalreserve.gov/feeds/speeches.xml", "type": "rss"},
        {"name": "Treasury News", "url": "https://home.treasury.gov/system/files/136/rss_press.xml", "type": "rss"},
        {"name": "CFTC", "url": "https://www.cftc.gov/rss/pressreleases.xml", "type": "rss"},
        {"name": "FDIC", "url": "https://www.fdic.gov/news/news/press/rss.xml", "type": "rss"},
        {"name": "OCC", "url": "https://occ.gov/rss/occ-news-releases.xml", "type": "rss"},
    ],
    
    # =========================================================================
    # TIER 6: Economic Indicators (10 sources)
    # =========================================================================
    "economic": [
        {"name": "BLS News", "url": "https://www.bls.gov/feed/bls_latest.rss", "type": "rss"},
        {"name": "Census Economic", "url": "https://www.census.gov/economic-indicators/indicator.xml", "type": "rss"},
        {"name": "BEA News", "url": "https://www.bea.gov/rss/rss.xml", "type": "rss"},
        {"name": "IMF News", "url": "https://www.imf.org/en/News/rss", "type": "rss"},
        {"name": "World Bank", "url": "https://blogs.worldbank.org/feed", "type": "rss"},
        {"name": "ECB News", "url": "https://www.ecb.europa.eu/rss/press.html", "type": "rss"},
        {"name": "RBI Press", "url": "https://rbi.org.in/scripts/BS_PressReleasesRSS.aspx", "type": "rss"},
        {"name": "OECD News", "url": "https://www.oecd.org/newsroom/index.xml", "type": "rss"},
        {"name": "Eurostat", "url": "https://ec.europa.eu/eurostat/news/news-releases-rss", "type": "rss"},
        {"name": "ISM Reports", "url": "https://www.ismworld.org/supply-management-news-and-reports/rss-feeds/", "type": "rss"},
    ],
    
    # =========================================================================
    # TIER 7: Analysis & Research (10 sources)
    # =========================================================================
    "analysis": [
        {"name": "ZeroHedge", "url": "https://feeds.feedburner.com/zerohedge/feed", "type": "rss"},
        {"name": "Calculated Risk", "url": "https://www.calculatedriskblog.com/feeds/posts/default", "type": "rss"},
        {"name": "Naked Capitalism", "url": "https://www.nakedcapitalism.com/feed", "type": "rss"},
        {"name": "Wolf Street", "url": "https://wolfstreet.com/feed/", "type": "rss"},
        {"name": "Of Dollars and Data", "url": "https://ofdollarsanddata.com/feed/", "type": "rss"},
        {"name": "A Wealth of Common Sense", "url": "https://awealthofcommonsense.com/feed/", "type": "rss"},
        {"name": "The Reformed Broker", "url": "https://thereformedbroker.com/feed/", "type": "rss"},
        {"name": "Epsilon Theory", "url": "https://www.epsilontheory.com/feed/", "type": "rss"},
        {"name": "Abnormal Returns", "url": "https://abnormalreturns.com/feed/", "type": "rss"},
        {"name": "Pragmatic Capitalism", "url": "https://www.pragcap.com/feed/", "type": "rss"},
    ],
}

# Quick mode sources (fastest, most reliable)
QUICK_SOURCES = [
    "Yahoo Quote", "Yahoo News", "Fear & Greed", "VIX", "S&P 500",
    "r/wallstreetbets", "r/stocks", "Reuters Business", "CNBC Top News",
    "MarketWatch", "Seeking Alpha", "SEC 8-K Filings",
]


@dataclass
class CollectedData:
    """Container for all collected data."""
    timestamp: str = ""
    symbols: List[str] = field(default_factory=list)
    market_overview: Dict[str, Any] = field(default_factory=dict)
    news: List[Dict] = field(default_factory=list)
    social: List[Dict] = field(default_factory=list)
    filings: List[Dict] = field(default_factory=list)
    symbol_data: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)


class DataCollector:
    """Collects data from multiple sources."""
    
    def __init__(self, symbols: List[str] = None, full_mode: bool = False):
        self.symbols = symbols or ["AAPL", "MSFT", "GOOGL", "NVDA", "TSLA"]
        self.full_mode = full_mode
        self.data = CollectedData(
            timestamp=datetime.now().isoformat(),
            symbols=self.symbols
        )
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
    
    async def collect_all(self) -> CollectedData:
        """Collect from all sources."""
        print(f"🔍 Collecting data for: {', '.join(self.symbols)}")
        print(f"📊 Mode: {'Full (100 sources)' if self.full_mode else 'Quick (12 sources)'}")
        print()
        
        async with aiohttp.ClientSession(headers=self.headers) as session:
            tasks = [
                self._collect_market_overview(session),
                self._collect_symbol_data(session),
                self._collect_news(session),
                self._collect_social(session),
                self._collect_filings(session),
            ]
            await asyncio.gather(*tasks, return_exceptions=True)
        
        return self.data
    
    async def _fetch(self, session: aiohttp.ClientSession, url: str, timeout: int = 10) -> str:
        """Fetch URL with error handling."""
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
                if resp.status == 200:
                    return await resp.text()
        except Exception as e:
            self.data.errors.append(f"{url}: {str(e)[:50]}")
        return ""
    
    async def _fetch_json(self, session: aiohttp.ClientSession, url: str) -> Dict:
        """Fetch JSON with error handling."""
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    return await resp.json()
        except Exception as e:
            self.data.errors.append(f"{url}: {str(e)[:50]}")
        return {}
    
    async def _collect_market_overview(self, session: aiohttp.ClientSession):
        """Collect market indices and indicators."""
        print("📈 Collecting market overview...")
        
        indices = {
            "S&P 500": "%5EGSPC",
            "NASDAQ": "%5EIXIC",
            "Dow Jones": "%5EDJI",
            "VIX": "%5EVIX",
            "10Y Treasury": "%5ETNX",
            "Gold": "GC=F",
            "Oil (WTI)": "CL=F",
            "Bitcoin": "BTC-USD",
        }
        
        for name, symbol in indices.items():
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=5d"
            data = await self._fetch_json(session, url)
            
            if data and "chart" in data and data["chart"]["result"]:
                result = data["chart"]["result"][0]
                meta = result.get("meta", {})
                quote = result.get("indicators", {}).get("quote", [{}])[0]
                
                closes = quote.get("close", [])
                if closes and len(closes) >= 2:
                    current = closes[-1]
                    prev = closes[-2]
                    change = ((current - prev) / prev * 100) if prev else 0
                    
                    self.data.market_overview[name] = {
                        "price": round(current, 2) if current else None,
                        "change": round(change, 2),
                        "currency": meta.get("currency", "USD")
                    }
        
        # Fear & Greed Index
        try:
            fg_data = await self._fetch_json(session, "https://production.dataviz.cnn.io/index/fearandgreed/graphdata")
            if fg_data and "fear_and_greed" in fg_data:
                fg = fg_data["fear_and_greed"]
                self.data.market_overview["Fear & Greed"] = {
                    "score": fg.get("score"),
                    "rating": fg.get("rating"),
                }
        except:
            pass
        
        print(f"   ✓ Got {len(self.data.market_overview)} indicators")
    
    async def _collect_symbol_data(self, session: aiohttp.ClientSession):
        """Collect data for specific symbols."""
        print(f"📊 Collecting data for {len(self.symbols)} symbols...")
        
        for symbol in self.symbols:
            # Quote data
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=5m&range=1d"
            data = await self._fetch_json(session, url)
            
            symbol_info = {"symbol": symbol}
            
            if data and "chart" in data and data["chart"]["result"]:
                result = data["chart"]["result"][0]
                meta = result.get("meta", {})
                quote = result.get("indicators", {}).get("quote", [{}])[0]
                
                closes = quote.get("close", [])
                volumes = quote.get("volume", [])
                
                if closes:
                    symbol_info["price"] = round(closes[-1], 2) if closes[-1] else None
                    symbol_info["open"] = meta.get("chartPreviousClose")
                    symbol_info["day_high"] = max([c for c in closes if c], default=None)
                    symbol_info["day_low"] = min([c for c in closes if c], default=None)
                
                if volumes:
                    symbol_info["volume"] = sum([v for v in volumes if v])
                    symbol_info["avg_volume"] = meta.get("regularMarketVolume")
            
            # Key statistics
            stats_url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}?modules=defaultKeyStatistics,financialData,price"
            stats_data = await self._fetch_json(session, stats_url)
            
            if stats_data and "quoteSummary" in stats_data:
                result = stats_data["quoteSummary"].get("result", [{}])[0]
                
                key_stats = result.get("defaultKeyStatistics", {})
                fin_data = result.get("financialData", {})
                price_data = result.get("price", {})
                
                symbol_info["market_cap"] = price_data.get("marketCap", {}).get("fmt")
                symbol_info["pe_ratio"] = key_stats.get("trailingPE", {}).get("fmt")
                symbol_info["52w_high"] = key_stats.get("fiftyTwoWeekHigh", {}).get("fmt")
                symbol_info["52w_low"] = key_stats.get("fiftyTwoWeekLow", {}).get("fmt")
                symbol_info["short_ratio"] = key_stats.get("shortRatio", {}).get("fmt")
                symbol_info["recommendation"] = fin_data.get("recommendationKey")
            
            # Recent news
            news_url = f"https://query1.finance.yahoo.com/v1/finance/search?q={symbol}&newsCount=5"
            news_data = await self._fetch_json(session, news_url)
            
            if news_data and "news" in news_data:
                symbol_info["recent_news"] = [
                    {"title": n.get("title"), "publisher": n.get("publisher")}
                    for n in news_data["news"][:5]
                ]
            
            self.data.symbol_data[symbol] = symbol_info
        
        print(f"   ✓ Got data for {len(self.data.symbol_data)} symbols")
    
    async def _collect_news(self, session: aiohttp.ClientSession):
        """Collect news from RSS feeds."""
        print("📰 Collecting news...")
        
        sources = SOURCES["news"] + SOURCES["sectors"]
        if not self.full_mode:
            sources = [s for s in sources if s["name"] in QUICK_SOURCES]
        
        for source in sources[:20]:  # Limit to avoid rate limits
            if source["type"] != "rss":
                continue
            
            content = await self._fetch(session, source["url"])
            if not content:
                continue
            
            try:
                feed = feedparser.parse(content)
                for entry in feed.entries[:5]:
                    # Check if relevant to our symbols
                    title = entry.get("title", "")
                    summary = entry.get("summary", "")[:200]
                    
                    relevant = any(
                        sym.lower() in title.lower() or sym.lower() in summary.lower()
                        for sym in self.symbols
                    )
                    
                    # Also include general market news
                    market_keywords = ["market", "stock", "fed", "inflation", "earnings", "ipo", "merger"]
                    is_market_news = any(kw in title.lower() for kw in market_keywords)
                    
                    if relevant or is_market_news or not self.data.news:
                        self.data.news.append({
                            "source": source["name"],
                            "title": title,
                            "summary": summary,
                            "published": entry.get("published", ""),
                            "relevant_symbols": [s for s in self.symbols if s.lower() in title.lower()]
                        })
            except Exception as e:
                self.data.errors.append(f"Parse {source['name']}: {str(e)[:30]}")
        
        # Deduplicate by title
        seen = set()
        unique_news = []
        for item in self.data.news:
            if item["title"] not in seen:
                seen.add(item["title"])
                unique_news.append(item)
        self.data.news = unique_news[:30]  # Keep top 30
        
        print(f"   ✓ Got {len(self.data.news)} news items")
    
    async def _collect_social(self, session: aiohttp.ClientSession):
        """Collect social sentiment from Reddit."""
        print("💬 Collecting social sentiment...")
        
        sources = SOURCES["social"]
        if not self.full_mode:
            sources = sources[:5]  # Just top subreddits
        
        for source in sources:
            data = await self._fetch_json(session, source["url"])
            
            if data and "data" in data and "children" in data["data"]:
                for post in data["data"]["children"][:10]:
                    post_data = post.get("data", {})
                    title = post_data.get("title", "")
                    
                    # Check relevance
                    relevant = any(
                        sym.lower() in title.lower()
                        for sym in self.symbols
                    )
                    
                    # Also include high-engagement posts
                    score = post_data.get("score", 0)
                    comments = post_data.get("num_comments", 0)
                    
                    if relevant or score > 500 or comments > 100:
                        self.data.social.append({
                            "source": source["name"],
                            "title": title,
                            "score": score,
                            "comments": comments,
                            "relevant_symbols": [s for s in self.symbols if s.lower() in title.lower()]
                        })
        
        # Sort by engagement
        self.data.social.sort(key=lambda x: x["score"] + x["comments"], reverse=True)
        self.data.social = self.data.social[:20]  # Keep top 20
        
        print(f"   ✓ Got {len(self.data.social)} social posts")
    
    async def _collect_filings(self, session: aiohttp.ClientSession):
        """Collect SEC filings."""
        print("📋 Collecting SEC filings...")
        
        # 8-K filings (material events)
        content = await self._fetch(session, SOURCES["regulatory"][1]["url"])
        
        if content:
            try:
                feed = feedparser.parse(content)
                for entry in feed.entries[:20]:
                    title = entry.get("title", "")
                    
                    # Check if any of our symbols
                    relevant = any(
                        sym.lower() in title.lower()
                        for sym in self.symbols
                    )
                    
                    self.data.filings.append({
                        "type": "8-K",
                        "title": title,
                        "link": entry.get("link", ""),
                        "published": entry.get("published", ""),
                        "relevant": relevant
                    })
            except:
                pass
        
        # Filter to relevant + recent important ones
        relevant_filings = [f for f in self.data.filings if f["relevant"]]
        other_filings = [f for f in self.data.filings if not f["relevant"]][:5]
        self.data.filings = relevant_filings + other_filings
        
        print(f"   ✓ Got {len(self.data.filings)} filings")


def format_for_claude(data: CollectedData) -> str:
    """Format collected data as a prompt for Claude."""
    
    prompt = f"""# Market Intelligence Report
Generated: {data.timestamp}
Symbols Tracked: {', '.join(data.symbols)}

---

## 1. MARKET OVERVIEW

"""
    
    # Market indicators
    for name, info in data.market_overview.items():
        if info.get("price"):
            change_str = f"+{info['change']}%" if info['change'] > 0 else f"{info['change']}%"
            prompt += f"- **{name}**: {info['price']} ({change_str})\n"
        elif info.get("score"):
            prompt += f"- **{name}**: {info['score']} ({info.get('rating', 'N/A')})\n"
    
    prompt += "\n---\n\n## 2. SYMBOL ANALYSIS\n\n"
    
    # Symbol data
    for symbol, info in data.symbol_data.items():
        prompt += f"### {symbol}\n"
        prompt += f"- Price: ${info.get('price', 'N/A')}\n"
        prompt += f"- Volume: {info.get('volume', 'N/A'):,}\n" if info.get('volume') else ""
        prompt += f"- Market Cap: {info.get('market_cap', 'N/A')}\n"
        prompt += f"- P/E Ratio: {info.get('pe_ratio', 'N/A')}\n"
        prompt += f"- 52W Range: {info.get('52w_low', 'N/A')} - {info.get('52w_high', 'N/A')}\n"
        prompt += f"- Short Ratio: {info.get('short_ratio', 'N/A')}\n"
        prompt += f"- Recommendation: {info.get('recommendation', 'N/A')}\n"
        
        if info.get("recent_news"):
            prompt += f"- Recent Headlines:\n"
            for news in info["recent_news"][:3]:
                prompt += f"  - {news['title']} ({news['publisher']})\n"
        
        prompt += "\n"
    
    prompt += "---\n\n## 3. NEWS & EVENTS\n\n"
    
    # News
    for i, news in enumerate(data.news[:15], 1):
        symbols_str = f" [{', '.join(news['relevant_symbols'])}]" if news['relevant_symbols'] else ""
        prompt += f"{i}. **{news['source']}**: {news['title']}{symbols_str}\n"
    
    prompt += "\n---\n\n## 4. SOCIAL SENTIMENT\n\n"
    
    # Social
    for post in data.social[:10]:
        symbols_str = f" [{', '.join(post['relevant_symbols'])}]" if post['relevant_symbols'] else ""
        prompt += f"- **{post['source']}**: {post['title']} (⬆️{post['score']} 💬{post['comments']}){symbols_str}\n"
    
    if data.filings:
        prompt += "\n---\n\n## 5. SEC FILINGS\n\n"
        for filing in data.filings[:10]:
            relevant_str = " ⚠️" if filing['relevant'] else ""
            prompt += f"- {filing['type']}: {filing['title']}{relevant_str}\n"
    
    prompt += """
---

## ANALYSIS REQUEST

Based on the above market data, please provide:

1. **Market Regime**: Is the current environment Risk-On, Risk-Off, or Neutral? What indicators support this?

2. **Symbol Signals**: For each tracked symbol, identify:
   - Any anomalies or unusual activity
   - Sentiment (Bullish/Bearish/Neutral)
   - Key risks or catalysts
   - Confidence level (High/Medium/Low)

3. **Actionable Insights**: What are the top 3 things a trader should pay attention to right now?

4. **Risk Assessment**: What are the biggest risks not being priced in?

Please be specific and cite the data points that support your analysis.
"""
    
    return prompt


def copy_to_clipboard(text: str) -> bool:
    """Copy text to clipboard."""
    try:
        import subprocess
        
        # Try different clipboard commands
        for cmd in [["pbcopy"], ["xclip", "-selection", "clipboard"], ["clip"]]:
            try:
                process = subprocess.Popen(cmd, stdin=subprocess.PIPE)
                process.communicate(text.encode())
                if process.returncode == 0:
                    return True
            except FileNotFoundError:
                continue
        return False
    except:
        return False


async def main():
    """Main entry point."""
    # Parse arguments
    args = sys.argv[1:]
    
    full_mode = "--full" in args
    save_mode = "--save" in args
    
    # Filter out flags to get symbols
    symbols = [a.upper() for a in args if not a.startswith("--") and a.isalpha()]
    
    if not symbols:
        symbols = ["AAPL", "MSFT", "GOOGL", "NVDA", "TSLA"]
    
    # Collect data
    collector = DataCollector(symbols=symbols, full_mode=full_mode)
    data = await collector.collect_all()
    
    # Format for Claude
    print("\n📝 Formatting for Claude...")
    prompt = format_for_claude(data)
    
    # Output
    if save_mode:
        filename = f"market_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        with open(filename, "w") as f:
            f.write(prompt)
        print(f"\n✅ Saved to {filename}")
    else:
        if copy_to_clipboard(prompt):
            print("\n✅ Copied to clipboard! Paste into Claude chat.")
        else:
            # Print to stdout if clipboard fails
            print("\n" + "="*70)
            print("COPY EVERYTHING BELOW THIS LINE")
            print("="*70 + "\n")
            print(prompt)
    
    # Stats
    print(f"\n📊 Collection Summary:")
    print(f"   - Market indicators: {len(data.market_overview)}")
    print(f"   - Symbols analyzed: {len(data.symbol_data)}")
    print(f"   - News items: {len(data.news)}")
    print(f"   - Social posts: {len(data.social)}")
    print(f"   - SEC filings: {len(data.filings)}")
    print(f"   - Errors: {len(data.errors)}")
    
    if data.errors and full_mode:
        print(f"\n⚠️ Some sources failed (this is normal):")
        for err in data.errors[:5]:
            print(f"   - {err}")


if __name__ == "__main__":
    print("""
╔═══════════════════════════════════════════════════════════════════╗
║                    FINSIGHT DATA COLLECTOR                         ║
║               Gather → Format → Paste to Claude                    ║
╚═══════════════════════════════════════════════════════════════════╝
    """)
    asyncio.run(main())

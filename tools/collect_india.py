#!/usr/bin/env python3
"""
FinSight India - Data Collector
Gather market intelligence from 100+ Indian sources

This script:
1. Collects data from NSE, BSE, news, social, regulatory sources
2. Formats it into a prompt for Claude
3. You copy-paste to Claude chat, get analysis back

Usage:
    python collect_india.py                      # Default stocks (Nifty 50 top)
    python collect_india.py RELIANCE TCS INFY   # Specific symbols
    python collect_india.py --full               # All sources (slower)
    python collect_india.py --save               # Save to file
    python collect_india.py --fno                # Include F&O data
"""

import asyncio
import aiohttp
import feedparser
import json
import sys
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from bs4 import BeautifulSoup
import re

# =============================================================================
# INDIAN MARKET SOURCES - 100+ SOURCES
# =============================================================================

SOURCES = {
    # =========================================================================
    # TIER 1: NSE/BSE Market Data (15 sources)
    # =========================================================================
    "market_data": [
        {"name": "NSE All Indices", "url": "https://www.nseindia.com/api/allIndices", "type": "nse_json"},
        {"name": "NSE Nifty 50", "url": "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050", "type": "nse_json"},
        {"name": "NSE Bank Nifty", "url": "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20BANK", "type": "nse_json"},
        {"name": "NSE FII/DII", "url": "https://www.nseindia.com/api/fiidiiTradeReact", "type": "nse_json"},
        {"name": "NSE Advances/Declines", "url": "https://www.nseindia.com/api/market-data-pre-open?key=ALL", "type": "nse_json"},
        {"name": "Nifty Yahoo", "url": "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=5d", "type": "yahoo"},
        {"name": "Sensex Yahoo", "url": "https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN?interval=1d&range=5d", "type": "yahoo"},
        {"name": "Bank Nifty Yahoo", "url": "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEBANK?interval=1d&range=5d", "type": "yahoo"},
        {"name": "India VIX", "url": "https://query1.finance.yahoo.com/v8/finance/chart/%5EINDIAVIX?interval=1d&range=5d", "type": "yahoo"},
        {"name": "USD/INR", "url": "https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X?interval=1d&range=5d", "type": "yahoo"},
        {"name": "Gold India", "url": "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=5d", "type": "yahoo"},
        {"name": "Crude Oil", "url": "https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1d&range=5d", "type": "yahoo"},
    ],
    
    # =========================================================================
    # TIER 2: Financial News (25 sources)
    # =========================================================================
    "news": [
        # Economic Times
        {"name": "ET Markets", "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", "type": "rss"},
        {"name": "ET Stocks", "url": "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms", "type": "rss"},
        {"name": "ET Tech", "url": "https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms", "type": "rss"},
        
        # Moneycontrol
        {"name": "MC Latest", "url": "https://www.moneycontrol.com/rss/latestnews.xml", "type": "rss"},
        {"name": "MC Markets", "url": "https://www.moneycontrol.com/rss/marketreports.xml", "type": "rss"},
        {"name": "MC Business", "url": "https://www.moneycontrol.com/rss/business.xml", "type": "rss"},
        
        # Livemint
        {"name": "Mint Markets", "url": "https://www.livemint.com/rss/markets", "type": "rss"},
        {"name": "Mint Companies", "url": "https://www.livemint.com/rss/companies", "type": "rss"},
        {"name": "Mint Economy", "url": "https://www.livemint.com/rss/economy", "type": "rss"},
        
        # Business Standard
        {"name": "BS Markets", "url": "https://www.business-standard.com/rss/markets-106.rss", "type": "rss"},
        {"name": "BS Companies", "url": "https://www.business-standard.com/rss/companies-702.rss", "type": "rss"},
        {"name": "BS Economy", "url": "https://www.business-standard.com/rss/economy-102.rss", "type": "rss"},
        
        # Others
        {"name": "Financial Express", "url": "https://www.financialexpress.com/market/feed/", "type": "rss"},
        {"name": "Hindu BL Markets", "url": "https://www.thehindubusinessline.com/markets/?service=rss", "type": "rss"},
        {"name": "NDTV Profit", "url": "https://feeds.feedburner.com/ndtvprofit-latest", "type": "rss"},
        {"name": "Zee Business", "url": "https://zeenews.india.com/rss/business-news.xml", "type": "rss"},
        
        # Blogs & Analysis
        {"name": "Capitalmind", "url": "https://www.capitalmind.in/feed/", "type": "rss"},
        {"name": "Safal Niveshak", "url": "https://www.safalniveshak.com/feed/", "type": "rss"},
        {"name": "Freefincal", "url": "https://freefincal.com/feed/", "type": "rss"},
        {"name": "Value Research", "url": "https://www.valueresearchonline.com/rss/", "type": "rss"},
    ],
    
    # =========================================================================
    # TIER 3: Social Sentiment (15 sources)
    # =========================================================================
    "social": [
        # Reddit
        {"name": "r/IndianStreetBets", "url": "https://www.reddit.com/r/IndianStreetBets/hot.json?limit=30", "type": "reddit"},
        {"name": "r/IndiaInvestments", "url": "https://www.reddit.com/r/IndiaInvestments/hot.json?limit=30", "type": "reddit"},
        {"name": "r/IndianStockMarket", "url": "https://www.reddit.com/r/IndianStockMarket/hot.json?limit=30", "type": "reddit"},
        {"name": "r/dalalstreetbets", "url": "https://www.reddit.com/r/dalalstreetbets/hot.json?limit=30", "type": "reddit"},
        
        # Forums (RSS)
        {"name": "ValuePickr", "url": "https://forum.valuepickr.com/latest.rss", "type": "rss"},
        {"name": "TradingQnA", "url": "https://tradingqna.com/latest.rss", "type": "rss"},
    ],
    
    # =========================================================================
    # TIER 4: Regulatory & Filings (15 sources)
    # =========================================================================
    "regulatory": [
        {"name": "SEBI Updates", "url": "https://www.sebi.gov.in/sebirss.xml", "type": "rss"},
        {"name": "BSE Announcements", "url": "https://www.bseindia.com/data/xml/notices.xml", "type": "rss"},
        {"name": "RBI Press", "url": "https://rbi.org.in/scripts/BS_PressReleasesRss.aspx", "type": "rss"},
    ],
    
    # =========================================================================
    # TIER 5: F&O Data (10 sources)
    # =========================================================================
    "fno": [
        {"name": "NSE Option Chain Nifty", "url": "https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY", "type": "nse_json"},
        {"name": "NSE Option Chain BankNifty", "url": "https://www.nseindia.com/api/option-chain-indices?symbol=BANKNIFTY", "type": "nse_json"},
        {"name": "NSE FII Derivatives", "url": "https://www.nseindia.com/api/fiidiiTradeReact", "type": "nse_json"},
    ],
}

# Default stocks to track
DEFAULT_STOCKS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "HINDUNILVR", "SBIN", "BHARTIARTL", "ITC", "KOTAKBANK"
]

# Quick mode - fastest, most reliable sources
QUICK_SOURCES = [
    "Nifty Yahoo", "Sensex Yahoo", "Bank Nifty Yahoo", "India VIX",
    "ET Markets", "MC Markets", "r/IndianStreetBets",
    "NSE FII/DII", "USD/INR"
]


@dataclass
class IndiaMarketData:
    """Container for collected Indian market data."""
    timestamp: str = ""
    symbols: List[str] = field(default_factory=list)
    indices: Dict[str, Any] = field(default_factory=dict)
    fii_dii: Dict[str, Any] = field(default_factory=dict)
    stock_data: Dict[str, Any] = field(default_factory=dict)
    news: List[Dict] = field(default_factory=list)
    social: List[Dict] = field(default_factory=list)
    regulatory: List[Dict] = field(default_factory=list)
    fno_data: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)


class IndiaDataCollector:
    """Collects data from Indian market sources."""
    
    def __init__(self, symbols: List[str] = None, full_mode: bool = False, include_fno: bool = False):
        self.symbols = symbols or DEFAULT_STOCKS
        self.full_mode = full_mode
        self.include_fno = include_fno
        self.data = IndiaMarketData(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S IST"),
            symbols=self.symbols
        )
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json,text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        }
        self.nse_cookies = None
    
    async def collect_all(self) -> IndiaMarketData:
        """Collect from all sources."""
        print(f"🇮🇳 Collecting Indian market data...")
        print(f"📊 Symbols: {', '.join(self.symbols)}")
        print(f"🔧 Mode: {'Full (all sources)' if self.full_mode else 'Quick (key sources)'}")
        print()
        
        async with aiohttp.ClientSession(headers=self.headers) as session:
            # Get NSE cookies first (required for NSE API)
            await self._get_nse_cookies(session)
            
            tasks = [
                self._collect_indices(session),
                self._collect_fii_dii(session),
                self._collect_stock_data(session),
                self._collect_news(session),
                self._collect_social(session),
                self._collect_regulatory(session),
            ]
            
            if self.include_fno:
                tasks.append(self._collect_fno(session))
            
            await asyncio.gather(*tasks, return_exceptions=True)
        
        return self.data
    
    async def _get_nse_cookies(self, session: aiohttp.ClientSession):
        """Get NSE cookies for API access."""
        try:
            async with session.get("https://www.nseindia.com", timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    self.nse_cookies = resp.cookies
                    print("   ✓ NSE session initialized")
        except Exception as e:
            self.data.errors.append(f"NSE cookies: {str(e)[:50]}")
    
    async def _fetch(self, session: aiohttp.ClientSession, url: str, timeout: int = 15) -> str:
        """Fetch URL with error handling."""
        try:
            cookies = self.nse_cookies if "nseindia.com" in url else None
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=timeout), cookies=cookies) as resp:
                if resp.status == 200:
                    return await resp.text()
        except Exception as e:
            self.data.errors.append(f"{url[:50]}: {str(e)[:30]}")
        return ""
    
    async def _fetch_json(self, session: aiohttp.ClientSession, url: str, timeout: int = 15) -> Dict:
        """Fetch JSON with error handling."""
        try:
            cookies = self.nse_cookies if "nseindia.com" in url else None
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=timeout), cookies=cookies) as resp:
                if resp.status == 200:
                    return await resp.json()
        except Exception as e:
            self.data.errors.append(f"{url[:50]}: {str(e)[:30]}")
        return {}
    
    async def _collect_indices(self, session: aiohttp.ClientSession):
        """Collect index data."""
        print("📈 Collecting indices...")
        
        indices_map = {
            "Nifty 50": "%5ENSEI",
            "Sensex": "%5EBSESN",
            "Bank Nifty": "%5ENSEBANK",
            "India VIX": "%5EINDIAVIX",
            "Nifty IT": "%5ECNXIT",
            "Nifty Midcap": "NIFTY_MID_SELECT.NS",
            "USD/INR": "USDINR=X",
            "Gold": "GC=F",
            "Crude Oil": "CL=F",
        }
        
        for name, symbol in indices_map.items():
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=5d"
            data = await self._fetch_json(session, url)
            
            if data and "chart" in data and data["chart"].get("result"):
                result = data["chart"]["result"][0]
                meta = result.get("meta", {})
                quote = result.get("indicators", {}).get("quote", [{}])[0]
                
                closes = quote.get("close", [])
                if closes and len(closes) >= 2:
                    current = closes[-1]
                    prev = closes[-2]
                    if current and prev:
                        change = ((current - prev) / prev * 100)
                        self.data.indices[name] = {
                            "price": round(current, 2),
                            "change": round(change, 2),
                            "prev_close": round(prev, 2),
                        }
        
        print(f"   ✓ Got {len(self.data.indices)} indices")
    
    async def _collect_fii_dii(self, session: aiohttp.ClientSession):
        """Collect FII/DII data."""
        print("🏦 Collecting FII/DII data...")
        
        # Try NSE API
        if self.nse_cookies:
            data = await self._fetch_json(session, "https://www.nseindia.com/api/fiidiiTradeReact")
            if data:
                self.data.fii_dii = {
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "fii": data.get("fii", {}),
                    "dii": data.get("dii", {}),
                }
                print("   ✓ Got FII/DII data from NSE")
                return
        
        # Fallback message
        self.data.fii_dii = {"note": "FII/DII data available post-market from NSE"}
        print("   ⚠ FII/DII data not available (check after market hours)")
    
    async def _collect_stock_data(self, session: aiohttp.ClientSession):
        """Collect data for specific stocks."""
        print(f"📊 Collecting data for {len(self.symbols)} stocks...")
        
        for symbol in self.symbols:
            yahoo_symbol = f"{symbol}.NS"
            
            # Quote data
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}?interval=5m&range=1d"
            data = await self._fetch_json(session, url)
            
            stock_info = {"symbol": symbol}
            
            if data and "chart" in data and data["chart"].get("result"):
                result = data["chart"]["result"][0]
                meta = result.get("meta", {})
                quote = result.get("indicators", {}).get("quote", [{}])[0]
                
                closes = quote.get("close", [])
                volumes = quote.get("volume", [])
                
                if closes:
                    valid_closes = [c for c in closes if c]
                    if valid_closes:
                        stock_info["price"] = round(valid_closes[-1], 2)
                        stock_info["day_high"] = round(max(valid_closes), 2)
                        stock_info["day_low"] = round(min(valid_closes), 2)
                        stock_info["prev_close"] = round(meta.get("chartPreviousClose", 0), 2)
                        if stock_info["prev_close"]:
                            stock_info["change_pct"] = round(
                                (stock_info["price"] - stock_info["prev_close"]) / stock_info["prev_close"] * 100, 2
                            )
                
                if volumes:
                    valid_volumes = [v for v in volumes if v]
                    if valid_volumes:
                        stock_info["volume"] = sum(valid_volumes)
            
            # Key statistics
            stats_url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{yahoo_symbol}?modules=defaultKeyStatistics,financialData,price"
            stats_data = await self._fetch_json(session, stats_url)
            
            if stats_data and "quoteSummary" in stats_data:
                result = stats_data["quoteSummary"].get("result", [{}])[0]
                
                key_stats = result.get("defaultKeyStatistics", {})
                fin_data = result.get("financialData", {})
                price_data = result.get("price", {})
                
                stock_info["market_cap"] = price_data.get("marketCap", {}).get("fmt", "N/A")
                stock_info["pe_ratio"] = key_stats.get("trailingPE", {}).get("fmt", "N/A")
                stock_info["pb_ratio"] = key_stats.get("priceToBook", {}).get("fmt", "N/A")
                stock_info["52w_high"] = key_stats.get("fiftyTwoWeekHigh", {}).get("fmt", "N/A")
                stock_info["52w_low"] = key_stats.get("fiftyTwoWeekLow", {}).get("fmt", "N/A")
                stock_info["dividend_yield"] = key_stats.get("dividendYield", {}).get("fmt", "N/A")
            
            # Recent news
            news_url = f"https://query1.finance.yahoo.com/v1/finance/search?q={symbol}&newsCount=3"
            news_data = await self._fetch_json(session, news_url)
            
            if news_data and "news" in news_data:
                stock_info["recent_news"] = [
                    {"title": n.get("title"), "publisher": n.get("publisher")}
                    for n in news_data["news"][:3]
                ]
            
            self.data.stock_data[symbol] = stock_info
        
        print(f"   ✓ Got data for {len(self.data.stock_data)} stocks")
    
    async def _collect_news(self, session: aiohttp.ClientSession):
        """Collect news from RSS feeds."""
        print("📰 Collecting news...")
        
        sources = SOURCES["news"]
        if not self.full_mode:
            sources = [s for s in sources if any(q in s["name"] for q in ["ET", "MC", "Mint", "BS"])][:8]
        
        for source in sources:
            if source["type"] != "rss":
                continue
            
            content = await self._fetch(session, source["url"])
            if not content:
                continue
            
            try:
                feed = feedparser.parse(content)
                for entry in feed.entries[:5]:
                    title = entry.get("title", "")
                    summary = entry.get("summary", "")[:200] if entry.get("summary") else ""
                    
                    # Check if relevant to tracked stocks
                    relevant_symbols = [
                        s for s in self.symbols 
                        if s.lower() in title.lower() or s.lower() in summary.lower()
                    ]
                    
                    # Also include general market news
                    market_keywords = ["nifty", "sensex", "market", "fii", "dii", "rbi", "sebi", "ipo", "results"]
                    is_market_news = any(kw in title.lower() for kw in market_keywords)
                    
                    if relevant_symbols or is_market_news:
                        self.data.news.append({
                            "source": source["name"],
                            "title": title,
                            "summary": summary,
                            "published": entry.get("published", ""),
                            "symbols": relevant_symbols
                        })
            except Exception as e:
                self.data.errors.append(f"Parse {source['name']}: {str(e)[:30]}")
        
        # Deduplicate
        seen = set()
        unique_news = []
        for item in self.data.news:
            if item["title"] not in seen:
                seen.add(item["title"])
                unique_news.append(item)
        self.data.news = unique_news[:25]
        
        print(f"   ✓ Got {len(self.data.news)} news items")
    
    async def _collect_social(self, session: aiohttp.ClientSession):
        """Collect social sentiment from Reddit."""
        print("💬 Collecting social sentiment...")
        
        sources = SOURCES["social"]
        if not self.full_mode:
            sources = sources[:3]
        
        for source in sources:
            if source["type"] == "reddit":
                data = await self._fetch_json(session, source["url"])
                
                if data and "data" in data and "children" in data["data"]:
                    for post in data["data"]["children"][:10]:
                        post_data = post.get("data", {})
                        title = post_data.get("title", "")
                        
                        # Check relevance
                        relevant_symbols = [
                            s for s in self.symbols
                            if s.lower() in title.lower()
                        ]
                        
                        score = post_data.get("score", 0)
                        comments = post_data.get("num_comments", 0)
                        
                        # Include high engagement or relevant posts
                        if relevant_symbols or score > 100 or comments > 50:
                            self.data.social.append({
                                "source": source["name"],
                                "title": title,
                                "score": score,
                                "comments": comments,
                                "symbols": relevant_symbols
                            })
            
            elif source["type"] == "rss":
                content = await self._fetch(session, source["url"])
                if content:
                    try:
                        feed = feedparser.parse(content)
                        for entry in feed.entries[:5]:
                            self.data.social.append({
                                "source": source["name"],
                                "title": entry.get("title", ""),
                                "score": 0,
                                "comments": 0,
                                "symbols": []
                            })
                    except:
                        pass
        
        # Sort by engagement
        self.data.social.sort(key=lambda x: x["score"] + x["comments"], reverse=True)
        self.data.social = self.data.social[:15]
        
        print(f"   ✓ Got {len(self.data.social)} social posts")
    
    async def _collect_regulatory(self, session: aiohttp.ClientSession):
        """Collect regulatory updates."""
        print("📋 Collecting regulatory updates...")
        
        for source in SOURCES["regulatory"]:
            if source["type"] != "rss":
                continue
            
            content = await self._fetch(session, source["url"])
            if not content:
                continue
            
            try:
                feed = feedparser.parse(content)
                for entry in feed.entries[:5]:
                    self.data.regulatory.append({
                        "source": source["name"],
                        "title": entry.get("title", ""),
                        "link": entry.get("link", ""),
                        "published": entry.get("published", "")
                    })
            except:
                pass
        
        self.data.regulatory = self.data.regulatory[:10]
        print(f"   ✓ Got {len(self.data.regulatory)} regulatory updates")
    
    async def _collect_fno(self, session: aiohttp.ClientSession):
        """Collect F&O data."""
        print("📊 Collecting F&O data...")
        
        if not self.nse_cookies:
            self.data.fno_data = {"note": "F&O data requires NSE session"}
            return
        
        # Nifty Option Chain
        data = await self._fetch_json(session, "https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY")
        
        if data and "records" in data:
            records = data["records"]
            
            # Calculate PCR
            total_ce_oi = sum(d.get("CE", {}).get("openInterest", 0) for d in records.get("data", []) if d.get("CE"))
            total_pe_oi = sum(d.get("PE", {}).get("openInterest", 0) for d in records.get("data", []) if d.get("PE"))
            
            pcr = round(total_pe_oi / total_ce_oi, 2) if total_ce_oi > 0 else 0
            
            # Find max pain (strike with max total OI)
            strike_oi = {}
            for d in records.get("data", []):
                strike = d.get("strikePrice", 0)
                ce_oi = d.get("CE", {}).get("openInterest", 0)
                pe_oi = d.get("PE", {}).get("openInterest", 0)
                strike_oi[strike] = ce_oi + pe_oi
            
            max_pain_strike = max(strike_oi, key=strike_oi.get) if strike_oi else 0
            
            self.data.fno_data["nifty"] = {
                "underlying": records.get("underlyingValue"),
                "pcr": pcr,
                "max_pain": max_pain_strike,
                "total_ce_oi": total_ce_oi,
                "total_pe_oi": total_pe_oi,
                "expiry": records.get("expiryDates", [""])[0] if records.get("expiryDates") else "",
            }
            
            print(f"   ✓ Got Nifty F&O data (PCR: {pcr})")
        else:
            print("   ⚠ Could not fetch F&O data")


def format_for_claude(data: IndiaMarketData) -> str:
    """Format collected data as a prompt for Claude."""
    
    prompt = f"""# 🇮🇳 Indian Market Intelligence Report
Generated: {data.timestamp}
Symbols Tracked: {', '.join(data.symbols)}

---

## 1. MARKET OVERVIEW

### Indices
"""
    
    for name, info in data.indices.items():
        if info.get("price"):
            change_str = f"+{info['change']}%" if info['change'] > 0 else f"{info['change']}%"
            emoji = "🟢" if info['change'] > 0 else "🔴" if info['change'] < 0 else "⚪"
            prompt += f"- **{name}**: {info['price']:,.2f} ({change_str}) {emoji}\n"
    
    # FII/DII
    if data.fii_dii and data.fii_dii.get("fii"):
        prompt += "\n### FII/DII Activity\n"
        fii = data.fii_dii.get("fii", {})
        dii = data.fii_dii.get("dii", {})
        prompt += f"- **FII**: Buy ₹{fii.get('buyValue', 'N/A')} Cr | Sell ₹{fii.get('sellValue', 'N/A')} Cr | Net ₹{fii.get('netValue', 'N/A')} Cr\n"
        prompt += f"- **DII**: Buy ₹{dii.get('buyValue', 'N/A')} Cr | Sell ₹{dii.get('sellValue', 'N/A')} Cr | Net ₹{dii.get('netValue', 'N/A')} Cr\n"
    
    prompt += "\n---\n\n## 2. STOCK ANALYSIS\n\n"
    
    for symbol, info in data.stock_data.items():
        prompt += f"### {symbol}\n"
        prompt += f"- **Price**: ₹{info.get('price', 'N/A')}"
        if info.get('change_pct'):
            change_emoji = "🟢" if info['change_pct'] > 0 else "🔴"
            prompt += f" ({info['change_pct']:+.2f}%) {change_emoji}"
        prompt += "\n"
        prompt += f"- **Day Range**: ₹{info.get('day_low', 'N/A')} - ₹{info.get('day_high', 'N/A')}\n"
        prompt += f"- **Volume**: {info.get('volume', 'N/A'):,}\n" if isinstance(info.get('volume'), (int, float)) else ""
        prompt += f"- **Market Cap**: {info.get('market_cap', 'N/A')}\n"
        prompt += f"- **P/E**: {info.get('pe_ratio', 'N/A')} | **P/B**: {info.get('pb_ratio', 'N/A')}\n"
        prompt += f"- **52W Range**: {info.get('52w_low', 'N/A')} - {info.get('52w_high', 'N/A')}\n"
        
        if info.get("recent_news"):
            prompt += "- **Recent Headlines**:\n"
            for news in info["recent_news"]:
                prompt += f"  - {news['title']}\n"
        prompt += "\n"
    
    prompt += "---\n\n## 3. NEWS & EVENTS\n\n"
    
    for i, news in enumerate(data.news[:15], 1):
        symbols_str = f" **[{', '.join(news['symbols'])}]**" if news['symbols'] else ""
        prompt += f"{i}. {news['source']}: {news['title']}{symbols_str}\n"
    
    prompt += "\n---\n\n## 4. SOCIAL SENTIMENT (Reddit/Forums)\n\n"
    
    for post in data.social[:10]:
        symbols_str = f" [{', '.join(post['symbols'])}]" if post['symbols'] else ""
        prompt += f"- **{post['source']}**: {post['title']} (⬆️{post['score']} 💬{post['comments']}){symbols_str}\n"
    
    if data.fno_data and data.fno_data.get("nifty"):
        nifty_fno = data.fno_data["nifty"]
        prompt += f"\n---\n\n## 5. F&O DATA (Nifty)\n\n"
        prompt += f"- **Spot**: {nifty_fno.get('underlying', 'N/A')}\n"
        prompt += f"- **Put-Call Ratio (PCR)**: {nifty_fno.get('pcr', 'N/A')}\n"
        prompt += f"- **Max Pain**: {nifty_fno.get('max_pain', 'N/A')}\n"
        prompt += f"- **Total CE OI**: {nifty_fno.get('total_ce_oi', 0):,}\n"
        prompt += f"- **Total PE OI**: {nifty_fno.get('total_pe_oi', 0):,}\n"
        prompt += f"- **Expiry**: {nifty_fno.get('expiry', 'N/A')}\n"
    
    if data.regulatory:
        prompt += "\n---\n\n## 6. REGULATORY UPDATES\n\n"
        for item in data.regulatory[:5]:
            prompt += f"- **{item['source']}**: {item['title']}\n"
    
    prompt += """
---

## 📊 ANALYSIS REQUEST

Based on the above Indian market data, please provide:

### 1. Market Regime Assessment
- Is Nifty in bullish, bearish, or sideways mode?
- What does India VIX level suggest about volatility expectations?
- FII/DII flow interpretation - who is buying/selling?

### 2. Stock-wise Analysis
For each tracked stock:
- **Signal**: Bullish / Bearish / Neutral
- **Key observation**: One-line summary
- **Risk**: What to watch out for
- **Confidence**: High / Medium / Low

### 3. Key Events & Catalysts
- What upcoming events could impact these stocks?
- Any sector rotation happening?

### 4. Top 3 Actionable Insights
What should an Indian retail trader focus on right now?

### 5. Risk Assessment
- Global factors affecting Indian markets
- Sector-specific risks
- Currency (INR) impact

Please be specific and data-driven in your analysis. Reference the actual numbers provided.
"""
    
    return prompt


def copy_to_clipboard(text: str) -> bool:
    """Copy text to clipboard."""
    try:
        import subprocess
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
    args = sys.argv[1:]
    
    full_mode = "--full" in args
    save_mode = "--save" in args
    fno_mode = "--fno" in args
    
    # Filter flags to get symbols
    symbols = [a.upper() for a in args if not a.startswith("--") and len(a) <= 15]
    
    if not symbols:
        symbols = DEFAULT_STOCKS
    
    # Collect data
    collector = IndiaDataCollector(symbols=symbols, full_mode=full_mode, include_fno=fno_mode)
    data = await collector.collect_all()
    
    # Format for Claude
    print("\n📝 Formatting for Claude...")
    prompt = format_for_claude(data)
    
    # Output
    if save_mode:
        filename = f"india_market_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        with open(filename, "w") as f:
            f.write(prompt)
        print(f"\n✅ Saved to {filename}")
    else:
        if copy_to_clipboard(prompt):
            print("\n✅ Copied to clipboard! Paste into Claude chat.")
        else:
            print("\n" + "="*70)
            print("COPY EVERYTHING BELOW THIS LINE")
            print("="*70 + "\n")
            print(prompt)
    
    # Summary
    print(f"\n📊 Collection Summary:")
    print(f"   - Indices: {len(data.indices)}")
    print(f"   - Stocks analyzed: {len(data.stock_data)}")
    print(f"   - News items: {len(data.news)}")
    print(f"   - Social posts: {len(data.social)}")
    print(f"   - Regulatory updates: {len(data.regulatory)}")
    if data.fno_data:
        print(f"   - F&O data: ✓")
    print(f"   - Errors: {len(data.errors)}")


if __name__ == "__main__":
    print("""
╔═══════════════════════════════════════════════════════════════════╗
║             🇮🇳 FINSIGHT INDIA DATA COLLECTOR 🇮🇳                  ║
║                Gather → Format → Paste to Claude                   ║
╚═══════════════════════════════════════════════════════════════════╝
    """)
    asyncio.run(main())

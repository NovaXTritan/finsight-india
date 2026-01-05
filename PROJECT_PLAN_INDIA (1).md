# FinSight India - Project Plan
## Comprehensive Stock Market Intelligence Platform for Indian Retail Investors

**Document Version**: 1.0
**Created**: January 2026
**Author**: Divyanshu Kumar

---

## Executive Summary

### The Problem
- **210 million** demat accounts in India, growing 3.8M/month
- **93%** of F&O traders lose money (₹1.8 lakh crore lost in 3 years)
- Retail traders use **5-6 fragmented tools** costing ₹6,000-12,000/month
- **No single platform** serves beginners to advanced traders
- Information overload + emotional decisions = capital destruction

### The Solution
**FinSight India**: An AI-powered, unified market intelligence platform that:
1. Consolidates 100+ data sources into actionable signals
2. Serves ALL user segments (beginners → F&O traders)
3. Protects users from emotional/behavioral mistakes
4. Costs 80% less than current fragmented solutions

### Target Metrics (Year 1)
| Metric | Target |
|--------|--------|
| Users (Free) | 100,000 |
| Paid Subscribers | 5,000 |
| MRR | ₹25 lakh |
| NPS | >50 |

---

## Part 1: Product Vision

### 1.1 Positioning Statement

> "For Indian retail investors and traders who are overwhelmed by fragmented tools and information overload, FinSight India is the unified market intelligence platform that consolidates 100+ data sources into actionable signals while protecting you from emotional mistakes. Unlike Screener.in (fundamentals only), ChartInk (technicals only), or Sensibull (options only), FinSight serves your complete journey from beginner to advanced trader in one platform."

### 1.2 Core Value Propositions

| User Segment | Current Pain | FinSight Solution |
|--------------|--------------|-------------------|
| **Beginners** | Don't know where to start, fall for tips | Guided learning + AI explanations |
| **Long-term Investors** | Can't track portfolio + news efficiently | Smart portfolio with event alerts |
| **Intraday Traders** | Miss signals, overtrade emotionally | Real-time scanner + behavior guardrails |
| **F&O Traders** | Expensive tools, complex analysis | Integrated options chain + OI analysis |

### 1.3 Competitive Moat

```
┌─────────────────────────────────────────────────────────────────┐
│                    FINSIGHT INDIA MOAT                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. DATA AGGREGATION                                             │
│    • 100+ sources unified (competitors: 10-20)                  │
│    • Alternative data (GST, UPI, EPFO) no one else has          │
│                                                                 │
│ 2. AI-POWERED ANALYSIS                                          │
│    • Claude integration for explanations                        │
│    • Anomaly detection (your existing tech)                     │
│                                                                 │
│ 3. BEHAVIORAL PROTECTION                                        │
│    • FOMO alerts before buy                                     │
│    • Panic-sell warnings                                        │
│    • Overtrading detection                                      │
│                                                                 │
│ 4. ALL-IN-ONE VALUE                                             │
│    • ₹999/mo vs ₹6,000+/mo for 5 tools                         │
│    • Single login, unified experience                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Feature Roadmap

### 2.1 Feature Matrix by User Segment

| Feature | Beginner | Long-term | Intraday | F&O | Priority |
|---------|----------|-----------|----------|-----|----------|
| Stock Screener (Fundamental) | ✓ | ✓ | - | - | P0 |
| Stock Screener (Technical) | - | - | ✓ | ✓ | P0 |
| Portfolio Tracker | ✓ | ✓ | ✓ | ✓ | P0 |
| News Aggregator | ✓ | ✓ | ✓ | ✓ | P0 |
| Watchlist with Alerts | ✓ | ✓ | ✓ | ✓ | P0 |
| AI Market Summary | ✓ | ✓ | ✓ | ✓ | P0 |
| Learning Modules | ✓ | - | - | - | P1 |
| FII/DII Flow Tracker | - | ✓ | ✓ | ✓ | P1 |
| Bulk/Block Deal Alerts | - | ✓ | ✓ | ✓ | P1 |
| Insider Trading Alerts | - | ✓ | - | - | P1 |
| Option Chain Analysis | - | - | - | ✓ | P1 |
| OI Buildup Scanner | - | - | - | ✓ | P1 |
| India VIX Alerts | - | - | ✓ | ✓ | P1 |
| Backtesting | - | - | ✓ | ✓ | P2 |
| Strategy Builder | - | - | ✓ | ✓ | P2 |
| Alternative Data (GST/UPI) | - | ✓ | - | - | P2 |
| Broker Integration | - | - | ✓ | ✓ | P2 |
| Telegram Bot | ✓ | ✓ | ✓ | ✓ | P2 |

### 2.2 MVP Scope (Phase 1)

```
┌─────────────────────────────────────────────────────────────────┐
│                         MVP FEATURES                             │
│                      (8 weeks to launch)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐│
│  │  MARKET PULSE    │  │  STOCK SCREENER  │  │   PORTFOLIO    ││
│  │  • Nifty/Sensex  │  │  • 50+ filters   │  │   TRACKER      ││
│  │  • India VIX     │  │  • Save screens  │  │  • Holdings    ││
│  │  • FII/DII       │  │  • Export CSV    │  │  • P&L calc    ││
│  │  • Top gainers   │  │  • Fundamentals  │  │  • Alerts      ││
│  │  • Top losers    │  │  • Technicals    │  │  • XIRR        ││
│  └──────────────────┘  └──────────────────┘  └────────────────┘│
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐│
│  │  NEWS & SIGNALS  │  │    WATCHLIST     │  │  AI ASSISTANT  ││
│  │  • 15+ sources   │  │  • 50 stocks     │  │  • Ask Claude  ││
│  │  • Stock tagged  │  │  • Price alerts  │  │  • Explain     ││
│  │  • Sentiment     │  │  • News alerts   │  │    signals     ││
│  │  • Bulk deals    │  │  • FII activity  │  │  • Market      ││
│  │  • Results cal   │  │  • Results due   │  │    summary     ││
│  └──────────────────┘  └──────────────────┘  └────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Technical Architecture

### 3.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FINSIGHT INDIA ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Web App   │  │ Mobile App  │  │   Telegram  │  │   Widgets   │    │
│  │  (Next.js)  │  │  (Flutter)  │  │     Bot     │  │  (Embeds)   │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
└─────────┼────────────────┼────────────────┼────────────────┼────────────┘
          │                │                │                │
          └────────────────┴────────────────┴────────────────┘
                                    │
                            ┌───────▼───────┐
                            │   CDN/Cache   │
                            │  (Cloudflare) │
                            └───────┬───────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────┐
│                          API GATEWAY (Kong)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │    Auth     │  │ Rate Limit  │  │   Logging   │  │   Metrics   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────┐
│                          MICROSERVICES                                   │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Market    │  │  Screener   │  │  Portfolio  │  │    News     │    │
│  │   Service   │  │   Service   │  │   Service   │  │   Service   │    │
│  │  (FastAPI)  │  │  (FastAPI)  │  │  (FastAPI)  │  │  (FastAPI)  │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐    │
│  │   Alerts    │  │     AI      │  │    F&O      │  │  Analytics  │    │
│  │   Service   │  │   Service   │  │   Service   │  │   Service   │    │
│  │  (FastAPI)  │  │  (Claude)   │  │  (FastAPI)  │  │  (FastAPI)  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────┐
│                          DATA LAYER                                      │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ PostgreSQL  │  │    Redis    │  │ TimescaleDB │  │    S3       │    │
│  │  (Primary)  │  │   (Cache)   │  │ (Time-series│  │  (Files)    │    │
│  │             │  │             │  │    data)    │  │             │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────┐
│                    DATA COLLECTION LAYER                                 │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     SCHEDULED COLLECTORS                          │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │  │
│  │  │  NSE   │ │  BSE   │ │  News  │ │ Reddit │ │  SEBI  │         │  │
│  │  │Scraper │ │Scraper │ │  RSS   │ │Scraper │ │Scraper │         │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     REAL-TIME COLLECTORS                          │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                     │  │
│  │  │ FYERS  │ │ Dhan   │ │Telegram│ │Twitter │                     │  │
│  │  │WebSocket│ │WebSocket│ │  Bot   │ │ Stream │                     │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend (Web)** | Next.js 14 + TypeScript + Tailwind | SEO, SSR, fast development |
| **Frontend (Mobile)** | Flutter | Single codebase for iOS/Android |
| **API Gateway** | Kong / Nginx | Rate limiting, auth, logging |
| **Backend** | FastAPI (Python) | Async, fast, your existing code |
| **Database (Primary)** | PostgreSQL | Reliable, JSON support |
| **Database (Time-series)** | TimescaleDB | Optimized for OHLCV data |
| **Cache** | Redis | Session, real-time data |
| **Queue** | Redis Streams / Celery | Background jobs |
| **Search** | Meilisearch | Fast stock search |
| **AI** | Claude API | Analysis, explanations |
| **Hosting** | AWS / Railway | Scalable, India region |
| **CDN** | Cloudflare | Fast, DDoS protection |

### 3.3 Database Schema (Core)

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15),
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    tier VARCHAR(20) DEFAULT 'free', -- free, pro, premium
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Stocks Master
CREATE TABLE stocks (
    symbol VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    exchange VARCHAR(10) NOT NULL, -- NSE, BSE
    sector VARCHAR(100),
    industry VARCHAR(100),
    market_cap BIGINT,
    is_fno BOOLEAN DEFAULT FALSE,
    lot_size INTEGER,
    metadata JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price Data (TimescaleDB hypertable)
CREATE TABLE stock_prices (
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    open DECIMAL(12,2),
    high DECIMAL(12,2),
    low DECIMAL(12,2),
    close DECIMAL(12,2),
    volume BIGINT,
    delivery_qty BIGINT,
    delivery_pct DECIMAL(5,2),
    PRIMARY KEY (symbol, timestamp)
);
SELECT create_hypertable('stock_prices', 'timestamp');

-- User Watchlist
CREATE TABLE user_watchlist (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) REFERENCES stocks(symbol),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    alerts JSONB DEFAULT '{}', -- price_above, price_below, etc.
    UNIQUE(user_id, symbol)
);

-- User Portfolio
CREATE TABLE user_holdings (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) REFERENCES stocks(symbol),
    quantity INTEGER NOT NULL,
    avg_price DECIMAL(12,2) NOT NULL,
    buy_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signals/Anomalies (from your existing system)
CREATE TABLE signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,
    signal_type VARCHAR(50) NOT NULL, -- volume_spike, price_breakout, fii_buy, etc.
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    data JSONB NOT NULL, -- z_score, details, etc.
    ai_analysis TEXT,
    detected_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- News
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    summary TEXT,
    sentiment VARCHAR(20), -- positive, negative, neutral
    symbols VARCHAR(20)[], -- tagged stocks
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FII/DII Data
CREATE TABLE fii_dii_activity (
    date DATE PRIMARY KEY,
    fii_buy DECIMAL(14,2),
    fii_sell DECIMAL(14,2),
    fii_net DECIMAL(14,2),
    dii_buy DECIMAL(14,2),
    dii_sell DECIMAL(14,2),
    dii_net DECIMAL(14,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk/Block Deals
CREATE TABLE bulk_block_deals (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    deal_type VARCHAR(10) NOT NULL, -- BULK, BLOCK
    client_name VARCHAR(255),
    buy_sell VARCHAR(4), -- BUY, SELL
    quantity BIGINT,
    price DECIMAL(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Activity (for behavioral analysis)
CREATE TABLE user_activity (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- view_stock, add_watchlist, check_signal, etc.
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_signals_symbol ON signals(symbol, detected_at DESC);
CREATE INDEX idx_signals_type ON signals(signal_type, detected_at DESC);
CREATE INDEX idx_news_symbols ON news USING GIN(symbols);
CREATE INDEX idx_news_published ON news(published_at DESC);
CREATE INDEX idx_user_activity ON user_activity(user_id, created_at DESC);
```

---

## Part 4: Data Sources Integration

### 4.1 Data Source Priority Matrix

| Source | Data Type | Update Freq | Cost | Priority | Integration Method |
|--------|-----------|-------------|------|----------|-------------------|
| NSE India | Prices, F&O, Corporate | Real-time | FREE | P0 | Web scraping + API |
| BSE India | Prices, Announcements | Real-time | FREE | P0 | Web scraping |
| FYERS API | Real-time quotes, history | Real-time | FREE | P0 | Official API |
| Economic Times | News | 5 min | FREE | P0 | RSS |
| Moneycontrol | News | 5 min | FREE | P0 | RSS |
| NSE FII/DII | Institutional flows | Daily | FREE | P0 | Scraping |
| Reddit | Sentiment | 15 min | FREE | P1 | API |
| SEBI | Circulars, filings | Daily | FREE | P1 | RSS + Scraping |
| BSE Announcements | Corporate events | Real-time | FREE | P1 | RSS |
| Telegram | Sentiment | Real-time | FREE | P1 | Bot API |
| Twitter/X | Sentiment | Real-time | $200/mo | P2 | API (Basic tier) |
| GST Portal | Alt data | Monthly | FREE | P2 | Manual/Scraping |
| NPCI (UPI) | Alt data | Monthly | FREE | P2 | Manual |

### 4.2 Data Collection Schedule

```python
# Scheduler Configuration

COLLECTION_SCHEDULE = {
    # Real-time (every minute during market hours)
    "market_prices": {
        "schedule": "* 9-16 * * 1-5",  # Every minute, Mon-Fri
        "source": "fyers_websocket",
        "priority": "critical"
    },
    
    # Every 5 minutes
    "news_feeds": {
        "schedule": "*/5 * * * *",
        "sources": ["et_rss", "mc_rss", "bs_rss", "mint_rss"],
        "priority": "high"
    },
    
    # Every 15 minutes during market
    "nse_data": {
        "schedule": "*/15 9-16 * * 1-5",
        "sources": ["nse_indices", "nse_advances_declines", "option_chain"],
        "priority": "high"
    },
    
    # Every 30 minutes
    "social_sentiment": {
        "schedule": "*/30 * * * *",
        "sources": ["reddit_isb", "reddit_ii"],
        "priority": "medium"
    },
    
    # Post-market (6:30 PM IST)
    "eod_data": {
        "schedule": "30 18 * * 1-5",
        "sources": ["nse_bhavcopy", "bse_bhavcopy", "fii_dii", "bulk_deals"],
        "priority": "high"
    },
    
    # Daily morning (8 AM IST)
    "morning_prep": {
        "schedule": "0 8 * * 1-5",
        "sources": ["results_calendar", "board_meetings", "corporate_actions"],
        "priority": "medium"
    },
    
    # Weekly
    "sebi_filings": {
        "schedule": "0 10 * * 6",  # Saturday 10 AM
        "sources": ["sebi_circulars", "sebi_orders"],
        "priority": "low"
    },
    
    # Monthly
    "alternative_data": {
        "schedule": "0 10 1 * *",  # 1st of month
        "sources": ["gst_collections", "upi_data", "epfo_data"],
        "priority": "low"
    }
}
```

### 4.3 Indian Market Data Collector (Updated)

```python
# tools/collect_india.py - Indian Market Data Collector

INDIA_SOURCES = {
    # =========================================================================
    # TIER 1: Market Data (20 sources)
    # =========================================================================
    "market_data": [
        # NSE
        {"name": "NSE Indices", "url": "https://www.nseindia.com/api/allIndices", "type": "json"},
        {"name": "NSE Nifty 50", "url": "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050", "type": "json"},
        {"name": "NSE Advances/Declines", "url": "https://www.nseindia.com/api/market-data-pre-open?key=ALL", "type": "json"},
        {"name": "NSE Option Chain", "url": "https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY", "type": "json"},
        {"name": "NSE FII/DII", "url": "https://www.nseindia.com/api/fiidiiTradeReact", "type": "json"},
        {"name": "India VIX", "url": "https://www.nseindia.com/api/allIndices", "type": "json"},
        
        # Yahoo Finance (backup)
        {"name": "Nifty 50 Yahoo", "url": "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI", "type": "yahoo"},
        {"name": "Sensex Yahoo", "url": "https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN", "type": "yahoo"},
        {"name": "Bank Nifty Yahoo", "url": "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEBANK", "type": "yahoo"},
        {"name": "India VIX Yahoo", "url": "https://query1.finance.yahoo.com/v8/finance/chart/%5EINDIAVIX", "type": "yahoo"},
        
        # Gift Nifty
        {"name": "Gift Nifty", "url": "https://www.moneycontrol.com/indian-indices/gift-nifty-SGXNIFTY.html", "type": "scrape"},
    ],
    
    # =========================================================================
    # TIER 2: News Sources (25 sources)
    # =========================================================================
    "news": [
        # Major Publications
        {"name": "Economic Times Markets", "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", "type": "rss"},
        {"name": "Economic Times Stocks", "url": "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms", "type": "rss"},
        {"name": "Moneycontrol News", "url": "https://www.moneycontrol.com/rss/latestnews.xml", "type": "rss"},
        {"name": "Moneycontrol Markets", "url": "https://www.moneycontrol.com/rss/marketreports.xml", "type": "rss"},
        {"name": "Livemint Markets", "url": "https://www.livemint.com/rss/markets", "type": "rss"},
        {"name": "Livemint Companies", "url": "https://www.livemint.com/rss/companies", "type": "rss"},
        {"name": "Business Standard Markets", "url": "https://www.business-standard.com/rss/markets-106.rss", "type": "rss"},
        {"name": "Business Standard Companies", "url": "https://www.business-standard.com/rss/companies-702.rss", "type": "rss"},
        {"name": "Financial Express Markets", "url": "https://www.financialexpress.com/market/feed/", "type": "rss"},
        {"name": "Hindu Business Line", "url": "https://www.thehindubusinessline.com/markets/?service=rss", "type": "rss"},
        {"name": "NDTV Profit", "url": "https://feeds.feedburner.com/ndtvprofit-latest", "type": "rss"},
        {"name": "Zee Business", "url": "https://zeenews.india.com/rss/business-news.xml", "type": "rss"},
        
        # Specialized
        {"name": "Value Research", "url": "https://www.valueresearchonline.com/rss/", "type": "rss"},
        {"name": "Capitalmind", "url": "https://www.capitalmind.in/feed/", "type": "rss"},
        {"name": "Safal Niveshak", "url": "https://www.safalniveshak.com/feed/", "type": "rss"},
        {"name": "Freefincal", "url": "https://freefincal.com/feed/", "type": "rss"},
        {"name": "Subramoney", "url": "https://www.subramoney.com/feed/", "type": "rss"},
    ],
    
    # =========================================================================
    # TIER 3: Social Sentiment (15 sources)
    # =========================================================================
    "social": [
        # Reddit
        {"name": "r/IndianStreetBets", "url": "https://www.reddit.com/r/IndianStreetBets/hot.json?limit=50", "type": "reddit"},
        {"name": "r/IndiaInvestments", "url": "https://www.reddit.com/r/IndiaInvestments/hot.json?limit=50", "type": "reddit"},
        {"name": "r/IndianStockMarket", "url": "https://www.reddit.com/r/IndianStockMarket/hot.json?limit=50", "type": "reddit"},
        {"name": "r/dalalstreetbets", "url": "https://www.reddit.com/r/dalalstreetbets/hot.json?limit=50", "type": "reddit"},
        
        # Telegram Channels (public, via RSS bridge or scraping)
        {"name": "Stock Market India TG", "url": "t.me/stockmarketindia", "type": "telegram"},
        {"name": "NSE BSE Updates TG", "url": "t.me/nse_bse_updates", "type": "telegram"},
        
        # Forums
        {"name": "ValuePickr", "url": "https://forum.valuepickr.com/latest.rss", "type": "rss"},
        {"name": "TradingQnA", "url": "https://tradingqna.com/latest.rss", "type": "rss"},
    ],
    
    # =========================================================================
    # TIER 4: Regulatory & Filings (15 sources)
    # =========================================================================
    "regulatory": [
        # SEBI
        {"name": "SEBI Press Releases", "url": "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListingAll=yes&sid=1&ssid=2&smid=0", "type": "scrape"},
        {"name": "SEBI Circulars", "url": "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListingAll=yes&sid=2&ssid=12&smid=0", "type": "scrape"},
        
        # NSE Filings
        {"name": "NSE Corporate Announcements", "url": "https://www.nseindia.com/api/corporates-corporateActions?index=equities", "type": "json"},
        {"name": "NSE Board Meetings", "url": "https://www.nseindia.com/api/corporate-board-meetings?index=equities", "type": "json"},
        {"name": "NSE Insider Trading", "url": "https://www.nseindia.com/api/corporates-pit?index=equities", "type": "json"},
        {"name": "NSE Bulk Deals", "url": "https://www.nseindia.com/api/snapshot-capital-market-largedeal", "type": "json"},
        {"name": "NSE Block Deals", "url": "https://www.nseindia.com/api/block-deal", "type": "json"},
        
        # BSE Filings
        {"name": "BSE Announcements", "url": "https://www.bseindia.com/data/xml/notices.xml", "type": "rss"},
        {"name": "BSE Corporate Actions", "url": "https://www.bseindia.com/corporates/corporate_act.aspx", "type": "scrape"},
        
        # RBI
        {"name": "RBI Press Releases", "url": "https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx", "type": "scrape"},
        {"name": "RBI Forex Reserves", "url": "https://m.rbi.org.in/scripts/WSSViewDetail.aspx?TYPE=Section&PARAM1=2", "type": "scrape"},
    ],
    
    # =========================================================================
    # TIER 5: Alternative Data (10 sources)
    # =========================================================================
    "alternative": [
        {"name": "GST Collections", "url": "https://gst.gov.in/download/gststatistics", "type": "manual"},
        {"name": "UPI Transactions", "url": "https://www.npci.org.in/what-we-do/upi/upi-ecosystem-statistics", "type": "scrape"},
        {"name": "E-way Bills", "url": "https://ewaybillgst.gov.in/", "type": "manual"},
        {"name": "EPFO Payroll", "url": "https://www.epfindia.gov.in/site_en/index.php", "type": "manual"},
        {"name": "Power Consumption", "url": "https://posoco.in/en/reports/daily-reports/", "type": "scrape"},
        {"name": "Cement Dispatch", "url": "https://www.cmaindia.org/", "type": "manual"},
        {"name": "Auto Sales SIAM", "url": "https://www.siam.in/statistics.aspx", "type": "manual"},
        {"name": "Agmarknet Prices", "url": "https://agmarknet.gov.in/", "type": "api"},
        {"name": "IMD Weather", "url": "https://mausam.imd.gov.in/", "type": "scrape"},
        {"name": "Toll Collections", "url": "https://www.nhai.gov.in/", "type": "manual"},
    ],
    
    # =========================================================================
    # TIER 6: F&O Specific (10 sources)
    # =========================================================================
    "fno": [
        {"name": "NSE Option Chain Nifty", "url": "https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY", "type": "json"},
        {"name": "NSE Option Chain BankNifty", "url": "https://www.nseindia.com/api/option-chain-indices?symbol=BANKNIFTY", "type": "json"},
        {"name": "NSE FII Stats Derivatives", "url": "https://www.nseindia.com/api/fiidiiTradeReact", "type": "json"},
        {"name": "NSE Participant OI", "url": "https://www.nseindia.com/api/participant-wise-open-interest", "type": "json"},
        {"name": "Max Pain Calculator", "url": "https://www.eqsis.com/", "type": "scrape"},
        {"name": "PCR Data", "url": "https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY", "type": "json"},
    ],
}
```

---

## Part 5: Development Phases

### 5.1 Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DEVELOPMENT TIMELINE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Phase 0: Foundation     Phase 1: MVP        Phase 2: Growth            │
│  ──────────────────     ─────────────       ──────────────             │
│  Week 1-2               Week 3-8             Week 9-16                  │
│                                                                         │
│  • Architecture         • Core features     • F&O Module                │
│  • Data pipeline        • Web app           • Mobile app                │
│  • Database setup       • Auth & billing    • Backtesting               │
│  • CI/CD               • Beta launch        • Broker integration        │
│                                                                         │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Phase 3: Scale          Phase 4: Expand                                │
│  ─────────────          ──────────────                                 │
│  Week 17-24              Week 25+                                       │
│                                                                         │
│  • AI enhancement       • Regional languages                            │
│  • Real-time alerts     • Algo trading                                  │
│  • Community            • API marketplace                               │
│  • Telegram bot         • Enterprise tier                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Phase 0: Foundation (Week 1-2)

| Task | Owner | Days | Deliverable |
|------|-------|------|-------------|
| Setup AWS/Railway infrastructure | Backend | 2 | Terraform configs |
| PostgreSQL + TimescaleDB setup | Backend | 1 | Running DB |
| Redis + cache layer | Backend | 1 | Cache working |
| CI/CD pipeline (GitHub Actions) | DevOps | 2 | Auto-deploy |
| Data collectors framework | Backend | 3 | Base classes |
| NSE/BSE scrapers | Backend | 2 | Working scrapers |
| News RSS aggregator | Backend | 1 | News flowing |
| Auth system (JWT) | Backend | 2 | Login working |

**Exit Criteria**: 
- [ ] Data pipeline collecting NSE/BSE/News every 5 min
- [ ] Database storing 1 week of data
- [ ] Basic API endpoints returning data
- [ ] CI/CD deploying on push

### 5.3 Phase 1: MVP (Week 3-8)

#### Week 3-4: Core Backend

| Task | Days | Deliverable |
|------|------|-------------|
| Stock master data (2500+ stocks) | 2 | Complete stock list |
| Screener service (50+ filters) | 4 | Screener API |
| Watchlist service | 2 | Watchlist CRUD |
| Portfolio service | 3 | Portfolio tracker |
| News service with tagging | 2 | Tagged news |
| Signal detection (your existing) | 3 | Anomaly detection |

#### Week 5-6: Frontend

| Task | Days | Deliverable |
|------|------|-------------|
| Next.js project setup | 1 | Boilerplate |
| Landing page | 2 | Marketing page |
| Dashboard layout | 2 | Shell with nav |
| Market pulse component | 2 | Indices, FII/DII |
| Screener UI | 3 | Filter + results |
| Watchlist UI | 2 | Add/remove/alerts |
| Portfolio UI | 2 | Holdings + P&L |
| News feed UI | 2 | Scrolling news |
| Stock detail page | 3 | Full stock view |

#### Week 7-8: Polish & Launch

| Task | Days | Deliverable |
|------|------|-------------|
| Razorpay integration | 2 | Payments working |
| Email notifications | 1 | Transactional emails |
| Error handling | 2 | Graceful errors |
| Performance optimization | 2 | <2s page loads |
| Beta testing | 3 | 50 beta users |
| Bug fixes | 3 | Stable product |
| Public launch | 1 | Go live |

**MVP Exit Criteria**:
- [ ] 100 beta users onboarded
- [ ] <2s page load time
- [ ] <0.1% error rate
- [ ] 10 paying customers
- [ ] NPS > 30

### 5.4 Phase 2: Growth (Week 9-16)

| Feature | Weeks | Priority |
|---------|-------|----------|
| F&O Module (Option chain, OI, Greeks) | 9-10 | P1 |
| Mobile App (Flutter) | 10-13 | P1 |
| FII/DII detailed tracking | 11 | P1 |
| Bulk/Block deal alerts | 11 | P1 |
| Insider trading alerts | 12 | P1 |
| Basic backtesting | 13-14 | P2 |
| AI analysis integration | 14-15 | P1 |
| Broker integration (Zerodha/FYERS) | 15-16 | P2 |

### 5.5 Phase 3: Scale (Week 17-24)

| Feature | Weeks | Priority |
|---------|-------|----------|
| Behavioral guardrails (FOMO/panic alerts) | 17-18 | P1 |
| Telegram bot | 18-19 | P1 |
| Push notifications | 19 | P1 |
| Community features | 20-21 | P2 |
| Advanced AI (Claude integration) | 21-22 | P1 |
| Strategy builder | 22-24 | P2 |

---

## Part 6: Go-to-Market Strategy

### 6.1 Launch Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      GO-TO-MARKET FUNNEL                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                         ┌─────────────────┐                             │
│                         │   AWARENESS     │                             │
│                         │   (100K reach)  │                             │
│                         └────────┬────────┘                             │
│                                  │                                      │
│  Channels:                       ▼                                      │
│  • YouTube (Finfluencers)  ┌─────────────────┐                         │
│  • Reddit (ISB, II)        │   INTEREST      │                         │
│  • Twitter/X               │   (20K visits)  │                         │
│  • SEO (long-tail)         └────────┬────────┘                         │
│  • Telegram communities            │                                    │
│                                    ▼                                    │
│                            ┌─────────────────┐                         │
│  Conversion:               │  SIGNUP (FREE)  │                         │
│  • Free tier (generous)    │   (5K users)    │                         │
│  • No credit card needed   └────────┬────────┘                         │
│                                     │                                   │
│                                     ▼                                   │
│                            ┌─────────────────┐                         │
│  Activation:               │    ACTIVE       │                         │
│  • Onboarding flow         │   (2K users)    │                         │
│  • Daily digest email      └────────┬────────┘                         │
│  • First signal moment             │                                    │
│                                    ▼                                    │
│                            ┌─────────────────┐                         │
│  Monetization:             │     PAID        │                         │
│  • Hit watchlist limit     │  (500 users)    │                         │
│  • Need advanced features  └─────────────────┘                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Distribution Channels

| Channel | Strategy | Target | Cost |
|---------|----------|--------|------|
| **YouTube** | Partner with 5-10 finfluencers for reviews | 50K views | ₹50K-2L |
| **Reddit** | Organic posts in ISB, II (genuine value) | 5K signups | Free |
| **Twitter/X** | Daily market insights, engage with FinTwit | 10K followers | Free |
| **Telegram** | Bot + Channel with free signals | 10K subscribers | Free |
| **SEO** | Target "stock screener India", "FII DII data" | 20K/month organic | ₹20K/month |
| **Product Hunt** | India-specific launch | 1K signups | Free |

### 6.3 Content Strategy

**Daily Content**:
- Morning market prep (Twitter thread)
- EOD summary (Telegram)
- Top signals of the day

**Weekly Content**:
- FII/DII flow analysis
- Sector rotation insights
- "Stock of the week" deep dive

**Monthly Content**:
- Market outlook report
- Alternative data insights (GST, UPI trends)
- User success stories

---

## Part 7: Revenue Model

### 7.1 Pricing Tiers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRICING STRUCTURE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │      FREE        │  │       PRO        │  │     PREMIUM      │      │
│  │      ₹0          │  │   ₹499/month     │  │   ₹999/month     │      │
│  │                  │  │   ₹4,999/year    │  │   ₹9,999/year    │      │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤      │
│  │                  │  │                  │  │                  │      │
│  │ • 10 watchlist   │  │ • 50 watchlist   │  │ • Unlimited      │      │
│  │ • Basic screener │  │ • Full screener  │  │   watchlist      │      │
│  │ • EOD data       │  │ • Real-time data │  │ • All Pro +      │      │
│  │ • News feed      │  │ • FII/DII alerts │  │ • F&O analytics  │      │
│  │ • 1 portfolio    │  │ • Bulk deal      │  │ • Backtesting    │      │
│  │                  │  │   alerts         │  │ • AI analysis    │      │
│  │                  │  │ • 5 portfolios   │  │ • API access     │      │
│  │                  │  │ • Email alerts   │  │ • Priority       │      │
│  │                  │  │                  │  │   support        │      │
│  │                  │  │                  │  │ • Telegram bot   │      │
│  │                  │  │                  │  │                  │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│                                                                         │
│  TARGET: 70% Free | 20% Pro | 10% Premium                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Revenue Projections

| Month | Free Users | Pro | Premium | MRR | ARR |
|-------|------------|-----|---------|-----|-----|
| 1 | 1,000 | 50 | 10 | ₹35K | ₹4.2L |
| 3 | 5,000 | 250 | 50 | ₹175K | ₹21L |
| 6 | 20,000 | 1,000 | 200 | ₹700K | ₹84L |
| 12 | 100,000 | 4,000 | 1,000 | ₹30L | ₹3.6Cr |

### 7.3 Unit Economics

```
Customer Acquisition Cost (CAC):
- Organic: ₹0-50
- Paid (YouTube): ₹200-500
- Blended: ₹100

Lifetime Value (LTV):
- Pro: ₹499 × 12 months = ₹6,000
- Premium: ₹999 × 18 months = ₹18,000
- Blended (at 70/20/10): ₹3,600

LTV/CAC Ratio: 36x (Excellent)

Gross Margin: ~85% (SaaS)
```

---

## Part 8: Team & Resources

### 8.1 Founding Team Requirements

| Role | Responsibility | When to Hire |
|------|----------------|--------------|
| **Founder (You)** | Product, strategy, initial dev | Now |
| **Backend Developer** | APIs, data pipeline, infra | Phase 1 |
| **Frontend Developer** | Web + Mobile UI | Phase 1 |
| **Data Engineer** | Collectors, quality, ML | Phase 2 |
| **Designer** | UI/UX, branding | Phase 1 (contract) |
| **Growth Marketer** | Content, SEO, partnerships | Phase 2 |

### 8.2 Budget Estimate (Year 1)

| Category | Monthly | Annual |
|----------|---------|--------|
| **Infrastructure** | | |
| - AWS/Cloud | ₹30,000 | ₹3.6L |
| - Database (managed) | ₹10,000 | ₹1.2L |
| - APIs (Twitter, etc.) | ₹15,000 | ₹1.8L |
| **Team** | | |
| - Backend Dev (contract) | ₹80,000 | ₹9.6L |
| - Frontend Dev (contract) | ₹70,000 | ₹8.4L |
| - Designer (part-time) | ₹30,000 | ₹3.6L |
| **Marketing** | | |
| - Content creation | ₹20,000 | ₹2.4L |
| - Influencer partnerships | ₹50,000 | ₹6L |
| - SEO/tools | ₹10,000 | ₹1.2L |
| **Operations** | | |
| - Legal/compliance | ₹10,000 | ₹1.2L |
| - Tools (GitHub, etc.) | ₹5,000 | ₹60K |
| **Total** | **₹3.3L** | **₹39.6L** |

### 8.3 Milestones & Funding

| Milestone | Timeline | Funding Need |
|-----------|----------|--------------|
| MVP Launch | Month 2 | Bootstrapped (₹5L) |
| 1,000 paid users | Month 6 | Bootstrapped |
| 5,000 paid users | Month 12 | Consider seed (₹50L-1Cr) |
| 20,000 paid users | Month 24 | Series A potential |

---

## Part 9: Risk Mitigation

### 9.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| NSE blocks scraping | Medium | High | Use broker APIs as backup, rotate IPs |
| Data quality issues | High | Medium | Multiple sources, validation checks |
| Scaling issues | Medium | Medium | Design for scale from day 1 |
| API rate limits | High | Low | Caching, queuing, multiple accounts |

### 9.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low conversion to paid | Medium | High | Strong free tier, clear upgrade path |
| Competition launches similar | High | Medium | Speed to market, community moat |
| SEBI regulations tighten | Low | High | Stay compliant, no recommendations |
| User churn | Medium | Medium | Engagement features, habit formation |

### 9.3 Legal & Compliance

| Requirement | Status | Action |
|-------------|--------|--------|
| SEBI IA/RA registration | Not needed for screener | Monitor regulatory changes |
| Data redistribution | Requires licensing | Use free APIs, partner with vendors |
| Privacy (DPDPA) | Required | Implement consent, data handling |
| Terms of Service | Required | Draft before launch |

---

## Part 10: Success Metrics

### 10.1 KPIs by Phase

**Phase 1 (MVP)**:
- [ ] 5,000 signups
- [ ] 500 DAU
- [ ] 50 paid users
- [ ] <2s page load
- [ ] <1% error rate

**Phase 2 (Growth)**:
- [ ] 25,000 signups
- [ ] 2,500 DAU
- [ ] 500 paid users
- [ ] 4.0+ app store rating
- [ ] NPS > 40

**Phase 3 (Scale)**:
- [ ] 100,000 signups
- [ ] 10,000 DAU
- [ ] 5,000 paid users
- [ ] ₹25L MRR
- [ ] <5% monthly churn

### 10.2 North Star Metric

> **"Signals Acted Upon"**
> 
> Number of signals that users marked as "reviewed" or "traded"
> 
> This measures real value delivered, not vanity metrics.

---

## Appendix A: Immediate Next Steps

### Week 1 Actions

| Day | Task | Output |
|-----|------|--------|
| 1 | Set up GitHub repo with proper structure | Repo ready |
| 1 | Configure CI/CD with GitHub Actions | Auto-deploy working |
| 2 | Set up Railway/AWS with PostgreSQL | DB running |
| 2 | Implement NSE data collector | First data flowing |
| 3 | Implement news RSS aggregator | News in DB |
| 3 | Basic FastAPI skeleton | API returning data |
| 4 | Auth system (JWT) | Login working |
| 4 | User + Watchlist models | CRUD working |
| 5 | Next.js project setup | Frontend skeleton |
| 5 | Landing page design | Marketing page live |

### Quick Wins (This Week)

1. **Deploy your existing `collect_data.py`** for Indian sources
2. **Set up Telegram bot** for daily market summary
3. **Create Twitter account** and start posting insights
4. **Post on Reddit** (r/IndianStreetBets) about what you're building

---

## Appendix B: Competitive Analysis Summary

| Competitor | Strength | Weakness | Our Advantage |
|------------|----------|----------|---------------|
| Screener.in | Deep fundamentals | No technicals | All-in-one |
| ChartInk | Technical scanning | No backtesting | Full backtesting |
| Trendlyne | DVM scoring | Expensive, complex | Simpler, cheaper |
| Sensibull | Options analytics | Only F&O | Full market coverage |
| Tijori | Alternative data | Limited free tier | More generous free |
| TradingView | Best charts | No Indian context | India-first |

---

## Appendix C: Key Contacts & Resources

### Data Providers (for future licensing)
- NSE Data: dataproducts@nse.co.in
- BSE Data: dataservices@bseindia.com
- GlobalDataFeeds: sales@dogsoftwaresolutions.com
- TrueData: support@truedata.in

### Potential Partners
- Zerodha Rainmatter (incubator)
- Y Combinator (startup school)
- Indian Angel Network

### Learning Resources
- NSE Academy courses
- SEBI Investor Education
- Kite Connect documentation

---

**Document End**

*This is a living document. Update as the project evolves.*

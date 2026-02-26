# FinSight Architecture

## System Overview

FinSight follows a four-layer pipeline architecture designed for computational accessibility — every component runs on consumer hardware without GPU requirements.

```
                            FinSight India — System Architecture

  ┌──────────────────────────────────────────────────────────────────────────────┐
  │                              DATA LAYER                                     │
  │                                                                              │
  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │
  │  │ Zerodha Kite │  │  25+ RSS     │  │  Reddit API  │  │ SEBI / Macro   │   │
  │  │ Connect API  │  │  News Feeds  │  │  Sentiment   │  │ Regulatory     │   │
  │  │              │  │              │  │              │  │                │   │
  │  │ • OHLCV      │  │ • ET Markets │  │ • r/Indian   │  │ • FII/DII      │   │
  │  │ • Live tick  │  │ • Moneyctrl  │  │   StreetBets │  │   flows        │   │
  │  │ • Historical │  │ • Mint       │  │ • r/India    │  │ • RBI data     │   │
  │  │ • Option     │  │ • Bus Std    │  │   Investments│  │ • SEBI filings │   │
  │  │   chain      │  │ • LiveMint   │  │              │  │                │   │
  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘   │
  │         │                 │                  │                  │            │
  └─────────┼─────────────────┼──────────────────┼──────────────────┼────────────┘
            │                 │                  │                  │
            ▼                 ▼                  ▼                  ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │                           DETECTION LAYER                                   │
  │                                                                              │
  │  Z-Score Anomaly Detection Engine                                           │
  │                                                                              │
  │  For each stock in watchlist:                                                │
  │                                                                              │
  │    Dimension 1: VOLUME SPIKE                                                │
  │    Z_vol = (today_volume - μ_20d_volume) / σ_20d_volume                     │
  │                                                                              │
  │    Dimension 2: PRICE MOMENTUM                                              │
  │    Z_price = (today_return - μ_20d_return) / σ_20d_return                   │
  │                                                                              │
  │    Dimension 3: VOLATILITY SURGE                                            │
  │    Z_volatility = (today_range - μ_20d_range) / σ_20d_range                 │
  │                                                                              │
  │  Severity Classification:                                                   │
  │    |Z| > 2.0 → LOW    |Z| > 2.5 → MEDIUM                                  │
  │    |Z| > 3.0 → HIGH   |Z| > 4.0 → CRITICAL                                │
  │                                                                              │
  │  Output: Anomaly signals with dimension, Z-score, severity, timestamp       │
  └──────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │                        TRIANGULATION LAYER                                   │
  │                                                                              │
  │  Multi-Source Cross-Validation:                                              │
  │                                                                              │
  │  1. Signal generated → check other dimensions                               │
  │     (volatility anomaly + volume anomaly = stronger signal)                  │
  │                                                                              │
  │  2. News Context Enrichment                                                 │
  │     Match anomaly timestamp against RSS feed items                          │
  │     Flag: earnings, board meetings, regulatory actions, sector events       │
  │                                                                              │
  │  3. Social Sentiment Cross-Reference                                        │
  │     Check Reddit discussion volume and sentiment around flagged stocks      │
  │                                                                              │
  │  4. False Positive Filtering                                                │
  │     Discard signals with clear non-anomalous explanations                   │
  │     (e.g., known dividend dates, stock splits)                              │
  │                                                                              │
  │  5. Explainability Generation                                               │
  │     Rule-based reasoning chain explaining WHY the signal was generated      │
  │     "Volume Z=3.2 + Volatility Z=5.44 + No scheduled corporate action      │
  │      → Unusual institutional positioning detected"                          │
  └──────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │                          DELIVERY LAYER                                      │
  │                                                                              │
  │  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐         │
  │  │  FastAPI Backend │  │  PostgreSQL DB   │  │  Next.js Frontend   │         │
  │  │                  │  │                  │  │                     │         │
  │  │  • REST API      │  │  • Signal store  │  │  • Dashboard        │         │
  │  │  • WebSocket     │  │  • User prefs    │  │  • Signal cards     │         │
  │  │    (live alerts) │  │  • Historical    │  │  • Severity filters │         │
  │  │  • Auth          │  │    anomalies     │  │  • Explainability   │         │
  │  │                  │  │  • News cache    │  │    panel            │         │
  │  └─────────────────┘  └──────────────────┘  └─────────────────────┘         │
  └──────────────────────────────────────────────────────────────────────────────┘
```

## Design Principles

**1. Computational Accessibility**
Every component must run on hardware a retail trader can afford. No GPU requirements. No cloud-only dependencies in the core pipeline.

**2. Statistical Rigor**
Z-scores have established academic precedent (Montgomery, 2009). The methodology is transparent, reproducible, and interpretable without statistical expertise.

**3. Multi-Dimensional Detection**
Single-metric screening misses anomalies visible only across multiple dimensions. The HDFCBANK case (Feb 3, 2026) demonstrated this: price (+2.22%) and volume (1.5x) were unremarkable, but volatility (Z=5.44) was extreme.

**4. Transparent Reasoning**
Every alert includes a rule-based explanation of why it was generated. This is a design choice motivated by the theoretical framework: if processing asymmetry is the problem, the solution must be interpretable, not a black box.

## Database Schema

```sql
-- Core tables
stocks          -- Stock master data (symbol, name, exchange, sector)
market_data     -- Daily OHLCV data from Kite API
anomaly_signals -- Detected anomalies with Z-scores and severity
news_items      -- Aggregated news from RSS feeds
reddit_posts    -- Reddit sentiment data
signal_context  -- Triangulated context for each anomaly signal

-- Indexes optimized for:
--   Time-range queries on market_data (rolling window computation)
--   Stock + date lookups on anomaly_signals (dashboard queries)
--   Timestamp-based news matching (context enrichment)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/signals` | List anomaly signals with filters |
| GET | `/api/signals/{id}` | Signal detail with context |
| GET | `/api/stocks/{symbol}/history` | Historical data for a stock |
| GET | `/api/stocks/{symbol}/anomalies` | All anomalies for a stock |
| POST | `/api/detection/run` | Trigger detection pipeline |
| GET | `/api/news` | Aggregated news feed |
| GET | `/api/health` | System health check |

## Deployment Architecture (Planned)

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Vercel  │────▶│ Railway  │────▶│ Supabase │
│ Frontend │     │ Backend  │     │ Postgres │
│ Next.js  │     │ FastAPI  │     │          │
└──────────┘     └──────────┘     └──────────┘
                       │
                 ┌─────┴──────┐
                 │  Scheduler │
                 │  (cron)    │
                 │  Detection │
                 │  pipeline  │
                 └────────────┘
```

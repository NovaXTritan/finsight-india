# FinSight AI Agent

AI-powered market anomaly detection that learns which signals actually matter.

## Quick Start

```bash
# 1. Start database
docker-compose up -d

# 2. Setup environment
cp .env.example .env

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start LM Studio (load model, start server on port 1234)

# 5. Run detector
python run.py

# 6. Validate outcomes
python tools/manual_validator.py

# 7. View dashboard
streamlit run tools/dashboard.py
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   yfinance   │  │ Alpha Vantage│  │  Twelve Data │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         └─────────────────┼─────────────────┘                   │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Smart Data Fetcher                          │  │
│  │         (Free tier combo + fallback logic)               │  │
│  └──────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DETECTION LAYER                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Z-Score   │  │    EWMA    │  │  Isolation │                │
│  │  Detector  │  │  Detector  │  │   Forest   │                │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘                │
│        └───────────────┼───────────────┘                        │
│                        ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Ensemble Detector                           │  │
│  │            (Voting + Severity Scoring)                   │  │
│  └──────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DECISION LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              LM Studio Agent (Local LLM)                 │  │
│  │                                                          │  │
│  │   Input: anomaly + context + user history                │  │
│  │   Output: IGNORE | REVIEW | ALERT                        │  │
│  │                                                          │  │
│  │   Rules:                                                 │  │
│  │   - IGNORE: Pattern failed >70% historically             │  │
│  │   - REVIEW: Uncertain, worth checking                    │  │
│  │   - ALERT: High confidence + high historical accuracy    │  │
│  └──────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LEARNING LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Outcome Tracker                             │  │
│  │                                                          │  │
│  │   Tracks: 15m, 1h, 4h, 1d returns after each anomaly     │  │
│  │   Records: Agent decision vs User action vs Outcome      │  │
│  │   Updates: Pattern quality scores per user               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Differentiator

Not fancy architecture - but **outcome tracking**.

We track what happens after each signal:
- Did user review it?
- Did user trade it?
- Was it profitable?

This creates a learning loop that improves signal quality over time.

## Budget: Rs 5,000

- Free tier APIs (Alpha Vantage, Twelve Data, yfinance)
- Local LLM via LM Studio (FREE)
- TimescaleDB (self-hosted, FREE)
- 5 symbols initially

## License

MIT

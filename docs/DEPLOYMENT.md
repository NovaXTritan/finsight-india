# Deployment Guide

## Current Status

FinSight is a **proof-of-concept** that currently runs locally. This guide documents both the local setup and the planned cloud deployment path.

## Local Development Setup

### Prerequisites

| Requirement | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Backend runtime |
| Node.js | 18+ | Frontend runtime |
| PostgreSQL | 15+ | Data storage |
| Zerodha Kite | API v3 | Market data (requires Kite Connect subscription) |

### Step 1: Clone & Configure

```bash
git clone https://github.com/NovaXTritan/finsight-india.git
cd finsight-india

# Copy environment template
cp .env.example .env
# Edit .env with your credentials (see Environment Variables below)
```

### Step 2: Database Setup

```bash
# Create PostgreSQL database
createdb finsight

# Or via psql:
psql -c "CREATE DATABASE finsight;"
```

### Step 3: Backend

```bash
python -m venv venv
source venv/bin/activate

pip install -r requirements.txt

# Start API server
uvicorn api.main:app --reload --port 8000
```

### Step 4: Frontend

```bash
cd frontend
npm install
npm run dev
# Dashboard available at http://localhost:3000
```

### Step 5: Run Detection

```bash
# Detect anomalies for NIFTY 50 stocks
python -m detection.real_detector

# Specific stocks
python -m detection.real_detector --stocks HDFCBANK RELIANCE TCS INFY HINDUNILVR
```

## Environment Variables

Create a `.env` file with:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/finsight

# Zerodha Kite Connect
KITE_API_KEY=your_api_key
KITE_API_SECRET=your_api_secret
KITE_ACCESS_TOKEN=your_access_token

# Reddit API (optional — for social sentiment)
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret

# LLM (optional — for contextualizer)
# Currently uses LM Studio locally; cloud alternatives planned
LLM_BASE_URL=http://localhost:1234/v1
LLM_MODEL=local-model

# Application
APP_ENV=development
API_PORT=8000
FRONTEND_URL=http://localhost:3000
```

## Cloud Deployment (Planned)

### Target Architecture

| Service | Provider | Purpose | Est. Cost |
|---------|----------|---------|-----------|
| Backend | Railway | FastAPI hosting | ~$5/month |
| Frontend | Vercel | Next.js hosting | Free tier |
| Database | Supabase | PostgreSQL | Free tier (500MB) |
| Scheduler | Railway cron | Automated detection | Included |

### Migration Steps

1. **Database:** Create Supabase project → get connection string → replace `DATABASE_URL`
2. **Backend:** Push to Railway → set env vars → deploy
3. **Frontend:** Push to Vercel → set `NEXT_PUBLIC_API_URL` to Railway URL
4. **Scheduler:** Add cron job on Railway to run detection pipeline daily at market close (3:35 PM IST)
5. **LLM:** Replace LM Studio dependency with API-based LLM (Anthropic Claude API or similar)

### Known Deployment Blockers

| Blocker | Severity | Fix Time |
|---------|----------|----------|
| LM Studio dependency (local only) | Hard | Replace with cloud LLM API — 2-3 hours |
| No automated scheduler | Hard | Add cron configuration — 30 min |
| Frontend TypeScript error in backtest/page.tsx | Soft | Fix type error — 5 min |
| Missing brotli package for NSE API | Soft | `pip install brotli` — 2 min |

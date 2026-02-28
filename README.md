# FinSight India

**AI-Powered Market Intelligence for India's Retail Derivatives Traders**

[![IMSICON 2026](https://img.shields.io/badge/Conference-IMSICON%202026-blue)](https://github.com/NovaXTritan/finsight-india)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)

---

**Paper:** *Bridging the Algorithmic Divide: Processing Asymmetry, Technology Artifacts, and Dual-Pillar Policy for India's Retail Derivatives Traders*

**Authors:** Divyanshu & Prof. Sanjeev Sharma, Christ University, Delhi NCR

**Core Argument:** 93% of individual F&O traders in India lost money between FY22–FY24, while 97% of FPI derivatives order value is algorithmically executed (SEBI, 2024). The performance gap is driven not by information access — which SEBI mandates — but by *processing asymmetry*: unequal computational capability to analyze publicly available data. FinSight is a proof-of-concept artifact demonstrating that institutional-grade anomaly detection can be delivered at retail price points using statistically rigorous but computationally accessible methods.

---

## The Problem

India's equity derivatives market exhibits a structural imbalance:

| Metric | Value | Source |
|--------|-------|--------|
| Individual F&O trader loss rate | 93% | SEBI (2024) |
| Aggregate retail losses (FY22–FY24) | ₹1.81 Lakh Crore | SEBI (2024) |
| FPI algorithmic execution share | ~97% of order value | SEBI (2024) |
| Retail traders earning < ₹5L/year | 75% | SEBI (2024) |
| Post-reform loss increase (FY25) | ↑41% to ₹1.06L Cr | SEBI PR 39/2025 |

Existing retail tools (Screener.in, ChartInk, Sensibull) use threshold-based screening across individual metrics. No retail-accessible Indian platform combines multi-dimensional statistical anomaly detection with transparent reasoning at zero cost.

---

## What FinSight Does

FinSight runs **Z-score anomaly detection across three dimensions simultaneously** — price momentum, volume spike, and volatility surge — using a 20-day rolling window. When a stock exhibits statistically extreme behavior in *any* dimension, the system generates a severity-classified alert with contextual news enrichment and transparent reasoning.

### Detection Methodology

```
Z = (Observed - μ) / σ

Where:
  μ = 20-day rolling mean
  σ = 20-day rolling standard deviation
  Threshold: |Z| > 2.0 triggers alert
```

**Severity Classification:**

| Level | Z-Score Range | Interpretation |
|-------|--------------|----------------|
| LOW | 2.0 – 2.5 | Notable deviation |
| MEDIUM | 2.5 – 3.0 | Significant anomaly |
| HIGH | 3.0 – 4.0 | Rare event |
| CRITICAL | > 4.0 | Extreme outlier |

**Why Z-scores instead of ML?** The method choice *is* the thesis. Deep learning requires GPU infrastructure and cloud computing costs that replicate the processing asymmetry problem at the tool level. Z-scores are computationally executable on any device, statistically interpretable without ML expertise, and have established precedent in anomaly detection (Montgomery, 2009).

### Verified Signal Examples (February 2026)

**HDFCBANK — Feb 3, 2026 (Z = 5.44, CRITICAL)**
- Price change: +2.22% — unremarkable, invisible to conventional screeners
- Volume: 1.5x average — unremarkable
- Volatility: Day range 3.2x the 20-day average — extreme outlier
- Outcome: Elevated volatility persisted over subsequent sessions
- All data independently verified via Zerodha Kite Connect API and NSE records

**HINDUNILVR — Feb 6, 2026 (Z = 3.58, HIGH)**
- Price momentum Z-score flagged pre-earnings positioning
- Context: Q3 board meeting scheduled 6 days later (Feb 12)

---

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐    ┌────────────────┐
│   DATA LAYER    │───▶│  DETECTION       │───▶│  TRIANGULATION    │───▶│  DELIVERY      │
│                 │    │                  │    │                   │    │                │
│ • Zerodha Kite  │    │ • Z-Score Engine │    │ • Multi-source    │    │ • Next.js UI   │
│   Connect API   │    │ • 3 dimensions:  │    │   cross-validate  │    │ • FastAPI      │
│ • 25+ RSS feeds │    │   - Volume spike │    │ • News context    │    │ • PostgreSQL   │
│ • Reddit        │    │   - Price move   │    │   enrichment      │    │ • Explainability│
│ • SEBI filings  │    │   - Volatility   │    │ • False positive  │    │   layer        │
│ • Macro data    │    │ • 4-tier severity│    │   filtering       │    │ • ₹0/₹499/₹999│
└─────────────────┘    └──────────────────┘    └───────────────────┘    └────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI |
| Database | PostgreSQL |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Market Data | Zerodha Kite Connect API (real-time) |
| News | 25+ RSS feeds (ET, Moneycontrol, Mint, Business Standard) |
| Social Sentiment | Reddit API (r/IndianStreetBets, r/IndiaInvestments) |
| Analysis | NumPy, Pandas, SciPy (Z-score computation) |

---

## Project Structure

```
finsight-india/
├── detection/
│   ├── detector.py            # Core Z-score anomaly detection engine
│   ├── real_detector.py       # Production detector with DB integration
│   └── ...
├── data/
│   ├── india_fetcher.py       # NSE/Zerodha Kite API integration
│   ├── india_news.py          # RSS feed aggregation
│   └── ...
├── analysis/
│   ├── greeks.py              # Options Greeks analysis
│   └── ...
├── api/
│   ├── main.py                # FastAPI application entry point
│   ├── routes/                # API route handlers
│   └── core/                  # Auth, config, database
├── agents/
│   └── lm_studio_agent.py    # LLM-powered signal context
├── learning/
│   ├── adaptive.py            # Adaptive threshold tuning
│   └── causal_learner.py      # Outcome-based learning
├── backtesting/
│   ├── engine.py              # Strategy backtesting engine
│   └── metrics.py             # Performance metrics
├── frontend/
│   ├── app/                   # Next.js 14 app router
│   ├── components/            # React components
│   └── lib/                   # Utility functions
├── scripts/
│   ├── populate_stocks.py     # Database seeding
│   ├── start.bat              # Windows start script
│   └── stop.bat               # Windows stop script
├── docs/
│   ├── ARCHITECTURE.md        # Detailed system design
│   ├── METHODOLOGY.md         # Z-score methodology & academic basis
│   ├── DEPLOYMENT.md          # Setup & deployment guide
│   └── RESEARCH_CONTEXT.md    # Academic paper summary
├── .env.example               # Required environment variables
├── .gitignore
├── CITATION.cff               # Academic citation metadata
├── LICENSE                    # MIT License
└── README.md                  # This file
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Zerodha Kite Connect API credentials (for live market data)

### Backend Setup

```bash
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your database URL, Kite API credentials, etc.

# Start the API server
uvicorn api.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### Running Detection Pipeline

```bash
# Detect anomalies across NIFTY 50 stocks
python -m detection.real_detector

# With specific stocks
python -m detection.real_detector --stocks HDFCBANK RELIANCE TCS INFY
```

---

## Academic Framework

This artifact was developed following **Design Science Research** methodology (Hevner et al., 2004; Peffers et al., 2007).

### Theoretical Contribution: Processing Asymmetry

The paper proposes *processing asymmetry* as a distinct third category of information failure, extending:

| Category | Source | Core Problem |
|----------|--------|-------------|
| Classical Information Asymmetry | Akerlof (1970) | Unequal access to non-public information |
| Signalling | Spence (1973) | Unequal ability to communicate quality |
| **Processing Asymmetry** | **This study** | **Unequal capability to process public information** |

**Distinguishing test:** Processing asymmetry persists after full transparency (mandatory disclosure, public data) because the binding constraint is computational infrastructure, not information access.

**Falsifiability condition:** If providing retail participants with equivalent computational tools eliminates the performance gap relative to algorithmically-equipped institutions, the construct would be refuted.

### Policy Contribution: Dual-Pillar Framework

| Pillar | Approach | Status |
|--------|----------|--------|
| Pillar 1: Restriction | Higher contract sizes, margin requirements, reduced weekly expiries | SEBI implemented (Oct 2024) |
| Pillar 2: Capability Enhancement | Accessible analytical tools, technology-enabled processing | **Proposed by this study** |

**The Reform Paradox:** SEBI's October 2024 restrictions led to 20% fewer unique traders but a 41% increase in aggregate losses to ₹1.06L Cr in FY25 (SEBI PR 39/2025). Restriction reduces volume but does not improve outcomes — both pillars are needed simultaneously.

---

## Limitations & Honest Disclosure

This is a **proof-of-concept research artifact**, not a production trading system.

- **Signal validation** uses illustrative case studies with independently verifiable data, not systematic backtesting
- **Z-score methodology** assumes local stationarity within the 20-day rolling window — a common heuristic, not a distributional claim
- **No false positive rate** has been computed; no counterfactual analysis exists
- **The platform is not currently deployed** — detection requires manual pipeline execution
- **AI coding assistance** (Claude, Anthropic) was used for technical implementation; the author's contribution lies in problem identification, research design, system architecture, and academic framing

---

## Regulatory Compliance

FinSight is designed as a **risk awareness tool**, not a trade signal generator. It does not provide buy/sell recommendations.

SEBI's Research Analyst (Third Amendment) Regulations (December 16, 2024) have made RA registration accessible for graduates in finance/commerce/business management. The platform's explainability layer aligns with the new regulatory mandate for AI disclosure in research services.

---

## Citation

If you use this work in academic research, please cite:

```bibtex
@inproceedings{divyanshu2026bridging,
  title     = {Bridging the Algorithmic Divide: Processing Asymmetry, Technology
               Artifacts, and Dual-Pillar Policy for India's Retail Derivatives Traders},
  author    = {Divyanshu and Sharma, Sanjeev},
  booktitle = {Proceedings of IMSICON 2026, International Management Conference},
  year      = {2026},
  institution = {Christ University, Delhi NCR},
  note      = {Design Science Research methodology}
}
```

---

## Related Work

- SEBI (2024). *Updated study: 93% of individual traders incurred losses in equity F&O (FY22–FY24).* Press Release No. 22/2024.
- SEBI (2025). *Comparative study of EDS post-reform.* Press Release No. 39/2025.
- Ahmed, A. S., Li, Y., McMartin, A. S., & Xu, N. (2025). Algorithmic trading and stock price crash risk. *Journal of Accounting, Auditing & Finance.*
- Carlei, V., Furia, D., Cascioli, P., et al. (2026). AI-driven anomaly detection in stock markets. *Computational Economics.*
- IMF (2025). Regulatory considerations regarding accelerated use of AI in securities markets. *Technical Notes and Manuals, 2025/016.*

---

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

## Contact

**Divyanshu** — BBA Finance & Analytics, Christ University, Delhi NCR

For academic inquiries related to this research, please reach out via [LinkedIn](https://linkedin.com/in/yourprofile).

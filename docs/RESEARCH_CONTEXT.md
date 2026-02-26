# Research Context

## Paper Overview

**Title:** Bridging the Algorithmic Divide: Processing Asymmetry, Technology Artifacts, and Dual-Pillar Policy for India's Retail Derivatives Traders

**Conference:** IMSICON 2026, International Management Conference, Christ University, Delhi NCR

**Authors:** Divyanshu & Prof. Sanjeev Sharma

**Methodology:** Design Science Research (Hevner et al., 2004; Peffers et al., 2007)

## Research Questions

1. **RQ1:** Why do retail F&O traders in India lose money despite access to the same public information as institutional participants?
2. **RQ2:** Can a computationally accessible technology artifact reduce the processing gap between retail and institutional traders?
3. **RQ3:** What policy framework addresses both the volume and quality of retail market participation?

## How the Code Maps to the Paper

| Paper Section | Code Component | Location |
|--------------|----------------|----------|
| Theoretical Framework (Processing Asymmetry) | N/A — conceptual contribution | Paper only |
| Literature Review | N/A | Paper only |
| DSR Artifact — Data Layer | `data/india_fetcher.py`, `data/india_news.py` | `data/` |
| DSR Artifact — Detection Engine | `detection/detector.py`, `detection/real_detector.py` | `detection/` |
| DSR Artifact — Triangulation | `analysis/greeks.py`, `agents/lm_studio_agent.py` | `analysis/`, `agents/` |
| DSR Artifact — Delivery | FastAPI routes + Next.js frontend | `api/`, `frontend/` |
| Signal Validation (HDFCBANK case) | Detection output verified against Zerodha Kite Connect API | `detection/` |
| Policy Framework | N/A — policy contribution | Paper only |

## Key Data Sources

| Source | Used For | Access Method |
|--------|----------|--------------|
| SEBI (2024) — PR 22/2024 | 93% loss rate, aggregate losses | Manual (paper citation) |
| SEBI (2025) — PR 39/2025 | Reform paradox (FY25 data) | Manual (paper citation) |
| Zerodha Kite Connect API | Real-time OHLCV data | API integration in code |
| NSE/BSE | Historical stock data | API + web scraping |
| 25+ RSS news feeds | News context enrichment | RSS parser in code |
| Reddit API | Social sentiment | API integration in code |

## Design Science Research Mapping

Following Peffers et al. (2007) six-step process:

| DSR Step | This Project |
|----------|-------------|
| 1. Problem Identification | 93% retail F&O trader loss rate; processing asymmetry as root cause |
| 2. Objectives of Solution | Deliver multi-dimensional anomaly detection at ₹0 for retail tier |
| 3. Design & Development | Z-score engine across 3 dimensions + news enrichment + explainability |
| 4. Demonstration | HDFCBANK (Z=5.44) and HINDUNILVR (Z=3.58) case studies |
| 5. Evaluation | Illustrative case studies with independently verifiable data |
| 6. Communication | IMSICON 2026 conference presentation; this repository |

## Maturity Assessment

Per Hevner et al. (2004) DSR evaluation framework:

| Criterion | Status |
|-----------|--------|
| Novelty | Processing asymmetry as theoretical category; multi-dimensional Z-score at retail |
| Utility | Detects anomalies invisible to single-metric screeners (demonstrated) |
| Quality | Statistically grounded methodology; transparent reasoning |
| Efficacy | Proof-of-concept; systematic validation is future work |

## Transparency Disclosure

AI coding assistance (Claude, Anthropic) was used for technical implementation of the FinSight platform. The author's contribution lies in:

- Problem identification and market research
- Theoretical framework development (processing asymmetry)
- Research design and methodology selection
- System architecture decisions
- Academic framing and conference preparation
- Signal verification using independent data sources

This disclosure aligns with SEBI's December 2024 Research Analyst amendment requiring transparency about AI usage in research services.

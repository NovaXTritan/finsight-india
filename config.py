"""
FinSight Configuration
"""
import os
from pathlib import Path
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
import uuid

# =============================================================================
# ENVIRONMENT
# =============================================================================

# Load .env if exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# =============================================================================
# SETTINGS
# =============================================================================

# Market Selection: "US" or "INDIA"
MARKET = os.getenv("MARKET", "INDIA")

# Indian Stock Symbols (Nifty 50 top stocks) - use .NS suffix for Yahoo Finance
INDIA_SYMBOLS = [
    "RELIANCE.NS",    # Reliance Industries
    "TCS.NS",         # Tata Consultancy Services
    "HDFCBANK.NS",    # HDFC Bank
    "INFY.NS",        # Infosys
    "ICICIBANK.NS",   # ICICI Bank
    "HINDUNILVR.NS",  # Hindustan Unilever
    "SBIN.NS",        # State Bank of India
    "BHARTIARTL.NS",  # Bharti Airtel
    "KOTAKBANK.NS",   # Kotak Mahindra Bank
    "ITC.NS",         # ITC Limited
    "LT.NS",          # Larsen & Toubro
    "AXISBANK.NS",    # Axis Bank
    "ASIANPAINT.NS",  # Asian Paints
    "MARUTI.NS",      # Maruti Suzuki
    "TITAN.NS",       # Titan Company
    "BAJFINANCE.NS",  # Bajaj Finance
    "SUNPHARMA.NS",   # Sun Pharmaceutical
    "WIPRO.NS",       # Wipro
    "TATAMOTORS.NS",  # Tata Motors
    "HCLTECH.NS",     # HCL Technologies
]

# US Stock Symbols (for reference/fallback)
US_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "NVDA", "TSLA"]

# Active symbols based on market selection
SYMBOLS = INDIA_SYMBOLS if MARKET == "INDIA" else US_SYMBOLS

# User ID
USER_ID = os.getenv("USER_ID", "divyanshu")

# LM Studio
LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://localhost:1234/v1")
LM_STUDIO_MODEL = "local-model"
MAX_TOKENS = 200
TEMPERATURE = 0.3

# API Keys (free tiers)
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY", "demo")
TWELVE_DATA_KEY = os.getenv("TWELVE_DATA_KEY", "demo")

# Database
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/finsight"
)

# Detection Thresholds
DETECTION_THRESHOLDS = {
    "volume_spike": {
        "z_score": 3.0,
        "min_volume": 1_000_000,
        "min_data_points": 20
    },
    "price_momentum": {
        "z_score": 2.5,
        "min_change": 0.015,
        "min_data_points": 20
    },
    "volatility": {
        "z_score": 2.5,
        "min_data_points": 30
    }
}

# Outcome Tracking Intervals
OUTCOME_INTERVALS = [
    ("15m", 900),
    ("1h", 3600),
    ("4h", 14400),
    ("1d", 86400),
]

PROFITABLE_THRESHOLD = 0.005  # 0.5% return = profitable
USER_ACTION_TIMEOUT = 3600  # 1 hour to log action

# Paths
BASE_DIR = Path(__file__).parent
LOG_DIR = BASE_DIR / "logs"
DATA_DIR = BASE_DIR / "data_cache"

LOG_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = LOG_DIR / "finsight.log"

# =============================================================================
# INDIAN MARKET CONFIGURATION
# =============================================================================

# Indian Market Indices (Yahoo Finance symbols)
INDIA_INDICES = {
    "NIFTY50": "^NSEI",
    "SENSEX": "^BSESN",
    "BANKNIFTY": "^NSEBANK",
    "NIFTYIT": "^CNXIT",
    "INDIAVIX": "^INDIAVIX",
}

# NSE API Endpoints (for direct data fetching)
NSE_BASE_URL = "https://www.nseindia.com"
NSE_API_ENDPOINTS = {
    "indices": "/api/allIndices",
    "nifty50": "/api/equity-stockIndices?index=NIFTY%2050",
    "fii_dii": "/api/fiidiiTradeReact",
    "option_chain_nifty": "/api/option-chain-indices?symbol=NIFTY",
    "option_chain_banknifty": "/api/option-chain-indices?symbol=BANKNIFTY",
    "market_status": "/api/marketStatus",
    "advances_declines": "/api/market-data-pre-open?key=ALL",
    "bulk_deals": "/api/snapshot-capital-market-largedeal",
    "block_deals": "/api/block-deal",
    "corporate_actions": "/api/corporates-corporateActions?index=equities",
    "board_meetings": "/api/corporate-board-meetings?index=equities",
}

# Indian News RSS Feeds
INDIA_NEWS_FEEDS = [
    # Major Financial Publications
    {"name": "Economic Times Markets", "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", "priority": 1},
    {"name": "Economic Times Stocks", "url": "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms", "priority": 1},
    {"name": "Moneycontrol News", "url": "https://www.moneycontrol.com/rss/latestnews.xml", "priority": 1},
    {"name": "Moneycontrol Markets", "url": "https://www.moneycontrol.com/rss/marketreports.xml", "priority": 1},
    {"name": "Livemint Markets", "url": "https://www.livemint.com/rss/markets", "priority": 1},
    {"name": "Business Standard Markets", "url": "https://www.business-standard.com/rss/markets-106.rss", "priority": 2},
    {"name": "Financial Express", "url": "https://www.financialexpress.com/market/feed/", "priority": 2},
    {"name": "Hindu Business Line", "url": "https://www.thehindubusinessline.com/markets/?service=rss", "priority": 2},
    # Community/Analysis
    {"name": "ValuePickr Forum", "url": "https://forum.valuepickr.com/latest.rss", "priority": 3},
    {"name": "TradingQnA", "url": "https://tradingqna.com/latest.rss", "priority": 3},
]

# Indian Market Hours (IST)
INDIA_MARKET_HOURS = {
    "pre_open_start": "09:00",
    "pre_open_end": "09:15",
    "market_open": "09:15",
    "market_close": "15:30",
    "post_close_end": "16:00",
    "timezone": "Asia/Kolkata",
}

# Symbol mapping: Clean name -> Yahoo Finance symbol
INDIA_SYMBOL_MAP = {
    "RELIANCE": "RELIANCE.NS",
    "TCS": "TCS.NS",
    "HDFCBANK": "HDFCBANK.NS",
    "INFY": "INFY.NS",
    "ICICIBANK": "ICICIBANK.NS",
    "HINDUNILVR": "HINDUNILVR.NS",
    "SBIN": "SBIN.NS",
    "BHARTIARTL": "BHARTIARTL.NS",
    "KOTAKBANK": "KOTAKBANK.NS",
    "ITC": "ITC.NS",
    "LT": "LT.NS",
    "AXISBANK": "AXISBANK.NS",
    "ASIANPAINT": "ASIANPAINT.NS",
    "MARUTI": "MARUTI.NS",
    "TITAN": "TITAN.NS",
    "BAJFINANCE": "BAJFINANCE.NS",
    "SUNPHARMA": "SUNPHARMA.NS",
    "WIPRO": "WIPRO.NS",
    "TATAMOTORS": "TATAMOTORS.NS",
    "HCLTECH": "HCLTECH.NS",
}

# =============================================================================
# ENUMS
# =============================================================================

class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Decision(str, Enum):
    IGNORE = "IGNORE"
    REVIEW = "REVIEW"
    ALERT = "ALERT"

class UserAction(str, Enum):
    IGNORED = "ignored"
    REVIEWED = "reviewed"
    TRADED = "traded"

# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class Anomaly:
    """Detected market anomaly."""
    id: str
    symbol: str
    type: str
    severity: Severity
    z_score: float
    price: float
    volume: int
    detected_at: datetime
    description: str = ""
    
    @classmethod
    def create(cls, symbol: str, type: str, severity: Severity, 
               z_score: float, price: float, volume: int, 
               description: str = "") -> "Anomaly":
        return cls(
            id=f"{symbol}_{type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}",
            symbol=symbol,
            type=type,
            severity=severity,
            z_score=z_score,
            price=price,
            volume=volume,
            detected_at=datetime.now(),
            description=description
        )

@dataclass
class AgentDecision:
    """Decision made by the AI agent."""
    action: Decision
    confidence: float
    reason: str
    risk_if_ignored: str = "low"

@dataclass
class PatternQuality:
    """Quality metrics for a pattern type."""
    pattern_type: str
    symbol: str
    accuracy: float = 0.0
    review_rate: float = 0.0
    trade_rate: float = 0.0
    avg_return: float = 0.0
    sample_size: int = 0
    agent_accuracy: float = 0.0

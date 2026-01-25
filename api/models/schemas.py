"""
API Models - Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date as DateType


# =============================================================================
# AUTH
# =============================================================================

class UserRegister(BaseModel):
    """Registration request."""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    name: str = Field(..., min_length=2, max_length=100)


class UserLogin(BaseModel):
    """Login request."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Seconds until expiration")


class UserProfile(BaseModel):
    """User profile response."""
    id: str
    email: str
    name: str
    tier: str
    created_at: datetime
    watchlist_count: int = 0
    tier_limit: int = 5


# =============================================================================
# WATCHLIST
# =============================================================================

class WatchlistAdd(BaseModel):
    """Add symbol to watchlist."""
    symbol: str = Field(..., min_length=1, max_length=10, description="Stock symbol")


class WatchlistResponse(BaseModel):
    """Watchlist response."""
    symbols: List[str]
    count: int
    limit: int


# =============================================================================
# SIGNALS
# =============================================================================

class Signal(BaseModel):
    """Individual signal/anomaly."""
    id: str
    symbol: str
    pattern_type: str
    severity: str
    z_score: float
    price: float
    volume: int
    detected_at: datetime
    agent_decision: Optional[str] = None
    agent_confidence: Optional[float] = None
    agent_reason: Optional[str] = None
    context: Optional[str] = None
    sources: Optional[str] = None
    thought_process: Optional[str] = None


class SignalList(BaseModel):
    """Paginated signal list."""
    signals: List[Signal]
    total: int
    page: int
    per_page: int
    has_more: bool


class SignalAction(BaseModel):
    """User action on a signal."""
    action: str = Field(..., pattern="^(ignored|reviewed|traded)$")
    notes: Optional[str] = Field(None, max_length=500)


# =============================================================================
# STATS
# =============================================================================

class UserStats(BaseModel):
    """User statistics."""
    watchlist_count: int
    signals_30d: int
    actions_total: int
    tier: str
    tier_limit: int


# =============================================================================
# GENERIC
# =============================================================================

class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    """Error response."""
    detail: str
    code: Optional[str] = None


# =============================================================================
# PORTFOLIO
# =============================================================================

class HoldingCreate(BaseModel):
    """Create a new holding."""
    symbol: str = Field(..., min_length=1, max_length=20)
    quantity: int = Field(..., gt=0, description="Number of shares")
    avg_price: float = Field(..., gt=0, description="Average purchase price")
    notes: Optional[str] = Field(None, max_length=500)


class HoldingUpdate(BaseModel):
    """Update an existing holding."""
    quantity: Optional[int] = Field(None, gt=0)
    avg_price: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = Field(None, max_length=500)


class Holding(BaseModel):
    """Portfolio holding with current market data."""
    id: int
    symbol: str
    quantity: int
    avg_price: float
    invested_value: float
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    gain_loss: Optional[float] = None
    gain_loss_pct: Optional[float] = None
    day_change: Optional[float] = None
    day_change_pct: Optional[float] = None
    notes: Optional[str] = None
    updated_at: datetime


class HoldingList(BaseModel):
    """List of holdings with portfolio summary."""
    holdings: List[Holding]
    total_invested: float
    total_current_value: float
    total_gain_loss: float
    total_gain_loss_pct: float
    day_change: float
    day_change_pct: float


class TransactionCreate(BaseModel):
    """Create a new transaction."""
    symbol: str = Field(..., min_length=1, max_length=20)
    type: str = Field(..., pattern="^(BUY|SELL|DIVIDEND|SPLIT|BONUS)$")
    quantity: Optional[int] = Field(None, ge=0)
    price: Optional[float] = Field(None, ge=0)
    amount: Optional[float] = Field(None)
    fees: float = Field(0, ge=0)
    transaction_date: str = Field(..., description="YYYY-MM-DD format")
    notes: Optional[str] = Field(None, max_length=500)


class Transaction(BaseModel):
    """Transaction record."""
    id: int
    symbol: str
    type: str
    quantity: Optional[int]
    price: Optional[float]
    amount: Optional[float]
    fees: float
    transaction_date: str
    notes: Optional[str]
    created_at: datetime


class TransactionList(BaseModel):
    """Paginated transaction list."""
    transactions: List[Transaction]
    total: int
    page: int
    per_page: int
    has_more: bool


class PortfolioSummary(BaseModel):
    """Portfolio summary with P&L metrics."""
    total_invested: float
    total_current_value: float
    total_gain_loss: float
    total_gain_loss_pct: float
    day_change: float
    day_change_pct: float
    holdings_count: int
    top_gainer: Optional[str] = None
    top_loser: Optional[str] = None
    sector_allocation: Optional[dict] = None


class PortfolioPerformance(BaseModel):
    """Historical portfolio performance."""
    dates: List[str]
    values: List[float]
    invested: List[float]
    returns: List[float]
    xirr: Optional[float] = None
    cagr: Optional[float] = None


# =============================================================================
# SCREENER
# =============================================================================

class ScreenerFilters(BaseModel):
    """Screener filter criteria."""
    pe_min: Optional[float] = None
    pe_max: Optional[float] = None
    pb_min: Optional[float] = None
    pb_max: Optional[float] = None
    roe_min: Optional[float] = None
    roe_max: Optional[float] = None
    dividend_yield_min: Optional[float] = None
    dividend_yield_max: Optional[float] = None
    debt_to_equity_max: Optional[float] = None
    current_ratio_min: Optional[float] = None
    market_cap_min: Optional[int] = None
    market_cap_max: Optional[int] = None
    sectors: Optional[List[str]] = None
    industries: Optional[List[str]] = None
    near_52w_high: Optional[float] = Field(None, description="Within X% of 52-week high")
    near_52w_low: Optional[float] = Field(None, description="Within X% of 52-week low")
    is_fno: Optional[bool] = None
    eps_min: Optional[float] = None
    beta_min: Optional[float] = None
    beta_max: Optional[float] = None


class StockFundamentals(BaseModel):
    """Stock fundamental data."""
    symbol: str
    name: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_cap: Optional[int] = None
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    ps_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    roe: Optional[float] = None
    roce: Optional[float] = None
    debt_to_equity: Optional[float] = None
    current_ratio: Optional[float] = None
    eps: Optional[float] = None
    book_value: Optional[float] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    current_price: Optional[float] = None
    price_to_52w_high: Optional[float] = None
    price_to_52w_low: Optional[float] = None
    avg_volume_30d: Optional[int] = None
    beta: Optional[float] = None
    is_fno: bool = False
    updated_at: Optional[datetime] = None


class ScreenerResult(BaseModel):
    """Screener results."""
    stocks: List[StockFundamentals]
    total: int
    page: int
    per_page: int
    has_more: bool
    filters_applied: dict


class ScreenerFilterOptions(BaseModel):
    """Available filter options with ranges."""
    pe_ratio: dict
    pb_ratio: dict
    roe: dict
    dividend_yield: dict
    debt_to_equity: dict
    market_cap: dict
    current_ratio: dict
    eps: dict
    beta: dict
    sectors: List[str]
    industries: List[str]


class SavedScreener(BaseModel):
    """Saved screener configuration."""
    id: int
    name: str
    filters: dict
    is_public: bool
    created_at: datetime
    updated_at: datetime


class SavedScreenerCreate(BaseModel):
    """Create a saved screener."""
    name: str = Field(..., min_length=1, max_length=255)
    filters: dict
    is_public: bool = False


class SavedScreenerList(BaseModel):
    """List of saved screeners."""
    screeners: List[SavedScreener]
    total: int


# =============================================================================
# F&O ANALYTICS
# =============================================================================

class OptionData(BaseModel):
    """Single option contract data."""
    strike: float
    expiry_date: str
    option_type: str  # CE or PE
    ltp: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    volume: int = 0
    oi: int = 0
    oi_change: int = 0
    iv: Optional[float] = None
    delta: Optional[float] = None
    gamma: Optional[float] = None
    theta: Optional[float] = None
    vega: Optional[float] = None


class OptionChain(BaseModel):
    """Complete option chain for a symbol."""
    symbol: str
    spot_price: float
    expiry_date: str
    expiry_dates: List[str]
    lot_size: int
    options: List[OptionData]
    total_ce_oi: int
    total_pe_oi: int
    timestamp: str


class MaxPainResult(BaseModel):
    """Max pain calculation result."""
    symbol: str
    expiry_date: str
    max_pain: float
    current_price: float
    distance_from_spot: float
    pain_values: dict


class PCRResult(BaseModel):
    """Put-Call Ratio result."""
    symbol: str
    pcr_volume: float
    pcr_oi: float
    call_volume: int
    put_volume: int
    call_oi: int
    put_oi: int
    sentiment: str
    description: str


class OIBuildup(BaseModel):
    """OI buildup interpretation."""
    symbol: str
    strike: float
    option_type: str
    oi_change: int
    price_change: Optional[float]
    interpretation: str
    detected_at: datetime


class OIAnalysis(BaseModel):
    """OI analysis for a symbol."""
    symbol: str
    spot_price: float
    expiry_date: str
    max_ce_oi_strike: float
    max_pe_oi_strike: float
    max_ce_oi: int
    max_pe_oi: int
    support_levels: List[float]
    resistance_levels: List[float]
    oi_buildup: List[OIBuildup]
    sentiment: str


class FNOSymbol(BaseModel):
    """FNO symbol with lot size."""
    symbol: str
    lot_size: int
    is_index: bool = False


# =============================================================================
# BACKTESTING
# =============================================================================

class BacktestCreate(BaseModel):
    """Create a new backtest."""
    name: str = Field(..., min_length=1, max_length=255)
    strategy: dict = Field(..., description="Strategy configuration")
    symbols: List[str] = Field(..., min_items=1, max_items=20)
    start_date: DateType = Field(...)
    end_date: DateType = Field(...)
    initial_capital: float = Field(100000, gt=0, le=100000000)


class BacktestRun(BaseModel):
    """Backtest run summary."""
    id: str
    user_id: str
    name: str
    strategy: dict
    symbols: List[str]
    start_date: str
    end_date: str
    initial_capital: float
    final_capital: Optional[float] = None
    total_return: Optional[float] = None
    cagr: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    sortino_ratio: Optional[float] = None
    max_drawdown: Optional[float] = None
    win_rate: Optional[float] = None
    profit_factor: Optional[float] = None
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    avg_win: Optional[float] = None
    avg_loss: Optional[float] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class BacktestRunList(BaseModel):
    """List of backtest runs."""
    runs: List[BacktestRun]
    total: int
    page: int
    per_page: int
    has_more: bool


class BacktestTrade(BaseModel):
    """Individual backtest trade."""
    id: int
    symbol: str
    trade_type: str
    entry_date: datetime
    exit_date: Optional[datetime] = None
    entry_price: float
    exit_price: Optional[float] = None
    quantity: int
    entry_signal: Optional[str] = None
    exit_signal: Optional[str] = None
    pnl: Optional[float] = None
    return_pct: Optional[float] = None
    fees: float = 0
    is_open: bool = True


class BacktestTradeList(BaseModel):
    """List of backtest trades."""
    trades: List[BacktestTrade]
    total: int
    page: int
    per_page: int
    has_more: bool


class EquityCurvePoint(BaseModel):
    """Single point on equity curve."""
    date: str
    equity: float
    cash: float
    positions_value: float
    daily_return: float
    drawdown: float


class EquityCurve(BaseModel):
    """Full equity curve data."""
    dates: List[str]
    equity: List[float]
    cash: List[float]
    positions_value: List[float]
    daily_returns: List[float]
    drawdown: List[float]


class BacktestResult(BaseModel):
    """Complete backtest result."""
    run: BacktestRun
    trade_count: int
    symbols_traded: List[str]

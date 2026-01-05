"""
API Models - Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


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

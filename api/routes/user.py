"""
User Routes - Profile and statistics
"""
from fastapi import APIRouter, Depends, HTTPException, status

from api.core.config import get_settings
from api.core.auth import get_current_user_id
from api.core.database import APIDatabase, get_db
from api.models.schemas import UserProfile, UserStats, MessageResponse

settings = get_settings()
router = APIRouter(prefix="/user", tags=["User"])


@router.get("/profile", response_model=UserProfile)
async def get_profile(
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get your profile information.
    """
    user = await db.get_user(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    watchlist_count = await db.get_watchlist_count(user_id)
    tier_limit = settings.tier_limits.get(user["tier"], {}).get("symbols", 5)
    
    return UserProfile(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        tier=user["tier"],
        created_at=user["created_at"],
        watchlist_count=watchlist_count,
        tier_limit=tier_limit
    )


@router.get("/stats", response_model=UserStats)
async def get_stats(
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get your usage statistics.
    
    Includes:
    - Watchlist count
    - Signals received (last 30 days)
    - Actions recorded
    """
    user = await db.get_user(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    stats = await db.get_user_stats(user_id)
    tier_limit = settings.tier_limits.get(user["tier"], {}).get("symbols", 5)
    
    return UserStats(
        watchlist_count=stats["watchlist_count"],
        signals_30d=stats["signals_30d"],
        actions_total=stats["actions_total"],
        tier=user["tier"],
        tier_limit=tier_limit
    )


@router.patch("/profile", response_model=MessageResponse)
async def update_profile(
    name: str = None,
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Update your profile.
    
    Currently supports updating name only.
    """
    if not name or len(name.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name must be at least 2 characters"
        )
    
    async with db.pool.acquire() as conn:
        result = await conn.execute("""
            UPDATE users SET name = $1 WHERE id = $2
        """, name.strip(), user_id)
        
        if "UPDATE 0" in result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
    
    return MessageResponse(
        message="Profile updated",
        success=True
    )


@router.get("/tier-info")
async def get_tier_info(
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get information about subscription tiers.
    
    Shows current tier and upgrade options.
    """
    user = await db.get_user(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    current_tier = user["tier"]
    
    tiers = {
        "free": {
            "name": "Free",
            "price": 0,
            "symbols": 5,
            "history_days": 7,
            "features": ["Basic signals", "Daily digest", "Community access"]
        },
        "pro": {
            "name": "Pro",
            "price": 1499,
            "symbols": 25,
            "history_days": 90,
            "features": ["Real-time alerts", "AI explanations", "Full backtesting", "Priority support"]
        },
        "serious": {
            "name": "Serious",
            "price": 4999,
            "symbols": 100,
            "history_days": 365,
            "features": ["API access", "Webhooks", "Custom thresholds", "SLA support"]
        }
    }
    
    return {
        "current_tier": current_tier,
        "current_tier_info": tiers.get(current_tier),
        "all_tiers": tiers
    }

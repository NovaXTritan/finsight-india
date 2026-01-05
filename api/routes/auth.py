"""
Auth Routes - Registration, login, token management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from datetime import timedelta

from slowapi import Limiter
from slowapi.util import get_remote_address

from api.core.config import get_settings
from api.core.auth import create_access_token, get_current_user_id
from api.core.database import APIDatabase, get_db
from api.models.schemas import (
    UserRegister, UserLogin, Token, UserProfile, MessageResponse
)

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Stricter rate limiting for auth endpoints to prevent brute force
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")  # Strict limit to prevent abuse
async def register(
    request: Request,  # Required for rate limiter
    user_data: UserRegister,
    db: APIDatabase = Depends(get_db)
):
    """
    Register a new user account.

    - **email**: Valid email address (will be lowercased)
    - **password**: Minimum 8 characters
    - **name**: Display name (2-100 characters)

    Returns JWT token on success.

    Rate limited to 5 requests per minute.
    """
    user = await db.create_user(
        email=user_data.email,
        password=user_data.password,
        name=user_data.name
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"]}
    )
    
    return Token(
        access_token=access_token,
        expires_in=settings.access_token_expire_minutes * 60
    )


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")  # Stricter limit to prevent brute force
async def login(
    request: Request,  # Required for rate limiter
    credentials: UserLogin,
    db: APIDatabase = Depends(get_db)
):
    """
    Login with email and password.

    Returns JWT token on success.

    Rate limited to 10 requests per minute to prevent brute force attacks.
    """
    user = await db.authenticate_user(
        email=credentials.email,
        password=credentials.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"]}
    )
    
    return Token(
        access_token=access_token,
        expires_in=settings.access_token_expire_minutes * 60
    )


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Get current user's profile.
    
    Requires authentication.
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


@router.post("/refresh", response_model=Token)
async def refresh_token(
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Refresh access token.
    
    Use before current token expires.
    """
    user = await db.get_user(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"]}
    )
    
    return Token(
        access_token=access_token,
        expires_in=settings.access_token_expire_minutes * 60
    )

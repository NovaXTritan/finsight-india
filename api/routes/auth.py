"""
Auth Routes - Registration, login, token management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from datetime import timedelta, datetime

from slowapi import Limiter
from slowapi.util import get_remote_address

from api.core.config import get_settings
from api.core.auth import create_access_token, get_current_user_id
from api.core.database import APIDatabase, get_db
from api.models.schemas import (
    UserRegister, UserLogin, Token, UserProfile, MessageResponse,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest
)

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Stricter rate limiting for auth endpoints to prevent brute force
limiter = Limiter(key_func=get_remote_address)

# Demo user for development (when database is not available)
DEMO_USER = {
    "id": "demo-user-001",
    "email": "demo@finsight.in",
    "name": "Demo User",
    "tier": "pro",
    "created_at": datetime.utcnow()
}
DEMO_PASSWORD = "demo1234"


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

    **Demo Mode**: When database is unavailable, registration creates a demo session.
    """
    # Check if database is available
    if db.pool is None:
        # Demo mode - just return a token for the demo user
        access_token = create_access_token(
            data={"sub": DEMO_USER["id"], "email": user_data.email.lower()}
        )
        return Token(
            access_token=access_token,
            expires_in=settings.access_token_expire_minutes * 60
        )

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

    **Demo Mode**: When database is unavailable, use:
    - Email: demo@finsight.in
    - Password: demo1234
    """
    user = None

    # Check if database is available
    if db.pool is not None:
        user = await db.authenticate_user(
            email=credentials.email,
            password=credentials.password
        )
    else:
        # Demo mode - allow demo user login when database is unavailable
        if credentials.email.lower() == DEMO_USER["email"] and credentials.password == DEMO_PASSWORD:
            user = DEMO_USER

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
    # Demo mode - return demo user if database unavailable
    if db.pool is None or user_id == DEMO_USER["id"]:
        tier_limit = settings.tier_limits.get(DEMO_USER["tier"], {}).get("symbols", 10)
        return UserProfile(
            id=DEMO_USER["id"],
            email=DEMO_USER["email"],
            name=DEMO_USER["name"],
            tier=DEMO_USER["tier"],
            created_at=DEMO_USER["created_at"],
            watchlist_count=5,
            tier_limit=tier_limit
        )

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


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: APIDatabase = Depends(get_db)
):
    """
    Request a password reset token.

    In production, this would send an email. Currently returns the reset link directly.

    Rate limited to 3 requests per minute.
    """
    if db.pool is None:
        return MessageResponse(message="If an account with that email exists, a reset link has been generated.")

    token = await db.create_password_reset_token(data.email)

    if token:
        # In production, send this via email instead of returning it
        return MessageResponse(
            message=f"Password reset link: /reset-password?token={token}"
        )

    # Always return success to prevent email enumeration
    return MessageResponse(message="If an account with that email exists, a reset link has been generated.")


@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: APIDatabase = Depends(get_db)
):
    """
    Reset password using a valid reset token.

    Token expires after 1 hour and can only be used once.
    """
    if db.pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable"
        )

    success = await db.reset_password(data.token, data.new_password)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    return MessageResponse(message="Password has been reset successfully.")


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest,
    user_id: str = Depends(get_current_user_id),
    db: APIDatabase = Depends(get_db)
):
    """
    Change password for the currently authenticated user.

    Requires the current password for verification.
    """
    if db.pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable"
        )

    success = await db.change_password(user_id, data.current_password, data.new_password)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    return MessageResponse(message="Password changed successfully.")

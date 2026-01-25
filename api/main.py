"""
FinSight API - Main Application

Run with: uvicorn api.main:app --reload
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import logging

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from api.core.config import get_settings
from api.core.database import db
from api.routes import auth, signals, watchlist, user, market, portfolio, screener, options, backtest, macro

settings = get_settings()
logger = logging.getLogger(__name__)

# Rate limiter setup - uses IP address for identification
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    print("Starting FinSight API...")
    try:
        await db.connect()
        print("Database connected")
    except Exception as e:
        print(f"Warning: Database connection failed: {e}")
        print("Running in limited mode (no database)")

    yield

    # Shutdown
    print("Shutting down...")
    try:
        await db.close()
        print("Database disconnected")
    except:
        pass


# Create FastAPI app
app = FastAPI(
    title="FinSight API",
    description="""
    🎯 **FinSight** - AI-Powered Market Anomaly Detection

    ## Overview
    FinSight detects unusual market activity and helps you focus on what matters.

    ## Authentication
    Most endpoints require a JWT token. Get one by:
    1. Register at `/api/auth/register`
    2. Or login at `/api/auth/login`
    3. Include token in header: `Authorization: Bearer <token>`

    ## Rate Limits
    - Free tier: 60 requests/minute
    - Pro tier: 300 requests/minute
    - Serious tier: 1000 requests/minute

    ## Quick Start
    1. Register an account
    2. Add symbols to your watchlist
    3. Get signals for your symbols
    4. Record your actions to help FinSight learn
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add rate limiter to app state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing and security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time

    # Timing header
    response.headers["X-Process-Time"] = str(round(process_time * 1000, 2)) + "ms"

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Content Security Policy (adjust as needed for your frontend)
    if not request.url.path.startswith("/docs") and not request.url.path.startswith("/redoc"):
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"

    return response


# Global exception handler - don't leak internal error details
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the actual error for debugging
    logger.error(f"Unhandled exception on {request.url.path}: {type(exc).__name__}: {exc}")

    # Return generic error to client (don't leak exception type or details)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error. Please try again later."
        }
    )


# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(signals.router, prefix="/api")
app.include_router(watchlist.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(market.router, prefix="/api")
app.include_router(portfolio.router, prefix="/api")
app.include_router(screener.router, prefix="/api")
app.include_router(options.router, prefix="/api")
app.include_router(backtest.router, prefix="/api")
app.include_router(macro.router)


# Health check
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    
    Returns API status and database connectivity.
    """
    db_healthy = False
    try:
        async with db.pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
            db_healthy = True
    except:
        pass
    
    return {
        "status": "healthy" if db_healthy else "degraded",
        "database": "connected" if db_healthy else "disconnected",
        "version": "1.0.0"
    }


# Root endpoint
@app.get("/", tags=["Health"])
async def root():
    """
    API root - basic info.
    """
    return {
        "name": "FinSight API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )


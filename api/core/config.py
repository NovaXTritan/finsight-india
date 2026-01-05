"""
API Configuration - Security, database, and app settings
"""
import os
import secrets
import sys
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional


def _get_secret_key() -> str:
    """
    Get SECRET_KEY from environment.
    CRITICAL: In production, this MUST be set via environment variable.
    Generate with: openssl rand -hex 32
    """
    secret = os.getenv("SECRET_KEY")

    if not secret:
        # Check if we're in production
        if os.getenv("ENVIRONMENT", "development").lower() == "production":
            print("CRITICAL ERROR: SECRET_KEY environment variable is not set!")
            print("Generate one with: openssl rand -hex 32")
            sys.exit(1)
        else:
            # Development only - generate ephemeral key (tokens won't persist across restarts)
            print("WARNING: SECRET_KEY not set. Using ephemeral key (dev mode only).")
            print("Set SECRET_KEY in .env for persistent sessions.")
            return secrets.token_hex(32)

    # Validate key strength
    if len(secret) < 32:
        print("WARNING: SECRET_KEY should be at least 32 characters for security.")

    return secret


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # App
    app_name: str = "FinSight API"
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    environment: str = os.getenv("ENVIRONMENT", "development")

    # Database (reuse existing config)
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/finsight"
    )

    # JWT Authentication - secure by default
    secret_key: str = _get_secret_key()
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    refresh_token_expire_days: int = 7  # Max refresh window

    # Rate limiting (requests per minute by tier)
    rate_limits: dict = {
        "free": 60,
        "pro": 300,
        "serious": 1000
    }

    # Tier limits
    tier_limits: dict = {
        "free": {"symbols": 5, "history_days": 7},
        "pro": {"symbols": 25, "history_days": 90},
        "serious": {"symbols": 100, "history_days": 365}
    }

    # CORS - explicitly list allowed origins (no wildcards)
    cors_origins: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        # Add your production domains here:
        # "https://finsight.example.com",
        # "https://app.finsight.in",
    ]

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()

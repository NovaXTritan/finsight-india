# FinSight API - Production Dockerfile (multi-stage)

# Stage 1: Builder - install dependencies with build tools
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build-time system dependencies (gcc for compiled packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (better caching)
COPY requirements.txt .

# Install Python dependencies into a prefix for clean copy
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime - minimal image without build tools
FROM python:3.11-slim

WORKDIR /app

# Install only runtime system dependencies (no gcc)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY config.py .
COPY api/ ./api/
COPY data/ ./data/
COPY detection/ ./detection/
COPY backtesting/ ./backtesting/
COPY analysis/ ./analysis/
COPY agents/ ./agents/
COPY learning/ ./learning/
COPY tracking/ ./tracking/

# Create non-root user for security
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser

# Expose port (Cloud Run uses PORT env variable)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

# Run with 2 workers to utilize both CPU cores on Cloud Run
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 2"]

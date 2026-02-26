#!/bin/bash
set -e

echo "========================================="
echo "  FinSight India — Codespace Setup"
echo "========================================="

# ── Python backend ──────────────────────────
echo ""
echo "[1/4] Setting up Python virtual environment..."
python -m venv venv
source venv/bin/activate
pip install --upgrade pip -q

echo "[2/4] Installing Python dependencies..."
pip install -r requirements.txt -q

# ── Next.js frontend ───────────────────────
echo "[3/4] Installing frontend dependencies..."
cd frontend
npm install --silent
cd ..

# ── Environment config ─────────────────────
echo "[4/4] Configuring environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  # Point DATABASE_URL to the Codespace Postgres container
  sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:postgres@db:5432/finsight|' .env
  echo "  → Created .env from .env.example (edit with your API keys)"
else
  echo "  → .env already exists, skipping"
fi

echo ""
echo "========================================="
echo "  Setup complete!"
echo ""
echo "  Start backend:   source venv/bin/activate && uvicorn api.main:app --reload --port 8000"
echo "  Start frontend:  cd frontend && npm run dev"
echo "  Run detection:   python -m detection.real_detector"
echo "========================================="

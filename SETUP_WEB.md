# FinSight Web App - Setup Guide

## What's New

Your FinSight project now has a web API and frontend. Here's what was added:

```
finsight/
├── api/                    # NEW: FastAPI web server
│   ├── main.py            # Entry point
│   ├── core/
│   │   ├── config.py      # Settings
│   │   ├── auth.py        # JWT authentication
│   │   └── database.py    # DB with user management
│   ├── models/
│   │   └── schemas.py     # Request/response models
│   └── routes/
│       ├── auth.py        # Login, register
│       ├── signals.py     # Get anomaly signals
│       ├── watchlist.py   # Manage watchlist
│       └── user.py        # Profile, stats
├── frontend/
│   └── index.html         # Single-file frontend (no build needed)
├── database/
│   └── schema_web.sql     # Updated schema with users table
└── requirements.txt       # Updated with FastAPI deps
```

---

## Quick Start (5 minutes)

### Step 1: Install New Dependencies

```bash
cd finsight
pip install -r requirements.txt
```

### Step 2: Update Database Schema

```bash
# Connect to your PostgreSQL and run:
psql -U postgres -d finsight -f database/schema_web.sql
```

Or if using Docker:
```bash
docker exec -i finsight-db psql -U postgres -d finsight < database/schema_web.sql
```

### Step 3: Create .env File

```bash
# Copy example and edit
cp .env.example .env
```

Add these to your `.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/finsight
SECRET_KEY=your-secret-key-here-use-openssl-rand-hex-32
```

Generate a secure secret key:
```bash
openssl rand -hex 32
```

### Step 4: Start the API Server

```bash
# From the finsight directory
uvicorn api.main:app --reload --port 8000
```

You should see:
```
🚀 Starting FinSight API...
✓ Database connected
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 5: Open the Frontend

Option A - Direct file:
```bash
# Just open in browser
open frontend/index.html
# or
xdg-open frontend/index.html
```

Option B - Serve it:
```bash
# Python's built-in server
cd frontend
python -m http.server 3000
# Open http://localhost:3000
```

### Step 6: Test It!

1. Open http://localhost:3000 (frontend)
2. Click "Start Free" to register
3. Add symbols to watchlist (AAPL, MSFT, etc)
4. Run your detection engine to generate signals:
   ```bash
   python run_enhanced.py
   ```
5. Refresh dashboard to see signals

---

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/me` | Get profile |
| GET | `/api/watchlist` | Get your symbols |
| POST | `/api/watchlist` | Add symbol |
| DELETE | `/api/watchlist/{symbol}` | Remove symbol |
| GET | `/api/signals` | Get signals (paginated) |
| GET | `/api/signals/latest` | Get latest 5 signals |
| POST | `/api/signals/{id}/action` | Record action |

### Example API Usage

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Response: {"access_token":"eyJ...","token_type":"bearer","expires_in":86400}

# Use token for authenticated requests
TOKEN="eyJ..."

# Add to watchlist
curl -X POST http://localhost:8000/api/watchlist \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL"}'

# Get signals
curl http://localhost:8000/api/signals/latest \
  -H "Authorization: Bearer $TOKEN"
```

---

## Running Both Systems Together

You now have TWO ways to use FinSight:

### 1. CLI Mode (Original)
```bash
python run_enhanced.py --continuous
```
- Runs detection loop
- Saves anomalies to database
- Terminal output only

### 2. Web Mode (New)
```bash
# Terminal 1: API server
uvicorn api.main:app --reload

# Terminal 2: Detection engine
python run_enhanced.py --continuous

# Browser: Frontend
open frontend/index.html
```
- Detection saves to same database
- Web users see signals in browser
- Multiple users supported

---

## Deployment

### Backend (Railway/Render)

1. Push code to GitHub
2. Connect to Railway: https://railway.app
3. Add environment variables:
   - `DATABASE_URL` (use Railway's Postgres add-on)
   - `SECRET_KEY`
4. Deploy command: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel/Netlify)

1. Update `API_URL` in `frontend/index.html`:
   ```javascript
   const API_URL = 'https://your-railway-app.railway.app';
   ```
2. Deploy `frontend/index.html` to Vercel

### Database (Supabase)

1. Create project at https://supabase.com
2. Run `schema_web.sql` in SQL editor
3. Copy connection string to Railway env vars

---

## What Was Fixed

1. **SQL Injection** (db.py line 147)
   - Changed `%s` formatting to parameterized query
   - Now uses `make_interval(days => $2)`

2. **No Authentication**
   - Added JWT-based auth
   - Each user has their own account

3. **Hardcoded USER_ID**
   - Users now register and login
   - Each user sees only their data

4. **No HTTP Layer**
   - Added FastAPI server
   - RESTful API with OpenAPI docs

---

## Next Steps

1. ☐ Deploy backend to Railway
2. ☐ Deploy frontend to Vercel
3. ☐ Set up Supabase for production DB
4. ☐ Add payment integration (Razorpay)
5. ☐ Set up email notifications
6. ☐ Add WebSocket for real-time signals

---

## Troubleshooting

**"Cannot connect to API"**
- Is the API server running? (`uvicorn api.main:app --reload`)
- Check if port 8000 is available

**"Database connection failed"**
- Is PostgreSQL running?
- Check DATABASE_URL in .env
- Did you run schema_web.sql?

**"Invalid token"**
- Token may have expired (24 hours)
- Login again to get fresh token

**"Watchlist limit reached"**
- Free tier has 5 symbol limit
- Upgrade tier in database: `UPDATE users SET tier='pro' WHERE email='...'`

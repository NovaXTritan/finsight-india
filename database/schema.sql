-- FinSight Database Schema
-- Auto-loaded by Docker on first run

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User watchlist
CREATE TABLE IF NOT EXISTS user_watchlist (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    symbol TEXT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

-- Anomalies table
CREATE TABLE IF NOT EXISTS anomalies (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    z_score FLOAT NOT NULL,
    price FLOAT NOT NULL,
    volume BIGINT,
    agent_decision TEXT,
    agent_confidence FLOAT,
    agent_reason TEXT,
    detected_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User actions
CREATE TABLE IF NOT EXISTS user_actions (
    id SERIAL PRIMARY KEY,
    anomaly_id TEXT NOT NULL REFERENCES anomalies(id),
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outcome tracking
CREATE TABLE IF NOT EXISTS anomaly_outcomes (
    id SERIAL PRIMARY KEY,
    anomaly_id TEXT NOT NULL REFERENCES anomalies(id),
    user_id TEXT NOT NULL,
    agent_decision TEXT NOT NULL,
    agent_confidence FLOAT NOT NULL,
    user_action TEXT NOT NULL,
    return_15m FLOAT,
    return_1h FLOAT,
    return_4h FLOAT,
    return_1d FLOAT,
    was_profitable BOOLEAN,
    outcome_classification TEXT,
    agent_correct BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pattern quality scores (per user, per pattern, per symbol)
CREATE TABLE IF NOT EXISTS pattern_quality (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    symbol TEXT NOT NULL,
    accuracy FLOAT NOT NULL DEFAULT 0,
    review_rate FLOAT NOT NULL DEFAULT 0,
    trade_rate FLOAT NOT NULL DEFAULT 0,
    avg_return FLOAT NOT NULL DEFAULT 0,
    sample_size INT NOT NULL DEFAULT 0,
    agent_accuracy FLOAT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, pattern_type, symbol)
);

-- Detection thresholds (adaptive)
CREATE TABLE IF NOT EXISTS detection_thresholds (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    symbol TEXT NOT NULL,
    z_score_threshold FLOAT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT,
    UNIQUE(user_id, pattern_type, symbol)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_anomalies_symbol ON anomalies(symbol, detected_at);
CREATE INDEX IF NOT EXISTS idx_anomalies_detected ON anomalies(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_outcomes_user ON anomaly_outcomes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_user ON pattern_quality(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_anomaly ON user_actions(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_user ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user ON user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity) WHERE severity = 'HIGH';

-- =============================================================================
-- PHASE 2: PORTFOLIO TRACKER
-- =============================================================================

-- Stock master data
CREATE TABLE IF NOT EXISTS stocks (
    symbol VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(100),
    industry VARCHAR(100),
    market_cap BIGINT,
    is_fno BOOLEAN DEFAULT FALSE,
    lot_size INTEGER,
    isin VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User holdings
CREATE TABLE IF NOT EXISTS user_holdings (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    avg_price DECIMAL(12,2) NOT NULL CHECK (avg_price > 0),
    invested_value DECIMAL(14,2) GENERATED ALWAYS AS (quantity * avg_price) STORED,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'BONUS')),
    quantity INTEGER,
    price DECIMAL(12,2),
    amount DECIMAL(14,2),
    fees DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio snapshots (daily)
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    total_value DECIMAL(14,2),
    total_invested DECIMAL(14,2),
    total_gain_loss DECIMAL(14,2),
    gain_loss_pct DECIMAL(8,4),
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, snapshot_date)
);

-- Indexes for portfolio
CREATE INDEX IF NOT EXISTS idx_holdings_user ON user_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON user_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_symbol ON transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_date ON portfolio_snapshots(user_id, snapshot_date DESC);

-- =============================================================================
-- PHASE 2: STOCK SCREENER
-- =============================================================================

-- Stock fundamentals cache
CREATE TABLE IF NOT EXISTS stock_fundamentals (
    symbol VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255),
    sector VARCHAR(100),
    industry VARCHAR(100),
    market_cap BIGINT,
    pe_ratio DECIMAL(10,2),
    pb_ratio DECIMAL(10,2),
    ps_ratio DECIMAL(10,2),
    dividend_yield DECIMAL(6,2),
    roe DECIMAL(8,2),
    roce DECIMAL(8,2),
    debt_to_equity DECIMAL(10,2),
    current_ratio DECIMAL(10,2),
    eps DECIMAL(12,2),
    book_value DECIMAL(12,2),
    face_value DECIMAL(10,2),
    high_52w DECIMAL(12,2),
    low_52w DECIMAL(12,2),
    current_price DECIMAL(12,2),
    price_to_52w_high DECIMAL(6,2),
    price_to_52w_low DECIMAL(6,2),
    avg_volume_30d BIGINT,
    beta DECIMAL(6,3),
    is_fno BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved screeners
CREATE TABLE IF NOT EXISTS saved_screeners (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    filters JSONB NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Indexes for screener
CREATE INDEX IF NOT EXISTS idx_fundamentals_sector ON stock_fundamentals(sector);
CREATE INDEX IF NOT EXISTS idx_fundamentals_market_cap ON stock_fundamentals(market_cap DESC);
CREATE INDEX IF NOT EXISTS idx_fundamentals_pe ON stock_fundamentals(pe_ratio);
CREATE INDEX IF NOT EXISTS idx_fundamentals_roe ON stock_fundamentals(roe DESC);
CREATE INDEX IF NOT EXISTS idx_saved_screeners_user ON saved_screeners(user_id);

-- =============================================================================
-- PHASE 2: F&O ANALYTICS
-- =============================================================================

-- Option chain snapshots
CREATE TABLE IF NOT EXISTS options_chain (
    id SERIAL PRIMARY KEY,
    underlying VARCHAR(20) NOT NULL,
    expiry_date DATE NOT NULL,
    strike DECIMAL(12,2) NOT NULL,
    option_type VARCHAR(4) NOT NULL CHECK (option_type IN ('CE', 'PE')),
    ltp DECIMAL(12,2),
    bid DECIMAL(12,2),
    ask DECIMAL(12,2),
    volume BIGINT DEFAULT 0,
    oi BIGINT DEFAULT 0,
    oi_change BIGINT DEFAULT 0,
    iv DECIMAL(8,4),
    delta DECIMAL(8,6),
    gamma DECIMAL(10,8),
    theta DECIMAL(10,6),
    vega DECIMAL(10,6),
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(underlying, expiry_date, strike, option_type, captured_at)
);

-- OI buildup tracking
CREATE TABLE IF NOT EXISTS oi_buildup (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    expiry_date DATE NOT NULL,
    strike DECIMAL(12,2) NOT NULL,
    option_type VARCHAR(4) NOT NULL,
    oi_change BIGINT NOT NULL,
    price_change DECIMAL(10,2),
    interpretation VARCHAR(50) CHECK (interpretation IN (
        'LONG_BUILDUP', 'SHORT_BUILDUP', 'LONG_UNWINDING', 'SHORT_COVERING'
    )),
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- FNO lot sizes
CREATE TABLE IF NOT EXISTS fno_lot_sizes (
    symbol VARCHAR(20) PRIMARY KEY,
    lot_size INTEGER NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for F&O
CREATE INDEX IF NOT EXISTS idx_options_underlying ON options_chain(underlying, expiry_date);
CREATE INDEX IF NOT EXISTS idx_options_strike ON options_chain(underlying, strike);
CREATE INDEX IF NOT EXISTS idx_options_captured ON options_chain(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_oi_buildup_symbol ON oi_buildup(symbol, detected_at DESC);

-- =============================================================================
-- PHASE 2: BACKTESTING ENGINE
-- =============================================================================

-- Backtest runs
CREATE TABLE IF NOT EXISTS backtest_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    strategy JSONB NOT NULL,
    symbols TEXT[] NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    initial_capital DECIMAL(14,2) NOT NULL DEFAULT 100000,
    final_capital DECIMAL(14,2),
    total_return DECIMAL(10,4),
    cagr DECIMAL(10,4),
    sharpe_ratio DECIMAL(8,4),
    sortino_ratio DECIMAL(8,4),
    max_drawdown DECIMAL(8,4),
    win_rate DECIMAL(6,4),
    profit_factor DECIMAL(8,4),
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    avg_win DECIMAL(14,2),
    avg_loss DECIMAL(14,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Backtest trades
CREATE TABLE IF NOT EXISTS backtest_trades (
    id SERIAL PRIMARY KEY,
    backtest_id UUID REFERENCES backtest_runs(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('LONG', 'SHORT')),
    entry_date TIMESTAMPTZ NOT NULL,
    exit_date TIMESTAMPTZ,
    entry_price DECIMAL(12,2) NOT NULL,
    exit_price DECIMAL(12,2),
    quantity INTEGER NOT NULL,
    entry_signal VARCHAR(100),
    exit_signal VARCHAR(100),
    pnl DECIMAL(14,2),
    return_pct DECIMAL(8,4),
    fees DECIMAL(10,2) DEFAULT 0,
    is_open BOOLEAN DEFAULT TRUE
);

-- Backtest equity curve (daily snapshots)
CREATE TABLE IF NOT EXISTS backtest_equity_curve (
    id SERIAL PRIMARY KEY,
    backtest_id UUID REFERENCES backtest_runs(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    equity DECIMAL(14,2) NOT NULL,
    cash DECIMAL(14,2),
    positions_value DECIMAL(14,2),
    daily_return DECIMAL(8,4),
    drawdown DECIMAL(8,4),
    UNIQUE(backtest_id, date)
);

-- Indexes for backtesting
CREATE INDEX IF NOT EXISTS idx_backtest_runs_user ON backtest_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_status ON backtest_runs(status);
CREATE INDEX IF NOT EXISTS idx_backtest_trades_backtest ON backtest_trades(backtest_id);
CREATE INDEX IF NOT EXISTS idx_backtest_trades_symbol ON backtest_trades(backtest_id, symbol);
CREATE INDEX IF NOT EXISTS idx_backtest_equity_curve ON backtest_equity_curve(backtest_id, date);

-- =============================================================================
-- PHASE 2: ALTERNATIVE DATA / MACRO INDICATORS
-- =============================================================================

-- Macro economic indicators
CREATE TABLE IF NOT EXISTS macro_indicators (
    id SERIAL PRIMARY KEY,
    indicator_name VARCHAR(100) NOT NULL,
    indicator_category VARCHAR(50) NOT NULL,
    value DECIMAL(20,2) NOT NULL,
    unit VARCHAR(50),
    period VARCHAR(20) NOT NULL,
    period_date DATE NOT NULL,
    yoy_change DECIMAL(10,2),
    mom_change DECIMAL(10,2),
    source VARCHAR(100),
    source_url TEXT,
    notes TEXT,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(indicator_name, period)
);

-- Nifty correlation cache
CREATE TABLE IF NOT EXISTS nifty_correlation (
    id SERIAL PRIMARY KEY,
    indicator_name VARCHAR(100) NOT NULL,
    correlation_1y DECIMAL(6,4),
    correlation_3y DECIMAL(6,4),
    lag_months INTEGER DEFAULT 0,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(indicator_name)
);

-- Indexes for macro data
CREATE INDEX IF NOT EXISTS idx_macro_indicator_name ON macro_indicators(indicator_name, period_date DESC);
CREATE INDEX IF NOT EXISTS idx_macro_category ON macro_indicators(indicator_category);
CREATE INDEX IF NOT EXISTS idx_macro_period_date ON macro_indicators(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_macro_captured ON macro_indicators(captured_at DESC);

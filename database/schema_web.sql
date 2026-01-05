-- FinSight Database Schema (Web App Version)
-- Run this to add web app tables to existing database

-- =============================================================================
-- NEW: Users table
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email index for login lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================================================
-- NEW: User watchlist
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_watchlist (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON user_watchlist(symbol);

-- =============================================================================
-- EXISTING: Anomalies table (unchanged)
-- =============================================================================
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

CREATE INDEX IF NOT EXISTS idx_anomalies_symbol ON anomalies(symbol, detected_at);
CREATE INDEX IF NOT EXISTS idx_anomalies_detected ON anomalies(detected_at DESC);

-- =============================================================================
-- EXISTING: User actions (add created_at if missing)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_actions (
    id SERIAL PRIMARY KEY,
    anomaly_id TEXT NOT NULL REFERENCES anomalies(id),
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_actions_anomaly ON user_actions(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_user ON user_actions(user_id);

-- =============================================================================
-- EXISTING: Outcome tracking
-- =============================================================================
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

CREATE INDEX IF NOT EXISTS idx_outcomes_user ON anomaly_outcomes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outcomes_anomaly ON anomaly_outcomes(anomaly_id);

-- =============================================================================
-- EXISTING: Pattern quality scores
-- =============================================================================
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

CREATE INDEX IF NOT EXISTS idx_quality_user ON pattern_quality(user_id);
CREATE INDEX IF NOT EXISTS idx_quality_pattern ON pattern_quality(pattern_type, symbol);
CREATE INDEX IF NOT EXISTS idx_quality_lookup ON pattern_quality(user_id, pattern_type, symbol);

-- =============================================================================
-- EXISTING: Detection thresholds
-- =============================================================================
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

CREATE INDEX IF NOT EXISTS idx_thresholds_user ON detection_thresholds(user_id);
CREATE INDEX IF NOT EXISTS idx_thresholds_pattern ON detection_thresholds(pattern_type, symbol);
CREATE INDEX IF NOT EXISTS idx_thresholds_lookup ON detection_thresholds(user_id, pattern_type, symbol);

-- =============================================================================
-- MIGRATION: If upgrading from old schema
-- =============================================================================
-- Run these if tables already exist without new columns:
-- ALTER TABLE user_actions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- =============================================================================
-- MIGRATION: Add indexes to existing database
-- =============================================================================
-- Run this SQL to add missing indexes to an existing database:
/*
CREATE INDEX IF NOT EXISTS idx_outcomes_anomaly ON anomaly_outcomes(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_quality_pattern ON pattern_quality(pattern_type, symbol);
CREATE INDEX IF NOT EXISTS idx_quality_lookup ON pattern_quality(user_id, pattern_type, symbol);
CREATE INDEX IF NOT EXISTS idx_thresholds_user ON detection_thresholds(user_id);
CREATE INDEX IF NOT EXISTS idx_thresholds_pattern ON detection_thresholds(pattern_type, symbol);
CREATE INDEX IF NOT EXISTS idx_thresholds_lookup ON detection_thresholds(user_id, pattern_type, symbol);
*/

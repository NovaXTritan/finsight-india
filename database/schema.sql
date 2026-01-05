-- FinSight Database Schema
-- Auto-loaded by Docker on first run

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
    timestamp TIMESTAMPTZ DEFAULT NOW()
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

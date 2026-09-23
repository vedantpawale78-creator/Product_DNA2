-- ProductDNA Supabase Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Device table - exactly ONE row expected in normal use
CREATE TABLE device (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT UNIQUE NOT NULL,
    nickname TEXT,
    baseline_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scans table - historical snapshots
CREATE TABLE scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL REFERENCES device(device_id) ON DELETE CASCADE,
    snapshot JSONB NOT NULL,
    flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust Scores table - computed scores with breakdown
CREATE TABLE trust_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL REFERENCES device(device_id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score >= 0 AND score <= 100),
    breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    rul_months INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_scans_device_id ON scans(device_id);
CREATE INDEX idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX idx_trust_scores_device_id ON trust_scores(device_id);
CREATE INDEX idx_trust_scores_created_at ON trust_scores(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE device ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;

-- Policies: Allow anon read, service_role write
CREATE POLICY "Allow anon read device" ON device
    FOR SELECT USING (true);

CREATE POLICY "Allow service_role write device" ON device
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read scans" ON scans
    FOR SELECT USING (true);

CREATE POLICY "Allow service_role write scans" ON scans
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read trust_scores" ON trust_scores
    FOR SELECT USING (true);

CREATE POLICY "Allow service_role write trust_scores" ON trust_scores
    FOR ALL USING (auth.role() = 'service_role');

-- Function to get the single device (for convenience)
CREATE OR REPLACE FUNCTION get_single_device()
RETURNS SETOF device
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT * FROM device LIMIT 1;
$$;

-- Function to get latest scan for a device
CREATE OR REPLACE FUNCTION get_latest_scan(p_device_id TEXT)
RETURNS SETOF scans
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT * FROM scans
    WHERE device_id = p_device_id
    ORDER BY created_at DESC
    LIMIT 1;
$$;

-- Function to get latest trust score for a device
CREATE OR REPLACE FUNCTION get_latest_trust_score(p_device_id TEXT)
RETURNS SETOF trust_scores
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT * FROM trust_scores
    WHERE device_id = p_device_id
    ORDER BY created_at DESC
    LIMIT 1;
$$;

-- Trigger to update updated_at on device
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_device_updated_at
    BEFORE UPDATE ON device
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
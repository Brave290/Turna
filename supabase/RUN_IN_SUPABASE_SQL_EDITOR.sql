-- Turna: cron execution history table
-- Run this whole file in the Supabase SQL Editor.
-- It is safe to run more than once.

CREATE TABLE IF NOT EXISTS cron_executions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_name text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, status text NOT NULL DEFAULT 'running', result jsonb, error text);

CREATE INDEX IF NOT EXISTS idx_cron_executions_job_name ON cron_executions(job_name);

CREATE INDEX IF NOT EXISTS idx_cron_executions_started_at ON cron_executions(started_at DESC);

ALTER TABLE cron_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_all ON cron_executions;

CREATE POLICY service_role_all ON cron_executions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Verify: this should return 0
SELECT count(*) FROM cron_executions;

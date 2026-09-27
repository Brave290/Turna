CREATE TABLE IF NOT EXISTS cron_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  result JSONB,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_cron_executions_job_name ON cron_executions(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_executions_started_at ON cron_executions(started_at DESC);

ALTER TABLE cron_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON cron_executions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

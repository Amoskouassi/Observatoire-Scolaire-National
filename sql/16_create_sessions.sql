-- Migration 16: Create sessions table for login sessions
-- Each login creates a session; JWT references the session ID.

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Index for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- RLS: only service_role can access
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON sessions
  FOR ALL
  TO service_role
  USING (true);

-- Auto-cleanup: delete expired sessions (run periodically or via pg_cron)
-- For now, we clean on each middleware check.

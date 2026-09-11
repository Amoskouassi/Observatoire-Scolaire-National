-- Table for email verification codes (6-digit)
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'email_confirm',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_verification_codes_email_code
  ON verification_codes(email, code, purpose);

-- Auto-cleanup expired codes (run via pg_cron or manual)
-- DELETE FROM verification_codes WHERE expires_at < NOW() OR used = TRUE;

-- RLS: only service_role can access
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON verification_codes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

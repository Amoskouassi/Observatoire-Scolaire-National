-- 13_add_login_code.sql
-- Add fixed login codes for enqueteurs (code-login + email OTP flow)

-- Add login_code column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_code TEXT UNIQUE;

-- Generate unique login codes for existing enqueteurs
-- Format: ENQ-XXXX (4 random uppercase letters)
UPDATE profiles
SET login_code = 'ENQ-' || upper(
  substr(md5(random()::text), 1, 4)
)
WHERE role = 'enqueteur' AND login_code IS NULL;

-- Make login_code required for enqueteurs going forward
-- (We don't add NOT NULL yet to avoid breaking existing inserts)

-- Add index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_login_code ON profiles(login_code) WHERE login_code IS NOT NULL;

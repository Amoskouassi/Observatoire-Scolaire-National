-- 13: Ajouter login_code_created_at pour expiration des codes enquêteurs
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_code_created_at TIMESTAMPTZ;

-- Mettre à jour les codes existants avec la date actuelle (conservatisme)
UPDATE profiles SET login_code_created_at = NOW() WHERE login_code IS NOT NULL AND login_code_created_at IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- Admin auth: add is_admin + swap the admin account to janati.shima@gmail.com
-- Run in Supabase SQL Editor — this is the only file you need, it includes
-- the column setup too (safe to run even if you already ran the other one).
--
-- IMPORTANT: sign up for a real account at janati.shima@gmail.com through
-- the normal /signup page FIRST (any role — "User" is fine, this account's
-- only real purpose is admin access). The grant below is a no-op if that
-- profile row doesn't exist yet.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

UPDATE profiles SET is_admin = true  WHERE email = 'janati.shima@gmail.com';
UPDATE profiles SET is_admin = false WHERE email = 'shima.1110@gmail.com';

-- Sanity check — janati.shima@gmail.com should show true, shima.1110@gmail.com should show false.
-- If janati.shima@gmail.com doesn't appear at all, that account hasn't signed up yet.
SELECT id, email, is_admin FROM profiles WHERE email IN ('janati.shima@gmail.com', 'shima.1110@gmail.com');

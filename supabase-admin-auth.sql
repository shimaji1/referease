-- ═══════════════════════════════════════════════════════════════
-- Admin auth foundation — phase 2, step 1
-- Run in Supabase SQL Editor
--
-- Replaces the single client-side password (visible in the public JS
-- bundle via NEXT_PUBLIC_ADMIN_PASSWORD) with a real Supabase Auth
-- login + an is_admin flag, so RLS policies can finally recognize
-- "this request is really the admin" instead of just trusting the
-- anon key.
--
-- This step only adds the column and a helper function — it does NOT
-- touch providers/claims/etc. RLS yet. Safe to run standalone.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Helper used by every admin-aware RLS policy from here on. SECURITY DEFINER so it
-- can read profiles.is_admin regardless of the caller's own RLS visibility into
-- profiles (which is locked to "own row only" — see supabase-rls-hardening.sql).
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Grant yourself admin ─────────────────────────────────────────
-- Run this with YOUR real login email (the one you use for the Dr. Kay
-- provider account) — that's the account that will log into /admin
-- going forward.
UPDATE profiles SET is_admin = true WHERE email = 'shima.1110@gmail.com';

-- Sanity check — should return one row with is_admin = true.
SELECT id, email, is_admin FROM profiles WHERE email = 'shima.1110@gmail.com';

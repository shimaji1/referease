-- ═══════════════════════════════════════════════════════════════
-- RLS hardening — phase 1
-- Run in Supabase SQL Editor (supabase.com → SQL Editor → New Query)
--
-- Scope: only tables confirmed to have ZERO admin-panel write dependency
-- (admin still writes to providers/claims/physicians/specialties/
-- site_settings/provider_announcements directly with the anon key —
-- tightening those would break the admin panel today, so they're
-- deliberately left untouched here; that's phase 2, paired with moving
-- admin off a single client-side password).
--
-- Safe to re-run: every policy is dropped before being recreated.
-- ═══════════════════════════════════════════════════════════════

-- ── profiles ──────────────────────────────────────────────────
-- One row per user, keyed by auth.users.id. Fully private to its owner —
-- nothing in the app reads another user's profile.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
-- No DELETE policy — accounts are removed by the team, not self-service.

-- ── favourite_lists / favourite_list_items ───────────────────
-- A user's saved-provider lists. Fully private to the owner.
ALTER TABLE favourite_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE favourite_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favourite_lists_all_own" ON favourite_lists;
DROP POLICY IF EXISTS "favourite_list_items_all_own" ON favourite_list_items;

CREATE POLICY "favourite_lists_all_own" ON favourite_lists
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "favourite_list_items_all_own" ON favourite_list_items
  FOR ALL USING (list_id IN (SELECT id FROM favourite_lists WHERE owner_id = auth.uid()))
  WITH CHECK (list_id IN (SELECT id FROM favourite_lists WHERE owner_id = auth.uid()));

-- ── provider_staff ────────────────────────────────────────────
-- Join table between a provider listing and the users who can manage it.
-- Invite creation/lookup/accept all go through service-role API routes
-- now (/api/staff/invite, /api/staff/accept) — no anon access needed at
-- all for those. Only the provider owner (viewing/revoking their team)
-- and a staff member (seeing their own row) need direct access.
ALTER TABLE provider_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_staff_select" ON provider_staff;
DROP POLICY IF EXISTS "provider_staff_update_owner" ON provider_staff;

CREATE POLICY "provider_staff_select" ON provider_staff FOR SELECT USING (
  user_id = auth.uid()
  OR provider_id IN (SELECT id FROM providers WHERE owner_id = auth.uid())
);
CREATE POLICY "provider_staff_update_owner" ON provider_staff FOR UPDATE USING (
  provider_id IN (SELECT id FROM providers WHERE owner_id = auth.uid())
);
-- No INSERT/DELETE policy for anon — invites are created via the service-role
-- route only, and there's no self-service delete today (revoke = status update).

-- ── verification_codes ───────────────────────────────────────
-- One-time fax/email verification codes. 100% service-role access already
-- (/api/verify) — RLS enabled with zero policies fully locks out the anon
-- key, which is exactly right: nobody should be able to read or guess
-- another provider's pending code directly against the database.
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- ── provider_update_tokens ────────────────────────────────────
-- Magic-link-style tokens for the monthly "update your info" email flow.
-- 100% service-role access already (/api/monthly-update, /api/update-info) —
-- same reasoning, zero policies fully locks out the anon key.
ALTER TABLE provider_update_tokens ENABLE ROW LEVEL SECURITY;

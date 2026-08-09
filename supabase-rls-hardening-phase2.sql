-- ═══════════════════════════════════════════════════════════════
-- RLS hardening — phase 2
-- Run in Supabase SQL Editor (after supabase-admin-auth.sql, which
-- creates is_admin() — this file assumes it already exists but
-- recreates it too, so it's safe to run standalone)
--
-- Covers every remaining table the admin panel and provider dashboards
-- write to directly with the anon key: providers, claims, physicians,
-- specialties, site_settings, doctor_locations, listing_forms,
-- provider_announcements, posts, programs, upgrade_requests,
-- site_events, provider_analytics_events.
--
-- Safe to re-run: every policy is dropped before being recreated.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- True if the current user owns provider `pid` directly, manages it as accepted staff,
-- or is admin. Reused across every table below that's scoped to "your own listing."
CREATE OR REPLACE FUNCTION can_edit_provider(pid BIGINT)
RETURNS BOOLEAN AS $$
  SELECT is_admin() OR EXISTS (
    SELECT 1 FROM providers WHERE id = pid AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM provider_staff WHERE provider_id = pid AND user_id = auth.uid() AND status = 'accepted'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── providers ─────────────────────────────────────────────────
-- KNOWN LIMITATION: linking an *existing, unowned* doctor row (found via search) onto
-- a brand-new clinic — used in "add clinic" when adding doctors already in the
-- directory — needs can_edit_provider() on that doctor row, which it won't have if
-- nobody owns/staffs it yet. If that flow breaks after this runs, it needs a follow-up
-- (a dedicated "link" RPC checked server-side), not a broader UPDATE policy.
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read providers" ON providers;
DROP POLICY IF EXISTS "Allow all inserts" ON providers;
DROP POLICY IF EXISTS "Allow all updates" ON providers;
DROP POLICY IF EXISTS "Allow all deletes" ON providers;
DROP POLICY IF EXISTS "providers_select" ON providers;
DROP POLICY IF EXISTS "providers_insert" ON providers;
DROP POLICY IF EXISTS "providers_update" ON providers;
DROP POLICY IF EXISTS "providers_delete" ON providers;

CREATE POLICY "providers_select" ON providers FOR SELECT USING (true);
CREATE POLICY "providers_insert" ON providers FOR INSERT WITH CHECK (
  is_admin() OR owner_id = auth.uid()
  OR (owner_id IS NULL AND clinic_provider_id IS NOT NULL AND can_edit_provider(clinic_provider_id))
);
CREATE POLICY "providers_update" ON providers FOR UPDATE USING (is_admin() OR can_edit_provider(id));
CREATE POLICY "providers_delete" ON providers FOR DELETE USING (is_admin());

-- ── claims ────────────────────────────────────────────────────
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "claims_select" ON claims;
DROP POLICY IF EXISTS "claims_insert" ON claims;
DROP POLICY IF EXISTS "claims_update" ON claims;
DROP POLICY IF EXISTS "claims_delete" ON claims;

CREATE POLICY "claims_select" ON claims FOR SELECT USING (is_admin() OR user_id = auth.uid());
CREATE POLICY "claims_insert" ON claims FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "claims_update" ON claims FOR UPDATE USING (is_admin());
CREATE POLICY "claims_delete" ON claims FOR DELETE USING (is_admin());

-- ── physicians ────────────────────────────────────────────────
-- No non-admin code reads or writes this table today besides the owner it gets
-- assigned to on claim approval — locked to admin + that owner.
ALTER TABLE physicians ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "physicians_select" ON physicians;
DROP POLICY IF EXISTS "physicians_insert" ON physicians;
DROP POLICY IF EXISTS "physicians_update" ON physicians;
DROP POLICY IF EXISTS "physicians_delete" ON physicians;

CREATE POLICY "physicians_select" ON physicians FOR SELECT USING (is_admin() OR owner_id = auth.uid());
CREATE POLICY "physicians_insert" ON physicians FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "physicians_update" ON physicians FOR UPDATE USING (is_admin());
CREATE POLICY "physicians_delete" ON physicians FOR DELETE USING (is_admin());

-- ── specialties ───────────────────────────────────────────────
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "specialties_select" ON specialties;
DROP POLICY IF EXISTS "specialties_insert" ON specialties;
DROP POLICY IF EXISTS "specialties_update" ON specialties;
DROP POLICY IF EXISTS "specialties_delete" ON specialties;

CREATE POLICY "specialties_select" ON specialties FOR SELECT USING (true);
CREATE POLICY "specialties_insert" ON specialties FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "specialties_update" ON specialties FOR UPDATE USING (is_admin());
CREATE POLICY "specialties_delete" ON specialties FOR DELETE USING (is_admin());

-- ── site_settings ─────────────────────────────────────────────
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "site_settings_select" ON site_settings;
DROP POLICY IF EXISTS "site_settings_insert" ON site_settings;
DROP POLICY IF EXISTS "site_settings_update" ON site_settings;
DROP POLICY IF EXISTS "site_settings_delete" ON site_settings;

CREATE POLICY "site_settings_select" ON site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings_insert" ON site_settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "site_settings_update" ON site_settings FOR UPDATE USING (is_admin());
CREATE POLICY "site_settings_delete" ON site_settings FOR DELETE USING (is_admin());

-- ── doctor_locations ──────────────────────────────────────────
ALTER TABLE doctor_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doctor_locations_select" ON doctor_locations;
DROP POLICY IF EXISTS "doctor_locations_insert" ON doctor_locations;
DROP POLICY IF EXISTS "doctor_locations_update" ON doctor_locations;
DROP POLICY IF EXISTS "doctor_locations_delete" ON doctor_locations;

CREATE POLICY "doctor_locations_select" ON doctor_locations FOR SELECT USING (true);
CREATE POLICY "doctor_locations_insert" ON doctor_locations FOR INSERT WITH CHECK (
  can_edit_provider(doctor_provider_id) OR can_edit_provider(clinic_provider_id)
);
CREATE POLICY "doctor_locations_update" ON doctor_locations FOR UPDATE USING (
  can_edit_provider(doctor_provider_id) OR can_edit_provider(clinic_provider_id)
);
CREATE POLICY "doctor_locations_delete" ON doctor_locations FOR DELETE USING (
  can_edit_provider(doctor_provider_id) OR can_edit_provider(clinic_provider_id)
);

-- ── listing_forms ─────────────────────────────────────────────
-- Physician-side uploads (physician_id set) are intentionally ungated for now, matching
-- the existing app behavior/comment in FormsManager.js — only checked for provider_id.
ALTER TABLE listing_forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "listing_forms_select" ON listing_forms;
DROP POLICY IF EXISTS "listing_forms_insert" ON listing_forms;
DROP POLICY IF EXISTS "listing_forms_update" ON listing_forms;
DROP POLICY IF EXISTS "listing_forms_delete" ON listing_forms;

CREATE POLICY "listing_forms_select" ON listing_forms FOR SELECT USING (true);
CREATE POLICY "listing_forms_insert" ON listing_forms FOR INSERT WITH CHECK (
  is_admin() OR (
    owner_id = auth.uid() AND (
      (provider_id IS NOT NULL AND can_edit_provider(provider_id)) OR physician_id IS NOT NULL
    )
  )
);
CREATE POLICY "listing_forms_update" ON listing_forms FOR UPDATE USING (
  is_admin() OR owner_id = auth.uid() OR (provider_id IS NOT NULL AND can_edit_provider(provider_id))
);
CREATE POLICY "listing_forms_delete" ON listing_forms FOR DELETE USING (
  is_admin() OR owner_id = auth.uid() OR (provider_id IS NOT NULL AND can_edit_provider(provider_id))
);

-- ── provider_announcements ────────────────────────────────────
-- Approve/reject already goes through the service-role /api/announcements/review route
-- (bypasses RLS entirely), so this only needs to cover create/edit/delete/read.
ALTER TABLE provider_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "provider_announcements_select" ON provider_announcements;
DROP POLICY IF EXISTS "provider_announcements_insert" ON provider_announcements;
DROP POLICY IF EXISTS "provider_announcements_update" ON provider_announcements;
DROP POLICY IF EXISTS "provider_announcements_delete" ON provider_announcements;

CREATE POLICY "provider_announcements_select" ON provider_announcements FOR SELECT USING (
  status = 'approved' OR is_admin() OR (provider_id IS NOT NULL AND can_edit_provider(provider_id))
);
CREATE POLICY "provider_announcements_insert" ON provider_announcements FOR INSERT WITH CHECK (
  is_admin() OR (provider_id IS NOT NULL AND can_edit_provider(provider_id))
);
CREATE POLICY "provider_announcements_update" ON provider_announcements FOR UPDATE USING (
  is_admin() OR (provider_id IS NOT NULL AND can_edit_provider(provider_id))
);
CREATE POLICY "provider_announcements_delete" ON provider_announcements FOR DELETE USING (
  is_admin() OR (provider_id IS NOT NULL AND can_edit_provider(provider_id))
);

-- ── posts (blog) ──────────────────────────────────────────────
-- Public pages already filter .eq('published', true) at the query level, but that's
-- an app-level courtesy, not a security boundary — without this RLS, anyone querying
-- the table directly could read unpublished drafts. Admin sees everything via is_admin().
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "posts_select" ON posts;
DROP POLICY IF EXISTS "posts_insert" ON posts;
DROP POLICY IF EXISTS "posts_update" ON posts;
DROP POLICY IF EXISTS "posts_delete" ON posts;

CREATE POLICY "posts_select" ON posts FOR SELECT USING (published = true OR is_admin());
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "posts_update" ON posts FOR UPDATE USING (is_admin());
CREATE POLICY "posts_delete" ON posts FOR DELETE USING (is_admin());

-- ── programs ──────────────────────────────────────────────────
-- Nothing in the app writes to this table today (populated externally) — public read
-- only, matching current behavior; no anon write policy needed.
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "programs_select" ON programs;
CREATE POLICY "programs_select" ON programs FOR SELECT USING (true);

-- ── upgrade_requests ──────────────────────────────────────────
-- Insert-only, already via the service role (/api/plan/upgrade-request) — locking this
-- down entirely to admin read is a pure improvement, nothing else touches it.
ALTER TABLE upgrade_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "upgrade_requests_select" ON upgrade_requests;
CREATE POLICY "upgrade_requests_select" ON upgrade_requests FOR SELECT USING (is_admin());

-- ── site_events ───────────────────────────────────────────────
-- Sitewide analytics (pageviews, searches) — inserted anonymously by every visitor's
-- browser, by design (no login needed to be tracked), so INSERT stays open. Reading
-- aggregated traffic data is admin-only.
ALTER TABLE site_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "site_events_select" ON site_events;
DROP POLICY IF EXISTS "site_events_insert" ON site_events;
CREATE POLICY "site_events_select" ON site_events FOR SELECT USING (is_admin());
CREATE POLICY "site_events_insert" ON site_events FOR INSERT WITH CHECK (true);

-- ── provider_analytics_events ─────────────────────────────────
-- Per-listing view/click tracking — insert stays open (anonymous visitors trigger these
-- just by viewing a listing), but reading is scoped to admin or that listing's own
-- owner/staff (Featured-plan "Full analytics" reads its own provider's events).
ALTER TABLE provider_analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "provider_analytics_events_select" ON provider_analytics_events;
DROP POLICY IF EXISTS "provider_analytics_events_insert" ON provider_analytics_events;
CREATE POLICY "provider_analytics_events_select" ON provider_analytics_events FOR SELECT USING (
  is_admin() OR can_edit_provider(provider_id)
);
CREATE POLICY "provider_analytics_events_insert" ON provider_analytics_events FOR INSERT WITH CHECK (true);

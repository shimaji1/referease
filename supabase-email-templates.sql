-- ═══════════════════════════════════════════════════════════════
-- Email templates — admin-editable content for outreach/lifecycle
-- emails. Seeded with the exact content that was previously hardcoded
-- in src/app/api/outreach/templates.js (now src/lib/emailTemplateDefaults.js),
-- so nothing changes visually until someone edits a row in the
-- dashboard's Email Templates tab.
--
-- If a row is ever missing or unreadable, sending code falls back to
-- DEFAULT_TEMPLATES in src/lib/emailTemplateDefaults.js automatically —
-- this table is a convenience layer on top of that, never a single
-- point of failure for actually sending mail.
--
-- Safe to re-run: ON CONFLICT DO NOTHING means existing rows (and any
-- edits already made to them) are left untouched.
-- Run in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS email_templates (
  key TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_html_featured TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_templates_select" ON email_templates;
DROP POLICY IF EXISTS "email_templates_insert" ON email_templates;
DROP POLICY IF EXISTS "email_templates_update" ON email_templates;
-- Admin-only from the browser. Send-time reads always go through the
-- service role (bypasses RLS), same as claim_invites/verification_codes.
-- Insert is included (not just update) so the editor can safely upsert if a
-- key is ever missing — all rows are pre-seeded below, so this is a
-- belt-and-suspenders path, not the normal one.
CREATE POLICY "email_templates_select" ON email_templates FOR SELECT USING (is_admin());
CREATE POLICY "email_templates_insert" ON email_templates FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "email_templates_update" ON email_templates FOR UPDATE USING (is_admin());

INSERT INTO email_templates (key, subject, body_html, body_html_featured) VALUES
  ('claim', 'Your practice is on ReferEasy, claim your free listing', '<h1>{{name}} is listed on ReferEasy</h1>
<p>Ontario family physicians are using ReferEasy to find specialists, imaging centres, and clinics accepting referrals, with real-time wait times and referral criteria.</p>
<p>{{name}} is currently listed in our directory, but the profile hasn''t been claimed yet. Claiming your listing takes 5 minutes and is completely free.</p>
<ul>
<li><strong>Control your info</strong> — hours, wait times, accepting-referrals status</li>
<li><strong>Get verified</strong> — a trust badge referring physicians look for</li>
<li><strong>Receive matched referrals</strong> — specify the patients you want</li>
<li><strong>Track your listing</strong> — see how many physicians view your profile</li>
</ul>
{{customMessage}}
<p><strong><a href="https://www.refereasy.ca/signup">Claim your free listing →</a></strong></p>
<p>Prefer to look first? Visit <a href="https://www.refereasy.ca/search">refereasy.ca/search</a> and find your listing.</p>', NULL),
  ('verified', 'You''re one step from Verified on ReferEasy', '<h1>You''re one step from Verified</h1>
<p>Thanks for claiming {{name}} on ReferEasy. Upgrading to <strong>Verified</strong> puts a trust badge on your profile — the same badge referring physicians filter by when they search.</p>
<ul>
<li><strong>Verified badge</strong> — visible on every search result</li>
<li><strong>Mid-priority ranking</strong> — appear above unverified providers</li>
<li><strong>Up to 3 referral forms</strong> — attach your requisition, referral form, or intake sheet</li>
<li><strong>Custom How-to-Refer</strong> — plain-language instructions on your profile</li>
<li><strong>View analytics</strong> — see how many physicians viewed you this month</li>
</ul>
{{customMessage}}
<p><strong><a href="https://www.refereasy.ca/pricing">Upgrade to Verified, $29/mo →</a></strong></p>
<p>Verification takes a couple minutes: a fax code, an email code, and — for individual physicians — an optional CPSO check. No ID required.</p>', NULL),
  ('featured', 'Get top placement on Ontario''s referral platform', '<h1>Get top placement on ReferEasy</h1>
<p>As a Verified provider ({{name}}), you already have the badge referring physicians look for. <strong>Featured</strong> puts your listing at the top of every search that matches your specialty and location.</p>
<ul>
<li><strong>Top-priority search rank</strong> — first result for your specialty</li>
<li><strong>Featured slots</strong> — homepage, category pages, and near-me results</li>
<li><strong>Full analytics dashboard</strong> — views, contacts, referral sources</li>
<li><strong>Monthly performance email</strong> — track your growth</li>
<li><strong>Editorial blog spotlight</strong> — one feature article per year</li>
<li><strong>Unlimited</strong> forms, locations, and staff accounts</li>
</ul>
{{customMessage}}
<p><strong><a href="https://www.refereasy.ca/pricing">Upgrade to Featured, $79/mo →</a></strong></p>
<p>Featured slots are limited per specialty and area to keep placement meaningful.</p>', NULL),
  ('cold', 'Ontario physicians are using ReferEasy, join us', '<h1>Ontario physicians are using ReferEasy</h1>
<p>ReferEasy is Ontario''s live physician-to-physician referral platform. Family physicians use it to find specialists, imaging, labs, and clinics accepting referrals, with wait times and referral criteria visible up front.</p>
<p>If you accept referrals from other physicians, being listed means being found. Free tier includes:</p>
<ul>
<li>Public directory listing with your address, hours, and accepting-referrals status</li>
<li>Category and specialty tags so you appear in relevant searches</li>
<li>The ability to claim, verify, and customize your listing at any time</li>
<li>Zero cost, zero commitment</li>
</ul>
{{customMessage}}
<p><strong><a href="https://www.refereasy.ca/signup">List your practice, free →</a></strong></p>
<p>Or explore first: <a href="https://www.refereasy.ca/search">refereasy.ca/search</a></p>', NULL),
  ('trial_15d', 'Your ReferEasy trial ends in 15 days', '<h1>Your trial ends in 15 days</h1>
<p>Hi {{name}}, your Verified trial on ReferEasy runs through <strong>{{endDate}}</strong>. That''s just over two weeks away.</p>
<p>Here''s what you''ll lose if the trial expires without a payment method on file:</p>
<ul>
<li>Your <strong>✓ Verified badge</strong> — the trust signal referring physicians filter by</li>
<li><strong>Mid-priority ranking</strong> in search</li>
<li>Your custom referral forms (they''ll be hidden, not deleted)</li>
<li>Custom How-to-Refer instructions</li>
<li>Multi-location support</li>
</ul>
{{customMessage}}
<p>Add a card now and you won''t be charged a cent until the trial actually ends — it just keeps everything running without interruption.</p>
<p><strong><a href="https://www.refereasy.ca/dashboard/settings?tab=billing">Add payment method →</a></strong></p>
<p>Your listing stays live either way, only the paid features disappear on downgrade.</p>', '<h1>Your trial ends in 15 days</h1>
<p>Hi {{name}}, your Featured trial on ReferEasy runs through <strong>{{endDate}}</strong>. That''s just over two weeks away.</p>
<p>Here''s what you''ll lose if the trial expires without a payment method on file:</p>
<ul>
<li>Your <strong>Featured placement</strong> at the top of every relevant search</li>
<li>Homepage and category featured slots</li>
<li>Full <strong>analytics dashboard</strong></li>
<li>Priority near-me placement</li>
<li>Editorial blog spotlight eligibility</li>
</ul>
{{customMessage}}
<p>Add a card now and you won''t be charged a cent until the trial actually ends — it just keeps everything running without interruption.</p>
<p><strong><a href="https://www.refereasy.ca/dashboard/settings?tab=billing">Add payment method →</a></strong></p>
<p>Your listing stays live either way, only the paid features disappear on downgrade.</p>'),
  ('trial_7d', 'One week left on your ReferEasy trial', '<h1>One week left on your trial</h1>
<p>Hi {{name}}, your {{tier}} trial ends <strong>{{endDate}}</strong>. Seven days from now.</p>
<p>You''ve been on the plan for over 50 days. Referring physicians in your area have been seeing your enhanced listing that entire time. Losing those features means dropping back to the standard Listed appearance.</p>
{{customMessage}}
<p>Add a payment method to keep it going — takes about a minute, and nothing is charged until your trial ends.</p>
<p><strong><a href="https://www.refereasy.ca/dashboard/settings?tab=billing">Add payment method →</a></strong></p>', NULL),
  ('trial_5d', '5 days until your Verified badge disappears', '<h1>5 days until downgrade</h1>
<p>Hi {{name}}, your Verified trial ends on <strong>{{endDate}}</strong>. Five days.</p>
<p>Once the trial ends, your ✓ Verified badge, custom referral forms, and How-to-Refer instructions will be hidden. Your listing stays live at standard placement.</p>
{{customMessage}}
<p>Add a card in the next few days to keep your current plan — no charge until the trial actually ends.</p>
<p><strong><a href="https://www.refereasy.ca/dashboard/settings?tab=billing">Add payment method →</a></strong></p>', '<h1>5 days until downgrade</h1>
<p>Hi {{name}}, your Featured trial ends on <strong>{{endDate}}</strong>. Five days.</p>
<p>Once the trial ends, you''ll drop out of the featured slots on the homepage, category pages, and near-me results. Your listing stays live, but at standard placement.</p>
{{customMessage}}
<p>Add a card in the next few days to keep your current plan — no charge until the trial actually ends.</p>
<p><strong><a href="https://www.refereasy.ca/dashboard/settings?tab=billing">Add payment method →</a></strong></p>'),
  ('trial_1d', 'Tomorrow: your ReferEasy trial ends', '<h1>Tomorrow: your trial ends</h1>
<p>Hi {{name}}, this is the last reminder. Your {{tier}} plan expires <strong>tonight at midnight ET</strong> and downgrades to Listed (free) tomorrow morning unless a card is on file.</p>
<p>Your listing stays live. Your data is preserved. But your paid features will be hidden until you add a payment method and keep your plan.</p>
{{customMessage}}
<p><strong><a href="https://www.refereasy.ca/dashboard/settings?tab=billing">Add payment method →</a></strong></p>
<p>Takes about a minute, and your plan continues without interruption.</p>', NULL),
  ('claim_more_info', 'A quick question about your ReferEasy claim', '<h1>We need a bit more information</h1>
<p>Hi {{name}}, thanks for submitting a claim on ReferEasy. Before we can approve it, we need a little more from you:</p>
{{customMessage}}
<p>Just reply directly to this email with the details, and we''ll pick your claim back up right away.</p>', NULL),
  ('claim_invite', 'You''re invited to claim {{name}} on ReferEasy', '<h1>You''re invited to claim {{name}}</h1>
<p>You''ve been invited to take ownership of {{name}}''s listing on ReferEasy — manage availability, referral criteria, forms, and more.</p>
<p>Click below to set up your account — no verification codes needed.</p>
<p><strong><a href="{{acceptUrl}}">Claim this listing →</a></strong></p>
<p>If you weren''t expecting this, you can safely ignore this email — no account will be created.</p>', NULL)
ON CONFLICT (key) DO NOTHING;

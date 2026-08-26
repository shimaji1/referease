// Pure data/functions for the 9 outreach/lifecycle email templates — no server-only
// imports here (no service-role key, nothing env-dependent), so this file is safe to
// import from BOTH server API routes (src/app/api/outreach/templates.js) and the
// admin browser editor (TemplatesTab in h3583r92ew/page.js). Keep it that way — the
// moment this needs getServiceSupabase or another server secret, split it back out.
//
// These are also the "Reset to default" content and the single source of truth for
// the supabase-email-templates.sql seed migration (generated from this file's data,
// not hand-typed, so the two can't drift).

const BASE = 'https://www.refereasy.ca'

export const wrap = (bodyHtml, { replyOk = false } = {}) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:0;background:#ffffff">
  <div style="background:#1e3a5f;padding:22px 32px">
    <a href="${BASE}" style="text-decoration:none;display:inline-block">
      <img src="${BASE}/img/logo-white.png" alt="ReferEasy" height="32" style="display:block" />
    </a>
  </div>
  <div style="padding:32px">
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 18px">
    <p style="color:#94a3b8;font-size:11px;line-height:1.6;margin:0">
      ${replyOk ? 'Reply directly to this email — a real person on our team will see it.' : "This is an automated message — please don't reply to this email."}<br>
      ReferEasy · Ontario's live physician-to-physician referral platform · <a href="${BASE}" style="color:#94a3b8">refereasy.ca</a><br>
      You're receiving this because your practice is listed at refereasy.ca or you were referred by a colleague. If this isn't relevant, no action needed.
    </p>
  </div>
</div>`

export const custom = (msg) => msg ? `<div style="background:#f8fafc;border-left:3px solid #1e3a5f;padding:14px 18px;margin:20px 0;color:#334155;font-size:14px;line-height:1.6;font-style:italic">${msg.replace(/\n/g, '<br>')}</div>` : ''

export const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// replyOk templates get the "reply to this" footer instead of "don't reply" — structural,
// not editable content, so it's keyed off the template key rather than stored per-row.
export const REPLY_OK_KEYS = new Set(['claim_more_info'])

// Merge tokens available in subject + body:
//   {{name}}          — provider name, bold, falls back to "Your practice"
//   {{tier}}          — "Verified" or "Featured" (trial reminders only)
//   {{endDate}}       — formatted trial end date (trial reminders only)
//   {{acceptUrl}}     — one-time claim/accept link (claim_invite only)
//   {{customMessage}} — the italic callout box for a per-send custom note;
//                        renders empty when no custom message was provided.
export function mergeTags(text, opts = {}) {
  const nameVal = opts.name ? `<strong>${escapeHtml(opts.name)}</strong>` : 'Your practice'
  const tierVal = opts.tier === 'featured' ? 'Featured' : 'Verified'
  return String(text || '')
    .replaceAll('{{name}}', nameVal)
    .replaceAll('{{tier}}', tierVal)
    .replaceAll('{{endDate}}', opts.endDate || '')
    .replaceAll('{{acceptUrl}}', opts.acceptUrl || '')
    .replaceAll('{{customMessage}}', custom(opts.customMessage))
}

// Inline-styles whatever semantic HTML the admin's rich-text editor (or a default
// template) produced, so branding/typography stays consistent regardless of what was
// typed — admin edits content, never layout. Only touches tags with no style attribute
// yet, so anything the editor already inlined (font size, color picks) is left alone.
export function styleEmailHtml(html) {
  if (!html) return ''
  return html
    .replace(/<h1(?![^>]*style=)/g, '<h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 14px;line-height:1.3"')
    .replace(/<h2(?![^>]*style=)/g, '<h2 style="color:#0f172a;font-size:18px;font-weight:700;margin:20px 0 10px;line-height:1.3"')
    .replace(/<h3(?![^>]*style=)/g, '<h3 style="color:#0f172a;font-size:15px;font-weight:700;margin:16px 0 8px;line-height:1.3"')
    .replace(/<h4(?![^>]*style=)/g, '<h4 style="color:#0f172a;font-size:14px;font-weight:700;margin:14px 0 6px;line-height:1.3"')
    .replace(/<p(?![^>]*style=)/g, '<p style="color:#334155;font-size:15px;line-height:1.65;margin:0 0 16px"')
    .replace(/<ul(?![^>]*style=)/g, '<ul style="color:#334155;font-size:14px;line-height:1.7;margin:16px 0 20px;padding-left:20px"')
    .replace(/<ol(?![^>]*style=)/g, '<ol style="color:#334155;font-size:14px;line-height:1.7;margin:16px 0 20px;padding-left:20px"')
    .replace(/<li(?![^>]*style=)/g, '<li style="margin-bottom:6px"')
    .replace(/<a(?![^>]*style=)/g, '<a style="color:#1e3a5f;font-weight:600;text-decoration:underline"')
    .replace(/<strong(?![^>]*style=)/g, '<strong style="font-weight:700"')
    .replace(/<blockquote(?![^>]*style=)/g, '<blockquote style="border-left:3px solid #1e3a5f;padding-left:14px;margin:16px 0;color:#64748b;font-style:italic"')
}

// trial_15d and trial_5d have genuinely different bullet copy per plan tier (not just
// a word swap), so those two keys carry a `bodyFeatured` variant, selected when
// opts.tier === 'featured'. Every other template shares one body across tiers.
export const DEFAULT_TEMPLATES = {
  claim: {
    subject: "Your practice is on ReferEasy, claim your free listing",
    body: `<h1>{{name}} is listed on ReferEasy</h1>
<p>Ontario family physicians are using ReferEasy to find specialists, imaging centres, and clinics accepting referrals, with real-time wait times and referral criteria.</p>
<p>{{name}} is currently listed in our directory, but the profile hasn't been claimed yet. Claiming your listing takes 5 minutes and is completely free.</p>
<ul>
<li><strong>Control your info</strong> — hours, wait times, accepting-referrals status</li>
<li><strong>Get verified</strong> — a trust badge referring physicians look for</li>
<li><strong>Receive matched referrals</strong> — specify the patients you want</li>
<li><strong>Track your listing</strong> — see how many physicians view your profile</li>
</ul>
{{customMessage}}
<p><strong><a href="${BASE}/signup">Claim your free listing →</a></strong></p>
<p>Prefer to look first? Visit <a href="${BASE}/search">refereasy.ca/search</a> and find your listing.</p>`,
  },
  verified: {
    subject: "You're one step from Verified on ReferEasy",
    body: `<h1>You're one step from Verified</h1>
<p>Thanks for claiming {{name}} on ReferEasy. Upgrading to <strong>Verified</strong> puts a trust badge on your profile — the same badge referring physicians filter by when they search.</p>
<ul>
<li><strong>Verified badge</strong> — visible on every search result</li>
<li><strong>Mid-priority ranking</strong> — appear above unverified providers</li>
<li><strong>Up to 3 referral forms</strong> — attach your requisition, referral form, or intake sheet</li>
<li><strong>Custom How-to-Refer</strong> — plain-language instructions on your profile</li>
<li><strong>View analytics</strong> — see how many physicians viewed you this month</li>
</ul>
{{customMessage}}
<p><strong><a href="${BASE}/pricing">Upgrade to Verified, $29/mo →</a></strong></p>
<p>Verification takes a couple minutes: a fax code, an email code, and — for individual physicians — an optional CPSO check. No ID required.</p>`,
  },
  featured: {
    subject: "Get top placement on Ontario's referral platform",
    body: `<h1>Get top placement on ReferEasy</h1>
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
<p><strong><a href="${BASE}/pricing">Upgrade to Featured, $79/mo →</a></strong></p>
<p>Featured slots are limited per specialty and area to keep placement meaningful.</p>`,
  },
  cold: {
    subject: "Ontario physicians are using ReferEasy, join us",
    body: `<h1>Ontario physicians are using ReferEasy</h1>
<p>ReferEasy is Ontario's live physician-to-physician referral platform. Family physicians use it to find specialists, imaging, labs, and clinics accepting referrals, with wait times and referral criteria visible up front.</p>
<p>If you accept referrals from other physicians, being listed means being found. Free tier includes:</p>
<ul>
<li>Public directory listing with your address, hours, and accepting-referrals status</li>
<li>Category and specialty tags so you appear in relevant searches</li>
<li>The ability to claim, verify, and customize your listing at any time</li>
<li>Zero cost, zero commitment</li>
</ul>
{{customMessage}}
<p><strong><a href="${BASE}/signup">List your practice, free →</a></strong></p>
<p>Or explore first: <a href="${BASE}/search">refereasy.ca/search</a></p>`,
  },
  trial_15d: {
    subject: "Your ReferEasy trial ends in 15 days",
    body: `<h1>Your trial ends in 15 days</h1>
<p>Hi {{name}}, your Verified trial on ReferEasy runs through <strong>{{endDate}}</strong>. That's just over two weeks away.</p>
<p>Here's what you'll lose if the trial expires without a payment method on file:</p>
<ul>
<li>Your <strong>✓ Verified badge</strong> — the trust signal referring physicians filter by</li>
<li><strong>Mid-priority ranking</strong> in search</li>
<li>Your custom referral forms (they'll be hidden, not deleted)</li>
<li>Custom How-to-Refer instructions</li>
<li>Multi-location support</li>
</ul>
{{customMessage}}
<p>Add a card now and you won't be charged a cent until the trial actually ends — it just keeps everything running without interruption.</p>
<p><strong><a href="${BASE}/dashboard/settings?tab=billing">Add payment method →</a></strong></p>
<p>Your listing stays live either way, only the paid features disappear on downgrade.</p>`,
    bodyFeatured: `<h1>Your trial ends in 15 days</h1>
<p>Hi {{name}}, your Featured trial on ReferEasy runs through <strong>{{endDate}}</strong>. That's just over two weeks away.</p>
<p>Here's what you'll lose if the trial expires without a payment method on file:</p>
<ul>
<li>Your <strong>Featured placement</strong> at the top of every relevant search</li>
<li>Homepage and category featured slots</li>
<li>Full <strong>analytics dashboard</strong></li>
<li>Priority near-me placement</li>
<li>Editorial blog spotlight eligibility</li>
</ul>
{{customMessage}}
<p>Add a card now and you won't be charged a cent until the trial actually ends — it just keeps everything running without interruption.</p>
<p><strong><a href="${BASE}/dashboard/settings?tab=billing">Add payment method →</a></strong></p>
<p>Your listing stays live either way, only the paid features disappear on downgrade.</p>`,
  },
  trial_7d: {
    subject: "One week left on your ReferEasy trial",
    body: `<h1>One week left on your trial</h1>
<p>Hi {{name}}, your {{tier}} trial ends <strong>{{endDate}}</strong>. Seven days from now.</p>
<p>You've been on the plan for over 50 days. Referring physicians in your area have been seeing your enhanced listing that entire time. Losing those features means dropping back to the standard Listed appearance.</p>
{{customMessage}}
<p>Add a payment method to keep it going — takes about a minute, and nothing is charged until your trial ends.</p>
<p><strong><a href="${BASE}/dashboard/settings?tab=billing">Add payment method →</a></strong></p>`,
  },
  trial_5d: {
    subject: "5 days until your Verified badge disappears",
    body: `<h1>5 days until downgrade</h1>
<p>Hi {{name}}, your Verified trial ends on <strong>{{endDate}}</strong>. Five days.</p>
<p>Once the trial ends, your ✓ Verified badge, custom referral forms, and How-to-Refer instructions will be hidden. Your listing stays live at standard placement.</p>
{{customMessage}}
<p>Add a card in the next few days to keep your current plan — no charge until the trial actually ends.</p>
<p><strong><a href="${BASE}/dashboard/settings?tab=billing">Add payment method →</a></strong></p>`,
    bodyFeatured: `<h1>5 days until downgrade</h1>
<p>Hi {{name}}, your Featured trial ends on <strong>{{endDate}}</strong>. Five days.</p>
<p>Once the trial ends, you'll drop out of the featured slots on the homepage, category pages, and near-me results. Your listing stays live, but at standard placement.</p>
{{customMessage}}
<p>Add a card in the next few days to keep your current plan — no charge until the trial actually ends.</p>
<p><strong><a href="${BASE}/dashboard/settings?tab=billing">Add payment method →</a></strong></p>`,
  },
  trial_1d: {
    subject: "Tomorrow: your ReferEasy trial ends",
    body: `<h1>Tomorrow: your trial ends</h1>
<p>Hi {{name}}, this is the last reminder. Your {{tier}} plan expires <strong>tonight at midnight ET</strong> and downgrades to Listed (free) tomorrow morning unless a card is on file.</p>
<p>Your listing stays live. Your data is preserved. But your paid features will be hidden until you add a payment method and keep your plan.</p>
{{customMessage}}
<p><strong><a href="${BASE}/dashboard/settings?tab=billing">Add payment method →</a></strong></p>
<p>Takes about a minute, and your plan continues without interruption.</p>`,
  },
  claim_more_info: {
    subject: "A quick question about your ReferEasy claim",
    body: `<h1>We need a bit more information</h1>
<p>Hi {{name}}, thanks for submitting a claim on ReferEasy. Before we can approve it, we need a little more from you:</p>
{{customMessage}}
<p>Just reply directly to this email with the details, and we'll pick your claim back up right away.</p>`,
  },
  claim_invite: {
    subject: "You're invited to claim {{name}} on ReferEasy",
    body: `<h1>You're invited to claim {{name}}</h1>
<p>You've been invited to take ownership of {{name}}'s listing on ReferEasy — manage availability, referral criteria, forms, and more.</p>
<p>Click below to set up your account — no verification codes needed.</p>
<p><strong><a href="{{acceptUrl}}">Claim this listing →</a></strong></p>
<p>If you weren't expecting this, you can safely ignore this email — no account will be created.</p>`,
  },
}

export const SUBJECTS = Object.fromEntries(Object.entries(DEFAULT_TEMPLATES).map(([k, v]) => [k, v.subject]))

// Renders a template from already-known content (a saved row, a draft, or the
// defaults) — the one render path both the server (send-time) and the admin editor's
// live preview share, so "what you preview" and "what actually sends" can't drift.
export function renderTemplate(key, { subject, body, bodyFeatured } = {}, opts = {}) {
  const useFeatured = opts.tier === 'featured'
  const bodySource = (useFeatured && bodyFeatured) ? bodyFeatured : body
  const mergedSubject = mergeTags(subject || '', opts).replace(/<[^>]+>/g, '')
  const mergedBody = wrap(styleEmailHtml(mergeTags(bodySource || '', opts)), { replyOk: REPLY_OK_KEYS.has(key) })
  return { subject: mergedSubject, html: mergedBody }
}

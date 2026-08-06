// Email templates for outreach campaigns.
// Each returns fully-formed HTML that Resend will send.

const BASE = 'https://www.refereasy.ca'
const wrap = (bodyHtml) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:0;background:#ffffff">
  <div style="background:#1e3a5f;padding:22px 32px">
    <a href="${BASE}" style="text-decoration:none;display:inline-block">
      <img src="${BASE}/img/logo.png" alt="ReferEasy" height="32" style="display:block" />
    </a>
  </div>
  <div style="padding:32px">
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 18px">
    <p style="color:#94a3b8;font-size:11px;line-height:1.6;margin:0">
      This is an automated message — please don't reply to this email.<br>
      ReferEasy · Ontario's live physician-to-physician referral platform · <a href="${BASE}" style="color:#94a3b8">refereasy.ca</a><br>
      You're receiving this because your practice is listed at refereasy.ca or you were referred by a colleague. If this isn't relevant, no action needed.
    </p>
  </div>
</div>`

export const SUBJECTS = {
  trial_15d: "Your ReferEasy trial ends in 15 days",
  trial_7d:  "One week left on your ReferEasy trial",
  trial_5d:  "5 days until your Verified badge disappears",
  trial_1d:  "Tomorrow: your ReferEasy trial ends",
  claim:    "Your practice is on ReferEasy, claim your free listing",
  verified: "You're one step from Verified on ReferEasy",
  featured: "Get top placement on Ontario's referral platform",
  cold:     "Ontario physicians are using ReferEasy, join us",
}

const btn = (label, url, color = '#1e3a5f') => `
  <div style="text-align:center;margin:28px 0">
    <a href="${url}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:0.02em">${label}</a>
  </div>`

const p = (html) => `<p style="color:#334155;font-size:15px;line-height:1.65;margin:0 0 16px">${html}</p>`
const h1 = (text) => `<h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 14px;line-height:1.3">${text}</h1>`
const bullet = (items) => `<ul style="color:#334155;font-size:14px;line-height:1.7;margin:16px 0 20px;padding-left:20px">${items.map(i => `<li style="margin-bottom:6px">${i}</li>`).join('')}</ul>`
const custom = (msg) => msg ? `<div style="background:#f8fafc;border-left:3px solid #1e3a5f;padding:14px 18px;margin:20px 0;color:#334155;font-size:14px;line-height:1.6;font-style:italic">${msg.replace(/\n/g, '<br>')}</div>` : ''

const TEMPLATES = {

  claim: ({ name, customMessage }) => wrap(`
    ${h1(name ? `${name} is listed on ReferEasy` : 'Your practice is listed on ReferEasy')}
    ${p("Ontario family physicians are using ReferEasy to find specialists, imaging centres, and clinics accepting referrals, with real-time wait times and referral criteria.")}
    ${p(`${name ? `<strong>${name}</strong> is` : 'Your practice is'} currently listed in our directory, but the profile hasn't been claimed yet. Claiming your listing takes 5 minutes and is completely free.`)}
    ${bullet([
      "<strong>Control your info</strong>, hours, wait times, accepting-referrals status",
      "<strong>Get verified</strong>, a trust badge referring physicians look for",
      "<strong>Receive matched referrals</strong>, specify the patients you want",
      "<strong>Track your listing</strong>, see how many physicians view your profile",
    ])}
    ${custom(customMessage)}
    ${btn('Claim your free listing →', `${BASE}/signup`)}
    ${p(`<span style="color:#64748b;font-size:13px">Prefer to look first? Visit <a href="${BASE}/search" style="color:#1e3a5f">refereasy.ca/search</a> and find your listing.</span>`)}
  `),

  verified: ({ name, customMessage }) => wrap(`
    ${h1('You’re one step from Verified')}
    ${p(`Thanks for claiming ${name ? `<strong>${name}</strong>` : 'your listing'} on ReferEasy. Upgrading to <strong>Verified</strong> puts a trust badge on your profile, the same badge referring physicians filter by when they search.`)}
    ${bullet([
      "<strong>Verified badge</strong>, visible on every search result",
      "<strong>Mid-priority ranking</strong>, appear above unverified providers",
      "<strong>Up to 5 referral forms</strong>, attach your requisition, referral form, or intake sheet",
      "<strong>Custom How-to-Refer</strong>, plain-language instructions on your profile",
      "<strong>View analytics</strong>, see how many physicians viewed you this month",
    ])}
    ${custom(customMessage)}
    ${btn('Upgrade to Verified, $29/mo →', `${BASE}/pricing`)}
    ${p(`<span style="color:#64748b;font-size:13px">Verification takes 3 minutes: fax code, email code, and a quick ID upload.</span>`)}
  `),

  featured: ({ name, customMessage }) => wrap(`
    ${h1('Get top placement on ReferEasy')}
    ${p(`As a Verified provider${name ? ` (<strong>${name}</strong>)` : ''}, you already have the badge referring physicians look for. <strong>Featured</strong> puts your listing at the top of every search that matches your specialty and location.`)}
    ${bullet([
      "<strong>Top-priority search rank</strong>, first result for your specialty",
      "<strong>Featured slots</strong>, homepage, category pages, and near-me results",
      "<strong>Full analytics dashboard</strong>, views, contacts, referral sources",
      "<strong>Monthly performance email</strong>, track your growth",
      "<strong>Editorial blog spotlight</strong>, one feature article per year",
      "<strong>Unlimited</strong> forms, locations, and staff accounts",
    ])}
    ${custom(customMessage)}
    ${btn('Upgrade to Featured, $79/mo →', `${BASE}/pricing`)}
    ${p(`<span style="color:#64748b;font-size:13px">Featured slots are limited per specialty and area to keep placement meaningful.</span>`)}
  `),

  cold: ({ name, customMessage }) => wrap(`
    ${h1(name ? `Hello from ReferEasy${name ? ', ' + name : ''}` : 'Ontario physicians are using ReferEasy')}
    ${p("ReferEasy is Ontario's live physician-to-physician referral platform. Family physicians use it to find specialists, imaging, labs, and clinics accepting referrals, with wait times and referral criteria visible up front.")}
    ${p("If you accept referrals from other physicians, being listed means being found. Free tier includes:")}
    ${bullet([
      "Public directory listing with your address, hours, and accepting-referrals status",
      "Category and specialty tags so you appear in relevant searches",
      "The ability to claim, verify, and customize your listing at any time",
      "Zero cost, zero commitment",
    ])}
    ${custom(customMessage)}
    ${btn('List your practice, free →', `${BASE}/signup`)}
    ${p(`<span style="color:#64748b;font-size:13px">Or explore first: <a href="${BASE}/search" style="color:#1e3a5f">refereasy.ca/search</a></span>`)}
  `),

  trial_15d: ({ name, tier, endDate, customMessage }) => wrap(`
    ${h1('Your trial ends in 15 days')}
    ${p(`Hi${name ? ' ' + name : ''}, your ${tier === 'featured' ? 'Featured' : 'Verified'} trial on ReferEasy runs through <strong>${endDate}</strong>. That's just over two weeks away.`)}
    ${p("Here's what you'll lose if the trial expires without keeping your plan:")}
    ${bullet(tier === 'featured' ? [
      "Your <strong>Featured placement</strong> at the top of every relevant search",
      "Homepage and category featured slots",
      "Full <strong>analytics dashboard</strong>",
      "Priority near-me placement",
      "Editorial blog spotlight eligibility",
    ] : [
      "Your <strong>✓ Verified badge</strong>, the trust signal referring physicians filter by",
      "<strong>Mid-priority ranking</strong> in search",
      "Your custom referral forms (they'll be hidden, not deleted)",
      "Custom How-to-Refer instructions",
      "Multi-location support",
    ])}
    ${custom(customMessage)}
    ${p("Want to keep going? Pick up right where you left off, it only takes a minute.")}
    ${btn('Keep my plan →', `${BASE}/pricing`)}
    ${p(`<span style="color:#64748b;font-size:13px">Your listing stays live either way, only the paid features disappear on downgrade.</span>`)}
  `),

  trial_7d: ({ name, tier, endDate, customMessage }) => wrap(`
    ${h1('One week left on your trial')}
    ${p(`Hi${name ? ' ' + name : ''}, your ${tier === 'featured' ? 'Featured' : 'Verified'} trial ends <strong>${endDate}</strong>. Seven days from now.`)}
    ${p("You've been on the plan for over 50 days. Referring physicians in your area have been seeing your enhanced listing that entire time. Losing those features means dropping back to the standard Listed appearance.")}
    ${custom(customMessage)}
    ${p("Ready to keep your plan? It takes about a minute.")}
    ${btn('Keep my plan →', `${BASE}/pricing`)}
  `),

  trial_5d: ({ name, tier, endDate, customMessage }) => wrap(`
    ${h1('5 days until downgrade')}
    ${p(`Hi${name ? ' ' + name : ''}, your ${tier === 'featured' ? 'Featured' : 'Verified'} trial ends on <strong>${endDate}</strong>. Five days.`)}
    ${p(tier === 'featured'
      ? "Once the trial ends, you'll drop out of the featured slots on the homepage, category pages, and near-me results. Your listing stays live, but at standard placement."
      : "Once the trial ends, your ✓ Verified badge, custom referral forms, and How-to-Refer instructions will be hidden. Your listing stays live at standard placement.")}
    ${custom(customMessage)}
    ${p("If you'd like to keep your current plan, it takes about 2 minutes to sort out.")}
    ${btn('Keep my plan →', `${BASE}/pricing`)}
  `),

  trial_1d: ({ name, tier, endDate, customMessage }) => wrap(`
    ${h1('Tomorrow: your trial ends')}
    ${p(`Hi${name ? ' ' + name : ''}, this is the last reminder. Your ${tier === 'featured' ? 'Featured' : 'Verified'} plan expires <strong>tonight at midnight ET</strong> and downgrades to Listed (free) tomorrow morning.`)}
    ${p("Your listing stays live. Your data is preserved. But your paid features will be hidden until you keep your plan.")}
    ${custom(customMessage)}
    ${btn('Keep my plan →', `${BASE}/pricing`)}
    ${p(`<span style="color:#64748b;font-size:13px">Takes about a minute, and your plan continues without interruption.</span>`)}
  `),

}

export function buildTemplate(key, opts = {}) {
  const fn = TEMPLATES[key] || TEMPLATES.claim
  return fn(opts)
}

import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { can } from '@/lib/plan'
import crypto from 'crypto'

const BASE = 'https://www.refereasy.ca'
const MONTH_MS = 30 * 86400000
const TOKEN_VALID_DAYS = 14

// GET or POST /api/monthly-update — runs daily, authenticated the same way as
// /api/trials/check-reminders (Vercel Cron header or CRON_SECRET).
// Emails Featured providers whose info hasn't been prompted in 30+ days, with a
// token link to /update-info — no login required, so it's a 60-second job for them.
async function handle(request) {
  const url = new URL(request.url)
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const providedSecret = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || url.searchParams.get('secret')
  const expectedSecret = process.env.CRON_SECRET
  if (!isVercelCron) {
    if (!expectedSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
    if (providedSecret !== expectedSecret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Supabase service key missing' }, { status: 503 })

  // Controlled from Admin → Settings → Operations. Defaults to paused if the row is
  // missing or unreachable (safe default — matches the prior PAUSE_EMAILS behaviour).
  const { data: ops } = await sb.from('site_settings').select('value').eq('key', 'operations').maybeSingle()
  if (ops?.value?.emails_paused !== false) {
    return NextResponse.json({ ok: true, paused: true, note: 'Emails are paused (Admin → Settings → Operations)' })
  }

  const resendKey = process.env.RESEND_API_KEY

  const cutoff = new Date(Date.now() - MONTH_MS).toISOString()
  const { data: candidates } = await sb.from('providers')
    .select('id, name, email, plan, plan_granted_by_admin, trial_ends_at, last_monthly_update_sent')
    .eq('plan', 'featured')
    .or(`last_monthly_update_sent.is.null,last_monthly_update_sent.lt.${cutoff}`)

  const due = (candidates || []).filter(p => can(p, 'monthly_report') && p.email)

  if (!resendKey && due.length > 0) {
    return NextResponse.json({ would_send: due.length, warning: 'RESEND_API_KEY missing, emails not sent' })
  }

  let sent = 0
  const errors = []
  const nowIso = new Date().toISOString()

  for (const provider of due) {
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + TOKEN_VALID_DAYS * 86400000).toISOString()
    const { error: tokErr } = await sb.from('provider_update_tokens').insert({ provider_id: provider.id, token, expires_at: expiresAt })
    if (tokErr) { errors.push(`${provider.email}: ${tokErr.message}`); continue }

    const updateUrl = `${BASE}/update-info?token=${token}`
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ReferEasy <info@refereasy.ca>',
          reply_to: 'info.refereasy@gmail.com',
          to: [provider.email],
          subject: `Quick update: is ${provider.name} still accepting referrals?`,
          html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:0;background:#ffffff">
  <div style="background:#1e3a5f;padding:22px 32px">
    <a href="${BASE}" style="text-decoration:none;display:inline-block">
      <img src="${BASE}/img/logo.png" alt="ReferEasy" height="32" style="display:block" />
    </a>
  </div>
  <div style="padding:32px">
    <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 14px;line-height:1.3">Keep your listing accurate</h1>
    <p style="color:#334155;font-size:15px;line-height:1.65;margin:0 0 16px">Referring physicians rely on <strong>${provider.name}</strong>'s wait time, accepting status, and contact info being current. Take a minute to confirm or update it — no login needed.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${updateUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:0.02em">Update my listing →</a>
    </div>
    <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 16px">This link works for ${TOKEN_VALID_DAYS} days and doesn't require signing in. If nothing's changed, no action needed.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 18px">
    <p style="color:#94a3b8;font-size:11px;line-height:1.6;margin:0">
      This is an automated message — please don't reply to this email.<br>
      ReferEasy · Ontario's live physician-to-physician referral platform · <a href="${BASE}" style="color:#94a3b8">refereasy.ca</a>
    </p>
  </div>
</div>`,
        }),
      })
      if (res.ok) {
        sent++
        await sb.from('providers').update({ last_monthly_update_sent: nowIso }).eq('id', provider.id)
      } else {
        const j = await res.json().catch(() => ({}))
        errors.push(`${provider.email}: ${j.message || res.status}`)
      }
    } catch (e) {
      errors.push(`${provider.email}: ${e.message}`)
    }
  }

  return NextResponse.json({ ok: true, ran_at: nowIso, due: due.length, sent, errors: errors.slice(0, 20) })
}

export async function GET(request) { return handle(request) }
export async function POST(request) { return handle(request) }

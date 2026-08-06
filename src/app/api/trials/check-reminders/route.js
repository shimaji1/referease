import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { reminderDue } from '@/lib/plan'
import { buildTemplate, SUBJECTS } from '../../outreach/templates'

// GET or POST /api/trials/check-reminders
// Runs once daily. Authenticated by CRON_SECRET header (or query param).
//
// Behavior:
//   1. Downgrade any trial whose trial_ends_at < now → plan='listed'
//   2. Send reminder emails for trials expiring in 15/7/5/1 days
//   3. Only send each reminder tier once per trial (tracked via last_reminder_sent)

async function handleReminders(request) {
  // ── Auth check ─────────────────────────────────────────────────────────────
  // Vercel Cron sends x-vercel-cron: 1 header on scheduled invocations.
  // Manual/external triggers must provide the CRON_SECRET via Authorization: Bearer or ?secret= query.
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

  const resendKey = process.env.RESEND_API_KEY
  const nowIso = new Date().toISOString()

  // ── Step 1: Downgrade expired trials ───────────────────────────────────────
  const { data: expired } = await sb.from('providers')
    .select('id, name, email, plan, trial_ends_at')
    .in('plan', ['verified', 'featured'])
    .not('trial_ends_at', 'is', null)
    .eq('plan_granted_by_admin', false)
    .lt('trial_ends_at', nowIso)

  let downgraded = 0
  for (const p of (expired || [])) {
    await sb.from('providers').update({
      plan: 'listed',
      featured: false,  // Downgrade removes them from featured slots
      // Preserve trial_ends_at + plan_started_at for history; just flip the plan
    }).eq('id', p.id)
    downgraded++
  }

  // ── Step 2: Find trials with reminders due ─────────────────────────────────
  // Pull all active trials, decide in code (avoids date-math in SQL edge cases)
  const { data: trials } = await sb.from('providers')
    .select('id, name, email, plan, trial_ends_at, last_reminder_sent')
    .in('plan', ['verified', 'featured'])
    .not('trial_ends_at', 'is', null)
    .eq('plan_granted_by_admin', false)
    .gt('trial_ends_at', nowIso)

  const toSend = []
  for (const p of (trials || [])) {
    if (!p.email) continue
    const due = reminderDue(p.trial_ends_at)
    if (!due) continue
    // Don't re-send the same reminder tier (last_reminder_sent tracks '15d' | '7d' | '5d' | '1d')
    if (p.last_reminder_sent === due) continue
    toSend.push({ provider: p, tier: due })
  }

  // ── Step 3: Actually send via Resend ───────────────────────────────────────
  let sent = 0
  const errors = []

  // Paused: site isn't ready for providers to receive these yet. Trial downgrades above
  // still run (that's account state, not an email). Flip PAUSE_EMAILS off once ready.
  if (process.env.PAUSE_EMAILS !== 'false') {
    return NextResponse.json({ ok: true, paused: true, downgraded, note: 'Reminder emails are paused (PAUSE_EMAILS)' })
  }

  if (!resendKey && toSend.length > 0) {
    return NextResponse.json({
      downgraded,
      would_send: toSend.length,
      warning: 'RESEND_API_KEY missing, reminders not sent',
    })
  }

  for (const { provider, tier } of toSend) {
    const templateKey = `trial_${tier}`
    const endDate = new Date(provider.trial_ends_at).toLocaleDateString('en-CA', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    const html = buildTemplate(templateKey, {
      name: provider.name,
      tier: provider.plan,
      endDate,
    })
    const subject = SUBJECTS[templateKey] || 'Your ReferEasy trial is ending'

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ReferEasy <info@refereasy.ca>',
          reply_to: 'info.refereasy@gmail.com',
          to: [provider.email],
          subject,
          html,
        })
      })
      if (res.ok) {
        sent++
        await sb.from('providers').update({ last_reminder_sent: tier }).eq('id', provider.id)
      } else {
        const j = await res.json().catch(() => ({}))
        errors.push(`${provider.email} (${tier}): ${j.message || res.status}`)
      }
    } catch (e) {
      errors.push(`${provider.email} (${tier}): ${e.message}`)
    }
  }

  return NextResponse.json({
    ok: true,
    ran_at: nowIso,
    downgraded,
    reminders_due: toSend.length,
    reminders_sent: sent,
    errors: errors.slice(0, 20),
  })
}

export async function GET(request)  { return handleReminders(request) }
export async function POST(request) { return handleReminders(request) }

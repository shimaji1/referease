import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { TRIAL_DAYS, trialEndDate } from '@/lib/plan'

// POST /api/plan/start-trial
// Body: { provider_id, plan: 'verified' | 'featured', user_id }
// Starts a 60-day trial on the given provider. Idempotent: if already on a
// higher-or-equal plan with time remaining, no change.
export async function POST(request) {
  const { provider_id, plan, user_id, user_email } = await request.json()

  if (!provider_id) return NextResponse.json({ error: 'provider_id required' }, { status: 400 })
  if (!['verified', 'featured'].includes(plan)) return NextResponse.json({ error: 'plan must be verified or featured' }, { status: 400 })

  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Service not configured' }, { status: 503 })

  // Load current state
  const { data: existing, error: readErr } = await sb.from('providers').select('id, name, email, plan, trial_ends_at, plan_granted_by_admin, owner_id').eq('id', provider_id).single()
  if (readErr || !existing) return NextResponse.json({ error: readErr ? readErr.message : 'Provider not found' }, { status: 404 })

  // If ownership is enforced, verify the requester owns this listing
  if (existing.owner_id && user_id && existing.owner_id !== user_id) {
    return NextResponse.json({ error: 'Not authorized for this listing' }, { status: 403 })
  }

  // Admin-granted plans cannot be overridden by a trial signup
  if (existing.plan_granted_by_admin && (existing.plan === 'verified' || existing.plan === 'featured')) {
    return NextResponse.json({ ok: true, message: 'Already on an admin-granted plan', noChange: true })
  }

  // Already on this or higher plan with time left? Idempotent success.
  const now = Date.now()
  const trialActive = existing.trial_ends_at && new Date(existing.trial_ends_at).getTime() > now
  if (trialActive && (existing.plan === plan || (existing.plan === 'featured' && plan === 'verified'))) {
    return NextResponse.json({ ok: true, message: 'Trial already active', noChange: true, trial_ends_at: existing.trial_ends_at })
  }

  const startedAt = new Date()
  const endsAt = trialEndDate(startedAt)

  const { error: updateErr } = await sb.from('providers').update({
    plan,
    trial_ends_at: endsAt.toISOString(),
    plan_started_at: startedAt.toISOString(),
    plan_granted_by_admin: false,
    last_reminder_sent: null,
    featured: plan === 'featured',   // Featured plan grants featured slot placement
  }).eq('id', provider_id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, plan, trial_ends_at: endsAt.toISOString(), trial_days: TRIAL_DAYS })
}

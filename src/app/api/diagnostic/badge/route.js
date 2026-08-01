import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { getEffectivePlan, can } from '@/lib/plan'

// GET /api/diagnostic/badge?id=1325
// Returns the exact reasoning for why a listing's Verified badge does or does not render.
export async function GET(request) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'pass ?id=NNN' }, { status: 400 })

  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Service not configured' }, { status: 503 })

  const { data: p, error } = await sb.from('providers')
    .select('id, name, verified, plan, trial_ends_at, plan_started_at, plan_granted_by_admin, featured, data_status')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!p) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const effectivePlan = getEffectivePlan(p)
  const badgeCap = can(p, 'verified_badge')
  const badgeWouldRender = Boolean(p.verified && badgeCap)

  return NextResponse.json({
    listing: p,
    reasoning: {
      raw_verified_column: p.verified,
      raw_plan_column: p.plan,
      raw_plan_granted_by_admin: p.plan_granted_by_admin,
      raw_trial_ends_at: p.trial_ends_at,
      effective_plan_computed: effectivePlan,
      can_verified_badge: badgeCap,
      badge_would_render: badgeWouldRender,
      diagnosis: !p.verified
        ? "verified column is false. Provider has not completed verification, so no badge regardless of plan."
        : !badgeCap
        ? "verified is true but plan gate returned false. Check effective_plan_computed."
        : "badge SHOULD render. If not visible on the site, browser cached old JS. Hard refresh with Cmd+Shift+R.",
    },
  })
}

import { NextResponse } from 'next/server'
import { getSquareClient } from '@/lib/square'
import { getSupabase } from '@/lib/supabase-server'

// POST /api/admin/square/setup-plans — one-time (idempotent) setup, triggered from
// Admin → Settings → Billing. Creates the Verified/Featured subscription plans in
// Square's Catalog at the real monthly price (CAD), single phase — no trial phase baked
// in here. The free trial is our own trial_ends_at, tracked independently of Square;
// when a provider adds a card, the subscription we create is given a startDate of
// trial_ends_at so Square doesn't charge anything until the trial actually ends.
// (An earlier version baked a $0 phase into the plan itself, which only worked if the
// card was added at trial start — doesn't work once cards can be added mid-trial.)
//
// Safe to re-run: Square catalog upsert with a fresh idempotency key each time creates
// new plan versions rather than erroring, and we just overwrite the stored IDs.

const PLANS = [
  { key: 'verified', name: 'ReferEasy Verified', variationName: 'Verified Monthly', priceCents: 2900n },
  { key: 'featured', name: 'ReferEasy Featured', variationName: 'Featured Monthly', priceCents: 7900n },
]

export async function POST() {
  const client = getSquareClient()
  if (!client) return NextResponse.json({ error: 'Square not configured (SQUARE_ACCESS_TOKEN missing)' }, { status: 503 })

  const sb = getSupabase()
  if (!sb) return NextResponse.json({ error: 'Supabase key missing' }, { status: 503 })

  const results = {}
  try {
    for (const plan of PLANS) {
      const planTempId = `#${plan.key}Plan`
      const variationTempId = `#${plan.key}Variation`
      const res = await client.catalog.object.upsert({
        idempotencyKey: `${plan.key}-plan-${Date.now()}`,
        object: {
          type: 'SUBSCRIPTION_PLAN',
          id: planTempId,
          subscriptionPlanData: {
            name: plan.name,
            subscriptionPlanVariations: [
              {
                type: 'SUBSCRIPTION_PLAN_VARIATION',
                id: variationTempId,
                subscriptionPlanVariationData: {
                  name: plan.variationName,
                  phases: [
                    { cadence: 'MONTHLY', ordinal: 0n, pricing: { type: 'STATIC', priceMoney: { amount: plan.priceCents, currency: 'CAD' } } },
                  ],
                },
              },
            ],
          },
        },
      })
      const variationId = res.idMappings?.find(m => m.clientObjectId === variationTempId)?.objectId
      const planId = res.idMappings?.find(m => m.clientObjectId === planTempId)?.objectId
      results[plan.key] = { plan_id: planId, variation_id: variationId }
    }

    await sb.from('site_settings').upsert({ key: 'square_plans', value: results, updated_at: new Date().toISOString() })

    return NextResponse.json({ ok: true, plans: results })
  } catch (e) {
    const detail = e.body ? JSON.stringify(e.body) : e.message
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

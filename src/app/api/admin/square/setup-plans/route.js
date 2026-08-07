import { NextResponse } from 'next/server'
import { getSquareClient } from '@/lib/square'
import { getSupabase } from '@/lib/supabase-server'

// POST /api/admin/square/setup-plans — one-time (idempotent) setup, triggered from
// Admin → Settings → Billing. Creates the Verified/Featured subscription plans in
// Square's Catalog with a 2-month $0 trial phase then the real monthly price (CAD),
// and stores the resulting plan variation IDs in site_settings so checkout can find them.
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
                    // 2 monthly cycles at $0 — the free trial (~60 days, varies by month)
                    { cadence: 'MONTHLY', ordinal: 0n, periods: 2, pricing: { type: 'STATIC', priceMoney: { amount: 0n, currency: 'CAD' } } },
                    // then ongoing at full price
                    { cadence: 'MONTHLY', ordinal: 1n, pricing: { type: 'STATIC', priceMoney: { amount: plan.priceCents, currency: 'CAD' } } },
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

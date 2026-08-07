import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSquareClient, SQUARE_LOCATION_ID } from '@/lib/square'
import { getSupabase } from '@/lib/supabase-server'

const TRIAL_DAYS = 60
const VALID_PLANS = ['verified', 'featured']

// POST /api/billing/checkout — called after the browser tokenizes a card with Square's
// Web Payments SDK. Creates (or reuses) a Square customer, saves the card on file,
// starts a subscription against the right plan variation (which already encodes the
// $0 trial phase), and flips the provider's plan immediately, same as the old
// no-payment trial flow — the difference is Square now has a real card on file that
// bills automatically when the trial phase ends.
export async function POST(request) {
  const client = getSquareClient()
  if (!client) return NextResponse.json({ error: 'Payments are not configured yet' }, { status: 503 })

  const sb = getSupabase()
  if (!sb) return NextResponse.json({ error: 'Supabase key missing' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const { provider_id, plan, source_id, given_name, family_name, email, user_id } = body

  if (!provider_id || !VALID_PLANS.includes(plan)) return NextResponse.json({ error: 'Invalid provider_id or plan' }, { status: 400 })
  if (!source_id) return NextResponse.json({ error: 'Missing card token' }, { status: 400 })
  if (!user_id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: provider, error: providerErr } = await sb.from('providers').select('id, name, email, owner_id, square_customer_id').eq('id', provider_id).single()
  if (providerErr || !provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  if (provider.owner_id !== user_id) return NextResponse.json({ error: 'Not authorized for this listing' }, { status: 403 })

  const { data: planRow } = await sb.from('site_settings').select('value').eq('key', 'square_plans').maybeSingle()
  const variationId = planRow?.value?.[plan]?.variation_id
  if (!variationId) return NextResponse.json({ error: 'Billing plan not set up yet — contact support' }, { status: 503 })

  try {
    // 1. Customer — reuse if this provider already has one from a prior attempt/plan
    let customerId = provider.square_customer_id
    if (!customerId) {
      const customerRes = await client.customers.create({
        idempotencyKey: crypto.randomUUID(),
        givenName: given_name || provider.name,
        familyName: family_name || undefined,
        emailAddress: email || provider.email || undefined,
        referenceId: String(provider.id),
      })
      customerId = customerRes.customer.id
    }

    // 2. Card on file, from the token the Web Payments SDK produced client-side
    const cardRes = await client.cards.create({
      idempotencyKey: crypto.randomUUID(),
      sourceId: source_id,
      card: { customerId, cardholderName: given_name && family_name ? `${given_name} ${family_name}` : provider.name },
    })
    const cardId = cardRes.card.id

    // 3. Subscription — plan variation already has the $0 trial phase built in
    const subRes = await client.subscriptions.create({
      idempotencyKey: crypto.randomUUID(),
      locationId: SQUARE_LOCATION_ID,
      planVariationId: variationId,
      customerId,
      cardId,
    })
    const subscription = subRes.subscription

    const nowIso = new Date().toISOString()
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString()

    const { error: updateErr } = await sb.from('providers').update({
      plan,
      plan_started_at: nowIso,
      trial_ends_at: trialEndsAt,
      plan_granted_by_admin: false,
      square_customer_id: customerId,
      square_subscription_id: subscription.id,
      square_card_id: cardId,
      square_status: subscription.status || 'ACTIVE',
    }).eq('id', provider.id)

    if (updateErr) return NextResponse.json({ error: 'Payment set up, but saving your plan failed: ' + updateErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, subscription_id: subscription.id, status: subscription.status })
  } catch (e) {
    const detail = e.body ? (e.body.errors?.[0]?.detail || JSON.stringify(e.body)) : e.message
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

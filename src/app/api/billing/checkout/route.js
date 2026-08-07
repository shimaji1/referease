import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSquareClient, SQUARE_LOCATION_ID } from '@/lib/square'
import { getSupabase } from '@/lib/supabase-server'

const VALID_PLANS = ['verified', 'featured']

// POST /api/billing/checkout — "add a payment method," not "start a plan." Trials start
// free with no card (via /api/plan/start-trial) — this route attaches a card to a plan
// that's *already active*, at any point during the trial or after. The Square
// subscription is created with startDate = trial_ends_at (or today, if the trial has
// already ended) so nothing is charged until the trial actually ends.
export async function POST(request) {
  const client = getSquareClient()
  if (!client) return NextResponse.json({ error: 'Payments are not configured yet' }, { status: 503 })

  const sb = getSupabase()
  if (!sb) return NextResponse.json({ error: 'Supabase key missing' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const { provider_id, source_id, given_name, family_name, email, user_id } = body

  if (!provider_id) return NextResponse.json({ error: 'Invalid provider_id' }, { status: 400 })
  if (!source_id) return NextResponse.json({ error: 'Missing card token' }, { status: 400 })
  if (!user_id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: provider, error: providerErr } = await sb.from('providers')
    .select('id, name, email, owner_id, plan, trial_ends_at, square_customer_id, square_subscription_id').eq('id', provider_id).single()
  if (providerErr || !provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  if (provider.owner_id !== user_id) return NextResponse.json({ error: 'Not authorized for this listing' }, { status: 403 })
  if (!VALID_PLANS.includes(provider.plan)) return NextResponse.json({ error: 'This listing is on the free plan — nothing to bill. Start a trial first.' }, { status: 400 })
  if (provider.square_subscription_id) return NextResponse.json({ error: 'A payment method is already on file — use "Update card" instead.' }, { status: 400 })

  const { data: planRow } = await sb.from('site_settings').select('value').eq('key', 'square_plans').maybeSingle()
  const variationId = planRow?.value?.[provider.plan]?.variation_id
  if (!variationId) return NextResponse.json({ error: 'Billing plan not set up yet — contact support' }, { status: 503 })

  try {
    // 1. Customer — reuse if this provider already has one from a prior attempt
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

    // 3. Subscription, deferred to whenever the trial actually ends
    const trialEndsAt = provider.trial_ends_at ? new Date(provider.trial_ends_at) : null
    const startDate = trialEndsAt && trialEndsAt.getTime() > Date.now() ? trialEndsAt.toISOString().slice(0, 10) : undefined

    const subRes = await client.subscriptions.create({
      idempotencyKey: crypto.randomUUID(),
      locationId: SQUARE_LOCATION_ID,
      planVariationId: variationId,
      customerId,
      cardId,
      startDate,
    })
    const subscription = subRes.subscription

    const { error: updateErr } = await sb.from('providers').update({
      square_customer_id: customerId,
      square_subscription_id: subscription.id,
      square_card_id: cardId,
      square_status: subscription.status || 'PENDING',
    }).eq('id', provider.id)

    if (updateErr) return NextResponse.json({ error: 'Card saved, but recording it failed: ' + updateErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, subscription_id: subscription.id, status: subscription.status, startDate })
  } catch (e) {
    const detail = e.body ? (e.body.errors?.[0]?.detail || JSON.stringify(e.body)) : e.message
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

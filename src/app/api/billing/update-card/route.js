import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSquareClient } from '@/lib/square'
import { getServiceSupabase } from '@/lib/supabase-server'

// POST /api/billing/update-card — swaps the card on file for an existing subscription.
// Creates a new Square card from the freshly tokenized source, points the subscription
// at it, and disables the old card so it can't be charged again.
export async function POST(request) {
  const client = getSquareClient()
  if (!client) return NextResponse.json({ error: 'Payments are not configured yet' }, { status: 503 })

  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Supabase key missing' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const { provider_id, source_id, user_id } = body
  if (!provider_id || !source_id || !user_id) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const { data: provider, error: providerErr } = await sb.from('providers')
    .select('id, owner_id, square_customer_id, square_subscription_id, square_card_id').eq('id', provider_id).single()
  if (providerErr || !provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  if (provider.owner_id !== user_id) return NextResponse.json({ error: 'Not authorized for this listing' }, { status: 403 })
  if (!provider.square_customer_id || !provider.square_subscription_id) return NextResponse.json({ error: 'No active subscription to update' }, { status: 400 })

  try {
    const cardRes = await client.cards.create({
      idempotencyKey: crypto.randomUUID(),
      sourceId: source_id,
      card: { customerId: provider.square_customer_id },
    })
    const newCardId = cardRes.card.id

    await client.subscriptions.update({
      subscriptionId: provider.square_subscription_id,
      subscription: { cardId: newCardId },
    })

    if (provider.square_card_id) {
      await client.cards.disable({ cardId: provider.square_card_id }).catch(() => {})
    }

    await sb.from('providers').update({ square_card_id: newCardId }).eq('id', provider.id)

    return NextResponse.json({ ok: true })
  } catch (e) {
    const detail = e.body ? (e.body.errors?.[0]?.detail || JSON.stringify(e.body)) : e.message
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

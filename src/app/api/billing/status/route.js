import { NextResponse } from 'next/server'
import { getSquareClient } from '@/lib/square'
import { getServiceSupabase } from '@/lib/supabase-server'

// GET /api/billing/status?provider_id=X&user_id=Y — live billing snapshot for the
// dashboard's Billing tab: subscription status, next charge date, card on file, and
// recent invoice history. Reads straight from Square rather than duplicating/syncing
// this into our own DB — it's read-only, low-traffic, and Square is the source of truth.
export async function GET(request) {
  const client = getSquareClient()
  if (!client) return NextResponse.json({ error: 'Payments are not configured yet' }, { status: 503 })

  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Supabase key missing' }, { status: 503 })

  const { searchParams } = new URL(request.url)
  const providerId = searchParams.get('provider_id')
  const userId = searchParams.get('user_id')
  if (!providerId || !userId) return NextResponse.json({ error: 'Missing provider_id or user_id' }, { status: 400 })

  const { data: provider, error: providerErr } = await sb.from('providers')
    .select('id, owner_id, square_subscription_id, square_customer_id').eq('id', providerId).single()
  if (providerErr || !provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  if (provider.owner_id !== userId) return NextResponse.json({ error: 'Not authorized for this listing' }, { status: 403 })

  if (!provider.square_subscription_id) return NextResponse.json({ hasSubscription: false })

  try {
    const subRes = await client.subscriptions.get({ subscriptionId: provider.square_subscription_id })
    const subscription = subRes.subscription

    let card = null
    if (subscription.cardId) {
      const cardRes = await client.cards.get({ cardId: subscription.cardId }).catch(() => null)
      if (cardRes?.card) {
        card = { brand: cardRes.card.cardBrand, last4: cardRes.card.last4, expMonth: Number(cardRes.card.expMonth), expYear: Number(cardRes.card.expYear) }
      }
    }

    const invoiceIds = (subscription.invoiceIds || []).slice(0, 10)
    const invoices = []
    for (const id of invoiceIds) {
      const invRes = await client.invoices.get({ invoiceId: id }).catch(() => null)
      if (invRes?.invoice) {
        const inv = invRes.invoice
        const amount = inv.paymentRequests?.[0]?.computedAmountMoney
        invoices.push({
          id: inv.id,
          status: inv.status,
          amount: amount ? Number(amount.amount) / 100 : null,
          currency: amount?.currency,
          createdAt: inv.createdAt,
          publicUrl: inv.publicUrl || null,
        })
      }
    }
    invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // chargedThroughDate is the last day already covered — the next charge lands the day after
    const nextChargeDate = subscription.chargedThroughDate
      ? new Date(new Date(subscription.chargedThroughDate).getTime() + 86400000).toISOString().slice(0, 10)
      : null

    return NextResponse.json({
      hasSubscription: true,
      status: subscription.status,
      chargedThroughDate: subscription.chargedThroughDate || null,
      nextChargeDate,
      card,
      invoices,
    })
  } catch (e) {
    const detail = e.body ? (e.body.errors?.[0]?.detail || JSON.stringify(e.body)) : e.message
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

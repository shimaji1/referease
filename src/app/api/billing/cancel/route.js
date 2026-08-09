import { NextResponse } from 'next/server'
import { getSquareClient } from '@/lib/square'
import { getServiceSupabase } from '@/lib/supabase-server'

// POST /api/billing/cancel — cancels a subscription. Square schedules it to stop at the
// end of the current billing period rather than ending it instantly (standard SaaS
// behaviour — you keep what you already paid for). Local plan/featured flags flip once
// the webhook confirms the subscription actually reaches CANCELED.
export async function POST(request) {
  const client = getSquareClient()
  if (!client) return NextResponse.json({ error: 'Payments are not configured yet' }, { status: 503 })

  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Supabase key missing' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const { provider_id, user_id } = body
  if (!provider_id || !user_id) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const { data: provider, error: providerErr } = await sb.from('providers')
    .select('id, owner_id, square_subscription_id').eq('id', provider_id).single()
  if (providerErr || !provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  if (provider.owner_id !== user_id) return NextResponse.json({ error: 'Not authorized for this listing' }, { status: 403 })
  if (!provider.square_subscription_id) return NextResponse.json({ error: 'No active subscription' }, { status: 400 })

  try {
    const res = await client.subscriptions.cancel({ subscriptionId: provider.square_subscription_id })
    await sb.from('providers').update({ square_status: res.subscription?.status || 'CANCELED' }).eq('id', provider.id)
    return NextResponse.json({ ok: true, canceled_date: res.subscription?.canceledDate })
  } catch (e) {
    const detail = e.body ? (e.body.errors?.[0]?.detail || JSON.stringify(e.body)) : e.message
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

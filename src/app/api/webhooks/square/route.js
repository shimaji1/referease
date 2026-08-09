import { NextResponse } from 'next/server'
import { WebhooksHelper } from 'square'
import { getServiceSupabase } from '@/lib/supabase-server'

// POST /api/webhooks/square — configured in the Square Developer Dashboard under this
// app's Webhooks tab, pointed at https://www.refereasy.ca/api/webhooks/square, subscribed
// to subscription.updated (and optionally invoice/payment events later). Square signs
// every request; we verify it before trusting anything in the body.
//
// subscription.updated is the single source of truth for plan status: Square owns the
// billing lifecycle (trial -> active -> past_due -> canceled), we just mirror it.

export async function POST(request) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
  if (!signatureKey) return NextResponse.json({ error: 'Webhook signature key not configured' }, { status: 503 })

  const rawBody = await request.text()
  const signatureHeader = request.headers.get('x-square-hmacsha256-signature') || ''
  const notificationUrl = request.url

  const valid = await WebhooksHelper.verifySignature({ requestBody: rawBody, signatureHeader, signatureKey, notificationUrl })
  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  const event = JSON.parse(rawBody)
  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Supabase key missing' }, { status: 503 })

  if (event.type === 'subscription.updated' || event.type === 'subscription.created') {
    const subscription = event.data?.object?.subscription
    if (subscription?.id) {
      const patch = { square_status: subscription.status }
      // CANCELED/DEACTIVATED from Square (buyer canceled, all payment attempts exhausted,
      // etc.) — mirror that as a downgrade, same as the old trial-expiry cron did.
      if (subscription.status === 'CANCELED' || subscription.status === 'DEACTIVATED') {
        patch.plan = 'listed'
        patch.featured = false
      }
      await sb.from('providers').update(patch).eq('square_subscription_id', subscription.id)
    }
  }

  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { getSquareClient } from '@/lib/square'
import { getServiceSupabase } from '@/lib/supabase-server'

// POST /api/account/downgrade-to-user — switches a provider account back to a plain
// user account. Their listing(s) are unclaimed (owner_id cleared, plan reset to
// Listed) rather than deleted, exactly like an unclaimed listing today — anyone,
// including this person later, can claim it again. Any active Square subscription
// is canceled (best effort) since there's no longer an owner to bill.
export async function POST(request) {
  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Supabase key missing' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const { user_id } = body
  if (!user_id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile, error: profileErr } = await sb.from('profiles').select('id, role').eq('id', user_id).single()
  if (profileErr || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (profile.role !== 'provider') return NextResponse.json({ error: 'Not a provider account' }, { status: 400 })

  const { data: owned } = await sb.from('providers')
    .select('id, name, square_subscription_id, square_status').eq('owner_id', user_id)

  const client = getSquareClient()
  const unclaimed = []
  for (const provider of owned || []) {
    if (client && provider.square_subscription_id && !['CANCELED', 'DEACTIVATED'].includes(provider.square_status)) {
      try {
        await client.subscriptions.cancel({ subscriptionId: provider.square_subscription_id })
      } catch {
        // Best effort — don't block the role switch on a billing hiccup, support can follow up.
      }
    }
    await sb.from('providers').update({
      owner_id: null,
      plan: 'listed',
      trial_ends_at: null,
      plan_started_at: null,
      plan_granted_by_admin: false,
      featured: false,
      square_customer_id: null,
      square_subscription_id: null,
      square_card_id: null,
      square_status: null,
    }).eq('id', provider.id)
    unclaimed.push(provider.name)
  }

  const { error: roleErr } = await sb.from('profiles').update({ role: 'user' }).eq('id', user_id)
  if (roleErr) return NextResponse.json({ error: roleErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, unclaimed })
}

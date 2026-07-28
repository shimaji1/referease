import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

// POST /api/plan/upgrade-request
// Records interest in upgrading. No payment — this is contact-us until Stripe ships.
// Body: { email, name?, requested_plan, message?, provider_id? }
export async function POST(request) {
  const { email, name, requested_plan, message, provider_id } = await request.json()

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  if (!['verified', 'featured'].includes(requested_plan)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Service not configured' }, { status: 503 })

  const { error } = await sb.from('upgrade_requests').insert({
    email, name: name || null, requested_plan, message: message || null, provider_id: provider_id || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, message: 'Request received — we\'ll be in touch within 1 business day.' })
}

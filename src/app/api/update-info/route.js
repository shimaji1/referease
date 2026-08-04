import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

// GET /api/update-info?token=... — look up the provider behind a monthly-update token.
export async function GET(request) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Service not configured' }, { status: 503 })

  const { data: tok } = await sb.from('provider_update_tokens').select('provider_id, expires_at').eq('token', token).maybeSingle()
  if (!tok) return NextResponse.json({ error: 'This link is invalid.' }, { status: 404 })
  if (new Date(tok.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'This link has expired.' }, { status: 410 })

  const { data: provider } = await sb.from('providers')
    .select('id, name, accepting_referrals, accepting_new_patients, wait_weeks, phone, fax, email, website, hours')
    .eq('id', tok.provider_id).single()
  if (!provider) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })

  return NextResponse.json({ provider })
}

// POST /api/update-info — { token, accepting_referrals, wait_weeks, phone, fax, email, website, hours }
export async function POST(request) {
  const body = await request.json()
  const { token } = body
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Service not configured' }, { status: 503 })

  const { data: tok } = await sb.from('provider_update_tokens').select('provider_id, expires_at').eq('token', token).maybeSingle()
  if (!tok) return NextResponse.json({ error: 'This link is invalid.' }, { status: 404 })
  if (new Date(tok.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'This link has expired.' }, { status: 410 })

  const accepting = body.accepting_referrals === null ? null : !!body.accepting_referrals
  const payload = {
    accepting_referrals: accepting,
    accepting_new_patients: accepting,
    wait_weeks: body.wait_weeks === '' || body.wait_weeks === null || body.wait_weeks === undefined ? null : parseInt(body.wait_weeks),
    phone: body.phone || null,
    fax: body.fax || null,
    email: body.email || null,
    website: body.website || null,
    hours: body.hours || null,
  }

  const { error } = await sb.from('providers').update(payload).eq('id', tok.provider_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

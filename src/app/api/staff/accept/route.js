import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

// POST /api/staff/accept — { action: 'lookup'|'accept', token, user_id }
// Runs with the service role because invite_token is a bearer secret checked before
// the invitee has any session (or even an account) — provider_staff itself has no
// anon access, so this is the only way to look up or claim an invite by token.
export async function POST(request) {
  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Database not connected' }, { status: 503 })

  const { action, token, user_id } = await request.json().catch(() => ({}))
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  if (action === 'lookup') {
    const { data } = await sb.from('provider_staff')
      .select('*, providers(name)').eq('invite_token', token).eq('status', 'pending').maybeSingle()
    return NextResponse.json({ invite: data || null })
  }

  if (action === 'accept') {
    if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    const { error } = await sb.from('provider_staff')
      .update({ status: 'accepted', user_id, accepted_at: new Date().toISOString() })
      .eq('invite_token', token).eq('status', 'pending')
    return NextResponse.json({ ok: !error })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

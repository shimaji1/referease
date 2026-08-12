import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

// POST /api/claim/accept — { action: 'lookup'|'accept', token, user_id }
// Runs with the service role because invite_token is a bearer secret checked before the
// invitee has any session (or even an account) — claim_invites has no anon access.
export async function POST(request) {
  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Database not connected' }, { status: 503 })

  const { action, token, user_id } = await request.json().catch(() => ({}))
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  if (action === 'lookup') {
    const { data } = await sb.from('claim_invites')
      .select('*, providers(id, name)').eq('invite_token', token).eq('status', 'pending').maybeSingle()
    return NextResponse.json({ invite: data || null })
  }

  if (action === 'accept') {
    if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    const { data: invite } = await sb.from('claim_invites')
      .select('id, provider_id, status').eq('invite_token', token).eq('status', 'pending').maybeSingle()
    if (!invite) return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 })

    // Ownership only — skips the fax/email verification CODE hassle (the admin who sent
    // this invite already knows who they're dealing with), but deliberately does NOT set
    // verified. That's a separate, distinct decision made via the plan-tier dropdown
    // elsewhere in admin, same as any other listing — claiming just transfers ownership
    // and stops showing "Claim this listing" to everyone else.
    const { error: providerErr } = await sb.from('providers')
      .update({ owner_id: user_id })
      .eq('id', invite.provider_id)
    if (providerErr) return NextResponse.json({ error: providerErr.message }, { status: 400 })

    await sb.from('profiles').update({ role: 'provider' }).eq('id', user_id)
    await sb.from('claim_invites').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', invite.id)

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

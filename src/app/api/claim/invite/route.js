import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { buildTemplate, getSubject } from '../../outreach/templates'

const BASE = 'https://www.refereasy.ca'

// POST /api/claim/invite — { provider_id, email, user_id }
// Admin-only (checked via profiles.is_admin, same pattern as the other admin routes).
// Skips the fax/email verification flow entirely — for people the admin personally
// knows and vouches for, not a public self-serve claim path.
export async function POST(request) {
  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Database not connected' }, { status: 503 })

  const { provider_id, email, user_id } = await request.json().catch(() => ({}))
  if (!provider_id || !email || !user_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: caller } = await sb.from('profiles').select('is_admin').eq('id', user_id).maybeSingle()
  if (!caller?.is_admin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const cleanEmail = String(email).trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 })

  const { data: provider } = await sb.from('providers').select('id, name').eq('id', provider_id).maybeSingle()
  if (!provider) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  const { data: invite, error: writeErr } = await sb.from('claim_invites')
    .insert({ provider_id, email: cleanEmail, invited_by: user_id })
    .select('invite_token').single()
  if (writeErr) return NextResponse.json({ error: writeErr.message }, { status: 400 })

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const acceptUrl = `${BASE}/claim/accept?token=${invite.invite_token}`
    const opts = { name: provider.name, acceptUrl }
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ReferEasy <info@refereasy.ca>',
          reply_to: 'info.refereasy@gmail.com',
          to: [cleanEmail],
          subject: await getSubject('claim_invite', opts),
          html: await buildTemplate('claim_invite', opts),
        }),
      })
    } catch (e) {
      // Invite row is saved either way — admin can resend later. Don't fail the request over email delivery.
    }
  }

  return NextResponse.json({ ok: true })
}

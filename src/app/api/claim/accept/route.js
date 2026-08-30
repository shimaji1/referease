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
      .select('id, provider_id, email, status, providers(id, name)').eq('invite_token', token).eq('status', 'pending').maybeSingle()
    if (!invite) return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 })

    // Ownership only — skips the email verification CODE hassle (the admin who sent
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

    // Notify the team so this doesn't sit unseen — same reasoning as request-deletion's
    // admin email. The dashboard's Claim invites tab shows the same thing, but a lot can
    // sit unopened; this is the "actually get told" half of that.
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'ReferEasy <info@refereasy.ca>',
            to: ['info.refereasy@gmail.com'],
            reply_to: invite.email || undefined,
            subject: `Claim accepted — ${invite.providers?.name || 'listing'}`,
            html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="color:#0f172a;font-size:18px;font-weight:700;margin:0 0 14px">Claim invite accepted</h1>
  <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 8px"><strong>Listing:</strong> ${invite.providers?.name || '—'}</p>
  <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 8px"><strong>Claimed by:</strong> ${invite.email || '—'}</p>
  <p style="color:#64748b;font-size:13px;line-height:1.6;margin:16px 0 0">They now own this listing and can edit it directly. See Directory → Claim invites in admin for the full list.</p>
</div>`,
          }),
        })
      } catch (e) {
        // Ownership transfer already succeeded either way — visible in the dashboard even if this email fails.
      }
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

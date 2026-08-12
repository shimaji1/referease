import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

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
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ReferEasy <info@refereasy.ca>',
          reply_to: 'info.refereasy@gmail.com',
          to: [cleanEmail],
          subject: `You're invited to claim ${provider.name} on ReferEasy`,
          html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:0;background:#ffffff">
  <div style="background:#1e3a5f;padding:22px 32px">
    <a href="${BASE}" style="text-decoration:none;display:inline-block">
      <img src="${BASE}/img/logo-white.png" alt="ReferEasy" height="32" style="display:block" />
    </a>
  </div>
  <div style="padding:32px">
    <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 14px;line-height:1.3">You're invited to claim ${provider.name}</h1>
    <p style="color:#334155;font-size:15px;line-height:1.65;margin:0 0 16px">You've been invited to take ownership of <strong>${provider.name}</strong>'s listing on ReferEasy — manage availability, referral criteria, forms, and more.</p>
    <p style="color:#334155;font-size:15px;line-height:1.65;margin:0 0 16px">Click below to set up your account — no verification codes needed.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${acceptUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:0.02em">Claim this listing →</a>
    </div>
    <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 16px">If you weren't expecting this, you can safely ignore this email — no account will be created.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 18px">
    <p style="color:#94a3b8;font-size:11px;line-height:1.6;margin:0">
      This is an automated message — please don't reply to this email.<br>
      ReferEasy · Ontario's live directory for finding a doctor and for physician referrals · <a href="${BASE}" style="color:#94a3b8">refereasy.ca</a>
    </p>
  </div>
</div>`,
        }),
      })
    } catch (e) {
      // Invite row is saved either way — admin can resend later. Don't fail the request over email delivery.
    }
  }

  return NextResponse.json({ ok: true })
}

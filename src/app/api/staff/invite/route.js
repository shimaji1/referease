import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { limit as planLimit } from '@/lib/plan'
import crypto from 'crypto'

const BASE = 'https://www.refereasy.ca'

// POST /api/staff/invite — { provider_id, email, invited_by }
// Runs with the service role so it can verify ownership and enforce the plan's staff
// cap server-side, rather than trusting the client to check its own permissions.
export async function POST(request) {
  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database not connected' }, { status: 503 })

  const { provider_id, email, invited_by } = await request.json()
  if (!provider_id || !email || !invited_by) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const cleanEmail = String(email).trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 })

  const { data: provider } = await supabase.from('providers')
    .select('id, name, owner_id, plan, plan_granted_by_admin, trial_ends_at')
    .eq('id', provider_id).single()
  if (!provider || provider.owner_id !== invited_by) return NextResponse.json({ error: 'Not authorized to invite staff for this listing' }, { status: 403 })

  const { count } = await supabase.from('provider_staff')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', provider_id).in('status', ['pending', 'accepted'])
  const cap = planLimit(provider, 'max_staff')
  if ((count || 0) >= cap) {
    return NextResponse.json({ error: `Your plan allows ${cap} staff account${cap === 1 ? '' : 's'}. Upgrade to add more.` }, { status: 403 })
  }

  const token = crypto.randomUUID()

  // A revoked row for this (provider, email) pair sticks around for history and blocks a
  // plain insert via the unique constraint — reactivate it with a fresh token instead of
  // treating "previously removed" the same as "already invited right now".
  const { data: existing } = await supabase.from('provider_staff')
    .select('id, status').eq('provider_id', provider_id).eq('email', cleanEmail).maybeSingle()

  if (existing && existing.status !== 'revoked') {
    return NextResponse.json({ error: 'That email already has a pending or active invite for this listing.' }, { status: 409 })
  }

  const { error: writeErr } = existing
    ? await supabase.from('provider_staff').update({
        status: 'pending', invite_token: token, invited_by, user_id: null, accepted_at: null,
      }).eq('id', existing.id)
    : await supabase.from('provider_staff').insert({ provider_id, email: cleanEmail, invite_token: token, invited_by })

  if (writeErr) return NextResponse.json({ error: writeErr.message }, { status: 400 })

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const acceptUrl = `${BASE}/staff/accept?token=${token}`
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ReferEasy <info@refereasy.ca>',
          reply_to: 'info.refereasy@gmail.com',
          to: [cleanEmail],
          subject: `You've been invited to join ${provider.name} on ReferEasy`,
          html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:0;background:#ffffff">
  <div style="background:#1e3a5f;padding:22px 32px">
    <a href="${BASE}" style="text-decoration:none;display:inline-block">
      <img src="${BASE}/img/logo.png" alt="ReferEasy" height="32" style="display:block" />
    </a>
  </div>
  <div style="padding:32px">
    <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 14px;line-height:1.3">You've been invited to ${provider.name}</h1>
    <p style="color:#334155;font-size:15px;line-height:1.65;margin:0 0 16px">You've been given staff access to manage <strong>${provider.name}</strong>'s listing on ReferEasy — availability, referral criteria, forms, and more.</p>
    <p style="color:#334155;font-size:15px;line-height:1.65;margin:0 0 16px">You'll set up your own login, separate from anyone else on the team.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${acceptUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:0.02em">Accept invite →</a>
    </div>
    <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 16px">If you weren't expecting this, you can safely ignore this email — no account will be created.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 18px">
    <p style="color:#94a3b8;font-size:11px;line-height:1.6;margin:0">
      This is an automated message — please don't reply to this email.<br>
      ReferEasy · Ontario's live physician-to-physician referral platform · <a href="${BASE}" style="color:#94a3b8">refereasy.ca</a>
    </p>
  </div>
</div>`,
        }),
      })
    } catch (e) {
      // Invite row is saved either way — the owner can resend later. Don't fail the request over email delivery.
    }
  }

  return NextResponse.json({ ok: true })
}

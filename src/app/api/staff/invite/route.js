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
  const { error: insErr } = await supabase.from('provider_staff').insert({
    provider_id, email: cleanEmail, invite_token: token, invited_by,
  })
  if (insErr) {
    if (insErr.code === '23505') return NextResponse.json({ error: 'That email already has a pending or active invite for this listing.' }, { status: 409 })
    return NextResponse.json({ error: insErr.message }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const acceptUrl = `${BASE}/staff/accept?token=${token}`
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ReferEasy <hello@refereasy.ca>',
          to: [cleanEmail],
          subject: `You've been invited to join ${provider.name} on ReferEasy`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px">
              <h2 style="color:#1e3a5f;margin-bottom:4px">You're invited</h2>
              <p style="color:#666;font-size:14px">You've been given staff access to manage <strong>${provider.name}</strong>'s listing on ReferEasy.</p>
              <a href="${acceptUrl}" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin:16px 0">Accept invite →</a>
              <p style="color:#999;font-size:12px">If you weren't expecting this, you can ignore this email.</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
              <p style="color:#aaa;font-size:11px">ReferEasy, Ontario Healthcare Referral Platform</p>
            </div>
          `,
        }),
      })
    } catch (e) {
      // Invite row is saved either way — the owner can resend later. Don't fail the request over email delivery.
    }
  }

  return NextResponse.json({ ok: true })
}

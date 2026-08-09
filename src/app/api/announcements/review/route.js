import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

const BASE = 'https://www.refereasy.ca'

// POST /api/announcements/review — { id, action: 'approved'|'rejected', admin_notes }
// Called from Admin → Announcements when approving/rejecting a provider's submission.
// Runs server-side (not the client-side Supabase update it replaces) purely so it can
// hold the Resend API key and email the provider the outcome.
export async function POST(request) {
  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database not connected' }, { status: 503 })

  const { id, action, admin_notes } = await request.json()
  if (!id || !['approved', 'rejected'].includes(action)) return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })

  const { data: row } = await supabase.from('provider_announcements')
    .select('id, headline, provider_id, providers(name, email)').eq('id', id).single()
  if (!row) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })

  const { error: writeErr } = await supabase.from('provider_announcements')
    .update({ status: action, admin_notes: admin_notes || null, reviewed_at: new Date().toISOString() }).eq('id', id)
  if (writeErr) return NextResponse.json({ error: writeErr.message }, { status: 400 })

  const provider = row.providers
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey && provider?.email) {
    const approved = action === 'approved'
    const settingsUrl = `${BASE}/dashboard/settings`
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ReferEasy <info@refereasy.ca>',
          reply_to: 'info.refereasy@gmail.com',
          to: [provider.email],
          subject: approved ? 'Your homepage announcement is live' : 'Your homepage announcement needs changes',
          html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:0;background:#ffffff">
  <div style="background:#1e3a5f;padding:22px 32px">
    <a href="${BASE}" style="text-decoration:none;display:inline-block">
      <img src="${BASE}/img/logo-white.png" alt="ReferEasy" height="32" style="display:block" />
    </a>
  </div>
  <div style="padding:32px">
    <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 14px;line-height:1.3">${approved ? "You're live on the homepage" : 'Changes needed on your announcement'}</h1>
    <p style="color:#334155;font-size:15px;line-height:1.65;margin:0 0 16px">
      ${approved
        ? `Your announcement${row.headline ? ` ("${row.headline}")` : ''} for <strong>${provider.name}</strong> has been approved and is now rotating in the homepage carousel.`
        : `Your announcement${row.headline ? ` ("${row.headline}")` : ''} for <strong>${provider.name}</strong> wasn't approved as submitted.`}
    </p>
    ${!approved && admin_notes ? `<p style="color:#334155;font-size:15px;line-height:1.65;margin:0 0 16px;padding:12px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px"><strong>Note from our team:</strong> ${admin_notes}</p>` : ''}
    <div style="text-align:center;margin:28px 0">
      <a href="${settingsUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:0.02em">${approved ? 'View in dashboard →' : 'Edit and resubmit →'}</a>
    </div>
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
      // Status is already saved either way — don't fail the review over email delivery.
    }
  }

  return NextResponse.json({ ok: true })
}

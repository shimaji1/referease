import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

// POST /api/account/request-deletion — { user_id }
// Flags the profile and emails the ReferEasy team so a request doesn't sit unseen in
// the database — the settings page promises "our team will follow up by email,"
// which only holds if someone here actually gets notified.
export async function POST(request) {
  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Database not connected' }, { status: 503 })

  const { user_id } = await request.json().catch(() => ({}))
  if (!user_id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile, error: profileErr } = await sb.from('profiles')
    .select('id, email, full_name').eq('id', user_id).single()
  if (profileErr || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { error: writeErr } = await sb.from('profiles')
    .update({ deletion_requested_at: new Date().toISOString() }).eq('id', user_id)
  if (writeErr) return NextResponse.json({ error: writeErr.message }, { status: 500 })

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ReferEasy <info@refereasy.ca>',
          to: ['info.refereasy@gmail.com'],
          reply_to: profile.email || undefined,
          subject: `Account deletion requested — ${profile.full_name || profile.email || user_id}`,
          html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="color:#0f172a;font-size:18px;font-weight:700;margin:0 0 14px">Account deletion requested</h1>
  <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 8px"><strong>Name:</strong> ${profile.full_name || '—'}</p>
  <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 8px"><strong>Email:</strong> ${profile.email || '—'}</p>
  <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px"><strong>User ID:</strong> ${user_id}</p>
  <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0">Reply to this email to follow up with them directly, then handle the deletion in Supabase.</p>
</div>`,
        }),
      })
    } catch (e) {
      // Flag is already saved either way — visible in the dashboard even if this email fails.
    }
  }

  return NextResponse.json({ ok: true })
}

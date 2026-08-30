import { NextResponse } from 'next/server'

// POST /api/claim/notify — { provider_name, user_email, user_name, verification_method, cpso_link }
// Fired right after a self-serve claim is inserted (dashboard/verify), so a pending
// claim doesn't just sit silently in the Claims tab until someone happens to check it.
// Same "actually get told" reasoning as claim/accept's notify — mirrors it, just for
// the OTHER claim path (public self-serve, not the personal admin-vouched invite).
export async function POST(request) {
  const { provider_name, user_email, user_name, verification_method, cpso_link } = await request.json().catch(() => ({}))

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ ok: false })

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ReferEasy <info@refereasy.ca>',
        to: ['info.refereasy@gmail.com'],
        reply_to: user_email || undefined,
        subject: `New claim submitted — ${provider_name || 'listing'}`,
        html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="color:#0f172a;font-size:18px;font-weight:700;margin:0 0 14px">New claim pending review</h1>
  <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 8px"><strong>Listing:</strong> ${provider_name || '—'}</p>
  <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 8px"><strong>Submitted by:</strong> ${user_name || '—'} (${user_email || '—'})</p>
  <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 8px"><strong>Verification:</strong> ${verification_method || '—'}</p>
  ${cpso_link ? `<p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 8px"><strong>CPSO link:</strong> ${cpso_link}</p>` : ''}
  <p style="color:#64748b;font-size:13px;line-height:1.6;margin:16px 0 0">Review it from the Claims tab in admin before it's approved — nothing here is auto-granted.</p>
</div>`,
      }),
    })
  } catch (e) {
    // Claim was already inserted either way — visible in the dashboard even if this email fails.
  }

  return NextResponse.json({ ok: true })
}

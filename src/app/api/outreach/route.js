import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'

// POST /api/outreach — email providers inviting them to join/claim their listing
export async function POST(request) {
  const { items, subject, message } = await request.json()
  if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: 'No recipients' }, { status: 400 })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'Email service not configured (RESEND_API_KEY missing)' }, { status: 503 })

  const supabase = getSupabase()
  let sent = 0
  const errors = []

  for (const it of items.slice(0, 100)) {
    if (!it.email) continue
    const listingName = it.name || 'your practice'
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#1e3a5f;margin:0 0 6px">Your listing is on ReferEasy</h2>
        <p style="color:#444;font-size:14px;line-height:1.6">Hello,</p>
        <p style="color:#444;font-size:14px;line-height:1.6"><strong>${listingName}</strong> is listed on <a href="https://refereasy.ca" style="color:#1e3a5f">ReferEasy</a>, the Ontario platform family physicians use to find specialists and send complete, well-matched referrals.</p>
        ${message ? `<p style="color:#444;font-size:14px;line-height:1.6">${message}</p>` : ''}
        <p style="color:#444;font-size:14px;line-height:1.6">Claim your listing to control your availability, wait times, referral criteria and forms — so you receive referrals that are right for your practice:</p>
        <div style="text-align:center;margin:24px 0">
          <a href="https://refereasy.ca/signup" style="background:#1e3a5f;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:bold;font-size:14px;display:inline-block">Claim your free listing</a>
        </div>
        <p style="color:#888;font-size:12px;line-height:1.5">Claiming is free and takes a few minutes: create an account at refereasy.ca, find your listing, and verify by fax, email and ID. If this doesn't apply to you, you can ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
        <p style="color:#aaa;font-size:11px">ReferEasy — Ontario Healthcare Referral Platform · refereasy.ca</p>
      </div>`

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ReferEasy <verify@refereasy.ca>',
          to: [it.email],
          subject: subject || `Claim your listing on ReferEasy${it.name ? ' — ' + it.name : ''}`,
          html,
        })
      })
      if (res.ok) {
        sent++
        if (it.provider_id && supabase) {
          await supabase.from('providers').update({ invited_at: new Date().toISOString() }).eq('id', it.provider_id)
        }
      } else {
        const j = await res.json().catch(() => ({}))
        errors.push(`${it.email}: ${j.message || res.status}`)
      }
    } catch (e) {
      errors.push(`${it.email}: ${e.message}`)
    }
  }

  return NextResponse.json({ sent, errors })
}

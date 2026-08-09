import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { buildTemplate, SUBJECTS } from './templates'

// POST /api/outreach, send invitation campaign
export async function POST(request) {
  const { items, template = 'claim', message } = await request.json()
  if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: 'No recipients' }, { status: 400 })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'Email service not configured (RESEND_API_KEY missing)' }, { status: 503 })

  const supabase = getServiceSupabase()
  let sent = 0
  const errors = []

  for (const it of items.slice(0, 100)) {
    if (!it.email) continue
    const html = buildTemplate(template, { name: it.name, customMessage: message })
    const subject = SUBJECTS[template] || SUBJECTS.claim

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ReferEasy <info@refereasy.ca>',
          reply_to: 'info.refereasy@gmail.com',
          to: [it.email],
          subject,
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

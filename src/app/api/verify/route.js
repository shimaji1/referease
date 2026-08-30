import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// POST /api/verify, handle all verification actions
export async function POST(request) {
  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database not connected' }, { status: 503 })

  const body = await request.json()
  const { action } = body

  // ─── CPSO LOOKUP ───────────────────────────────────────────────
  if (action === 'cpso_lookup') {
    const { cpso_number, expected_name } = body
    if (!cpso_number) return NextResponse.json({ error: 'CPSO number required' }, { status: 400 })

    const apiKey = process.env.RAPIDAPI_CPSO_KEY
    if (!apiKey) return NextResponse.json({ error: 'CPSO lookup not configured' }, { status: 503 })

    try {
      const res = await fetch(`https://cpso-lookup.p.rapidapi.com/lookup?cpso=${cpso_number}`, {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'cpso-lookup.p.rapidapi.com',
        }
      })
      const data = await res.json()

      if (!data || data.error) {
        return NextResponse.json({ verified: false, message: 'CPSO number not found' })
      }

      // Check if name roughly matches
      const cpsoName = `${data.firstName || ''} ${data.lastName || ''}`.toLowerCase().trim()
      const checkName = (expected_name || '').toLowerCase().trim()
      const lastNameMatch = checkName.split(' ').some(part => cpsoName.includes(part))

      // The whole point of this check: is the doctor's registration currently active,
      // not suspended/resigned/deceased/expired? Anything that doesn't clearly say
      // "active" gets flagged for the reviewer rather than assumed fine.
      const statusStr = String(data.memberStatus || data.status || '').toLowerCase()
      const isActive = statusStr.includes('active') && !statusStr.includes('inactive')

      return NextResponse.json({
        verified: true,
        name_match: lastNameMatch,
        active: isActive,
        cpso_data: {
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          status: data.memberStatus || data.status,
          specialty: data.specialty,
          city: data.city,
          address: data.address || data.practiceAddress || null,
        }
      })
    } catch (err) {
      return NextResponse.json({ error: 'CPSO lookup failed: ' + err.message }, { status: 500 })
    }
  }

  // ─── SEND EMAIL CODE ───────────────────────────────────────────
  if (action === 'send_email') {
    const { user_id, provider_id, email } = body
    if (!user_id || !provider_id || !email) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    await supabase.from('verification_codes').insert({
      user_id, provider_id, type: 'email', code, target: email, expires_at: expiresAt
    })

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ReferEasy <verify@refereasy.ca>',
          to: [email],
          subject: 'Your ReferEasy Verification Code: ' + code,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px">
              <h2 style="color:#1e3a5f;margin-bottom:4px">ReferEasy Verification</h2>
              <p style="color:#666;font-size:14px">Enter this code to verify your listing:</p>
              <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
                <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1e3a5f">${code}</span>
              </div>
              <p style="color:#999;font-size:12px">This code expires in 30 minutes. If you didn't request this, ignore this email.</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
              <p style="color:#aaa;font-size:11px">ReferEasy, Ontario Healthcare Referral Platform</p>
            </div>
          `
        })
      })

      const result = await res.json()

      if (res.ok) {
        return NextResponse.json({ sent: true, message: 'Verification code sent to ' + email })
      } else {
        return NextResponse.json({ sent: false, error: 'Email failed: ' + (result.message || 'Unknown') }, { status: 500 })
      }
    } catch (err) {
      return NextResponse.json({ error: 'Email service error: ' + err.message }, { status: 500 })
    }
  }

  // ─── VERIFY CODE ───────────────────────────────────────────────
  if (action === 'verify_code') {
    const { user_id, provider_id, type, code } = body
    if (!user_id || !provider_id || !type || !code) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const { data: records } = await supabase.from('verification_codes')
      .select('*')
      .eq('user_id', user_id)
      .eq('provider_id', provider_id)
      .eq('type', type)
      .eq('code', code)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (!records || records.length === 0) {
      return NextResponse.json({ verified: false, message: 'Invalid or expired code' })
    }

    // Mark as verified
    await supabase.from('verification_codes').update({ verified: true }).eq('id', records[0].id)

    // Update provider verification status
    await supabase.from('providers').update({ email_verified: true }).eq('id', provider_id)

    return NextResponse.json({
      verified: true,
      message: 'Email verified!',
      fully_verified: true
    })
  }

  // ─── CPSO VERIFY (mark as checked) ─────────────────────────────
  if (action === 'cpso_verify') {
    const { provider_id } = body
    if (!provider_id) return NextResponse.json({ error: 'Missing provider_id' }, { status: 400 })

    await supabase.from('providers').update({ cpso_verified: true }).eq('id', provider_id)
    return NextResponse.json({ verified: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

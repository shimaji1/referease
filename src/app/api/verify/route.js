import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// POST /api/verify — handle all verification actions
export async function POST(request) {
  const supabase = getSupabase()
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

      return NextResponse.json({
        verified: true,
        name_match: lastNameMatch,
        cpso_data: {
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          status: data.memberStatus || data.status,
          specialty: data.specialty,
          city: data.city,
        }
      })
    } catch (err) {
      return NextResponse.json({ error: 'CPSO lookup failed: ' + err.message }, { status: 500 })
    }
  }

  // ─── SEND FAX CODE ─────────────────────────────────────────────
  if (action === 'send_fax') {
    const { user_id, provider_id, fax_number } = body
    if (!user_id || !provider_id || !fax_number) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min

    // Store code
    await supabase.from('verification_codes').insert({
      user_id, provider_id, type: 'fax', code, target: fax_number, expires_at: expiresAt
    })

    // Send via SRFax
    const srfaxId = process.env.SRFAX_ACCESS_ID
    const srfaxPwd = process.env.SRFAX_ACCESS_PWD
    const srfaxNumber = process.env.SRFAX_CALLER_ID

    if (!srfaxId || !srfaxPwd) {
      return NextResponse.json({ error: 'Fax service not configured' }, { status: 503 })
    }

    try {
      // Clean fax number - remove spaces, dashes, brackets
      const cleanFax = fax_number.replace(/[\s\-\(\)]/g, '')

      const faxContent = `
REFEREASE VERIFICATION CODE

Your verification code is: ${code}

This code expires in 30 minutes.

Enter this code at refereasy.ca to verify
your listing on the ReferEasy platform.

If you did not request this, please ignore this fax.

---
ReferEasy - Ontario Healthcare Referral Platform
refereasy.ca
      `.trim()

      // Convert to base64 for SRFax
      const base64Content = Buffer.from(faxContent).toString('base64')

      const formData = new URLSearchParams()
      formData.append('access_id', srfaxId)
      formData.append('access_pwd', srfaxPwd)
      formData.append('sCallerID', srfaxNumber || '0000000000')
      formData.append('sSenderEmail', 'verify@refereasy.ca')
      formData.append('sFaxType', 'SINGLE')
      formData.append('sToFaxNumber', cleanFax)
      formData.append('sFileName_1', 'verification.txt')
      formData.append('sFileContent_1', base64Content)

      const res = await fetch('https://www.srfax.com/SRF_SecWebSvc.php?action=Queue_Fax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      })

      const result = await res.json()

      if (result.Status === 'Success') {
        return NextResponse.json({ sent: true, message: 'Verification code faxed. Check your fax machine.' })
      } else {
        return NextResponse.json({ sent: false, error: 'Fax failed: ' + (result.Result || 'Unknown error') }, { status: 500 })
      }
    } catch (err) {
      return NextResponse.json({ error: 'Fax service error: ' + err.message }, { status: 500 })
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
              <p style="color:#aaa;font-size:11px">ReferEasy — Ontario Healthcare Referral Platform</p>
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
    const update = type === 'fax' ? { fax_verified: true } : { email_verified: true }

    const { data: provider } = await supabase.from('providers').select('fax_verified, email_verified').eq('id', provider_id).single()
    const faxDone = type === 'fax' ? true : (provider?.fax_verified || false)
    const emailDone = type === 'email' ? true : (provider?.email_verified || false)

    await supabase.from('providers').update(update).eq('id', provider_id)

    return NextResponse.json({
      verified: true,
      message: `${type === 'fax' ? 'Fax' : 'Email'} verified!`,
      fully_verified: faxDone && emailDone
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

'use client'
import { useState, useEffect, Suspense } from 'react'
import Logo from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function VerifyContent() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const providerId = searchParams.get('provider_id')
  const physicianId = searchParams.get('physician_id')   // optional: claiming a doctor profile

  const [provider, setProvider] = useState(null)
  const [step, setStep] = useState(1) // 1=Email, 2=CPSO, 3=Submitted
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [cpsoLink, setCpsoLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  // CPSO only applies to individual physicians — a clinic, lab, or imaging centre has
  // no CPSO number of its own. Defaulted from the listing's category, but the
  // claimant can override it — directory category tags aren't always right (a solo
  // specialist mistagged as a clinic, or vice versa), and a hard-coded hide would
  // just be wrong for them.
  const [isDoctor, setIsDoctor] = useState(null)

  const [existingClaim, setExistingClaim] = useState(null)

  useEffect(() => {
    if (!supabase || !providerId || !user) return
    supabase.from('providers').select('*').eq('id', providerId).single().then(({ data }) => {
      if (data) {
        setProvider(data)
        setEmail(data.email || profile?.email || '')
        setIsDoctor(!!physicianId || ['Specialist', 'Family Medicine'].includes(data.category))
        if (data.email_verified) setStep(2)
      }
    })
    // A claim already submitted for this listing? Don't let them submit a duplicate.
    supabase.from('claims').select('id, status').eq('provider_id', providerId).eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(1).then(({ data }) => {
        if (data?.[0] && data[0].status !== 'rejected') setExistingClaim(data[0])
      })
  }, [providerId, profile, user])

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!user || !providerId) { router.push('/dashboard'); return null }

  const callApi = async (body) => {
    const res = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return res.json()
  }

  // Step 1: Email
  const handleSendEmail = async () => {
    if (!email) { setError('Enter an email'); return }
    setLoading(true); setError(''); setMsg('')
    const result = await callApi({ action: 'send_email', user_id: user.id, provider_id: parseInt(providerId), email })
    setLoading(false)
    if (result.error || !result.sent) { setError(result.error || 'Failed to send email'); return }
    setEmailSent(true); setMsg(result.message)
  }
  const handleVerifyEmail = async () => {
    if (!emailCode || emailCode.length !== 6) { setError('Enter the 6-digit code'); return }
    setLoading(true); setError('')
    const result = await callApi({ action: 'verify_code', user_id: user.id, provider_id: parseInt(providerId), type: 'email', code: emailCode })
    setLoading(false)
    if (!result.verified) { setError(result.message || 'Invalid code'); return }
    setMsg('Email verified!'); setStep(2)
  }

  // Step 2: submit for admin review — CPSO is just evidence at this point (present or
  // skipped); no auto-grant either way. An admin looks at whatever was provided and
  // decides, following up by email for anything more they need before approving.
  const handleSubmitForReview = async () => {
    setLoading(true); setError(''); setMsg('')

    const parts = ['email']
    if (isDoctor) parts.push(cpsoLink.trim() ? 'cpso' : 'cpso:skipped')
    const method = parts.join('+')

    const { error: claimErr } = await supabase.from('claims').insert({
      user_id: user.id, provider_id: parseInt(providerId), physician_id: physicianId || null,
      user_email: profile?.email, user_name: profile?.full_name,
      status: 'pending',
      verification_method: method,
      verify_email: email,
      cpso_link: isDoctor ? (cpsoLink.trim() || null) : null,
    })
    if (claimErr) { setError('Could not submit claim: ' + claimErr.message); setLoading(false); return }

    fetch('/api/claim/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider_name: provider?.name, user_email: profile?.email, user_name: profile?.full_name,
        verification_method: method, cpso_link: isDoctor ? cpsoLink.trim() : null,
      }),
    }).catch(() => {}) // claim's already submitted either way — visible in the dashboard even if this fails

    setLoading(false); setStep(3)
  }

  const inp = "w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"
  const btn = "px-5 py-3 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50"
  const stepDone = "flex items-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4"

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo />
          <Link href="/dashboard" className="text-xs font-medium text-gray-500 hover:text-brand">← Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          {physicianId ? 'Verify to Claim This Profile' : provider && user && provider.owner_id === user.id ? 'Verify Your Listing to Activate Your Badge' : 'Verify Your Listing'}
        </h1>
        <p className="text-sm text-gray-500 mb-2">{provider?.name || 'Loading...'}</p>

        {existingClaim ? (
          <div className="bg-white border-2 border-brand/30 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">{existingClaim.status === 'approved' ? '✅' : '📋'}</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{existingClaim.status === 'approved' ? 'Already verified' : 'Already submitted'}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {existingClaim.status === 'approved'
                ? 'This listing is already verified and linked to your account.'
                : "You've already submitted a claim for this listing — it's waiting on admin review. You'll get an email once it's decided."}
            </p>
            <Link href="/dashboard" className={btn}>Go to Dashboard</Link>
          </div>
        ) : (
        <>
        <div className="flex gap-1 mb-6">
          {[1,2].map(s => <div key={s} className={`h-1.5 flex-1 rounded-full transition ${step > s ? 'bg-emerald-500' : step === s ? 'bg-brand' : 'bg-gray-200'}`} />)}
        </div>

        {error && <div className="mb-4 p-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">{error}</div>}
        {msg && <div className="mb-4 p-3 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">{msg}</div>}

        {/* Step 1: Email */}
        {step >= 2 && <div className={stepDone}><span>✓</span> Email code verified</div>}
        {step === 1 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center text-brand font-bold text-sm">1</div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Email Verification</h3>
                <p className="text-xs text-gray-500">We'll email a 6-digit code to confirm your contact email</p>
              </div>
            </div>
            {!emailSent ? (
              <>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <input className={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="dr.smith@clinic.ca" />
                <button onClick={handleSendEmail} disabled={loading || !email} className={`${btn} mt-3`}>{loading ? 'Sending...' : 'Send Email Code'}</button>
              </>
            ) : (
              <>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Enter the 6-digit code from your email</label>
                <input className={inp + " text-center text-2xl tracking-widest font-bold"} value={emailCode} onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} />
                <div className="flex gap-3 mt-3">
                  <button onClick={handleVerifyEmail} disabled={loading || emailCode.length !== 6} className={btn}>{loading ? 'Verifying...' : 'Verify Code'}</button>
                  <button onClick={() => { setEmailSent(false); setEmailCode(''); setMsg('') }} className="px-5 py-3 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">Resend</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: CPSO (doctors only, optional) -> submit */}
        {step === 2 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center text-brand font-bold text-sm">2</div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{isDoctor ? 'CPSO Profile (optional)' : 'Almost done'}</h3>
                <p className="text-xs text-gray-500">{isDoctor ? "A link to your CPSO profile speeds up review, but you can skip it and our team will follow up if needed" : "Nothing else needed — our team will review your claim"}</p>
              </div>
            </div>

            <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">This listing is for</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsDoctor(true)} className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition ${isDoctor ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>An individual physician (has a CPSO number)</button>
                <button type="button" onClick={() => setIsDoctor(false)} className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition ${isDoctor === false ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>A clinic or facility (no CPSO)</button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">We guessed based on the listing's category — change it if that's wrong.</p>
            </div>

            {isDoctor && (
              <label className="block mb-4">
                <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Link to your CPSO profile <span className="text-gray-400 normal-case font-normal">(optional)</span>
                </span>
                <input className={inp} type="url" value={cpsoLink} onChange={e => setCpsoLink(e.target.value)} placeholder="https://doctors.cpso.on.ca/..." />
                <span className="block text-[11px] text-gray-400 mt-1.5">Find your profile at <a href="https://doctors.cpso.on.ca/" target="_blank" rel="noopener noreferrer" className="text-brand underline">doctors.cpso.on.ca</a> and paste the link here — it lets our team check your registration with one click. Skip it and they'll look it up themselves, or follow up if they can't find you.</span>
              </label>
            )}

            <button onClick={handleSubmitForReview} disabled={loading} className={btn}>{loading ? 'Submitting...' : 'Submit for Review'}</button>
          </div>
        )}

        {/* Step 3: Submitted */}
        {step === 3 && (
          <div className="bg-white border-2 border-brand/30 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Submitted for review</h3>
            <p className="text-sm text-gray-500 mb-4">Our team reviews the email/CPSO evidence within 1–2 business days, and may email you if they need anything more. You'll hear back once it's decided — your listing and verified badge go live at that point, not before.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/dashboard" className={btn}>Go to Dashboard</Link>
            </div>
          </div>
        )}

        {step < 3 && (
          <div className="mt-6 bg-gray-100 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
            <p className="font-semibold text-gray-700 mb-1">Why these steps?</p>
            <p>The email code confirms your contact email{isDoctor && ', and the CPSO link speeds up confirming your license'}. A member of our team reviews everything before your listing is verified and access is granted — nothing here auto-approves, and they may reach out if they need more.</p>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>}>
      <VerifyContent />
    </Suspense>
  )
}

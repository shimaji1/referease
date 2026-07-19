'use client'
import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function VerifyContent() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const providerId = searchParams.get('provider_id')

  const [provider, setProvider] = useState(null)
  const [step, setStep] = useState(1) // 1=CPSO, 2=Fax, 3=Email, 4=Done
  const [cpsoNumber, setCpsoNumber] = useState('')
  const [cpsoResult, setCpsoResult] = useState(null)
  const [faxNumber, setFaxNumber] = useState('')
  const [faxCode, setFaxCode] = useState('')
  const [faxSent, setFaxSent] = useState(false)
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!supabase || !providerId) return
    supabase.from('providers').select('*').eq('id', providerId).single().then(({ data }) => {
      if (data) {
        setProvider(data)
        setFaxNumber(data.fax || '')
        setEmail(data.email || profile?.email || '')
        // Resume from where they left off
        if (data.cpso_verified) setStep(2)
        if (data.cpso_verified && data.fax_verified) setStep(3)
        if (data.cpso_verified && data.fax_verified && data.email_verified) setStep(4)
      }
    })
  }, [providerId, profile])

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!user || !providerId) { router.push('/dashboard'); return null }

  const callApi = async (body) => {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return res.json()
  }

  // Step 1: CPSO
  const handleCpsoLookup = async () => {
    setLoading(true); setError(''); setCpsoResult(null)
    const result = await callApi({ action: 'cpso_lookup', cpso_number: cpsoNumber, expected_name: profile?.full_name })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setCpsoResult(result)
    if (result.verified && result.name_match) {
      await callApi({ action: 'cpso_verify', provider_id: parseInt(providerId) })
      setMsg('CPSO verified! Name matches registry.')
    }
  }

  const skipToFax = () => setStep(2)
  const proceedToFax = async () => {
    if (cpsoResult?.verified && cpsoResult?.name_match) {
      setStep(2)
    }
  }

  // Step 2: Fax
  const handleSendFax = async () => {
    if (!faxNumber) { setError('Enter a fax number'); return }
    setLoading(true); setError(''); setMsg('')
    const result = await callApi({ action: 'send_fax', user_id: user.id, provider_id: parseInt(providerId), fax_number: faxNumber })
    setLoading(false)
    if (result.error || !result.sent) { setError(result.error || 'Failed to send fax'); return }
    setFaxSent(true); setMsg(result.message)
  }

  const handleVerifyFax = async () => {
    if (!faxCode || faxCode.length !== 6) { setError('Enter the 6-digit code'); return }
    setLoading(true); setError('')
    const result = await callApi({ action: 'verify_code', user_id: user.id, provider_id: parseInt(providerId), type: 'fax', code: faxCode })
    setLoading(false)
    if (!result.verified) { setError(result.message || 'Invalid code'); return }
    setMsg('Fax verified!'); setStep(3)
  }

  // Step 3: Email
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
    setMsg(result.fully_verified ? 'All verified! Your listing is now verified.' : 'Email verified!')
    setStep(4)
  }

  const inp = "w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"
  const btn = "px-5 py-3 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50"
  const stepDone = "flex items-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4"

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">R</span></div>
            <span className="text-lg font-bold text-gray-900">Refer<span className="text-brand">Easy</span></span>
          </Link>
          <Link href="/dashboard" className="text-xs font-medium text-gray-500 hover:text-brand">← Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Verify Your Listing</h1>
        <p className="text-sm text-gray-500 mb-2">{provider?.name || 'Loading...'}</p>

        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {[1,2,3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition ${step > s ? 'bg-emerald-500' : step === s ? 'bg-brand' : 'bg-gray-200'}`} />
          ))}
        </div>

        {error && <div className="mb-4 p-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">{error}</div>}
        {msg && <div className="mb-4 p-3 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">{msg}</div>}

        {/* Step 1: CPSO */}
        {step >= 2 && <div className={stepDone}><span>✓</span> CPSO verified</div>}
        {step === 1 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center text-brand font-bold text-sm">1</div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">CPSO Verification</h3>
                <p className="text-xs text-gray-500">Enter your CPSO number to verify your medical license</p>
              </div>
            </div>
            <input className={inp} value={cpsoNumber} onChange={e => setCpsoNumber(e.target.value)} placeholder="e.g. 026762" />
            {cpsoResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${cpsoResult.verified && cpsoResult.name_match ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                {cpsoResult.verified ? (
                  <>
                    <p className="font-semibold">{cpsoResult.name_match ? '✓ Verified' : '⚠ Name mismatch'}</p>
                    <p className="text-xs mt-1">Registry: {cpsoResult.cpso_data?.name} · {cpsoResult.cpso_data?.specialty} · {cpsoResult.cpso_data?.status}</p>
                  </>
                ) : (
                  <p>CPSO number not found in registry</p>
                )}
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={handleCpsoLookup} disabled={loading || !cpsoNumber} className={btn}>{loading ? 'Looking up...' : 'Verify CPSO'}</button>
              {cpsoResult?.verified && cpsoResult?.name_match && (
                <button onClick={proceedToFax} className={btn}>Continue →</button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Fax */}
        {step >= 3 && <div className={stepDone}><span>✓</span> Fax verified</div>}
        {step === 2 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center text-brand font-bold text-sm">2</div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Fax Verification</h3>
                <p className="text-xs text-gray-500">We'll fax a 6-digit code to verify your practice location</p>
              </div>
            </div>
            {!faxSent ? (
              <>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Fax Number</label>
                <input className={inp} value={faxNumber} onChange={e => setFaxNumber(e.target.value)} placeholder="(905) 555-0124" />
                <button onClick={handleSendFax} disabled={loading || !faxNumber} className={`${btn} mt-3`}>{loading ? 'Sending...' : 'Send Fax Code'}</button>
              </>
            ) : (
              <>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Enter the 6-digit code from your fax</label>
                <input className={inp + " text-center text-2xl tracking-widest font-bold"} value={faxCode} onChange={e => setFaxCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} />
                <div className="flex gap-3 mt-3">
                  <button onClick={handleVerifyFax} disabled={loading || faxCode.length !== 6} className={btn}>{loading ? 'Verifying...' : 'Verify Code'}</button>
                  <button onClick={() => { setFaxSent(false); setFaxCode(''); setMsg('') }} className="px-5 py-3 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">Resend</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Email */}
        {step >= 4 && <div className={stepDone}><span>✓</span> Email verified</div>}
        {step === 3 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center text-brand font-bold text-sm">3</div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Email Verification</h3>
                <p className="text-xs text-gray-500">Verify your contact email for referral communications</p>
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

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="bg-white border-2 border-emerald-300 rounded-xl p-8 text-center animate-fade-in">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Listing Verified!</h3>
            <p className="text-sm text-gray-500 mb-4">Your listing now shows a verified badge. Family physicians can trust your referral contacts are accurate and working.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/dashboard" className={btn}>Go to Dashboard</Link>
              <Link href={`/dashboard/provider/${providerId}/preview`} className="px-5 py-3 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">Preview Listing</Link>
            </div>
          </div>
        )}

        {/* Info box */}
        {step < 4 && (
          <div className="mt-6 bg-gray-100 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
            <p className="font-semibold text-gray-700 mb-1">Why verify?</p>
            <p>Verified listings get a trusted badge, appear higher in search results, and confirm to family physicians that your fax and email are working — reducing failed referral deliveries.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>}><VerifyContent /></Suspense>
}

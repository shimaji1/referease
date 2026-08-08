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
  const [step, setStep] = useState(1) // 1=Fax, 2=Email, 3=ID+CPSO, 4=Submitted
  const [faxMode, setFaxMode] = useState('onfile') // 'onfile' | 'correcting' | 'skipped'
  const [correctedFax, setCorrectedFax] = useState('')
  const [verifiedFaxNumber, setVerifiedFaxNumber] = useState('')
  const [faxCode, setFaxCode] = useState('')
  const [faxSent, setFaxSent] = useState(false)
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [idFile, setIdFile] = useState(null)
  const [cpsoNumber, setCpsoNumber] = useState('')
  const [cpsoResult, setCpsoResult] = useState(null)
  const [cpsoChecking, setCpsoChecking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const faxOnFile = provider?.fax || ''
  // CPSO only applies to individual physicians — a clinic, lab, or imaging centre has
  // no CPSO number of its own, so we never ask a facility for one.
  const isDoctor = !!physicianId || ['Specialist', 'Family Medicine'].includes(provider?.category)
  const faxWasSkipped = faxMode === 'skipped'

  const [existingClaim, setExistingClaim] = useState(null)

  useEffect(() => {
    if (!supabase || !providerId || !user) return
    supabase.from('providers').select('*').eq('id', providerId).single().then(({ data }) => {
      if (data) {
        setProvider(data)
        setEmail(data.email || profile?.email || '')
        setCpsoNumber(profile?.cpso_number || '')
        // No fax on file at all — nothing to verify against, skip straight to email
        if (!data.fax && !data.fax_verified) setFaxMode('skipped')
        if (data.fax_verified) setStep(2)
        if (data.fax_verified && data.email_verified) setStep(3)
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

  // Step 1: Fax — sent to the number on file by default, proving control of the
  // number tied to the listing. If that number's stale, they can provide a
  // corrected one instead (weaker signal, self-reported — flagged as such for the
  // reviewer), or skip fax entirely if the practice doesn't have one at all.
  const handleSendFax = async () => {
    const target = faxMode === 'correcting' ? correctedFax.trim() : faxOnFile
    if (faxMode === 'correcting' && !target) { setError('Enter a fax number'); return }
    setLoading(true); setError(''); setMsg('')
    const result = await callApi({ action: 'send_fax', user_id: user.id, provider_id: parseInt(providerId), fax_number: target })
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
    setVerifiedFaxNumber(faxMode === 'correcting' ? correctedFax.trim() : faxOnFile)
    setMsg('Fax verified!'); setStep(2)
  }
  const startCorrectingFax = () => {
    setFaxMode('correcting'); setFaxSent(false); setFaxCode(''); setError(''); setMsg('')
  }
  const skipFaxEntirely = () => {
    setFaxMode('skipped'); setError(''); setMsg('')
    setStep(2)
  }

  // Step 2: Email
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
    setMsg('Email verified!'); setStep(3)
  }

  // Step 3: CPSO lookup (best effort — supporting evidence for the reviewer, not a gate)
  const runCpsoLookup = async () => {
    if (!cpsoNumber.trim()) return
    setCpsoChecking(true); setError('')
    const result = await callApi({ action: 'cpso_lookup', cpso_number: cpsoNumber.trim(), expected_name: profile?.full_name })
    setCpsoChecking(false)
    if (result.error) { setCpsoResult({ error: result.error }); return }
    setCpsoResult(result)
  }

  // Step 3: ID upload -> submit for admin review (no auto-grant — an admin has to
  // approve before ownership/verified status is actually applied).
  const handleSubmitForReview = async () => {
    if (!idFile) { setError('Please choose an ID or credential file'); return }
    if (faxWasSkipped && isDoctor && !cpsoNumber.trim()) { setError('Since fax verification was skipped, a CPSO number is required so our team can cross-check the registry.'); return }
    setLoading(true); setError(''); setMsg('')
    let idUrl = null, idPath = null
    try {
      const safe = idFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      idPath = `verification/${providerId}-${Date.now()}-${safe}`
      const { error: upErr } = await supabase.storage.from('forms').upload(idPath, idFile)
      if (upErr) { setError('Upload failed: ' + upErr.message); setLoading(false); return }
      const { data: pub } = supabase.storage.from('forms').getPublicUrl(idPath)
      idUrl = pub?.publicUrl || null
    } catch (e) { setError('Upload error: ' + e.message); setLoading(false); return }

    const faxCorrected = faxMode === 'correcting' && !!verifiedFaxNumber
    const method = faxWasSkipped
      ? (isDoctor ? 'email+cpso+id' : 'email+id')
      : (faxCorrected ? 'fax(corrected)+email+id' : 'fax+email+id')

    // Record the claim as pending — an admin reviews the fax/email/CPSO/ID evidence
    // below and only then grants ownership + the verified badge. A corrected fax
    // number is weaker evidence than the one already on file (self-reported), so
    // it's flagged in the method string for the reviewer rather than trusted outright.
    const { error: claimErr } = await supabase.from('claims').insert({
      user_id: user.id, provider_id: parseInt(providerId), physician_id: physicianId || null,
      user_email: profile?.email, user_name: profile?.full_name,
      status: 'pending',
      verification_method: method,
      verify_email: email, verify_fax: faxWasSkipped ? null : verifiedFaxNumber,
      id_doc_url: idUrl, id_doc_path: idPath,
      cpso_lookup: isDoctor && cpsoResult && !cpsoResult.error ? cpsoResult : null,
    })
    if (claimErr) { setError('Could not submit claim: ' + claimErr.message); setLoading(false); return }

    setLoading(false); setStep(4)
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
        <h1 className="text-xl font-bold text-gray-900 mb-1">{physicianId ? 'Verify to Claim This Profile' : 'Verify Your Listing'}</h1>
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
          {[1,2,3].map(s => <div key={s} className={`h-1.5 flex-1 rounded-full transition ${step > s ? 'bg-emerald-500' : step === s ? 'bg-brand' : 'bg-gray-200'}`} />)}
        </div>

        {error && <div className="mb-4 p-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">{error}</div>}
        {msg && <div className="mb-4 p-3 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">{msg}</div>}

        {/* Step 1: Fax */}
        {step >= 2 && (faxWasSkipped
          ? <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4"><span>ℹ️</span> Fax verification skipped — {isDoctor ? 'CPSO + ID' : 'ID'} will be checked instead</div>
          : <div className={stepDone}><span>✓</span> Fax code verified {faxMode === 'correcting' && '(corrected number — flagged for review)'}</div>)}
        {step === 1 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center text-brand font-bold text-sm">1</div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Fax Verification</h3>
                <p className="text-xs text-gray-500">We'll fax a 6-digit code to confirm you control the practice's fax line</p>
              </div>
            </div>
            {!faxSent ? (
              <>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {faxMode === 'correcting' ? 'Corrected fax number' : 'Fax number on file'}
                </label>
                {faxMode === 'correcting' ? (
                  <input className={inp} value={correctedFax} onChange={e => setCorrectedFax(e.target.value)} placeholder="(905) 555-0124" />
                ) : (
                  <input className={inp + ' bg-gray-50 text-gray-500'} value={faxOnFile} disabled />
                )}
                {faxMode === 'correcting' && <p className="text-[11px] text-amber-600 mt-1.5">Self-reported numbers are weaker evidence — flagged for our reviewer to double-check.</p>}
                <button onClick={handleSendFax} disabled={loading || (faxMode === 'correcting' && !correctedFax.trim())} className={`${btn} mt-3`}>{loading ? 'Sending...' : 'Send Fax Code'}</button>
                <div className="flex gap-4 mt-3">
                  {faxMode === 'correcting'
                    ? <button onClick={() => setFaxMode('onfile')} className="text-xs text-gray-500 hover:text-brand underline">← Use the number on file instead</button>
                    : <button onClick={startCorrectingFax} className="text-xs text-gray-500 hover:text-brand underline">This isn't our fax number anymore →</button>}
                  <button onClick={skipFaxEntirely} className="text-xs text-gray-500 hover:text-brand underline">We don't have a fax →</button>
                </div>
              </>
            ) : (
              <>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Enter the 6-digit code from your fax</label>
                <input className={inp + " text-center text-2xl tracking-widest font-bold"} value={faxCode} onChange={e => setFaxCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} />
                <div className="flex gap-3 mt-3">
                  <button onClick={handleVerifyFax} disabled={loading || faxCode.length !== 6} className={btn}>{loading ? 'Verifying...' : 'Verify Code'}</button>
                  <button onClick={() => { setFaxSent(false); setFaxCode(''); setMsg('') }} className="px-5 py-3 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">Resend</button>
                </div>
                <div className="flex gap-4 mt-3">
                  {faxMode !== 'correcting' && <button onClick={startCorrectingFax} className="text-xs text-gray-500 hover:text-brand underline">Didn't get it? This isn't our fax number anymore →</button>}
                  <button onClick={skipFaxEntirely} className="text-xs text-gray-500 hover:text-brand underline">We don't have a fax →</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Email */}
        {step >= 3 && <div className={stepDone}><span>✓</span> Email code verified</div>}
        {step === 2 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center text-brand font-bold text-sm">2</div>
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

        {/* Step 3: CPSO (doctors only) + ID upload */}
        {step === 3 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center text-brand font-bold text-sm">3</div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{isDoctor ? 'CPSO Number & ID' : 'Photo ID'}</h3>
                <p className="text-xs text-gray-500">{isDoctor ? "A quick registry cross-check speeds up review, then upload a photo ID or your CPSO certificate" : "Upload a photo ID so our team can confirm your identity"}</p>
              </div>
            </div>

            {isDoctor && (
              <>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  CPSO Number {faxWasSkipped ? <span className="text-red-500 normal-case">(required, since fax was skipped)</span> : <span className="text-gray-400 normal-case font-normal">(optional, speeds up review)</span>}
                </label>
                <div className="flex gap-2">
                  <input className={inp} value={cpsoNumber} onChange={e => { setCpsoNumber(e.target.value); setCpsoResult(null) }} placeholder="e.g. 012345" />
                  <button onClick={runCpsoLookup} disabled={cpsoChecking || !cpsoNumber.trim()} className="px-4 py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition disabled:opacity-50 shrink-0">
                    {cpsoChecking ? 'Checking...' : 'Check'}
                  </button>
                </div>
                {cpsoResult && !cpsoResult.error && (
                  <div className={`mt-2 text-xs px-3 py-2 rounded-lg border ${cpsoResult.active && cpsoResult.name_match ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                    <div>Found: {cpsoResult.cpso_data?.name} · <strong>{cpsoResult.cpso_data?.status}</strong> · {cpsoResult.cpso_data?.specialty || 'Specialty n/a'} · {cpsoResult.cpso_data?.city || 'City n/a'}</div>
                    {!cpsoResult.active && <div className="font-semibold mt-1">⚠️ Registration doesn't look active — our team will verify before approving.</div>}
                    {!cpsoResult.name_match && <div className="mt-1">Name doesn't clearly match — our team will double-check.</div>}
                    <div className="mt-1 text-gray-500">Compare the city above to your listing's address ({provider?.address || 'no address on file'}) — it should be the same practice.</div>
                  </div>
                )}
                {cpsoResult?.error && <div className="mt-2 text-xs px-3 py-2 rounded-lg border bg-gray-50 border-gray-200 text-gray-500">CPSO lookup unavailable right now — this is just a nice-to-have, your reviewer can check manually.</div>}
              </>
            )}

            <div className={isDoctor ? "mt-4 pt-4 border-t border-gray-100" : ""}>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{isDoctor ? 'Photo ID or CPSO certificate' : 'Photo ID or business registration'}</label>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 border border-gray-300 cursor-pointer hover:bg-gray-200 transition">
                  {idFile ? 'Change file' : '📎 Choose file'}
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setIdFile(e.target.files?.[0] || null)} className="hidden" />
                </label>
                <span className="text-sm text-gray-500 truncate min-w-0">{idFile ? idFile.name : (isDoctor ? 'CPSO certificate or photo ID' : 'Photo ID or business registration document')}</span>
              </div>
              {!isDoctor && faxWasSkipped && <p className="text-[11px] text-amber-600 mt-2">No CPSO registry applies to a facility listing — our team will verify manually by matching your ID against the practice address on file.</p>}
              <p className="text-[11px] text-gray-400 mt-2">Used only to verify your identity. It's deleted from our systems as soon as review is complete — approved or not.</p>
              <button onClick={handleSubmitForReview} disabled={loading || !idFile} className={`${btn} mt-4`}>{loading ? 'Submitting...' : 'Submit for Review'}</button>
            </div>
          </div>
        )}

        {/* Step 4: Submitted */}
        {step === 4 && (
          <div className="bg-white border-2 border-brand/30 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Submitted for review</h3>
            <p className="text-sm text-gray-500 mb-4">Our team checks the fax/email/CPSO evidence and your ID within 1–2 business days. You'll get an email once it's approved — your listing and verified badge go live at that point, not before.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/dashboard" className={btn}>Go to Dashboard</Link>
            </div>
          </div>
        )}

        {step < 4 && (
          <div className="mt-6 bg-gray-100 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
            <p className="font-semibold text-gray-700 mb-1">Why these steps?</p>
            <p>The fax code confirms you control the practice's fax line, the email code confirms your contact email, and {isDoctor ? 'the CPSO check + ID confirm' : 'ID confirms'} your identity. A member of our team reviews all of it before your listing is verified and access is granted — nothing here auto-approves.</p>
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

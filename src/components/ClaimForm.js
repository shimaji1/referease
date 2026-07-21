'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

// Collects verification evidence, then files a pending claim for admin review.
export default function ClaimForm({ physicianId = null, providerId = null, entityName = '', userId, userName, accountEmail = '', onCancel, onSubmitted }) {
  const [email, setEmail] = useState(accountEmail || '')
  const [fax, setFax] = useState('')
  const [idFile, setIdFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [nonce, setNonce] = useState(0)

  const idField = physicianId ? 'physician_id' : 'provider_id'
  const idValue = physicianId || providerId

  const submit = async () => {
    if (!supabase || !userId) return
    if (!email.trim()) { setErr('Please enter a contact email.'); return }
    if (!fax.trim()) { setErr('Please enter a fax number we can verify against.'); return }
    setBusy(true); setErr('')

    const { data: existing } = await supabase.from('claims').select('id').eq('user_id', userId).eq(idField, idValue)
    if (existing && existing.length) { setErr('You already submitted a claim for this.'); setBusy(false); return }

    let idUrl = null, idPath = null
    if (idFile) {
      const safe = idFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `claims/${Date.now()}-${safe}`
      const { error: upErr } = await supabase.storage.from('forms').upload(path, idFile)
      if (upErr) { setErr('Could not upload the ID file: ' + upErr.message + '. You can submit without it or try again.'); setBusy(false); return }
      const { data: pub } = supabase.storage.from('forms').getPublicUrl(path)
      idUrl = pub?.publicUrl || null; idPath = path
    }

    const { error } = await supabase.from('claims').insert({
      user_id: userId, [idField]: idValue,
      user_email: accountEmail || email.trim(), user_name: userName,
      verify_email: email.trim(), verify_fax: fax.trim(), id_doc_url: idUrl, id_doc_path: idPath,
      status: 'pending', verification_method: 'manual_review',
    })
    setBusy(false)
    if (error) { setErr('Error: ' + error.message); return }
    onSubmitted && onSubmitted()
  }

  const inp = "w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"
  const step = "flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold shrink-0"

  return (
    <div className="bg-white border border-brand/20 rounded-xl p-5">
      <h4 className="text-sm font-bold text-gray-900 mb-1">Verify to claim{entityName ? ` — ${entityName}` : ''}</h4>
      <p className="text-xs text-gray-500 mb-4">We verify each claim to protect providers. Give us these three things and our team will confirm before granting access.</p>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5"><span className={step}>1</span> Contact email</label>
          <input className={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@practice.ca" />
        </div>
        <div>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5"><span className={step}>2</span> Fax number</label>
          <input className={inp} value={fax} onChange={e => setFax(e.target.value)} placeholder="905-555-0100" />
          <p className="text-[11px] text-gray-400 mt-1">We may send a confirmation to this fax to verify the practice.</p>
        </div>
        <div>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5"><span className={step}>3</span> Photo ID or credential <span className="text-gray-400 font-normal normal-case">(recommended)</span></label>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300 cursor-pointer hover:bg-gray-200 transition">
              {idFile ? 'Change file' : '📎 Choose file'}
              <input key={nonce} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setIdFile(e.target.files?.[0] || null)} className="hidden" />
            </label>
            <span className="text-xs text-gray-400 truncate min-w-0">{idFile ? idFile.name : 'e.g. CPSO certificate or photo ID'}</span>
          </div>
        </div>
      </div>

      {err && <p className="text-xs text-red-600 mt-3">{err}</p>}

      <div className="flex gap-2 mt-5">
        <button onClick={submit} disabled={busy} className="px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-dark transition disabled:opacity-50">{busy ? 'Submitting…' : 'Submit for verification'}</button>
        {onCancel && <button onClick={onCancel} className="px-5 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-200 transition">Cancel</button>}
      </div>
    </div>
  )
}

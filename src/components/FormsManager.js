'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Attach named, downloadable forms to a clinic (providerId) or a doctor (physicianId).
export default function FormsManager({ providerId = null, physicianId = null, ownerId = null, dark = false }) {
  const [forms, setForms] = useState([])
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [nonce, setNonce] = useState(0)

  const idField = physicianId ? 'physician_id' : 'provider_id'
  const idValue = physicianId || providerId
  const keyPrefix = physicianId ? `physician-${physicianId}` : `provider-${providerId}`

  const load = async () => {
    if (!supabase || !idValue) return
    const { data } = await supabase.from('listing_forms').select('*').eq(idField, idValue).order('created_at', { ascending: false })
    if (data) setForms(data)
  }
  useEffect(() => { load() }, [idValue])

  const upload = async () => {
    if (!supabase || !file || !name.trim()) { setErr('Add a name and choose a file.'); return }
    setBusy(true); setErr('')
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${keyPrefix}/${Date.now()}-${safe}`
    const { error: upErr } = await supabase.storage.from('forms').upload(path, file)
    if (upErr) { setErr('Upload failed: ' + upErr.message); setBusy(false); return }
    const { data: pub } = supabase.storage.from('forms').getPublicUrl(path)
    const { error: insErr } = await supabase.from('listing_forms').insert({ [idField]: idValue, name: name.trim(), file_path: path, file_url: pub?.publicUrl || null, owner_id: ownerId })
    if (insErr) { setErr('File uploaded but saving failed: ' + insErr.message); setBusy(false); return }
    setName(''); setFile(null); setNonce(n => n + 1); setBusy(false); load()
  }

  const remove = async (form) => {
    if (!supabase) return
    if (typeof window !== 'undefined' && !window.confirm('Delete this form?')) return
    if (form.file_path) await supabase.storage.from('forms').remove([form.file_path])
    await supabase.from('listing_forms').delete().eq('id', form.id)
    load()
  }

  const t = dark ? {
    label: 'block text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-[#7a8599]',
    input: 'w-full px-3 py-2 text-sm rounded-md bg-[#0c0f14] border border-[#1e2530] text-[#e8ecf2] outline-none',
    fileText: 'text-[#7a8599]',
    item: 'flex items-center justify-between gap-2 py-2 border-b border-[#1e2530] last:border-0',
    itemName: 'text-sm text-[#e8ecf2] truncate',
    dl: 'text-xs font-semibold text-[#60a5fa] hover:underline',
    del: 'text-xs text-[#f87171] hover:underline',
    btn: 'px-3 py-2 rounded-md text-xs font-semibold bg-[#3b82f6] text-white disabled:opacity-50 shrink-0',
    muted: 'text-xs text-[#7a8599]',
    errCls: 'text-xs text-[#f87171] mt-2',
  } : {
    label: 'block text-[11px] font-semibold uppercase tracking-wider mb-1.5 text-gray-500',
    input: 'w-full px-3 py-2 text-sm rounded-lg bg-white border border-gray-300 text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10',
    fileText: 'text-gray-500',
    item: 'flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0',
    itemName: 'text-sm text-gray-900 truncate',
    dl: 'text-xs font-semibold text-brand hover:underline',
    del: 'text-xs text-red-600 hover:underline',
    btn: 'px-3 py-2 rounded-lg text-xs font-semibold bg-brand text-white disabled:opacity-50 shrink-0',
    muted: 'text-xs text-gray-400',
    errCls: 'text-xs text-red-600 mt-2',
  }

  return (
    <div>
      {forms.length > 0 ? (
        <div className="mb-3">
          {forms.map(f => (
            <div key={f.id} className={t.item}>
              <div className="min-w-0 flex items-center gap-2">
                <span className={t.muted}>📄</span>
                <span className={t.itemName}>{f.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {f.file_url && <a href={f.file_url} target="_blank" rel="noopener noreferrer" className={t.dl}>Download</a>}
                <button onClick={() => remove(f)} className={t.del}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      ) : <p className={t.muted + ' mb-3'}>No forms uploaded yet.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
        <div>
          <label className={t.label}>Form name</label>
          <input className={t.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. New Patient Referral Form" />
          <div className="mt-2">
            <input key={nonce} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files?.[0] || null)} className={'text-xs ' + t.fileText} />
          </div>
        </div>
        <button onClick={upload} disabled={busy || !file || !name.trim()} className={t.btn}>{busy ? 'Uploading…' : 'Upload'}</button>
      </div>
      {err && <p className={t.errCls}>{err}</p>}
    </div>
  )
}

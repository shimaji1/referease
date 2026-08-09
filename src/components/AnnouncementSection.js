'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { can } from '@/lib/plan'
import { fetchMyAnnouncement, submitAnnouncement, deleteAnnouncement, TEMPLATES, DEFAULT_STYLE, mergeStyle } from '@/lib/announcements'
import AnnouncementToolbar from './AnnouncementToolbar'
import AnnouncementSlide from './AnnouncementSlide'
import ConfirmModal from './ConfirmModal'

const inp = "w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"
const card = "bg-white border border-gray-200 rounded-xl p-6"
const label = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5"

const STATUS_COPY = {
  pending: { text: 'Pending review — our team checks new submissions within a couple of days.', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  approved: { text: 'Live on the homepage carousel.', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  rejected: { text: 'Not approved — see the note below and resubmit.', cls: 'text-red-700 bg-red-50 border-red-200' },
}

export default function AnnouncementSection({ providers, user }) {
  const featured = providers.filter(p => p.owner_id === user.id && can(p, 'featured_slot'))
  const [selected, setSelected] = useState(featured[0]?.id || null)
  const [existing, setExisting] = useState(null)
  const [form, setForm] = useState({ template: 'image-left', headline: '', subheadline: '', body: '', image_url: '', image_path: '', logo_url: '', logo_path: '', cta_label: '', cta_url: '', style: DEFAULT_STYLE })
  const [uploading, setUploading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [selectedEl, setSelectedEl] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!selected) return
    const row = await fetchMyAnnouncement(selected)
    setExisting(row)
    if (row) setForm({ template: row.template, headline: row.headline || '', subheadline: row.subheadline || '', body: row.body || '', image_url: row.image_url || '', image_path: row.image_path || '', logo_url: row.logo_url || '', logo_path: row.logo_path || '', cta_label: row.cta_label || '', cta_url: row.cta_url || '', style: mergeStyle(row.style) })
  }, [selected])

  useEffect(() => { load() }, [load])

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const uploadImage = async (file) => {
    if (!file || !supabase) return
    setUploading(true)
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `announcements/${selected}-${Date.now()}-${safe}`
    const { error: upErr } = await supabase.storage.from('forms').upload(path, file)
    if (upErr) { setMsg('Error: ' + upErr.message); setUploading(false); return }
    const { data: pub } = supabase.storage.from('forms').getPublicUrl(path)
    set('image_url', pub?.publicUrl || ''); set('image_path', path)
    setUploading(false)
  }

  const uploadLogo = async (file) => {
    if (!file || !supabase) return
    setUploadingLogo(true)
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `announcements/logo-${selected}-${Date.now()}-${safe}`
    const { error: upErr } = await supabase.storage.from('forms').upload(path, file)
    if (upErr) { setMsg('Error: ' + upErr.message); setUploadingLogo(false); return }
    const { data: pub } = supabase.storage.from('forms').getPublicUrl(path)
    set('logo_url', pub?.publicUrl || ''); set('logo_path', path)
    setUploadingLogo(false)
  }

  const submit = async () => {
    setMsg('')
    if (!form.headline.trim()) { setMsg('Error: Add a headline'); return }
    setSaving(true)
    const res = await submitAnnouncement(selected, form)
    setSaving(false)
    if (res.error) { setMsg('Error: ' + res.error); return }
    setMsg('Submitted for review!')
    load()
  }

  const removeAnnouncement = async () => {
    setDeleting(true)
    await deleteAnnouncement(existing.id)
    setDeleting(false)
    setConfirmingDelete(false)
    setExisting(null)
    setForm({ template: 'image-left', headline: '', subheadline: '', body: '', image_url: '', image_path: '', logo_url: '', logo_path: '', cta_label: '', cta_url: '', style: DEFAULT_STYLE })
    setMsg('Announcement deleted')
  }

  if (!featured.length) return (
    <div className={card}><h2 className="text-sm font-bold text-gray-900 mb-2">Homepage Announcement</h2><p className="text-sm text-gray-500">This is a Featured-plan feature. <Link href="/pricing" className="text-brand font-semibold hover:underline">See plans →</Link></p></div>
  )

  const status = existing && STATUS_COPY[existing.status]

  return (
    <div className={card}>
      <h2 className="text-sm font-bold text-gray-900 mb-1">Homepage Announcement</h2>
      <p className="text-xs text-gray-500 mb-4">One rotating spot in the homepage carousel. Submissions go through a quick review before going live.</p>

      <div className="mb-4">
        <AnnouncementToolbar style={form.style} onChange={v => set('style', v)} selected={selectedEl} showImage={form.template !== 'text-card'} template={form.template} />
        <label className={label + ' mt-3 block'}>Click any element below to select and style it</label>
        <div className="relative h-56 rounded-2xl overflow-hidden" onClick={() => setSelectedEl(null)}>
          <AnnouncementSlide item={{ ...form, providers: null }} editable selectedKey={selectedEl} onSelect={setSelectedEl} />
        </div>
      </div>

      {featured.length > 1 && (
        <div className="mb-4">
          <label className={label}>Listing</label>
          <select className={inp} value={selected || ''} onChange={e => setSelected(Number(e.target.value))}>
            {featured.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {status && (
        <div className={`text-xs font-medium px-3 py-2 rounded-lg border mb-4 ${status.cls}`}>
          {status.text}
          {existing.status === 'rejected' && existing.admin_notes && <div className="mt-1 italic">"{existing.admin_notes}"</div>}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className={label}>Template</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {TEMPLATES.map(t => (
              <button key={t.key} type="button" onClick={() => set('template', t.key)}
                className={`text-left p-3 rounded-lg border transition ${form.template === t.key ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="text-xs font-bold text-gray-900">{t.label}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{t.description}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>Headline (H1) *</label>
          <input className={inp} value={form.headline} onChange={e => set('headline', e.target.value)} onFocus={() => setSelectedEl('headline')} placeholder="Now accepting new patients" maxLength={60} />
        </div>
        <div>
          <label className={label}>Subheading (H2)</label>
          <input className={inp} value={form.subheadline} onChange={e => set('subheadline', e.target.value)} onFocus={() => setSelectedEl('subheadline')} placeholder="Optional secondary line" maxLength={80} />
        </div>
        <div>
          <label className={label}>Paragraph</label>
          <textarea className={inp + ' min-h-[70px] resize-y'} value={form.body} onChange={e => set('body', e.target.value)} onFocus={() => setSelectedEl('body')} placeholder="Short supporting line" maxLength={160} />
        </div>
        <div>
          <label className={label}>Logo</label>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 border border-gray-300 cursor-pointer hover:bg-gray-200 transition">
              {uploadingLogo ? 'Uploading…' : form.logo_url ? 'Change logo' : '📎 Choose logo'}
              <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => uploadLogo(e.target.files?.[0])} className="hidden" disabled={uploadingLogo} />
            </label>
            {form.logo_url && <img src={form.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain border border-gray-200 bg-white" />}
            {form.logo_url && <button type="button" onClick={() => { set('logo_url', ''); set('logo_path', '') }} className="text-[11px] text-gray-400 hover:text-gray-600">Remove</button>}
          </div>
        </div>
        {form.template !== 'text-card' && (
          <div>
            <label className={label}>Picture</label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 border border-gray-300 cursor-pointer hover:bg-gray-200 transition">
                {uploading ? 'Uploading…' : form.image_url ? 'Change image' : '📎 Choose image'}
                <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => uploadImage(e.target.files?.[0])} className="hidden" disabled={uploading} />
              </label>
              {form.image_url && <img src={form.image_url} alt="" className="h-10 w-10 rounded-lg object-cover border border-gray-200" />}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Button text</label>
            <input className={inp} value={form.cta_label} onChange={e => set('cta_label', e.target.value)} onFocus={() => setSelectedEl('button')} placeholder="Book now" />
          </div>
          <div>
            <label className={label}>Button link</label>
            <input className={inp} value={form.cta_url} onChange={e => set('cta_url', e.target.value)} onFocus={() => setSelectedEl('button')} placeholder="/search?id=..." />
          </div>
        </div>
      </div>

      {msg && <p className={`text-sm mt-3 ${msg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</p>}

      <div className="flex items-center gap-3 mt-4">
        <button onClick={submit} disabled={saving || uploading} className="px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50">
          {saving ? 'Submitting…' : existing ? 'Resubmit for review' : 'Submit for review'}
        </button>
        {existing && (
          <button onClick={() => setConfirmingDelete(true)} disabled={saving || deleting} className="px-5 py-2.5 text-red-600 text-sm font-semibold rounded-xl border border-red-200 hover:bg-red-50 transition disabled:opacity-50">
            Delete announcement
          </button>
        )}
      </div>

      <ConfirmModal
        open={confirmingDelete}
        title="Delete this announcement?"
        message="This removes it from the homepage carousel (if live) and clears your submission. You can always create a new one."
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={removeAnnouncement}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  )
}

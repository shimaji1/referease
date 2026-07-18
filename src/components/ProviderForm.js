'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const CATS = [
  { key: 'specialist', label: 'Specialist' },
  { key: 'clinic', label: 'Clinic' },
  { key: 'hospital', label: 'Hospital' },
  { key: 'imaging', label: 'Imaging Centre' },
  { key: 'lab', label: 'Laboratory' },
  { key: 'rehab', label: 'Rehab / Physio' },
]
const DAYS = ['mon','tue','wed','thu','fri','sat','sun']
const DAY_LABELS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export default function ProviderForm({ initial, onSubmit, loading, submitLabel }) {
  const empty = {
    name: '', type: '', specialty_code: '', category: 'specialist', services: [], address: '', phone: '', fax: '', website: '',
    rating: '', reviews: 0, lat: '', lng: '', hours: { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null },
    accepting_referrals: true, wait_weeks: '', requirements: '', doctors: [], languages: ['English'],
    paid_referral: false, paid_referral_details: '',
  }
  const [form, setForm] = useState(initial || empty)
  const [specialties, setSpecialties] = useState([])
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  // Load SNOMED specialties from reference table
  useEffect(() => {
    if (!supabase) return
    supabase.from('specialties').select('*').order('category_order').order('name').then(({ data }) => {
      if (data) setSpecialties(data)
    })
  }, [])

  // Group specialties by category
  const grouped = useMemo(() => {
    const groups = {}
    specialties.forEach(s => {
      if (!groups[s.category]) groups[s.category] = []
      groups[s.category].push(s)
    })
    return groups
  }, [specialties])

  const handleSpecialtyChange = (code) => {
    const spec = specialties.find(s => s.snomed_code === code)
    if (spec) {
      set('specialty_code', code)
      set('type', spec.name)
      // Auto-set category based on specialty
      if (['Diagnostics and imaging'].includes(spec.category)) set('category', 'imaging')
      else if (['Rehab and pain'].includes(spec.category)) set('category', 'rehab')
      else if (['Primary and emergency'].includes(spec.category)) set('category', 'clinic')
      else if (spec.category === 'Surgical specialties') set('category', 'specialist')
      else set('category', 'specialist')
    } else {
      set('specialty_code', '')
    }
  }

  const inp = "w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"
  const lbl = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5"

  const handleSubmit = () => {
    if (!form.name || !form.type) return
    const data = {
      ...form,
      rating: form.rating ? parseFloat(form.rating) : null,
      reviews: parseInt(form.reviews) || 0,
      lat: parseFloat(form.lat) || 0,
      lng: parseFloat(form.lng) || 0,
      wait_weeks: form.wait_weeks !== '' && form.wait_weeks !== null ? parseInt(form.wait_weeks) : null,
    }
    delete data.id; delete data.created_at; delete data.updated_at; delete data.owner_id
    onSubmit(data)
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={lbl}>Practice / Clinic Name *</label>
            <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. York Dermatology Clinic" />
          </div>
          <div>
            <label className={lbl}>Specialty (SNOMED CT) *</label>
            <select className={inp} value={form.specialty_code || ''} onChange={e => handleSpecialtyChange(e.target.value)}>
              <option value="">Select a specialty...</option>
              {Object.entries(grouped).map(([cat, specs]) => (
                <optgroup key={cat} label={cat}>
                  {specs.map(s => (
                    <option key={s.snomed_code} value={s.snomed_code}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {form.specialty_code && (
              <p className="text-[10px] text-gray-400 mt-1">SNOMED CT: {form.specialty_code} — {form.type}</p>
            )}
          </div>
          <div>
            <label className={lbl}>Category *</label>
            <select className={inp} value={form.category} onChange={e => set('category', e.target.value)}>
              {CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Custom specialty label (optional)</label>
            <input className={inp} value={form.type} onChange={e => set('type', e.target.value)} placeholder="Override the SNOMED name if needed, e.g. 'Foot & Ankle Orthopedics'" />
            <p className="text-[10px] text-gray-400 mt-1">Pre-filled from SNOMED selection. Edit only if you need a more specific label.</p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Contact & Location</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={lbl}>Address</label>
            <input className={inp} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address including postal code" />
          </div>
          <div>
            <label className={lbl}>Phone</label>
            <input className={inp} value={form.phone || ''} onChange={e => set('phone', e.target.value || null)} placeholder="905-555-0123" />
          </div>
          <div>
            <label className={lbl}>Fax</label>
            <input className={inp} value={form.fax || ''} onChange={e => set('fax', e.target.value || null)} placeholder="905-555-0124" />
          </div>
          <div>
            <label className={lbl}>Website</label>
            <input className={inp} value={form.website || ''} onChange={e => set('website', e.target.value || null)} placeholder="www.yourclinic.ca" />
          </div>
          <div>
            <label className={lbl}>Languages (comma-separated)</label>
            <input className={inp} value={(form.languages || []).join(', ')} onChange={e => set('languages', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} placeholder="English, French, Farsi" />
          </div>
          <div>
            <label className={lbl}>Latitude</label>
            <input className={inp} type="number" step="0.0001" value={form.lat || ''} onChange={e => set('lat', e.target.value)} placeholder="43.8100" />
          </div>
          <div>
            <label className={lbl}>Longitude</label>
            <input className={inp} type="number" step="0.0001" value={form.lng || ''} onChange={e => set('lng', e.target.value)} placeholder="-79.4300" />
          </div>
        </div>
      </section>

      {/* Referral Info */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Referral Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Accepting Referrals</label>
            <select className={inp} value={form.accepting_referrals ? 'true' : 'false'} onChange={e => set('accepting_referrals', e.target.value === 'true')}>
              <option value="true">Yes — Accepting</option>
              <option value="false">No — Not Accepting</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Wait Time (weeks)</label>
            <input className={inp} type="number" min="0" value={form.wait_weeks ?? ''} onChange={e => set('wait_weeks', e.target.value)} placeholder="Leave blank if varies" />
          </div>
          <div>
            <label className={lbl}>Rating (0-5)</label>
            <input className={inp} type="number" step="0.1" min="0" max="5" value={form.rating || ''} onChange={e => set('rating', e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <label className={lbl}>Referral Requirements</label>
          <textarea className={inp + " min-h-[80px] resize-y"} value={form.requirements} onChange={e => set('requirements', e.target.value)} placeholder="e.g. GP referral required, recent MRI results, OHIP card" />
        </div>
      </section>

      {/* Paid Referral */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Paid Referral Program</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Offers Paid Referrals</label>
            <select className={inp} value={form.paid_referral ? 'true' : 'false'} onChange={e => set('paid_referral', e.target.value === 'true')}>
              <option value="false">No</option>
              <option value="true">Yes — Pays for referrals</option>
            </select>
          </div>
          {form.paid_referral && (
            <div>
              <label className={lbl}>Program Details</label>
              <input className={inp} value={form.paid_referral_details || ''} onChange={e => set('paid_referral_details', e.target.value || null)} placeholder="e.g. $50 per accepted referral" />
            </div>
          )}
        </div>
      </section>

      {/* Services & Doctors */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Services & Physicians</h3>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Services Offered (comma-separated)</label>
            <textarea className={inp + " min-h-[60px] resize-y"} value={(form.services || []).join(', ')} onChange={e => set('services', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} placeholder="ECG, Echocardiogram, Stress Test, Holter Monitor" />
          </div>
          <div>
            <label className={lbl}>Physicians (comma-separated)</label>
            <textarea className={inp + " min-h-[60px] resize-y"} value={(form.doctors || []).join(', ')} onChange={e => set('doctors', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} placeholder="Dr. Smith, Dr. Jones (Cardiology), Dr. Lee" />
          </div>
        </div>
      </section>

      {/* Hours */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Hours of Operation</h3>
        <p className="text-xs text-gray-500 mb-3">Enter hours as start-end (e.g. 9:00-17:00). Leave blank for closed days.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {DAYS.map((d, i) => (
            <div key={d}>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{DAY_LABELS[i].slice(0, 3)}</label>
              <input className="w-full px-2 py-2 text-xs bg-white border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-brand placeholder:text-gray-300"
                value={form.hours?.[d] || ''} onChange={e => set('hours', { ...form.hours, [d]: e.target.value || null })} placeholder="9:00-17:00" />
            </div>
          ))}
        </div>
      </section>

      {/* Submit */}
      <div className="flex gap-3">
        <button onClick={handleSubmit} disabled={loading || !form.name || !form.type}
          className="px-6 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 text-sm">
          {loading ? 'Saving...' : submitLabel || 'Save'}
        </button>
        <Link href="/dashboard" className="px-6 py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition text-sm">Cancel</Link>
      </div>
    </div>
  )
}

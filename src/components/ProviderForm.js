'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { limit as planLimit } from '@/lib/plan'

const CATS = [
  { key: 'Family Medicine', label: 'Family Medicine' },
  { key: 'Clinic', label: 'Clinic' },
  { key: 'Specialist', label: 'Specialist' },
  { key: 'Hospital', label: 'Hospital' },
  { key: 'Imaging', label: 'Imaging Centre' },
  { key: 'Lab', label: 'Laboratory' },
  { key: 'Physiotherapy', label: 'Physiotherapy' },
  { key: 'Rehab', label: 'Rehab' },
]
const DAYS = ['mon','tue','wed','thu','fri','sat','sun']
const DAY_LABELS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const DOC_CATS_SET = new Set(['Family Medicine', 'Specialist'])

function parseList(value) {
  if (!value) return []
  return value.split(/,/).map(x => x.trim()).filter(Boolean)
}
function joinList(arr) {
  if (!arr || !arr.length) return ''
  return arr.join(', ')
}

export default function ProviderForm({ initial, onSubmit, loading, submitLabel }) {
  const empty = {
    name: '', type: '', specialty_code: '', category: 'Specialist', services: [], address: '', phone: '', fax: '', email: '', website: '',
    rating: '', reviews: 0, hours: { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null },
    accepting_referrals: true, wait_weeks: '', requirements: '', doctors: [], languages: ['English'],
    paid_referral: false, paid_referral_details: '', data_status: 'complete',
  }
  const [form, setForm] = useState(initial || empty)
  const [specialties, setSpecialties] = useState([])
  const [doctorRows, setDoctorRows] = useState(initial?._doctors || [])
  const addDoctorRow = () => setDoctorRows(rows => [...rows, { name: '', specialty: form.type || '', specialty_code: form.specialty_code || '', gender: '', accepting_referrals: null }])
  const updDoctorRow = (i, patch) => setDoctorRows(rows => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const rmDoctorRow = (i) => setDoctorRows(rows => rows.filter((_, idx) => idx !== i))
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('')
  const [doctorSearchResults, setDoctorSearchResults] = useState([])
  const searchExistingDoctors = async (q) => {
    setDoctorSearchQuery(q)
    if (!supabase || q.trim().length < 2) { setDoctorSearchResults([]); return }
    const { data } = await supabase.from('providers').select('id, name, type, clinic_provider_id').in('category', ['Specialist', 'Family Medicine']).ilike('name', `%${q.trim()}%`).limit(8)
    setDoctorSearchResults((data || []).filter(d => !doctorRows.some(r => r.id === d.id)))
  }
  const linkExistingDoctorRow = (d) => {
    setDoctorRows(rows => rows.some(r => r.id === d.id) ? rows : [...rows, { id: d.id, name: d.name, specialty: d.type || '', specialty_code: '', gender: '', accepting_referrals: null }])
    setDoctorSearchQuery(''); setDoctorSearchResults([])
  }
  // Link this listing itself to other clinics/locations (works for any category — a doctor, a lab,
  // an imaging centre, anyone can be based at, or additionally listed under, another provider).
  const MAX_LINKED_CLINICS = planLimit(initial, 'max_locations') || 1
  const [linkedClinics, setLinkedClinics] = useState(initial?._locations || [])
  const [clinicLinkQuery, setClinicLinkQuery] = useState('')
  const [clinicLinkResults, setClinicLinkResults] = useState([])
  const searchLinkableClinics = async (q) => {
    setClinicLinkQuery(q)
    if (!supabase || q.trim().length < 2) { setClinicLinkResults([]); return }
    const { data } = await supabase.from('providers').select('id, name, type, address, phone, fax').ilike('name', `%${q.trim()}%`).limit(8)
    setClinicLinkResults((data || []).filter(c => c.id !== initial?.id && !linkedClinics.some(l => l.id === c.id)))
  }
  const linkClinic = (c) => {
    if (linkedClinics.length >= MAX_LINKED_CLINICS) return
    setLinkedClinics(l => l.some(x => x.id === c.id) ? l : [...l, c])
    setClinicLinkQuery(''); setClinicLinkResults([])
  }
  const unlinkClinic = (id) => setLinkedClinics(l => l.filter(c => c.id !== id))
  const [servicesText, setServicesText] = useState(joinList(initial?.services))
  const [doctorsText, setDoctorsText] = useState(joinList(initial?.doctors))
  const [languagesText, setLanguagesText] = useState(joinList(initial?.languages || ['English']))
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  useEffect(() => {
    if (!supabase) return
    supabase.from('specialties').select('*').order('category_order').order('name').then(({ data }) => {
      if (data) setSpecialties(data)
    })
  }, [])

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
      if (['Diagnostics and imaging'].includes(spec.category)) set('category', 'Imaging')
      else if (spec.name === 'Physiotherapy') set('category', 'Physiotherapy')
      else if (['Rehab and pain'].includes(spec.category)) set('category', 'Rehab')
      else if (['Primary and emergency'].includes(spec.category)) set('category', 'Family Medicine')
      else set('category', 'Specialist')
    } else {
      set('specialty_code', '')
    }
  }

  const inp = "w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"
  const lbl = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5"

  const handleSubmit = () => {
    if (!form.name || !form.type) return
    const validDocs = doctorRows.filter(r => r.name && r.name.trim()).map(r => ({ ...r, name: r.name.trim() }))
    const data = {
      ...form,
      services: parseList(servicesText),
      doctors: validDocs.length > 0 ? validDocs.map(r => r.specialty ? `${r.name}, ${r.specialty}` : r.name) : parseList(doctorsText),
      languages: parseList(languagesText),
      rating: form.rating ? parseFloat(form.rating) : null,
      reviews: parseInt(form.reviews) || 0,
      wait_weeks: form.wait_weeks !== '' && form.wait_weeks !== null ? parseInt(form.wait_weeks) : null,
      email: form.email || null,
      _doctors: validDocs,
      _locations: linkedClinics,
    }
    delete data.id; delete data.created_at; delete data.updated_at; delete data.owner_id
    onSubmit(data)
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={lbl}>{DOC_CATS_SET.has(form.category) ? 'Full Name *' : 'Practice / Clinic Name *'}</label>
            <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder={DOC_CATS_SET.has(form.category) ? 'Dr. Jane Smith (include title: Dr., NP, PA, etc.)' : 'e.g. York Dermatology Clinic'} />
          </div>
          <div>
            <label className={lbl}>Specialty (SNOMED CT) *</label>
            <select className={inp} value={form.specialty_code || ''} onChange={e => handleSpecialtyChange(e.target.value)}>
              <option value="">Select a specialty...</option>
              {Object.entries(grouped).map(([cat, specs]) => (
                <optgroup key={cat} label={cat}>
                  {specs.map(s => <option key={s.snomed_code} value={s.snomed_code}>{s.name}</option>)}
                </optgroup>
              ))}
            </select>
            {form.specialty_code && <p className="text-[10px] text-gray-400 mt-1">SNOMED CT: {form.specialty_code}</p>}
          </div>
          <div>
            <label className={lbl}>Category *</label>
            <select className={inp} value={form.category} onChange={e => set('category', e.target.value)}>
              {CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Custom specialty label (optional override)</label>
            <input className={inp} value={form.type} onChange={e => set('type', e.target.value)} placeholder="Pre-filled from SNOMED. Edit only if needed." />
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Contact & Location</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={lbl}>Address</label>
            <input className={inp} value={form.address || ''} onChange={e => set('address', e.target.value)} placeholder="Full address including postal code" />
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
            <label className={lbl}>Email</label>
            <input className={inp} type="email" value={form.email || ''} onChange={e => set('email', e.target.value || null)} placeholder="referrals@yourclinic.ca" />
          </div>
          <div>
            <label className={lbl}>Website</label>
            <input className={inp} value={form.website || ''} onChange={e => set('website', e.target.value || null)} placeholder="www.yourclinic.ca" />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Languages</label>
            <input className={inp} value={languagesText} onChange={e => setLanguagesText(e.target.value)} placeholder="English, French, Farsi" />
            <p className="text-[10px] text-gray-400 mt-1">Separate with commas</p>
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Referral Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Accepting Referrals / New Patients</label>
            <select className={inp} value={form.accepting_referrals == null ? 'unknown' : form.accepting_referrals ? 'true' : 'false'} onChange={e => { const v = e.target.value === 'unknown' ? null : e.target.value === 'true'; setForm(prev => ({ ...prev, accepting_referrals: v, accepting_new_patients: v })) }}>
              <option value="unknown">Unknown</option>
              <option value="true">Accepting</option>
              <option value="false">Not accepting</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Wait Time (weeks)</label>
            <input className={inp} type="number" min="0" value={form.wait_weeks ?? ''} onChange={e => set('wait_weeks', e.target.value)} placeholder="Leave blank if varies" />
          </div>
          <div>
            <label className={lbl}>Gender (for individual doctors)</label>
            <select className={inp} value={form.gender || ''} onChange={e => set('gender', e.target.value)}>
              <option value="">,</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Sub-specialty (optional)</label>
            <input className={inp} value={form.sub_specialty || ''} onChange={e => set('sub_specialty', e.target.value)} placeholder="e.g. Interventional Cardiology" />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>CPSO Profile Link (for doctors)</label>
            <input className={inp} value={form.cpso_url || ''} onChange={e => set('cpso_url', e.target.value)} placeholder="https://doctors.cpso.on.ca/DoctorDetails/..." />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Data Status</label>
            <select className={inp} value={form.data_status || 'complete'} onChange={e => set('data_status', e.target.value)}>
              <option value="complete">Complete, visible in public search</option>
              <option value="incomplete">Incomplete, hidden until completed</option>
            </select>
            <p className="text-[11px] text-gray-500 mt-1">Only "Complete" listings appear in the public search.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4">
          <div>
            <label className={lbl}>Referral Requirements</label>
            <textarea className={inp + " min-h-[80px] resize-y"} value={form.requirements || ''} onChange={e => set('requirements', e.target.value)} placeholder="e.g. GP referral required, recent MRI results, OHIP card" />
          </div>
          <div>
            <label className={lbl}>Referral Criteria (what you accept)</label>
            <textarea className={inp + " min-h-[80px] resize-y"} value={form.criteria || ''} onChange={e => set('criteria', e.target.value)} placeholder="Patient population, conditions, age range, etc." />
          </div>
          <div>
            <label className={lbl}>Referral Types (comma-separated)</label>
            <input className={inp} value={(form.referral_types || []).join(', ')} onChange={e => set('referral_types', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} placeholder="Consultation, Procedure, Follow-up" />
          </div>
          <div>
            <label className={lbl}>Notes to referring physicians</label>
            <textarea className={inp + " min-h-[80px] resize-y"} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Anything else referring doctors should know" />
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Services & Physicians</h3>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Services Offered</label>
            <textarea className={inp + " min-h-[60px] resize-y"} value={servicesText} onChange={e => setServicesText(e.target.value)} placeholder="ECG, Echocardiogram, Stress Test, Holter Monitor" />
            <p className="text-[10px] text-gray-400 mt-1">Separate with commas</p>
          </div>
          <div>
            <label className={lbl}>Doctors at this clinic</label>
            <p className="text-[10px] text-gray-400 mb-2">Each doctor gets their own searchable profile page, linked to this listing. Search to link a doctor who already exists, or add a new one below.</p>
            <div className="relative mb-3">
              <input className={inp} value={doctorSearchQuery} onChange={e => searchExistingDoctors(e.target.value)} placeholder="🔎 Search existing doctors to link…" />
              {doctorSearchResults.length > 0 && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {doctorSearchResults.map(d => (
                    <button key={d.id} type="button" onClick={() => linkExistingDoctorRow(d)} className="block w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50">
                      <div className="text-sm font-semibold text-gray-900">{d.name}</div>
                      {d.type && <div className="text-xs text-gray-500">{d.type}{d.clinic_provider_id ? ' · already has a primary clinic' : ''}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {doctorRows.map((r, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.2fr_0.7fr_0.9fr_auto] gap-2 mb-2 items-center">
                <div className="relative">
                  <input className={inp} placeholder="Dr. Full Name" value={r.name} onChange={e => updDoctorRow(i, { name: e.target.value })} disabled={!!r.id} />
                  {r.id && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-brand bg-brand/10 border border-brand/20 rounded-full px-1.5 py-0.5">LINKED</span>}
                </div>
                <select className={inp} value={r.specialty_code || ''} onChange={e => { const sp = specialties.find(x => x.snomed_code === e.target.value); updDoctorRow(i, sp ? { specialty_code: sp.snomed_code, specialty: sp.name } : { specialty_code: '', specialty: '' }) }}>
                  <option value="">Specialty…</option>
                  {Object.entries(grouped).map(([cat, specs]) => <optgroup key={cat} label={cat}>{specs.map(sp => <option key={sp.snomed_code} value={sp.snomed_code}>{sp.name}</option>)}</optgroup>)}
                </select>
                <select className={inp} value={r.gender || ''} onChange={e => updDoctorRow(i, { gender: e.target.value })}>
                  <option value="">Gender…</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
                </select>
                <select className={inp} value={r.accepting_referrals == null ? 'unknown' : r.accepting_referrals ? 'true' : 'false'} onChange={e => updDoctorRow(i, { accepting_referrals: e.target.value === 'unknown' ? null : e.target.value === 'true' })}>
                  <option value="unknown">Unknown</option><option value="true">Accepting</option><option value="false">Not accepting</option>
                </select>
                <button type="button" onClick={() => rmDoctorRow(i)} className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-100">✕</button>
              </div>
            ))}
            <button type="button" onClick={addDoctorRow} className="text-xs font-semibold text-brand bg-brand/5 border border-brand/15 px-4 py-2 rounded-lg hover:bg-brand/10 transition">+ Add doctor</button>
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Link to a Clinic</h3>
        <p className="text-xs text-gray-500 mb-3">Anyone — a doctor, a lab, an imaging centre — can be based at, or additionally listed under, another clinic. Search to link, up to {MAX_LINKED_CLINICS} location{MAX_LINKED_CLINICS === 1 ? '' : 's'}. Not linked to anyone? Just use the address above.</p>
        {linkedClinics.length >= MAX_LINKED_CLINICS && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">Your plan allows {MAX_LINKED_CLINICS} location{MAX_LINKED_CLINICS === 1 ? '' : 's'}. <Link href="/pricing" className="font-semibold underline">Upgrade for more →</Link></p>
        )}
        <div className="relative mb-3">
          <input className={inp} value={clinicLinkQuery} onChange={e => searchLinkableClinics(e.target.value)} placeholder={linkedClinics.length >= MAX_LINKED_CLINICS ? `Location limit reached (${MAX_LINKED_CLINICS})` : "🔎 Search clinics/providers to link…"} disabled={linkedClinics.length >= MAX_LINKED_CLINICS} />
          {clinicLinkResults.length > 0 && (
            <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
              {clinicLinkResults.map(c => (
                <button key={c.id} type="button" onClick={() => linkClinic(c)} className="block w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50">
                  <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                  {c.address && <div className="text-xs text-gray-500">{c.address}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
        {linkedClinics.length > 0 && (
          <div className="space-y-2">
            {linkedClinics.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between gap-2 border border-brand/20 bg-brand/5 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{c.name}{i === 0 ? <span className="ml-2 text-[9px] font-bold text-brand bg-white border border-brand/20 rounded-full px-1.5 py-0.5 align-middle">MAIN</span> : null}</div>
                  {c.address && <div className="text-xs text-gray-500 truncate">{c.address}</div>}
                </div>
                <button type="button" onClick={() => unlinkClinic(c.id)} className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 shrink-0">Unlink</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Hours of Operation</h3>
        <p className="text-xs text-gray-500 mb-3">Enter as start-end (e.g. 9:00-17:00). Leave blank for closed.</p>
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

'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const DAYS = ['mon','tue','wed','thu','fri','sat','sun']
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const withDr = (n) => { const t = (n || '').trim(); if (!t) return t; return /^dr\.?\s/i.test(t) ? t : 'Dr. ' + t }
const emptyDoc = () => ({ name:'Dr. ', specialty:'', specialty_code:'', gender:'', accepting_referrals:true, accepting_new_patients:false, wait_weeks:'', criteria:'', referral_types:'', languages:'English', hours:{ mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null } })

export default function NewPhysicianPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [doc, setDoc] = useState(emptyDoc())
  const [locations, setLocations] = useState([{ name:'', address:'', phone:'', fax:'' }])
  const [clinicQuery, setClinicQuery] = useState('')
  const [clinicResults, setClinicResults] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase.from('specialties').select('snomed_code, category, name').order('category_order').order('name').then(({ data }) => { if (data) setSpecialties(data) })
  }, [])

  const spin = <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (authLoading) return spin
  if (!user) { router.push('/login'); return null }

  const set = (k, v) => setDoc(f => ({ ...f, [k]: v }))
  const addLoc = () => setLocations(l => [...l, { name:'', address:'', phone:'', fax:'' }])
  const searchClinics = async (q) => {
    setClinicQuery(q)
    if (!supabase || q.trim().length < 2) { setClinicResults([]); return }
    const { data } = await supabase.from('providers').select('id, name, address, phone, fax').ilike('name', `%${q.trim()}%`).limit(8)
    setClinicResults(data || [])
  }
  const addClinicLoc = (c) => { setLocations(l => [...l, { provider_id: c.id, name: c.name, address: c.address, phone: c.phone, fax: c.fax }]); setClinicQuery(''); setClinicResults([]) }
  const updLoc = (i, patch) => setLocations(l => l.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const rmLoc = (i) => setLocations(l => l.filter((_, idx) => idx !== i))
  const inp = "w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"
  const lbl = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5"

  const grouped = {}
  specialties.forEach(sp => { if (!grouped[sp.category]) grouped[sp.category] = []; grouped[sp.category].push(sp) })

  const save = async () => {
    if (!supabase || !user) return
    const name = withDr(doc.name)
    if (!name || /^dr\.?\s*$/i.test(name)) { setMsg('Please enter your name'); return }
    setSaving(true); setMsg('')
    const rec = {
      name,
      specialty: doc.specialty || null,
      specialty_code: doc.specialty_code || null,
      gender: doc.gender || null,
      accepting_referrals: !!doc.accepting_referrals,
      accepting_new_patients: !!doc.accepting_new_patients,
      wait_weeks: (doc.wait_weeks !== '' && doc.wait_weeks !== null) ? parseInt(doc.wait_weeks) : null,
      criteria: doc.criteria || null,
      referral_types: doc.referral_types ? doc.referral_types.split(',').map(x => x.trim()).filter(Boolean) : null,
      languages: doc.languages ? doc.languages.split(',').map(x => x.trim()).filter(Boolean) : null,
      hours: doc.hours || null,
      cpso_number: profile?.cpso_number || null,
      status: 'active',
      owner_id: user.id,
    }
    const { data: created, error } = await supabase.from('physicians').insert(rec).select().single()
    if (error || !created) { setMsg('Error: ' + (error?.message || 'could not save')); setSaving(false); return }

    const locs = locations.filter(l => l.provider_id || (l.name||'').trim() || (l.address||'').trim() || (l.phone||'').trim() || (l.fax||'').trim())
    for (let i = 0; i < locs.length; i++) {
      const l = locs[i]
      let provId = l.provider_id
      if (!provId) {
        const prov = {
          name: (l.name||'').trim() || `${name} — Office`,
          type: doc.specialty || 'Physician office', category: 'Clinic',
          services: [], address: l.address || null, phone: l.phone || null, fax: l.fax || null,
          languages: rec.languages || ['English'], hours: { mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null },
          accepting_referrals: rec.accepting_referrals, wait_weeks: rec.wait_weeks,
          doctors: [name], data_status: 'partial', specialty_code: rec.specialty_code, owner_id: user.id,
        }
        const { data: pRow } = await supabase.from('providers').insert(prov).select().single()
        if (!pRow) continue
        provId = pRow.id
      }
      await supabase.from('physician_locations').insert({ physician_id: created.id, provider_id: provId, is_primary: i === 0 })
    }
    setSaving(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">R</span></div>
            <span className="text-lg font-bold text-gray-900">Refer<span className="text-[#2563eb]">Easy</span></span>
          </Link>
          <Link href="/dashboard" className="text-xs font-medium text-gray-500 hover:text-brand">← Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">List Yourself as a Doctor</h1>
        <p className="text-sm text-gray-500 mb-6">Create your own doctor profile so family doctors can find you and send well-matched referrals. You’ll own and manage it from your dashboard.</p>

        {msg && <div className="mb-4 p-3 rounded-xl text-sm font-medium border bg-red-50 text-red-700 border-red-200">{msg}</div>}

        <div className="space-y-6">
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">About You</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={lbl}>Full Name *</label>
                <input className={inp} value={doc.name} onChange={e => set('name', e.target.value)} placeholder="Dr. Jane Smith" />
              </div>
              <div>
                <label className={lbl}>Specialty *</label>
                <select className={inp} value={doc.specialty_code || ''} onChange={e => { const sp = specialties.find(x => x.snomed_code === e.target.value); if (sp) setDoc(f => ({ ...f, specialty_code: sp.snomed_code, specialty: sp.name })); else setDoc(f => ({ ...f, specialty_code: '', specialty: '' })) }}>
                  <option value="">Select specialty...</option>
                  {Object.entries(grouped).map(([cat, specs]) => <optgroup key={cat} label={cat}>{specs.map(sp => <option key={sp.snomed_code} value={sp.snomed_code}>{sp.name}</option>)}</optgroup>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Gender</label>
                <select className={inp} value={doc.gender || ''} onChange={e => set('gender', e.target.value)}>
                  <option value="">—</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={lbl}>Languages (comma-separated)</label>
                <input className={inp} value={doc.languages} onChange={e => set('languages', e.target.value)} placeholder="English, French, Farsi" />
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Referral Readiness</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Accepting Referrals</label>
                <select className={inp} value={doc.accepting_referrals ? 'true' : 'false'} onChange={e => set('accepting_referrals', e.target.value === 'true')}>
                  <option value="true">Yes — Accepting</option><option value="false">No — Not Accepting</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Accepting New Patients</label>
                <select className={inp} value={doc.accepting_new_patients ? 'true' : 'false'} onChange={e => set('accepting_new_patients', e.target.value === 'true')}>
                  <option value="false">No</option><option value="true">Yes</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Wait Time (weeks)</label>
                <input className={inp} type="number" min="0" value={doc.wait_weeks} onChange={e => set('wait_weeks', e.target.value)} placeholder="Leave blank if varies" />
              </div>
              <div>
                <label className={lbl}>Referral Types (comma-separated)</label>
                <input className={inp} value={doc.referral_types} onChange={e => set('referral_types', e.target.value)} placeholder="Consultation, Procedure, Follow-up" />
              </div>
              <div className="sm:col-span-2">
                <label className={lbl}>Referral Criteria</label>
                <textarea className={inp + ' min-h-[80px] resize-y'} value={doc.criteria} onChange={e => set('criteria', e.target.value)} placeholder="e.g. GP referral required, recent imaging, OHIP card" />
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Hours</h3>
            <p className="text-xs text-gray-500 mb-4">If you run your own practice, set your hours. Leave a day blank if closed.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DAYS.map((d, i) => (
                <div key={d}>
                  <label className={lbl}>{DAY_LABELS[i]}</label>
                  <input className={inp} value={doc.hours?.[d] || ''} onChange={e => setDoc(f => ({ ...f, hours: { ...f.hours, [d]: e.target.value || null } }))} placeholder="9:00-17:00" />
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Where You Practise</h3>
            <p className="text-xs text-gray-500 mb-4">Link an existing clinic to auto-fill its address, phone, fax and hours — or type a new location below.</p>

            <div className="relative mb-3">
              <input className={inp} value={clinicQuery} onChange={e => searchClinics(e.target.value)} placeholder="🔎 Search existing clinics to link…" />
              {clinicResults.length > 0 && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {clinicResults.map(c => (
                    <button key={c.id} onClick={() => addClinicLoc(c)} className="block w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50">
                      <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                      {c.address && <div className="text-xs text-gray-500">{c.address}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {locations.map((l, i) => (
              l.provider_id ? (
                <div key={i} className="border border-brand/20 bg-brand/5 rounded-lg p-3 mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{l.name} <span className="text-[9px] font-bold text-brand bg-white border border-brand/20 rounded-full px-2 py-0.5 ml-1">LINKED CLINIC</span></div>
                    {l.address && <div className="text-xs text-gray-500">{l.address}</div>}
                    <div className="text-xs text-gray-400">Address, phone, fax &amp; hours come from this clinic automatically.</div>
                  </div>
                  <button onClick={() => rmLoc(i)} className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-100 shrink-0">Unlink</button>
                </div>
              ) : (
                <div key={i} className="border border-gray-200 rounded-lg p-3 mb-3">
                  <div className="flex gap-2 items-center mb-2">
                    <input className={inp} value={l.name} onChange={e => updLoc(i, { name: e.target.value })} placeholder="Clinic / office name (e.g. Disera Medical Centre)" />
                    {locations.length > 1 && <button onClick={() => rmLoc(i)} className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-100 shrink-0">Remove</button>}
                  </div>
                  <input className={inp + ' mb-2'} value={l.address} onChange={e => updLoc(i, { address: e.target.value })} placeholder="Address" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input className={inp} value={l.phone} onChange={e => updLoc(i, { phone: e.target.value })} placeholder="Phone" />
                    <input className={inp} value={l.fax} onChange={e => updLoc(i, { fax: e.target.value })} placeholder="Fax" />
                  </div>
                </div>
              )
            ))}
            <button onClick={addLoc} className="text-xs font-semibold text-brand bg-brand/5 border border-brand/15 px-4 py-2 rounded-lg hover:bg-brand/10 transition">+ Add location manually</button>
          </section>

          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="px-6 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 text-sm">
              {saving ? 'Creating...' : 'Create My Profile'}
            </button>
            <Link href="/dashboard" className="px-6 py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition text-sm">Cancel</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

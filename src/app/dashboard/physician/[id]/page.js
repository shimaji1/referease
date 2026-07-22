'use client'
import { useState, useEffect, use } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import FormsManager from '@/components/FormsManager'

const DAYS = ['mon','tue','wed','thu','fri','sat','sun']
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function EditPhysicianPage({ params }) {
  const { id } = use(params)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [doc, setDoc] = useState(null)
  const [specialties, setSpecialties] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.from('specialties').select('snomed_code, category, name').order('category_order').order('name').then(({ data }) => { if (data) setSpecialties(data) })
  }, [])

  useEffect(() => {
    if (!supabase || !id || !user) return
    supabase.from('physicians').select('*').eq('id', id).single().then(({ data }) => {
      if (!data) { setLoading(false); return }
      if (data.owner_id && data.owner_id !== user.id) { setDenied(true); setLoading(false); return }
      setDoc({
        ...data,
        wait_weeks: data.wait_weeks ?? '',
        referral_types: (data.referral_types || []).join(', '),
        languages: (data.languages || []).join(', '),
        criteria: data.criteria || '',
        specialty: data.specialty || '',
        specialty_code: data.specialty_code || '',
        gender: data.gender || '',
        hours: data.hours || { mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null },
      })
      setLoading(false)
    })
  }, [id, user])

  const spin = <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (authLoading || loading) return spin
  if (!user) { router.push('/login'); return null }
  if (denied) return <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 text-gray-500 text-sm"><p>You don’t manage this profile.</p><Link href="/dashboard" className="text-brand font-medium hover:underline">← Back to dashboard</Link></div>
  if (!doc) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Profile not found.</div>

  const set = (k, v) => setDoc(f => ({ ...f, [k]: v }))
  const inp = "w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"
  const lbl = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5"

  const grouped = {}
  specialties.forEach(sp => { if (!grouped[sp.category]) grouped[sp.category] = []; grouped[sp.category].push(sp) })

  const save = async () => {
    if (!supabase) return
    setSaving(true)
    const payload = {
      name: doc.name,
      specialty: doc.specialty || null,
      specialty_code: doc.specialty_code || null,
      gender: doc.gender || null,
      accepting_referrals: doc.accepting_referrals ?? null,
      accepting_new_patients: doc.accepting_new_patients ?? null,
      wait_weeks: (doc.wait_weeks !== '' && doc.wait_weeks !== null) ? parseInt(doc.wait_weeks) : null,
      criteria: doc.criteria || null,
      referral_types: doc.referral_types ? doc.referral_types.split(',').map(x => x.trim()).filter(Boolean) : null,
      languages: doc.languages ? doc.languages.split(',').map(x => x.trim()).filter(Boolean) : null,
      hours: doc.hours || null,
    }
    const { error } = await supabase.from('physicians').update(payload).eq('id', id)
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">R</span></div>
            <span className="text-lg font-bold text-gray-900">Refer<span className="text-brand">Easy</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href={`/doctors/${id}`} className="text-xs font-medium text-gray-500 hover:text-brand border border-gray-200 px-3 py-1.5 rounded-lg">View public page</Link>
            <Link href="/dashboard" className="text-xs font-medium text-gray-500 hover:text-brand">← Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Edit My Profile</h1>
        <p className="text-sm text-gray-500 mb-6">Keep your referral status and details current so family doctors send you well-matched referrals.</p>

        <div className="space-y-6">
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">About You</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={lbl}>Full Name</label>
                <input className={inp} value={doc.name || ''} onChange={e => set('name', e.target.value)} placeholder="Dr. Jane Smith" />
              </div>
              <div>
                <label className={lbl}>Specialty</label>
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
                <select className={inp} value={doc.accepting_referrals == null ? 'unknown' : doc.accepting_referrals ? 'true' : 'false'} onChange={e => set('accepting_referrals', e.target.value === 'unknown' ? null : e.target.value === 'true')}>
                  <option value="unknown">Unknown</option><option value="true">Yes — Accepting</option><option value="false">No — Not Accepting</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Accepting New Patients</label>
                <select className={inp} value={doc.accepting_new_patients == null ? 'unknown' : doc.accepting_new_patients ? 'true' : 'false'} onChange={e => set('accepting_new_patients', e.target.value === 'unknown' ? null : e.target.value === 'true')}>
                  <option value="unknown">Unknown</option><option value="false">No</option><option value="true">Yes</option>
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
            <p className="text-xs text-gray-500 mb-4">If you run your own practice, set your hours (e.g. 9:00-17:00). Leave a day blank if closed.</p>
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
            <h3 className="text-sm font-bold text-gray-900 mb-1">Forms</h3>
            <p className="text-xs text-gray-500 mb-4">Upload referral or intake forms. They appear on your public profile for referring doctors to download.</p>
            <FormsManager physicianId={id} ownerId={user.id} />
          </section>

          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="px-6 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 text-sm">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href="/dashboard" className="px-6 py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition text-sm">Cancel</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

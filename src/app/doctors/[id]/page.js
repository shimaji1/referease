'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ProfileView from '@/components/ProfileView'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

const DAYS = ['mon','tue','wed','thu','fri','sat','sun']
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function WaitBadge({ weeks }) {
  if (weeks === null || weeks === undefined) return null
  const cls = weeks <= 3 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : weeks <= 8 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-700 bg-red-50 border-red-200'
  return <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cls}`}>~{weeks} wk wait</span>
}

function Pill({ ok, children }) {
  const cls = ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-600 bg-red-50 border-red-200'
  return <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cls}`}>{children}</span>
}


function isOpen(hours) {
  if (!hours) return false
  const d = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()]
  const span = hours[d]
  if (!span || typeof span !== 'string' || !span.includes('-')) return false
  const [a, b] = span.split('-')
  const toMin = t => { const [h, m] = t.trim().split(':').map(Number); return (h || 0) * 60 + (m || 0) }
  const now = new Date().getHours() * 60 + new Date().getMinutes()
  return now >= toMin(a) && now <= toMin(b)
}

export default function DoctorPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const [doc, setDoc] = useState(null)
  const [locs, setLocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [forms, setForms] = useState([])
  const [isFav, setIsFav] = useState(false)
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem('re-favs-docs') || '[]'); setIsFav(s.includes(id)) } catch {} }, [id])
  const toggleFav = () => { try { const s = JSON.parse(localStorage.getItem('re-favs-docs') || '[]'); const next = s.includes(id) ? s.filter(x => x !== id) : [...s, id]; localStorage.setItem('re-favs-docs', JSON.stringify(next)); setIsFav(next.includes(id)) } catch {} }

  useEffect(() => {
    let alive = true
    async function load() {
      if (!supabase || !id) { setLoading(false); return }
      const { data: d } = await supabase.from('physicians').select('*').eq('id', id).single()
      if (!alive) return
      if (!d) { setMissing(true); setLoading(false); return }
      setDoc(d)
      const { data: links } = await supabase.from('physician_locations').select('is_primary, name, address, phone, fax, hours, providers(*)').eq('physician_id', id)
      if (!alive) return
      { const arr = (links || []).filter(l => l.providers).sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)); const seen = new Set(); const uniq = arr.filter(l => { if (seen.has(l.providers.id)) return false; seen.add(l.providers.id); return true }); setLocs(uniq.map(l => ({ ...l, providers: { ...l.providers, name: l.name || l.providers.name, address: l.address || l.providers.address, phone: l.phone || l.providers.phone, fax: l.fax || l.providers.fax, hours: l.hours || l.providers.hours } }))) }
      const { data: fdata } = await supabase.from('listing_forms').select('*').eq('physician_id', id).order('created_at', { ascending: false })
      if (!alive) return
      setForms(fdata || [])
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [id])

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
  if (missing || !doc) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 text-gray-500 text-sm">
      <p>This doctor’s profile isn’t available.</p>
      <Link href="/search" className="text-brand font-medium hover:underline">← Back to search</Link>
    </div>
  )

  const isFamily = (doc.specialty || '').toLowerCase().includes('family')
  const primaryClinic = locs.find(l => l.is_primary)?.providers || locs[0]?.providers
  const googleRating = doc.rating || primaryClinic?.rating

  const docHours = (doc.hours && Object.values(doc.hours).some(v => v)) ? doc.hours : (primaryClinic?.hours || null)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-5 py-6">
        <Link href="/search" className="text-sm text-brand font-semibold mb-4 hover:underline inline-block">← Back to search</Link>
        <div className="mt-4" />
        <ProfileView
          name={doc.name}
          subtitle={`${doc.specialty || 'Physician'}${doc.sub_specialty ? ` · ${doc.sub_specialty}` : ''}${doc.category ? ` · ${doc.category}` : ''}`}
          verified={doc.verified}
          action={<button onClick={toggleFav} title={isFav ? 'Remove favourite' : 'Add to favourites'} className={`px-4 py-2 rounded-xl text-sm font-semibold border transition shrink-0 ${isFav ? 'bg-white text-brand border-white' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'}`}>{isFav ? '★ Saved' : '☆ Save'}</button>}
          tiles={[
            isFamily
              ? { big: doc.accepting_new_patients == null ? 'Unknown' : doc.accepting_new_patients ? 'Accepting' : 'Roster full', small: 'New patients', good: doc.accepting_new_patients }
              : { big: doc.accepting_referrals == null ? 'Unknown' : doc.accepting_referrals ? 'Accepting' : 'Not accepting', small: 'Referrals', good: doc.accepting_referrals },
            { big: doc.wait_weeks == null ? 'Varies' : doc.wait_weeks === 0 ? 'No wait' : `~${doc.wait_weeks} wk`, small: 'Wait time', color: doc.wait_weeks == null ? null : doc.wait_weeks <= 4 ? 'text-emerald-600' : doc.wait_weeks <= 12 ? 'text-amber-500' : 'text-red-500' },
            { big: locs.length === 0 ? 'Closed' : (isOpen(docHours) ? 'Open now' : 'Closed'), small: 'Right now', good: locs.length === 0 ? null : isOpen(docHours) },
            { big: (doc.languages && doc.languages.length) ? doc.languages[0] + (doc.languages.length > 1 ? ` +${doc.languages.length - 1}` : '') : 'English', small: 'Languages', good: null },
          ]}
          headerFooter={googleRating ? <div className="flex items-center gap-2 mt-3 justify-center"><span className="text-amber-500 font-semibold text-sm">★ {Number(googleRating).toFixed(1)}</span><span className="text-xs text-gray-400">Google rating</span></div> : null}
          banner={
            doc.owner_id && user && doc.owner_id === user.id ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm text-emerald-800 font-medium">You manage this profile.</span>
                <Link href={`/dashboard/physician/${doc.id}`} className="text-xs font-semibold text-white bg-brand px-3 py-1.5 rounded-lg hover:bg-brand-dark transition">Edit profile</Link>
              </div>
            ) : doc.owner_id ? null : (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm text-blue-900 font-medium">Is this you? Claim this profile to manage your availability and referral details.</span>
                  {!user
                    ? <Link href="/login" className="text-xs font-semibold text-white bg-brand px-4 py-2 rounded-lg hover:bg-brand-dark transition shrink-0">Sign in to claim</Link>
                    : primaryClinic
                      ? <Link href={`/dashboard/verify?provider_id=${primaryClinic.id}&physician_id=${doc.id}`} className="text-xs font-semibold text-white bg-brand px-4 py-2 rounded-lg hover:bg-brand-dark transition shrink-0">Claim this profile</Link>
                      : <span className="text-xs text-blue-700 font-medium">This doctor needs a clinic linked before it can be verified (the fax code is sent to the clinic's fax).</span>}
                </div>
              </div>
            )
          }
          contact={{ languages: doc.languages || ['English'] }}
          hours={docHours}
          referral={{
            wait: doc.wait_weeks == null ? 'Varies' : doc.wait_weeks === 0 ? 'No wait' : `~${doc.wait_weeks} week${doc.wait_weeks === 1 ? '' : 's'}`,
            criteria: doc.criteria, types: doc.referral_types, cpso_number: doc.cpso_number, cpso_url: doc.cpso_url,
          }}
          howToRefer={primaryClinic ? <>Send the referral to <span className="font-semibold text-gray-900">{primaryClinic.name}</span>{primaryClinic.fax ? <> by fax at <span className="font-semibold text-gray-900">{primaryClinic.fax}</span></> : primaryClinic.phone ? <> — call <span className="font-semibold text-gray-900">{primaryClinic.phone}</span></> : null}. Include the patient's OHIP number and reason for consult.</> : null}
          locations={locs.map(l => ({ id: l.providers.id, name: l.providers.name, address: l.providers.address, phone: l.providers.phone, fax: l.providers.fax, website: l.providers.website }))}
          forms={forms.map(f => ({ id: f.id, name: f.name, url: f.file_url }))}
        />
        <p className="text-[11px] text-gray-400 text-center mt-8 leading-relaxed">
          Wait times and referral criteria are provider-managed and may change.
        </p>
      </div>
    </div>
  )
}

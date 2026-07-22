'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ProfileHeader from '@/components/ProfileHeader'
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

  const Box = ({ title, children }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{title}</h4>
      {children}
    </div>
  )
  const Row = ({ l, v }) => (
    <div className="flex justify-between py-1 text-xs gap-2">
      <span className="text-gray-400 shrink-0">{l}</span>
      <span className="text-gray-900 font-medium text-right break-words">{v}</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-5 py-6">
        <Link href="/search" className="text-sm text-brand font-medium hover:underline">← Back to search</Link>
        <div className="mt-4" />

        <ProfileHeader
          name={doc.name}
          subtitle={`${doc.specialty || 'Physician'}${doc.sub_specialty ? ` · ${doc.sub_specialty}` : ''}${doc.gender ? ` · ${doc.gender[0].toUpperCase() + doc.gender.slice(1)}` : ''}`}
          verified={doc.verified}
          action={<button onClick={toggleFav} title={isFav ? 'Remove favourite' : 'Add to favourites'} className={`px-4 py-2 rounded-xl text-sm font-semibold border transition shrink-0 ${isFav ? 'bg-white text-brand border-white' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'}`}>{isFav ? '★ Saved' : '☆ Save'}</button>}
          tiles={[
            isFamily
              ? { big: doc.accepting_new_patients == null ? 'Unknown' : doc.accepting_new_patients ? 'Accepting' : 'Roster full', small: 'New patients', good: doc.accepting_new_patients }
              : { big: doc.accepting_referrals == null ? 'Unknown' : doc.accepting_referrals ? 'Accepting' : 'Not accepting', small: 'Referrals', good: doc.accepting_referrals },
            { big: doc.wait_weeks == null ? 'Varies' : doc.wait_weeks === 0 ? 'No wait' : `~${doc.wait_weeks} wk`, small: 'Wait time', color: doc.wait_weeks == null ? null : doc.wait_weeks <= 4 ? 'text-emerald-600' : doc.wait_weeks <= 12 ? 'text-amber-500' : 'text-red-500' },
            { big: (doc.languages && doc.languages.length) ? doc.languages[0] + (doc.languages.length > 1 ? ` +${doc.languages.length - 1}` : '') : 'English', small: 'Languages', good: null },
            { big: googleRating ? `★ ${Number(googleRating).toFixed(1)}` : '—', small: 'Rating', good: null },
          ]}
        />

        {/* Claim / manage */}
        {doc.owner_id && user && doc.owner_id === user.id ? (
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
        )}

        {/* Referral readiness */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Box title="Referral details">
            {doc.referral_types?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {doc.referral_types.map(t => <span key={t} className="text-[11px] text-brand bg-brand/5 border border-brand/10 px-2 py-0.5 rounded-md">{t}</span>)}
              </div>
            )}
            <Row l="Criteria" v={doc.criteria || '—'} />
            {!isFamily && <Row l="Wait" v={doc.wait_weeks == null ? 'Varies' : `~${doc.wait_weeks} week${doc.wait_weeks === 1 ? '' : 's'}`} />}
            {doc.cpso_number && <Row l="CPSO #" v={doc.cpso_number} />}
            {doc.cpso_url && <div className="flex justify-between py-1.5 text-sm gap-2"><span className="text-gray-400 shrink-0">CPSO</span><a href={doc.cpso_url} target="_blank" rel="noopener noreferrer" className="text-brand font-semibold hover:underline">View CPSO profile →</a></div>}
          </Box>

          {primaryClinic && (
            <Box title="How to refer">
              <p className="text-xs text-gray-600 leading-relaxed">
                Send the referral to <span className="font-medium text-gray-900">{primaryClinic.name}</span>
                {primaryClinic.fax ? <> by fax at <span className="font-medium text-gray-900">{primaryClinic.fax}</span></> : primaryClinic.phone ? <> — call <span className="font-medium text-gray-900">{primaryClinic.phone}</span></> : ''}.
                Include the patient’s OHIP number and reason for consult.
              </p>
            </Box>
          )}
        </div>

        {/* Doctor's own hours */}
        {doc.hours && DAYS.some(d => doc.hours[d]) && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Hours</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs">
              {DAYS.map((d, i) => (
                <div key={d} className="flex justify-between">
                  <span className="text-gray-400">{DAY_LABELS[i]}</span>
                  <span className="text-gray-900">{doc.hours[d] || 'Closed'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {forms.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Forms</h4>
            <div className="flex flex-col">
              {forms.map(f => (
                <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-1.5 text-xs border-b border-gray-100 last:border-0 group">
                  <span className="text-gray-900 group-hover:text-brand font-medium flex items-center gap-2">📄 {f.name}</span>
                  <span className="text-brand font-semibold group-hover:underline shrink-0">Download</span>
                </a>
              ))}
            </div>
          </div>
        )}


        {doc.hours && Object.values(doc.hours).some(v => v) && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand/60 mb-2">This doctor's hours</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm">
              {DAYS.map((d, i) => { const todayName = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()]; const isToday = d === todayName; return <div key={d} className={`flex justify-between ${isToday ? 'font-bold' : ''}`}><span className={isToday ? 'text-brand' : 'text-gray-400'}>{DAY_LABELS[i]}{isToday ? ' · Today' : ''}</span><span className={doc.hours[d] ? 'text-gray-900' : 'text-gray-300'}>{doc.hours[d] || 'Closed'}</span></div> })}
            </div>
          </div>
        )}

        {/* Locations */}
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
          {locs.length > 1 ? `Practises at ${locs.length} locations` : 'Location'}
        </h4>
        <div className="flex flex-col gap-3">
          {locs.length === 0 && <div className="bg-white border border-gray-200 rounded-xl p-4 text-xs text-gray-400">No clinic linked yet.</div>}
          {locs.map(({ providers: c }, li) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.category}{c.type ? ` · ${c.type}` : ''}</div>
                </div>
                {li === 0 && locs.length > 1 && <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">Main clinic</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-xs text-gray-600">
                <div className="space-y-1">
                  {c.address && <div>📍 {c.address}</div>}
                  {c.phone && <div>📞 {c.phone}</div>}
                  {c.fax && <div>📠 Fax {c.fax}</div>}
                  {c.website && <div>🔗 <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline break-all">{c.website}</a></div>}
                </div>
                {c.hours && (
                  <div className="mt-2 sm:mt-0">
                    {DAYS.map((d, i) => <div key={d} className="flex justify-between"><span className="text-gray-400">{DAY_LABELS[i]}</span><span>{c.hours[d] || 'Closed'}</span></div>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-gray-400 text-center mt-8 leading-relaxed">
          Wait times and referral criteria are provider-managed and may change.
        </p>
      </div>
    </div>
  )
}

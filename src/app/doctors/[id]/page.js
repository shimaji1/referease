'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
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
  const [claimMsg, setClaimMsg] = useState('')
  const [claiming, setClaiming] = useState(false)

  const claimProfile = async () => {
    if (!supabase || !user || !profile || !doc) return
    setClaiming(true); setClaimMsg('')
    const { data: existing } = await supabase.from('claims').select('id').eq('user_id', user.id).eq('physician_id', doc.id)
    if (existing && existing.length) { setClaimMsg('You already submitted a claim for this profile.'); setClaiming(false); return }
    let auto = false
    if (profile.cpso_number && doc.cpso_number) {
      const a = String(profile.cpso_number).replace(/\D/g, ''), b = String(doc.cpso_number).replace(/\D/g, '')
      if (a && b && a === b) auto = true
    }
    const { error } = await supabase.from('claims').insert({
      user_id: user.id, physician_id: doc.id, user_email: profile.email, user_name: profile.full_name,
      status: auto ? 'approved' : 'pending', verification_method: auto ? 'cpso_match' : 'manual_review',
    })
    if (error) { setClaimMsg('Error: ' + error.message); setClaiming(false); return }
    if (auto) { await supabase.from('physicians').update({ owner_id: user.id }).eq('id', doc.id); setDoc({ ...doc, owner_id: user.id }); setClaimMsg('Verified — this profile is now linked to your account.') }
    else setClaimMsg('Claim submitted. Our team will review and verify your identity.')
    setClaiming(false)
  }

  useEffect(() => {
    let alive = true
    async function load() {
      if (!supabase || !id) { setLoading(false); return }
      const { data: d } = await supabase.from('physicians').select('*').eq('id', id).single()
      if (!alive) return
      if (!d) { setMissing(true); setLoading(false); return }
      setDoc(d)
      const { data: links } = await supabase.from('physician_locations').select('is_primary, providers(*)').eq('physician_id', id)
      if (!alive) return
      setLocs((links || []).filter(l => l.providers).sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)))
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

        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mt-4 mb-4">
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{doc.name}</h1>
              <p className="text-sm text-brand font-medium mt-1">
                {doc.specialty || 'Physician'}{doc.sub_specialty ? ` · ${doc.sub_specialty}` : ''}
              </p>
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                {doc.gender && <span className="capitalize">{doc.gender}</span>}
                {(doc.languages?.length > 0) && <span>{doc.languages.join(', ')}</span>}
                {googleRating && <span className="text-amber-500 font-semibold">★ {Number(googleRating).toFixed(1)}</span>}
              </div>
            </div>
            {doc.verified && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">✓ Verified</span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            {isFamily
              ? <Pill ok={doc.accepting_new_patients}>{doc.accepting_new_patients ? 'Accepting new patients' : 'Roster full'}</Pill>
              : <Pill ok={doc.accepting_referrals}>{doc.accepting_referrals ? 'Accepting referrals' : 'Not accepting referrals'}</Pill>}
            {!isFamily && doc.accepting_referrals && <WaitBadge weeks={doc.wait_weeks} />}
            {isFamily && doc.accepting_referrals && <span className="text-[11px] font-semibold text-brand bg-brand/5 border border-brand/15 px-2.5 py-1 rounded-full">Takes procedure referrals</span>}
          </div>
        </div>

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
              {user
                ? <button onClick={claimProfile} disabled={claiming} className="text-xs font-semibold text-white bg-brand px-4 py-2 rounded-lg hover:bg-brand-dark transition disabled:opacity-50 shrink-0">{claiming ? 'Claiming…' : 'Claim this profile'}</button>
                : <Link href="/login" className="text-xs font-semibold text-white bg-brand px-4 py-2 rounded-lg hover:bg-brand-dark transition shrink-0">Sign in to claim</Link>}
            </div>
            {claimMsg && <p className="text-xs mt-2 text-blue-800">{claimMsg}</p>}
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

        {/* Locations */}
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
          {locs.length > 1 ? `Practises at ${locs.length} locations` : 'Location'}
        </h4>
        <div className="flex flex-col gap-3">
          {locs.length === 0 && <div className="bg-white border border-gray-200 rounded-xl p-4 text-xs text-gray-400">No clinic linked yet.</div>}
          {locs.map(({ providers: c, is_primary }) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.category}{c.type ? ` · ${c.type}` : ''}</div>
                </div>
                {is_primary && <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">Main clinic</span>}
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

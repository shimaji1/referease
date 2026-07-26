'use client'
import { useState, useMemo, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { CATEGORIES } from "@/data/providers"
import Link from 'next/link'
import ProfileView from '@/components/ProfileView'
import FeaturedStrip from '@/components/FeaturedStrip'
import useLocation from '@/hooks/useLocation'
import { useAuth } from '@/context/AuthContext'

const DAYS = ["sun","mon","tue","wed","thu","fri","sat"]
const DAY_LABELS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]

function getDayName() { return DAYS[new Date().getDay()] }
function getCurrentTime() { const d = new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}` }
function isOpenNow(h) { if (!h) return false; const day = getDayName(); const s = h[day]; if (!s) return false; const now = getCurrentTime(); const [o,c] = s.split("-"); return c === "24:00" ? now >= o : now >= o && now < c }
function isOpenWeekends(h) { if (!h) return false; return !!(h.sat || h.sun) }
function isOpenEvenings(h) { if (!h) return false; return Object.values(h).some(s => { if (!s) return false; return s.split("-")[1] > "18:00" }) }
function distKm(a,b,c,d) { const R=6371,dL=(c-a)*Math.PI/180,dG=(d-b)*Math.PI/180,x=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dG/2)**2; return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)) }
const CENTER = { lat: 43.810, lng: -79.430 }

// Map a SNOMED specialty (category + name) to one of the search category buttons — same rules as the admin form.
function specToCategory(specCategory, specName) {
  if (/famil/i.test(specName || '')) return 'Family Medicine'
  if (specCategory === 'Diagnostics and imaging') return 'Imaging'
  if (specName === 'Physiotherapy') return 'Physiotherapy'
  if (specCategory === 'Rehab and pain') return 'Rehab'
  if (specCategory === 'Primary and emergency') return 'Family Medicine'
  return 'Specialist'
}

function WaitBadge({ weeks }) {
  if (weeks === null || weeks === undefined) return null
  const cls = weeks === 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : weeks <= 2 ? 'text-amber-700 bg-amber-50 border-amber-200' : weeks <= 6 ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-red-700 bg-red-50 border-red-200'
  const label = weeks === 0 ? 'No wait' : weeks === 1 ? '~1 wk' : `~${weeks} wks`
  return <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
}

const CAT_BADGE = {
  'Family Medicine': 'text-blue-700 bg-blue-50 border-blue-200',
  'Specialist': 'text-purple-700 bg-purple-50 border-purple-200',
  'Multi-Specialty': 'text-indigo-700 bg-indigo-50 border-indigo-200',
  'Clinic': 'text-slate-700 bg-slate-100 border-slate-300',
  'Hospital': 'text-cyan-700 bg-cyan-50 border-cyan-200',
  'Imaging': 'text-amber-700 bg-amber-50 border-amber-200',
  'Lab': 'text-teal-700 bg-teal-50 border-teal-200',
  'Physiotherapy': 'text-orange-700 bg-orange-50 border-orange-200',
  'Rehab': 'text-pink-700 bg-pink-50 border-pink-200',
}
const catBadge = (c) => CAT_BADGE[c] || 'text-gray-600 bg-gray-100 border-gray-200'
function AcceptPill({ v, patient }) {
  if (v === null || v === undefined) return <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">Unknown</span>
  const label = patient ? (v ? 'Accepting patients' : 'Roster full') : (v ? 'Accepting referrals' : 'Not accepting')
  const cls = v ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-600 bg-red-50 border-red-200'
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
}
function Stars({ r }) {
  if (!r) return null
  return <span className="text-xs font-semibold text-amber-500">★ {Number(r).toFixed(1)}</span>
}

function Card({ p, onSelect, isFav, onFav }) {
  const dist = distKm(CENTER.lat, CENTER.lng, p.lat, p.lng).toFixed(1)
  const open = isOpenNow(p.hours)
  return (
    <div className={`bg-white border rounded-xl p-4 relative transition hover:shadow-md hover:border-brand/30 ${isFav ? 'border-brand/40 shadow-sm' : 'border-gray-200'}`}>
      <button onClick={() => onFav(p.id)} className={`absolute top-3 right-3 text-lg transition ${isFav ? 'text-amber-400 hover:text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}>{isFav ? '★' : '☆'}</button>
      <button onClick={() => onSelect(p)} className="text-left w-[calc(100%-30px)]">
        <div className="flex items-center gap-1.5 flex-wrap"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border tracking-wide ${catBadge(p.category || "Clinic")}`}>{(p.category || "Clinic").toUpperCase()}</span><h3 className="font-semibold text-gray-900 text-base leading-snug">{p.name}</h3></div>
        <p className="text-sm text-brand/80 font-medium mt-0.5">{p.type}</p>
        <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
          {p.verified && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">✓ Verified</span>}
          <AcceptPill v={p.accepting_referrals} />
          <WaitBadge weeks={p.wait_weeks} />
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${open ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>{open ? 'Open now' : 'Closed'}</span>
          <span className="text-[10px] text-gray-400">{dist} km</span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 text-sm text-gray-500">
          <span>📍 {p.address}</span>
          {p.phone && <span>📞 {p.phone}</span>}
          {p.fax && <span>📠 {p.fax}</span>}
        </div>
        {p.rating && <div className="flex gap-2 items-center mt-2.5"><Stars r={p.rating} /><span className="text-[10px] text-gray-400">({p.reviews})</span></div>}
      </button>
    </div>
  )
}

function DoctorCard({ d, isFav, onFav }) {
  const dist = (d.lat && d.lng) ? distKm(CENTER.lat, CENTER.lng, d.lat, d.lng).toFixed(1) : null
  const isFamily = (d.specialty || '').toLowerCase().includes('family')
  return (
    <Link href={`/doctors/${d.id}`} className="block bg-white border border-gray-200 rounded-xl p-4 relative transition hover:shadow-md hover:border-brand/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border tracking-wide ${catBadge(d.category || "Specialist")}`}>{(d.category || "Specialist").toUpperCase()}</span>
            <h3 className="font-semibold text-gray-900 text-base leading-snug">{d.name}</h3>
            {d.verified && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">✓ Verified</span>}
          </div>
          <p className="text-sm text-brand/80 font-medium mt-0.5">{d.specialty || 'Physician'}{d.clinicName ? ` · ${d.clinicName}` : ''}</p>
          <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
            {isFamily
              ? <AcceptPill v={d.accepting_new_patients} patient />
              : <AcceptPill v={d.accepting_referrals} />}
            <WaitBadge weeks={d.wait_weeks} />
            {dist && <span className="text-[10px] text-gray-400">{dist} km</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onFav && <button onClick={e => { e.preventDefault(); e.stopPropagation(); onFav(d.id) }} title={isFav ? 'Remove favourite' : 'Add to favourites'} className={`text-lg leading-none ${isFav ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'}`}>{isFav ? '★' : '☆'}</button>}
          <span className="text-gray-300 text-lg leading-none">›</span>
        </div>
      </div>
    </Link>
  )
}

function Detail({ p, onBack, isFav, onFav }) {
  const { user } = useAuth()
  const dist = distKm(CENTER.lat, CENTER.lng, p.lat, p.lng).toFixed(1)
  const open = isOpenNow(p.hours)
  const [docs, setDocs] = useState([])
  const [pforms, setPforms] = useState([])
  useEffect(() => {
    let alive = true
    if (!supabase || !p?.id) return () => { alive = false }
    supabase.from('physician_locations').select('physicians(id, name, specialty)').eq('provider_id', p.id).then(({ data }) => {
      if (alive) setDocs((data || []).map(l => l.physicians).filter(Boolean))
    })
    supabase.from('listing_forms').select('*').eq('provider_id', p.id).then(({ data }) => {
      if (alive) setPforms(data || [])
    })
    return () => { alive = false }
  }, [p?.id])
  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="text-sm text-brand font-semibold mb-4 hover:underline">← Back</button>
      <ProfileView
        name={p.name}
        subtitle={`${p.type}${p.category ? ` · ${p.category}` : ''}`}
        verified={p.verified}
        action={<button onClick={() => onFav(p.id)} className={`px-4 py-2 rounded-xl text-sm font-semibold border transition shrink-0 ${isFav ? 'bg-white text-brand border-white' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'}`}>{isFav ? '★ Saved' : '☆ Save'}</button>}
        tiles={[
          { big: p.accepting_referrals == null ? 'Unknown' : p.accepting_referrals ? 'Accepting' : 'Not accepting', small: 'Referrals', good: p.accepting_referrals },
          { big: p.wait_weeks == null ? 'Varies' : p.wait_weeks === 0 ? 'No wait' : `~${p.wait_weeks} wk`, small: 'Wait time', color: p.wait_weeks == null ? null : p.wait_weeks <= 4 ? 'text-emerald-600' : p.wait_weeks <= 12 ? 'text-amber-500' : 'text-red-500' },
          { big: open ? 'Open now' : 'Closed', small: 'Right now', good: open },
          { big: `${dist} km`, small: 'Distance', good: null },
        ]}
        headerFooter={p.rating ? <div className="flex items-center gap-2 mt-3 justify-center"><Stars r={p.rating} /><span className="text-xs text-gray-400">{Number(p.rating).toFixed(1)} · {p.reviews} reviews</span></div> : null}
        banner={
          p.owner_id ? null : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm text-blue-900 font-medium">Is this your practice? Claim this listing to manage availability, wait times and referral details.</span>
                {user
                  ? <Link href={`/dashboard/verify?provider_id=${p.id}`} className="text-xs font-semibold text-white bg-brand px-4 py-2 rounded-lg hover:bg-brand-dark transition shrink-0">Claim this listing</Link>
                  : <Link href="/login" className="text-xs font-semibold text-white bg-brand px-4 py-2 rounded-lg hover:bg-brand-dark transition shrink-0">Sign in to claim</Link>}
              </div>
            </div>
          )
        }
        contact={{ address: p.address, phone: p.phone, fax: p.fax, email: p.email, website: p.website, languages: p.languages || ['English'] }}
        hours={p.hours}
        referral={{ wait: p.wait_weeks === null ? 'Varies' : p.wait_weeks === 0 ? 'No wait' : `~${p.wait_weeks} week${p.wait_weeks > 1 ? 's' : ''}`, requirements: p.requirements, criteria: p.criteria, types: p.referral_types, cpso_url: p.cpso_url }}
        notes={p.notes}
        people={docs.length > 0 ? docs.map(d => ({ id: d.id, name: d.name, detail: d.specialty, href: `/doctors/${d.id}` })) : null}
        forms={pforms.map(f => ({ id: f.id, name: f.name, url: f.file_url }))}
        services={p.services}
      />
    </div>
  )
}



function SponsoredSlot({ category, slotIndex, loc }) {
  const [item, setItem] = useState(null)
  useEffect(() => {
    let alive = true
    const load = async () => {
      if (!supabase) return
      let q = supabase.from('providers').select('id, name, type, category, address, accepting_referrals, verified, rating, wait_weeks, lat, lng').eq('data_status', 'complete').eq('featured', true)
      if (category) q = q.eq('category', category)
      const { data } = await q.range(0, 40)
      if (!alive || !data || data.length === 0) return
      let sorted = data
      if (loc?.lat && loc?.lng) {
        sorted = data.map(x => ({ ...x, _d: (x.lat && x.lng) ? distKm(loc.lat, loc.lng, x.lat, x.lng) : 9999 })).sort((a, b) => a._d - b._d)
      }
      // Rotate by slot index so different sponsored spots on the page pick different providers
      const pick = sorted[slotIndex % sorted.length]
      setItem(pick)
    }
    load()
    return () => { alive = false }
  }, [category, slotIndex, loc?.lat, loc?.lng])
  if (!item) return null
  return (
    <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-4 cursor-pointer hover:border-amber-400 transition relative" onClick={() => { window.location.href = `/search?id=${item.id}` }}>
      <span className="absolute top-3 right-3 text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider">Sponsored</span>
      <div className="pr-20">
        <h3 className="font-semibold text-gray-900 text-base leading-snug">{item.name}</h3>
        <p className="text-sm text-brand/80 font-medium mt-0.5">{item.type || item.category}</p>
        <div className="flex flex-wrap gap-1.5 mt-2 items-center">
          {item.verified && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">✓ Verified</span>}
          {item.accepting_referrals === true && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Accepting</span>}
          {item.accepting_referrals === false && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Not accepting</span>}
          {item.accepting_referrals == null && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">Unknown</span>}
          {item.rating && <span className="text-[10px] font-semibold text-amber-500">★ {Number(item.rating).toFixed(1)}</span>}
          {item.address && <span className="text-xs text-gray-500">📍 {item.address}</span>}
        </div>
      </div>
    </div>
  )
}


function SponsoredCard({ item, onSelect }) {
  const isDoctor = item._kind === 'doctor'
  const handleClick = () => {
    if (isDoctor) { window.location.href = `/doctors/${item.id}`; return }
    onSelect(item)
  }
  return (
    <div onClick={handleClick} data-sponsored="true" style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '12px', padding: '16px', cursor: 'pointer', position: 'relative' }}>
      <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '9px', fontWeight: 700, color: '#b45309', background: '#fef3c7', border: '1px solid #fcd34d', padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sponsored</span>
      <div style={{ paddingRight: '80px' }}>
        <h3 className="font-semibold text-gray-900 text-base leading-snug">{item.name}</h3>
        <p className="text-sm text-brand/80 font-medium mt-0.5">{item.type || item.category || 'Provider'}</p>
        <div className="flex flex-wrap gap-1.5 mt-2 items-center">
          {item.verified && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">✓ Verified</span>}
          {item.accepting_referrals === true && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Accepting</span>}
          {item.accepting_referrals === false && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Not accepting</span>}
          {item.accepting_referrals == null && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">Unknown</span>}
          {item.wait_weeks != null && <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">~{item.wait_weeks} wk</span>}
          {item.rating && <span className="text-[10px] font-semibold text-amber-500">★ {Number(item.rating).toFixed(1)}</span>}
          {item.address && <span className="text-xs text-gray-500">📍 {item.address}</span>}
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  const [providers, setProviders] = useState([])
  const [doctors, setDoctors] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [cat, setCat] = useState("all")
  const [spec, setSpec] = useState("")
  const [svc, setSvc] = useState("")
  const [lang, setLang] = useState("")
  const [acc, setAcc] = useState(false)
  const [on, setOn] = useState(false)
  const [we, setWe] = useState(false)
  const [ev, setEv] = useState(false)
  const [mw, setMw] = useState("")
  const [mr, setMr] = useState("")
  const [md, setMd] = useState("")
  const [sort, setSort] = useState("name")
  const { loc, requestGeo, setPostal, clear: clearLoc } = useLocation()
  const [postalInput, setPostalInput] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [sel, setSel] = useState(null)
  const [view, setView] = useState("search")
  const [favs, setFavs] = useState([])
  const [favDocs, setFavDocs] = useState([])
  const [showFavs, setShowFavs] = useState(false)
  const [showF, setShowF] = useState(false)

  useEffect(() => {
    async function fetchAll(builder, pageSize = 1000, cap = 20000) {
      const out = []
      let from = 0
      while (from < cap) {
        const { data, error } = await builder().range(from, from + pageSize - 1)
        if (error || !data || data.length === 0) break
        out.push(...data)
        if (data.length < pageSize) break
        from += pageSize
      }
      return out
    }
    async function load() {
      if (!supabase) { setLoading(false); return }
      try {
        const [provAll, docsAll, specsRes] = await Promise.all([
          fetchAll(() => supabase.from("providers").select("*").eq("data_status", "complete").order("name")),
          fetchAll(() => supabase.from("physicians").select("id, name, specialty, specialty_code, gender, category, accepting_referrals, accepting_new_patients, wait_weeks, languages, rating, verified, hours, physician_locations(is_primary, providers(id, name, address, lat, lng, hours, services))").eq("status", "active")),
          supabase.from("specialties").select("snomed_code, category, name"),
        ])
        setProviders(provAll)
        setDoctors(docsAll)
        if (specsRes.data) setSpecialties(specsRes.data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => { try { const s = localStorage.getItem("re-favs"); if (s) setFavs(JSON.parse(s)) } catch {} }, [])
  useEffect(() => { if (!loc && typeof window !== 'undefined' && !localStorage.getItem('re-loc-asked')) { try { localStorage.setItem('re-loc-asked', '1') } catch {}; requestGeo() } }, [loc, requestGeo])
  useEffect(() => { try { const nav = JSON.parse(sessionStorage.getItem('re-nav') || '[]'); if (nav[nav.length - 1]?.url !== '/search') { nav.push({ url: '/search', label: 'Search' }); sessionStorage.setItem('re-nav', JSON.stringify(nav.slice(-20))) } } catch {} }, [])

  // Load the sponsor pool — prefer category-matching featured, fall back to any featured
  useEffect(() => {
    if (!supabase) return
    let alive = true
    const load = async () => {
      const results = []
      const DOC_CATS = new Set(['Family Medicine', 'Specialist'])
      const wantsDoctor = cat !== 'all' && DOC_CATS.has(cat)
      const wantsFacility = cat !== 'all' && !DOC_CATS.has(cat)
      // Try category-preferred first
      if (cat !== 'all') {
        if (!wantsDoctor) {
          const { data } = await supabase.from('providers').select('id, name, type, category, address, phone, fax, accepting_referrals, verified, rating, wait_weeks, lat, lng, services').eq('data_status', 'complete').eq('featured', true).eq('category', cat).limit(20)
          if (data) results.push(...data.map(x => ({ ...x, _kind: 'provider' })))
        }
        if (!wantsFacility && results.length < 4) {
          const { data } = await supabase.from('physicians').select('id, name, specialty, category, accepting_referrals, verified, wait_weeks').eq('status', 'active').eq('featured', true).eq('category', cat).limit(20)
          if (data) results.push(...data.map(x => ({ ...x, _kind: 'doctor', type: x.specialty })))
        }
      }
      // Fallback: any featured, if we didn't fill 4 yet
      if (results.length < 4) {
        const { data } = await supabase.from('providers').select('id, name, type, category, address, phone, fax, accepting_referrals, verified, rating, wait_weeks, lat, lng, services').eq('data_status', 'complete').eq('featured', true).limit(20)
        if (data) data.forEach(x => { if (!results.some(r => r._kind === 'provider' && r.id === x.id)) results.push({ ...x, _kind: 'provider' }) })
      }
      if (results.length < 4) {
        const { data } = await supabase.from('physicians').select('id, name, specialty, category, accepting_referrals, verified, wait_weeks').eq('status', 'active').eq('featured', true).limit(20)
        if (data) data.forEach(x => { if (!results.some(r => r._kind === 'doctor' && r.id === x.id)) results.push({ ...x, _kind: 'doctor', type: x.specialty }) })
      }
      if (alive) {
        if (typeof window !== 'undefined') {
          window.__sponsorDebug = { cat, results, resultsCount: results.length }
          console.log('[re-sponsor]', { cat, count: results.length, results })
        }
        setSponsorPool(results.slice(0, 4))
      }
    }
    load()
    return () => { alive = false }
  }, [cat])

  // If URL has ?id=NNN (e.g. arriving from a featured card), open that provider directly
  useEffect(() => {
    if (typeof window === 'undefined') return
    const openById = async (id) => {
      if (!supabase) return
      const { data } = await supabase.from('providers').select('*').eq('id', id).single()
      if (data) { setSel(data); setView('detail'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    }
    const handler = (e) => openById(e.detail?.id)
    window.addEventListener('re-open-listing', handler)
    return () => window.removeEventListener('re-open-listing', handler)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlId = new URL(window.location.href).searchParams.get('id')
    if (!urlId || !supabase) return
    let alive = true
    supabase.from('providers').select('*').eq('id', urlId).single().then(({ data }) => {
      if (alive && data) { setSel(data); setView('detail') }
    })
    return () => { alive = false }
  }, [])

  const saveFavs = useCallback(ids => { setFavs(ids); try { localStorage.setItem("re-favs", JSON.stringify(ids)) } catch {} }, [])
  const toggleFav = useCallback(id => saveFavs(favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id]), [favs, saveFavs])

  useEffect(() => { try { const s = localStorage.getItem("re-favs-docs"); if (s) setFavDocs(JSON.parse(s)) } catch {} }, [])
  const saveFavDocs = useCallback(ids => { setFavDocs(ids); try { localStorage.setItem("re-favs-docs", JSON.stringify(ids)) } catch {} }, [])
  const toggleFavDoc = useCallback(id => saveFavDocs(favDocs.includes(id) ? favDocs.filter(f => f !== id) : [...favDocs, id]), [favDocs, saveFavDocs])

  // Deep-link: /search?id=123 opens that provider's listing directly.
  useEffect(() => {
    if (typeof window === 'undefined' || !providers.length) return
    const pid = new URLSearchParams(window.location.search).get('id')
    if (!pid) return
    const p = providers.find(x => String(x.id) === String(pid))
    if (p) { setSel(p); setView('detail') }
  }, [providers])

  // Open a specific listing when arriving via /search?id=123 (e.g. from a favourite)
  useEffect(() => {
    if (!providers.length || typeof window === 'undefined') return
    const wantId = new URLSearchParams(window.location.search).get('id')
    if (!wantId) return
    const p = providers.find(x => String(x.id) === String(wantId))
    if (p) { setSel(p); setView('detail') }
  }, [providers])

  const codeToName = useMemo(() => { const m = {}; specialties.forEach(sp => { m[sp.snomed_code] = sp.name }); return m }, [specialties])
  const provSpecialty = useCallback((p) => {
    const t = String(p.type || '').trim()
    if (t && !/^\d+$/.test(t)) return t
    return codeToName[p.specialty_code] || codeToName[t] || null
  }, [codeToName])
  const allSpecialties = useMemo(() => {
    const set = new Set()
    providers.forEach(p => { const sname = provSpecialty(p); if (sname) set.add(sname) })
    doctors.forEach(d => { if (d.specialty) set.add(d.specialty) })
    return [...set].sort()
  }, [providers, doctors, provSpecialty])
  const allServices = useMemo(() => [...new Set(providers.flatMap(p => p.services || []))].sort(), [providers])
  const allLanguages = useMemo(() => [...new Set(providers.flatMap(p => p.languages || []))].sort(), [providers])
  const activeF = useMemo(() => [acc,on,we,ev,mw,mr,md,svc,lang].filter(Boolean).length, [acc,on,we,ev,mw,mr,md,svc,lang])

  const filtered = useMemo(() => {
    let r = showFavs ? providers.filter(p => favs.includes(p.id)) : providers
    if (cat !== "all") r = r.filter(p => p.category === cat)
    if (spec) r = r.filter(p => provSpecialty(p) === spec || p.type === spec)
    if (svc) r = r.filter(p => (p.services||[]).includes(svc))
    if (lang) r = r.filter(p => (p.languages||[]).includes(lang))
    if (acc) r = r.filter(p => p.accepting_referrals || p.accepting_new_patients)
    if (on) r = r.filter(p => isOpenNow(p.hours))
    if (we) r = r.filter(p => isOpenWeekends(p.hours))
    if (ev) r = r.filter(p => isOpenEvenings(p.hours))
    if (mw) r = r.filter(p => p.wait_weeks !== null && p.wait_weeks <= parseInt(mw))
    if (mr) r = r.filter(p => p.rating && Number(p.rating) >= parseFloat(mr))
    if (md) r = r.filter(p => distKm(CENTER.lat,CENTER.lng,p.lat,p.lng) <= parseFloat(md))
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(p => (p.name||"").toLowerCase().includes(q) || (p.type||"").toLowerCase().includes(q) || (p.sub_specialty||"").toLowerCase().includes(q) || (p.address||"").toLowerCase().includes(q) || (p.services||[]).some(s => (s||"").toLowerCase().includes(q)) || (p.doctors||[]).some(d => (d||"").toLowerCase().includes(q))) }
    if (sort==="name") r=[...r].sort((a,b)=>a.name.localeCompare(b.name))
    if (sort==="rating") r=[...r].sort((a,b)=>(Number(b.rating)||0)-(Number(a.rating)||0))
    if (sort==="wait") r=[...r].sort((a,b)=>(a.wait_weeks??999)-(b.wait_weeks??999))
    if (sort==="reviews") r=[...r].sort((a,b)=>(b.reviews||0)-(a.reviews||0))
    if (sort==="distance") r=[...r].sort((a,b)=>distKm(CENTER.lat,CENTER.lng,a.lat,a.lng)-distKm(CENTER.lat,CENTER.lng,b.lat,b.lng))
    return r
  }, [search,cat,spec,svc,lang,acc,on,we,ev,mw,mr,md,sort,showFavs,favs,providers,provSpecialty])

  // ---- Doctors as first-class results ----
  const specCatMap = useMemo(() => {
    const m = {}
    specialties.forEach(s => { m[s.snomed_code] = specToCategory(s.category, s.name) })
    return m
  }, [specialties])

  const doctorCards = useMemo(() => doctors.map(doc => {
    const links = doc.physician_locations || []
    const link = links.find(l => l.is_primary && l.providers) || links.find(l => l.providers) || null
    const c = link?.providers || null
    return {
      id: doc.id, name: doc.name, specialty: doc.specialty, specialty_code: doc.specialty_code,
      accepting_referrals: doc.accepting_referrals, accepting_new_patients: doc.accepting_new_patients,
      wait_weeks: doc.wait_weeks, languages: doc.languages || [], rating: doc.rating, verified: doc.verified,
      category: doc.category || specCatMap[doc.specialty_code] || (/famil/i.test(doc.specialty || '') ? 'Family Medicine' : 'Specialist'),
      clinicName: c?.name || null, lat: c?.lat, lng: c?.lng, hours: doc.hours || c?.hours, services: c?.services || [],
    }
  }), [doctors, specCatMap])

  const filteredDoctors = useMemo(() => {
    if (showFavs) return doctorCards.filter(d => favDocs.includes(d.id))
    let r = doctorCards
    if (cat !== "all") r = r.filter(d => d.category === cat)
    if (spec) r = r.filter(d => (d.specialty || "") === spec)
    if (svc) r = r.filter(d => (d.services || []).includes(svc))
    if (lang) r = r.filter(d => (d.languages || []).includes(lang))
    if (acc) r = r.filter(d => d.category === 'Family Medicine' ? d.accepting_new_patients : d.accepting_referrals)
    if (on) r = r.filter(d => isOpenNow(d.hours))
    if (we) r = r.filter(d => isOpenWeekends(d.hours))
    if (ev) r = r.filter(d => isOpenEvenings(d.hours))
    if (mw) r = r.filter(d => d.wait_weeks !== null && d.wait_weeks !== undefined && d.wait_weeks <= parseInt(mw))
    if (mr) r = r.filter(d => d.rating && Number(d.rating) >= parseFloat(mr))
    if (md) r = r.filter(d => d.lat && d.lng && distKm(CENTER.lat, CENTER.lng, d.lat, d.lng) <= parseFloat(md))
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(d => (d.name || "").toLowerCase().includes(q) || (d.specialty || "").toLowerCase().includes(q) || (d.clinicName || "").toLowerCase().includes(q)) }
    const far = (d) => (d.lat && d.lng) ? distKm(CENTER.lat, CENTER.lng, d.lat, d.lng) : 99999
    if (sort === "name") r = [...r].sort((a,b) => a.name.localeCompare(b.name))
    else if (sort === "wait") r = [...r].sort((a,b) => (a.wait_weeks ?? 999) - (b.wait_weeks ?? 999))
    else if (sort === "distance") r = [...r].sort((a,b) => far(a) - far(b))
    return r
  }, [doctorCards,cat,spec,svc,lang,acc,on,we,ev,mw,mr,md,search,sort,showFavs,favDocs])

  const clearF = () => { setSpec(""); setSvc(""); setLang(""); setAcc(false); setOn(false); setWe(false); setEv(false); setMw(""); setMr(""); setMd("") }
  const sel_s = "px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg text-gray-700 outline-none cursor-pointer flex-1 min-w-0 max-w-[180px] focus:border-brand focus:ring-1 focus:ring-brand/20"
  const chk_s = "flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer whitespace-nowrap"

  const totalCount = filtered.length + filteredDoctors.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE
  const endIdx = start + PAGE_SIZE
  const combined = [...filteredDoctors.map(d => ({ ...d, _t: 'doc' })), ...filtered.map(p => ({ ...p, _t: 'prov' }))]
  const pageItems = combined.slice(start, endIdx)
  const pagedDoctors = pageItems.filter(x => x._t === 'doc')
  const pagedProviders = pageItems.filter(x => x._t === 'prov')

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading providers...
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">R</span></div>
            <span className="text-lg font-bold text-gray-900">Refer<span className="text-[#2563eb]">Easy</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={() => { setShowFavs(!showFavs); setView("search"); setSel(null) }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${showFavs ? 'bg-brand text-white border-brand' : 'bg-white text-gray-500 border-gray-300 hover:border-brand'}`}>
              ★ Favourites {(favs.length + favDocs.length) > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${showFavs ? 'bg-white/20' : 'bg-brand text-white'}`}>{favs.length + favDocs.length}</span>}
            </button>
            <Link href="/login" className="text-xs font-medium text-gray-500 hover:text-brand px-3 py-1.5">Sign In</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {view === "detail" && sel ? <Detail p={sel} onBack={() => { const u = new URL(window.location.href); if (u.searchParams.has('id')) { u.searchParams.delete('id'); window.history.replaceState({}, '', u.toString()) } try { const nav = JSON.parse(sessionStorage.getItem('re-nav') || '[]'); const prev = nav[nav.length - 1]; if (prev && prev.url !== '/search') { window.location.href = prev.url; return } } catch {} setView('search'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} isFav={favs.includes(sel.id)} onFav={toggleFav} /> : (
          <>
            {/* Hero search block */}
            <div className="bg-gradient-to-br from-brand to-[#2c4f7c] rounded-3xl p-6 sm:p-8 mb-6 text-white">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">Find care that's right for your patient</h1>
              <p className="text-sm text-white/70 mb-5">Search verified providers accepting referrals across Ontario.</p>
              <div className="flex flex-col md:flex-row gap-2 bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2">
                <div className="relative flex-1">
                  <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Specialty, doctor, service, or clinic…" className="w-full pl-11 pr-4 h-12 text-sm bg-white rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-white/50 placeholder:text-gray-400" />
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div className="relative md:w-64">
                  <input type="text" value={loc?.label || postalInput} onChange={e => setPostalInput(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') { if (setPostal(postalInput)) setPage(1) } }} placeholder={loc?.label ? "" : "Postal code"} disabled={!!loc?.label} className={`w-full pl-10 h-12 text-sm bg-white rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-white/50 placeholder:text-gray-400 disabled:opacity-90 ${loc?.label ? "pr-20" : "pr-32"}`} />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">📍</span>
                  {loc?.label
                    ? <button onClick={() => { clearLoc(); setPostalInput('') }} className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400 hover:text-red-500 px-2 py-1">Change</button>
                    : <button onClick={requestGeo} className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-brand bg-brand/10 hover:bg-brand/20 px-2.5 py-1 rounded-md">Use my location</button>}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap mt-4">
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => { setCat(c.key); setSpec(""); setShowFavs(false); setPage(1) }} className={`px-4 py-2 text-xs font-bold rounded-full border transition ${cat===c.key&&!showFavs ? 'bg-white text-brand border-white' : 'bg-white/10 text-white border-white/25 hover:bg-white/20'}`}>{c.icon} {c.label}</button>
                ))}
              </div>
            </div>

            {/* Two-column layout: sidebar filters + results */}
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">

              {/* Sidebar filters (desktop) / drawer trigger (mobile) */}
              <aside className="lg:sticky lg:top-20 lg:self-start">
                <div className="lg:hidden mb-3">
                  <button onClick={() => setShowF(!showF)} className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700">
                    <span>{showF ? '▾' : '▸'} Filters {activeF > 0 && <span className="ml-1 bg-brand text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeF}</span>}</span>
                    {activeF > 0 && <span onClick={e => { e.stopPropagation(); clearF() }} className="text-[11px] text-red-500 font-medium">Clear</span>}
                  </button>
                </div>
                <div className={`bg-white border border-gray-200 rounded-2xl p-5 ${showF ? 'block' : 'hidden lg:block'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900">Filters</h3>
                    {activeF > 0 && <button onClick={clearF} className="text-[11px] text-red-500 font-semibold">Clear all</button>}
                  </div>
                  <div className="space-y-5 text-sm">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Availability</label>
                      <div className="space-y-1.5">
                        <label className={chk_s}><input type="checkbox" checked={acc} onChange={e => { setAcc(e.target.checked); setPage(1) }} className="accent-brand w-3.5 h-3.5" /> Accepting referrals</label>
                        <label className={chk_s}><input type="checkbox" checked={on} onChange={e => { setOn(e.target.checked); setPage(1) }} className="accent-brand w-3.5 h-3.5" /> Open now</label>
                        <label className={chk_s}><input type="checkbox" checked={we} onChange={e => { setWe(e.target.checked); setPage(1) }} className="accent-brand w-3.5 h-3.5" /> Weekends</label>
                        <label className={chk_s}><input type="checkbox" checked={ev} onChange={e => { setEv(e.target.checked); setPage(1) }} className="accent-brand w-3.5 h-3.5" /> Evenings</label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Wait time</label>
                      <select value={mw} onChange={e => { setMw(e.target.value); setPage(1) }} className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 outline-none focus:border-brand"><option value="">Any wait</option><option value="0">No wait</option><option value="1">≤ 1 wk</option><option value="2">≤ 2 wks</option><option value="4">≤ 4 wks</option><option value="8">≤ 8 wks</option><option value="12">≤ 12 wks</option></select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Distance</label>
                      <select value={md} onChange={e => { setMd(e.target.value); setPage(1) }} className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 outline-none focus:border-brand"><option value="">Any distance</option><option value="2">Within 2 km</option><option value="5">Within 5 km</option><option value="10">Within 10 km</option><option value="15">Within 15 km</option><option value="25">Within 25 km</option></select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Specialty</label>
                      <select value={spec} onChange={e => { setSpec(e.target.value); setPage(1) }} className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 outline-none focus:border-brand"><option value="">All specialties</option>{allSpecialties.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Language</label>
                      <select value={lang} onChange={e => { setLang(e.target.value); setPage(1) }} className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 outline-none focus:border-brand"><option value="">Any language</option>{allLanguages.map(l => <option key={l} value={l}>{l}</option>)}</select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Service</label>
                      <select value={svc} onChange={e => { setSvc(e.target.value); setPage(1) }} className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 outline-none focus:border-brand"><option value="">All services</option>{allServices.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Min rating</label>
                      <select value={mr} onChange={e => { setMr(e.target.value); setPage(1) }} className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 outline-none focus:border-brand"><option value="">Any rating</option><option value="4.5">4.5+</option><option value="4">4+</option><option value="3.5">3.5+</option><option value="3">3+</option></select>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Main results column */}
              <main className="min-w-0">
                {/* Results summary bar */}
                <div className="flex items-center justify-between gap-3 mb-4 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
                  <div className="text-sm text-gray-600">
                    <span className="font-bold text-gray-900">{totalCount}</span> result{totalCount !== 1 ? 's' : ''}
                    {loc?.label && <> · near <span className="font-semibold text-gray-800">{loc.label}</span></>}
                    {cat !== 'all' && <> · <span className="font-semibold text-brand">{CATEGORIES.find(c => c.key === cat)?.label}</span></>}
                  </div>
                  <select value={sort} onChange={e => setSort(e.target.value)} className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-md px-2 py-1.5 outline-none focus:border-brand">
                    <option value="distance">Sort: Distance</option><option value="rating">Rating</option><option value="wait">Wait time</option><option value="name">Name</option><option value="reviews">Reviews</option>
                  </select>
                </div>

                {showFavs && favs.length === 0 && favDocs.length === 0 && <div className="text-center py-16 text-gray-400 text-sm"><div className="text-4xl mb-3">☆</div><p className="font-semibold text-gray-600 mb-1">No favourites yet</p>Click the star on any provider or doctor to save them here.</div>}

                <div className="flex flex-col gap-2.5">
                  {!showFavs && totalCount === 0 && (
                    <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="font-semibold text-gray-700 mb-1">No matches for your filters</p>
                      <p className="text-sm text-gray-400 mb-4">Try removing a filter or searching a nearby area.</p>
                      <button onClick={() => { setSearch(''); setSpec(''); setSvc(''); setLang(''); setAcc(false); setOn(false); setWe(false); setEv(false); setCat('all'); setPage(1) }} className="text-xs font-semibold text-brand bg-brand/5 border border-brand/15 px-4 py-2 rounded-lg hover:bg-brand/10 transition">Clear all filters</button>
                    </div>
                  )}
                  {(() => {
                    try {
                      // Build organic result rows
                      const merged = [
                        ...pagedDoctors.map(d => ({ kind: 'doc', data: d })),
                        ...pagedProviders.map(p => ({ kind: 'prov', data: p })),
                      ]
                      const organicRows = merged.map((row, idx) =>
                        row.kind === 'doc'
                          ? <DoctorCard key={'doc-' + row.data.id} d={row.data} isFav={favDocs.includes(row.data.id)} onFav={toggleFavDoc} />
                          : <Card key={row.data.id} p={row.data} onSelect={pr => { setSel(pr); setView("detail") }} isFav={favs.includes(row.data.id)} onFav={toggleFav} />
                      )
                      if (showFavs) return organicRows
                      const pool = Array.isArray(sponsorPool) ? sponsorPool : []
                      if (pool.length === 0) return organicRows
                      const SPONSOR_POSITIONS = [1, 3, 8, 12]
                      const rows = []
                      let organicIdx = 0
                      let sponsorIdx = 0
                      let displayPos = 1
                      const MAX_POS = organicRows.length + pool.length + 5
                      while (displayPos <= MAX_POS && (organicIdx < organicRows.length || sponsorIdx < pool.length)) {
                        if (SPONSOR_POSITIONS.includes(displayPos) && sponsorIdx < pool.length) {
                          const sp = pool[sponsorIdx]
                          rows.push(<SponsoredCard key={`spon-${sp._kind}-${sp.id}-${displayPos}`} item={sp} onSelect={pr => { setSel(pr); setView("detail") }} />)
                          sponsorIdx++
                        } else if (organicIdx < organicRows.length) {
                          rows.push(organicRows[organicIdx])
                          organicIdx++
                        } else {
                          break
                        }
                        displayPos++
                      }
                      return rows
                    } catch (err) {
                      if (typeof window !== 'undefined') { window.__renderErr = err?.message || String(err) }
                      console.error('[re-render]', err)
                      return [
                        ...pagedDoctors.map(d => <DoctorCard key={'doc-' + d.id} d={d} isFav={favDocs.includes(d.id)} onFav={toggleFavDoc} />),
                        ...pagedProviders.map(p => <Card key={p.id} p={p} onSelect={pr => { setSel(pr); setView("detail") }} isFav={favs.includes(p.id)} onFav={toggleFav} />),
                      ]
                    }
                  })()}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1 mt-8">
                    <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-brand hover:text-brand transition disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>
                    {(() => {
                      const nums = []
                      const push = n => nums.push(n)
                      if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) push(i) }
                      else {
                        push(1)
                        if (page > 3) push('…')
                        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) push(i)
                        if (page < totalPages - 2) push('…')
                        push(totalPages)
                      }
                      return nums.map((n, i) => n === '…'
                        ? <span key={'e' + i} className="px-2 text-gray-400">…</span>
                        : <button key={n} onClick={() => setPage(n)} className={`w-9 h-9 text-sm font-semibold rounded-lg border transition ${n === page ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-200 hover:border-brand hover:text-brand'}`}>{n}</button>)
                    })()}
                    <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-3 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-brand hover:text-brand transition disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
                  </div>
                )}
              </main>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

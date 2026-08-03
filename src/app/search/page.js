'use client'
import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from 'next/navigation'
import { supabase } from "@/lib/supabase"
import { CATEGORIES } from "@/data/providers"
import Link from 'next/link'
import ProfileView from '@/components/ProfileView'
import { VerifiedPill, FeaturedTag } from '@/components/Badges'
import FeaturedStrip from '@/components/FeaturedStrip'
import TopNav from '@/components/TopNav'
import useLocation from '@/hooks/useLocation'
import { useAuth } from '@/context/AuthContext'
import ListPickerModal from '@/components/ListPickerModal'
import { fetchLists, fetchSavedProviderIds, addToList, removeFromAllLists } from '@/lib/favourites'

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

function Card({ p, onSelect, isFav, onFav, sponsored }) {
  const dist = distKm(CENTER.lat, CENTER.lng, p.lat, p.lng).toFixed(1)
  const open = isOpenNow(p.hours)
  return (
    <div className={`bg-white border rounded-xl p-4 relative transition hover:shadow-md hover:border-brand/30 ${sponsored ? '' : ''} ${isFav ? 'border-brand/40 shadow-sm' : 'border-gray-200'}`}>
      {sponsored && <FeaturedTag />}
      <button onClick={() => onFav(p.id)} className={`absolute ${sponsored ? 'top-9' : 'top-3'} right-3 text-lg transition ${isFav ? 'text-amber-400 hover:text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}>{isFav ? '★' : '☆'}</button>
      <button onClick={() => onSelect(p)} className={`text-left ${sponsored ? 'w-[calc(100%-84px)]' : 'w-[calc(100%-30px)]'}`}>
        <div className="flex items-center gap-1.5 min-w-0"><span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border tracking-wide ${catBadge(p.category || "Clinic")}`}>{(p.category || "Clinic").toUpperCase()}</span><h3 className="font-semibold text-gray-900 text-base leading-snug truncate min-w-0 flex-1">{p.name}</h3></div>
        <p className="text-sm text-brand/80 font-medium mt-0.5">{p.type}</p>
        <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
          {p.verified && <VerifiedPill />}
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

function DoctorCard({ d, isFav, onFav, sponsored }) {
  const dist = (d.lat && d.lng) ? distKm(CENTER.lat, CENTER.lng, d.lat, d.lng).toFixed(1) : null
  const isFamily = (d.specialty || '').toLowerCase().includes('family')
  const open = isOpenNow(d.hours)
  return (
    <Link href={`/search?id=${d.id}`} className={`block bg-white border rounded-xl p-4 relative transition hover:shadow-md hover:border-brand/40 ${sponsored ? 'border-brand/20' : 'border-gray-200'}`}>
      {sponsored && <FeaturedTag />}
      <div className="flex items-start justify-between gap-2">
        <div className={`min-w-0 flex-1 ${sponsored ? 'pr-[84px]' : ''}`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border tracking-wide ${catBadge(d.category || "Specialist")}`}>{(d.category || "Specialist").toUpperCase()}</span>
            <h3 className="font-semibold text-gray-900 text-base leading-snug truncate min-w-0 flex-1">{d.name}</h3>
          </div>
          <p className="text-sm text-brand/80 font-medium mt-0.5">{d.specialty || 'Physician'}{d.clinicName ? ` · ${d.clinicName}` : ''}</p>
          <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
            {isFamily
              ? <AcceptPill v={d.accepting_new_patients} patient />
              : <AcceptPill v={d.accepting_referrals} />}
            <WaitBadge weeks={d.wait_weeks} />
            {d.verified && <VerifiedPill />}
            {d.hours && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${open ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>{open ? 'Open now' : 'Closed'}</span>}
            {dist && <span className="text-[10px] text-gray-400">{dist} km</span>}
          </div>
          {(d.address || d.phone || d.fax) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 text-sm text-gray-500">
              {d.address && <span>📍 {d.address}</span>}
              {d.phone && <span>📞 {d.phone}</span>}
              {d.fax && <span>📠 {d.fax}</span>}
            </div>
          )}
          {d.rating && <div className="flex gap-2 items-center mt-2.5"><Stars r={d.rating} /><span className="text-[10px] text-gray-400">({d.reviews})</span></div>}
        </div>
        <div className={`flex items-center gap-1 shrink-0 ${sponsored ? 'mt-5' : ''}`}>
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
  const [parentClinics, setParentClinics] = useState([])
  useEffect(() => {
    let alive = true
    if (!supabase || !p?.id) return () => { alive = false }
    supabase.from('providers').select('id, name, type, category').eq('clinic_provider_id', p.id).then(({ data }) => {
      if (alive) setDocs((data || []).map(d => ({ id: d.id, name: d.name, specialty: d.type || d.category })))
    })
    supabase.from('listing_forms').select('*').eq('provider_id', p.id).then(({ data }) => {
      if (alive) setPforms(data || [])
    })
    // Doctor's linked clinics: primary via clinic_provider_id, up to 3 more via doctor_locations
    const primaryIds = p.clinic_provider_id ? [p.clinic_provider_id] : []
    supabase.from('doctor_locations').select('clinic_provider_id').eq('doctor_provider_id', p.id).then(({ data }) => {
      if (!alive) return
      const secondaryIds = (data || []).map(l => l.clinic_provider_id).filter(id => !primaryIds.includes(id))
      const allIds = [...primaryIds, ...secondaryIds]
      if (!allIds.length) { setParentClinics([]); return }
      supabase.from('providers').select('id, name, address, phone, fax, website, hours').in('id', allIds).then(({ data: clinics }) => {
        if (!alive || !clinics) return
        setParentClinics(allIds.map(id => clinics.find(c => c.id === id)).filter(Boolean))
      })
    })
    return () => { alive = false }
  }, [p?.id, p?.clinic_provider_id])
  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="text-sm text-brand font-semibold mb-4 hover:underline">← Back to results</button>
      <ProfileView
        name={p.name}
        subtitle={`${p.type}${p.category ? ` · ${p.category}` : ''}`}
        specialty={p.type}
        subSpecialty={p.sub_specialty}
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
        contact={{ address: parentClinics.length ? null : p.address, phone: p.phone, fax: p.fax, email: p.email, website: p.website, languages: p.languages || ['English'] }}
        hours={p.hours}
        locations={parentClinics.length ? parentClinics.map(c => ({ id: c.id, name: c.name, address: c.address, phone: c.phone, fax: c.fax, website: c.website })) : null}
        referral={{ wait: p.wait_weeks === null ? 'Varies' : p.wait_weeks === 0 ? 'No wait' : `~${p.wait_weeks} week${p.wait_weeks > 1 ? 's' : ''}`, requirements: p.requirements, criteria: p.criteria, types: p.referral_types, cpso_url: p.cpso_url }}
        notes={p.notes}
        people={docs.length > 0 ? docs.map(d => ({ id: d.id, name: d.name, detail: d.specialty, href: `/search?id=${d.id}` })) : null}
        forms={pforms.map(f => ({ id: f.id, name: f.name, url: f.file_url }))}
        services={p.services}
      />
    </div>
  )
}


export default function SearchPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [providers, setProviders] = useState([])
  const [doctors, setDoctors] = useState([])
  const [featuredMix, setFeaturedMix] = useState([])
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
    async function load() {
      if (!supabase) { setLoading(false); return }
      try {
        // Supabase caps a single query at 1000 rows. Paginate through all of them.
        async function fetchAll(builder, pageSize = 1000, cap = 20000) {
          const results = []
          for (let from = 0; from < cap; from += pageSize) {
            const to = from + pageSize - 1
            const { data, error } = await builder().range(from, to)
            if (error || !data) break
            results.push(...data)
            if (data.length < pageSize) break
          }
          return results
        }
        const [provAll, specsRes] = await Promise.all([
          fetchAll(() => supabase.from("providers").select("*").eq("data_status", "complete").order("name")),
          supabase.from("specialties").select("snomed_code, category, name"),
        ])
        // Split into clinics and doctors by category. Doctors get their clinic's location embedded.
        const DOC_CATS_SET = new Set(['Specialist', 'Family Medicine'])
        const byId = new Map(provAll.map(p => [p.id, p]))
        const clinics = provAll.filter(p => !DOC_CATS_SET.has(p.category))
        const doctors = provAll.filter(p => DOC_CATS_SET.has(p.category)).map(d => {
          const clinic = d.clinic_provider_id ? byId.get(d.clinic_provider_id) : null
          return { ...d, specialty: d.type || d.category, physician_locations: clinic ? [{ is_primary: true, providers: { id: clinic.id, name: clinic.name, address: clinic.address, phone: clinic.phone, fax: clinic.fax, lat: clinic.lat, lng: clinic.lng, hours: clinic.hours, services: clinic.services } }] : [] }
        })
        setProviders(clinics)
        setDoctors(doctors)
        if (specsRes.data) setSpecialties(specsRes.data)
      } catch (e) { console.error('search load failed:', e) }
      setLoading(false)
    }
    load()
  }, [])

  // Featured items fetch — for inline mixing at positions 1,3,8,13,18...
  useEffect(() => {
    if (!supabase) return
    let alive = true
    supabase.from('providers')
      .select('id, name, type, category, address, phone, fax, accepting_referrals, verified, rating, wait_weeks, lat, lng, featured, clinic_provider_id')
      .eq('data_status', 'complete').eq('featured', true).limit(30)
      .then(({ data }) => { if (alive && data) setFeaturedMix(data) })
    return () => { alive = false }
  }, [])

  useEffect(() => { try { const s = localStorage.getItem("re-favs"); if (s) setFavs(JSON.parse(s)) } catch {} }, [])
  useEffect(() => { if (!loc && typeof window !== 'undefined' && !localStorage.getItem('re-loc-asked')) { try { localStorage.setItem('re-loc-asked', '1') } catch {}; requestGeo() } }, [loc, requestGeo])
  const saveFavs = useCallback(ids => { setFavs(ids); try { localStorage.setItem("re-favs", JSON.stringify(ids)) } catch {} }, [])

  useEffect(() => { try { const s = localStorage.getItem("re-favs-docs"); if (s) setFavDocs(JSON.parse(s)) } catch {} }, [])
  const saveFavDocs = useCallback(ids => { setFavDocs(ids); try { localStorage.setItem("re-favs-docs", JSON.stringify(ids)) } catch {} }, [])

  // Signed-in favourites: DB-backed lists. Anonymous visitors keep the flat localStorage arrays above.
  const [savedIds, setSavedIds] = useState(new Set())
  const [myLists, setMyLists] = useState([])
  const [pickerFor, setPickerFor] = useState(null) // { id, name } — set while the "which list?" modal is open
  useEffect(() => {
    if (!user) { setSavedIds(new Set()); setMyLists([]); return }
    let alive = true
    Promise.all([fetchSavedProviderIds(user.id), fetchLists(user.id)]).then(([ids, lists]) => {
      if (alive) { setSavedIds(ids); setMyLists(lists) }
    })
    return () => { alive = false }
  }, [user])

  const isFavId = useCallback(id => user ? savedIds.has(id) : (favs.includes(id) || favDocs.includes(id)), [user, savedIds, favs, favDocs])
  const nameForId = useCallback(id => providers.find(x => x.id === id)?.name || doctors.find(x => x.id === id)?.name || '', [providers, doctors])

  const handleFav = useCallback(async (id) => {
    if (!user) {
      if (favs.includes(id)) { saveFavs(favs.filter(f => f !== id)); return }
      if (favDocs.includes(id)) { saveFavDocs(favDocs.filter(f => f !== id)); return }
      saveFavs([...favs, id])
      return
    }
    if (savedIds.has(id)) {
      const ok = await removeFromAllLists(user.id, id)
      if (ok) setSavedIds(prev => { const n = new Set(prev); n.delete(id); return n })
      return
    }
    if (myLists.length === 0) {
      const ok = await addToList(user.id, id)
      if (ok) { setSavedIds(prev => new Set(prev).add(id)); fetchLists(user.id).then(setMyLists) }
      return
    }
    setPickerFor({ id, name: nameForId(id) })
  }, [user, favs, favDocs, saveFavs, saveFavDocs, savedIds, myLists, nameForId])

  const favCount = user ? savedIds.size : favs.length + favDocs.length

  // Deep-link: /search?id=123 opens that provider's listing directly. Search BOTH clinics and doctors.
  // Handle initial load AND subsequent URL changes (client-side navigation from doctor→clinic→doctor links).
  useEffect(() => {
    if (typeof window === 'undefined' || (!providers.length && !doctors.length)) return
    const resolve = () => {
      const pid = new URLSearchParams(window.location.search).get('id')
      if (!pid) { setView('search'); setSel(null); return }
      const p = providers.find(x => String(x.id) === String(pid)) || doctors.find(x => String(x.id) === String(pid))
      if (p) { setSel(p); setView('detail'); window.scrollTo({ top: 0, behavior: 'instant' }) }
    }
    resolve()
    const onPop = () => resolve()
    window.addEventListener('popstate', onPop)
    // Also poll for URL changes triggered by Next.js Link clicks that don't fire popstate
    let lastSearch = window.location.search
    const iv = setInterval(() => {
      if (window.location.search !== lastSearch) {
        lastSearch = window.location.search
        resolve()
      }
    }, 100)
    return () => { window.removeEventListener('popstate', onPop); clearInterval(iv) }
  }, [providers, doctors])

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
    let r = showFavs ? providers.filter(p => isFavId(p.id)) : providers
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
    if (search.trim()) { const words = search.toLowerCase().split(/\s+/).filter(Boolean); r = r.filter(p => { const hay = [p.name, p.type, p.address||"", ...(p.services||[]), ...(p.doctors||[])].join(" ").toLowerCase(); return words.every(w => hay.includes(w)) }) }
    if (sort==="name") r=[...r].sort((a,b)=>a.name.localeCompare(b.name))
    if (sort==="rating") r=[...r].sort((a,b)=>(Number(b.rating)||0)-(Number(a.rating)||0))
    if (sort==="wait") r=[...r].sort((a,b)=>(a.wait_weeks??999)-(b.wait_weeks??999))
    if (sort==="reviews") r=[...r].sort((a,b)=>(b.reviews||0)-(a.reviews||0))
    if (sort==="distance") r=[...r].sort((a,b)=>distKm(CENTER.lat,CENTER.lng,a.lat,a.lng)-distKm(CENTER.lat,CENTER.lng,b.lat,b.lng))
    return r
  }, [search,cat,spec,svc,lang,acc,on,we,ev,mw,mr,md,sort,showFavs,favs,favDocs,savedIds,user,providers,provSpecialty])

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
      wait_weeks: doc.wait_weeks, languages: doc.languages || [], rating: doc.rating, reviews: doc.reviews, verified: doc.verified,
      category: doc.category || specCatMap[doc.specialty_code] || (/famil/i.test(doc.specialty || '') ? 'Family Medicine' : 'Specialist'),
      clinicName: c?.name || null, lat: c?.lat, lng: c?.lng, hours: doc.hours || c?.hours, services: c?.services || [],
      address: doc.address || c?.address || null, phone: doc.phone || c?.phone || null, fax: doc.fax || c?.fax || null,
    }
  }), [doctors, specCatMap])

  const filteredDoctors = useMemo(() => {
    if (showFavs) return doctorCards.filter(d => isFavId(d.id))
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
    if (search.trim()) { const words = search.toLowerCase().split(/\s+/).filter(Boolean); r = r.filter(d => { const hay = [d.name||"", d.specialty||"", d.clinicName||""].join(" ").toLowerCase(); return words.every(w => hay.includes(w)) }) }
    const far = (d) => (d.lat && d.lng) ? distKm(CENTER.lat, CENTER.lng, d.lat, d.lng) : 99999
    if (sort === "name") r = [...r].sort((a,b) => a.name.localeCompare(b.name))
    else if (sort === "wait") r = [...r].sort((a,b) => (a.wait_weeks ?? 999) - (b.wait_weeks ?? 999))
    else if (sort === "distance") r = [...r].sort((a,b) => far(a) - far(b))
    return r
  }, [doctorCards,cat,spec,svc,lang,acc,on,we,ev,mw,mr,md,search,sort,showFavs,favDocs,favs,savedIds,user])

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
      <TopNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {view === "detail" && sel ? <Detail p={sel} onBack={() => router.back()} isFav={isFavId(sel.id)} onFav={handleFav} /> : (
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
                  <button key={c.key} onClick={() => { setCat(c.key); setSpec(""); setShowFavs(false); setPage(1) }} className={`px-4 py-2 text-xs font-bold rounded-full border transition ${cat===c.key&&!showFavs ? 'bg-white text-brand border-white' : 'bg-white/10 text-white border-white/25 hover:bg-white/20'}`}>{c.label}</button>
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
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { setShowFavs(!showFavs); setView("search"); setSel(null) }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${showFavs ? 'bg-brand text-white border-brand' : 'bg-white text-gray-500 border-gray-300 hover:border-brand'}`}>
                      ★ Favourites {favCount > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${showFavs ? 'bg-white/20' : 'bg-brand text-white'}`}>{favCount}</span>}
                    </button>
                    <select value={sort} onChange={e => setSort(e.target.value)} className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-md px-2 py-1.5 outline-none focus:border-brand">
                      <option value="distance">Sort: Distance</option><option value="rating">Rating</option><option value="wait">Wait time</option><option value="name">Name</option><option value="reviews">Reviews</option>
                    </select>
                  </div>
                </div>

                {showFavs && favCount === 0 && <div className="text-center py-16 text-gray-400 text-sm"><div className="text-4xl mb-3">☆</div><p className="font-semibold text-gray-600 mb-1">No favourites yet</p>Click the star on any provider or doctor to save them here.</div>}

                <div className="flex flex-col gap-2.5">
                  {!showFavs && totalCount === 0 && (
                    <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="font-semibold text-gray-700 mb-1">No matches for your filters</p>
                      <p className="text-sm text-gray-400 mb-4">Try removing a filter or searching a nearby area.</p>
                      <button onClick={() => { setSearch(''); setSpec(''); setSvc(''); setLang(''); setAcc(false); setOn(false); setWe(false); setEv(false); setCat('all'); setPage(1) }} className="text-xs font-semibold text-brand bg-brand/5 border border-brand/15 px-4 py-2 rounded-lg hover:bg-brand/10 transition">Clear all filters</button>
                    </div>
                  )}
                  {/* Interleave featured providers into results at positions 1, 3, 8, 13, 18, 23... */}
                  {(() => {
                    // Compute positions (0-indexed): 0, 2, 7, 12, 17, 22... = 1, 3, 8, 13, 18, 23 (1-indexed)
                    const featuredPositions = [0, 2, 7, 12, 17, 22, 27, 32, 37, 42]
                    // Featured items relevant to current category (or all if cat === 'all')
                    const featuredForCat = featuredMix.filter(f => {
                      if (showFavs || totalCount === 0) return false
                      if (cat === 'all') return true
                      const isDoctor = f.category === 'Specialist' || f.category === 'Family Medicine'
                      if (cat === 'Family Medicine') return f.category === 'Family Medicine'
                      if (cat === 'Specialist') return isDoctor
                      return f.category === cat
                    })
                    // Only exclude featured that are already in pageItems (avoid duplicate visual)
                    const pageItemIds = new Set(pageItems.map(i => i.id))
                    const featuredPool = featuredForCat.filter(f => !pageItemIds.has(f.id))
                    // Build interleaved list
                    const output = []
                    let featuredIdx = 0
                    let resultIdx = 0
                    let outputIdx = 0
                    while (resultIdx < pageItems.length || (featuredIdx < featuredPool.length && featuredPositions.includes(outputIdx))) {
                      if (featuredPositions.includes(outputIdx) && featuredIdx < featuredPool.length) {
                        const f = featuredPool[featuredIdx++]
                        const isDoc = f.category === 'Specialist' || f.category === 'Family Medicine'
                        output.push({ ...f, _t: isDoc ? 'doc' : 'prov', _sponsored: true, specialty: f.type || f.category })
                      } else if (resultIdx < pageItems.length) {
                        output.push(pageItems[resultIdx++])
                      }
                      outputIdx++
                      if (output.length > 100) break // safety
                    }
                    return output.map((x, i) => {
                      if (x._t === 'doc') {
                        return <DoctorCard key={(x._sponsored ? 'feat-' : '') + 'doc-' + x.id + '-' + i} d={x} isFav={isFavId(x.id)} onFav={handleFav} sponsored={x._sponsored} />
                      }
                      return <Card key={(x._sponsored ? 'feat-' : '') + 'prov-' + x.id + '-' + i} p={x} onSelect={pr => { window.history.pushState(null, '', `/search?id=${pr.id}`); setSel(pr); setView("detail"); window.scrollTo({ top: 0, behavior: 'instant' }) }} isFav={isFavId(x.id)} onFav={handleFav} sponsored={x._sponsored} />
                    })
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

      {pickerFor && (
        <ListPickerModal
          userId={user.id}
          lists={myLists}
          providerId={pickerFor.id}
          providerName={pickerFor.name}
          onClose={() => setPickerFor(null)}
          onSaved={(listId, newList) => {
            setSavedIds(prev => new Set(prev).add(pickerFor.id))
            if (newList) setMyLists(prev => [...prev, newList])
            setPickerFor(null)
          }}
        />
      )}
    </div>
  )
}

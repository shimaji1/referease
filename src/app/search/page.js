'use client'
import { useState, useMemo, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { CATEGORIES } from "@/data/providers"
import Link from 'next/link'
import ProfileHeader from '@/components/ProfileHeader'

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
  'Family Medicine': 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'Specialist': 'text-purple-700 bg-purple-50 border-purple-200',
  'Multi-Specialty': 'text-indigo-700 bg-indigo-50 border-indigo-200',
  'Clinic': 'text-blue-700 bg-blue-50 border-blue-200',
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
  const B = ({ title, children }) => <div className="bg-white border border-gray-200 rounded-2xl p-5"><h4 className="text-xs font-bold uppercase tracking-wider text-brand/60 mb-3">{title}</h4>{children}</div>
  const R = ({ l, v, href }) => { const val = href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand font-semibold text-right break-words hover:underline">{v}</a> : <span className="text-gray-900 font-medium text-right break-words">{v}</span>; return <div className="flex justify-between py-1.5 text-sm gap-2 border-b border-gray-50 last:border-0"><span className="text-gray-400 shrink-0">{l}</span>{val}</div> }
  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="text-sm text-brand font-semibold mb-4 hover:underline">← Back to results</button>

      <ProfileHeader
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
        footer={p.rating ? <div className="flex items-center gap-2 mt-3 justify-center"><Stars r={p.rating} /><span className="text-xs text-gray-400">{Number(p.rating).toFixed(1)} · {p.reviews} reviews</span></div> : null}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <B title="Contact & Location">
          <R l="Address" v={p.address || '—'} href={p.address ? `https://maps.google.com/?q=${encodeURIComponent(p.address)}` : null} />
          {p.phone && <R l="Phone" v={p.phone} href={`tel:${p.phone}`} />}
          {p.fax && <R l="Fax" v={p.fax} />}
          {p.email && <R l="Email" v={p.email} href={`mailto:${p.email}`} />}
          {p.website && <R l="Website" v={p.website.replace(/^https?:\/\//, '')} href={p.website.startsWith('http') ? p.website : `https://${p.website}`} />}
          <R l="Languages" v={(p.languages || ['English']).join(', ')} />
        </B>
        <B title="Hours">{p.hours && DAYS.map((d,i) => { const todayName = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()]; const isToday = d === todayName; return <div key={d} className={`flex justify-between py-1.5 text-sm gap-2 border-b border-gray-50 last:border-0 ${isToday ? 'font-bold' : ''}`}><span className={isToday ? 'text-brand' : 'text-gray-400'}>{DAY_LABELS[i].slice(0,3)}{isToday ? ' · Today' : ''}</span><span className={p.hours[d] ? 'text-gray-900 font-medium' : 'text-gray-300'}>{p.hours[d] || 'Closed'}</span></div> })}</B>
        <B title="Referral Info">
          <R l="Wait" v={p.wait_weeks === null ? 'Varies' : p.wait_weeks === 0 ? 'No wait' : `~${p.wait_weeks} week${p.wait_weeks > 1 ? 's' : ''}`} />
          <R l="Requirements" v={p.requirements || '—'} />
        </B>
        {(docs.length > 0 || p.doctors?.length > 0) && <B title="Physicians">
          {docs.length > 0
            ? docs.map(d => <Link key={d.id} href={`/doctors/${d.id}`} className="flex items-center justify-between py-2 text-sm border-b border-gray-50 last:border-0 group"><span className="text-gray-900 group-hover:text-brand font-semibold">{d.name}{d.specialty ? ` — ${d.specialty}` : ''}</span><span className="text-gray-300 group-hover:text-brand">→</span></Link>)
            : p.doctors.map((d, i) => <div key={i} className="py-2 text-sm text-gray-900 border-b border-gray-50 last:border-0">{d}</div>)}
        </B>}
        {pforms.length > 0 && <B title="Forms">
          {pforms.map(f => <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-2 text-sm border-b border-gray-50 last:border-0 group"><span className="text-gray-900 group-hover:text-brand font-medium">📄 {f.name}</span><span className="text-brand font-semibold group-hover:underline shrink-0">Download</span></a>)}
        </B>}
        {p.services?.length > 0 && <B title="Services"><div className="flex flex-wrap gap-1.5">{p.services.map(s => <span key={s} className="text-xs text-brand bg-brand/5 border border-brand/10 px-2.5 py-1 rounded-md">{s}</span>)}</div></B>}
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
        const [prov, docs, specs] = await Promise.all([
          supabase.from("providers").select("*").eq("data_status", "complete").order("name"),
          supabase.from("physicians").select("id, name, specialty, specialty_code, gender, category, accepting_referrals, accepting_new_patients, wait_weeks, languages, rating, verified, hours, physician_locations(is_primary, providers(id, name, address, lat, lng, hours, services))").eq("status", "active"),
          supabase.from("specialties").select("snomed_code, category, name"),
        ])
        if (prov.data) setProviders(prov.data)
        if (docs.data) setDoctors(docs.data)
        if (specs.data) setSpecialties(specs.data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => { try { const s = localStorage.getItem("re-favs"); if (s) setFavs(JSON.parse(s)) } catch {} }, [])
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
    if (acc) r = r.filter(p => p.accepting_referrals)
    if (on) r = r.filter(p => isOpenNow(p.hours))
    if (we) r = r.filter(p => isOpenWeekends(p.hours))
    if (ev) r = r.filter(p => isOpenEvenings(p.hours))
    if (mw) r = r.filter(p => p.wait_weeks !== null && p.wait_weeks <= parseInt(mw))
    if (mr) r = r.filter(p => p.rating && Number(p.rating) >= parseFloat(mr))
    if (md) r = r.filter(p => distKm(CENTER.lat,CENTER.lng,p.lat,p.lng) <= parseFloat(md))
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(p => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || (p.address||"").toLowerCase().includes(q) || (p.services||[]).some(s => s.toLowerCase().includes(q)) || (p.doctors||[]).some(d => d.toLowerCase().includes(q))) }
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
    if (acc) r = r.filter(d => d.accepting_referrals)
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
        {view === "detail" && sel ? <Detail p={sel} onBack={() => setView("search")} isFav={favs.includes(sel.id)} onFav={toggleFav} /> : (
          <>
            <div className="relative mb-3">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, specialty, doctor, service, or address…" className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400" />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            <div className="flex gap-1.5 flex-wrap mb-3">
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => { setCat(c.key); setSpec(""); setShowFavs(false) }} className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${cat===c.key&&!showFavs ? 'bg-brand text-white border-brand' : 'bg-white text-gray-500 border-gray-200 hover:border-brand/40'}`}>{c.icon} {c.label}</button>
              ))}
            </div>

            <div className="flex gap-2 items-center mb-3">
              <button onClick={() => setShowF(!showF)} className="text-xs font-semibold text-brand flex items-center gap-1">{showF ? '▾' : '▸'} Filters {activeF > 0 && <span className="bg-brand text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeF}</span>}</button>
              {activeF > 0 && <button onClick={clearF} className="text-[11px] text-red-500 font-medium">Clear all</button>}
              <div className="ml-auto flex gap-2 items-center">
                <select value={sort} onChange={e => setSort(e.target.value)} className={sel_s + " max-w-[150px]"}>
                  <option value="name">Sort: Name</option><option value="rating">Sort: Rating</option><option value="wait">Sort: Wait time</option><option value="reviews">Sort: Reviews</option><option value="distance">Sort: Distance</option>
                </select>
                <span className="text-[11px] text-gray-400 whitespace-nowrap">{filtered.length + filteredDoctors.length} result{(filtered.length + filteredDoctors.length)!==1?'s':''}</span>
              </div>
            </div>

            {showF && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 animate-fade-in">
                <div className="flex flex-wrap gap-2 mb-2.5">
                  <select value={spec} onChange={e => setSpec(e.target.value)} className={sel_s}><option value="">All specialties</option>{allSpecialties.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  <select value={svc} onChange={e => setSvc(e.target.value)} className={sel_s}><option value="">All services</option>{allServices.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  <select value={lang} onChange={e => setLang(e.target.value)} className={sel_s}><option value="">Any language</option>{allLanguages.map(l => <option key={l} value={l}>{l}</option>)}</select>
                </div>
                <div className="flex flex-wrap gap-2 mb-2.5">
                  <select value={mw} onChange={e => setMw(e.target.value)} className={sel_s}><option value="">Any wait</option><option value="0">No wait</option><option value="1">≤ 1 wk</option><option value="2">≤ 2 wks</option><option value="4">≤ 4 wks</option><option value="8">≤ 8 wks</option><option value="12">≤ 12 wks</option></select>
                  <select value={mr} onChange={e => setMr(e.target.value)} className={sel_s}><option value="">Any rating</option><option value="4.5">4.5+</option><option value="4">4+</option><option value="3.5">3.5+</option><option value="3">3+</option></select>
                  <select value={md} onChange={e => setMd(e.target.value)} className={sel_s}><option value="">Any distance</option><option value="2">2 km</option><option value="5">5 km</option><option value="10">10 km</option><option value="15">15 km</option><option value="25">25 km</option></select>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className={chk_s}><input type="checkbox" checked={acc} onChange={e => setAcc(e.target.checked)} className="accent-brand w-3.5 h-3.5" /> Accepting referrals</label>
                  <label className={chk_s}><input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} className="accent-brand w-3.5 h-3.5" /> Open now</label>
                  <label className={chk_s}><input type="checkbox" checked={we} onChange={e => setWe(e.target.checked)} className="accent-brand w-3.5 h-3.5" /> Weekends</label>
                  <label className={chk_s}><input type="checkbox" checked={ev} onChange={e => setEv(e.target.checked)} className="accent-brand w-3.5 h-3.5" /> Evenings</label>
                </div>
              </div>
            )}

            {showFavs && favs.length === 0 && favDocs.length === 0 && <div className="text-center py-16 text-gray-400 text-sm"><div className="text-4xl mb-3">☆</div><p className="font-semibold text-gray-600 mb-1">No favourites yet</p>Click the star on any provider or doctor to save them here.</div>}
            
            <div className="flex flex-col gap-2.5">
              {!showFavs && filtered.length === 0 && filteredDoctors.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">No doctors or clinics match your filters.</div>}
              {filteredDoctors.map(d => <DoctorCard key={'doc-' + d.id} d={d} isFav={favDocs.includes(d.id)} onFav={toggleFavDoc} />)}
              {filtered.map(p => <Card key={p.id} p={p} onSelect={pr => { setSel(pr); setView("detail") }} isFav={favs.includes(p.id)} onFav={toggleFav} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

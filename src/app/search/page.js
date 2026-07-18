'use client'
import { useState, useMemo, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { CATEGORIES } from "@/data/providers"
import Link from 'next/link'

const DAYS = ["sun","mon","tue","wed","thu","fri","sat"]
const DAY_LABELS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]

function getDayName() { return DAYS[new Date().getDay()] }
function getCurrentTime() { const d = new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}` }
function isOpenNow(h) { if (!h) return false; const day = getDayName(); const s = h[day]; if (!s) return false; const now = getCurrentTime(); const [o,c] = s.split("-"); return c === "24:00" ? now >= o : now >= o && now < c }
function isOpenWeekends(h) { if (!h) return false; return !!(h.sat || h.sun) }
function isOpenEvenings(h) { if (!h) return false; return Object.values(h).some(s => { if (!s) return false; return s.split("-")[1] > "18:00" }) }
function distKm(a,b,c,d) { const R=6371,dL=(c-a)*Math.PI/180,dG=(d-b)*Math.PI/180,x=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dG/2)**2; return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)) }
const CENTER = { lat: 43.810, lng: -79.430 }

function WaitBadge({ weeks }) {
  if (weeks === null || weeks === undefined) return null
  const cls = weeks === 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : weeks <= 2 ? 'text-amber-700 bg-amber-50 border-amber-200' : weeks <= 6 ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-red-700 bg-red-50 border-red-200'
  const label = weeks === 0 ? 'No wait' : weeks === 1 ? '~1 wk' : `~${weeks} wks`
  return <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
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
        <h3 className="font-semibold text-gray-900 text-[14px] leading-snug">{p.name}</h3>
        <p className="text-xs text-brand/80 font-medium mt-0.5">{p.type}</p>
        <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
          {p.accepting_referrals
            ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Accepting</span>
            : <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Not Accepting</span>}
          <WaitBadge weeks={p.wait_weeks} />
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${open ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>{open ? 'Open now' : 'Closed'}</span>
          <span className="text-[10px] text-gray-400">{dist} km</span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 text-xs text-gray-500">
          <span>📍 {p.address}</span>
          {p.phone && <span>📞 {p.phone}</span>}
          {p.fax && <span>📠 {p.fax}</span>}
        </div>
        {p.rating && <div className="flex gap-2 items-center mt-2.5"><Stars r={p.rating} /><span className="text-[10px] text-gray-400">({p.reviews})</span></div>}
      </button>
    </div>
  )
}

function Detail({ p, onBack, isFav, onFav }) {
  const dist = distKm(CENTER.lat, CENTER.lng, p.lat, p.lng).toFixed(1)
  const open = isOpenNow(p.hours)
  const B = ({ title, children }) => <div className="bg-white border border-gray-200 rounded-xl p-4"><h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{title}</h4>{children}</div>
  const R = ({ l, v }) => <div className="flex justify-between py-1 text-xs gap-2"><span className="text-gray-400 shrink-0">{l}</span><span className="text-gray-900 font-medium text-right break-words">{v}</span></div>
  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="text-sm text-brand font-medium mb-4 hover:underline">← Back to results</button>
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{p.name}</h2>
            <p className="text-sm text-brand font-medium mt-1">{p.type}</p>
          </div>
          <button onClick={() => onFav(p.id)} className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${isFav ? 'bg-brand text-white border-brand' : 'bg-white text-gray-500 border-gray-300 hover:border-brand'}`}>{isFav ? '★ Favourited' : '☆ Add to Favourites'}</button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          {p.rating && <Stars r={p.rating} />}
          {p.rating && <span className="text-[10px] text-gray-400">({p.reviews} reviews)</span>}
          {p.accepting_referrals ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">Accepting Referrals</span> : <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">Not Accepting</span>}
          <WaitBadge weeks={p.wait_weeks} />
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${open ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>{open ? 'Open now' : 'Closed'}</span>
          <span className="text-xs text-gray-400">{dist} km</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <B title="Contact & Location">
          <R l="Address" v={p.address || '—'} />
          {p.phone && <R l="Phone" v={p.phone} />}
          {p.fax && <R l="Fax" v={p.fax} />}
          {p.website && <R l="Website" v={p.website} />}
          <R l="Languages" v={(p.languages || ['English']).join(', ')} />
        </B>
        <B title="Hours">{p.hours && DAYS.map((d,i) => <R key={d} l={DAY_LABELS[i].slice(0,3)} v={p.hours[d] || 'Closed'} />)}</B>
        <B title="Referral Info">
          <R l="Wait" v={p.wait_weeks === null ? 'Varies' : p.wait_weeks === 0 ? 'No wait' : `~${p.wait_weeks} week${p.wait_weeks > 1 ? 's' : ''}`} />
          <R l="Requirements" v={p.requirements || '—'} />
        </B>
        {p.doctors?.length > 0 && <B title="Physicians">{p.doctors.map((d,i) => <div key={i} className="py-1 text-xs text-gray-900 border-b border-gray-100 last:border-0">{d}</div>)}</B>}
        {p.services?.length > 0 && <B title="Services"><div className="flex flex-wrap gap-1">{p.services.map(s => <span key={s} className="text-[11px] text-brand bg-brand/5 border border-brand/10 px-2 py-0.5 rounded-md">{s}</span>)}</div></B>}
      </div>
    </div>
  )
}

export default function SearchPage() {
  const [providers, setProviders] = useState([])
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
  const [showFavs, setShowFavs] = useState(false)
  const [showF, setShowF] = useState(false)

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return }
      try {
        const { data } = await supabase.from("providers").select("*").order("name")
        if (data) setProviders(data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => { try { const s = localStorage.getItem("re-favs"); if (s) setFavs(JSON.parse(s)) } catch {} }, [])
  const saveFavs = useCallback(ids => { setFavs(ids); try { localStorage.setItem("re-favs", JSON.stringify(ids)) } catch {} }, [])
  const toggleFav = useCallback(id => saveFavs(favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id]), [favs, saveFavs])

  const allSpecialties = useMemo(() => [...new Set(providers.map(p => p.type))].sort(), [providers])
  const allServices = useMemo(() => [...new Set(providers.flatMap(p => p.services || []))].sort(), [providers])
  const allLanguages = useMemo(() => [...new Set(providers.flatMap(p => p.languages || []))].sort(), [providers])
  const activeF = useMemo(() => [acc,on,we,ev,mw,mr,md,svc,lang].filter(Boolean).length, [acc,on,we,ev,mw,mr,md,svc,lang])

  const filtered = useMemo(() => {
    let r = showFavs ? providers.filter(p => favs.includes(p.id)) : providers
    if (cat !== "all") r = r.filter(p => p.category === cat)
    if (spec) r = r.filter(p => p.type === spec)
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
  }, [search,cat,spec,svc,lang,acc,on,we,ev,mw,mr,md,sort,showFavs,favs,providers])

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
            <span className="text-lg font-bold text-gray-900">Refer<span className="text-brand">Ease</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={() => { setShowFavs(!showFavs); setView("search"); setSel(null) }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${showFavs ? 'bg-brand text-white border-brand' : 'bg-white text-gray-500 border-gray-300 hover:border-brand'}`}>
              ★ Favourites {favs.length > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${showFavs ? 'bg-white/20' : 'bg-brand text-white'}`}>{favs.length}</span>}
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
                <span className="text-[11px] text-gray-400 whitespace-nowrap">{filtered.length} result{filtered.length!==1?'s':''}</span>
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

            {showFavs && favs.length === 0 && <div className="text-center py-16 text-gray-400 text-sm"><div className="text-4xl mb-3">☆</div><p className="font-semibold text-gray-600 mb-1">No favourites yet</p>Click the star on any provider to save them here.</div>}
            
            <div className="flex flex-col gap-2.5">
              {!showFavs && filtered.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">No providers match your filters.</div>}
              {filtered.map(p => <Card key={p.id} p={p} onSelect={pr => { setSel(pr); setView("detail") }} isFav={favs.includes(p.id)} onFav={toggleFav} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

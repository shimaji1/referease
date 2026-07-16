'use client'
import { useState, useMemo, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { CATEGORIES } from "@/data/providers"

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
  const color = weeks === 0 ? "var(--green)" : weeks <= 2 ? "var(--amber)" : weeks <= 6 ? "var(--orange)" : "var(--red)"
  const label = weeks === 0 ? "No wait" : weeks === 1 ? "~1 wk" : `~${weeks} wks`
  return <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:"999px", fontSize:"10.5px", fontWeight:600, background:color+"18", color, border:`1px solid ${color}40` }}>{label}</span>
}

function Stars({ r }) {
  if (!r) return null
  const f = Math.floor(r), h = r-f >= 0.3
  return <span style={{ fontSize:"12px", letterSpacing:"1px", color:"#f59e0b" }}>{"★".repeat(f)}{h?"½":""}{"☆".repeat(5-f-(h?1:0))}<span style={{ color:"var(--t3)", fontSize:"11px", marginLeft:"3px" }}>{r}</span></span>
}

function Pill({ children, color = "var(--ac)" }) {
  return <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:"999px", fontSize:"10px", fontWeight:600, background:color+"18", color, border:`1px solid ${color}30` }}>{children}</span>
}

function Card({ p, onSelect, isFav, onFav }) {
  const dist = distKm(CENTER.lat, CENTER.lng, p.lat, p.lng).toFixed(1)
  const open = isOpenNow(p.hours)
  return (
    <div style={{ background:"var(--c1)", border:`1px solid ${isFav ? "var(--ac)60" : "var(--bd)"}`, borderRadius:"12px", padding:"14px 16px", position:"relative" }}>
      <button onClick={() => onFav(p.id)} title={isFav ? "Remove favourite" : "Add favourite"} style={{ all:"unset", cursor:"pointer", position:"absolute", top:"12px", right:"12px", fontSize:"18px", color: isFav ? "#f59e0b" : "var(--t3)" }}>{isFav ? "★" : "☆"}</button>
      <button onClick={() => onSelect(p)} style={{ all:"unset", cursor:"pointer", display:"block", width:"calc(100% - 30px)" }}>
        <div style={{ fontSize:"14px", fontWeight:650, color:"var(--t1)", lineHeight:1.3 }}>{p.name}</div>
        <div style={{ fontSize:"11.5px", color:"var(--ac)", fontWeight:500, marginTop:"2px" }}>{p.type}</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginTop:"8px", alignItems:"center" }}>
          {p.accepting_referrals ? <Pill color="var(--green)">Accepting</Pill> : <Pill color="var(--red)">Not Accepting</Pill>}
          <WaitBadge weeks={p.wait_weeks} />
          <Pill color={open ? "var(--green)" : "#6b7280"}>{open ? "Open now" : "Closed"}</Pill>
          <span style={{ fontSize:"10.5px", color:"var(--t3)" }}>{dist} km</span>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginTop:"8px", fontSize:"11.5px", color:"var(--t3)" }}>
          <span>📍 {p.address}</span>
          {p.phone && <span>📞 {p.phone}</span>}
          {p.fax && <span>📠 {p.fax}</span>}
        </div>
        {p.rating && <div style={{ display:"flex", gap:"8px", alignItems:"center", marginTop:"8px" }}><Stars r={Number(p.rating)} /><span style={{ fontSize:"10.5px", color:"var(--t3)" }}>({p.reviews})</span></div>}
      </button>
    </div>
  )
}

function Detail({ p, onBack, isFav, onFav }) {
  const dist = distKm(CENTER.lat, CENTER.lng, p.lat, p.lng).toFixed(1)
  const open = isOpenNow(p.hours)
  const B = ({ title, children }) => <div style={{ background:"var(--c1)", border:"1px solid var(--bd)", borderRadius:"10px", padding:"14px" }}><div style={{ fontSize:"10px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--t3)", marginBottom:"8px" }}>{title}</div>{children}</div>
  const R = ({ l, v }) => <div style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", fontSize:"12px", gap:"10px" }}><span style={{ color:"var(--t3)", flexShrink:0 }}>{l}</span><span style={{ color:"var(--t1)", fontWeight:500, textAlign:"right", wordBreak:"break-word" }}>{v}</span></div>
  return (
    <div style={{ animation:"fadeIn 0.2s ease" }}>
      <button onClick={onBack} style={{ all:"unset", cursor:"pointer", fontSize:"13px", color:"var(--ac)", fontWeight:500, marginBottom:"16px" }}>← Back</button>
      <div style={{ background:"var(--c1)", border:"1px solid var(--bd)", borderRadius:"14px", padding:"20px", marginBottom:"14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"10px" }}>
          <div style={{ flex:1, minWidth:"200px" }}>
            <h2 style={{ margin:0, fontSize:"20px", fontWeight:700, lineHeight:1.2 }}>{p.name}</h2>
            <div style={{ fontSize:"13px", color:"var(--ac)", fontWeight:500, marginTop:"3px" }}>{p.type}</div>
          </div>
          <button onClick={() => onFav(p.id)} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"999px", fontSize:"13px", fontWeight:600, background:isFav?"var(--ac)":"var(--c1)", color:isFav?"#fff":"var(--t3)", border:`1px solid ${isFav?"var(--ac)":"var(--bd)"}` }}>{isFav ? "★ Favourited" : "☆ Add to Favourites"}</button>
        </div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center", marginTop:"12px", flexWrap:"wrap" }}>
          {p.rating && <><Stars r={Number(p.rating)} /><span style={{ fontSize:"11px", color:"var(--t3)" }}>({p.reviews} reviews)</span></>}
          {p.accepting_referrals ? <Pill color="var(--green)">Accepting Referrals</Pill> : <Pill color="var(--red)">Not Accepting</Pill>}
          <WaitBadge weeks={p.wait_weeks} />
          <Pill color={open ? "var(--green)" : "#6b7280"}>{open ? "Open now" : "Closed"}</Pill>
          <span style={{ fontSize:"11px", color:"var(--t3)" }}>{dist} km</span>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:"10px" }}>
        <B title="Contact & Location">
          <R l="Address" v={p.address || "—"} />
          {p.phone && <R l="Phone" v={p.phone} />}
          {p.fax && <R l="Fax" v={p.fax} />}
          {p.website && <R l="Website" v={p.website} />}
          <R l="Languages" v={(p.languages || ["English"]).join(", ")} />
        </B>
        <B title="Hours">{p.hours && DAYS.map((d,i) => <R key={d} l={DAY_LABELS[i].slice(0,3)} v={p.hours[d] || "Closed"} />)}</B>
        <B title="Referral Info">
          <R l="Wait" v={p.wait_weeks === null ? "Varies" : p.wait_weeks === 0 ? "No wait" : `~${p.wait_weeks} week${p.wait_weeks > 1 ? "s" : ""}`} />
          <R l="Requirements" v={p.requirements || "—"} />
        </B>
        {p.doctors && p.doctors.length > 0 && <B title="Physicians">{p.doctors.map((d,i) => <div key={i} style={{ padding:"4px 0", fontSize:"12.5px", borderBottom:i<p.doctors.length-1?"1px solid var(--bd)":"none" }}>{d}</div>)}</B>}
        {p.services && p.services.length > 0 && <B title="Services"><div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>{p.services.map(s => <span key={s} style={{ padding:"3px 8px", borderRadius:"6px", fontSize:"11px", background:"var(--ac)15", color:"var(--ac)", border:"1px solid var(--ac)25" }}>{s}</span>)}</div></B>}
      </div>
    </div>
  )
}

export default function ReferEaseApp() {
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

  // Load providers from Supabase
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from("providers").select("*").order("name")
      if (data) setProviders(data)
      setLoading(false)
    }
    load()
  }, [])

  // Load favourites from localStorage
  useEffect(() => { try { const s = localStorage.getItem("re-favs"); if (s) setFavs(JSON.parse(s)) } catch {} }, [])
  const saveFavs = useCallback(ids => { setFavs(ids); try { localStorage.setItem("re-favs", JSON.stringify(ids)) } catch {} }, [])
  const toggleFav = useCallback(id => saveFavs(favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id]), [favs, saveFavs])

  // Dynamic filter options from loaded data
  const allSpecialties = useMemo(() => [...new Set(providers.map(p => p.type))].sort(), [providers])
  const allServices = useMemo(() => [...new Set(providers.flatMap(p => p.services || []))].sort(), [providers])
  const allLanguages = useMemo(() => [...new Set(providers.flatMap(p => p.languages || []))].sort(), [providers])

  const activeF = useMemo(() => [acc,on,we,ev,mw,mr,md,svc,lang].filter(Boolean).length, [acc,on,we,ev,mw,mr,md,svc,lang])

  const filtered = useMemo(() => {
    let r = showFavs ? providers.filter(p => favs.includes(p.id)) : providers
    if (cat !== "all") r = r.filter(p => p.category === cat)
    if (spec) r = r.filter(p => p.type === spec)
    if (svc) r = r.filter(p => (p.services || []).includes(svc))
    if (lang) r = r.filter(p => (p.languages || []).includes(lang))
    if (acc) r = r.filter(p => p.accepting_referrals)
    if (on) r = r.filter(p => isOpenNow(p.hours))
    if (we) r = r.filter(p => isOpenWeekends(p.hours))
    if (ev) r = r.filter(p => isOpenEvenings(p.hours))
    if (mw) r = r.filter(p => p.wait_weeks !== null && p.wait_weeks <= parseInt(mw))
    if (mr) r = r.filter(p => p.rating && Number(p.rating) >= parseFloat(mr))
    if (md) r = r.filter(p => distKm(CENTER.lat, CENTER.lng, p.lat, p.lng) <= parseFloat(md))
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(p => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || (p.address||"").toLowerCase().includes(q) || (p.services||[]).some(s => s.toLowerCase().includes(q)) || (p.doctors||[]).some(d => d.toLowerCase().includes(q))) }
    if (sort==="name") r=[...r].sort((a,b)=>a.name.localeCompare(b.name))
    if (sort==="rating") r=[...r].sort((a,b)=>(Number(b.rating)||0)-(Number(a.rating)||0))
    if (sort==="wait") r=[...r].sort((a,b)=>(a.wait_weeks??999)-(b.wait_weeks??999))
    if (sort==="reviews") r=[...r].sort((a,b)=>(b.reviews||0)-(a.reviews||0))
    if (sort==="distance") r=[...r].sort((a,b)=>distKm(CENTER.lat,CENTER.lng,a.lat,a.lng)-distKm(CENTER.lat,CENTER.lng,b.lat,b.lng))
    return r
  }, [search,cat,spec,svc,lang,acc,on,we,ev,mw,mr,md,sort,showFavs,favs,providers])

  const clearF = () => { setSpec(""); setSvc(""); setLang(""); setAcc(false); setOn(false); setWe(false); setEv(false); setMw(""); setMr(""); setMd("") }
  const sel_s = { padding:"6px 10px", fontSize:"11.5px", background:"var(--c1)", border:"1px solid var(--bd)", borderRadius:"7px", color:"var(--t1)", outline:"none", cursor:"pointer", flex:"1 1 120px", maxWidth:"200px" }
  const chk_s = { display:"flex", alignItems:"center", gap:"5px", fontSize:"11.5px", color:"var(--t3)", cursor:"pointer", whiteSpace:"nowrap" }

  if (loading) return <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"100vh", color:"var(--t3)", fontSize:"14px" }}>Loading providers...</div>

  return (
    <>
      <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--bd)", background:"linear-gradient(180deg, #111520 0%, var(--bg) 100%)" }}>
        <div style={{ maxWidth:"920px", margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}><span style={{ fontSize:"22px" }}>🔗</span><h1 style={{ margin:0, fontSize:"20px", fontWeight:750, letterSpacing:"-0.03em" }}>Refer<span style={{ color:"var(--ac)" }}>Ease</span></h1></div>
            <p style={{ margin:"2px 0 0", fontSize:"12px", color:"var(--t3)" }}>Find providers. Reduce rejections. — Ontario, Canada</p>
          </div>
          <button onClick={() => { setShowFavs(!showFavs); setView("search"); setSel(null) }} style={{ all:"unset", cursor:"pointer", padding:"7px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:showFavs?"var(--ac)":"var(--c1)", color:showFavs?"#fff":"var(--t3)", border:`1px solid ${showFavs?"var(--ac)":"var(--bd)"}`, display:"flex", alignItems:"center", gap:"5px" }}>
            ★ Favourites {favs.length > 0 && <span style={{ background:showFavs?"#ffffff30":"var(--ac)", color:"#fff", borderRadius:"999px", padding:"1px 6px", fontSize:"10px", fontWeight:700 }}>{favs.length}</span>}
          </button>
        </div>
      </div>
      <div style={{ maxWidth:"920px", margin:"0 auto", padding:"16px 20px" }}>
        {view === "detail" && sel ? <Detail p={sel} onBack={() => setView("search")} isFav={favs.includes(sel.id)} onFav={toggleFav} /> : (
          <>
            <div style={{ position:"relative", marginBottom:"12px" }}>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, specialty, doctor, service, or address…" style={{ width:"100%", padding:"11px 14px 11px 38px", fontSize:"13.5px", background:"var(--c1)", border:"1px solid var(--bd)", borderRadius:"10px", color:"var(--t1)", outline:"none" }} onFocus={e => e.target.style.borderColor="var(--ac)"} onBlur={e => e.target.style.borderColor="var(--bd)"} />
              <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", fontSize:"15px", opacity:0.5 }}>🔍</span>
            </div>
            <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", marginBottom:"10px" }}>
              {CATEGORIES.map(c => <button key={c.key} onClick={() => { setCat(c.key); setSpec(""); setShowFavs(false) }} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", fontSize:"11.5px", fontWeight:600, borderRadius:"999px", background:cat===c.key&&!showFavs?"var(--ac)":"var(--c1)", color:cat===c.key&&!showFavs?"#fff":"var(--t3)", border:`1px solid ${cat===c.key&&!showFavs?"var(--ac)":"var(--bd)"}` }}>{c.icon} {c.label}</button>)}
            </div>
            <div style={{ display:"flex", gap:"8px", alignItems:"center", marginBottom:showF?"10px":"14px" }}>
              <button onClick={() => setShowF(!showF)} style={{ all:"unset", cursor:"pointer", fontSize:"12px", fontWeight:600, color:"var(--ac)", display:"flex", alignItems:"center", gap:"4px" }}>{showF ? "▾" : "▸"} Filters {activeF > 0 && <span style={{ background:"var(--ac)", color:"#fff", borderRadius:"999px", padding:"1px 6px", fontSize:"10px" }}>{activeF}</span>}</button>
              {activeF > 0 && <button onClick={clearF} style={{ all:"unset", cursor:"pointer", fontSize:"11px", color:"var(--red)", fontWeight:500 }}>Clear all</button>}
              <div style={{ marginLeft:"auto", display:"flex", gap:"8px", alignItems:"center" }}>
                <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...sel_s, flex:"0 0 auto", maxWidth:"160px" }}>
                  <option value="name">Sort: Name</option><option value="rating">Sort: Rating</option><option value="wait">Sort: Wait time</option><option value="reviews">Sort: Reviews</option><option value="distance">Sort: Distance</option>
                </select>
                <span style={{ fontSize:"11px", color:"var(--t3)", whiteSpace:"nowrap" }}>{filtered.length} result{filtered.length!==1?"s":""}</span>
              </div>
            </div>
            {showF && (
              <div style={{ background:"var(--c1)", border:"1px solid var(--bd)", borderRadius:"10px", padding:"14px 16px", marginBottom:"14px", animation:"fadeIn 0.15s ease" }}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginBottom:"10px" }}>
                  <select value={spec} onChange={e => setSpec(e.target.value)} style={sel_s}><option value="">All specialties</option>{allSpecialties.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  <select value={svc} onChange={e => setSvc(e.target.value)} style={sel_s}><option value="">All services</option>{allServices.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  <select value={lang} onChange={e => setLang(e.target.value)} style={sel_s}><option value="">Any language</option>{allLanguages.map(l => <option key={l} value={l}>{l}</option>)}</select>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginBottom:"10px" }}>
                  <select value={mw} onChange={e => setMw(e.target.value)} style={sel_s}><option value="">Any wait time</option><option value="0">No wait</option><option value="1">≤ 1 week</option><option value="2">≤ 2 weeks</option><option value="4">≤ 4 weeks</option><option value="8">≤ 8 weeks</option><option value="12">≤ 12 weeks</option></select>
                  <select value={mr} onChange={e => setMr(e.target.value)} style={sel_s}><option value="">Any rating</option><option value="4.5">4.5+ stars</option><option value="4">4+ stars</option><option value="3.5">3.5+ stars</option><option value="3">3+ stars</option></select>
                  <select value={md} onChange={e => setMd(e.target.value)} style={sel_s}><option value="">Any distance</option><option value="2">Within 2 km</option><option value="5">Within 5 km</option><option value="10">Within 10 km</option><option value="15">Within 15 km</option><option value="25">Within 25 km</option></select>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"14px" }}>
                  <label style={chk_s}><input type="checkbox" checked={acc} onChange={e => setAcc(e.target.checked)} style={{ accentColor:"var(--ac)" }} /> Accepting referrals</label>
                  <label style={chk_s}><input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} style={{ accentColor:"var(--ac)" }} /> Open now</label>
                  <label style={chk_s}><input type="checkbox" checked={we} onChange={e => setWe(e.target.checked)} style={{ accentColor:"var(--ac)" }} /> Open weekends</label>
                  <label style={chk_s}><input type="checkbox" checked={ev} onChange={e => setEv(e.target.checked)} style={{ accentColor:"var(--ac)" }} /> Evening hours</label>
                </div>
              </div>
            )}
            {showFavs && favs.length === 0 && <div style={{ textAlign:"center", padding:"50px 20px", color:"var(--t3)", fontSize:"13px" }}><div style={{ fontSize:"36px", marginBottom:"10px" }}>☆</div><div style={{ fontWeight:600, color:"var(--t1)", marginBottom:"4px" }}>No favourites yet</div>Click the star on any provider to save them here.</div>}
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {!showFavs && filtered.length === 0 && <div style={{ textAlign:"center", padding:"50px 20px", color:"var(--t3)", fontSize:"13px" }}>No providers match your filters.</div>}
              {filtered.map(p => <Card key={p.id} p={p} onSelect={pr => { setSel(pr); setView("detail") }} isFav={favs.includes(p.id)} onFav={toggleFav} />)}
            </div>
            <div style={{ marginTop:"28px", padding:"16px", textAlign:"center", fontSize:"11px", color:"var(--t3)", lineHeight:1.6, borderTop:"1px solid var(--bd)" }}>
              <strong style={{ color:"var(--t1)" }}>ReferEase</strong> — {providers.length} providers · Thornhill & GTA, Ontario · Powered by Supabase
            </div>
          </>
        )}
      </div>
    </>
  )
}

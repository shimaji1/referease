'use client'
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

const CATS = ["Family Medicine","Clinic","Specialist","Hospital","Imaging","Lab","Physiotherapy","Rehab"]
const STATUSES = ["complete","partial","incomplete"]
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"]

const empty = () => ({ name:"", type:"", category:"Specialist", services:[], address:"", phone:"", fax:"", email:"", website:"", rating:null, reviews:0, hours:{mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null}, accepting_referrals:true, wait_weeks:null, requirements:"", doctors:[], languages:["English"], data_status:"complete", specialty_code:null })

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState("")
  const [providers, setProviders] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty())
  const [servicesText, setServicesText] = useState("")
  const [doctorsText, setDoctorsText] = useState("")
  const [languagesText, setLanguagesText] = useState("English")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [catFilter, setCatFilter] = useState("")
  const [msg, setMsg] = useState("")
  const [tab, setTab] = useState("list")
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({})
  const [claims, setClaims] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [specialties, setSpecialties] = useState([])
  const PAGE_SIZE = 50

  const login = () => {
    if (pw === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) { setAuthed(true); setMsg("") }
    else setMsg("Wrong password")
  }

  // Load specialties
  useEffect(() => {
    if (!supabase || !authed) return
    supabase.from('specialties').select('*').order('category_order').order('name').then(({ data }) => { if (data) setSpecialties(data) })
  }, [authed])

  const load = useCallback(async () => {
    if (!supabase) return
    let query = supabase.from("providers").select("*", { count: "exact" })
    if (search) query = query.or(`name.ilike.%${search}%,type.ilike.%${search}%,address.ilike.%${search}%`)
    if (statusFilter) query = query.eq("data_status", statusFilter)
    if (catFilter) query = query.eq("category", catFilter)
    query = query.order("name").range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    const { data, count } = await query
    if (data) setProviders(data)
    if (count !== null) setTotal(count)
  }, [search, statusFilter, catFilter, page])

  const loadStats = useCallback(async () => {
    if (!supabase) return
    const [c, p, i] = await Promise.all([
      supabase.from("providers").select("*", { count: "exact", head: true }).eq("data_status", "complete"),
      supabase.from("providers").select("*", { count: "exact", head: true }).eq("data_status", "partial"),
      supabase.from("providers").select("*", { count: "exact", head: true }).eq("data_status", "incomplete"),
    ])
    setStats({ complete: c.count || 0, partial: p.count || 0, incomplete: i.count || 0, total: (c.count||0) + (p.count||0) + (i.count||0) })
  }, [])

  useEffect(() => { if (authed) { load(); loadStats() } }, [authed, load, loadStats])

  const save = async () => {
    const rec = { ...form, services: servicesText.split(',').map(x=>x.trim()).filter(Boolean), doctors: doctorsText.split(',').map(x=>x.trim()).filter(Boolean), languages: languagesText.split(',').map(x=>x.trim()).filter(Boolean), rating: form.rating ? parseFloat(form.rating) : null, reviews: parseInt(form.reviews) || 0, wait_weeks: form.wait_weeks !== "" && form.wait_weeks !== null ? parseInt(form.wait_weeks) : null, email: form.email || null }
    delete rec.id; delete rec.created_at; delete rec.updated_at; delete rec.owner_id
    if (editing) {
      const { error } = await supabase.from("providers").update(rec).eq("id", editing)
      if (error) { setMsg("Error: " + error.message); return }
      setMsg("Updated!")
    } else {
      const { error } = await supabase.from("providers").insert(rec)
      if (error) { setMsg("Error: " + error.message); return }
      setMsg("Added!")
    }
    setEditing(null); setForm(empty()); setServicesText(""); setDoctorsText(""); setLanguagesText("English"); setTab("list"); load(); loadStats()
  }

  const del = async (id) => {
    if (!confirm("Delete this provider?")) return
    await supabase.from("providers").delete().eq("id", id)
    setMsg("Deleted"); load(); loadStats()
  }

  const updateStatus = async (id, status) => {
    await supabase.from("providers").update({ data_status: status }).eq("id", id)
    load(); loadStats()
  }

  const loadClaims = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.from("claims").select("*, providers(name, type, address, phone)").order("created_at", { ascending: false })
    if (data) {
      setClaims(data)
      setPendingCount(data.filter(c => c.status === 'pending').length)
    }
  }, [])

  const handleClaim = async (claimId, action, providerId, userId) => {
    if (!supabase) return
    await supabase.from("claims").update({ status: action }).eq("id", claimId)
    if (action === 'approved') {
      await supabase.from("providers").update({ owner_id: userId }).eq("id", providerId)
    }
    setMsg(action === 'approved' ? 'Claim approved — listing linked to user' : 'Claim rejected')
    loadClaims()
  }

  useEffect(() => { if (authed) loadClaims() }, [authed, loadClaims])

  const edit = (p) => {
    setForm({ ...p, rating: p.rating || "", reviews: p.reviews || 0, wait_weeks: p.wait_weeks ?? "", email: p.email || "", services: p.services || [], doctors: p.doctors || [], languages: p.languages || ["English"], hours: p.hours || {mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null} })
    setServicesText((p.services || []).join(', '))
    setDoctorsText((p.doctors || []).join(', '))
    setLanguagesText((p.languages || ['English']).join(', '))
    setEditing(p.id); setTab("edit")
  }

  const s = { width:"100%", padding:"8px 10px", fontSize:"13px", background:"#1a1f2b", border:"1px solid #2a3040", borderRadius:"6px", color:"#e8ecf2", outline:"none", marginTop:"4px" }
  const lbl = { fontSize:"11px", fontWeight:600, color:"#7a8599", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginTop:"12px" }

  if (!authed) return (
    <div style={{ fontFamily:"Inter, sans-serif", background:"#0c0f14", color:"#e8ecf2", minHeight:"100vh", display:"flex", justifyContent:"center", alignItems:"center" }}>
      <div style={{ background:"#141820", border:"1px solid #1e2530", borderRadius:"14px", padding:"32px", width:"340px" }}>
        <h2 style={{ margin:"0 0 4px", fontSize:"18px" }}>🔐 ReferEasy Admin</h2>
        <p style={{ margin:"0 0 20px", fontSize:"12px", color:"#7a8599" }}>Enter admin password</p>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==="Enter" && login()} placeholder="Password" style={s} />
        <button onClick={login} style={{ all:"unset", cursor:"pointer", display:"block", width:"100%", marginTop:"12px", padding:"10px", textAlign:"center", background:"#3b82f6", color:"#fff", borderRadius:"8px", fontSize:"13px", fontWeight:600 }}>Login</button>
        {msg && <p style={{ color:"#dc2626", fontSize:"12px", marginTop:"8px" }}>{msg}</p>}
      </div>
    </div>
  )

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const statusColor = { complete: "#059669", partial: "#d97706", incomplete: "#dc2626" }

  return (
    <div style={{ fontFamily:"Inter, sans-serif", background:"#0c0f14", color:"#e8ecf2", minHeight:"100vh" }}>
      <div style={{ padding:"14px 20px", borderBottom:"1px solid #1e2530", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1 style={{ margin:0, fontSize:"18px", fontWeight:700 }}>🔗 Refer<span style={{ color:"var(--ac)" }}>Easy</span> <span style={{ color:"#7a8599", fontWeight:400 }}>Admin</span></h1>
        <div style={{ display:"flex", gap:"8px" }}>
          <button onClick={() => { setTab("list"); setEditing(null); setForm(empty()) }} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:tab==="list"?"#3b82f6":"#141820", color:tab==="list"?"#fff":"#7a8599", border:"1px solid " + (tab==="list"?"#3b82f6":"#1e2530") }}>Providers</button>
          <button onClick={() => setTab("claims")} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:tab==="claims"?"#d97706":"#141820", color:tab==="claims"?"#fff":"#7a8599", border:"1px solid " + (tab==="claims"?"#d97706":"#1e2530"), display:"flex", alignItems:"center", gap:"4px" }}>Claims {pendingCount > 0 && <span style={{ background:"#dc2626", color:"#fff", borderRadius:"999px", padding:"1px 6px", fontSize:"10px", fontWeight:700 }}>{pendingCount}</span>}</button>
          <button onClick={() => { setTab("edit"); setEditing(null); setForm(empty()) }} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:tab==="edit"&&!editing?"#059669":"#141820", color:tab==="edit"&&!editing?"#fff":"#7a8599", border:"1px solid " + (tab==="edit"&&!editing?"#059669":"#1e2530") }}>+ Add New</button>
          <a href="/" style={{ padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:"#141820", color:"#7a8599", border:"1px solid #1e2530", textDecoration:"none" }}>← Site</a>
        </div>
      </div>
      {msg && <div style={{ padding:"8px 20px", background:"#05966920", color:"#059669", fontSize:"12px", fontWeight:600 }}>{msg}</div>}

      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"16px 20px" }}>
        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"10px", marginBottom:"16px" }}>
          {[
            { label:"Total", value: stats.total || 0, color:"#3b82f6" },
            { label:"Complete", value: stats.complete || 0, color:"#059669" },
            { label:"Partial", value: stats.partial || 0, color:"#d97706" },
            { label:"Incomplete", value: stats.incomplete || 0, color:"#dc2626" },
          ].map(s => (
            <div key={s.label} style={{ background:"#141820", border:"1px solid #1e2530", borderRadius:"8px", padding:"12px", textAlign:"center" }}>
              <div style={{ fontSize:"24px", fontWeight:700, color:s.color }}>{s.value.toLocaleString()}</div>
              <div style={{ fontSize:"10px", color:"#7a8599", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {tab === "list" ? (
          <>
            {/* Filters */}
            <div style={{ display:"flex", gap:"8px", marginBottom:"12px", flexWrap:"wrap" }}>
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} placeholder="Search..." style={{ ...s, flex:"1", marginTop:0, minWidth:"200px" }} />
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }} style={{ ...s, marginTop:0, width:"150px", flex:"0 0 auto" }}>
                <option value="">All statuses</option>
                {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
              <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(0) }} style={{ ...s, marginTop:0, width:"140px", flex:"0 0 auto" }}>
                <option value="">All categories</option>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Pagination */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
              <span style={{ fontSize:"12px", color:"#7a8599" }}>{total.toLocaleString()} results (page {page+1}/{totalPages || 1})</span>
              <div style={{ display:"flex", gap:"4px" }}>
                <button disabled={page===0} onClick={() => setPage(p=>p-1)} style={{ all:"unset", cursor:page===0?"default":"pointer", padding:"4px 10px", fontSize:"11px", borderRadius:"6px", background:"#141820", color:page===0?"#333":"#7a8599", border:"1px solid #1e2530" }}>← Prev</button>
                <button disabled={page>=totalPages-1} onClick={() => setPage(p=>p+1)} style={{ all:"unset", cursor:page>=totalPages-1?"default":"pointer", padding:"4px 10px", fontSize:"11px", borderRadius:"6px", background:"#141820", color:page>=totalPages-1?"#333":"#7a8599", border:"1px solid #1e2530" }}>Next →</button>
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {providers.map(p => (
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#141820", border:"1px solid #1e2530", borderRadius:"8px", padding:"10px 14px", gap:"8px" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"13px", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</div>
                    <div style={{ fontSize:"11px", color:"#7a8599" }}>
                      {p.type} · {p.category}
                      {p.phone && ` · ${p.phone}`}
                      {p.fax && ` · Fax: ${p.fax}`}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:"4px", alignItems:"center", flexShrink:0 }}>
                    <select value={p.data_status || 'incomplete'} onChange={e => updateStatus(p.id, e.target.value)} style={{ padding:"3px 6px", fontSize:"10px", fontWeight:600, borderRadius:"6px", background:statusColor[p.data_status]+"20", color:statusColor[p.data_status], border:`1px solid ${statusColor[p.data_status]}40`, outline:"none", cursor:"pointer" }}>
                      {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                    <button onClick={() => edit(p)} style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#3b82f620", color:"#3b82f6", border:"1px solid #3b82f640" }}>Edit</button>
                    <button onClick={() => del(p.id)} style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>Del</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ background:"#141820", border:"1px solid #1e2530", borderRadius:"12px", padding:"20px" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:"16px" }}>{editing ? "Edit Provider" : "Add New Provider"}</h3>

            {/* Website Extractor */}
            <div style={{ background:"#0f1a30", border:"1px solid #1e3a5f", borderRadius:"8px", padding:"14px", marginBottom:"16px" }}>
              <div style={{ fontSize:"12px", fontWeight:600, color:"#3b82f6", marginBottom:"8px" }}>🌐 Auto-fill from website</div>
              <div style={{ display:"flex", gap:"8px" }}>
                <input style={{ ...s, marginTop:0, flex:1 }} placeholder="Paste clinic website URL (e.g. https://1to1rehab.ca)" id="extractUrl" />
                <button onClick={async () => {
                  const urlInput = document.getElementById('extractUrl')
                  const extractUrl = urlInput?.value?.trim()
                  if (!extractUrl) return
                  setMsg('Extracting data from website...')
                  try {
                    const res = await fetch('/api/extract', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ url: extractUrl })
                    })
                    const result = await res.json()
                    if (result.success && result.data) {
                      const d = result.data
                      setForm(prev => ({
                        ...prev,
                        name: d.name || prev.name,
                        type: d.type || prev.type,
                        category: d.category || prev.category,
                        address: d.address || prev.address,
                        phone: d.phone || prev.phone,
                        fax: d.fax || prev.fax,
                        email: d.email || prev.email,
                        website: d.website || prev.website,
                        hours: d.hours || prev.hours,
                        requirements: d.requirements || prev.requirements,
                        accepting_referrals: d.accepting_referrals ?? prev.accepting_referrals,
                      }))
                      setServicesText((d.services || []).join(', ') || servicesText)
                      setDoctorsText((d.doctors || []).join(', ') || doctorsText)
                      setLanguagesText((d.languages || []).join(', ') || languagesText)
                      setMsg('✅ Extracted! Review the data below and save.')
                    } else {
                      setMsg('⚠️ ' + (result.error || 'Extraction failed'))
                    }
                  } catch (err) {
                    setMsg('⚠️ Error: ' + err.message)
                  }
                }} style={{ all:"unset", cursor:"pointer", padding:"8px 16px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#3b82f6", color:"#fff", whiteSpace:"nowrap" }}>Extract</button>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
              <div><label style={lbl}>Name *</label><input style={s} value={form.name} onChange={e => setForm({...form, name:e.target.value})} /></div>
              <div><label style={lbl}>Specialty *</label><select style={s} value={form.specialty_code || ''} onChange={e => { const spec = specialties.find(s => s.snomed_code === e.target.value); if (spec) setForm({...form, specialty_code: e.target.value, type: spec.name}); else setForm({...form, specialty_code: '', type: form.type}) }}><option value="">Select specialty...</option>{(() => { const groups = {}; specialties.forEach(sp => { if (!groups[sp.category]) groups[sp.category] = []; groups[sp.category].push(sp) }); return Object.entries(groups).map(([cat, specs]) => <optgroup key={cat} label={cat}>{specs.map(sp => <option key={sp.snomed_code} value={sp.snomed_code}>{sp.name}</option>)}</optgroup>) })()}</select></div>
              <div><label style={lbl}>Custom Type Label</label><input style={s} value={form.type} onChange={e => setForm({...form, type:e.target.value})} placeholder="Override SNOMED name if needed" /></div>
              <div><label style={lbl}>Category</label><select style={s} value={form.category} onChange={e => setForm({...form, category:e.target.value})}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label style={lbl}>Data Status</label><select style={s} value={form.data_status || 'complete'} onChange={e => setForm({...form, data_status:e.target.value})}>{STATUSES.map(st => <option key={st} value={st}>{st}</option>)}</select></div>
              <div><label style={lbl}>Address</label><input style={s} value={form.address || ""} onChange={e => setForm({...form, address:e.target.value})} /></div>
              <div><label style={lbl}>Phone</label><input style={s} value={form.phone || ""} onChange={e => setForm({...form, phone:e.target.value || null})} /></div>
              <div><label style={lbl}>Fax</label><input style={s} value={form.fax || ""} onChange={e => setForm({...form, fax:e.target.value || null})} /></div>
              <div><label style={lbl}>Email</label><input style={s} type="email" value={form.email || ""} onChange={e => setForm({...form, email:e.target.value || null})} placeholder="referrals@clinic.ca" /></div>
              <div><label style={lbl}>Website</label><input style={s} value={form.website || ""} onChange={e => setForm({...form, website:e.target.value || null})} /></div>
              <div><label style={lbl}>Wait (weeks)</label><input style={s} type="number" min="0" value={form.wait_weeks ?? ""} onChange={e => setForm({...form, wait_weeks:e.target.value})} /></div>
              <div><label style={lbl}>SNOMED Code</label><input style={s} value={form.specialty_code || ""} onChange={e => setForm({...form, specialty_code:e.target.value || null})} /></div>
            </div>
            <label style={lbl}>Requirements</label>
            <textarea style={{ ...s, minHeight:"60px", resize:"vertical" }} value={form.requirements || ""} onChange={e => setForm({...form, requirements:e.target.value})} />
            <label style={lbl}>Services (comma-separated)</label>
            <textarea style={{ ...s, minHeight:"50px", resize:"vertical" }} value={servicesText} onChange={e => setServicesText(e.target.value)} placeholder="ECG, Stress Test, Holter Monitor" />
            <label style={lbl}>Doctors (comma-separated)</label>
            <textarea style={{ ...s, minHeight:"50px", resize:"vertical" }} value={doctorsText} onChange={e => setDoctorsText(e.target.value)} placeholder="Dr. Smith, Dr. Jones" />
            <label style={lbl}>Languages (comma-separated)</label>
            <input style={s} value={languagesText} onChange={e => setLanguagesText(e.target.value)} placeholder="English, French, Farsi" />
            <div style={{ display:"flex", gap:"10px", marginTop:"20px" }}>
              <button onClick={save} style={{ all:"unset", cursor:"pointer", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:600, background:"#3b82f6", color:"#fff" }}>{editing ? "Save" : "Add"}</button>
              <button onClick={() => { setTab("list"); setEditing(null); setForm(empty()) }} style={{ all:"unset", cursor:"pointer", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:600, background:"#1e2530", color:"#7a8599" }}>Cancel</button>
            </div>
          </div>
        )}
        {tab === "claims" && (
          <>
            <h2 style={{ fontSize:"16px", fontWeight:700, marginBottom:"12px" }}>Listing Claims</h2>
            {claims.length === 0 ? (
              <div style={{ background:"#141820", border:"1px solid #1e2530", borderRadius:"8px", padding:"30px", textAlign:"center", color:"#7a8599", fontSize:"13px" }}>No claims yet</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                {claims.map(c => (
                  <div key={c.id} style={{ background:"#141820", border:"1px solid #1e2530", borderRadius:"8px", padding:"12px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:"13px", fontWeight:600 }}>{c.providers?.name || 'Unknown listing'}</div>
                        <div style={{ fontSize:"11px", color:"#7a8599", marginTop:"2px" }}>{c.providers?.type} · {c.providers?.address}</div>
                        <div style={{ fontSize:"11px", color:"#7a8599", marginTop:"4px" }}>
                          Claimed by: <span style={{ color:"#e8ecf2" }}>{c.user_name}</span> ({c.user_email})
                        </div>
                        <div style={{ fontSize:"10px", color:"#555", marginTop:"2px" }}>
                          {new Date(c.created_at).toLocaleDateString()} · {c.verification_method}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:"4px", alignItems:"center", flexShrink:0 }}>
                        {c.status === 'pending' ? (
                          <>
                            <button onClick={() => handleClaim(c.id, 'approved', c.provider_id, c.user_id)} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#05966920", color:"#059669", border:"1px solid #05966940" }}>✓ Approve</button>
                            <button onClick={() => handleClaim(c.id, 'rejected', c.provider_id, c.user_id)} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>✕ Reject</button>
                          </>
                        ) : (
                          <span style={{ padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:c.status==='approved'?"#05966920":"#dc262620", color:c.status==='approved'?"#059669":"#dc2626", border:`1px solid ${c.status==='approved'?"#05966940":"#dc262640"}`, textTransform:"capitalize" }}>{c.status}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

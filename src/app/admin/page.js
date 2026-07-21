'use client'
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import FormsManager from "@/components/FormsManager"

const CATS = ["Family Medicine","Clinic","Specialist","Hospital","Imaging","Lab","Physiotherapy","Rehab"]
const STATUSES = ["complete","partial","incomplete"]
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"]

const empty = () => ({ name:"", type:"", category:"Specialist", services:[], address:"", phone:"", fax:"", email:"", website:"", rating:null, reviews:0, hours:{mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null}, accepting_referrals:true, wait_weeks:null, requirements:"", doctors:[], languages:["English"], data_status:"complete", specialty_code:null })
const emptyDoc = () => ({ name:"Dr. ", specialty:"", specialty_code:"", gender:"", accepting_referrals:true, accepting_new_patients:false, wait_weeks:"", criteria:"", referral_types:"", languages:"English", hours:{mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null} })

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
  const [doctorRows, setDoctorRows] = useState([])   // [{id?, name, specialty, specialty_code, gender}]
  const [origDocIds, setOrigDocIds] = useState([])   // physician ids present when editing (for reconcile)
  const [docForm, setDocForm] = useState(emptyDoc())
  const [docLocations, setDocLocations] = useState([{ name:'', address:'', phone:'', fax:'' }])
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

  const withDr = (n) => { const t = (n || '').trim(); if (!t) return t; return /^dr\.?\s/i.test(t) ? t : 'Dr. ' + t }
  const addDoctor = () => setDoctorRows(rows => [...rows, { name: 'Dr. ', specialty: form.type || '', specialty_code: form.specialty_code || '', gender: '' }])
  const updateDoctor = (i, patch) => setDoctorRows(rows => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const removeDoctor = (i) => setDoctorRows(rows => rows.filter((_, idx) => idx !== i))

  // ---- Add-a-Doctor (physician as primary entity, with its own locations) ----
  const setDoc = (k, v) => setDocForm(f => ({ ...f, [k]: v }))
  const addDocLoc = () => setDocLocations(l => [...l, { name:'', address:'', phone:'', fax:'' }])
  const updDocLoc = (i, patch) => setDocLocations(l => l.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const rmDocLoc = (i) => setDocLocations(l => l.filter((_, idx) => idx !== i))

  const saveDoctor = async () => {
    const name = withDr(docForm.name)
    if (!name || /^dr\.?\s*$/i.test(name)) { setMsg("Please enter the doctor's name"); return }
    const rec = {
      name,
      specialty: docForm.specialty || null,
      specialty_code: docForm.specialty_code || null,
      gender: docForm.gender || null,
      accepting_referrals: !!docForm.accepting_referrals,
      accepting_new_patients: !!docForm.accepting_new_patients,
      wait_weeks: (docForm.wait_weeks !== '' && docForm.wait_weeks !== null) ? parseInt(docForm.wait_weeks) : null,
      criteria: docForm.criteria || null,
      referral_types: docForm.referral_types ? docForm.referral_types.split(',').map(x=>x.trim()).filter(Boolean) : null,
      languages: docForm.languages ? docForm.languages.split(',').map(x=>x.trim()).filter(Boolean) : null,
      hours: docForm.hours || null,
      status: 'active',
    }
    const { data: doc, error } = await supabase.from('physicians').insert(rec).select().single()
    if (error || !doc) { setMsg("Error saving doctor: " + (error?.message || "no row returned")); return }

    // Each location becomes a linkable provider record (data_status 'partial' so it isn't listed as a public clinic).
    let warn = null
    const locs = docLocations.filter(l => (l.name||'').trim() || (l.address||'').trim() || (l.phone||'').trim() || (l.fax||'').trim())
    for (let i = 0; i < locs.length; i++) {
      const l = locs[i]
      const prov = {
        name: (l.name||'').trim() || `${name} — Office`,
        type: docForm.specialty || 'Physician office', category: 'Clinic',
        services: [], address: l.address || null, phone: l.phone || null, fax: l.fax || null,
        languages: rec.languages || ['English'], hours: { mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null },
        accepting_referrals: rec.accepting_referrals, wait_weeks: rec.wait_weeks,
        doctors: [name], data_status: 'partial', specialty_code: rec.specialty_code,
      }
      const { data: pRow, error: pErr } = await supabase.from('providers').insert(prov).select().single()
      if (pErr || !pRow) { warn = "Doctor saved, but a location failed: " + (pErr?.message || "unknown"); continue }
      const { error: lErr } = await supabase.from('physician_locations').insert({ physician_id: doc.id, provider_id: pRow.id, is_primary: i === 0 })
      if (lErr) warn = "Doctor saved, but linking a location failed: " + lErr.message
    }
    setMsg(warn || "Doctor added — their profile page is live and searchable.")
    setDocForm(emptyDoc()); setDocLocations([{ name:'', address:'', phone:'', fax:'' }]); setTab("list"); load(); loadStats()
  }

  const save = async () => {
    // keep the legacy providers.doctors[] string array in sync from the structured rows
    const doctorNames = doctorRows.map(r => { const nm = withDr(r.name); return nm && r.specialty ? `${nm} — ${r.specialty}` : nm }).map(x => (x || '').trim()).filter(Boolean)
    const rec = { ...form, services: servicesText.split(',').map(x=>x.trim()).filter(Boolean), doctors: doctorNames, languages: languagesText.split(',').map(x=>x.trim()).filter(Boolean), rating: form.rating ? parseFloat(form.rating) : null, reviews: parseInt(form.reviews) || 0, wait_weeks: form.wait_weeks !== "" && form.wait_weeks !== null ? parseInt(form.wait_weeks) : null, email: form.email || null }
    delete rec.id; delete rec.created_at; delete rec.updated_at; delete rec.owner_id

    // 1) upsert the clinic (provider) and capture its id
    let providerId = editing
    if (editing) {
      const { error } = await supabase.from("providers").update(rec).eq("id", editing)
      if (error) { setMsg("Error saving clinic: " + error.message); return }
    } else {
      const { data, error } = await supabase.from("providers").insert(rec).select().single()
      if (error || !data) { setMsg("Error saving clinic: " + (error?.message || "no row returned")); return }
      providerId = data.id
    }

    // 2) reconcile the doctor rows into physicians + physician_locations
    let warn = null
    try {
      for (let i = 0; i < doctorRows.length; i++) {
        const r = doctorRows[i]
        if (!r.name || !r.name.trim() || /^dr\.?\s*$/i.test(r.name.trim())) continue
        const payload = { name: withDr(r.name), specialty: r.specialty || null, specialty_code: r.specialty_code || null, gender: r.gender || null }
        if (r.id) {
          const { error } = await supabase.from("physicians").update(payload).eq("id", r.id)
          if (error) warn = "Clinic saved, but updating a doctor failed: " + error.message
        } else {
          const { data: doc, error: docErr } = await supabase.from("physicians").insert(payload).select().single()
          if (docErr || !doc) { warn = "Clinic saved, but adding a doctor failed: " + (docErr?.message || "unknown"); continue }
          const { error: linkErr } = await supabase.from("physician_locations").insert({ physician_id: doc.id, provider_id: providerId, is_primary: true })
          if (linkErr) warn = "Clinic saved, but linking a doctor failed: " + linkErr.message
        }
      }
      // unlink doctors removed from the list (keep the physician record for other clinics)
      const currentIds = doctorRows.map(r => r.id).filter(Boolean)
      const removed = origDocIds.filter(id => !currentIds.includes(id))
      for (const id of removed) {
        await supabase.from("physician_locations").delete().eq("physician_id", id).eq("provider_id", providerId)
      }
    } catch (e) {
      warn = "Clinic saved, but doctor sync hit an error: " + e.message
    }

    setMsg(warn || (editing ? "Updated!" : "Added!"))
    setEditing(null); setForm(empty()); setServicesText(""); setDoctorsText(""); setLanguagesText("English"); setDoctorRows([]); setOrigDocIds([]); setTab("list"); load(); loadStats()
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
    const { data } = await supabase.from("claims").select("*, providers(name, type, address, phone), physicians(name, specialty)").order("created_at", { ascending: false })
    if (data) {
      setClaims(data)
      setPendingCount(data.filter(c => c.status === 'pending').length)
    }
  }, [])

  const handleClaim = async (claim, action) => {
    if (!supabase) return
    await supabase.from("claims").update({ status: action }).eq("id", claim.id)
    if (action === 'approved') {
      if (claim.provider_id) await supabase.from("providers").update({ owner_id: claim.user_id }).eq("id", claim.provider_id)
      else if (claim.physician_id) await supabase.from("physicians").update({ owner_id: claim.user_id }).eq("id", claim.physician_id)
    }
    setMsg(action === 'approved' ? 'Claim approved — linked to user' : 'Claim rejected')
    loadClaims()
  }

  useEffect(() => { if (authed) loadClaims() }, [authed, loadClaims])

  const edit = async (p) => {
    setForm({ ...p, rating: p.rating || "", reviews: p.reviews || 0, wait_weeks: p.wait_weeks ?? "", email: p.email || "", services: p.services || [], doctors: p.doctors || [], languages: p.languages || ["English"], hours: p.hours || {mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null} })
    setServicesText((p.services || []).join(', '))
    setDoctorsText((p.doctors || []).join(', '))
    setLanguagesText((p.languages || ['English']).join(', '))
    // load linked physicians for this clinic (doctor-first model)
    let rows = []
    try {
      const { data: links } = await supabase.from('physician_locations').select('is_primary, physicians(*)').eq('provider_id', p.id)
      rows = (links || []).filter(l => l.physicians).map(l => ({ id: l.physicians.id, name: l.physicians.name || '', specialty: l.physicians.specialty || '', specialty_code: l.physicians.specialty_code || '', gender: l.physicians.gender || '' }))
    } catch {}
    // fallback: if no linked doctors yet but legacy string names exist, seed rows so admin can convert them (saving creates real physician records)
    if (rows.length === 0 && (p.doctors || []).length > 0) {
      rows = p.doctors.map(n => ({ name: String(n).replace(/\s*—.*/, '').trim(), specialty: p.type || '', specialty_code: '', gender: '' }))
    }
    setDoctorRows(rows); setOrigDocIds(rows.filter(r => r.id).map(r => r.id))
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
          <button onClick={() => { setTab("edit"); setEditing(null); setForm(empty()); setServicesText(""); setDoctorsText(""); setLanguagesText("English"); setDoctorRows([]); setOrigDocIds([]) }} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:tab==="edit"&&!editing?"#059669":"#141820", color:tab==="edit"&&!editing?"#fff":"#7a8599", border:"1px solid " + (tab==="edit"&&!editing?"#059669":"#1e2530") }}>+ Clinic</button>
          <button onClick={() => { setTab("doctor"); setEditing(null); setDocForm(emptyDoc()); setDocLocations([{ name:'', address:'', phone:'', fax:'' }]) }} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:tab==="doctor"?"#7c3aed":"#141820", color:tab==="doctor"?"#fff":"#7a8599", border:"1px solid " + (tab==="doctor"?"#7c3aed":"#1e2530") }}>+ Doctor</button>
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
        ) : tab === "edit" ? (
          <div style={{ background:"#141820", border:"1px solid #1e2530", borderRadius:"12px", padding:"20px" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:"16px" }}>{editing ? "Edit Provider" : "Add New Provider"}</h3>

            {/* Website Extractor */}
            <div style={{ background:"#0f1a30", border:"1px solid #1e3a5f", borderRadius:"8px", padding:"14px", marginBottom:"16px" }}>
              <div style={{ fontSize:"12px", fontWeight:600, color:"#3b82f6", marginBottom:"8px" }}>🌐 Auto-fill from website (extracts all locations)</div>
              <div style={{ display:"flex", gap:"8px" }}>
                <input style={{ ...s, marginTop:0, flex:1 }} placeholder="Paste clinic website URL (e.g. https://1to1rehab.ca)" id="extractUrl" />
                <button onClick={async () => {
                  const urlInput = document.getElementById('extractUrl')
                  const extractUrl = urlInput?.value?.trim()
                  if (!extractUrl) return
                  setMsg('🔄 Extracting data from website... (takes 5-10 seconds)')
                  try {
                    const res = await fetch('/api/extract', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ url: extractUrl })
                    })
                    const result = await res.json()
                    if (result.success) {
                      if (result.count > 1) {
                        // Multiple locations — offer batch create
                        const locs = result.all_locations
                        if (confirm(`Found ${locs.length} locations. Create listings for all ${locs.length}?`)) {
                          let created = 0
                          for (const d of locs) {
                            const rec = {
                              name: d.name || '', type: d.type || '', category: d.category || 'Specialist',
                              services: d.services || [], address: d.address || '', phone: d.phone || null,
                              fax: d.fax || null, email: d.email || null, website: d.website || null,
                              hours: d.hours || {}, requirements: d.requirements || '',
                              accepting_referrals: d.accepting_referrals ?? true,
                              doctors: d.doctors || [], languages: d.languages || ['English'],
                              data_status: 'complete', rating: null, reviews: 0,
                            }
                            const { error } = await supabase.from('providers').insert(rec)
                            if (!error) created++
                          }
                          setMsg(`✅ Created ${created}/${locs.length} listings! Go to Providers tab to see them.`)
                          load(); loadStats()
                        } else {
                          // Just fill the form with first location
                          const d = result.data
                          setForm(prev => ({ ...prev, name: d.name || prev.name, type: d.type || prev.type, category: d.category || prev.category, address: d.address || prev.address, phone: d.phone || prev.phone, fax: d.fax || prev.fax, email: d.email || prev.email, website: d.website || prev.website, hours: d.hours || prev.hours, requirements: d.requirements || prev.requirements, accepting_referrals: d.accepting_referrals ?? prev.accepting_referrals }))
                          setServicesText((d.services || []).join(', '))
                          setDoctorsText((d.doctors || []).join(', '))
                        setDoctorRows((d.doctors || []).map(n => ({ name: n, specialty: d.type || '', specialty_code: '', gender: '' })))
                          setLanguagesText((d.languages || []).join(', '))
                          setMsg(`Found ${result.count} locations. Showing first one. Save and extract again for others.`)
                        }
                      } else {
                        // Single location — fill the form
                        const d = result.data
                        setForm(prev => ({ ...prev, name: d.name || prev.name, type: d.type || prev.type, category: d.category || prev.category, address: d.address || prev.address, phone: d.phone || prev.phone, fax: d.fax || prev.fax, email: d.email || prev.email, website: d.website || prev.website, hours: d.hours || prev.hours, requirements: d.requirements || prev.requirements, accepting_referrals: d.accepting_referrals ?? prev.accepting_referrals }))
                        setServicesText((d.services || []).join(', '))
                        setDoctorsText((d.doctors || []).join(', '))
                        setDoctorRows((d.doctors || []).map(n => ({ name: n, specialty: d.type || '', specialty_code: '', gender: '' })))
                        setLanguagesText((d.languages || []).join(', '))
                        setMsg('✅ Extracted! Review the data below and save.')
                      }
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
            <label style={lbl}>Doctors at this clinic</label>
            <div style={{ fontSize:"11px", color:"#7a8599", margin:"2px 0 8px" }}>Each doctor gets their own profile page, linked to this clinic.</div>
            {doctorRows.map((r, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1.3fr 1.3fr 0.8fr auto", gap:"6px", marginBottom:"6px", alignItems:"center" }}>
                <input style={{ ...s, marginTop:0 }} placeholder="Dr. Full Name" value={r.name} onChange={e => updateDoctor(i, { name: e.target.value })} />
                <select style={{ ...s, marginTop:0 }} value={r.specialty_code || ''} onChange={e => { const sp = specialties.find(x => x.snomed_code === e.target.value); updateDoctor(i, sp ? { specialty_code: sp.snomed_code, specialty: sp.name } : { specialty_code: '', specialty: '' }) }}>
                  <option value="">Specialty…</option>
                  {(() => { const groups = {}; specialties.forEach(sp => { if (!groups[sp.category]) groups[sp.category] = []; groups[sp.category].push(sp) }); return Object.entries(groups).map(([cat, specs]) => <optgroup key={cat} label={cat}>{specs.map(sp => <option key={sp.snomed_code} value={sp.snomed_code}>{sp.name}</option>)}</optgroup>) })()}
                </select>
                <select style={{ ...s, marginTop:0 }} value={r.gender || ''} onChange={e => updateDoctor(i, { gender: e.target.value })}>
                  <option value="">Gender…</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
                </select>
                <button onClick={() => removeDoctor(i)} title="Remove doctor" style={{ all:"unset", cursor:"pointer", padding:"6px 10px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640", textAlign:"center" }}>✕</button>
              </div>
            ))}
            <button onClick={addDoctor} style={{ all:"unset", cursor:"pointer", padding:"7px 14px", marginTop:"4px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#3b82f620", color:"#3b82f6", border:"1px solid #3b82f640" }}>+ Add doctor</button>

            <label style={lbl}>Languages (comma-separated)</label>
            <input style={s} value={languagesText} onChange={e => setLanguagesText(e.target.value)} placeholder="English, French, Farsi" />

            <label style={lbl}>Hours (start-end, e.g. 9:00-17:00 — blank = closed)</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:"6px", marginTop:"4px" }}>
              {DAYS.map((d, i) => (
                <div key={d}>
                  <div style={{ fontSize:"9px", color:"#7a8599", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:"3px", textAlign:"center" }}>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</div>
                  <input style={{ ...s, marginTop:0, padding:"6px 4px", fontSize:"11px", textAlign:"center" }} value={form.hours?.[d] || ''} onChange={e => setForm({ ...form, hours: { ...form.hours, [d]: e.target.value || null } })} placeholder="9-17" />
                </div>
              ))}
            </div>
            {editing && (
              <div style={{ marginTop:"20px", paddingTop:"16px", borderTop:"1px solid #1e2530" }}>
                <label style={lbl}>Forms</label>
                <div style={{ fontSize:"11px", color:"#7a8599", margin:"2px 0 10px" }}>Uploaded forms appear on the public listing for referring doctors to download.</div>
                <FormsManager providerId={editing} dark />
              </div>
            )}
            <div style={{ display:"flex", gap:"10px", marginTop:"20px" }}>
              <button onClick={save} style={{ all:"unset", cursor:"pointer", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:600, background:"#3b82f6", color:"#fff" }}>{editing ? "Save" : "Add"}</button>
              <button onClick={() => { setTab("list"); setEditing(null); setForm(empty()) }} style={{ all:"unset", cursor:"pointer", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:600, background:"#1e2530", color:"#7a8599" }}>Cancel</button>
            </div>
          </div>
        ) : null}
        {tab === "doctor" && (
          <div style={{ background:"#141820", border:"1px solid #1e2530", borderRadius:"12px", padding:"20px" }}>
            <h3 style={{ margin:"0 0 4px", fontSize:"16px" }}>Add Doctor</h3>
            <p style={{ margin:"0 0 16px", fontSize:"12px", color:"#7a8599" }}>Creates a standalone, searchable, claimable doctor profile. Add one or more places they practise.</p>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
              <div><label style={lbl}>Full Name *</label><input style={s} value={docForm.name} onChange={e => setDoc('name', e.target.value)} placeholder="Dr. Jane Smith" /></div>
              <div><label style={lbl}>Specialty *</label><select style={s} value={docForm.specialty_code || ''} onChange={e => { const sp = specialties.find(x => x.snomed_code === e.target.value); if (sp) setDocForm(f => ({ ...f, specialty_code: sp.snomed_code, specialty: sp.name })); else setDocForm(f => ({ ...f, specialty_code:'', specialty:'' })) }}><option value="">Select specialty...</option>{(() => { const groups = {}; specialties.forEach(sp => { if (!groups[sp.category]) groups[sp.category] = []; groups[sp.category].push(sp) }); return Object.entries(groups).map(([cat, specs]) => <optgroup key={cat} label={cat}>{specs.map(sp => <option key={sp.snomed_code} value={sp.snomed_code}>{sp.name}</option>)}</optgroup>) })()}</select></div>
              <div><label style={lbl}>Gender</label><select style={s} value={docForm.gender || ''} onChange={e => setDoc('gender', e.target.value)}><option value="">—</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></div>
              <div><label style={lbl}>Wait (weeks)</label><input style={s} type="number" min="0" value={docForm.wait_weeks} onChange={e => setDoc('wait_weeks', e.target.value)} placeholder="Leave blank if varies" /></div>
              <div><label style={lbl}>Accepting Referrals</label><select style={s} value={docForm.accepting_referrals ? 'true' : 'false'} onChange={e => setDoc('accepting_referrals', e.target.value === 'true')}><option value="true">Yes</option><option value="false">No</option></select></div>
              <div><label style={lbl}>Accepting New Patients</label><select style={s} value={docForm.accepting_new_patients ? 'true' : 'false'} onChange={e => setDoc('accepting_new_patients', e.target.value === 'true')}><option value="false">No</option><option value="true">Yes</option></select></div>
            </div>
            <label style={lbl}>Referral Types (comma-separated)</label>
            <input style={s} value={docForm.referral_types} onChange={e => setDoc('referral_types', e.target.value)} placeholder="Consultation, Procedure, Follow-up" />
            <label style={lbl}>Languages (comma-separated)</label>
            <input style={s} value={docForm.languages} onChange={e => setDoc('languages', e.target.value)} placeholder="English, French, Farsi" />
            <label style={lbl}>Referral Criteria</label>
            <textarea style={{ ...s, minHeight:"60px", resize:"vertical" }} value={docForm.criteria} onChange={e => setDoc('criteria', e.target.value)} placeholder="e.g. GP referral required, recent imaging, OHIP card" />

            <label style={{ ...lbl, marginTop:"20px" }}>Hours (start-end, e.g. 9:00-17:00 — blank = closed)</label>
            <div style={{ fontSize:"11px", color:"#7a8599", margin:"2px 0 8px" }}>For doctors who run their own practice. Leave blank if they only work out of the clinics below.</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:"6px" }}>
              {DAYS.map((d, i) => (
                <div key={d}>
                  <div style={{ fontSize:"9px", color:"#7a8599", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:"3px", textAlign:"center" }}>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</div>
                  <input style={{ ...s, marginTop:0, padding:"6px 4px", fontSize:"11px", textAlign:"center" }} value={docForm.hours?.[d] || ''} onChange={e => setDocForm(f => ({ ...f, hours: { ...f.hours, [d]: e.target.value || null } }))} placeholder="9-17" />
                </div>
              ))}
            </div>

            <label style={{ ...lbl, marginTop:"20px" }}>Locations (where they practise)</label>
            <div style={{ fontSize:"11px", color:"#7a8599", margin:"2px 0 8px" }}>Each location shows on their profile. Add more with the button below.</div>
            {docLocations.map((l, i) => (
              <div key={i} style={{ border:"1px solid #1e2530", borderRadius:"8px", padding:"10px", marginBottom:"8px" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"8px", alignItems:"center", marginBottom:"6px" }}>
                  <input style={{ ...s, marginTop:0 }} value={l.name} onChange={e => updDocLoc(i, { name: e.target.value })} placeholder={`Clinic / office name (e.g. Disera Medical Centre)`} />
                  {docLocations.length > 1 && <button onClick={() => rmDocLoc(i)} title="Remove location" style={{ all:"unset", cursor:"pointer", padding:"6px 10px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>✕</button>}
                </div>
                <input style={{ ...s, marginTop:0, marginBottom:"6px" }} value={l.address} onChange={e => updDocLoc(i, { address: e.target.value })} placeholder="Address" />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                  <input style={{ ...s, marginTop:0 }} value={l.phone} onChange={e => updDocLoc(i, { phone: e.target.value })} placeholder="Phone" />
                  <input style={{ ...s, marginTop:0 }} value={l.fax} onChange={e => updDocLoc(i, { fax: e.target.value })} placeholder="Fax" />
                </div>
              </div>
            ))}
            <button onClick={addDocLoc} style={{ all:"unset", cursor:"pointer", padding:"7px 14px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#3b82f620", color:"#3b82f6", border:"1px solid #3b82f640" }}>+ Add location</button>

            <div style={{ display:"flex", gap:"10px", marginTop:"20px" }}>
              <button onClick={saveDoctor} style={{ all:"unset", cursor:"pointer", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:600, background:"#7c3aed", color:"#fff" }}>Add Doctor</button>
              <button onClick={() => { setTab("list"); setDocForm(emptyDoc()); setDocLocations([{ name:'', address:'', phone:'', fax:'' }]) }} style={{ all:"unset", cursor:"pointer", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:600, background:"#1e2530", color:"#7a8599" }}>Cancel</button>
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
                        <div style={{ fontSize:"13px", fontWeight:600 }}>{c.providers?.name || c.physicians?.name || 'Unknown'}{c.physician_id && <span style={{ marginLeft:"6px", fontSize:"9px", fontWeight:700, color:"#a78bfa", background:"#7c3aed20", border:"1px solid #7c3aed40", borderRadius:"999px", padding:"1px 6px" }}>DOCTOR</span>}</div>
                        <div style={{ fontSize:"11px", color:"#7a8599", marginTop:"2px" }}>{c.providers ? `${c.providers.type} · ${c.providers.address || ''}` : (c.physicians?.specialty || 'Physician profile')}</div>
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
                            <button onClick={() => handleClaim(c, 'approved')} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#05966920", color:"#059669", border:"1px solid #05966940" }}>✓ Approve</button>
                            <button onClick={() => handleClaim(c, 'rejected')} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>✕ Reject</button>
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

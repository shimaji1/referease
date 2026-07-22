'use client'
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import FormsManager from "@/components/FormsManager"

const CATS = ["Family Medicine","Multi-Specialty","Clinic","Specialist","Hospital","Imaging","Lab","Physiotherapy","Rehab"]
const STATUSES = ["complete","partial","incomplete"]
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"]

const empty = () => ({ name:"", type:"", category:"Specialist", services:[], address:"", phone:"", fax:"", email:"", website:"", rating:null, reviews:0, hours:{mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null}, accepting_referrals:null, wait_weeks:null, requirements:"", doctors:[], languages:["English"], data_status:"complete", specialty_code:null })
const normalizeHours = (h) => {
  if (!h || typeof h !== 'object') return null
  const out = {}
  DAYS.forEach(d => {
    let v = h[d]
    if (typeof v === 'string') { v = v.trim(); if (!v || /null|closed|unknown|n\/a/i.test(v)) v = null }
    else v = null
    out[d] = v
  })
  return out
}
const emptyDoc = () => ({ name:"Dr. ", specialty:"", specialty_code:"", gender:"", category:"Specialist", accepting_referrals:null, accepting_new_patients:null, wait_weeks:"", criteria:"", referral_types:"", languages:"English", hours:{mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null} })

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
  const [clinicQuery, setClinicQuery] = useState('')
  const [clinicResults, setClinicResults] = useState([])
  const [physicians, setPhysicians] = useState([])
  const [editingDoc, setEditingDoc] = useState(null)
  const [dupGroups, setDupGroups] = useState([])
  const [dupScanning, setDupScanning] = useState(false)
  const [dupKeeper, setDupKeeper] = useState({})
  const [inviting, setInviting] = useState(null)
  const [siteP, setSiteP] = useState(null)
  const PAGE_SIZE = 50

  const login = () => {
    if (pw === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) { setAuthed(true); setMsg(""); try { localStorage.setItem('re-admin-auth', '1') } catch {} }
    else setMsg("Wrong password")
  }
  const logout = () => { setAuthed(false); setPw(""); try { localStorage.removeItem('re-admin-auth') } catch {} }
  useEffect(() => { try { if (localStorage.getItem('re-admin-auth') === '1') setAuthed(true) } catch {} }, [])

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

    // doctors live in the same list (status filter is provider-only, so skip doctors when it's set)
    if (statusFilter) { setPhysicians([]); return }
    let dq = supabase.from('physicians').select('*')
    if (search) {
      const t = search.replace(/^dr\.?\s*/i, '').replace(/[,%]/g, '').trim()
      if (t) dq = dq.or(`name.ilike.%${t}%,specialty.ilike.%${t}%`)
    }
    const { data: docs } = await dq.order('name').limit(50)
    setPhysicians(docs || [])
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
  const addDoctor = () => setDoctorRows(rows => [...rows, { name: 'Dr. ', specialty: form.type || '', specialty_code: form.specialty_code || '', gender: '', accepting_referrals: null }])
  const updateDoctor = (i, patch) => setDoctorRows(rows => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const removeDoctor = (i) => setDoctorRows(rows => rows.filter((_, idx) => idx !== i))

  // ---- Add-a-Doctor (physician as primary entity, with its own locations) ----
  const setDoc = (k, v) => setDocForm(f => ({ ...f, [k]: v }))
  const addDocLoc = () => setDocLocations(l => [...l, { name:'', address:'', phone:'', fax:'' }])
  const searchClinics = async (q) => {
    setClinicQuery(q)
    if (!supabase || q.trim().length < 2) { setClinicResults([]); return }
    const { data } = await supabase.from('providers').select('id, name, address, phone, fax').ilike('name', `%${q.trim()}%`).limit(8)
    setClinicResults(data || [])
  }
  const addClinicLoc = (c) => { setDocLocations(l => [...l, { provider_id: c.id, name: c.name, address: c.address, phone: c.phone, fax: c.fax }]); setClinicQuery(''); setClinicResults([]) }
  const updDocLoc = (i, patch) => setDocLocations(l => l.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const rmDocLoc = (i) => setDocLocations(l => l.filter((_, idx) => idx !== i))

  // ── Duplicates ──
  const scanDupes = async () => {
    if (!supabase) return
    setDupScanning(true); setDupGroups([])
    let all = [], from = 0
    while (true) {
      const { data } = await supabase.from('providers').select('id,name,phone,address,email,data_status').range(from, from + 999)
      if (!data || data.length === 0) break
      all = all.concat(data)
      if (data.length < 1000) break
      from += 1000
    }
    const norm = x => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const normPhone = x => String(x || '').replace(/\D/g, '').slice(-10)
    const byKey = {}
    all.forEach(pr => {
      const keys = []
      const np = normPhone(pr.phone); if (np.length === 10) keys.push('p:' + np)
      const nn = norm(pr.name); if (nn.length > 3) keys.push('n:' + nn)
      keys.forEach(k => { if (!byKey[k]) byKey[k] = []; byKey[k].push(pr) })
    })
    const seen = new Set(); const out = []
    Object.values(byKey).forEach(arr => {
      if (arr.length < 2) return
      const uniq = [...new Map(arr.map(x => [x.id, x])).values()].sort((a, b) => a.id - b.id)
      if (uniq.length < 2) return
      const sig = uniq.map(x => x.id).join(',')
      if (seen.has(sig)) return
      seen.add(sig); out.push(uniq)
    })
    out.sort((a, b) => b.length - a.length)
    setDupGroups(out.slice(0, 150))
    setDupScanning(false)
    setMsg(out.length + ' potential duplicate groups found' + (out.length > 150 ? ' (showing 150)' : ''))
  }

  const mergeGroup = async (gi) => {
    const group = dupGroups[gi]
    const keeperId = dupKeeper[gi] ?? group[0].id
    if (typeof window !== 'undefined' && !window.confirm('Merge this group into the selected listing? Doctors, links and forms move to it; the other listings are deleted.')) return
    for (const pr of group) {
      if (pr.id === keeperId) continue
      const { data: links } = await supabase.from('physician_locations').select('physician_id, is_primary').eq('provider_id', pr.id)
      for (const l of (links || [])) {
        await supabase.from('physician_locations').insert({ physician_id: l.physician_id, provider_id: keeperId, is_primary: false })
      }
      await supabase.from('physician_locations').delete().eq('provider_id', pr.id)
      await supabase.from('listing_forms').update({ provider_id: keeperId }).eq('provider_id', pr.id)
      await supabase.from('providers').delete().eq('id', pr.id)
    }
    setDupGroups(gs => gs.filter((_, idx) => idx !== gi))
    setMsg('Group merged.'); load(); loadStats()
  }

  const dupDelete = async (gi, id) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this listing?')) return
    await supabase.from('physician_locations').delete().eq('provider_id', id)
    await supabase.from('providers').delete().eq('id', id)
    setDupGroups(gs => gs.map((g, idx) => idx === gi ? g.filter(x => x.id !== id) : g).filter(g => g.length > 1))
    setMsg('Deleted.'); load(); loadStats()
  }

  // ── Outreach ──
  const invite = async (pr) => {
    setInviting(pr.id)
    const res = await fetch('/api/outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ provider_id: pr.id, email: pr.email, name: pr.name }] }) })
    const r = await res.json().catch(() => ({}))
    setInviting(null)
    if (r.error || !r.sent) { setMsg('Invite failed: ' + (r.error || (r.errors && r.errors[0]) || 'unknown')); return }
    setMsg('Invitation sent to ' + pr.email)
    load()
  }
  const inviteAll = async () => {
    const items = providers.filter(pr => pr.email && !pr.invited_at).map(pr => ({ provider_id: pr.id, email: pr.email, name: pr.name }))
    if (!items.length) { setMsg('No un-invited providers with emails on this page.'); return }
    if (typeof window !== 'undefined' && !window.confirm('Send claim invitations to ' + items.length + ' providers on this page?')) return
    setMsg('Sending ' + items.length + ' invitations…')
    const res = await fetch('/api/outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) })
    const r = await res.json().catch(() => ({}))
    setMsg(r.error ? ('Invites failed: ' + r.error) : ('Sent ' + (r.sent || 0) + ' invitations' + (r.errors && r.errors.length ? ' · ' + r.errors.length + ' failed' : '')))
    load()
  }

  // ── Site settings (pricing) ──
  const loadSite = async () => {
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'pricing').single()
    setSiteP(data?.value || { tiers: [] })
  }
  const saveSite = async () => {
    const { error } = await supabase.from('site_settings').upsert({ key: 'pricing', value: siteP, updated_at: new Date().toISOString() })
    setMsg(error ? 'Error saving: ' + error.message : 'Pricing saved — live on /pricing.')
  }
  const updTier = (i, patch) => setSiteP(sp => ({ ...sp, tiers: sp.tiers.map((t, idx) => idx === i ? { ...t, ...patch } : t) }))

  // Map a doctor's specialty to an admin category (for the category filter)
  const docCategory = (p) => {
    if (p.category) return p.category
    const sp = specialties.find(x => x.snomed_code === p.specialty_code)
    const cat = sp?.category || ''
    const nm = sp?.name || p.specialty || ''
    if (cat === 'Diagnostics and imaging') return 'Imaging'
    if (nm === 'Physiotherapy') return 'Physiotherapy'
    if (cat === 'Rehab and pain') return 'Rehab'
    if (cat === 'Primary and emergency' || /family/i.test(nm)) return 'Family Medicine'
    return 'Specialist'
  }

  const editDoctor = (p) => {
    setEditingDoc(p.id)
    setDocForm({
      name: p.name || 'Dr. ', specialty: p.specialty || '', specialty_code: p.specialty_code || '', gender: p.gender || '', category: p.category || (/famil/i.test(p.specialty || '') ? 'Family Medicine' : 'Specialist'),
      accepting_referrals: !!p.accepting_referrals, accepting_new_patients: !!p.accepting_new_patients,
      wait_weeks: p.wait_weeks ?? '', criteria: p.criteria || '',
      referral_types: (p.referral_types || []).join(', '), languages: (p.languages || ['English']).join(', '),
      hours: p.hours || { mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null },
    })
    setDocLocations([{ name:'', address:'', phone:'', fax:'' }]); setClinicQuery(''); setClinicResults([])
    setTab('doctor')
  }

  const deleteDoctor = async (p) => {
    if (!supabase) return
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${p.name}"? This removes the doctor and their clinic links (the clinics themselves stay).`)) return
    await supabase.from('physician_locations').delete().eq('physician_id', p.id)
    const { error } = await supabase.from('physicians').delete().eq('id', p.id)
    if (error) { setMsg('Error deleting: ' + error.message); return }
    setMsg('Doctor deleted.'); load()
  }

  const saveDoctor = async () => {
    const name = withDr(docForm.name)
    if (!name || /^dr\.?\s*$/i.test(name)) { setMsg("Please enter the doctor's name"); return }
    const rec = {
      name,
      specialty: docForm.specialty || null,
      specialty_code: docForm.specialty_code || null,
      gender: docForm.gender || null,
      category: docForm.category || (/famil/i.test(docForm.specialty || '') ? 'Family Medicine' : 'Specialist'),
      accepting_referrals: docForm.accepting_referrals ?? null,
      accepting_new_patients: docForm.accepting_new_patients ?? null,
      wait_weeks: (docForm.wait_weeks !== '' && docForm.wait_weeks !== null) ? parseInt(docForm.wait_weeks) : null,
      criteria: docForm.criteria || null,
      referral_types: docForm.referral_types ? docForm.referral_types.split(',').map(x=>x.trim()).filter(Boolean) : null,
      languages: docForm.languages ? docForm.languages.split(',').map(x=>x.trim()).filter(Boolean) : null,
      hours: docForm.hours || null,
      status: 'active',
    }
    let docId = editingDoc
    if (editingDoc) {
      const { error } = await supabase.from('physicians').update(rec).eq('id', editingDoc)
      if (error) { setMsg("Error saving doctor: " + error.message); return }
    } else {
      const { data: doc, error } = await supabase.from('physicians').insert(rec).select().single()
      if (error || !doc) { setMsg("Error saving doctor: " + (error?.message || "no row returned")); return }
      docId = doc.id
    }

    // Locations: linked clinics reuse the existing provider; typed-in ones create a 'partial' provider.
    let warn = null
    const locs = docLocations.filter(l => l.provider_id || (l.name||'').trim() || (l.address||'').trim() || (l.phone||'').trim() || (l.fax||'').trim())
    for (let i = 0; i < locs.length; i++) {
      const l = locs[i]
      let provId = l.provider_id
      if (!provId) {
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
        provId = pRow.id
      }
      const { error: lErr } = await supabase.from('physician_locations').insert({ physician_id: docId, provider_id: provId, is_primary: i === 0 })
      if (lErr) warn = "Doctor saved, but linking a location failed: " + lErr.message
    }
    setMsg(warn || (editingDoc ? "Doctor updated." : "Doctor added — their profile page is live and searchable."))
    setEditingDoc(null); setDocForm(emptyDoc()); setDocLocations([{ name:'', address:'', phone:'', fax:'' }]); setTab("list"); load(); loadStats()
  }

  const ensureSpecialty = async (label, category) => {
    const name = (label || '').trim()
    if (!name || !supabase) return
    if (specialties.some(sp => (sp.name || '').toLowerCase() === name.toLowerCase())) return
    const code = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
    const { data } = await supabase.from('specialties').upsert({ snomed_code: code, name, category: category || 'Other', category_order: 99 }, { onConflict: 'snomed_code' }).select().single()
    if (data) setSpecialties(list => [...list.filter(x => x.snomed_code !== code), data])
  }

  const save = async () => {
    // keep the legacy providers.doctors[] string array in sync from the structured rows
    const doctorNames = doctorRows.map(r => { const nm = withDr(r.name); return nm && r.specialty ? `${nm} — ${r.specialty}` : nm }).map(x => (x || '').trim()).filter(Boolean)
    if (form.type && form.type.trim() && !form.specialty_code) { await ensureSpecialty(form.type, form.category) }
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
        const payload = { name: withDr(r.name), specialty: r.specialty || null, specialty_code: r.specialty_code || null, gender: r.gender || null, accepting_referrals: r.accepting_referrals ?? null, category: /famil/i.test(r.specialty || '') ? 'Family Medicine' : 'Specialist' }
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
      rows = (links || []).filter(l => l.physicians).map(l => ({ id: l.physicians.id, name: l.physicians.name || '', specialty: l.physicians.specialty || '', specialty_code: l.physicians.specialty_code || '', gender: l.physicians.gender || '', accepting_referrals: l.physicians.accepting_referrals }))
    } catch {}
    // fallback: if no linked doctors yet but legacy string names exist, seed rows so admin can convert them (saving creates real physician records)
    if (rows.length === 0 && (p.doctors || []).length > 0) {
      rows = p.doctors.map(n => ({ name: String(n).replace(/\s*—.*/, '').trim(), specialty: p.type || '', specialty_code: '', gender: '' }))
    }
    setDoctorRows(rows); setOrigDocIds(rows.filter(r => r.id).map(r => r.id))
    setEditing(p.id); setTab("edit")
  }

  const s = { width:"100%", padding:"8px 10px", fontSize:"13px", background:"#ffffff", border:"1px solid #d1d5db", borderRadius:"6px", color:"#111827", outline:"none", marginTop:"4px" }
  const lbl = { fontSize:"11px", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginTop:"12px" }

  if (!authed) return (
    <div style={{ fontFamily:"Inter, sans-serif", background:"#f8fafc", color:"#111827", minHeight:"100vh", display:"flex", justifyContent:"center", alignItems:"center" }}>
      <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"14px", padding:"32px", width:"340px" }}>
        <h2 style={{ margin:"0 0 4px", fontSize:"18px" }}>🔐 ReferEasy Admin</h2>
        <p style={{ margin:"0 0 20px", fontSize:"12px", color:"#64748b" }}>Enter admin password</p>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==="Enter" && login()} placeholder="Password" style={s} />
        <button onClick={login} style={{ all:"unset", cursor:"pointer", display:"block", width:"100%", marginTop:"12px", padding:"10px", textAlign:"center", background:"#3b82f6", color:"#fff", borderRadius:"8px", fontSize:"13px", fontWeight:600 }}>Login</button>
        {msg && <p style={{ color:"#dc2626", fontSize:"12px", marginTop:"8px" }}>{msg}</p>}
      </div>
    </div>
  )

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const statusColor = { complete: "#059669", partial: "#d97706", incomplete: "#dc2626" }

  return (
    <div style={{ fontFamily:"Inter, sans-serif", background:"#f8fafc", color:"#111827", minHeight:"100vh" }}>
      <div style={{ padding:"14px 20px", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1 style={{ margin:0, fontSize:"18px", fontWeight:700 }}>🔗 Refer<span style={{ color:"#2563eb" }}>Easy</span> <span style={{ color:"#64748b", fontWeight:400 }}>Admin</span></h1>
        <div style={{ display:"flex", gap:"8px" }}>
          <button onClick={() => { setTab("list"); setEditing(null); setForm(empty()) }} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:tab==="list"?"#3b82f6":"#ffffff", color:tab==="list"?"#fff":"#64748b", border:"1px solid " + (tab==="list"?"#3b82f6":"#e2e8f0") }}>Providers</button>
          <button onClick={() => setTab("claims")} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:tab==="claims"?"#d97706":"#ffffff", color:tab==="claims"?"#fff":"#64748b", border:"1px solid " + (tab==="claims"?"#d97706":"#e2e8f0"), display:"flex", alignItems:"center", gap:"4px" }}>Claims {pendingCount > 0 && <span style={{ background:"#dc2626", color:"#fff", borderRadius:"999px", padding:"1px 6px", fontSize:"10px", fontWeight:700 }}>{pendingCount}</span>}</button>
          <button onClick={() => { setTab("dupes"); if (dupGroups.length === 0) scanDupes() }} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:tab==="dupes"?"#dc2626":"#ffffff", color:tab==="dupes"?"#fff":"#64748b", border:"1px solid " + (tab==="dupes"?"#dc2626":"#e2e8f0") }}>Duplicates</button>
          <button onClick={() => { setTab("site"); if (!siteP) loadSite() }} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:tab==="site"?"#0891b2":"#ffffff", color:tab==="site"?"#fff":"#64748b", border:"1px solid " + (tab==="site"?"#0891b2":"#e2e8f0") }}>Site</button>
          <button onClick={() => { setTab("edit"); setEditing(null); setForm(empty()); setServicesText(""); setDoctorsText(""); setLanguagesText("English"); setDoctorRows([]); setOrigDocIds([]) }} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:tab==="edit"&&!editing?"#059669":"#ffffff", color:tab==="edit"&&!editing?"#fff":"#64748b", border:"1px solid " + (tab==="edit"&&!editing?"#059669":"#e2e8f0") }}>+ Clinic</button>
          <button onClick={() => { setTab("doctor"); setEditing(null); setEditingDoc(null); setDocForm(emptyDoc()); setDocLocations([{ name:'', address:'', phone:'', fax:'' }]) }} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:tab==="doctor"&&!editingDoc?"#7c3aed":"#ffffff", color:tab==="doctor"&&!editingDoc?"#fff":"#64748b", border:"1px solid " + (tab==="doctor"&&!editingDoc?"#7c3aed":"#e2e8f0") }}>+ Doctor</button>
          <a href="/" style={{ padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:"#ffffff", color:"#64748b", border:"1px solid #e2e8f0", textDecoration:"none" }}>← Site</a>
          <button onClick={logout} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>Log out</button>
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
            <div key={s.label} style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"12px", textAlign:"center" }}>
              <div style={{ fontSize:"24px", fontWeight:700, color:s.color }}>{s.value.toLocaleString()}</div>
              <div style={{ fontSize:"10px", color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</div>
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
              <span style={{ fontSize:"12px", color:"#64748b" }}>{(total + physicians.filter(d => !catFilter || docCategory(d) === catFilter).length).toLocaleString()} results (page {page+1}/{totalPages || 1})</span>
              <div style={{ display:"flex", gap:"4px" }}>
                <button disabled={page===0} onClick={() => setPage(p=>p-1)} style={{ all:"unset", cursor:page===0?"default":"pointer", padding:"4px 10px", fontSize:"11px", borderRadius:"6px", background:"#ffffff", color:page===0?"#cbd5e1":"#64748b", border:"1px solid #e2e8f0" }}>← Prev</button>
                <button disabled={page>=totalPages-1} onClick={() => setPage(p=>p+1)} style={{ all:"unset", cursor:page>=totalPages-1?"default":"pointer", padding:"4px 10px", fontSize:"11px", borderRadius:"6px", background:"#ffffff", color:page>=totalPages-1?"#cbd5e1":"#64748b", border:"1px solid #e2e8f0" }}>Next →</button>
                <button onClick={inviteAll} style={{ all:"unset", cursor:"pointer", padding:"4px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#0891b220", color:"#0891b2", border:"1px solid #0891b240", marginLeft:"8px" }}>✉ Invite page</button>
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {physicians.filter(d => !catFilter || docCategory(d) === catFilter).map(d => (
                <div key={'doc-' + d.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#ffffff", border:"1px solid #7c3aed40", borderRadius:"8px", padding:"10px 14px", gap:"8px" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"13px", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      <span style={{ fontSize:"9px", fontWeight:700, color:"#7c3aed", background:"#7c3aed20", border:"1px solid #7c3aed40", borderRadius:"999px", padding:"1px 6px", marginRight:"6px" }}>DOCTOR</span>
                      {d.name}
                      {d.verified && <span style={{ marginLeft:"6px", fontSize:"9px", fontWeight:700, color:"#2563eb", background:"#3b82f620", border:"1px solid #3b82f640", borderRadius:"999px", padding:"1px 6px" }}>VERIFIED</span>}
                      {d.owner_id && <span style={{ marginLeft:"6px", fontSize:"9px", fontWeight:700, color:"#059669", background:"#05966920", border:"1px solid #05966940", borderRadius:"999px", padding:"1px 6px" }}>CLAIMED</span>}
                    </div>
                    <div style={{ fontSize:"11px", color:"#64748b" }}>{d.specialty || 'Physician'}{d.gender ? ` · ${d.gender}` : ''}{d.accepting_referrals ? ' · accepting referrals' : ''}</div>
                  </div>
                  <div style={{ display:"flex", gap:"4px", alignItems:"center", flexShrink:0 }}>
                    <a href={`/doctors/${d.id}`} target="_blank" rel="noopener noreferrer" style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#e2e8f0", color:"#475569", border:"1px solid #cbd5e1" }}>View</a>
                    <button onClick={() => editDoctor(d)} style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#3b82f620", color:"#3b82f6", border:"1px solid #3b82f640" }}>Edit</button>
                    <button onClick={() => deleteDoctor(d)} style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>Del</button>
                  </div>
                </div>
              ))}
              {providers.map(p => (
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"10px 14px", gap:"8px" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"13px", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</div>
                    <div style={{ fontSize:"11px", color:"#64748b" }}>
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
                    {p.email && <button onClick={() => invite(p)} disabled={inviting === p.id} style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:p.invited_at?"#05966920":"#0891b220", color:p.invited_at?"#059669":"#0891b2", border:"1px solid " + (p.invited_at?"#05966940":"#0891b240") }}>{inviting === p.id ? "…" : p.invited_at ? "✓ Invited" : "✉ Invite"}</button>}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : tab === "edit" ? (
          <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"20px" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:"16px" }}>{editing ? "Edit Provider" : "Add New Provider"}</h3>

            {/* Website Extractor */}
            <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:"8px", padding:"14px", marginBottom:"16px" }}>
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
                          setForm(prev => ({ ...prev, name: d.name || prev.name, type: d.type || prev.type, category: d.category || prev.category, address: d.address || prev.address, phone: d.phone || prev.phone, fax: d.fax || prev.fax, email: d.email || prev.email, website: d.website || prev.website, hours: normalizeHours(d.hours) || prev.hours, requirements: d.requirements || prev.requirements, accepting_referrals: d.accepting_referrals ?? prev.accepting_referrals }))
                          setServicesText((d.services || []).join(', '))
                          setDoctorsText((d.doctors || []).join(', '))
                        setDoctorRows((d.doctors || []).map(n => ({ name: n, specialty: d.type || '', specialty_code: '', gender: '' })))
                          setLanguagesText((d.languages || []).join(', '))
                          setMsg(`Found ${result.count} locations. Showing first one. Save and extract again for others.`)
                        }
                      } else {
                        // Single location — fill the form
                        const d = result.data
                        setForm(prev => ({ ...prev, name: d.name || prev.name, type: d.type || prev.type, category: d.category || prev.category, address: d.address || prev.address, phone: d.phone || prev.phone, fax: d.fax || prev.fax, email: d.email || prev.email, website: d.website || prev.website, hours: normalizeHours(d.hours) || prev.hours, requirements: d.requirements || prev.requirements, accepting_referrals: d.accepting_referrals ?? prev.accepting_referrals }))
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
              <div><label style={lbl}>Custom Type Label</label><input style={s} value={form.type} onChange={e => setForm({...form, type:e.target.value})} placeholder="Or type a new specialty — it gets added to the list" /></div>
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
            <div style={{ fontSize:"11px", color:"#64748b", margin:"2px 0 8px" }}>Each doctor gets their own profile page, linked to this clinic.</div>
            {doctorRows.map((r, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1.2fr 1.2fr 0.7fr 0.9fr auto", gap:"6px", marginBottom:"6px", alignItems:"center" }}>
                <input style={{ ...s, marginTop:0 }} placeholder="Dr. Full Name" value={r.name} onChange={e => updateDoctor(i, { name: e.target.value })} />
                <select style={{ ...s, marginTop:0 }} value={r.specialty_code || ''} onChange={e => { const sp = specialties.find(x => x.snomed_code === e.target.value); updateDoctor(i, sp ? { specialty_code: sp.snomed_code, specialty: sp.name } : { specialty_code: '', specialty: '' }) }}>
                  <option value="">Specialty…</option>
                  {(() => { const groups = {}; specialties.forEach(sp => { if (!groups[sp.category]) groups[sp.category] = []; groups[sp.category].push(sp) }); return Object.entries(groups).map(([cat, specs]) => <optgroup key={cat} label={cat}>{specs.map(sp => <option key={sp.snomed_code} value={sp.snomed_code}>{sp.name}</option>)}</optgroup>) })()}
                </select>
                <select style={{ ...s, marginTop:0 }} value={r.gender || ''} onChange={e => updateDoctor(i, { gender: e.target.value })}>
                  <option value="">Gender…</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
                </select>
                <select style={{ ...s, marginTop:0 }} value={r.accepting_referrals == null ? 'unknown' : r.accepting_referrals ? 'true' : 'false'} onChange={e => updateDoctor(i, { accepting_referrals: e.target.value === 'unknown' ? null : e.target.value === 'true' })}>
                  <option value="unknown">Unknown</option><option value="true">Accepting</option><option value="false">Not accepting</option>
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
                  <div style={{ fontSize:"9px", color:"#64748b", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:"3px", textAlign:"center" }}>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</div>
                  <input style={{ ...s, marginTop:0, padding:"6px 4px", fontSize:"11px", textAlign:"center" }} value={form.hours?.[d] || ''} onChange={e => setForm({ ...form, hours: { ...form.hours, [d]: e.target.value || null } })} placeholder="9-17" />
                </div>
              ))}
            </div>
            {editing && (
              <div style={{ marginTop:"20px", paddingTop:"16px", borderTop:"1px solid #e2e8f0" }}>
                <label style={lbl}>Forms</label>
                <div style={{ fontSize:"11px", color:"#64748b", margin:"2px 0 10px" }}>Uploaded forms appear on the public listing for referring doctors to download.</div>
                <FormsManager providerId={editing} />
              </div>
            )}
            <div style={{ display:"flex", gap:"10px", marginTop:"20px" }}>
              <button onClick={save} style={{ all:"unset", cursor:"pointer", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:600, background:"#3b82f6", color:"#fff" }}>{editing ? "Save" : "Add"}</button>
              <button onClick={() => { setTab("list"); setEditing(null); setForm(empty()) }} style={{ all:"unset", cursor:"pointer", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:600, background:"#e2e8f0", color:"#64748b" }}>Cancel</button>
            </div>
          </div>
        ) : null}
        {tab === "doctor" && (
          <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"20px" }}>
            <h3 style={{ margin:"0 0 4px", fontSize:"16px" }}>{editingDoc ? 'Edit Doctor' : 'Add Doctor'}</h3>
            <p style={{ margin:"0 0 16px", fontSize:"12px", color:"#64748b" }}>{editingDoc ? "Update this doctor's details. Add a clinic below to link them to a practice location." : 'Creates a standalone, searchable, claimable doctor profile. Add one or more places they practise.'}</p>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
              <div><label style={lbl}>Full Name *</label><input style={s} value={docForm.name} onChange={e => setDoc('name', e.target.value)} placeholder="Dr. Jane Smith" /></div>
              <div><label style={lbl}>Specialty *</label><select style={s} value={docForm.specialty_code || ''} onChange={e => { const sp = specialties.find(x => x.snomed_code === e.target.value); if (sp) setDocForm(f => ({ ...f, specialty_code: sp.snomed_code, specialty: sp.name })); else setDocForm(f => ({ ...f, specialty_code:'', specialty:'' })) }}><option value="">Select specialty...</option>{(() => { const groups = {}; specialties.forEach(sp => { if (!groups[sp.category]) groups[sp.category] = []; groups[sp.category].push(sp) }); return Object.entries(groups).map(([cat, specs]) => <optgroup key={cat} label={cat}>{specs.map(sp => <option key={sp.snomed_code} value={sp.snomed_code}>{sp.name}</option>)}</optgroup>) })()}</select></div>
              <div><label style={lbl}>Gender</label><select style={s} value={docForm.gender || ''} onChange={e => setDoc('gender', e.target.value)}><option value="">—</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></div>
              <div><label style={lbl}>Category (search tab they appear under)</label><select style={s} value={docForm.category || 'Specialist'} onChange={e => setDoc('category', e.target.value)}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label style={lbl}>Wait (weeks)</label><input style={s} type="number" min="0" value={docForm.wait_weeks} onChange={e => setDoc('wait_weeks', e.target.value)} placeholder="Leave blank if varies" /></div>
              <div><label style={lbl}>Accepting Referrals</label><select style={s} value={docForm.accepting_referrals == null ? 'unknown' : docForm.accepting_referrals ? 'true' : 'false'} onChange={e => setDoc('accepting_referrals', e.target.value === 'unknown' ? null : e.target.value === 'true')}><option value="unknown">Unknown (grey)</option><option value="true">Yes</option><option value="false">No</option></select></div>
              <div><label style={lbl}>Accepting New Patients</label><select style={s} value={docForm.accepting_new_patients == null ? 'unknown' : docForm.accepting_new_patients ? 'true' : 'false'} onChange={e => setDoc('accepting_new_patients', e.target.value === 'unknown' ? null : e.target.value === 'true')}><option value="unknown">Unknown (grey)</option><option value="false">No</option><option value="true">Yes</option></select></div>
            </div>
            <label style={lbl}>Referral Types (comma-separated)</label>
            <input style={s} value={docForm.referral_types} onChange={e => setDoc('referral_types', e.target.value)} placeholder="Consultation, Procedure, Follow-up" />
            <label style={lbl}>Languages (comma-separated)</label>
            <input style={s} value={docForm.languages} onChange={e => setDoc('languages', e.target.value)} placeholder="English, French, Farsi" />
            <label style={lbl}>Referral Criteria</label>
            <textarea style={{ ...s, minHeight:"60px", resize:"vertical" }} value={docForm.criteria} onChange={e => setDoc('criteria', e.target.value)} placeholder="e.g. GP referral required, recent imaging, OHIP card" />

            <label style={{ ...lbl, marginTop:"20px" }}>Hours (start-end, e.g. 9:00-17:00 — blank = closed)</label>
            <div style={{ fontSize:"11px", color:"#64748b", margin:"2px 0 8px" }}>For doctors who run their own practice. Leave blank if they only work out of the clinics below.</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:"6px" }}>
              {DAYS.map((d, i) => (
                <div key={d}>
                  <div style={{ fontSize:"9px", color:"#64748b", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:"3px", textAlign:"center" }}>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</div>
                  <input style={{ ...s, marginTop:0, padding:"6px 4px", fontSize:"11px", textAlign:"center" }} value={docForm.hours?.[d] || ''} onChange={e => setDocForm(f => ({ ...f, hours: { ...f.hours, [d]: e.target.value || null } }))} placeholder="9-17" />
                </div>
              ))}
            </div>

            <label style={{ ...lbl, marginTop:"20px" }}>Locations (where they practise)</label>
            <div style={{ fontSize:"11px", color:"#64748b", margin:"2px 0 8px" }}>Link an existing clinic to auto-fill its address, phone, fax and hours — or type a new location below.</div>

            <div style={{ position:"relative", marginBottom:"10px" }}>
              <input style={{ ...s, marginTop:0 }} value={clinicQuery} onChange={e => searchClinics(e.target.value)} placeholder="🔎 Search existing clinics to link…" />
              {clinicResults.length > 0 && (
                <div style={{ position:"absolute", zIndex:30, left:0, right:0, top:"100%", marginTop:"4px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px", maxHeight:"220px", overflowY:"auto" }}>
                  {clinicResults.map(c => (
                    <button key={c.id} onClick={() => addClinicLoc(c)} style={{ all:"unset", cursor:"pointer", display:"block", width:"100%", boxSizing:"border-box", padding:"8px 12px", borderBottom:"1px solid #e2e8f0" }}>
                      <div style={{ fontSize:"13px", color:"#111827", fontWeight:600 }}>{c.name}</div>
                      {c.address && <div style={{ fontSize:"11px", color:"#64748b" }}>{c.address}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {docLocations.map((l, i) => (
              l.provider_id ? (
                <div key={i} style={{ border:"1px solid #cbd5e1", background:"#f1f5f9", borderRadius:"8px", padding:"10px 12px", marginBottom:"8px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
                  <div>
                    <div style={{ fontSize:"13px", color:"#111827", fontWeight:600 }}>{l.name}<span style={{ fontSize:"9px", color:"#2563eb", background:"#3b82f620", border:"1px solid #3b82f640", borderRadius:"999px", padding:"1px 6px", marginLeft:"6px" }}>LINKED CLINIC</span></div>
                    {l.address && <div style={{ fontSize:"11px", color:"#64748b" }}>{l.address}</div>}
                    <div style={{ fontSize:"11px", color:"#64748b" }}>Address, phone, fax &amp; hours are pulled from this clinic automatically.</div>
                  </div>
                  <button onClick={() => rmDocLoc(i)} title="Unlink" style={{ all:"unset", cursor:"pointer", padding:"6px 10px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>✕</button>
                </div>
              ) : (
                <div key={i} style={{ border:"1px solid #e2e8f0", borderRadius:"8px", padding:"10px", marginBottom:"8px" }}>
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
              )
            ))}
            <button onClick={addDocLoc} style={{ all:"unset", cursor:"pointer", padding:"7px 14px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#3b82f620", color:"#3b82f6", border:"1px solid #3b82f640" }}>+ Add location manually</button>

            <div style={{ display:"flex", gap:"10px", marginTop:"20px" }}>
              <button onClick={saveDoctor} style={{ all:"unset", cursor:"pointer", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:600, background:"#7c3aed", color:"#fff" }}>{editingDoc ? 'Save Changes' : 'Add Doctor'}</button>
              <button onClick={() => { setTab("list"); setEditingDoc(null); setDocForm(emptyDoc()); setDocLocations([{ name:'', address:'', phone:'', fax:'' }]) }} style={{ all:"unset", cursor:"pointer", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:600, background:"#e2e8f0", color:"#64748b" }}>Cancel</button>
            </div>
          </div>
        )}
        {tab === "dupes" && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px", gap:"10px", flexWrap:"wrap" }}>
              <div style={{ fontSize:"13px", color:"#64748b" }}>Groups of listings sharing the same phone number or name. Pick which one to keep, then merge — doctors, links and forms move to the kept listing.</div>
              <button onClick={scanDupes} disabled={dupScanning} style={{ all:"unset", cursor:"pointer", padding:"8px 18px", borderRadius:"8px", fontSize:"13px", fontWeight:600, background:"#dc2626", color:"#fff", opacity:dupScanning?0.6:1 }}>{dupScanning ? "Scanning…" : "Re-scan"}</button>
            </div>
            {dupScanning && <div style={{ textAlign:"center", padding:"40px", color:"#64748b", fontSize:"13px" }}>Scanning all listings…</div>}
            {!dupScanning && dupGroups.length === 0 && <div style={{ textAlign:"center", padding:"40px", color:"#64748b", fontSize:"13px" }}>No duplicate groups found.</div>}
            <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
              {dupGroups.map((g, gi) => (
                <div key={gi} style={{ background:"#ffffff", border:"1px solid #fca5a5", borderRadius:"10px", padding:"12px 14px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                    <span style={{ fontSize:"11px", fontWeight:700, color:"#dc2626", textTransform:"uppercase", letterSpacing:"0.05em" }}>{g.length} possible duplicates</span>
                    <button onClick={() => mergeGroup(gi)} style={{ all:"unset", cursor:"pointer", padding:"5px 14px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#059669", color:"#fff" }}>Merge into selected</button>
                  </div>
                  {g.map(pr => (
                    <div key={pr.id} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"7px 0", borderTop:"1px solid #f1f5f9" }}>
                      <input type="radio" name={"keep" + gi} checked={(dupKeeper[gi] ?? g[0].id) === pr.id} onChange={() => setDupKeeper(k => ({ ...k, [gi]: pr.id }))} style={{ cursor:"pointer" }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"13px", fontWeight:600, color:"#111827" }}>{pr.name} <span style={{ fontSize:"10px", color:"#94a3b8" }}>#{pr.id} · {pr.data_status}</span></div>
                        <div style={{ fontSize:"11px", color:"#64748b" }}>{pr.address || "no address"}{pr.phone ? " · " + pr.phone : ""}{pr.email ? " · " + pr.email : ""}</div>
                      </div>
                      <button onClick={() => edit(pr)} style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#3b82f620", color:"#3b82f6", border:"1px solid #3b82f640" }}>Edit</button>
                      <button onClick={() => dupDelete(gi, pr.id)} style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>Del</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "site" && (
          <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"20px" }}>
            <h3 style={{ margin:"0 0 4px", fontSize:"16px" }}>Site Content — Pricing</h3>
            <p style={{ margin:"0 0 16px", fontSize:"12px", color:"#64748b" }}>Edits here go live on the public /pricing page when you hit Save.</p>
            {!siteP ? <div style={{ color:"#64748b", fontSize:"13px" }}>Loading…</div> : (
              <>
                {(siteP.tiers || []).map((t, i) => (
                  <div key={i} style={{ border:"1px solid #e2e8f0", borderRadius:"10px", padding:"14px", marginBottom:"12px" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 0.6fr 0.6fr 1.4fr", gap:"10px" }}>
                      <div><label style={lbl}>Plan name</label><input style={s} value={t.name || ""} onChange={e => updTier(i, { name: e.target.value })} /></div>
                      <div><label style={lbl}>Price</label><input style={s} value={t.price || ""} onChange={e => updTier(i, { price: e.target.value })} placeholder="$29" /></div>
                      <div><label style={lbl}>Period</label><input style={s} value={t.period || ""} onChange={e => updTier(i, { period: e.target.value })} placeholder="/month" /></div>
                      <div><label style={lbl}>Tagline</label><input style={s} value={t.tagline || ""} onChange={e => updTier(i, { tagline: e.target.value })} /></div>
                    </div>
                    <label style={lbl}>Features (one per line)</label>
                    <textarea style={{ ...s, minHeight:"90px", resize:"vertical" }} value={(t.features || []).join("\n")} onChange={e => updTier(i, { features: e.target.value.split("\n") })} />
                    <div style={{ display:"flex", gap:"16px", marginTop:"10px", alignItems:"center" }}>
                      <div style={{ flex:1 }}><label style={lbl}>Button text</label><input style={s} value={t.cta || ""} onChange={e => updTier(i, { cta: e.target.value })} /></div>
                      <label style={{ fontSize:"12px", color:"#64748b", display:"flex", alignItems:"center", gap:"6px", cursor:"pointer", marginTop:"18px" }}><input type="checkbox" checked={!!t.highlight} onChange={e => updTier(i, { highlight: e.target.checked })} /> Highlight as most popular</label>
                    </div>
                  </div>
                ))}
                <button onClick={saveSite} style={{ all:"unset", cursor:"pointer", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:600, background:"#0891b2", color:"#fff" }}>Save — publish to /pricing</button>
              </>
            )}
          </div>
        )}
        {tab === "claims" && (
          <>
            <h2 style={{ fontSize:"16px", fontWeight:700, marginBottom:"12px" }}>Listing Claims</h2>
            {claims.length === 0 ? (
              <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"30px", textAlign:"center", color:"#64748b", fontSize:"13px" }}>No claims yet</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                {claims.map(c => (
                  <div key={c.id} style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"12px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:"13px", fontWeight:600 }}>{c.providers?.name || c.physicians?.name || 'Unknown'}{c.physician_id && <span style={{ marginLeft:"6px", fontSize:"9px", fontWeight:700, color:"#7c3aed", background:"#7c3aed20", border:"1px solid #7c3aed40", borderRadius:"999px", padding:"1px 6px" }}>DOCTOR</span>}</div>
                        <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>{c.providers ? `${c.providers.type} · ${c.providers.address || ''}` : (c.physicians?.specialty || 'Physician profile')}</div>
                        <div style={{ fontSize:"11px", color:"#64748b", marginTop:"4px" }}>
                          Claimed by: <span style={{ color:"#111827" }}>{c.user_name}</span> ({c.user_email})
                        </div>
                        {(c.verify_email || c.verify_fax || c.id_doc_url) && (
                          <div style={{ fontSize:"11px", color:"#64748b", marginTop:"4px", display:"flex", flexWrap:"wrap", gap:"12px", alignItems:"center", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"6px", padding:"6px 10px" }}>
                            <span style={{ color:"#475569", fontWeight:600 }}>Verification:</span>
                            {c.verify_email && <span>✉️ {c.verify_email}</span>}
                            {c.verify_fax && <span>📠 {c.verify_fax}</span>}
                            {c.id_doc_url && <a href={c.id_doc_url} target="_blank" rel="noopener noreferrer" style={{ color:"#2563eb", fontWeight:600 }}>📎 View ID</a>}
                          </div>
                        )}
                        <div style={{ fontSize:"10px", color:"#94a3b8", marginTop:"2px" }}>
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

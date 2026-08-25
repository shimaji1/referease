'use client'
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import FormsManager from "@/components/FormsManager"
import AdminSidebar from '@/components/AdminSidebar'
import { getPlanStatus } from '@/lib/plan'
import { TEMPLATES as ANNOUNCEMENT_TEMPLATES, DEFAULT_STYLE as ANNOUNCEMENT_DEFAULT_STYLE, mergeStyle as mergeAnnouncementStyle, fetchAllAnnouncements, createAdminAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/lib/announcements'
import AnnouncementToolbar from '@/components/AnnouncementToolbar'
import AnnouncementSlide from '@/components/AnnouncementSlide'
import RichTextEditor from '@/components/RichTextEditor'
import { slugify, fetchAllPosts, createPost, updatePost, deletePost } from '@/lib/posts'
import TrendChart from '@/components/TrendChart'
import { presetRange, fetchTrafficOverview, fetchTopPages, fetchTrafficSources, fetchDeviceBreakdown, fetchSearchInsights, fetchConversionFunnel, fetchProviderEngagementRollup } from '@/lib/siteAnalytics'
import { fetchSetting, saveSetting, DEFAULTS } from '@/lib/siteSettings'
import { DEFAULT_TERMS_HTML, DEFAULT_PRIVACY_HTML } from '@/lib/legalDefaults'
import { WAIT_TYPES, waitDaysApprox } from '@/lib/waitTime'
import { useAuth } from '@/context/AuthContext'

const CATS = ["Family Medicine","Multi-Specialty","Clinic","Specialist","Hospital","Imaging","Lab","Physiotherapy","Rehab"]
const STATUSES = ["complete","partial","incomplete"]
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"]

const empty = () => ({ name:"", type:"", category:"Specialist", services:[], address:"", phone:"", fax:"", email:"", website:"", rating:null, reviews:0, hours:{mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null}, accepting_referrals:null, accepting_new_patients:null, wait_type:null, wait_weeks:null, requirements:"", doctors:[], languages:["English"], data_status:"complete", specialty_code:null, sub_specialty:null, gender:null, cpso_url:null, criteria:"", referral_types:[], notes:"" })
const CAT_HEX = { 'Family Medicine':'#2563eb','Specialist':'#7c3aed','Multi-Specialty':'#4f46e5','Clinic':'#475569','Hospital':'#0891b2','Imaging':'#d97706','Lab':'#0d9488','Physiotherapy':'#ea580c','Rehab':'#db2777' }
const catHex = (c) => CAT_HEX[c] || '#64748b'
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


function PlanDropdown({ provider, onChange }) {
  const [busy, setBusy] = useState(false)
  const status = getPlanStatus(provider)
  const change = async (nextPlan) => {
    if (!supabase) return
    if (nextPlan === provider.plan) return
    setBusy(true)
    const payload = { plan: nextPlan }
    if (nextPlan === 'listed') {
      payload.trial_ends_at = null
      payload.plan_granted_by_admin = false
      payload.plan_notes = null
      payload.featured = false
      // Only strip verified if it was admin-granted (user-earned verification is permanent)
      if (provider.verified_granted_by_admin) {
        payload.verified = false
        payload.verified_granted_by_admin = false
        payload.verified_at = null
      }
    } else if (nextPlan === 'featured') {
      payload.plan_granted_by_admin = true
      payload.plan_started_at = new Date().toISOString()
      payload.trial_ends_at = null
      payload.last_reminder_sent = null
      payload.featured = true
      // Admin promotion always vouches for verified status. Idempotent.
      payload.verified = true
      if (!provider.verified) payload.verified_granted_by_admin = true
      // Backfills the date for older rows that were verified before this field existed.
      if (!provider.verified_at) payload.verified_at = new Date().toISOString()
    } else {
      // Verified plan
      payload.plan_granted_by_admin = true
      payload.plan_started_at = new Date().toISOString()
      payload.trial_ends_at = null
      payload.last_reminder_sent = null
      payload.featured = false
      // Admin promotion always vouches for verified status. Idempotent.
      payload.verified = true
      if (!provider.verified) payload.verified_granted_by_admin = true
      // Backfills the date for older rows that were verified before this field existed.
      if (!provider.verified_at) payload.verified_at = new Date().toISOString()
    }
    const { error } = await supabase.from('providers').update(payload).eq('id', provider.id)
    if (error) {
      console.error('PlanDropdown update failed:', error)
      alert('Plan update failed: ' + error.message)
    }
    setBusy(false)
    if (onChange) onChange()
  }
  const cls = status.tier === 'featured' ? { bg: '#7c3aed20', color: '#7c3aed', border: '#7c3aed40' }
            : status.tier === 'verified' ? { bg: '#3b82f620', color: '#3b82f6', border: '#3b82f640' }
            : { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' }
  return (
    <select
      value={provider.plan || 'listed'}
      disabled={busy}
      onChange={e => change(e.target.value)}
      title={`Plan: ${status.label}`}
      style={{ padding:'3px 6px', fontSize:'10px', fontWeight:600, borderRadius:'6px', background:cls.bg, color:cls.color, border:`1px solid ${cls.border}`, outline:'none', cursor:'pointer' }}
    >
      <option value="listed">Listed</option>
      <option value="verified">Verified</option>
      <option value="featured">Featured</option>
    </select>
  )
}

export default function AdminPage() {
  // Real admin login (Supabase Auth + profiles.is_admin) — see supabase-admin-auth.sql.
  const { user, profile, loading: authLoading, signIn, signOut, requestPasswordReset } = useAuth()
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPw, setAdminPw] = useState("")
  const [adminLoginErr, setAdminLoginErr] = useState("")
  const [adminLoggingIn, setAdminLoggingIn] = useState(false)
  const [adminForgotMode, setAdminForgotMode] = useState(false)
  const [adminResetSending, setAdminResetSending] = useState(false)
  const [adminResetSent, setAdminResetSent] = useState(false)
  const authed = !!user && profile?.is_admin === true
  const [providers, setProviders] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty())
  const [servicesText, setServicesText] = useState("")
  const [doctorsText, setDoctorsText] = useState("")
  const [languagesText, setLanguagesText] = useState("English")
  const [referralTypesText, setReferralTypesText] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [catFilter, setCatFilter] = useState("")
  const [planFilter, setPlanFilter] = useState("")
  const [msg, setMsg] = useState("")
  const [tab, setTab] = useState("list")
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({})
  const [claims, setClaims] = useState([])
  const [requestInfoFor, setRequestInfoFor] = useState(null) // claim id currently composing a message
  const [requestInfoText, setRequestInfoText] = useState('')
  const [requestInfoSending, setRequestInfoSending] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingAnnouncementCount, setPendingAnnouncementCount] = useState(0)
  const [specialties, setSpecialties] = useState([])
  const [doctorRows, setDoctorRows] = useState([])   // [{id?, name, specialty, specialty_code, gender}]
  const [origDocIds, setOrigDocIds] = useState([])   // doctor ids present when editing (for reconcile)
  const [dupGroups, setDupGroups] = useState([])
  const [dupScanning, setDupScanning] = useState(false)
  const [dupKeeper, setDupKeeper] = useState({})
  const [inviting, setInviting] = useState(null)
  const PAGE_SIZE = 50

  const adminLogin = async () => {
    setAdminLoginErr(""); setAdminLoggingIn(true)
    const { error } = await signIn(adminEmail.trim(), adminPw)
    setAdminLoggingIn(false)
    if (error) setAdminLoginErr(error.message)
  }
  const adminResetRequest = async () => {
    setAdminLoginErr("")
    if (!adminEmail.trim()) { setAdminLoginErr("Enter your email above first"); return }
    setAdminResetSending(true)
    const { error } = await requestPasswordReset(adminEmail.trim())
    setAdminResetSending(false)
    if (error) { setAdminLoginErr(error.message); return }
    setAdminResetSent(true)
  }
  const logout = async () => { await signOut() }

  // Load specialties
  useEffect(() => {
    if (!supabase || !authed) return
    supabase.from('specialties').select('*').order('category_order').order('name').then(({ data }) => { if (data) setSpecialties(data) })
  }, [authed])

  const load = useCallback(async () => {
    if (!supabase) return
    // One list, every category — a doctor row is a providers row like any other.
    let query = supabase.from("providers").select("*", { count: "exact" })
    if (search) query = query.or(`name.ilike.%${search}%,type.ilike.%${search}%,address.ilike.%${search}%`)
    if (statusFilter) query = query.eq("data_status", statusFilter)
    if (catFilter) query = query.eq("category", catFilter)
    if (planFilter) query = query.eq("plan", planFilter)
    query = query.order("name").range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    const { data, count, error } = await query
    if (error) { setMsg('Error loading providers: ' + error.message); return }
    if (data) setProviders(data)
    if (count !== null) setTotal(count)
  }, [search, statusFilter, catFilter, planFilter, page])

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

  // Handle extractor doctors that are either strings (legacy) or objects {name, specialty, gender}
  const mapExtractedDocs = (arr, fallbackType) => (arr || []).map(x => {
    const name = typeof x === 'string' ? x : (x.name || '')
    const sp   = typeof x === 'object' && x.specialty ? x.specialty : (fallbackType || '')
    const gRaw = typeof x === 'object' ? (x.gender || '') : ''
    const g    = /^female$/i.test(gRaw) ? 'female' : /^male$/i.test(gRaw) ? 'male' : /^other$/i.test(gRaw) ? 'other' : ''
    // Match specialty to an existing snomed row so the dropdown pre-selects
    const spRow = sp ? specialties.find(x => (x.name || '').toLowerCase() === sp.toLowerCase()) : null
    return { name, specialty: spRow?.name || sp, specialty_code: spRow?.snomed_code || '', gender: g, accepting_referrals: null }
  })

  const addDoctor = () => setDoctorRows(rows => [...rows, { name: 'Dr. ', specialty: '', specialty_code: '', gender: '', accepting_referrals: null }])
  const updateDoctor = (i, patch) => setDoctorRows(rows => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const removeDoctor = (i) => setDoctorRows(rows => rows.filter((_, idx) => idx !== i))
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('')
  const [doctorSearchResults, setDoctorSearchResults] = useState([])
  const searchExistingDoctors = async (q) => {
    setDoctorSearchQuery(q)
    if (!supabase || q.trim().length < 2) { setDoctorSearchResults([]); return }
    const { data } = await supabase.from('providers').select('id, name, type, clinic_provider_id').in('category', ['Specialist', 'Family Medicine']).ilike('name', `%${q.trim()}%`).limit(8)
    setDoctorSearchResults((data || []).filter(d => !doctorRows.some(r => r.id === d.id)))
  }
  const linkExistingDoctor = (d) => {
    setDoctorRows(rows => rows.some(r => r.id === d.id) ? rows : [...rows, { id: d.id, name: d.name, specialty: d.type || '', specialty_code: '', gender: '', accepting_referrals: null }])
    setDoctorSearchQuery(''); setDoctorSearchResults([])
  }
  // Loose name match against existing doctors — used to block accidental duplicate creation
  const findDoctorByName = async (name) => {
    const clean = String(name || '').replace(/^dr\.?\s*/i, '').trim()
    if (!clean) return null
    const { data } = await supabase.from('providers').select('id, name').in('category', ['Specialist', 'Family Medicine']).ilike('name', `%${clean}%`).limit(1)
    return (data && data[0]) || null
  }
  // This listing's own link to a clinic/parent location — works for any category, not just doctors.
  const [linkedClinics, setLinkedClinics] = useState([])
  const [clinicLinkQuery, setClinicLinkQuery] = useState('')
  const [clinicLinkResults, setClinicLinkResults] = useState([])
  const searchLinkableClinics = async (q) => {
    setClinicLinkQuery(q)
    if (!supabase || q.trim().length < 2) { setClinicLinkResults([]); return }
    const { data } = await supabase.from('providers').select('id, name, address').ilike('name', `%${q.trim()}%`).limit(8)
    setClinicLinkResults((data || []).filter(c => c.id !== editing && !linkedClinics.some(l => l.id === c.id)))
  }
  const linkClinicToForm = (c) => {
    if (linkedClinics.length >= MAX_DOC_LOCATIONS) return
    setLinkedClinics(l => l.some(x => x.id === c.id) ? l : [...l, c])
    setClinicLinkQuery(''); setClinicLinkResults([])
  }
  const unlinkClinicFromForm = (id) => setLinkedClinics(l => l.filter(c => c.id !== id))

  const MAX_DOC_LOCATIONS = 4
  const [extraCats, setExtraCats] = useState([])
  useEffect(() => {
    if (!supabase || !authed) return
    supabase.from('site_settings').select('value').eq('key','extra_categories').single().then(({ data }) => { if (data?.value?.list) setExtraCats(data.value.list) })
  }, [authed])
  const ALL_CATS = [...CATS, ...extraCats.filter(c => !CATS.includes(c))]
  const addCategoryPrompt = async () => {
    if (typeof window === 'undefined') return null
    const name = window.prompt('New category name (e.g. Urgent Care, Walk-in). This will be added to the category list for future listings.')
    if (!name || !name.trim()) return null
    const label = name.trim()
    if (ALL_CATS.includes(label)) { setMsg('Category already exists.'); return label }
    const next = [...extraCats, label]
    setExtraCats(next)
    await supabase.from('site_settings').upsert({ key: 'extra_categories', value: { list: next }, updated_at: new Date().toISOString() })
    setMsg(`Added category: ${label}`)
    return label
  }

  const addSpecialtyPrompt = async (currentCategory) => {
    if (typeof window === 'undefined') return null
    const name = window.prompt('New specialty name (e.g. Sleep Medicine, Sports Medicine).')
    if (!name || !name.trim()) return null
    const label = name.trim()
    const cat = window.prompt('Which category does it belong to? (Leave blank for "Other")', currentCategory || '') || 'Other'
    const created = await ensureSpecialty(label, cat)
    setMsg(`Added specialty: ${label}`)
    return created || { snomed_code: 'custom-' + label.toLowerCase().replace(/[^a-z0-9]+/g,'-'), name: label }
  }


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
    // Group by normalized name ONLY, same phone/address is fine (clinics with multiple doctors)
    all.forEach(pr => {
      const nn = norm(pr.name)
      if (nn.length < 4) return
      if (!byKey[nn]) byKey[nn] = []
      byKey[nn].push(pr)
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
      // Repoint doctors whose primary clinic was this listing
      await supabase.from('providers').update({ clinic_provider_id: keeperId }).eq('clinic_provider_id', pr.id)
      // Repoint secondary doctor-location links
      const { data: links } = await supabase.from('doctor_locations').select('doctor_provider_id').eq('clinic_provider_id', pr.id)
      for (const l of (links || [])) {
        await supabase.from('doctor_locations').upsert({ doctor_provider_id: l.doctor_provider_id, clinic_provider_id: keeperId }, { onConflict: 'doctor_provider_id,clinic_provider_id' })
      }
      await supabase.from('doctor_locations').delete().eq('clinic_provider_id', pr.id)
      await supabase.from('listing_forms').update({ provider_id: keeperId }).eq('provider_id', pr.id)
      await supabase.from('providers').delete().eq('id', pr.id)
    }
    setDupGroups(gs => gs.filter((_, idx) => idx !== gi))
    setMsg('Group merged.'); load(); loadStats()
  }

  const dupDelete = async (gi, id) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this listing?')) return
    await supabase.from('providers').update({ clinic_provider_id: null }).eq('clinic_provider_id', id)
    await supabase.from('doctor_locations').delete().eq('clinic_provider_id', id)
    await supabase.from('providers').delete().eq('id', id)
    setDupGroups(gs => gs.map((g, idx) => idx === gi ? g.filter(x => x.id !== id) : g).filter(g => g.length > 1))
    setMsg('Deleted.'); load(); loadStats()
  }

  // ── Outreach ──
  const toggleFeatured = async (kind, row) => {
    if (!supabase) return
    const next = !row.featured
    const { error } = await supabase.from('providers').update({ featured: next }).eq('id', row.id)
    if (error) { setMsg('Toggle failed: ' + error.message); return }
    setMsg(next ? `Marked "${row.name}" as Featured` : `Removed Featured from "${row.name}"`)
    load()
  }

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


  const ensureSpecialty = async (label, category) => {
    const name = (label || '').trim()
    if (!name || !supabase) return
    if (specialties.some(sp => (sp.name || '').toLowerCase() === name.toLowerCase())) return
    const code = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
    const { data } = await supabase.from('specialties').upsert({ snomed_code: code, name, category: category || 'Other', category_order: 99 }, { onConflict: 'snomed_code' }).select().single()
    if (data) setSpecialties(list => [...list.filter(x => x.snomed_code !== code), data])
    return data
  }

  const save = async () => {
    // keep the legacy providers.doctors[] string array in sync from the structured rows
    const doctorNames = doctorRows.map(r => { const nm = (r.name || '').trim(); return nm && r.specialty ? `${nm}, ${r.specialty}` : nm }).map(x => (x || '').trim()).filter(Boolean)
    if (form.type && form.type.trim() && !form.specialty_code) { await ensureSpecialty(form.type, form.category) }
    const waitWeeksVal = form.wait_type === 'weeks' && form.wait_weeks !== "" && form.wait_weeks !== null ? parseInt(form.wait_weeks) : null
    const rec = { ...form, services: servicesText.split(',').map(x=>x.trim()).filter(Boolean), doctors: doctorNames, languages: languagesText.split(',').map(x=>x.trim()).filter(Boolean), referral_types: referralTypesText.split(',').map(x=>x.trim()).filter(Boolean), rating: form.rating ? parseFloat(form.rating) : null, reviews: parseInt(form.reviews) || 0, wait_type: form.wait_type || null, wait_weeks: waitWeeksVal, wait_days_approx: waitDaysApprox(form.wait_type || null, waitWeeksVal), email: form.email || null, clinic_provider_id: linkedClinics[0]?.id || null }
    delete rec.id; delete rec.created_at; delete rec.updated_at; delete rec.owner_id

    // 1) upsert the listing (provider) and capture its id
    let providerId = editing
    if (editing) {
      const { error } = await supabase.from("providers").update(rec).eq("id", editing)
      if (error) { setMsg("Error saving clinic: " + error.message); return }
    } else {
      const { data, error } = await supabase.from("providers").insert(rec).select().single()
      if (error || !data) { setMsg("Error saving clinic: " + (error?.message || "no row returned")); return }
      providerId = data.id
    }

    // reconcile this listing's own secondary linked locations (everything past the primary)
    await supabase.from('doctor_locations').delete().eq('doctor_provider_id', providerId)
    for (const c of linkedClinics.slice(1)) {
      await supabase.from('doctor_locations').insert({ doctor_provider_id: providerId, clinic_provider_id: c.id })
    }

    // 2) reconcile the doctor rows into providers (category Specialist/Family Medicine, clinic_provider_id = this clinic)
    let warn = null
    try {
      for (let i = 0; i < doctorRows.length; i++) {
        const r = doctorRows[i]
        if (!r.name || !r.name.trim()) continue
        const payload = { name: r.name.trim(), type: r.specialty || null, specialty_code: r.specialty_code || null, gender: r.gender || null, accepting_referrals: r.accepting_referrals ?? null, category: /famil/i.test(r.specialty || '') ? 'Family Medicine' : 'Specialist', hours: form.hours || null }
        if (r.id) {
          const { error } = await supabase.from("providers").update(payload).eq("id", r.id)
          if (error) { warn = "Clinic saved, but updating a doctor failed: " + error.message; continue }
          // Newly linked this session (wasn't already linked to this clinic) — attach the clinic link
          if (!origDocIds.includes(r.id)) {
            const { data: existing } = await supabase.from('providers').select('clinic_provider_id').eq('id', r.id).single()
            if (!existing?.clinic_provider_id) {
              await supabase.from('providers').update({ clinic_provider_id: providerId }).eq('id', r.id)
            } else if (existing.clinic_provider_id !== providerId) {
              const { count } = await supabase.from('doctor_locations').select('id', { count: 'exact', head: true }).eq('doctor_provider_id', r.id)
              if ((count || 0) >= 3) { warn = `"${payload.name}" already has 4 locations, remove one before linking here.` }
              else await supabase.from('doctor_locations').upsert({ doctor_provider_id: r.id, clinic_provider_id: providerId }, { onConflict: 'doctor_provider_id,clinic_provider_id' })
            }
          }
        } else {
          const dupe = await findDoctorByName(r.name)
          if (dupe) { warn = `"${r.name.trim()}" looks like it may already exist as "${dupe.name}" — search for them above and link instead of adding a duplicate.`; continue }
          const { error: docErr } = await supabase.from("providers").insert({ ...payload, clinic_provider_id: providerId, data_status: 'complete' })
          if (docErr) warn = "Clinic saved, but adding a doctor failed: " + docErr.message
        }
      }
      // unlink doctors removed from the list (keep the doctor's own profile, just clear this clinic as their primary)
      const currentIds = doctorRows.map(r => r.id).filter(Boolean)
      const removed = origDocIds.filter(id => !currentIds.includes(id))
      for (const id of removed) {
        await supabase.from("providers").update({ clinic_provider_id: null }).eq("id", id).eq("clinic_provider_id", providerId)
        await supabase.from("doctor_locations").delete().eq("doctor_provider_id", id).eq("clinic_provider_id", providerId)
      }
    } catch (e) {
      warn = "Clinic saved, but doctor sync hit an error: " + e.message
    }

    setMsg(warn || (editing ? "Updated!" : "Added!"))
    setEditing(null); setForm(empty()); setServicesText(""); setDoctorsText(""); setLanguagesText("English"); setReferralTypesText(""); setDoctorRows([]); setOrigDocIds([]); setLinkedClinics([]); setTab("list"); load(); loadStats()
  }

  const del = async (id) => {
    if (!confirm("Delete this listing? This also unlinks any doctors/locations connected to it.")) return
    await supabase.from("providers").update({ clinic_provider_id: null }).eq("clinic_provider_id", id)
    await supabase.from("doctor_locations").delete().eq("clinic_provider_id", id)
    await supabase.from("doctor_locations").delete().eq("doctor_provider_id", id)
    await supabase.from("providers").delete().eq("id", id)
    setMsg("Deleted"); load(); loadStats()
  }

  const updateStatus = async (id, status) => {
    await supabase.from("providers").update({ data_status: status }).eq("id", id)
    load(); loadStats()
  }

  const loadClaims = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.from("claims").select("*, providers(name, type, address, phone, fax, category), physicians(name, specialty)").order("created_at", { ascending: false })
    if (data) {
      setClaims(data)
      setPendingCount(data.filter(c => c.status === 'pending').length)
    }
  }, [])

  const handleClaim = async (claim, action) => {
    if (!supabase) return
    await supabase.from("claims").update({ status: action }).eq("id", claim.id)
    if (action === 'approved') {
      if (claim.provider_id) {
        const update = {
          owner_id: claim.user_id,
          verified: true,
          verified_at: new Date().toISOString(),
          cpso_verified: !!claim.cpso_link,
        }
        // A corrected fax number that got verified replaces the stale one on file.
        if (claim.verify_fax && claim.verify_fax !== claim.providers?.fax) update.fax = claim.verify_fax
        await supabase.from("providers").update(update).eq("id", claim.provider_id)
      } else if (claim.physician_id) {
        await supabase.from("physicians").update({ owner_id: claim.user_id, verified: true }).eq("id", claim.physician_id)
      }
    }
    // Privacy: the ID was only needed to make this decision — delete it either way.
    if (claim.id_doc_path) {
      await supabase.storage.from('forms').remove([claim.id_doc_path]).catch(() => {})
      await supabase.from('claims').update({ id_doc_url: null, id_doc_path: null }).eq('id', claim.id)
    }
    setMsg(action === 'approved' ? 'Claim approved, linked to user' : 'Claim rejected')
    loadClaims()
  }

  const sendClaimInfoRequest = async (claim) => {
    if (!requestInfoText.trim()) return
    setRequestInfoSending(true)
    const res = await fetch('/api/outreach', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ email: claim.user_email, name: claim.user_name }], template: 'claim_more_info', message: requestInfoText.trim() }),
    }).then(r => r.json()).catch(e => ({ errors: [e.message] }))
    setRequestInfoSending(false)
    if (res.errors?.length) { setMsg('Error sending: ' + res.errors[0]); return }
    setMsg(`Sent to ${claim.user_email}`)
    setRequestInfoFor(null); setRequestInfoText('')
  }

  useEffect(() => { if (authed) loadClaims() }, [authed, loadClaims])

  // Full list + CRUD lives in AnnouncementsTab; this is just the sidebar badge count.
  const loadAnnouncementCount = useCallback(async () => {
    if (!supabase) return
    const { count } = await supabase.from("provider_announcements").select("id", { count: 'exact', head: true }).eq("status", "pending")
    setPendingAnnouncementCount(count || 0)
  }, [])

  useEffect(() => { if (authed) loadAnnouncementCount() }, [authed, loadAnnouncementCount])

  const edit = async (p) => {
    setForm({ ...p, rating: p.rating || "", reviews: p.reviews || 0, wait_type: p.wait_type || (p.wait_weeks != null ? 'weeks' : ""), wait_weeks: p.wait_weeks ?? "", email: p.email || "", services: p.services || [], doctors: p.doctors || [], languages: p.languages || ["English"], hours: p.hours || {mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null} })
    setServicesText((p.services || []).join(', '))
    setDoctorsText((p.doctors || []).join(', '))
    setLanguagesText((p.languages || ['English']).join(', '))
    setReferralTypesText((p.referral_types || []).join(', '))
    // load doctors linked to this clinic — primary (clinic_provider_id) plus anyone who has
    // this clinic as a secondary location (doctor_locations), so a doctor split across two
    // clinics shows up when editing either one, not just their primary.
    let rows = []
    try {
      const [{ data: primaryDocs }, { data: secondaryLinks }] = await Promise.all([
        supabase.from('providers').select('id, name, type, specialty_code, gender, accepting_referrals').eq('clinic_provider_id', p.id).in('category', ['Specialist', 'Family Medicine']),
        supabase.from('doctor_locations').select('doctor_provider_id').eq('clinic_provider_id', p.id),
      ])
      const primary = primaryDocs || []
      const secondaryIds = (secondaryLinks || []).map(l => l.doctor_provider_id).filter(id => !primary.some(d => d.id === id))
      let secondary = []
      if (secondaryIds.length) {
        const { data } = await supabase.from('providers').select('id, name, type, specialty_code, gender, accepting_referrals').in('id', secondaryIds)
        secondary = data || []
      }
      rows = [...primary, ...secondary].map(d => ({ id: d.id, name: d.name || '', specialty: d.type || '', specialty_code: d.specialty_code || '', gender: d.gender || '', accepting_referrals: d.accepting_referrals }))
    } catch {}
    // fallback: if no linked doctors yet but legacy string names exist, seed rows so admin can convert them (saving creates real doctor profiles)
    if (rows.length === 0 && (p.doctors || []).length > 0) {
      rows = p.doctors.map(n => ({ name: String(n).replace(/\s*,.*/, '').trim(), specialty: p.type || '', specialty_code: '', gender: '' }))
    }
    setDoctorRows(rows); setOrigDocIds(rows.filter(r => r.id).map(r => r.id))
    // this listing's own linked clinics: primary via clinic_provider_id, up to 3 more via doctor_locations
    try {
      const clinicIds = []
      if (p.clinic_provider_id) clinicIds.push(p.clinic_provider_id)
      const { data: secondary } = await supabase.from('doctor_locations').select('clinic_provider_id').eq('doctor_provider_id', p.id)
      ;(secondary || []).forEach(l => { if (!clinicIds.includes(l.clinic_provider_id)) clinicIds.push(l.clinic_provider_id) })
      if (clinicIds.length) {
        const { data: clinics } = await supabase.from('providers').select('id, name, address').in('id', clinicIds)
        setLinkedClinics(clinicIds.map(cid => (clinics || []).find(c => c.id === cid)).filter(Boolean))
      } else setLinkedClinics([])
    } catch { setLinkedClinics([]) }
    setEditing(p.id); setTab("edit")
  }

  const s = { width:"100%", padding:"8px 10px", fontSize:"13px", background:"#ffffff", border:"1px solid #d1d5db", borderRadius:"6px", color:"#111827", outline:"none", marginTop:"4px" }
  const lbl = { fontSize:"11px", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginTop:"12px" }

  if (authLoading) return (
    <div style={{ fontFamily:"Inter, sans-serif", background:"#f8fafc", minHeight:"100vh", display:"flex", justifyContent:"center", alignItems:"center", color:"#94a3b8", fontSize:"13px" }}>Loading…</div>
  )

  if (!authed && user && !profile?.is_admin) return (
    <div style={{ fontFamily:"Inter, sans-serif", background:"#f8fafc", color:"#111827", minHeight:"100vh", display:"flex", justifyContent:"center", alignItems:"center" }}>
      <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"14px", padding:"32px", width:"340px", textAlign:"center" }}>
        <h2 style={{ margin:"0 0 4px", fontSize:"18px" }}>🔐 ReferEasy Admin</h2>
        <p style={{ margin:"0 0 20px", fontSize:"12px", color:"#64748b" }}>Signed in as {user.email}, but this account doesn't have admin access.</p>
        <button onClick={logout} style={{ all:"unset", cursor:"pointer", display:"block", width:"100%", padding:"10px", textAlign:"center", background:"#f1f5f9", color:"#334155", borderRadius:"8px", fontSize:"13px", fontWeight:600 }}>Sign out</button>
      </div>
    </div>
  )

  if (!authed) return (
    <div style={{ fontFamily:"Inter, sans-serif", background:"#f8fafc", color:"#111827", minHeight:"100vh", display:"flex", justifyContent:"center", alignItems:"center" }}>
      <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"14px", padding:"32px", width:"340px" }}>
        <h2 style={{ margin:"0 0 4px", fontSize:"18px" }}>🔐 ReferEasy Admin</h2>
        {adminResetSent ? (
          <>
            <p style={{ margin:"0 0 4px", fontSize:"12px", color:"#64748b" }}>Check <strong>{adminEmail}</strong> for a reset link.</p>
            <button onClick={() => { setAdminResetSent(false); setAdminForgotMode(false) }} style={{ all:"unset", cursor:"pointer", display:"block", width:"100%", marginTop:"14px", padding:"10px", textAlign:"center", background:"#f1f5f9", color:"#334155", borderRadius:"8px", fontSize:"13px", fontWeight:600 }}>Back to sign in</button>
          </>
        ) : adminForgotMode ? (
          <>
            <p style={{ margin:"0 0 20px", fontSize:"12px", color:"#64748b" }}>Enter your email to get a reset link</p>
            <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} onKeyDown={e => e.key==="Enter" && adminResetRequest()} placeholder="Email" style={s} />
            <button onClick={adminResetRequest} disabled={adminResetSending} style={{ all:"unset", cursor:"pointer", display:"block", width:"100%", marginTop:"12px", padding:"10px", textAlign:"center", background:"#3b82f6", color:"#fff", borderRadius:"8px", fontSize:"13px", fontWeight:600, opacity: adminResetSending ? 0.6 : 1 }}>{adminResetSending ? 'Sending…' : 'Send reset link'}</button>
            {adminLoginErr && <p style={{ color:"#dc2626", fontSize:"12px", marginTop:"8px" }}>{adminLoginErr}</p>}
            <button onClick={() => { setAdminForgotMode(false); setAdminLoginErr("") }} style={{ all:"unset", cursor:"pointer", display:"block", width:"100%", marginTop:"10px", padding:"6px", textAlign:"center", color:"#94a3b8", fontSize:"12px" }}>Back to sign in</button>
          </>
        ) : (
          <>
            <p style={{ margin:"0 0 20px", fontSize:"12px", color:"#64748b" }}>Sign in with your admin account</p>
            <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} onKeyDown={e => e.key==="Enter" && adminLogin()} placeholder="Email" style={s} />
            <input type="password" value={adminPw} onChange={e => setAdminPw(e.target.value)} onKeyDown={e => e.key==="Enter" && adminLogin()} placeholder="Password" style={{ ...s, marginTop:"8px" }} />
            <button onClick={adminLogin} disabled={adminLoggingIn} style={{ all:"unset", cursor:"pointer", display:"block", width:"100%", marginTop:"12px", padding:"10px", textAlign:"center", background:"#3b82f6", color:"#fff", borderRadius:"8px", fontSize:"13px", fontWeight:600, opacity: adminLoggingIn ? 0.6 : 1 }}>{adminLoggingIn ? 'Signing in…' : 'Sign in'}</button>
            {adminLoginErr && <p style={{ color:"#dc2626", fontSize:"12px", marginTop:"8px" }}>{adminLoginErr}</p>}
            <button onClick={() => setAdminForgotMode(true)} style={{ all:"unset", cursor:"pointer", display:"block", width:"100%", marginTop:"10px", padding:"6px", textAlign:"center", color:"#3b82f6", fontSize:"12px", fontWeight:600 }}>Forgot password?</button>
          </>
        )}

      </div>
    </div>
  )

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const statusColor = { complete: "#059669", partial: "#d97706", incomplete: "#dc2626" }

  return (
    <div style={{ fontFamily:"Inter, sans-serif", background:"#f8fafc", color:"#111827", minHeight:"100vh", display:"flex" }}>
      <AdminSidebar tab={tab} setTab={(t) => {
        if (t === 'list') { setTab('list'); setEditing(null); setForm(empty()) }
        else if (t === 'edit') { setEditing(null); setForm(empty()); setServicesText(""); setDoctorsText(""); setLanguagesText("English"); setReferralTypesText(""); setDoctorRows([]); setOrigDocIds([]); setLinkedClinics([]); setTab('edit') }
        else if (t === 'dupes') { setTab('dupes'); if (dupGroups.length === 0) scanDupes() }
        else if (t === 'site') { setTab('site') }
        else if (t === 'invites') { setTab('invites') }
        else if (t === 'templates') { setTab('templates') }
        else { setTab(t) }
      }} counts={{ providers: providers.length, dupes: dupGroups.length, claims: pendingCount, announcements: pendingAnnouncementCount }} />
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"14px 24px", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#ffffff" }}>
        <h1 style={{ margin:0, fontSize:"16px", fontWeight:600, color:"#334155" }}>Admin</h1>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          <a href="/" style={{ padding:"6px 14px", borderRadius:"8px", fontSize:"12px", fontWeight:600, background:"#ffffff", color:"#64748b", border:"1px solid #e2e8f0", textDecoration:"none" }}>← View site</a>
          <button onClick={logout} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"8px", fontSize:"12px", fontWeight:600, background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>Log out</button>
        </div>
      </div>
      {msg && <div style={{ padding:"10px 24px", background:"#05966915", color:"#059669", fontSize:"12px", fontWeight:600, borderBottom:"1px solid #d1fae5" }}>{msg}</div>}

      <div style={{ maxWidth:"1180px", margin:"0 auto", padding:"20px 24px", width:"100%", boxSizing:"border-box" }}>
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
                {ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}<option value="__add__">+ Add new category…</option>
              </select>
              <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(0) }} style={{ ...s, marginTop:0, width:"130px", flex:"0 0 auto" }}>
                <option value="">All plans</option>
                <option value="listed">Listed</option>
                <option value="verified">Verified</option>
                <option value="featured">Featured</option>
              </select>
            </div>

            {/* Pagination */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
              <span style={{ fontSize:"12px", color:"#64748b" }}>{total.toLocaleString()} results (page {page+1}/{totalPages || 1})</span>
              <div style={{ display:"flex", gap:"4px" }}>
                <button disabled={page===0} onClick={() => setPage(p=>p-1)} style={{ all:"unset", cursor:page===0?"default":"pointer", padding:"4px 10px", fontSize:"11px", borderRadius:"6px", background:"#ffffff", color:page===0?"#cbd5e1":"#64748b", border:"1px solid #e2e8f0" }}>← Prev</button>
                <button disabled={page>=totalPages-1} onClick={() => setPage(p=>p+1)} style={{ all:"unset", cursor:page>=totalPages-1?"default":"pointer", padding:"4px 10px", fontSize:"11px", borderRadius:"6px", background:"#ffffff", color:page>=totalPages-1?"#cbd5e1":"#64748b", border:"1px solid #e2e8f0" }}>Next →</button>
                <button onClick={inviteAll} style={{ all:"unset", cursor:"pointer", padding:"4px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#0891b220", color:"#0891b2", border:"1px solid #0891b240", marginLeft:"8px" }}>✉ Invite page</button>
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {providers.map(p => (
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"10px 14px", gap:"8px" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"13px", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      <span style={{ fontSize:"9px", fontWeight:700, color:catHex(p.category || 'Clinic'), background:catHex(p.category || 'Clinic')+"20", border:"1px solid "+catHex(p.category || 'Clinic')+"40", borderRadius:"999px", padding:"1px 6px", marginRight:"6px" }}>{(p.category || 'Clinic').toUpperCase()}</span>
                      {p.name}
                      {p.verified && <span style={{ marginLeft:"6px", fontSize:"9px", fontWeight:700, color:"#2563eb", background:"#3b82f620", border:"1px solid #3b82f640", borderRadius:"999px", padding:"1px 6px" }}>VERIFIED</span>}
                      {p.owner_id && <span style={{ marginLeft:"6px", fontSize:"9px", fontWeight:700, color:"#059669", background:"#05966920", border:"1px solid #05966940", borderRadius:"999px", padding:"1px 6px" }}>CLAIMED</span>}
                    </div>
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
                    <a href={`/search?id=${p.id}`} target="_blank" rel="noopener noreferrer" style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#e2e8f0", color:"#475569", border:"1px solid #cbd5e1" }}>View</a>
                    <button onClick={() => edit(p)} style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#3b82f620", color:"#3b82f6", border:"1px solid #3b82f640" }}>Edit</button>
                    <PlanDropdown provider={p} onChange={load} />
                    <button onClick={() => toggleFeatured("provider", p)} title={p.featured ? "Remove featured" : "Mark as featured"} style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:p.featured?"#f59e0b30":"#f59e0b15", color:"#b45309", border:"1px solid #f59e0b60" }}>{p.featured ? "★ Featured" : "☆ Feature"}</button>
                    <button onClick={() => del(p.id)} style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>Del</button>
                    {p.email && <button onClick={() => invite(p)} disabled={inviting === p.id} style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:p.invited_at?"#05966920":"#0891b220", color:p.invited_at?"#059669":"#0891b2", border:"1px solid " + (p.invited_at?"#05966940":"#0891b240") }}>{inviting === p.id ? "…" : p.invited_at ? "✓ Invited" : "✉ Invite"}</button>}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : tab === "edit" ? (
          <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"20px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
              <h3 style={{ margin:0, fontSize:"16px" }}>{editing ? "Edit Provider" : "Add New Provider"}</h3>
              {editing && (
                <button onClick={async () => {
                  const email = window.prompt(`Invite someone to claim "${form.name}" — they'll get instant ownership, no verification codes needed. This does not grant the Verified badge; do that separately via the plan dropdown if you want to.\n\nEmail:`)
                  if (!email || !email.trim()) return
                  const res = await fetch('/api/claim/invite', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ provider_id: editing, email: email.trim(), user_id: user?.id }),
                  }).then(r => r.json()).catch(e => ({ error: e.message }))
                  setMsg(res.error ? 'Error: ' + res.error : `Claim invite sent to ${email.trim()}`)
                }} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#7c3aed15", color:"#7c3aed", border:"1px solid #7c3aed40" }}>✉ Invite to claim</button>
              )}
            </div>

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
                        // Multiple locations, offer batch create
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
                          setDoctorsText((d.doctors || []).map(x => typeof x === 'string' ? x : x.name).join(', '))
                        setDoctorRows(mapExtractedDocs(d.doctors, d.type))
                          setLanguagesText((d.languages || []).join(', '))
                          setMsg(`Found ${result.count} locations. Showing first one. Save and extract again for others.`)
                        }
                      } else {
                        // Single location, fill the form
                        const d = result.data
                        setForm(prev => ({ ...prev, name: d.name || prev.name, type: d.type || prev.type, category: d.category || prev.category, address: d.address || prev.address, phone: d.phone || prev.phone, fax: d.fax || prev.fax, email: d.email || prev.email, website: d.website || prev.website, hours: normalizeHours(d.hours) || prev.hours, requirements: d.requirements || prev.requirements, accepting_referrals: d.accepting_referrals ?? prev.accepting_referrals }))
                        setServicesText((d.services || []).join(', '))
                        setDoctorsText((d.doctors || []).map(x => typeof x === 'string' ? x : x.name).join(', '))
                        setDoctorRows(mapExtractedDocs(d.doctors, d.type))
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
              <div><label style={lbl}>Name *</label><input style={s} value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder={['Specialist','Family Medicine'].includes(form.category) ? 'Dr. Jane Smith (include title: Dr., NP, PA, etc.)' : ''} /></div>
              <div><label style={lbl}>Specialty *</label><select style={s} value={form.specialty_code || ''} onChange={async e => { if (e.target.value === '__add__') { const sp = await addSpecialtyPrompt(form.category); if (sp) setForm(f => ({...f, specialty_code: sp.snomed_code, type: sp.name})); return } const spec = specialties.find(s => s.snomed_code === e.target.value); if (spec) setForm({...form, specialty_code: e.target.value, type: spec.name}); else setForm({...form, specialty_code: '', type: form.type}) }}><option value="">Select specialty...</option><option value="__add__">+ Add new specialty…</option>{(() => { const groups = {}; specialties.forEach(sp => { if (!groups[sp.category]) groups[sp.category] = []; groups[sp.category].push(sp) }); return Object.entries(groups).map(([cat, specs]) => <optgroup key={cat} label={cat}>{specs.map(sp => <option key={sp.snomed_code} value={sp.snomed_code}>{sp.name}</option>)}</optgroup>) })()}</select></div>
              <div><label style={lbl}>Custom Type Label</label><input style={s} value={form.type} onChange={e => setForm({...form, type:e.target.value})} placeholder="Or type a new specialty, it gets added to the list" /></div>
              <div><label style={lbl}>Category</label><select style={s} value={form.category} onChange={async e => { if (e.target.value === '__add__') { const c = await addCategoryPrompt(); if (c) setForm(f => ({...f, category: c})); return } setForm({...form, category:e.target.value}) }}>{ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}<option value="__add__">+ Add new category…</option></select></div>
              <div><label style={lbl}>Data Status</label><select style={s} value={form.data_status || 'complete'} onChange={e => setForm({...form, data_status:e.target.value})}>{STATUSES.map(st => <option key={st} value={st}>{st}</option>)}</select></div>
              <div><label style={lbl}>Address</label><input style={s} value={form.address || ""} onChange={e => setForm({...form, address:e.target.value})} /></div>
              <div><label style={lbl}>Phone</label><input style={s} value={form.phone || ""} onChange={e => setForm({...form, phone:e.target.value || null})} /></div>
              <div><label style={lbl}>Fax</label><input style={s} value={form.fax || ""} onChange={e => setForm({...form, fax:e.target.value || null})} /></div>
              <div><label style={lbl}>Email</label><input style={s} type="email" value={form.email || ""} onChange={e => setForm({...form, email:e.target.value || null})} placeholder="referrals@clinic.ca" /></div>
              <div><label style={lbl}>Website</label><input style={s} value={form.website || ""} onChange={e => setForm({...form, website:e.target.value || null})} /></div>
              <div>
                <label style={lbl}>Wait time</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <select style={s} value={form.wait_type || ""} onChange={e => setForm({...form, wait_type: e.target.value || null})}>
                    <option value="">Varies / unknown</option>
                    {WAIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {form.wait_type === 'weeks' && <input style={s} type="number" min="0" value={form.wait_weeks ?? ""} onChange={e => setForm({...form, wait_weeks:e.target.value})} placeholder="weeks" />}
                </div>
              </div>
              <div><label style={lbl}>SNOMED Code</label><input style={s} value={form.specialty_code || ""} onChange={e => setForm({...form, specialty_code:e.target.value || null})} /></div>
              <div><label style={lbl}>Sub-specialty</label><input style={s} value={form.sub_specialty || ""} onChange={e => setForm({...form, sub_specialty:e.target.value || null})} placeholder="e.g. Interventional Cardiology" /></div>
              <div><label style={lbl}>Gender</label><select style={s} value={form.gender || ''} onChange={e => setForm({...form, gender:e.target.value || null})}><option value="">,</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></div>
              <div><label style={lbl}>CPSO Profile Link</label><input style={s} value={form.cpso_url || ""} onChange={e => setForm({...form, cpso_url:e.target.value || null})} placeholder="https://doctors.cpso.on.ca/DoctorDetails/..." /></div>
              <div><label style={lbl}>Accepting Referrals / New Patients</label><select style={s} value={form.accepting_referrals == null ? 'unknown' : form.accepting_referrals ? 'true' : 'false'} onChange={e => { const v = e.target.value === 'unknown' ? null : e.target.value === 'true'; setForm({...form, accepting_referrals: v, accepting_new_patients: v}) }}><option value="unknown">Unknown</option><option value="true">Accepting</option><option value="false">Not accepting</option></select></div>
            </div>
            <label style={lbl}>Referral Criteria</label>
            <textarea style={{ ...s, minHeight:"60px", resize:"vertical" }} value={form.criteria || ""} onChange={e => setForm({...form, criteria:e.target.value || null})} placeholder="What patients / conditions you accept referrals for" />
            <label style={lbl}>Requirements</label>
            <textarea style={{ ...s, minHeight:"60px", resize:"vertical" }} value={form.requirements || ""} onChange={e => setForm({...form, requirements:e.target.value})} placeholder="Requisition, imaging, etc." />
            <label style={lbl}>Referral Types (comma-separated)</label>
            <input style={s} value={referralTypesText} onChange={e => setReferralTypesText(e.target.value)} placeholder="Consultation, Procedure, Follow-up" />
            <label style={lbl}>Services (comma-separated)</label>
            <textarea style={{ ...s, minHeight:"50px", resize:"vertical" }} value={servicesText} onChange={e => setServicesText(e.target.value)} placeholder="ECG, Stress Test, Holter Monitor" />
            <label style={lbl}>Notes</label>
            <textarea style={{ ...s, minHeight:"50px", resize:"vertical" }} value={form.notes || ""} onChange={e => setForm({...form, notes:e.target.value || null})} placeholder="Anything else the provider wants referring doctors to know" />
            <label style={lbl}>Doctors at this clinic</label>
            <div style={{ fontSize:"11px", color:"#64748b", margin:"2px 0 8px" }}>Each doctor gets their own profile page, linked to this clinic. Search to link a doctor who already exists, or add a new one below.</div>
            <div style={{ position:"relative", marginBottom:"10px" }}>
              <input style={{ ...s, marginTop:0 }} value={doctorSearchQuery} onChange={e => searchExistingDoctors(e.target.value)} placeholder="🔎 Search existing doctors to link…" />
              {doctorSearchResults.length > 0 && (
                <div style={{ position:"absolute", zIndex:30, left:0, right:0, top:"100%", marginTop:"4px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px", maxHeight:"220px", overflowY:"auto" }}>
                  {doctorSearchResults.map(d => (
                    <button key={d.id} onClick={() => linkExistingDoctor(d)} style={{ all:"unset", cursor:"pointer", display:"block", width:"100%", boxSizing:"border-box", padding:"8px 12px", borderBottom:"1px solid #e2e8f0" }}>
                      <div style={{ fontSize:"13px", color:"#111827", fontWeight:600 }}>{d.name}</div>
                      {d.type && <div style={{ fontSize:"11px", color:"#64748b" }}>{d.type}{d.clinic_provider_id ? ' · already has a primary clinic' : ''}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {doctorRows.map((r, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1.2fr 1.2fr 0.7fr 0.9fr auto", gap:"6px", marginBottom:"6px", alignItems:"center" }}>
                <div style={{ position:"relative" }}>
                  <input style={{ ...s, marginTop:0 }} placeholder="Dr. Full Name" value={r.name} onChange={e => updateDoctor(i, { name: e.target.value })} disabled={!!r.id} />
                  {r.id && <span style={{ position:"absolute", right:"6px", top:"50%", transform:"translateY(-50%)", fontSize:"9px", fontWeight:700, color:"#7c3aed", background:"#7c3aed20", border:"1px solid #7c3aed40", borderRadius:"999px", padding:"2px 6px" }}>LINKED</span>}
                </div>
                <select style={{ ...s, marginTop:0 }} value={r.specialty_code || ''} onChange={async e => { if (e.target.value === '__add__') { const sp = await addSpecialtyPrompt(form.category); if (sp) updateDoctor(i, { specialty_code: sp.snomed_code, specialty: sp.name }); return } const sp = specialties.find(x => x.snomed_code === e.target.value); updateDoctor(i, sp ? { specialty_code: sp.snomed_code, specialty: sp.name } : { specialty_code: '', specialty: '' }) }}>
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

            <label style={lbl}>Link to a Clinic</label>
            <div style={{ fontSize:"11px", color:"#64748b", margin:"2px 0 8px" }}>Anyone — a doctor, a lab, an imaging centre — can be based at, or additionally listed under, another clinic. Search to link, up to {MAX_DOC_LOCATIONS} locations. Not linked to anyone? Just use the address above.</div>
            <div style={{ position:"relative", marginBottom:"10px" }}>
              <input style={{ ...s, marginTop:0, opacity: linkedClinics.length >= MAX_DOC_LOCATIONS ? 0.5 : 1 }} value={clinicLinkQuery} onChange={e => searchLinkableClinics(e.target.value)} placeholder={linkedClinics.length >= MAX_DOC_LOCATIONS ? `Location limit reached (${MAX_DOC_LOCATIONS})` : "🔎 Search clinics/providers to link…"} disabled={linkedClinics.length >= MAX_DOC_LOCATIONS} />
              {clinicLinkResults.length > 0 && (
                <div style={{ position:"absolute", zIndex:30, left:0, right:0, top:"100%", marginTop:"4px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px", maxHeight:"220px", overflowY:"auto" }}>
                  {clinicLinkResults.map(c => (
                    <button key={c.id} onClick={() => linkClinicToForm(c)} style={{ all:"unset", cursor:"pointer", display:"block", width:"100%", boxSizing:"border-box", padding:"8px 12px", borderBottom:"1px solid #e2e8f0" }}>
                      <div style={{ fontSize:"13px", color:"#111827", fontWeight:600 }}>{c.name}</div>
                      {c.address && <div style={{ fontSize:"11px", color:"#64748b" }}>{c.address}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {linkedClinics.length > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginBottom:"10px" }}>
                {linkedClinics.map((c, i) => (
                  <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", border:"1px solid #7c3aed40", background:"#faf9ff", borderRadius:"8px", padding:"8px 12px" }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:"13px", fontWeight:600, color:"#111827" }}>{c.name}{i === 0 && <span style={{ marginLeft:"6px", fontSize:"9px", fontWeight:700, color:"#7c3aed", background:"#7c3aed20", border:"1px solid #7c3aed40", borderRadius:"999px", padding:"1px 6px" }}>MAIN</span>}</div>
                      {c.address && <div style={{ fontSize:"11px", color:"#64748b" }}>{c.address}</div>}
                    </div>
                    <button onClick={() => unlinkClinicFromForm(c.id)} style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>Unlink</button>
                  </div>
                ))}
              </div>
            )}

            <label style={lbl}>Languages (comma-separated)</label>
            <input style={s} value={languagesText} onChange={e => setLanguagesText(e.target.value)} placeholder="English, French, Farsi" />

            <label style={lbl}>Hours (start-end, e.g. 9:00-17:00, blank = closed)</label>
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
              <button onClick={() => { setTab("list"); setEditing(null); setForm(empty()); setLinkedClinics([]) }} style={{ all:"unset", cursor:"pointer", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:600, background:"#e2e8f0", color:"#64748b" }}>Cancel</button>
            </div>
          </div>
        ) : null}
        {tab === "dupes" && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px", gap:"10px", flexWrap:"wrap" }}>
              <div style={{ fontSize:"13px", color:"#64748b" }}>Groups of listings sharing the same phone number or name. Pick which one to keep, then merge, doctors, links and forms move to the kept listing.</div>
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
        {tab === "site" && <SettingsTab setMsg={setMsg} />}
        {tab === "invites" && <InvitesTab providers={providers} setMsg={setMsg} />}
        {tab === "templates" && <TemplatesTab setMsg={setMsg} />}
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
                        <div style={{ fontSize:"13px", fontWeight:600 }}>{c.providers?.name || c.physicians?.name || 'Unknown'}{(c.physician_id || ['Specialist','Family Medicine'].includes(c.providers?.category)) && <span style={{ marginLeft:"6px", fontSize:"9px", fontWeight:700, color:"#7c3aed", background:"#7c3aed20", border:"1px solid #7c3aed40", borderRadius:"999px", padding:"1px 6px" }}>DOCTOR</span>}</div>
                        <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>{c.providers ? `${c.providers.type} · ${c.providers.address || ''}` : (c.physicians?.specialty || 'Physician profile')}</div>
                        <div style={{ fontSize:"11px", color:"#64748b", marginTop:"4px" }}>
                          Claimed by: <span style={{ color:"#111827" }}>{c.user_name}</span> ({c.user_email})
                        </div>
                        {(c.verify_email || c.verify_fax || c.id_doc_url) && (
                          <div style={{ fontSize:"11px", color:"#64748b", marginTop:"4px", display:"flex", flexWrap:"wrap", gap:"12px", alignItems:"center", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"6px", padding:"6px 10px" }}>
                            <span style={{ color:"#475569", fontWeight:600 }}>Verification:</span>
                            {c.verify_email && <span>✉️ {c.verify_email}</span>}
                            {c.verify_fax ? (
                              c.providers?.fax && c.verify_fax !== c.providers.fax
                                ? <span style={{ color:"#b45309", fontWeight:600 }}>📠 {c.verify_fax} (on file: {c.providers.fax || 'none'}) — corrected</span>
                                : <span>📠 {c.verify_fax}</span>
                            ) : <span style={{ color:"#b45309" }}>📠 skipped</span>}
                            {c.id_doc_url ? <a href={c.id_doc_url} target="_blank" rel="noopener noreferrer" style={{ color:"#2563eb", fontWeight:600 }}>📎 View ID</a> : c.status !== 'pending' && <span>📎 ID deleted after review</span>}
                          </div>
                        )}
                        {c.cpso_link && (
                          <div style={{ fontSize:"11px", marginTop:"4px", display:"flex", flexWrap:"wrap", gap:"8px", alignItems:"center", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"6px", padding:"6px 10px" }}>
                            <span style={{ color:"#475569", fontWeight:600 }}>CPSO:</span>
                            <a href={c.cpso_link} target="_blank" rel="noopener noreferrer" style={{ color:"#2563eb", fontWeight:600 }}>🔎 Open their CPSO profile →</a>
                          </div>
                        )}
                        <div style={{ fontSize:"10px", color:"#94a3b8", marginTop:"2px" }}>
                          {new Date(c.created_at).toLocaleDateString()} · {c.verification_method}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:"4px", alignItems:"center", flexShrink:0 }}>
                        {c.status === 'pending' ? (
                          <>
                            <button onClick={() => { setRequestInfoFor(requestInfoFor === c.id ? null : c.id); setRequestInfoText('') }} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#2563eb20", color:"#2563eb", border:"1px solid #2563eb40" }}>✉️ Request info</button>
                            <button onClick={() => handleClaim(c, 'approved')} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#05966920", color:"#059669", border:"1px solid #05966940" }}>✓ Approve</button>
                            <button onClick={() => handleClaim(c, 'rejected')} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>✕ Reject</button>
                          </>
                        ) : (
                          <span style={{ padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:c.status==='approved'?"#05966920":"#dc262620", color:c.status==='approved'?"#059669":"#dc2626", border:`1px solid ${c.status==='approved'?"#05966940":"#dc262640"}`, textTransform:"capitalize" }}>{c.status}</span>
                        )}
                      </div>
                    </div>
                    {requestInfoFor === c.id && (
                      <div style={{ marginTop:"10px", paddingTop:"10px", borderTop:"1px solid #e2e8f0" }}>
                        <textarea value={requestInfoText} onChange={e => setRequestInfoText(e.target.value)}
                          placeholder={`What do you need from ${c.user_name || 'them'}? e.g. "Could you confirm the practice address on file, or send a callback number we can reach you at?"`}
                          style={{ width:"100%", minHeight:"70px", padding:"8px 10px", fontSize:"12px", fontFamily:"inherit", border:"1px solid #d1d5db", borderRadius:"6px", outline:"none", resize:"vertical" }} />
                        <div style={{ display:"flex", gap:"8px", marginTop:"6px" }}>
                          <button onClick={() => sendClaimInfoRequest(c)} disabled={requestInfoSending || !requestInfoText.trim()} style={{ all:"unset", cursor: requestInfoSending || !requestInfoText.trim() ? "default" : "pointer", opacity: requestInfoSending || !requestInfoText.trim() ? 0.5 : 1, padding:"6px 14px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#2563eb", color:"#fff" }}>{requestInfoSending ? 'Sending…' : `Send to ${c.user_email}`}</button>
                          <button onClick={() => { setRequestInfoFor(null); setRequestInfoText('') }} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", fontSize:"11px", fontWeight:600, borderRadius:"6px", color:"#64748b" }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "announcements" && <AnnouncementsTab setMsg={setMsg} onCountChange={setPendingAnnouncementCount} />}
        {tab === "blog" && <BlogTab setMsg={setMsg} />}
        {tab === "analytics" && <AnalyticsTab setMsg={setMsg} />}
      </div>
      </div>
    </div>
  )
}


// ─── Settings tab: general/SEO/pricing/legal/operations, replacing the old pricing-only
// "Site settings" block now that Announcements/Blog/Analytics have their own tabs ───
const SETTINGS_SECTIONS = ['General', 'SEO', 'Legal', 'Billing', 'Operations']

function SettingsTab({ setMsg }) {
  const s = { width:"100%", padding:"8px 10px", fontSize:"13px", background:"#ffffff", border:"1px solid #d1d5db", borderRadius:"6px", color:"#111827", outline:"none", marginTop:"4px" }
  const lbl = { fontSize:"11px", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginTop:"12px" }
  const saveBtn = { all:"unset", cursor:"pointer", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:700, background:"#1e3a5f", color:"#fff", marginTop:"16px", display:"inline-block" }

  const [section, setSection] = useState('General')
  const [general, setGeneral] = useState(DEFAULTS.general)
  const [seo, setSeo] = useState(DEFAULTS.seo)
  const [legalDoc, setLegalDoc] = useState('terms')
  const [legalTerms, setLegalTerms] = useState({ html: DEFAULT_TERMS_HTML })
  const [legalPrivacy, setLegalPrivacy] = useState({ html: DEFAULT_PRIVACY_HTML })
  const [operations, setOperations] = useState(DEFAULTS.operations)
  const [squarePlans, setSquarePlans] = useState(null)
  const [squareSyncing, setSquareSyncing] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchSetting('general'), fetchSetting('seo'),
      fetchSetting('legal_terms'), fetchSetting('legal_privacy'), fetchSetting('operations'),
      fetchSetting('square_plans'),
    ]).then(([g, se, lt, lp, op, sp]) => {
      setGeneral(g || DEFAULTS.general)
      setSeo(se || DEFAULTS.seo)
      setLegalTerms(lt?.html ? lt : { html: DEFAULT_TERMS_HTML })
      setLegalPrivacy(lp?.html ? lp : { html: DEFAULT_PRIVACY_HTML })
      setOperations(op || DEFAULTS.operations)
      setSquarePlans(sp)
      setLoaded(true)
    })
  }, [])

  const syncSquarePlans = async () => {
    setSquareSyncing(true)
    const res = await fetch('/api/admin/square/setup-plans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user?.id }),
    }).then(r => r.json()).catch(e => ({ error: e.message }))
    setSquareSyncing(false)
    if (res.error) { setMsg('Error: ' + res.error); return }
    setSquarePlans(res.plans)
    setMsg('Square plans created/synced.')
  }

  const save = async (key, value, label) => {
    const res = await saveSetting(key, value)
    setMsg(res.error ? 'Error: ' + res.error : `${label} saved.`)
  }

  if (!loaded) return <div style={{ padding:"40px", textAlign:"center", color:"#94a3b8", fontSize:"13px" }}>Loading settings…</div>

  return (
    <>
      <h2 style={{ fontSize:"16px", fontWeight:700, marginBottom:"4px" }}>Settings</h2>
      <p style={{ fontSize:"12px", color:"#64748b", marginBottom:"16px" }}>Full control over site identity, SEO defaults, legal pages, billing, and operational switches — no code changes needed. Pricing page copy is hardcoded — ask to have it updated directly.</p>

      <div style={{ display:"flex", gap:"4px", marginBottom:"16px" }}>
        {SETTINGS_SECTIONS.map(sec => (
          <button key={sec} onClick={() => setSection(sec)} style={{ all:"unset", cursor:"pointer", padding:"7px 16px", borderRadius:"6px", fontSize:"12px", fontWeight:700, background: section === sec ? "#1e3a5f" : "#f1f5f9", color: section === sec ? "#fff" : "#64748b" }}>{sec}</button>
        ))}
      </div>

      <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"20px" }}>
        {section === 'General' && (
          <>
            <h3 style={{ margin:0, fontSize:"14px" }}>Site identity & contact</h3>
            <p style={{ margin:"4px 0 0", fontSize:"12px", color:"#64748b" }}>Used in the footer, structured data, and anywhere the site refers to itself.</p>
            <label style={lbl}>Site name</label>
            <input style={s} value={general.site_name} onChange={e => setGeneral(g => ({ ...g, site_name: e.target.value }))} />
            <label style={lbl}>Tagline</label>
            <input style={s} value={general.tagline} onChange={e => setGeneral(g => ({ ...g, tagline: e.target.value }))} />
            <label style={lbl}>Support / contact email</label>
            <input style={s} value={general.support_email} onChange={e => setGeneral(g => ({ ...g, support_email: e.target.value }))} />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
              <div><label style={lbl}>Facebook URL</label><input style={s} value={general.social_facebook} onChange={e => setGeneral(g => ({ ...g, social_facebook: e.target.value }))} placeholder="https://facebook.com/…" /></div>
              <div><label style={lbl}>Twitter / X URL</label><input style={s} value={general.social_twitter} onChange={e => setGeneral(g => ({ ...g, social_twitter: e.target.value }))} placeholder="https://x.com/…" /></div>
              <div><label style={lbl}>Instagram URL</label><input style={s} value={general.social_instagram} onChange={e => setGeneral(g => ({ ...g, social_instagram: e.target.value }))} placeholder="https://instagram.com/…" /></div>
              <div><label style={lbl}>LinkedIn URL</label><input style={s} value={general.social_linkedin} onChange={e => setGeneral(g => ({ ...g, social_linkedin: e.target.value }))} placeholder="https://linkedin.com/…" /></div>
            </div>
            <button onClick={() => save('general', general, 'Site identity')} style={saveBtn}>Save</button>
          </>
        )}

        {section === 'SEO' && (
          <>
            <h3 style={{ margin:0, fontSize:"14px" }}>Default SEO</h3>
            <p style={{ margin:"4px 0 0", fontSize:"12px", color:"#64748b" }}>Fallback title/description/image for the homepage and any page that doesn't set its own.</p>
            <label style={lbl}>Default meta title</label>
            <input style={s} value={seo.default_meta_title} onChange={e => setSeo(x => ({ ...x, default_meta_title: e.target.value }))} maxLength={70} />
            <label style={lbl}>Default meta description</label>
            <textarea style={{ ...s, minHeight:"60px", resize:"vertical" }} value={seo.default_meta_description} onChange={e => setSeo(x => ({ ...x, default_meta_description: e.target.value }))} maxLength={200} />
            <label style={lbl}>Default social share image (URL)</label>
            <input style={s} value={seo.default_og_image} onChange={e => setSeo(x => ({ ...x, default_og_image: e.target.value }))} placeholder="/img/logo.png" />
            <button onClick={() => save('seo', seo, 'SEO defaults')} style={saveBtn}>Save</button>
          </>
        )}

        {section === 'Legal' && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h3 style={{ margin:0, fontSize:"14px" }}>Legal pages</h3>
              <div style={{ display:"flex", gap:"4px" }}>
                <button onClick={() => setLegalDoc('terms')} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", borderRadius:"6px", fontSize:"11px", fontWeight:700, background: legalDoc === 'terms' ? "#1e3a5f" : "#f1f5f9", color: legalDoc === 'terms' ? "#fff" : "#64748b" }}>Terms of Service</button>
                <button onClick={() => setLegalDoc('privacy')} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", borderRadius:"6px", fontSize:"11px", fontWeight:700, background: legalDoc === 'privacy' ? "#1e3a5f" : "#f1f5f9", color: legalDoc === 'privacy' ? "#fff" : "#64748b" }}>Privacy Policy</button>
              </div>
            </div>
            <p style={{ margin:"4px 0 12px", fontSize:"12px", color:"#64748b" }}>Edits go live on /{legalDoc === 'terms' ? 'terms' : 'privacy'} immediately on save, and update the "Last updated" date shown there.</p>
            {legalDoc === 'terms' ? (
              <RichTextEditor key="terms" value={legalTerms.html} onChange={html => setLegalTerms({ html })} />
            ) : (
              <RichTextEditor key="privacy" value={legalPrivacy.html} onChange={html => setLegalPrivacy({ html })} />
            )}
            <button
              onClick={() => legalDoc === 'terms'
                ? save('legal_terms', { html: legalTerms.html, updated_at: new Date().toISOString() }, 'Terms of Service')
                : save('legal_privacy', { html: legalPrivacy.html, updated_at: new Date().toISOString() }, 'Privacy Policy')}
              style={saveBtn}>
              Save & publish
            </button>
          </>
        )}

        {section === 'Billing' && (
          <>
            <h3 style={{ margin:0, fontSize:"14px" }}>Square subscription plans</h3>
            <p style={{ margin:"4px 0 12px", fontSize:"12px", color:"#64748b" }}>
              Creates the Verified ($29/mo) and Featured ($79/mo) subscription plans in Square's catalog, each with a 2-month $0 trial phase before billing starts. Safe to run again if prices change in code.
            </p>
            <div style={{ border:"1px solid #e2e8f0", borderRadius:"10px", padding:"14px" }}>
              {squarePlans ? (
                <>
                  <div style={{ fontSize:"12px", color:"#059669", fontWeight:700, marginBottom:"8px" }}>✓ Plans configured</div>
                  <div style={{ fontSize:"11px", color:"#64748b", fontFamily:"monospace", lineHeight:1.8 }}>
                    Verified variation: {squarePlans.verified?.variation_id || '—'}<br />
                    Featured variation: {squarePlans.featured?.variation_id || '—'}
                  </div>
                </>
              ) : (
                <div style={{ fontSize:"12px", color:"#b45309" }}>Not set up yet.</div>
              )}
              <button onClick={syncSquarePlans} disabled={squareSyncing} style={{ all:"unset", cursor:"pointer", padding:"8px 18px", borderRadius:"6px", fontSize:"12px", fontWeight:700, background:"#1e3a5f", color:"#fff", marginTop:"12px", opacity: squareSyncing ? 0.6 : 1 }}>
                {squareSyncing ? 'Syncing…' : squarePlans ? 'Re-sync plans' : 'Set up Square plans'}
              </button>
            </div>
          </>
        )}

        {section === 'Operations' && (
          <>
            <h3 style={{ margin:0, fontSize:"14px" }}>Operational switches</h3>
            <p style={{ margin:"4px 0 12px", fontSize:"12px", color:"#64748b" }}>Site-wide kill switches — no redeploy needed.</p>
            <div style={{ border:"1px solid #e2e8f0", borderRadius:"10px", padding:"14px" }}>
              <label style={{ display:"flex", alignItems:"center", gap:"10px", cursor:"pointer" }}>
                <input type="checkbox" checked={!operations.emails_paused} onChange={e => setOperations(o => ({ ...o, emails_paused: !e.target.checked }))} style={{ width:"16px", height:"16px" }} />
                <span style={{ fontSize:"13px", fontWeight:600, color:"#111827" }}>Automated emails enabled</span>
              </label>
              <p style={{ fontSize:"11px", color:"#94a3b8", margin:"6px 0 0 26px" }}>Controls trial reminders and monthly provider-update emails. Staff invites and admin outreach campaigns aren't affected — those only send when you trigger them directly.</p>
              <p style={{ fontSize:"11px", fontWeight:700, margin:"10px 0 0 26px", color: operations.emails_paused ? "#b45309" : "#059669" }}>
                {operations.emails_paused ? '⏸ Currently paused' : '▶ Currently active'}
              </p>
            </div>
            <button onClick={() => save('operations', operations, 'Operations')} style={saveBtn}>Save</button>
          </>
        )}
      </div>
    </>
  )
}

// ─── Homepage Announcements tab: approve/reject provider submissions, plus create/edit/
// delete admin-authored slides directly (not tied to any provider) ───
const emptyAnnouncement = () => ({ id: null, provider_id: null, template: 'text-card', headline: '', subheadline: '', body: '', image_url: '', image_path: '', logo_url: '', logo_path: '', cta_label: '', cta_url: '', sort_order: 0, style: ANNOUNCEMENT_DEFAULT_STYLE })

function AnnouncementsTab({ setMsg, onCountChange }) {
  const s = { width:"100%", padding:"8px 10px", fontSize:"13px", background:"#ffffff", border:"1px solid #d1d5db", borderRadius:"6px", color:"#111827", outline:"none", marginTop:"4px" }
  const lbl = { fontSize:"11px", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginTop:"12px" }

  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyAnnouncement())
  const [uploading, setUploading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [providerQuery, setProviderQuery] = useState('')
  const [providerResults, setProviderResults] = useState([])
  const [linkedProvider, setLinkedProvider] = useState(null)
  const [selectedEl, setSelectedEl] = useState(null)

  const load = useCallback(async () => {
    const data = await fetchAllAnnouncements()
    setRows(data)
    onCountChange(data.filter(a => a.status === 'pending').length)
  }, [onCountChange])

  useEffect(() => { load() }, [load])

  const searchProviders = async (q) => {
    setProviderQuery(q)
    if (!supabase || q.trim().length < 2) { setProviderResults([]); return }
    const { data } = await supabase.from('providers').select('id, name').ilike('name', `%${q.trim()}%`).limit(8)
    setProviderResults(data || [])
  }

  const uploadImage = async (file) => {
    if (!file || !supabase) return
    setUploading(true)
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `announcements/admin-${Date.now()}-${safe}`
    const { error: upErr } = await supabase.storage.from('forms').upload(path, file)
    if (upErr) { setMsg('Error: ' + upErr.message); setUploading(false); return }
    const { data: pub } = supabase.storage.from('forms').getPublicUrl(path)
    setForm(f => ({ ...f, image_url: pub?.publicUrl || '', image_path: path }))
    setUploading(false)
  }

  const uploadLogo = async (file) => {
    if (!file || !supabase) return
    setUploadingLogo(true)
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `announcements/logo-admin-${Date.now()}-${safe}`
    const { error: upErr } = await supabase.storage.from('forms').upload(path, file)
    if (upErr) { setMsg('Error: ' + upErr.message); setUploadingLogo(false); return }
    const { data: pub } = supabase.storage.from('forms').getPublicUrl(path)
    setForm(f => ({ ...f, logo_url: pub?.publicUrl || '', logo_path: path }))
    setUploadingLogo(false)
  }

  const startEdit = (row) => {
    setForm({ id: row.id, provider_id: row.provider_id, template: row.template, headline: row.headline || '', subheadline: row.subheadline || '', body: row.body || '', image_url: row.image_url || '', image_path: row.image_path || '', logo_url: row.logo_url || '', logo_path: row.logo_path || '', cta_label: row.cta_label || '', cta_url: row.cta_url || '', sort_order: row.sort_order || 0, style: mergeAnnouncementStyle(row.style) })
    setLinkedProvider(row.providers || null)
    setSelectedEl(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => { setForm(emptyAnnouncement()); setLinkedProvider(null); setProviderQuery(''); setProviderResults([]); setSelectedEl(null) }

  const save = async () => {
    if (!form.headline.trim()) { setMsg('Add a headline first'); return }
    const fields = { provider_id: linkedProvider?.id || null, template: form.template, headline: form.headline, subheadline: form.subheadline, body: form.body, image_url: form.image_url, image_path: form.image_path, logo_url: form.logo_url, logo_path: form.logo_path, cta_label: form.cta_label, cta_url: form.cta_url, sort_order: parseInt(form.sort_order) || 0, style: form.style }
    const res = form.id
      ? await updateAnnouncement(form.id, fields)
      : await createAdminAnnouncement(fields)
    if (res.error) { setMsg('Error: ' + res.error); return }
    setMsg(form.id ? 'Announcement updated' : 'Announcement created and live')
    resetForm()
    load()
  }

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row.headline}"? This can't be undone.`)) return
    await deleteAnnouncement(row.id)
    setMsg('Announcement deleted')
    if (form.id === row.id) resetForm()
    load()
  }

  const review = async (row, action) => {
    let admin_notes = null
    if (action === 'rejected') admin_notes = window.prompt('Note for the provider (optional):', '') || null
    const res = await fetch('/api/announcements/review', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, action, admin_notes }),
    }).then(r => r.json()).catch(e => ({ error: e.message }))
    if (res.error) { setMsg('Error: ' + res.error); return }
    setMsg(action === 'approved' ? 'Announcement approved, now live — provider notified by email' : 'Announcement rejected — provider notified by email')
    load()
  }

  const statusStyle = { pending: { bg:"#f59e0b20", color:"#b45309" }, approved: { bg:"#05966920", color:"#059669" }, rejected: { bg:"#dc262620", color:"#dc2626" } }

  return (
    <>
      <h2 style={{ fontSize:"16px", fontWeight:700, marginBottom:"4px" }}>Homepage Announcements</h2>
      <p style={{ fontSize:"12px", color:"#64748b", marginBottom:"16px" }}>Review provider submissions below, or create your own platform-authored slide — those go live immediately, no review needed.</p>

      <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"16px", marginBottom:"20px" }}>
        <div style={{ fontSize:"13px", fontWeight:700 }}>{form.id ? 'Edit slide' : '+ New admin slide'}</div>

        <label style={lbl}>Styling</label>
        <div style={{ marginTop:"4px" }}>
          <AnnouncementToolbar style={form.style} onChange={v => setForm(f => ({ ...f, style: v }))} selected={selectedEl} showImage={form.template !== 'text-card'} template={form.template} />
        </div>

        <label style={lbl}>Live preview — click any element to select and style it</label>
        <div style={{ position:"relative", height:"220px", borderRadius:"16px", overflow:"hidden", marginTop:"4px" }} onClick={() => setSelectedEl(null)}>
          <AnnouncementSlide item={{ ...form, providers: linkedProvider }} editable selectedKey={selectedEl} onSelect={setSelectedEl} />
        </div>

        <label style={lbl}>Template</label>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"8px", marginTop:"4px" }}>
          {ANNOUNCEMENT_TEMPLATES.map(t => (
            <button key={t.key} onClick={() => setForm(f => ({ ...f, template: t.key }))} style={{ all:"unset", cursor:"pointer", textAlign:"left", padding:"8px 10px", borderRadius:"6px", border: form.template === t.key ? "1px solid #1e3a5f" : "1px solid #e2e8f0", background: form.template === t.key ? "#1e3a5f10" : "#fff" }}>
              <div style={{ fontSize:"12px", fontWeight:700 }}>{t.label}</div>
              <div style={{ fontSize:"10px", color:"#64748b", marginTop:"2px" }}>{t.description}</div>
            </button>
          ))}
        </div>

        <label style={lbl}>Headline (H1) *</label>
        <input style={s} value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} onFocus={() => setSelectedEl('headline')} placeholder="Now accepting new patients" maxLength={60} />

        <label style={lbl}>Subheading (H2)</label>
        <input style={s} value={form.subheadline} onChange={e => setForm(f => ({ ...f, subheadline: e.target.value }))} onFocus={() => setSelectedEl('subheadline')} placeholder="Optional secondary line" maxLength={80} />

        <label style={lbl}>Paragraph</label>
        <textarea style={{ ...s, minHeight:"50px", resize:"vertical" }} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} onFocus={() => setSelectedEl('body')} placeholder="Short supporting line" maxLength={160} />

        <label style={lbl}>Logo</label>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginTop:"4px" }}>
          <label style={{ all:"unset", cursor:"pointer", padding:"7px 14px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#e2e8f0", color:"#475569" }}>
            {uploadingLogo ? 'Uploading…' : form.logo_url ? 'Change logo' : '📎 Choose logo'}
            <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => uploadLogo(e.target.files?.[0])} style={{ display:"none" }} disabled={uploadingLogo} />
          </label>
          {form.logo_url && <img src={form.logo_url} alt="" style={{ width:"36px", height:"36px", borderRadius:"6px", objectFit:"contain", background:"#fff", border:"1px solid #e2e8f0" }} />}
          {form.logo_url && <button onClick={() => setForm(f => ({ ...f, logo_url: '', logo_path: '' }))} style={{ all:"unset", cursor:"pointer", fontSize:"10px", color:"#94a3b8" }}>Remove</button>}
        </div>

        {form.template !== 'text-card' && (
          <>
            <label style={lbl}>Picture</label>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginTop:"4px" }}>
              <label style={{ all:"unset", cursor:"pointer", padding:"7px 14px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#e2e8f0", color:"#475569" }}>
                {uploading ? 'Uploading…' : form.image_url ? 'Change image' : '📎 Choose image'}
                <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => uploadImage(e.target.files?.[0])} style={{ display:"none" }} disabled={uploading} />
              </label>
              {form.image_url && <img src={form.image_url} alt="" style={{ width:"36px", height:"36px", borderRadius:"6px", objectFit:"cover" }} />}
            </div>
          </>
        )}

        <div style={{ position:"relative" }}>
          <label style={lbl}>Link to a listing (optional)</label>
          {linkedProvider ? (
            <div style={{ ...s, marginTop:"4px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>{linkedProvider.name}</span>
              <button onClick={() => setLinkedProvider(null)} style={{ all:"unset", cursor:"pointer", color:"#dc2626", fontSize:"12px", fontWeight:600 }}>✕</button>
            </div>
          ) : (
            <>
              <input style={s} value={providerQuery} onChange={e => searchProviders(e.target.value)} placeholder="🔎 Search clinics/doctors, or leave blank for a platform slide…" />
              {providerResults.length > 0 && (
                <div style={{ position:"absolute", zIndex:30, left:0, right:0, top:"100%", marginTop:"4px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px", maxHeight:"180px", overflowY:"auto" }}>
                  {providerResults.map(p => (
                    <button key={p.id} onClick={() => { setLinkedProvider(p); setProviderQuery(''); setProviderResults([]) }} style={{ all:"unset", cursor:"pointer", display:"block", width:"100%", boxSizing:"border-box", padding:"8px 12px", borderBottom:"1px solid #e2e8f0", fontSize:"12px" }}>{p.name}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 100px", gap:"10px" }}>
          <div><label style={lbl}>Button text</label><input style={s} value={form.cta_label} onChange={e => setForm(f => ({ ...f, cta_label: e.target.value }))} onFocus={() => setSelectedEl('button')} placeholder="Book now" /></div>
          <div><label style={lbl}>Button link</label><input style={s} value={form.cta_url} onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))} onFocus={() => setSelectedEl('button')} placeholder="/search?id=... or a full URL" /></div>
          <div><label style={lbl}>Order</label><input style={s} type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} /></div>
        </div>

        <div style={{ display:"flex", gap:"8px", marginTop:"14px" }}>
          <button onClick={save} disabled={uploading} style={{ all:"unset", cursor:"pointer", padding:"9px 18px", borderRadius:"6px", fontSize:"12px", fontWeight:700, background:"#1e3a5f", color:"#fff" }}>{form.id ? 'Save changes' : 'Create & publish'}</button>
          {form.id && <button onClick={resetForm} style={{ all:"unset", cursor:"pointer", padding:"9px 18px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#e2e8f0", color:"#475569" }}>Cancel edit</button>}
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"30px", textAlign:"center", color:"#64748b", fontSize:"13px" }}>No announcements yet</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
          {rows.map(a => (
            <div key={a.id} style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"12px" }}>
                <div style={{ flex:1, display:"flex", gap:"12px" }}>
                  {a.image_url && <img src={a.image_url} alt="" style={{ width:"56px", height:"56px", borderRadius:"6px", objectFit:"cover", flexShrink:0 }} />}
                  <div>
                    <div style={{ fontSize:"13px", fontWeight:600 }}>{a.providers?.name || 'Platform slide (no listing)'}</div>
                    <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>{a.template} · "{a.headline}"</div>
                    {a.body && <div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"2px" }}>{a.body}</div>}
                    <div style={{ fontSize:"10px", color:"#94a3b8", marginTop:"4px" }}>{new Date(a.created_at).toLocaleDateString()} · order {a.sort_order ?? 0}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:"4px", alignItems:"center", flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
                  {a.status === 'pending' && (
                    <>
                      <button onClick={() => review(a, 'approved')} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#05966920", color:"#059669", border:"1px solid #05966940" }}>✓ Approve</button>
                      <button onClick={() => review(a, 'rejected')} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>✕ Reject</button>
                    </>
                  )}
                  <span style={{ padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:statusStyle[a.status].bg, color:statusStyle[a.status].color, textTransform:"capitalize" }}>{a.status}</span>
                  <button onClick={() => startEdit(a)} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#3b82f620", color:"#2563eb", border:"1px solid #3b82f640" }}>Edit</button>
                  <button onClick={() => remove(a)} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Blog Posts tab ───
const emptyPost = () => ({
  id: null, title: '', slug: '', excerpt: '', author: '', cover_image: '', cover_image_path: '',
  tags: '', body: '', meta_title: '', meta_description: '', og_image: '', og_image_path: '', published: false, published_at: null,
})

function BlogTab({ setMsg }) {
  const s = { width:"100%", padding:"8px 10px", fontSize:"13px", background:"#ffffff", border:"1px solid #d1d5db", borderRadius:"6px", color:"#111827", outline:"none", marginTop:"4px" }
  const lbl = { fontSize:"11px", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginTop:"12px" }
  const box = { border:"1px solid #e2e8f0", borderRadius:"8px", padding:"14px 16px", marginTop:"16px" }

  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyPost())
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingOg, setUploadingOg] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  const load = useCallback(async () => { setRows(await fetchAllPosts()) }, [])
  useEffect(() => { load() }, [load])

  const setTitle = (title) => setForm(f => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }))

  const uploadImage = async (file, kind) => {
    if (!file || !supabase) return
    const setUp = kind === 'cover' ? setUploadingCover : setUploadingOg
    setUp(true)
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `blog/${kind}-${Date.now()}-${safe}`
    const { error: upErr } = await supabase.storage.from('forms').upload(path, file)
    if (upErr) { setMsg('Error: ' + upErr.message); setUp(false); return }
    const { data: pub } = supabase.storage.from('forms').getPublicUrl(path)
    if (kind === 'cover') setForm(f => ({ ...f, cover_image: pub?.publicUrl || '', cover_image_path: path }))
    else setForm(f => ({ ...f, og_image: pub?.publicUrl || '', og_image_path: path }))
    setUp(false)
  }

  const startEdit = (row) => {
    setForm({
      id: row.id, title: row.title || '', slug: row.slug || '', excerpt: row.excerpt || '', author: row.author || '',
      cover_image: row.cover_image || '', cover_image_path: '', tags: row.tags || '', body: row.body || '',
      meta_title: row.meta_title || '', meta_description: row.meta_description || '', og_image: row.og_image || '', og_image_path: '',
      published: !!row.published, published_at: row.published_at || null,
    })
    setSlugTouched(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => { setForm(emptyPost()); setSlugTouched(false) }

  const save = async (publishNow) => {
    if (!form.title.trim()) { setMsg('Add a title first'); return }
    if (!form.slug.trim()) { setMsg('Add a slug first'); return }
    const fields = { ...form, published: publishNow !== undefined ? publishNow : form.published }
    const res = form.id ? await updatePost(form.id, fields) : await createPost(fields)
    if (res.error) { setMsg('Error: ' + res.error); return }
    setMsg(form.id ? 'Post saved' : (fields.published ? 'Post published' : 'Draft created'))
    resetForm()
    load()
  }

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row.title}"? This can't be undone.`)) return
    await deletePost(row.id)
    setMsg('Post deleted')
    if (form.id === row.id) resetForm()
    load()
  }

  return (
    <>
      <h2 style={{ fontSize:"16px", fontWeight:700, marginBottom:"4px" }}>Blog Posts</h2>
      <p style={{ fontSize:"12px", color:"#64748b", marginBottom:"16px" }}>Full editor with SEO fields — every image requires alt text before it can be inserted.</p>

      <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"16px", marginBottom:"20px" }}>
        <div style={{ fontSize:"13px", fontWeight:700 }}>{form.id ? 'Edit post' : '+ New post'}</div>

        <label style={lbl}>Title *</label>
        <input style={s} value={form.title} onChange={e => setTitle(e.target.value)} placeholder="How to cut referral rejection rate to zero" />

        <label style={lbl}>Slug *</label>
        <input style={s} value={form.slug} onChange={e => { setSlugTouched(true); setForm(f => ({ ...f, slug: slugify(e.target.value) })) }} />
        <div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"4px" }}>refereasy.ca/blog/{form.slug || '…'}</div>

        <label style={lbl}>Excerpt</label>
        <textarea style={{ ...s, minHeight:"50px", resize:"vertical" }} value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} placeholder="Shown on the blog index and used as the fallback meta description" maxLength={200} />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          <div><label style={lbl}>Author</label><input style={s} value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} /></div>
          <div><label style={lbl}>Tags (comma-separated)</label><input style={s} value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="referrals, wait times" /></div>
        </div>

        <label style={lbl}>Cover image</label>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginTop:"4px" }}>
          <label style={{ all:"unset", cursor:"pointer", padding:"7px 14px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#e2e8f0", color:"#475569" }}>
            {uploadingCover ? 'Uploading…' : form.cover_image ? 'Change image' : '📎 Choose image'}
            <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => uploadImage(e.target.files?.[0], 'cover')} style={{ display:"none" }} disabled={uploadingCover} />
          </label>
          {form.cover_image && <img src={form.cover_image} alt="" style={{ width:"36px", height:"36px", borderRadius:"6px", objectFit:"cover" }} />}
          {form.cover_image && <button type="button" onClick={() => setForm(f => ({ ...f, cover_image: '', cover_image_path: '' }))} style={{ all:"unset", cursor:"pointer", padding:"7px 12px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#fef2f2", color:"#b91c1c" }}>Remove</button>}
        </div>

        <label style={lbl}>Content</label>
        <div style={{ marginTop:"4px" }}>
          <RichTextEditor key={form.id || 'new'} value={form.body} onChange={html => setForm(f => ({ ...f, body: html }))} placeholder="Write your post…" />
        </div>

        <div style={box}>
          <div style={{ fontSize:"12px", fontWeight:700, color:"#374151" }}>SEO</div>
          <label style={lbl}>Meta title <span style={{ color:"#94a3b8", textTransform:"none", fontWeight:400 }}>(falls back to Title)</span></label>
          <input style={s} value={form.meta_title} onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))} maxLength={60} />
          <label style={lbl}>Meta description <span style={{ color:"#94a3b8", textTransform:"none", fontWeight:400 }}>(falls back to Excerpt)</span></label>
          <textarea style={{ ...s, minHeight:"44px", resize:"vertical" }} value={form.meta_description} onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))} maxLength={160} />
          <label style={lbl}>Social share image <span style={{ color:"#94a3b8", textTransform:"none", fontWeight:400 }}>(falls back to Cover image)</span></label>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginTop:"4px" }}>
            <label style={{ all:"unset", cursor:"pointer", padding:"7px 14px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#e2e8f0", color:"#475569" }}>
              {uploadingOg ? 'Uploading…' : form.og_image ? 'Change image' : '📎 Choose image'}
              <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => uploadImage(e.target.files?.[0], 'og')} style={{ display:"none" }} disabled={uploadingOg} />
            </label>
            {form.og_image && <img src={form.og_image} alt="" style={{ width:"36px", height:"36px", borderRadius:"6px", objectFit:"cover" }} />}
            {form.og_image && <button type="button" onClick={() => setForm(f => ({ ...f, og_image: '', og_image_path: '' }))} style={{ all:"unset", cursor:"pointer", padding:"7px 12px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#fef2f2", color:"#b91c1c" }}>Remove</button>}
          </div>
        </div>

        <div style={{ display:"flex", gap:"8px", marginTop:"14px", alignItems:"center" }}>
          <button onClick={() => save(false)} style={{ all:"unset", cursor:"pointer", padding:"9px 18px", borderRadius:"6px", fontSize:"12px", fontWeight:700, background:"#e2e8f0", color:"#475569" }}>Save draft</button>
          <button onClick={() => save(true)} style={{ all:"unset", cursor:"pointer", padding:"9px 18px", borderRadius:"6px", fontSize:"12px", fontWeight:700, background:"#1e3a5f", color:"#fff" }}>{form.published ? 'Save & keep live' : 'Publish'}</button>
          {form.id && form.published && <button onClick={() => save(false)} style={{ all:"unset", cursor:"pointer", padding:"9px 18px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#fef3c7", color:"#b45309" }}>Unpublish</button>}
          {form.id && <button onClick={resetForm} style={{ all:"unset", cursor:"pointer", padding:"9px 18px", borderRadius:"6px", fontSize:"12px", fontWeight:600, background:"#e2e8f0", color:"#475569" }}>Cancel edit</button>}
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"30px", textAlign:"center", color:"#64748b", fontSize:"13px" }}>No posts yet</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
          {rows.map(p => (
            <div key={p.id} style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"12px" }}>
                <div style={{ flex:1, display:"flex", gap:"12px" }}>
                  {p.cover_image && <img src={p.cover_image} alt="" style={{ width:"56px", height:"56px", borderRadius:"6px", objectFit:"cover", flexShrink:0 }} />}
                  <div>
                    <div style={{ fontSize:"13px", fontWeight:600 }}>{p.title}</div>
                    <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>/blog/{p.slug}</div>
                    <div style={{ fontSize:"10px", color:"#94a3b8", marginTop:"4px" }}>{p.author ? `${p.author} · ` : ''}{p.published_at ? new Date(p.published_at).toLocaleDateString() : 'Not published'}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:"4px", alignItems:"center", flexShrink:0 }}>
                  <span style={{ padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background: p.published ? "#05966920" : "#f59e0b20", color: p.published ? "#059669" : "#b45309" }}>{p.published ? 'Published' : 'Draft'}</span>
                  <button onClick={() => startEdit(p)} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#3b82f620", color:"#2563eb", border:"1px solid #3b82f640" }}>Edit</button>
                  <button onClick={() => remove(p)} style={{ all:"unset", cursor:"pointer", padding:"5px 12px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Platform Analytics tab ───
const RANGE_PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'Year', days: 365 },
  { label: 'All time', days: null },
]
const fmtDate = (d) => d.toISOString().slice(0, 10)

function StatCard({ label, value, change }) {
  return (
    <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"10px", padding:"14px 16px" }}>
      <div style={{ fontSize:"10px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
      <div style={{ fontSize:"22px", fontWeight:800, color:"#0f172a", marginTop:"4px" }}>{value}</div>
      {typeof change === 'number' && (
        <div style={{ fontSize:"11px", fontWeight:700, marginTop:"2px", color: change >= 0 ? "#059669" : "#dc2626" }}>{change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs prior period</div>
      )}
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"10px", padding:"16px" }}>
      <div style={{ fontSize:"12px", fontWeight:700, color:"#374151", marginBottom:"12px" }}>{title}</div>
      {children}
    </div>
  )
}

function Bar({ label, count, pct }) {
  return (
    <div style={{ marginBottom:"8px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", color:"#475569", marginBottom:"3px" }}>
        <span style={{ textTransform:"capitalize" }}>{label}</span><span>{count} · {pct}%</span>
      </div>
      <div style={{ height:"6px", background:"#f1f5f9", borderRadius:"999px", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:"#1e3a5f", borderRadius:"999px" }} />
      </div>
    </div>
  )
}

function FunnelRow({ label, value, max, color }) {
  const pct = max ? Math.max(4, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
      <div style={{ width:"110px", fontSize:"11px", color:"#475569", flexShrink:0 }}>{label}</div>
      <div style={{ flex:1, height:"20px", background:"#f1f5f9", borderRadius:"6px", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:"6px", display:"flex", alignItems:"center", paddingLeft:"8px" }}>
          <span style={{ fontSize:"11px", fontWeight:700, color:"#fff" }}>{value}</span>
        </div>
      </div>
    </div>
  )
}

function AnalyticsTab({ setMsg }) {
  const [range, setRange] = useState(() => presetRange(30))
  const [activePreset, setActivePreset] = useState(30)
  const [showCustom, setShowCustom] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [overview, setOverview] = useState(null)
  const [topPages, setTopPages] = useState([])
  const [sources, setSources] = useState(null)
  const [devices, setDevices] = useState(null)
  const [search, setSearchData] = useState(null)
  const [funnel, setFunnel] = useState(null)
  const [rollup, setRollup] = useState(null)
  const [loading, setLoading] = useState(true)

  const pickPreset = (days) => {
    setActivePreset(days)
    setShowCustom(false)
    setRange(presetRange(days))
  }

  const applyCustom = () => {
    if (!customFrom || !customTo) return
    setActivePreset(null)
    setRange({ start: new Date(customFrom + 'T00:00:00'), end: new Date(customTo + 'T23:59:59') })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchTrafficOverview(range), fetchTopPages(range), fetchTrafficSources(range),
      fetchDeviceBreakdown(range), fetchSearchInsights(range), fetchConversionFunnel(range),
      fetchProviderEngagementRollup(range),
    ]).then(([ov, tp, src, dev, se, fn, rl]) => {
      if (cancelled) return
      setOverview(ov); setTopPages(tp); setSources(src); setDevices(dev); setSearchData(se); setFunnel(fn); setRollup(rl)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [range])

  if (loading || !overview) return <div style={{ padding:"40px", textAlign:"center", color:"#94a3b8", fontSize:"13px" }}>Loading analytics…</div>

  const trendSeries = [
    { key: 'views', label: 'Page views', color: '#1e3a5f', data: overview.series.map(d => ({ date: d.date, value: d.views })) },
    { key: 'visitors', label: 'Unique visitors', color: '#f59e0b', data: overview.series.map(d => ({ date: d.date, value: d.visitors })) },
  ]
  const funnelMax = funnel?.visits || 1

  return (
    <>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"10px", flexWrap:"wrap", gap:"10px" }}>
        <div>
          <h2 style={{ fontSize:"16px", fontWeight:700, marginBottom:"4px" }}>Platform Analytics</h2>
          <p style={{ fontSize:"12px", color:"#64748b" }}>Site-wide traffic, search behaviour, and engagement — everything, not scoped to one listing.</p>
        </div>
        <div style={{ display:"flex", gap:"4px", alignItems:"center" }}>
          {RANGE_PRESETS.map(r => (
            <button key={r.label} onClick={() => pickPreset(r.days)} style={{ all:"unset", cursor:"pointer", padding:"6px 12px", borderRadius:"6px", fontSize:"11px", fontWeight:700, background: !showCustom && activePreset === r.days ? "#1e3a5f" : "#f1f5f9", color: !showCustom && activePreset === r.days ? "#fff" : "#64748b" }}>{r.label}</button>
          ))}
          <button onClick={() => setShowCustom(v => !v)} style={{ all:"unset", cursor:"pointer", padding:"6px 12px", borderRadius:"6px", fontSize:"11px", fontWeight:700, background: showCustom ? "#1e3a5f" : "#f1f5f9", color: showCustom ? "#fff" : "#64748b" }}>📅 Custom</button>
        </div>
      </div>

      {showCustom && (
        <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"16px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"10px 12px" }}>
          <label style={{ fontSize:"11px", fontWeight:600, color:"#64748b" }}>From</label>
          <input type="date" value={customFrom} max={fmtDate(new Date())} onChange={e => setCustomFrom(e.target.value)} style={{ padding:"5px 8px", fontSize:"12px", border:"1px solid #d1d5db", borderRadius:"6px" }} />
          <label style={{ fontSize:"11px", fontWeight:600, color:"#64748b" }}>To</label>
          <input type="date" value={customTo} max={fmtDate(new Date())} onChange={e => setCustomTo(e.target.value)} style={{ padding:"5px 8px", fontSize:"12px", border:"1px solid #d1d5db", borderRadius:"6px" }} />
          <button onClick={applyCustom} disabled={!customFrom || !customTo} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"6px", fontSize:"11px", fontWeight:700, background:"#1e3a5f", color:"#fff", opacity: (!customFrom || !customTo) ? 0.5 : 1 }}>Apply</button>
        </div>
      )}

      <div style={{ fontSize:"11px", color:"#94a3b8", marginBottom:"12px" }}>
        Showing {range.start ? range.start.toLocaleDateString('en-CA', { year:'numeric', month:'short', day:'numeric' }) : 'the beginning'} – {range.end.toLocaleDateString('en-CA', { year:'numeric', month:'short', day:'numeric' })}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:"10px", marginBottom:"16px" }}>
        <StatCard label="Page views" value={overview.pageViews.toLocaleString()} change={overview.pageViewsChange} />
        <StatCard label="Unique visitors" value={overview.uniqueVisitors.toLocaleString()} change={overview.uniqueVisitorsChange} />
        <StatCard label="Sessions" value={overview.sessions.toLocaleString()} />
        <StatCard label="Pages / session" value={overview.avgPagesPerSession} />
        <StatCard label="Bounce rate" value={`${overview.bounceRate}%`} />
      </div>

      <div style={{ marginBottom:"16px" }}>
        <Panel title="Traffic over time">
          <TrendChart series={trendSeries} height={180} />
        </Panel>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
        <Panel title="Top pages">
          {topPages.length === 0 ? <p style={{ fontSize:"12px", color:"#94a3b8" }}>No traffic yet.</p> : topPages.map(p => (
            <div key={p.path} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #f1f5f9", fontSize:"12px" }}>
              <span style={{ color:"#334155", fontFamily:"monospace" }}>{p.path}</span>
              <span style={{ fontWeight:700, color:"#0f172a" }}>{p.count}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Traffic sources">
          <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #f1f5f9", fontSize:"12px" }}>
            <span style={{ color:"#334155" }}>Direct / unknown</span>
            <span style={{ fontWeight:700, color:"#0f172a" }}>{sources?.direct ?? 0}</span>
          </div>
          {(sources?.referral || []).length === 0 ? <p style={{ fontSize:"12px", color:"#94a3b8", marginTop:"8px" }}>No external referrers yet.</p> : sources.referral.map(r => (
            <div key={r.domain} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #f1f5f9", fontSize:"12px" }}>
              <span style={{ color:"#334155" }}>{r.domain}</span>
              <span style={{ fontWeight:700, color:"#0f172a" }}>{r.count}</span>
            </div>
          ))}
        </Panel>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
        <Panel title="Device breakdown">
          {(devices?.devices || []).length === 0 ? <p style={{ fontSize:"12px", color:"#94a3b8" }}>No data yet.</p> : devices.devices.map(d => <Bar key={d.label} label={d.label} count={d.count} pct={d.pct} />)}
        </Panel>
        <Panel title="Browser breakdown">
          {(devices?.browsers || []).length === 0 ? <p style={{ fontSize:"12px", color:"#94a3b8" }}>No data yet.</p> : devices.browsers.map(b => <Bar key={b.label} label={b.label} count={b.count} pct={b.pct} />)}
        </Panel>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px", marginBottom:"12px" }}>
        <Panel title="Top search terms">
          {(search?.topQueries || []).length === 0 ? <p style={{ fontSize:"12px", color:"#94a3b8" }}>No searches yet.</p> : search.topQueries.map(q => (
            <div key={q.query} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:"12px" }}>
              <span style={{ color:"#334155" }}>"{q.query}"</span><span style={{ fontWeight:700 }}>{q.count}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Top searched specialties">
          {(search?.topSpecialties || []).length === 0 ? <p style={{ fontSize:"12px", color:"#94a3b8" }}>No filtered searches yet.</p> : search.topSpecialties.map(s => (
            <div key={s.specialty} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:"12px" }}>
              <span style={{ color:"#334155" }}>{s.specialty}</span><span style={{ fontWeight:700 }}>{s.count}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Search quality">
          <div style={{ fontSize:"28px", fontWeight:800, color: (search?.zeroResultRate || 0) > 20 ? "#dc2626" : "#0f172a" }}>{search?.zeroResultRate ?? 0}%</div>
          <div style={{ fontSize:"11px", color:"#94a3b8" }}>of {search?.totalSearches ?? 0} searches returned zero results</div>
        </Panel>
      </div>

      <div style={{ marginBottom:"12px" }}>
        <Panel title="Platform conversion funnel">
          <FunnelRow label="Site visits" value={funnel?.visits || 0} max={funnelMax} color="#1e3a5f" />
          <FunnelRow label="Searches" value={funnel?.searches || 0} max={funnelMax} color="#2a5082" />
          <FunnelRow label="Profile views" value={funnel?.profileViews || 0} max={funnelMax} color="#3b82f6" />
          <FunnelRow label="Contact clicks" value={funnel?.contactClicks || 0} max={funnelMax} color="#059669" />
          <FunnelRow label="Signups" value={funnel?.signups || 0} max={funnelMax} color="#f59e0b" />
        </Panel>
      </div>

      <Panel title="Most-viewed listings (platform-wide)">
        {(rollup?.topProviders || []).length === 0 ? <p style={{ fontSize:"12px", color:"#94a3b8" }}>No listing engagement yet.</p> : (
          <div style={{ display:"flex", flexDirection:"column", gap:"2px" }}>
            {rollup.topProviders.map((p, i) => (
              <div key={p.id} style={{ display:"grid", gridTemplateColumns:"24px 1fr 90px 90px 90px", alignItems:"center", padding:"7px 0", borderBottom:"1px solid #f1f5f9", fontSize:"12px" }}>
                <span style={{ color:"#94a3b8", fontWeight:700 }}>{i + 1}</span>
                <span style={{ color:"#334155", fontWeight:600 }}>{p.name}</span>
                <span style={{ color:"#64748b" }}>{p.views} views</span>
                <span style={{ color:"#64748b" }}>{p.contacts} contacts</span>
                <span style={{ color:"#64748b" }}>{p.favourites} saves</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  )
}

// ─── Invite Campaigns tab ───
function InvitesTab({ providers, setMsg }) {
  const [selectedTemplate, setSelectedTemplate] = useState('claim')
  const [customMessage, setCustomMessage] = useState('')
  const [filter, setFilter] = useState('unclaimed')  // all | unclaimed | uninvited | invited
  const [selected, setSelected] = useState(new Set())
  const [sending, setSending] = useState(false)

  const filtered = providers.filter(p => {
    if (!p.email) return false
    if (filter === 'unclaimed') return !p.claimed_at
    if (filter === 'uninvited') return !p.invited_at
    if (filter === 'invited') return !!p.invited_at
    return true
  })
  const stats = {
    total: providers.filter(p => p.email).length,
    invited: providers.filter(p => p.email && p.invited_at).length,
    claimed: providers.filter(p => p.email && p.claimed_at).length,
  }
  const rate = stats.invited > 0 ? Math.round((stats.claimed / stats.invited) * 100) : 0

  const toggleAll = () => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(p => p.id)))
  const toggleOne = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const sendCampaign = async () => {
    if (selected.size === 0) { setMsg('Select at least one recipient.'); return }
    setSending(true)
    const items = filtered.filter(p => selected.has(p.id)).map(p => ({ provider_id: p.id, email: p.email, name: p.name }))
    const r = await fetch('/api/outreach', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ items, template: selectedTemplate, message: customMessage })
    }).then(r => r.json()).catch(e => ({ error: e.message }))
    setSending(false)
    setMsg(r.error ? ('Send failed: ' + r.error) : ('Sent ' + (r.sent || 0) + ' / ' + items.length + ' invites' + (r.errors && r.errors.length ? ' (' + r.errors.length + ' failed)' : '')))
    setSelected(new Set())
  }

  const card = { background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'20px' }
  const stat = { background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'16px', flex:1 }

  return (
    <>
      <h2 style={{ fontSize:"18px", fontWeight:700, marginBottom:"6px" }}>Invite campaigns</h2>
      <p style={{ fontSize:"13px", color:"#64748b", marginBottom:"20px" }}>Reach unclaimed providers to invite them to claim their listing. Tracked automatically.</p>

      <div style={{ display:"flex", gap:"12px", marginBottom:"20px" }}>
        <div style={stat}><div style={{ fontSize:"11px", color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>Reachable</div><div style={{ fontSize:"24px", fontWeight:700, marginTop:"4px" }}>{stats.total}</div><div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"2px" }}>have email on file</div></div>
        <div style={stat}><div style={{ fontSize:"11px", color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>Invited</div><div style={{ fontSize:"24px", fontWeight:700, marginTop:"4px" }}>{stats.invited}</div><div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"2px" }}>{stats.total > 0 ? Math.round(stats.invited / stats.total * 100) : 0}% of reachable</div></div>
        <div style={stat}><div style={{ fontSize:"11px", color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>Claimed</div><div style={{ fontSize:"24px", fontWeight:700, marginTop:"4px", color:"#059669" }}>{stats.claimed}</div><div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"2px" }}>{rate}% conversion</div></div>
      </div>

      <div style={card}>
        <h3 style={{ fontSize:"14px", fontWeight:700, marginBottom:"14px" }}>Compose campaign</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"14px" }}>
          <div>
            <label style={{ fontSize:"11px", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:"6px" }}>Template</label>
            <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} style={{ width:"100%", padding:"9px 12px", border:"1px solid #cbd5e1", borderRadius:"8px", fontSize:"13px" }}>
              <option value="claim">Claim your listing (default)</option>
              <option value="verified">Get Verified (existing claimers)</option>
              <option value="featured">Upgrade to Featured</option>
              <option value="cold">Cold outreach (not yet listed)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:"11px", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:"6px" }}>Filter recipients</label>
            <select value={filter} onChange={e => { setFilter(e.target.value); setSelected(new Set()) }} style={{ width:"100%", padding:"9px 12px", border:"1px solid #cbd5e1", borderRadius:"8px", fontSize:"13px" }}>
              <option value="unclaimed">Unclaimed only</option>
              <option value="uninvited">Never invited</option>
              <option value="invited">Previously invited</option>
              <option value="all">All with email</option>
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize:"11px", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:"6px" }}>Optional custom message (added to template)</label>
          <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} rows={3} style={{ width:"100%", padding:"9px 12px", border:"1px solid #cbd5e1", borderRadius:"8px", fontSize:"13px", resize:"vertical" }} placeholder="Anything specific about this campaign, e.g. a season, event, or focus area." />
        </div>
        <div style={{ marginTop:"14px", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px", background:"#f8fafc", borderRadius:"8px" }}>
          <span style={{ fontSize:"13px", color:"#475569" }}><strong>{selected.size}</strong> of {filtered.length} recipients selected</span>
          <button onClick={sendCampaign} disabled={sending || selected.size === 0} style={{ all:"unset", cursor: sending || selected.size === 0 ? "not-allowed" : "pointer", padding:"9px 20px", background: sending || selected.size === 0 ? "#94a3b8" : "#1e3a5f", color:"#fff", borderRadius:"8px", fontSize:"13px", fontWeight:700 }}>{sending ? 'Sending…' : `Send to ${selected.size || 'none'}`}</button>
        </div>
      </div>

      <div style={{ ...card, marginTop:"14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
          <h3 style={{ fontSize:"14px", fontWeight:700, margin:0 }}>Recipients ({filtered.length})</h3>
          <button onClick={toggleAll} style={{ all:"unset", cursor:"pointer", fontSize:"12px", fontWeight:600, color:"#1e3a5f" }}>{selected.size === filtered.length && filtered.length > 0 ? "Deselect all" : "Select all"}</button>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding:"30px", textAlign:"center", color:"#94a3b8", fontSize:"13px" }}>No providers match this filter.</div>
        ) : (
          <div style={{ maxHeight:"420px", overflowY:"auto", border:"1px solid #f1f5f9", borderRadius:"8px" }}>
            {filtered.slice(0, 500).map(p => (
              <label key={p.id} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"10px 14px", borderBottom:"1px solid #f1f5f9", cursor:"pointer", background: selected.has(p.id) ? "#eff6ff" : "transparent" }}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:"13px", fontWeight:600, color:"#0f172a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                  <div style={{ fontSize:"11px", color:"#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.email} · {p.category}</div>
                </div>
                {p.invited_at && <span style={{ fontSize:"10px", background:"#e0e7ff", color:"#4338ca", padding:"2px 8px", borderRadius:"999px", fontWeight:600 }}>Invited</span>}
                {p.claimed_at && <span style={{ fontSize:"10px", background:"#d1fae5", color:"#065f46", padding:"2px 8px", borderRadius:"999px", fontWeight:600 }}>✓ Claimed</span>}
              </label>
            ))}
            {filtered.length > 500 && <div style={{ padding:"12px", textAlign:"center", fontSize:"11px", color:"#94a3b8", fontStyle:"italic" }}>Showing first 500 of {filtered.length}. Refine filter to reach the rest.</div>}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Email Templates preview tab ───
function TemplatesTab({ setMsg }) {
  const [active, setActive] = useState('claim')
  const TEMPLATES = {
    claim: {
      name: 'Claim your listing',
      subject: 'Your practice is on ReferEasy, claim your free listing',
      description: 'For providers already in the directory but unclaimed. This is the workhorse invite.',
    },
    verified: {
      name: 'Upgrade to Verified',
      subject: "You're one step from Verified on ReferEasy",
      description: 'For claimed providers who haven\'t upgraded. Emphasizes the trust badge.',
    },
    featured: {
      name: 'Upgrade to Featured',
      subject: 'Get top placement on Ontario\'s referral platform',
      description: 'For Verified subscribers. Sells premium placement.',
    },
    cold: {
      name: 'Cold outreach',
      subject: 'Ontario physicians are using ReferEasy, join us',
      description: 'For providers not yet in the directory at all. Bigger ask, more explanation.',
    },
  }

  const card = { background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'20px' }

  return (
    <>
      <h2 style={{ fontSize:"18px", fontWeight:700, marginBottom:"6px" }}>Email templates</h2>
      <p style={{ fontSize:"13px", color:"#64748b", marginBottom:"20px" }}>Preview what recipients will see. Editing templates in-browser is planned for Session 3.</p>

      <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:"16px" }}>
        <div>
          {Object.entries(TEMPLATES).map(([k, t]) => (
            <button key={k} onClick={() => setActive(k)} style={{ all:"unset", cursor:"pointer", display:"block", width:"calc(100% - 16px)", padding:"12px 14px", marginBottom:"6px", borderRadius:"8px", background: active === k ? "#eff6ff" : "#ffffff", border:"1px solid " + (active === k ? "#1e3a5f" : "#e2e8f0"), borderLeft: active === k ? "3px solid #1e3a5f" : "1px solid #e2e8f0" }}>
              <div style={{ fontSize:"13px", fontWeight:600, color: active === k ? "#1e3a5f" : "#334155" }}>{t.name}</div>
              <div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"3px", lineHeight:1.4 }}>{t.description}</div>
            </button>
          ))}
        </div>
        <div style={card}>
          <div style={{ fontSize:"11px", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em" }}>Subject line</div>
          <div style={{ fontSize:"14px", fontWeight:600, color:"#0f172a", marginTop:"6px", marginBottom:"18px", padding:"10px 14px", background:"#f8fafc", borderRadius:"8px", border:"1px solid #e2e8f0" }}>{TEMPLATES[active].subject}</div>
          <div style={{ fontSize:"11px", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"6px" }}>Preview</div>
          <iframe src={`/api/outreach/preview?template=${active}`} style={{ width:"100%", height:"600px", border:"1px solid #e2e8f0", borderRadius:"8px", background:"#f8fafc" }} title="Preview" />
        </div>
      </div>
    </>
  )
}



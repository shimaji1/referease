'use client'
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

const CATS = ["clinic","specialist","hospital","imaging","lab","rehab"]
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"]

const empty = () => ({ name:"", type:"", category:"specialist", services:[], address:"", phone:"", fax:"", website:"", rating:null, reviews:0, lat:"", lng:"", hours:{mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null}, accepting_referrals:true, wait_weeks:null, requirements:"", doctors:[], languages:["English"] })

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState("")
  const [providers, setProviders] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty())
  const [search, setSearch] = useState("")
  const [msg, setMsg] = useState("")
  const [tab, setTab] = useState("list")

  const login = () => {
    if (pw === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) { setAuthed(true); setMsg("") }
    else setMsg("Wrong password")
  }

  const load = useCallback(async () => {
    const { data } = await supabase.from("providers").select("*").order("name")
    if (data) setProviders(data)
  }, [])

  useEffect(() => { if (authed) load() }, [authed, load])

  const save = async () => {
    const rec = {
      ...form,
      rating: form.rating ? parseFloat(form.rating) : null,
      reviews: parseInt(form.reviews) || 0,
      lat: parseFloat(form.lat) || 0,
      lng: parseFloat(form.lng) || 0,
      wait_weeks: form.wait_weeks !== "" && form.wait_weeks !== null ? parseInt(form.wait_weeks) : null,
    }
    delete rec.id; delete rec.created_at; delete rec.updated_at
    if (editing) {
      const { error } = await supabase.from("providers").update(rec).eq("id", editing)
      if (error) { setMsg("Error: " + error.message); return }
      setMsg("Updated!")
    } else {
      const { error } = await supabase.from("providers").insert(rec)
      if (error) { setMsg("Error: " + error.message); return }
      setMsg("Added!")
    }
    setEditing(null); setForm(empty()); setTab("list"); load()
  }

  const del = async (id) => {
    if (!confirm("Delete this provider?")) return
    await supabase.from("providers").delete().eq("id", id)
    setMsg("Deleted"); load()
  }

  const edit = (p) => {
    setForm({ ...p, rating: p.rating || "", reviews: p.reviews || 0, lat: p.lat || "", lng: p.lng || "", wait_weeks: p.wait_weeks ?? "", services: p.services || [], doctors: p.doctors || [], languages: p.languages || ["English"], hours: p.hours || {mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null} })
    setEditing(p.id); setTab("edit")
  }

  const s = { width:"100%", padding:"8px 10px", fontSize:"13px", background:"#1a1f2b", border:"1px solid #2a3040", borderRadius:"6px", color:"#e8ecf2", outline:"none", marginTop:"4px" }
  const lbl = { fontSize:"11px", fontWeight:600, color:"#7a8599", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginTop:"12px" }

  if (!authed) return (
    <div style={{ fontFamily:"Inter, sans-serif", background:"#0c0f14", color:"#e8ecf2", minHeight:"100vh", display:"flex", justifyContent:"center", alignItems:"center" }}>
      <div style={{ background:"#141820", border:"1px solid #1e2530", borderRadius:"14px", padding:"32px", width:"340px" }}>
        <h2 style={{ margin:"0 0 4px", fontSize:"18px" }}>🔐 ReferEase Admin</h2>
        <p style={{ margin:"0 0 20px", fontSize:"12px", color:"#7a8599" }}>Enter admin password</p>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==="Enter" && login()} placeholder="Password" style={s} />
        <button onClick={login} style={{ all:"unset", cursor:"pointer", display:"block", width:"100%", marginTop:"12px", padding:"10px", textAlign:"center", background:"#3b82f6", color:"#fff", borderRadius:"8px", fontSize:"13px", fontWeight:600 }}>Login</button>
        {msg && <p style={{ color:"#dc2626", fontSize:"12px", marginTop:"8px" }}>{msg}</p>}
      </div>
    </div>
  )

  const filtered = search ? providers.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.type.toLowerCase().includes(search.toLowerCase())) : providers

  return (
    <div style={{ fontFamily:"Inter, sans-serif", background:"#0c0f14", color:"#e8ecf2", minHeight:"100vh" }}>
      <div style={{ padding:"14px 20px", borderBottom:"1px solid #1e2530", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <h1 style={{ margin:0, fontSize:"18px", fontWeight:700 }}>🔗 Refer<span style={{ color:"#3b82f6" }}>Ease</span> <span style={{ color:"#7a8599", fontWeight:400 }}>Admin</span></h1>
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button onClick={() => { setTab("list"); setEditing(null); setForm(empty()) }} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:tab==="list"?"#3b82f6":"#141820", color:tab==="list"?"#fff":"#7a8599", border:"1px solid " + (tab==="list"?"#3b82f6":"#1e2530") }}>Providers ({providers.length})</button>
          <button onClick={() => { setTab("edit"); setEditing(null); setForm(empty()) }} style={{ all:"unset", cursor:"pointer", padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:tab==="edit"&&!editing?"#059669":"#141820", color:tab==="edit"&&!editing?"#fff":"#7a8599", border:"1px solid " + (tab==="edit"&&!editing?"#059669":"#1e2530") }}>+ Add New</button>
          <a href="/" style={{ padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, background:"#141820", color:"#7a8599", border:"1px solid #1e2530", textDecoration:"none" }}>← View Site</a>
        </div>
      </div>
      {msg && <div style={{ padding:"8px 20px", background:"#059669" + "20", color:"#059669", fontSize:"12px", fontWeight:600 }}>{msg}</div>}

      <div style={{ maxWidth:"960px", margin:"0 auto", padding:"16px 20px" }}>
        {tab === "list" ? (
          <>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search providers..." style={{ ...s, marginBottom:"14px" }} />
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {filtered.map(p => (
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#141820", border:"1px solid #1e2530", borderRadius:"8px", padding:"10px 14px" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"13px", fontWeight:600 }}>{p.name}</div>
                    <div style={{ fontSize:"11px", color:"#7a8599" }}>{p.type} · {p.category} · {p.accepting_referrals ? "✓ Accepting" : "✕ Not accepting"}{p.wait_weeks !== null ? ` · ~${p.wait_weeks}wk wait` : ""}</div>
                  </div>
                  <div style={{ display:"flex", gap:"6px" }}>
                    <button onClick={() => edit(p)} style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#3b82f620", color:"#3b82f6", border:"1px solid #3b82f640" }}>Edit</button>
                    <button onClick={() => del(p.id)} style={{ all:"unset", cursor:"pointer", padding:"4px 10px", fontSize:"11px", fontWeight:600, borderRadius:"6px", background:"#dc262620", color:"#dc2626", border:"1px solid #dc262640" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ background:"#141820", border:"1px solid #1e2530", borderRadius:"12px", padding:"20px" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:"16px" }}>{editing ? "Edit Provider" : "Add New Provider"}</h3>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
              <div><label style={lbl}>Name *</label><input style={s} value={form.name} onChange={e => setForm({...form, name:e.target.value})} /></div>
              <div><label style={lbl}>Type / Specialty *</label><input style={s} value={form.type} onChange={e => setForm({...form, type:e.target.value})} placeholder="e.g. Cardiology" /></div>
              <div><label style={lbl}>Category *</label><select style={s} value={form.category} onChange={e => setForm({...form, category:e.target.value})}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label style={lbl}>Address</label><input style={s} value={form.address} onChange={e => setForm({...form, address:e.target.value})} /></div>
              <div><label style={lbl}>Phone</label><input style={s} value={form.phone || ""} onChange={e => setForm({...form, phone:e.target.value || null})} /></div>
              <div><label style={lbl}>Fax</label><input style={s} value={form.fax || ""} onChange={e => setForm({...form, fax:e.target.value || null})} /></div>
              <div><label style={lbl}>Website</label><input style={s} value={form.website || ""} onChange={e => setForm({...form, website:e.target.value || null})} /></div>
              <div><label style={lbl}>Rating (0-5)</label><input style={s} type="number" step="0.1" min="0" max="5" value={form.rating || ""} onChange={e => setForm({...form, rating:e.target.value})} /></div>
              <div><label style={lbl}>Reviews Count</label><input style={s} type="number" value={form.reviews} onChange={e => setForm({...form, reviews:e.target.value})} /></div>
              <div><label style={lbl}>Latitude</label><input style={s} type="number" step="0.0001" value={form.lat} onChange={e => setForm({...form, lat:e.target.value})} /></div>
              <div><label style={lbl}>Longitude</label><input style={s} type="number" step="0.0001" value={form.lng} onChange={e => setForm({...form, lng:e.target.value})} /></div>
              <div><label style={lbl}>Wait (weeks)</label><input style={s} type="number" min="0" value={form.wait_weeks ?? ""} onChange={e => setForm({...form, wait_weeks:e.target.value})} placeholder="Leave blank if varies" /></div>
            </div>

            <label style={lbl}>Requirements</label>
            <textarea style={{ ...s, minHeight:"60px", resize:"vertical" }} value={form.requirements} onChange={e => setForm({...form, requirements:e.target.value})} placeholder="e.g. GP referral required, recent MRI" />

            <label style={lbl}>Services (comma-separated)</label>
            <input style={s} value={(form.services||[]).join(", ")} onChange={e => setForm({...form, services:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})} placeholder="ECG, Stress Test, Holter Monitor" />

            <label style={lbl}>Doctors (comma-separated)</label>
            <input style={s} value={(form.doctors||[]).join(", ")} onChange={e => setForm({...form, doctors:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})} placeholder="Dr. Smith, Dr. Jones" />

            <label style={lbl}>Languages (comma-separated)</label>
            <input style={s} value={(form.languages||[]).join(", ")} onChange={e => setForm({...form, languages:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})} placeholder="English, French, Farsi" />

            <label style={lbl}>Hours</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(120px, 1fr))", gap:"6px", marginTop:"6px" }}>
              {DAYS.map(d => (
                <div key={d}>
                  <span style={{ fontSize:"11px", color:"#7a8599", textTransform:"capitalize" }}>{d}</span>
                  <input style={{ ...s, padding:"5px 8px", fontSize:"12px" }} value={form.hours[d] || ""} onChange={e => setForm({...form, hours:{...form.hours, [d]:e.target.value || null}})} placeholder="9:00-17:00" />
                </div>
              ))}
            </div>

            <div style={{ marginTop:"14px" }}>
              <label style={{ ...chk_s(), cursor:"pointer" }}><input type="checkbox" checked={form.accepting_referrals} onChange={e => setForm({...form, accepting_referrals:e.target.checked})} style={{ accentColor:"#3b82f6" }} /> <span style={{ fontSize:"12px", color:"#e8ecf2" }}>Accepting Referrals</span></label>
            </div>

            <div style={{ display:"flex", gap:"10px", marginTop:"20px" }}>
              <button onClick={save} style={{ all:"unset", cursor:"pointer", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:600, background:"#3b82f6", color:"#fff" }}>{editing ? "Save Changes" : "Add Provider"}</button>
              <button onClick={() => { setTab("list"); setEditing(null); setForm(empty()) }} style={{ all:"unset", cursor:"pointer", padding:"10px 24px", borderRadius:"8px", fontSize:"13px", fontWeight:600, background:"#1e2530", color:"#7a8599" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function chk_s() { return { display:"flex", alignItems:"center", gap:"6px" } }

'use client'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function FavouritesSection() {
  const [favProviders, setFavProviders] = useState([])
  const [favDoctors, setFavDoctors] = useState([])
  useEffect(() => {
    let alive = true
    try {
      const pids = JSON.parse(localStorage.getItem('re-favs') || '[]')
      const dids = JSON.parse(localStorage.getItem('re-favs-docs') || '[]')
      if (supabase && pids.length) supabase.from('providers').select('id, name, type, address, accepting_referrals').in('id', pids).then(({ data }) => { if (alive && data) setFavProviders(data) })
      if (supabase && dids.length) supabase.from('physicians').select('id, name, specialty, accepting_referrals').in('id', dids).then(({ data }) => { if (alive && data) setFavDoctors(data) })
    } catch {}
    return () => { alive = false }
  }, [])

  const total = favProviders.length + favDoctors.length
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">My Favourites</h2>
        <Link href="/search" className="text-sm font-semibold text-brand hover:underline">Search →</Link>
      </div>
      {total === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="text-3xl mb-3">☆</div>
          <p className="font-semibold text-gray-700 mb-1">No favourites yet</p>
          <p className="text-sm text-gray-500 mb-4">Star clinics and doctors you work with to keep them handy here.</p>
          <Link href="/search" className="inline-flex px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition">Search</Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {favDoctors.map(d => (
            <Link key={'d' + d.id} href={`/doctors/${d.id}`} className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-brand/30 hover:shadow-sm transition">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="text-[9px] font-bold text-brand bg-brand/10 px-1.5 py-0.5 rounded-full border border-brand/15">DOCTOR</span><span className="font-semibold text-sm text-gray-900 truncate">{d.name}</span></div>
                  <div className="text-xs text-brand/70 font-medium mt-0.5">{d.specialty || 'Physician'}</div>
                </div>
                {d.accepting_referrals
                  ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">Accepting</span>
                  : <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 shrink-0">Not accepting</span>}
              </div>
            </Link>
          ))}
          {favProviders.map(p => (
            <Link key={'p' + p.id} href={`/search?id=${p.id}`} className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-brand/30 hover:shadow-sm transition">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-gray-900 truncate">{p.name}</div>
                  <div className="text-xs text-brand/70 font-medium">{p.type}</div>
                  {p.address && <div className="text-xs text-gray-500 mt-0.5 truncate">📍 {p.address}</div>}
                </div>
                {p.accepting_referrals
                  ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">Accepting</span>
                  : <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 shrink-0">Not accepting</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function PhysicianDashboard({ profile }) {
  const [favs, setFavs] = useState([])
  const [favProviders, setFavProviders] = useState([])

  useEffect(() => { try { const s = localStorage.getItem('re-favs'); if (s) setFavs(JSON.parse(s)) } catch {} }, [])
  useEffect(() => {
    if (!supabase || !favs.length) return
    supabase.from('providers').select('*').in('id', favs).then(({ data }) => { if (data) setFavProviders(data) })
  }, [favs])

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Favourites</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{favs.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Referrals Sent</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">0</div>
          <div className="text-xs text-gray-400 mt-1">Coming soon</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</div>
          <div className="text-sm font-semibold text-gray-900 mt-2">{profile.full_name}</div>
          <div className="text-xs text-gray-500">{profile.email}</div>
        </div>
      </div>
      <FavouritesSection />
    </div>
  )
}

function SpecialistDashboard({ profile, user }) {
  const [providers, setProviders] = useState([])
  const [myDocs, setMyDocs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!supabase) return
    const [prov, docs] = await Promise.all([
      supabase.from('providers').select('*').eq('owner_id', user.id).order('name'),
      supabase.from('physicians').select('*').eq('owner_id', user.id).order('name'),
    ])
    if (prov.data) setProviders(prov.data)
    if (docs.data) setMyDocs(docs.data)
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My Listings</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{providers.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Accepting</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">{providers.filter(p => p.accepting_referrals).length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</div>
          <div className="text-sm font-semibold text-gray-900 mt-2">{profile.full_name}</div>
          <div className="text-xs text-gray-500">{profile.email}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-gray-900">My Provider Listings</h2>
        <div className="flex gap-2">
          <Link href="/dashboard/physician/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-brand border border-brand/20 text-sm font-semibold rounded-lg hover:bg-brand/5 transition">
            + List as Doctor
          </Link>
          <Link href="/dashboard/provider/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-dark transition">
            + Add New Listing
          </Link>
        </div>
      </div>

      {providers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="text-3xl mb-3">⚕️</div>
          <p className="font-semibold text-gray-700 mb-1">No listings linked to your account</p>
          <p className="text-sm text-gray-500 mb-5">Already in our database? Claim your existing listing. Or create a new one from scratch.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/claim" className="inline-flex px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition">Claim Existing Listing</Link>
            <Link href="/dashboard/provider/new" className="inline-flex px-5 py-2.5 bg-white text-brand text-sm font-semibold rounded-xl border border-brand/20 hover:bg-brand/5 transition">Create New Listing</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{p.name}</h3>
                  <p className="text-xs text-brand/70 font-medium">{p.type}</p>
                  <p className="text-xs text-gray-500 mt-1">📍 {p.address}</p>
                  {p.phone && <p className="text-xs text-gray-500">📞 {p.phone} {p.fax ? `· 📠 ${p.fax}` : ''}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {p.verified
                    ? <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">✓ Verified</span>
                    : <Link href={`/dashboard/verify?provider_id=${p.id}`} className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition">Verify</Link>
                  }
                  <Link href={`/dashboard/provider/${p.id}`} className="text-xs font-semibold text-brand bg-brand/5 border border-brand/10 px-3 py-1.5 rounded-lg hover:bg-brand/10 transition">Edit</Link>
                  <Link href={`/dashboard/provider/${p.id}/preview`} className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">Preview</Link>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {p.accepting_referrals
                  ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">Accepting</span>
                  : <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">Not Accepting</span>}
                {p.wait_weeks !== null && (
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${p.wait_weeks === 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : p.wait_weeks <= 4 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                    {p.wait_weeks === 0 ? 'No wait' : `~${p.wait_weeks} wk wait`}
                  </span>
                )}
                {p.rating && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">★ {Number(p.rating).toFixed(1)}</span>}
                <span className="text-[10px] text-gray-400 px-2.5 py-1">{(p.services || []).length} services · {(p.doctors || []).length} doctors</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {myDocs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">My Doctor Profiles</h2>
          <div className="space-y-3">
            {myDocs.map(d => (
              <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{d.name}</h3>
                    <p className="text-xs text-brand/70 font-medium">{d.specialty || 'Physician'}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {d.accepting_referrals
                        ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">Accepting referrals</span>
                        : <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">Not accepting</span>}
                      {d.accepting_new_patients && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">New patients</span>}
                      {d.wait_weeks != null && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">~{d.wait_weeks} wk wait</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/dashboard/physician/${d.id}`} className="text-xs font-semibold text-brand bg-brand/5 border border-brand/10 px-3 py-1.5 rounded-lg hover:bg-brand/10 transition">Edit</Link>
                    <Link href={`/doctors/${d.id}`} className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">View</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <FavouritesSection />
    </div>
  )
}

export default function DashboardPage() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => { if (!loading && !user) router.push('/login') }, [loading, user, router])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!user || !profile) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">R</span></div>
            <span className="text-lg font-bold text-gray-900">Refer<span className="text-[#2563eb]">Easy</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-gray-900">{profile.full_name}</div>
              <div className="text-[10px] text-gray-500 capitalize">{profile.role}</div>
            </div>
            <Link href="/search" className="text-xs font-medium text-gray-500 hover:text-brand px-3 py-1.5 border border-gray-200 rounded-lg transition">Search</Link>
            <button onClick={() => { signOut(); router.push('/') }} className="text-xs font-medium text-gray-500 hover:text-red-600 px-3 py-1.5 border border-gray-200 rounded-lg transition">Sign Out</button>
          </div>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">{profile.role === 'physician' ? '🩺 Physician' : '⚕️ Specialist'} Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back, {profile.full_name?.split(' ')[0]}</p>
        </div>
        {profile.role === 'physician' && <PhysicianDashboard profile={profile} />}
        {profile.role === 'specialist' && <SpecialistDashboard profile={profile} user={user} />}
      </div>
    </div>
  )
}

'use client'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function PhysicianDashboard({ profile, signOut }) {
  const [favs, setFavs] = useState([])
  const [favProviders, setFavProviders] = useState([])

  useEffect(() => {
    try { const s = localStorage.getItem('re-favs'); if (s) setFavs(JSON.parse(s)) } catch {}
  }, [])

  useEffect(() => {
    if (!supabase || !favs.length) return
    const load = async () => {
      const { data } = await supabase.from('providers').select('*').in('id', favs)
      if (data) setFavProviders(data)
    }
    load()
  }, [favs])

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Favourites</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{favs.length}</div>
          <div className="text-xs text-gray-500 mt-1">Saved providers</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Referrals Sent</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">0</div>
          <div className="text-xs text-gray-500 mt-1">Coming soon</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</div>
          <div className="text-sm font-semibold text-gray-900 mt-2">{profile.full_name}</div>
          <div className="text-xs text-gray-500">{profile.email}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">My Favourite Providers</h2>
        <Link href="/search" className="text-sm font-semibold text-brand hover:underline">Search providers →</Link>
      </div>

      {favProviders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="text-3xl mb-3">☆</div>
          <p className="font-semibold text-gray-700 mb-1">No favourites yet</p>
          <p className="text-sm text-gray-500 mb-4">Start searching and save your preferred specialists for quick access.</p>
          <Link href="/search" className="inline-flex px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition">Search Providers</Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {favProviders.map(p => (
            <Link href={`/search?id=${p.id}`} key={p.id} className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-brand/30 hover:shadow-sm transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-gray-900">{p.name}</div>
                  <div className="text-xs text-brand/70 font-medium">{p.type}</div>
                  <div className="text-xs text-gray-500 mt-1">📍 {p.address}</div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  {p.accepting_referrals
                    ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Accepting</span>
                    : <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Not Accepting</span>}
                  {p.wait_weeks !== null && <div className="text-[10px] text-gray-400 mt-1">{p.wait_weeks === 0 ? 'No wait' : `~${p.wait_weeks} wk wait`}</div>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function SpecialistDashboard({ profile, signOut }) {
  const [myProviders, setMyProviders] = useState([])
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    if (!supabase) return
    const load = async () => {
      const { data } = await supabase.from('providers').select('*').order('name')
      if (data) setMyProviders(data.filter(p => (p.doctors || []).some(d => d.toLowerCase().includes(profile.full_name?.toLowerCase()?.split(' ').pop() || '---'))))
    }
    load()
  }, [profile])

  const updateProvider = async (id, updates) => {
    if (!supabase) return
    const { error } = await supabase.from('providers').update(updates).eq('id', id)
    if (!error) {
      setMyProviders(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
      setEditing(null)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My Listings</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{myProviders.length}</div>
          <div className="text-xs text-gray-500 mt-1">Provider profiles</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Referrals Received</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">0</div>
          <div className="text-xs text-gray-500 mt-1">Coming soon</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</div>
          <div className="text-sm font-semibold text-gray-900 mt-2">{profile.full_name}</div>
          <div className="text-xs text-gray-500">{profile.email}</div>
        </div>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-4">My Provider Profiles</h2>

      {myProviders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="text-3xl mb-3">⚕️</div>
          <p className="font-semibold text-gray-700 mb-1">No listings linked to your account yet</p>
          <p className="text-sm text-gray-500 mb-4">Contact admin to claim your existing listing, or we'll match you automatically based on your name.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myProviders.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-xs text-brand/70 font-medium">{p.type}</p>
                  <p className="text-xs text-gray-500 mt-1">📍 {p.address}</p>
                </div>
                <button onClick={() => setEditing(editing === p.id ? null : p.id)}
                  className="text-xs font-semibold text-brand bg-brand/5 border border-brand/10 px-3 py-1.5 rounded-lg hover:bg-brand/10 transition shrink-0">
                  {editing === p.id ? 'Close' : 'Quick Edit'}
                </button>
              </div>

              <div className="flex gap-2 mt-3">
                {p.accepting_referrals
                  ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">Accepting Referrals</span>
                  : <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">Not Accepting</span>}
                {p.wait_weeks !== null && (
                  <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
                    {p.wait_weeks === 0 ? 'No wait' : `~${p.wait_weeks} wk wait`}
                  </span>
                )}
              </div>

              {editing === p.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Wait Time (weeks)</label>
                      <input type="number" min="0" defaultValue={p.wait_weeks ?? ''} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand"
                        onBlur={e => { const v = e.target.value === '' ? null : parseInt(e.target.value); if (v !== p.wait_weeks) updateProvider(p.id, { wait_weeks: v }) }} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Accepting Referrals</label>
                      <select defaultValue={p.accepting_referrals ? 'true' : 'false'} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand"
                        onChange={e => updateProvider(p.id, { accepting_referrals: e.target.value === 'true' })}>
                        <option value="true">Yes — Accepting</option>
                        <option value="false">No — Not Accepting</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</label>
                      <input type="text" defaultValue={p.phone || ''} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand"
                        onBlur={e => { if (e.target.value !== (p.phone || '')) updateProvider(p.id, { phone: e.target.value || null }) }} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Referral Requirements</label>
                    <textarea defaultValue={p.requirements || ''} rows={2} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand resize-none"
                      onBlur={e => { if (e.target.value !== (p.requirements || '')) updateProvider(p.id, { requirements: e.target.value }) }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">Changes save automatically. For full profile editing, contact admin.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user || !profile) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">R</span></div>
            <span className="text-lg font-bold text-gray-900">Refer<span className="text-brand">Ease</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-gray-900">{profile.full_name}</div>
              <div className="text-[10px] text-gray-500 capitalize">{profile.role}</div>
            </div>
            <div className="flex gap-2">
              <Link href="/search" className="text-xs font-medium text-gray-500 hover:text-brand px-3 py-1.5 border border-gray-200 rounded-lg transition">Search</Link>
              <button onClick={() => { signOut(); router.push('/') }} className="text-xs font-medium text-gray-500 hover:text-red-600 px-3 py-1.5 border border-gray-200 rounded-lg transition">Sign Out</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            {profile.role === 'physician' ? '🩺' : '⚕️'} {profile.role === 'physician' ? 'Physician' : 'Specialist'} Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back, {profile.full_name?.split(' ')[0]}</p>
        </div>

        {profile.role === 'physician' && <PhysicianDashboard profile={profile} signOut={signOut} />}
        {profile.role === 'specialist' && <SpecialistDashboard profile={profile} signOut={signOut} />}
      </div>
    </div>
  )
}

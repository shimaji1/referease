'use client'
import { useAuth } from '@/context/AuthContext'
import Logo from '@/components/Logo'
import { VerifiedPill } from '@/components/Badges'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { fetchLists, fetchListItems, createList, removeFromList, deleteList } from '@/lib/favourites'
import { fetchStaffProviderIds } from '@/lib/staff'
import { can } from '@/lib/plan'
import { waitDaysApprox, waitShort } from '@/lib/waitTime'
import ConfirmModal from '@/components/ConfirmModal'

function ListsSection({ user }) {
  const [lists, setLists] = useState([])
  const [itemsByList, setItemsByList] = useState({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null) // { id, name }

  const load = useCallback(async () => {
    const ls = await fetchLists(user.id)
    setLists(ls)
    const entries = await Promise.all(ls.map(async l => [l.id, await fetchListItems(l.id)]))
    setItemsByList(Object.fromEntries(entries))
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const list = await createList(user.id, newName.trim())
    if (list) { setNewName(''); setCreating(false); load() }
  }

  const handleRemove = async (listId, providerId) => {
    await removeFromList(listId, providerId)
    load()
  }

  const handleDeleteList = async () => {
    await deleteList(pendingDelete.id)
    setPendingDelete(null)
    load()
  }

  if (loading) return <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">My Lists</h2>
        <div className="flex items-center gap-2">
          {creating ? (
            <div className="flex gap-2">
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="List name" className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand" />
              <button onClick={handleCreate} disabled={!newName.trim()} className="px-3 py-1.5 bg-brand text-white text-xs font-semibold rounded-lg disabled:opacity-50">Add</button>
              <button onClick={() => { setCreating(false); setNewName('') }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setCreating(true)} className="text-sm font-semibold text-brand hover:underline">+ New list</button>
          )}
        </div>
      </div>

      {lists.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="text-3xl mb-3">☆</div>
          <p className="font-semibold text-gray-700 mb-1">No lists yet</p>
          <p className="text-sm text-gray-500 mb-4">Star a provider or doctor on search to start your first list.</p>
          <Link href="/search" className="inline-flex px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition">Search</Link>
        </div>
      ) : (
        <div className="space-y-5">
          {lists.map(l => {
            const items = itemsByList[l.id] || []
            return (
              <div key={l.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">{l.name} <span className="text-gray-400 font-normal">({items.length})</span></h3>
                  {!l.is_default && <button onClick={() => setPendingDelete({ id: l.id, name: l.name })} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete list</button>}
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400">Nothing saved here yet.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-3 border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                        <Link href={`/search?id=${p.id}`} className="min-w-0 group">
                          <div className="font-semibold text-sm text-gray-900 group-hover:text-brand truncate">{p.name}</div>
                          <div className="text-xs text-brand/70 font-medium truncate">{p.type}</div>
                        </Link>
                        <div className="flex items-center gap-2 shrink-0">
                          {p.accepting_referrals
                            ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Accepting</span>
                            : <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Not accepting</span>}
                          <button onClick={() => handleRemove(l.id, p.id)} title="Remove from list" className="text-gray-300 hover:text-red-500 text-sm">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <ConfirmModal
        open={!!pendingDelete}
        title="Delete this list?"
        message={pendingDelete ? `Delete "${pendingDelete.name}"? This removes it and its saved items.` : ''}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteList}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

function UserDashboard({ profile, user }) {
  const [listCount, setListCount] = useState(0)
  const [savedCount, setSavedCount] = useState(0)
  useEffect(() => {
    fetchLists(user.id).then(async ls => {
      setListCount(ls.length)
      const totals = await Promise.all(ls.map(l => fetchListItems(l.id)))
      setSavedCount(totals.reduce((sum, items) => sum + items.length, 0))
    })
  }, [user.id])

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Saved</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{savedCount}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lists</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{listCount}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</div>
          <div className="text-sm font-semibold text-gray-900 mt-2">{profile.full_name}</div>
          <div className="text-xs text-gray-500">{profile.email}</div>
        </div>
      </div>
      <ListsSection user={user} />
    </div>
  )
}

function ProviderDashboard({ profile, user }) {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!supabase) return
    const staffIds = await fetchStaffProviderIds(user.id)
    const orFilter = staffIds.length ? `owner_id.eq.${user.id},id.in.(${staffIds.join(',')})` : `owner_id.eq.${user.id}`
    const { data } = await supabase.from('providers').select('*').or(orFilter).order('name')
    if (data) setProviders(data)
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
        <h2 className="text-lg font-bold text-gray-900">My Listings</h2>
        <div className="flex items-center gap-3">
          <Link href="/pricing" className="text-xs font-medium text-gray-500 hover:text-brand">Plan limits →</Link>
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
                    ? <VerifiedPill />
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
                {p.wait_type && (
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${waitDaysApprox(p.wait_type, p.wait_weeks) === 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : waitDaysApprox(p.wait_type, p.wait_weeks) <= 28 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                    {waitShort(p.wait_type, p.wait_weeks)} wait
                  </span>
                )}
                {p.rating && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">★ {Number(p.rating).toFixed(1)}</span>}
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${p.data_status === 'complete' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>{p.data_status === 'complete' ? 'Listed publicly' : 'Not listed — incomplete'}</span>
                <span className="text-[10px] text-gray-400 px-2.5 py-1">{(p.services || []).length} services · {(p.doctors || []).length} doctors</span>
                {can(p, 'analytics_full')
                  ? <Link href={`/dashboard/analytics/${p.id}`} className="text-[10px] font-semibold text-brand bg-brand/5 px-2.5 py-1 rounded-full border border-brand/10 hover:bg-brand/10 transition">📊 Full analytics →</Link>
                  : can(p, 'analytics_basic')
                  ? <span className="text-[10px] font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">👁 {p.view_count || 0} view{p.view_count === 1 ? '' : 's'}</span>
                  : <Link href="/pricing" className="text-[10px] font-semibold text-brand bg-brand/5 px-2.5 py-1 rounded-full border border-brand/10 hover:bg-brand/10 transition">Upgrade to see views →</Link>}
              </div>
            </div>
          ))}
        </div>
      )}

      <ListsSection user={user} />
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
          <Logo />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-gray-900">{profile.full_name}</div>
              <div className="text-[10px] text-gray-500 capitalize">{profile.role}</div>
            </div>
            <Link href="/search" className="text-xs font-medium text-gray-500 hover:text-brand px-3 py-1.5 border border-gray-200 rounded-lg transition">Search</Link>
            <Link href="/dashboard/settings" className="text-xs font-medium text-gray-500 hover:text-brand px-3 py-1.5 border border-gray-200 rounded-lg transition">Settings</Link>
            <button onClick={() => { signOut(); router.push('/') }} className="text-xs font-medium text-gray-500 hover:text-red-600 px-3 py-1.5 border border-gray-200 rounded-lg transition">Sign Out</button>
          </div>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">{profile.role === 'provider' ? '⚕️ Provider' : '🔎 User'} Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back, {profile.full_name?.split(' ')[0]}</p>
        </div>
        {profile.role === 'user' && <UserDashboard profile={profile} user={user} />}
        {profile.role === 'provider' && <ProviderDashboard profile={profile} user={user} />}
      </div>
    </div>
  )
}

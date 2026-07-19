'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ClaimPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [myClaims, setMyClaims] = useState([])
  const [claimingId, setClaimingId] = useState(null)
  const [msg, setMsg] = useState('')

  // Load user's existing claims
  useEffect(() => {
    if (!supabase || !user) return
    supabase.from('claims').select('*, providers(name, type, address)').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setMyClaims(data) })
  }, [user])

  const handleSearch = async () => {
    if (!supabase || !search.trim()) return
    setSearching(true)
    setResults([])

    const q = search.trim()
    let query = supabase.from('providers').select('*').is('owner_id', null)

    // Search by name, phone, fax, or practitioner number
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,fax.ilike.%${q}%,practitioner_number.eq.${q},address.ilike.%${q}%`)
    query = query.limit(20)

    const { data } = await query
    setResults(data || [])
    setSearching(false)
  }

  const handleClaim = async (provider) => {
    if (!supabase || !user || !profile) return
    setClaimingId(provider.id)
    setMsg('')

    // Check if already claimed by this user
    const { data: existing } = await supabase.from('claims').select('id').eq('user_id', user.id).eq('provider_id', provider.id)
    if (existing && existing.length > 0) {
      setMsg('You have already submitted a claim for this listing.')
      setClaimingId(null)
      return
    }

    // Check for auto-approve: practitioner number match
    let autoApprove = false
    if (profile.cpso_number && provider.practitioner_number) {
      const cleanCpso = profile.cpso_number.replace(/\D/g, '')
      const cleanPrac = provider.practitioner_number.replace(/\D/g, '')
      if (cleanCpso && cleanPrac && cleanCpso === cleanPrac) {
        autoApprove = true
      }
    }

    // Create the claim
    const { error } = await supabase.from('claims').insert({
      user_id: user.id,
      provider_id: provider.id,
      user_email: profile.email,
      user_name: profile.full_name,
      status: autoApprove ? 'approved' : 'pending',
      verification_method: autoApprove ? 'practitioner_number_match' : 'manual_review',
    })

    if (error) {
      setMsg('Error: ' + error.message)
      setClaimingId(null)
      return
    }

    // If auto-approved, link owner immediately
    if (autoApprove) {
      await supabase.from('providers').update({ owner_id: user.id }).eq('id', provider.id)
      setMsg('Verified! Your practitioner number matched. Listing is now linked to your account.')
    } else {
      setMsg('Claim submitted! Our admin team will review and verify your identity. You\'ll get access once approved.')
    }

    // Refresh claims
    const { data: claims } = await supabase.from('claims').select('*, providers(name, type, address)').eq('user_id', user.id).order('created_at', { ascending: false })
    if (claims) setMyClaims(claims)

    setClaimingId(null)
    setResults([])
    setSearch('')
  }

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!user || profile?.role !== 'specialist') { router.push('/dashboard'); return null }

  const inp = "w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"
  const statusColors = { pending: 'text-amber-700 bg-amber-50 border-amber-200', approved: 'text-emerald-700 bg-emerald-50 border-emerald-200', rejected: 'text-red-600 bg-red-50 border-red-200' }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">R</span></div>
            <span className="text-lg font-bold text-gray-900">Refer<span className="text-brand">Easy</span></span>
          </Link>
          <Link href="/dashboard" className="text-xs font-medium text-gray-500 hover:text-brand">← Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Claim Your Listing</h1>
        <p className="text-sm text-gray-500 mb-6">Search for your practice or clinic in our database. Once verified, you'll be able to manage your profile, update availability, and receive referrals.</p>

        {/* Search */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Search by name, phone, fax, or practitioner number</label>
          <div className="flex gap-2">
            <input className={inp} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="e.g. York Dermatology, 905-883-7997, 026762" />
            <button onClick={handleSearch} disabled={searching || !search.trim()} className="px-5 py-3 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 shrink-0">
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {msg && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${msg.includes('Error') ? 'bg-red-50 text-red-700 border-red-200' : msg.includes('Verified') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
            {msg}
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Found {results.length} listing{results.length !== 1 ? 's' : ''}</h2>
            <div className="space-y-2">
              {results.map(p => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate">{p.name}</div>
                    <div className="text-xs text-brand/70 font-medium">{p.type}</div>
                    {p.address && <div className="text-xs text-gray-500 mt-0.5">📍 {p.address}</div>}
                    <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                      {p.phone && <span>📞 {p.phone}</span>}
                      {p.fax && <span>📠 {p.fax}</span>}
                      {p.practitioner_number && <span>ID: {p.practitioner_number}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleClaim(p)} disabled={claimingId === p.id}
                    className="px-4 py-2 bg-brand text-white text-xs font-semibold rounded-lg hover:bg-brand-dark transition disabled:opacity-50 shrink-0">
                    {claimingId === p.id ? 'Claiming...' : 'Claim This'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.length === 0 && search && !searching && (
          <div className="mb-6 bg-white border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-500 mb-3">No unclaimed listings found for "{search}"</p>
            <p className="text-xs text-gray-400">Your listing might already be claimed, or it may not be in our database yet.</p>
            <Link href="/dashboard/provider/new" className="inline-flex mt-3 px-4 py-2 bg-brand text-white text-xs font-semibold rounded-lg hover:bg-brand-dark transition">Create New Listing Instead</Link>
          </div>
        )}

        {/* My Claims */}
        {myClaims.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3">My Claims</h2>
            <div className="space-y-2">
              {myClaims.map(c => (
                <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate">{c.providers?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{c.providers?.type} · {c.providers?.address}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Claimed {new Date(c.created_at).toLocaleDateString()} · {c.verification_method === 'practitioner_number_match' ? 'Auto-verified' : 'Manual review'}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 capitalize ${statusColors[c.status]}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help text */}
        <div className="mt-8 bg-gray-100 rounded-xl p-5 text-xs text-gray-500 leading-relaxed">
          <p className="font-semibold text-gray-700 mb-2">How verification works</p>
          <p className="mb-2">If your CPSO/practitioner number matches the record, your claim is approved instantly and you get immediate access to manage your listing.</p>
          <p>Otherwise, our team will review your claim within 1-2 business days. We may contact you at the email or phone on file to confirm your identity.</p>
        </div>
      </div>
    </div>
  )
}

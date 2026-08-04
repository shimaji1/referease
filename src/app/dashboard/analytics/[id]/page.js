'use client'
import { useState, useEffect, use } from 'react'
import Logo from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { can } from '@/lib/plan'
import { fetchAnalyticsSummary } from '@/lib/analytics'
import TrendChart from '@/components/TrendChart'

const CONTACT_LABELS = { click_phone: 'Phone', click_fax: 'Fax', click_email: 'Email', click_address: 'Address / Map', click_website: 'Website' }

function StatCard({ label, value, change, icon }) {
  const positive = change > 0
  const negative = change < 0
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">{icon} {label}</div>
      <div className="text-3xl font-bold text-gray-900 mt-1">{value}</div>
      {change !== undefined && (
        <div className={`text-xs font-semibold mt-1 ${positive ? 'text-emerald-600' : negative ? 'text-red-500' : 'text-gray-400'}`}>
          {positive ? '↑' : negative ? '↓' : '·'} {Math.abs(change)}% vs prior 30 days
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPage({ params }) {
  const { id } = use(params)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [provider, setProvider] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !id) return
    supabase.from('providers').select('*').eq('id', id).single().then(async ({ data }) => {
      if (data) {
        setProvider(data)
        setSummary(await fetchAnalyticsSummary(data.id))
      }
      setLoading(false)
    })
  }, [id])

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!user) { router.push('/login'); return null }
  if (!provider) return null

  const isFeatured = can(provider, 'analytics_full')
  const maxContact = Math.max(1, ...(summary?.contactBreakdown || []).map(c => c.count))

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Logo />
          <Link href="/dashboard" className="text-xs font-medium text-gray-500 hover:text-brand px-3 py-1.5 border border-gray-200 rounded-lg transition">← Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5 mb-6">{provider.name} · last 30 days</p>

        {!isFeatured ? (
          <div className="bg-white border-2 border-brand/20 rounded-2xl p-8 text-center">
            <div className="text-3xl mb-3">📊</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Full analytics is a Featured feature</h2>
            <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">Search impressions, favourites, contact clicks, form downloads, and trend charts — upgrade to Featured to unlock the full picture of how referring physicians find and engage with your listing.</p>
            <Link href="/pricing" className="inline-flex px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition">See plans →</Link>
          </div>
        ) : !summary ? (
          <p className="text-sm text-gray-400">No data yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <StatCard icon="👁" label="Views" value={summary.counts.view} change={summary.changes.view} />
              <StatCard icon="🔎" label="Search Appearances" value={summary.counts.impression} change={summary.changes.impression} />
              <StatCard icon="★" label="Favourited" value={summary.counts.favourite} change={summary.changes.favourite} />
              <StatCard icon="📞" label="Contact Clicks" value={summary.contactClicks} change={summary.changes.contactClicks} />
              <StatCard icon="📄" label="Form Downloads" value={summary.counts.form_download} change={summary.changes.form_download} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Views, last 30 days</h3>
                <TrendChart data={summary.dailySeries} />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Contact clicks by type</h3>
                {summary.contactClicks === 0 ? (
                  <p className="text-sm text-gray-400">No contact clicks yet.</p>
                ) : (
                  <div className="space-y-3">
                    {summary.contactBreakdown.filter(c => c.count > 0).sort((a, b) => b.count - a.count).map(c => (
                      <div key={c.type}>
                        <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                          <span>{CONTACT_LABELS[c.type]}</span><span>{c.count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand rounded-full" style={{ width: `${(c.count / maxContact) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-6">Search Appearances counts how often you showed up on page 1 of search results — the spot referring physicians actually see.</p>
          </>
        )}
      </div>
    </div>
  )
}

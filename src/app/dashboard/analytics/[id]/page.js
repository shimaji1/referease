'use client'
import { useState, useEffect, use } from 'react'
import Logo from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { can } from '@/lib/plan'
import { fetchAnalyticsSummary, fetchCategoryBenchmark, fetchRecentActivity } from '@/lib/analytics'
import TrendChart from '@/components/TrendChart'

const CONTACT_LABELS = { click_phone: 'Phone', click_fax: 'Fax', click_email: 'Email', click_address: 'Address / Map', click_website: 'Website' }
const EVENT_ICONS = { view: '👁', impression: '🔎', favourite: '★', form_download: '📄', click_phone: '📞', click_fax: '📠', click_email: '✉️', click_address: '📍', click_website: '🌐' }

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

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

function FunnelStage({ label, value, rate, isLast }) {
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="text-center flex-1">
        <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">{label}</div>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center shrink-0 px-2">
          <span className="text-gray-300 text-lg">→</span>
          <span className="text-[10px] font-bold text-brand">{rate}%</span>
        </div>
      )}
    </div>
  )
}

function OverviewTab({ summary, benchmark }) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon="👁" label="Views" value={summary.counts.view} change={summary.changes.view} />
        <StatCard icon="🔎" label="Search Appearances" value={summary.counts.impression} change={summary.changes.impression} />
        <StatCard icon="★" label="Favourited" value={summary.counts.favourite} change={summary.changes.favourite} />
        <StatCard icon="📞" label="Contact Clicks" value={summary.contactClicks} change={summary.changes.contactClicks} />
        <StatCard icon="📄" label="Form Downloads" value={summary.counts.form_download} change={summary.changes.form_download} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Views & search appearances, last 30 days</h3>
        <p className="text-xs text-gray-500 mb-4">Search appearances are how often you showed up on page 1 of results — the spot referring physicians actually see.</p>
        <TrendChart series={[
          { key: 'view', label: 'Views', color: '#1e3a5f', data: summary.dailySeries.map(d => ({ date: d.date, value: d.view })) },
          { key: 'impression', label: 'Search appearances', color: '#93c5fd', data: summary.dailySeries.map(d => ({ date: d.date, value: d.impression })) },
        ]} />
      </div>

      {benchmark && (
        <div className="bg-gradient-to-br from-brand to-[#2c4f7c] text-white rounded-xl p-5">
          <h3 className="text-sm font-bold mb-1">How you compare</h3>
          <p className="text-xs text-white/70 mb-4">Ranked against {benchmark.totalInCategory} providers in your category, by views this month.</p>
          <div className="flex items-end gap-6 flex-wrap">
            <div>
              <div className="text-3xl font-bold">#{benchmark.rank}</div>
              <div className="text-[11px] text-white/70 uppercase tracking-wide">of {benchmark.totalInCategory}</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{benchmark.myViews}</div>
              <div className="text-[11px] text-white/70 uppercase tracking-wide">your views</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{benchmark.avgPeerViews}</div>
              <div className="text-[11px] text-white/70 uppercase tracking-wide">category average</div>
            </div>
            <div>
              <div className={`text-3xl font-bold ${benchmark.vsAveragePct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{benchmark.vsAveragePct >= 0 ? '+' : ''}{benchmark.vsAveragePct}%</div>
              <div className="text-[11px] text-white/70 uppercase tracking-wide">vs average</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function EngagementTab({ summary }) {
  const maxContact = Math.max(1, ...summary.contactBreakdown.map(c => c.count))
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Conversion funnel</h3>
        <p className="text-xs text-gray-500 mb-5">How many people who saw you in search actually viewed your profile, and how many of those took action.</p>
        <div className="flex items-center">
          <FunnelStage label="Search appearances" value={summary.funnel.impressions} rate={summary.funnel.viewRate} />
          <FunnelStage label="Profile views" value={summary.funnel.views} rate={summary.funnel.contactRate} />
          <FunnelStage label="Contact clicks" value={summary.funnel.contactClicks} isLast />
        </div>
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
  )
}

function DiscoveryTab({ summary }) {
  const maxDay = Math.max(1, ...summary.dayOfWeekSeries.map(d => Math.max(d.view, d.impression)))
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-1">Best days to be seen</h3>
      <p className="text-xs text-gray-500 mb-5">Views and search appearances by day of week — useful for timing when you update your availability.</p>
      <div className="flex items-end gap-3 h-40">
        {summary.dayOfWeekSeries.map(d => (
          <div key={d.name} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
            <div className="w-full flex-1 flex flex-col justify-end gap-0.5">
              <div className="w-full bg-blue-200 rounded-t-sm" style={{ height: `${(d.impression / maxDay) * 100}%`, minHeight: d.impression ? '2px' : 0 }} />
              <div className="w-full bg-brand rounded-t-sm" style={{ height: `${(d.view / maxDay) * 100}%`, minHeight: d.view ? '2px' : 0 }} />
            </div>
            <span className="text-[10px] font-semibold text-gray-400 mt-1">{d.name}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500"><span className="w-2 h-2 rounded-full bg-brand" />Views</span>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500"><span className="w-2 h-2 rounded-full bg-blue-200" />Search appearances</span>
      </div>
    </div>
  )
}

function ActivityTab({ activity }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-4">Recent activity</h3>
      {activity.length === 0 ? (
        <p className="text-sm text-gray-400">No activity yet.</p>
      ) : (
        <div className="space-y-1">
          {activity.map((e, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg shrink-0">{EVENT_ICONS[e.event_type] || '•'}</span>
                <span className="text-sm text-gray-700 truncate">{e.label}</span>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{timeAgo(e.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'discovery', label: 'Discovery' },
  { key: 'activity', label: 'Activity' },
]

export default function AnalyticsPage({ params }) {
  const { id } = use(params)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [provider, setProvider] = useState(null)
  const [summary, setSummary] = useState(null)
  const [benchmark, setBenchmark] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    if (!supabase || !id) return
    supabase.from('providers').select('*').eq('id', id).single().then(async ({ data }) => {
      if (data) {
        setProvider(data)
        const [s, b, a] = await Promise.all([
          fetchAnalyticsSummary(data.id),
          fetchCategoryBenchmark(data.id, data.category),
          fetchRecentActivity(data.id),
        ])
        setSummary(s); setBenchmark(b); setActivity(a)
      }
      setLoading(false)
    })
  }, [id])

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!user) { router.push('/login'); return null }
  if (!provider) return null

  const isFeatured = can(provider, 'analytics_full')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Logo />
          <Link href="/dashboard" className="text-xs font-medium text-gray-500 hover:text-brand px-3 py-1.5 border border-gray-200 rounded-lg transition">← Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">{provider.name} · last 30 days</p>
          </div>
          {isFeatured && <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full uppercase tracking-wide">Featured</span>}
        </div>

        {!isFeatured ? (
          <div className="bg-white border-2 border-brand/20 rounded-2xl p-8 text-center">
            <div className="text-3xl mb-3">📊</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Full analytics is a Featured feature</h2>
            <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">Search impressions, favourites, contact clicks, form downloads, category benchmarking, and trend charts — upgrade to Featured to unlock the full picture of how referring physicians find and engage with your listing.</p>
            <Link href="/pricing" className="inline-flex px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition">See plans →</Link>
          </div>
        ) : !summary ? (
          <p className="text-sm text-gray-400">No data yet.</p>
        ) : (
          <>
            <div className="flex gap-1 mb-6 border-b border-gray-200">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition -mb-px ${tab === t.key ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'overview' && <OverviewTab summary={summary} benchmark={benchmark} />}
            {tab === 'engagement' && <EngagementTab summary={summary} />}
            {tab === 'discovery' && <DiscoveryTab summary={summary} />}
            {tab === 'activity' && <ActivityTab activity={activity} />}
          </>
        )}
      </div>
    </div>
  )
}

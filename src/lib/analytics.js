import { supabase } from './supabase'

// Local dev and production share one Supabase project — without this, testing on
// localhost inflates a provider's real view/click counts.
const DEV_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\])$/
export const isDevHost = () => typeof window !== 'undefined' && DEV_HOSTS.test(window.location.hostname)

// Fire-and-forget event tracking for the Featured-tier analytics dashboard. Never blocks
// the UI and never throws — a missed analytics event is not worth breaking a page over.
export function trackEvent(providerId, eventType) {
  if (!supabase || !providerId || isDevHost()) return
  supabase.from('provider_analytics_events').insert({ provider_id: providerId, event_type: eventType }).then(() => {})
}

const EVENT_TYPES = ['view', 'impression', 'favourite', 'form_download', 'click_phone', 'click_fax', 'click_email', 'click_address', 'click_website']
const CONTACT_TYPES = ['click_phone', 'click_fax', 'click_email', 'click_address', 'click_website']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function emptyCounts() {
  return Object.fromEntries(EVENT_TYPES.map(t => [t, 0]))
}

function pctChange(curr, prev) {
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
}

// Everything the Overview/Engagement/Discovery tabs need: counts + % change vs the prior
// period, a daily views/impressions series for the trend chart, contact-type breakdown, a
// simple funnel (impressions -> views -> contact clicks), and a day-of-week pattern.
export async function fetchAnalyticsSummary(providerId, days = 30) {
  if (!supabase || !providerId) return null
  const now = new Date()
  const periodStart = new Date(now.getTime() - days * 86400000)
  const priorStart = new Date(now.getTime() - days * 2 * 86400000)

  const [{ data: current }, { data: prior }] = await Promise.all([
    supabase.from('provider_analytics_events').select('event_type, created_at').eq('provider_id', providerId).gte('created_at', periodStart.toISOString()),
    supabase.from('provider_analytics_events').select('event_type').eq('provider_id', providerId).gte('created_at', priorStart.toISOString()).lt('created_at', periodStart.toISOString()),
  ])

  const counts = emptyCounts()
  const daily = {}
  const byDayOfWeek = DAY_NAMES.map(() => ({ view: 0, impression: 0 }))
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10)
    daily[d] = { view: 0, impression: 0 }
  }
  ;(current || []).forEach(e => {
    if (counts[e.event_type] !== undefined) counts[e.event_type]++
    if (e.event_type === 'view' || e.event_type === 'impression') {
      const d = e.created_at.slice(0, 10)
      if (daily[d] !== undefined) daily[d][e.event_type]++
      byDayOfWeek[new Date(e.created_at).getDay()][e.event_type]++
    }
  })

  const priorCounts = emptyCounts()
  ;(prior || []).forEach(e => { if (priorCounts[e.event_type] !== undefined) priorCounts[e.event_type]++ })

  const contactClicks = CONTACT_TYPES.reduce((sum, t) => sum + counts[t], 0)
  const priorContactClicks = CONTACT_TYPES.reduce((sum, t) => sum + priorCounts[t], 0)

  const funnelRate = (num, den) => den > 0 ? Math.round((num / den) * 100) : 0

  return {
    counts,
    contactClicks,
    contactBreakdown: CONTACT_TYPES.map(t => ({ type: t, count: counts[t] })),
    dailySeries: Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, view: v.view, impression: v.impression })),
    dayOfWeekSeries: DAY_NAMES.map((name, i) => ({ name, view: byDayOfWeek[i].view, impression: byDayOfWeek[i].impression })),
    funnel: {
      impressions: counts.impression,
      views: counts.view,
      contactClicks,
      viewRate: funnelRate(counts.view, counts.impression),
      contactRate: funnelRate(contactClicks, counts.view),
    },
    changes: {
      view: pctChange(counts.view, priorCounts.view),
      impression: pctChange(counts.impression, priorCounts.impression),
      favourite: pctChange(counts.favourite, priorCounts.favourite),
      contactClicks: pctChange(contactClicks, priorContactClicks),
      form_download: pctChange(counts.form_download, priorCounts.form_download),
    },
  }
}

// How this listing's views compare to the average Featured/Verified listing in the same
// category over the same period — the "you're doing better/worse than peers" framing that
// makes raw counts feel meaningful instead of just numbers on a page.
export async function fetchCategoryBenchmark(providerId, category, days = 30) {
  if (!supabase || !category) return null
  const periodStart = new Date(Date.now() - days * 86400000).toISOString()

  const { data: peers } = await supabase.from('providers').select('id').eq('category', category).eq('data_status', 'complete').in('plan', ['verified', 'featured'])
  const peerIds = (peers || []).map(p => p.id).filter(id => id !== providerId)
  if (!peerIds.length) return null

  const [{ data: mine }, { data: theirs }] = await Promise.all([
    supabase.from('provider_analytics_events').select('id', { count: 'exact', head: true }).eq('provider_id', providerId).eq('event_type', 'view').gte('created_at', periodStart),
    supabase.from('provider_analytics_events').select('provider_id').eq('event_type', 'view').gte('created_at', periodStart).in('provider_id', peerIds),
  ])

  const myViews = mine?.count || 0
  const peerViewCounts = {}
  ;(theirs || []).forEach(e => { peerViewCounts[e.provider_id] = (peerViewCounts[e.provider_id] || 0) + 1 })
  const allPeerCounts = peerIds.map(id => peerViewCounts[id] || 0)
  const avgPeerViews = allPeerCounts.length ? allPeerCounts.reduce((a, b) => a + b, 0) / allPeerCounts.length : 0
  const rank = 1 + allPeerCounts.filter(c => c > myViews).length

  return {
    myViews,
    avgPeerViews: Math.round(avgPeerViews * 10) / 10,
    peerCount: peerIds.length,
    rank,
    totalInCategory: peerIds.length + 1,
    vsAveragePct: avgPeerViews > 0 ? Math.round(((myViews - avgPeerViews) / avgPeerViews) * 100) : (myViews > 0 ? 100 : 0),
  }
}

const EVENT_LABELS = {
  view: 'Profile viewed', impression: 'Appeared in search results', favourite: 'Saved to a favourites list',
  form_download: 'Referral form downloaded', click_phone: 'Phone number clicked', click_fax: 'Fax number clicked',
  click_email: 'Email clicked', click_address: 'Address / map clicked', click_website: 'Website link clicked',
}

export async function fetchRecentActivity(providerId, limit = 20) {
  if (!supabase || !providerId) return []
  const { data } = await supabase.from('provider_analytics_events').select('event_type, created_at').eq('provider_id', providerId).order('created_at', { ascending: false }).limit(limit)
  return (data || []).map(e => ({ ...e, label: EVENT_LABELS[e.event_type] || e.event_type }))
}

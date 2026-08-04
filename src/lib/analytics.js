import { supabase } from './supabase'

// Fire-and-forget event tracking for the Featured-tier analytics dashboard. Never blocks
// the UI and never throws — a missed analytics event is not worth breaking a page over.
export function trackEvent(providerId, eventType) {
  if (!supabase || !providerId) return
  supabase.from('provider_analytics_events').insert({ provider_id: providerId, event_type: eventType }).then(() => {})
}

const EVENT_TYPES = ['view', 'impression', 'favourite', 'form_download', 'click_phone', 'click_fax', 'click_email', 'click_address', 'click_website']
const CONTACT_TYPES = ['click_phone', 'click_fax', 'click_email', 'click_address', 'click_website']

function emptyCounts() {
  return Object.fromEntries(EVENT_TYPES.map(t => [t, 0]))
}

// Summary counts for a period, the same for the prior period (for % change), and a daily
// series of views for the trend chart.
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
  const dailyViews = {}
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10)
    dailyViews[d] = 0
  }
  ;(current || []).forEach(e => {
    if (counts[e.event_type] !== undefined) counts[e.event_type]++
    if (e.event_type === 'view') {
      const d = e.created_at.slice(0, 10)
      if (dailyViews[d] !== undefined) dailyViews[d]++
    }
  })

  const priorCounts = emptyCounts()
  ;(prior || []).forEach(e => { if (priorCounts[e.event_type] !== undefined) priorCounts[e.event_type]++ })

  const contactClicks = CONTACT_TYPES.reduce((sum, t) => sum + counts[t], 0)
  const priorContactClicks = CONTACT_TYPES.reduce((sum, t) => sum + priorCounts[t], 0)

  const pctChange = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }

  return {
    counts,
    contactClicks,
    contactBreakdown: CONTACT_TYPES.map(t => ({ type: t, count: counts[t] })),
    dailySeries: Object.entries(dailyViews).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    changes: {
      view: pctChange(counts.view, priorCounts.view),
      impression: pctChange(counts.impression, priorCounts.impression),
      favourite: pctChange(counts.favourite, priorCounts.favourite),
      contactClicks: pctChange(contactClicks, priorContactClicks),
      form_download: pctChange(counts.form_download, priorCounts.form_download),
    },
  }
}

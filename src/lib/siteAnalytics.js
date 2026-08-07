import { supabase } from './supabase'

// Site-wide traffic analytics, separate from provider_analytics_events (which tracks
// engagement on individual listings). This tracks the whole site: page views, search
// behaviour, signups — the raw material for the admin traffic dashboard.

const VISITOR_KEY = 're-visitor-id'
const SESSION_KEY = 're-session-id'
const BOT_UA = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|curl|wget|headless/i

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function getVisitorId() {
  if (typeof window === 'undefined') return null
  let id = localStorage.getItem(VISITOR_KEY)
  if (!id) { id = uuid(); localStorage.setItem(VISITOR_KEY, id) }
  return id
}

function getSessionId() {
  if (typeof window === 'undefined') return null
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) { id = uuid(); sessionStorage.setItem(SESSION_KEY, id) }
  return id
}

function parseDevice(ua) {
  if (/tablet|ipad/i.test(ua)) return 'tablet'
  if (/mobile|android|iphone/i.test(ua)) return 'mobile'
  return 'desktop'
}

function parseBrowser(ua) {
  if (/edg\//i.test(ua)) return 'Edge'
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return 'Chrome'
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return 'Safari'
  if (/firefox\//i.test(ua)) return 'Firefox'
  return 'Other'
}

function referrerDomain(ref) {
  if (!ref) return null
  try {
    const host = new URL(ref).hostname.replace(/^www\./, '')
    if (host.includes('refereasy')) return null // internal navigation, not a real referrer
    return host
  } catch { return null }
}

function baseEvent(extra = {}) {
  if (typeof window === 'undefined') return null
  const ua = navigator.userAgent || ''
  if (BOT_UA.test(ua)) return null
  const params = new URLSearchParams(window.location.search)
  return {
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    path: window.location.pathname,
    referrer: referrerDomain(document.referrer),
    utm_source: params.get('utm_source') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null,
    device: parseDevice(ua),
    browser: parseBrowser(ua),
    ...extra,
  }
}

export function trackPageView(path) {
  const ev = baseEvent({ event_type: 'page_view', path: path || (typeof window !== 'undefined' ? window.location.pathname : '') })
  if (!ev || !supabase) return
  supabase.from('site_events').insert(ev).then(() => {})
}

export function trackSearch({ query, specialty, resultsCount }) {
  const ev = baseEvent({ event_type: 'search', query: query || null, specialty: specialty || null, results_count: resultsCount ?? null })
  if (!ev || !supabase) return
  supabase.from('site_events').insert(ev).then(() => {})
}

export function trackSignup(role) {
  const ev = baseEvent({ event_type: 'signup', specialty: role || null })
  if (!ev || !supabase) return
  supabase.from('site_events').insert(ev).then(() => {})
}

// ── Admin dashboard reads ───────────────────────────────────────────────────
// Every fetch takes a `range`: { start: Date|null, end: Date }. start === null means
// "lifetime" — no lower bound. Built from the date picker / presets in the admin UI.

export function presetRange(days) {
  const end = new Date()
  if (days === null) return { start: null, end } // lifetime
  const start = new Date(end.getTime() - days * 86400000)
  return { start, end }
}

// Prior period of equal length immediately before `start`, for %-change comparisons.
// Not meaningful for a lifetime range (no "before" to compare to).
function priorRange({ start, end }) {
  if (!start) return null
  const spanMs = end.getTime() - start.getTime()
  return { start: new Date(start.getTime() - spanMs), end: new Date(start.getTime()) }
}

function applyRange(query, range, col = 'created_at') {
  if (range.start) query = query.gte(col, range.start.toISOString())
  return query.lte(col, range.end.toISOString())
}

const pctChange = (curr, prev) => (prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100))

// Chart buckets adapt to the span so a lifetime view doesn't render thousands of
// daily points — day buckets under ~9 weeks, week buckets under ~1 year, month beyond.
function pickGranularity(spanDays) {
  if (spanDays <= 62) return 'day'
  if (spanDays <= 366) return 'week'
  return 'month'
}

function bucketKey(dateStr, granularity) {
  const d = new Date(dateStr)
  if (granularity === 'day') return d.toISOString().slice(0, 10)
  if (granularity === 'week') {
    const day = d.getUTCDay()
    const weekStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day))
    return weekStart.toISOString().slice(0, 10)
  }
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}

function bucketStep(date, granularity) {
  const d = new Date(date)
  if (granularity === 'day') return new Date(d.getTime() + 86400000)
  if (granularity === 'week') return new Date(d.getTime() + 7 * 86400000)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
}

export async function fetchTrafficOverview(range) {
  if (!supabase) return null
  const prior = priorRange(range)
  const effectiveStart = range.start || new Date(0) // for span/day-count math on "lifetime"

  const [{ data: current }, { data: priorData }] = await Promise.all([
    applyRange(supabase.from('site_events').select('event_type, path, visitor_id, session_id, created_at'), range),
    prior ? applyRange(supabase.from('site_events').select('event_type, visitor_id'), prior) : Promise.resolve({ data: null }),
  ])

  const cur = current || []
  const pageViewsCur = cur.filter(e => e.event_type === 'page_view')
  const priorPageViews = (priorData || []).filter(e => e.event_type === 'page_view')

  const uniqueVisitors = new Set(pageViewsCur.map(e => e.visitor_id)).size
  const priorUniqueVisitors = new Set(priorPageViews.map(e => e.visitor_id)).size
  const uniqueSessions = new Set(pageViewsCur.map(e => e.session_id)).size

  // Bucketed series for the trend chart, granularity adapts to the span
  const spanDays = Math.max(1, Math.ceil((range.end.getTime() - effectiveStart.getTime()) / 86400000))
  const granularity = pickGranularity(spanDays)
  const buckets = {}
  for (let d = new Date(bucketKey(effectiveStart.toISOString(), granularity)); d <= range.end; d = bucketStep(d, granularity)) {
    buckets[bucketKey(d.toISOString(), granularity)] = { views: 0, visitors: new Set() }
  }
  pageViewsCur.forEach(e => {
    const k = bucketKey(e.created_at, granularity)
    if (!buckets[k]) buckets[k] = { views: 0, visitors: new Set() }
    buckets[k].views++; buckets[k].visitors.add(e.visitor_id)
  })
  const series = Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, views: v.views, visitors: v.visitors.size }))

  // Sessions -> pages/session
  const bySessionCount = {}
  pageViewsCur.forEach(e => { bySessionCount[e.session_id] = (bySessionCount[e.session_id] || 0) + 1 })
  const avgPagesPerSession = uniqueSessions ? (pageViewsCur.length / uniqueSessions).toFixed(1) : '0'
  const singlePageSessions = Object.values(bySessionCount).filter(c => c === 1).length
  const bounceRate = uniqueSessions ? Math.round((singlePageSessions / uniqueSessions) * 100) : 0

  return {
    pageViews: pageViewsCur.length,
    pageViewsChange: prior ? pctChange(pageViewsCur.length, priorPageViews.length) : null,
    uniqueVisitors,
    uniqueVisitorsChange: prior ? pctChange(uniqueVisitors, priorUniqueVisitors) : null,
    sessions: uniqueSessions,
    avgPagesPerSession,
    bounceRate,
    series,
  }
}

export async function fetchTopPages(range, limit = 10) {
  if (!supabase) return []
  const { data } = await applyRange(supabase.from('site_events').select('path').eq('event_type', 'page_view'), range)
  const counts = {}
  ;(data || []).forEach(e => { counts[e.path] = (counts[e.path] || 0) + 1 })
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([path, count]) => ({ path, count }))
}

export async function fetchTrafficSources(range) {
  if (!supabase) return { direct: 0, referral: [] }
  const { data } = await applyRange(supabase.from('site_events').select('referrer').eq('event_type', 'page_view'), range)
  const rows = data || []
  const direct = rows.filter(e => !e.referrer).length
  const counts = {}
  rows.forEach(e => { if (e.referrer) counts[e.referrer] = (counts[e.referrer] || 0) + 1 })
  const referral = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([domain, count]) => ({ domain, count }))
  return { direct, referral, total: rows.length }
}

export async function fetchDeviceBreakdown(range) {
  if (!supabase) return { devices: [], browsers: [] }
  const { data } = await applyRange(supabase.from('site_events').select('device, browser').eq('event_type', 'page_view'), range)
  const rows = data || []
  const devCounts = {}, brCounts = {}
  rows.forEach(e => {
    devCounts[e.device] = (devCounts[e.device] || 0) + 1
    brCounts[e.browser] = (brCounts[e.browser] || 0) + 1
  })
  const total = rows.length || 1
  const devices = Object.entries(devCounts).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }))
  const browsers = Object.entries(brCounts).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }))
  return { devices, browsers, total: rows.length }
}

export async function fetchSearchInsights(range, limit = 10) {
  if (!supabase) return { topQueries: [], topSpecialties: [], zeroResultRate: 0, totalSearches: 0 }
  const { data } = await applyRange(supabase.from('site_events').select('query, specialty, results_count').eq('event_type', 'search'), range)
  const rows = data || []
  const qCounts = {}, sCounts = {}
  let zero = 0
  rows.forEach(e => {
    if (e.query) qCounts[e.query.toLowerCase()] = (qCounts[e.query.toLowerCase()] || 0) + 1
    if (e.specialty) sCounts[e.specialty] = (sCounts[e.specialty] || 0) + 1
    if (e.results_count === 0) zero++
  })
  return {
    topQueries: Object.entries(qCounts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([query, count]) => ({ query, count })),
    topSpecialties: Object.entries(sCounts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([specialty, count]) => ({ specialty, count })),
    zeroResultRate: rows.length ? Math.round((zero / rows.length) * 100) : 0,
    totalSearches: rows.length,
  }
}

// Platform-wide funnel: visits -> searches -> profile views -> contact clicks -> signups.
// Pulls from both site_events (visits/searches/signups) and provider_analytics_events
// (profile views/contact clicks across every listing, not just one).
export async function fetchConversionFunnel(range) {
  if (!supabase) return null
  const [{ data: site }, { data: providerEvents }] = await Promise.all([
    applyRange(supabase.from('site_events').select('event_type, visitor_id'), range),
    applyRange(supabase.from('provider_analytics_events').select('event_type'), range),
  ])
  const siteRows = site || []
  const visits = new Set(siteRows.filter(e => e.event_type === 'page_view').map(e => e.visitor_id)).size
  const searches = siteRows.filter(e => e.event_type === 'search').length
  const signups = siteRows.filter(e => e.event_type === 'signup').length

  const pRows = providerEvents || []
  const profileViews = pRows.filter(e => e.event_type === 'view').length
  const contactClicks = pRows.filter(e => e.event_type.startsWith('click_')).length

  return { visits, searches, profileViews, contactClicks, signups }
}

// Aggregated engagement across ALL providers — not scoped to one listing. Top performers,
// category breakdown, platform totals.
export async function fetchProviderEngagementRollup(range, limit = 10) {
  if (!supabase) return { totals: {}, topProviders: [] }
  const { data } = await applyRange(supabase.from('provider_analytics_events').select('provider_id, event_type'), range)
  const rows = data || []
  const totals = {}
  const byProvider = {}
  rows.forEach(e => {
    totals[e.event_type] = (totals[e.event_type] || 0) + 1
    if (!byProvider[e.provider_id]) byProvider[e.provider_id] = { views: 0, contacts: 0, favourites: 0 }
    if (e.event_type === 'view') byProvider[e.provider_id].views++
    else if (e.event_type.startsWith('click_')) byProvider[e.provider_id].contacts++
    else if (e.event_type === 'favourite') byProvider[e.provider_id].favourites++
  })
  const providerIds = Object.entries(byProvider).sort((a, b) => b[1].views - a[1].views).slice(0, limit).map(([id]) => id)
  let names = {}
  if (providerIds.length) {
    const { data: providers } = await supabase.from('providers').select('id, name, category').in('id', providerIds)
    names = Object.fromEntries((providers || []).map(p => [p.id, p]))
  }
  const topProviders = providerIds.map(id => ({ id, name: names[id]?.name || `#${id}`, category: names[id]?.category, ...byProvider[id] }))
  return { totals, topProviders }
}

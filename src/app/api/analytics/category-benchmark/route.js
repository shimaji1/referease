import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

// GET /api/analytics/category-benchmark?provider_id=&category=&days=
// Runs server-side with the service role because computing this needs to read view
// events across every peer provider in the category, not just the caller's own — under
// RLS, a provider can only ever see their own listing's analytics rows directly. This
// route returns aggregated numbers only, never other providers' individual event rows.
export async function GET(request) {
  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Database not connected' }, { status: 503 })

  const { searchParams } = new URL(request.url)
  const providerId = searchParams.get('provider_id')
  const category = searchParams.get('category')
  const days = parseInt(searchParams.get('days') || '30')
  if (!providerId || !category) return NextResponse.json({ benchmark: null })

  const periodStart = new Date(Date.now() - days * 86400000).toISOString()

  const { data: peers } = await sb.from('providers').select('id').eq('category', category).eq('data_status', 'complete').in('plan', ['verified', 'featured'])
  const peerIds = (peers || []).map(p => p.id).filter(id => String(id) !== String(providerId))
  if (!peerIds.length) return NextResponse.json({ benchmark: null })

  const [{ count: myViews }, { data: theirs }] = await Promise.all([
    sb.from('provider_analytics_events').select('id', { count: 'exact', head: true }).eq('provider_id', providerId).eq('event_type', 'view').gte('created_at', periodStart),
    sb.from('provider_analytics_events').select('provider_id').eq('event_type', 'view').gte('created_at', periodStart).in('provider_id', peerIds),
  ])

  const peerViewCounts = {}
  ;(theirs || []).forEach(e => { peerViewCounts[e.provider_id] = (peerViewCounts[e.provider_id] || 0) + 1 })
  const allPeerCounts = peerIds.map(id => peerViewCounts[id] || 0)
  const avgPeerViews = allPeerCounts.length ? allPeerCounts.reduce((a, b) => a + b, 0) / allPeerCounts.length : 0
  const rank = 1 + allPeerCounts.filter(c => c > (myViews || 0)).length

  return NextResponse.json({
    benchmark: {
      myViews: myViews || 0,
      avgPeerViews: Math.round(avgPeerViews * 10) / 10,
      peerCount: peerIds.length,
      rank,
      totalInCategory: peerIds.length + 1,
      vsAveragePct: avgPeerViews > 0 ? Math.round((((myViews || 0) - avgPeerViews) / avgPeerViews) * 100) : ((myViews || 0) > 0 ? 100 : 0),
    }
  })
}

import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

// GET /api/diagnostic/featured — shows all featured providers and why they might not surface
export async function GET() {
  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Service not configured' }, { status: 503 })

  const { data: allFeatured, error } = await sb.from('providers')
    .select('id, name, featured, plan, trial_ends_at, plan_granted_by_admin, data_status, verified, category, type')
    .eq('featured', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    total_featured: allFeatured?.length || 0,
    filter_diagnostic: allFeatured?.map(p => ({
      id: p.id,
      name: p.name,
      data_status: p.data_status,
      would_pass_homepage_filter: p.data_status === 'complete',
      plan: p.plan,
      featured: p.featured,
      verified: p.verified,
      category: p.category,
      type: p.type,
    })),
  })
}

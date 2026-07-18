import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'

// GET /api/specialties — list all SNOMED CT specialties grouped by category
export async function GET() {
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database not connected' }, { status: 503 })

  const { data, error } = await supabase.from('specialties').select('*').order('category_order').order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by category
  const grouped = {}
  data.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = []
    grouped[s.category].push({ snomed_code: s.snomed_code, name: s.name })
  })

  return NextResponse.json({
    total: data.length,
    categories: Object.keys(grouped).length,
    specialties: grouped,
    flat: data,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
  })
}

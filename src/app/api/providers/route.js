import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'

// GET /api/providers — list all providers with optional filters
export async function GET(request) {
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database not connected' }, { status: 503 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const type = searchParams.get('type')
  const accepting = searchParams.get('accepting')
  const maxWait = searchParams.get('max_wait')
  const language = searchParams.get('language')
  const service = searchParams.get('service')
  const search = searchParams.get('search')
  const sort = searchParams.get('sort') || 'name'
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase.from('providers').select('*', { count: 'exact' })

  if (category) query = query.eq('category', category)
  if (type) query = query.eq('type', type)
  if (accepting === 'true') query = query.eq('accepting_referrals', true)
  if (maxWait) query = query.lte('wait_weeks', parseInt(maxWait))
  if (language) query = query.contains('languages', [language])
  if (service) query = query.contains('services', [service])
  if (search) query = query.or(`name.ilike.%${search}%,type.ilike.%${search}%,address.ilike.%${search}%`)

  // Sort
  const sortMap = {
    name: { column: 'name', ascending: true },
    rating: { column: 'rating', ascending: false },
    wait: { column: 'wait_weeks', ascending: true },
    reviews: { column: 'reviews', ascending: false },
  }
  const sortConfig = sortMap[sort] || sortMap.name
  query = query.order(sortConfig.column, { ascending: sortConfig.ascending, nullsFirst: false })

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    providers: data,
    total: count,
    limit,
    offset,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    }
  })
}

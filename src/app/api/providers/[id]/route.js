import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'

// GET /api/providers/:id — single provider with full details
export async function GET(request, { params }) {
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database not connected' }, { status: 503 })

  const { id } = await params
  const { data, error } = await supabase.from('providers').select('*').eq('id', id).single()

  if (error || !data) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

  // Fetch any active programs for this provider
  const { data: programs } = await supabase.from('programs').select('*').eq('provider_id', id).eq('active', true)

  return NextResponse.json({
    provider: data,
    programs: programs || [],
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    }
  })
}

// PATCH /api/providers/:id — update provider (authenticated owner only)
export async function PATCH(request, { params }) {
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database not connected' }, { status: 503 })

  const { id } = await params
  const body = await request.json()

  // Remove fields that shouldn't be updated via API
  delete body.id
  delete body.created_at
  delete body.owner_id

  const { data, error } = await supabase.from('providers').update(body).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ provider: data })
}

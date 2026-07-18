import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'

// GET /api/programs — list active programs & studies
export async function GET(request) {
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database not connected' }, { status: 503 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // study, program, paid_referral
  const providerId = searchParams.get('provider_id')

  let query = supabase.from('programs').select('*, providers(name, type, address)').eq('active', true)

  if (type) query = query.eq('type', type)
  if (providerId) query = query.eq('provider_id', providerId)

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ programs: data })
}

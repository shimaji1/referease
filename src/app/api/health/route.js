import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'

// GET /api/health — API status and metadata
export async function GET() {
  const supabase = getSupabase()
  let dbStatus = 'disconnected'
  let providerCount = 0

  if (supabase) {
    const { count, error } = await supabase.from('providers').select('*', { count: 'exact', head: true })
    if (!error) {
      dbStatus = 'connected'
      providerCount = count
    }
  }

  return NextResponse.json({
    status: 'ok',
    version: '0.2.0',
    database: dbStatus,
    providers: providerCount,
    region: 'Ontario, Canada',
    api: {
      endpoints: [
        'GET /api/providers — List providers (supports filtering, sorting, pagination)',
        'GET /api/providers/:id — Provider details + active programs',
        'PATCH /api/providers/:id — Update provider (authenticated)',
        'GET /api/programs — List active programs & studies',
        'GET /api/health — This endpoint',
      ],
      fhir_ready: false,
      fhir_planned: true,
    }
  })
}

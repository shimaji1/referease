import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

// POST /api/claim/list — { user_id }
// Admin-only. claim_invites has no anon/authenticated RLS access at all (bearer-token
// table, see supabase-claim-invites.sql), so this is the only way the admin UI can see
// invite status — mirrors the auth check in /api/claim/invite. invite_token itself is
// never included in the response.
export async function POST(request) {
  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'Database not connected' }, { status: 503 })

  const { user_id } = await request.json().catch(() => ({}))
  if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

  const { data: caller } = await sb.from('profiles').select('is_admin').eq('id', user_id).maybeSingle()
  if (!caller?.is_admin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { data, error } = await sb.from('claim_invites')
    .select('id, provider_id, email, status, created_at, accepted_at, providers(id, name)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ invites: data || [] })
}

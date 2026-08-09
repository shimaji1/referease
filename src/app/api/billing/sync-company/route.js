import { NextResponse } from 'next/server'
import { getSquareClient } from '@/lib/square'
import { getServiceSupabase } from '@/lib/supabase-server'

// POST /api/billing/sync-company — pushes profile.company_name / tax_number onto any
// Square customer already on file for this user's listings, so it shows up on future
// invoices. Square's Customer object has no dedicated tax-ID field, so the business
// number is folded into companyName. Best effort — silently no-ops if Square/customer
// isn't set up yet.
export async function POST(request) {
  const client = getSquareClient()
  const sb = getServiceSupabase()
  if (!client || !sb) return NextResponse.json({ ok: true, skipped: true })

  const body = await request.json().catch(() => ({}))
  const { user_id } = body
  if (!user_id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await sb.from('profiles').select('company_name, tax_number').eq('id', user_id).maybeSingle()
  if (!profile?.company_name) return NextResponse.json({ ok: true, skipped: true })

  const companyName = profile.tax_number ? `${profile.company_name} (HST/BN: ${profile.tax_number})` : profile.company_name

  const { data: owned } = await sb.from('providers').select('id, square_customer_id').eq('owner_id', user_id)
  for (const provider of owned || []) {
    if (!provider.square_customer_id) continue
    await client.customers.update({ customerId: provider.square_customer_id, companyName }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}

import { supabase } from './supabase'

// Staff/team access — lets a provider grant dashboard access to a listing without
// sharing login credentials. Each invitee gets their own account; provider_staff
// is the join table between a provider listing and the users who can manage it.

export async function fetchStaff(providerId) {
  if (!supabase || !providerId) return []
  const { data } = await supabase.from('provider_staff').select('*').eq('provider_id', providerId).order('created_at')
  return data || []
}

export async function inviteStaff(providerId, email, invitedByUserId) {
  const res = await fetch('/api/staff/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider_id: providerId, email, invited_by: invitedByUserId }),
  })
  return res.json()
}

export async function revokeStaff(staffRowId) {
  if (!supabase) return false
  const { error } = await supabase.from('provider_staff').update({ status: 'revoked' }).eq('id', staffRowId)
  return !error
}

// Provider ids a user has accepted-staff access to (in addition to whatever they own directly).
export async function fetchStaffProviderIds(userId) {
  if (!supabase || !userId) return []
  const { data } = await supabase.from('provider_staff').select('provider_id').eq('user_id', userId).eq('status', 'accepted')
  return (data || []).map(r => r.provider_id)
}

export async function lookupInviteByToken(token) {
  if (!supabase || !token) return null
  const { data } = await supabase.from('provider_staff').select('*, providers(name)').eq('invite_token', token).eq('status', 'pending').maybeSingle()
  return data
}

// Claims a pending invite for the now-authenticated user. RLS only allows this when the
// row is still unclaimed (user_id is null, status is pending) — the token itself (a random
// UUID only the invitee received by email) is what authorizes which row gets claimed.
export async function acceptInvite(token, userId) {
  if (!supabase) return false
  const { error } = await supabase.from('provider_staff')
    .update({ status: 'accepted', user_id: userId, accepted_at: new Date().toISOString() })
    .eq('invite_token', token).eq('status', 'pending')
  return !error
}

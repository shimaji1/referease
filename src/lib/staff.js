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

// provider_staff has no anon table access — invite_token is a bearer secret checked
// before the invitee has a session, so lookup/accept go through a service-role route.
export async function lookupInviteByToken(token) {
  if (!token) return null
  const res = await fetch('/api/staff/accept', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'lookup', token }),
  }).then(r => r.json()).catch(() => ({ invite: null }))
  return res.invite
}

export async function acceptInvite(token, userId) {
  const res = await fetch('/api/staff/accept', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'accept', token, user_id: userId }),
  }).then(r => r.json()).catch(() => ({ ok: false }))
  return !!res.ok
}

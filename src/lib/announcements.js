import { supabase } from './supabase'

export const TEMPLATES = [
  { key: 'image-left', label: 'Image + Text', description: 'Photo on one side, your message and a button on the other.' },
  { key: 'full-banner', label: 'Full Banner', description: 'Full-width photo with your headline overlaid.' },
  { key: 'text-card', label: 'Text Only', description: 'Clean colored card, no photo needed.' },
]

export async function fetchMyAnnouncement(providerId) {
  if (!supabase || !providerId) return null
  const { data } = await supabase.from('provider_announcements').select('*').eq('provider_id', providerId).maybeSingle()
  return data
}

// One row per provider (capped at 1 active announcement) — upserts on the unique
// provider_id constraint, and always resets to pending so admin re-reviews any edit.
export async function submitAnnouncement(providerId, fields) {
  if (!supabase || !providerId) return { error: 'Not signed in' }
  const { error } = await supabase.from('provider_announcements').upsert({
    provider_id: providerId,
    template: fields.template,
    headline: fields.headline || null,
    body: fields.body || null,
    image_url: fields.image_url || null,
    image_path: fields.image_path || null,
    cta_label: fields.cta_label || null,
    cta_url: fields.cta_url || null,
    status: 'pending',
    admin_notes: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'provider_id' })
  return { error: error?.message }
}

export async function fetchApprovedAnnouncements(limit = 10) {
  if (!supabase) return []
  const { data } = await supabase.from('provider_announcements')
    .select('id, template, headline, body, image_url, cta_label, cta_url, provider_id, providers(id, name)')
    .eq('status', 'approved').order('sort_order').order('reviewed_at', { ascending: false }).limit(limit)
  return data || []
}

// ── Admin-only (used from /admin, gated by the admin password, not Supabase auth) ──

export async function fetchAllAnnouncements() {
  if (!supabase) return []
  const { data } = await supabase.from('provider_announcements')
    .select('*, providers(id, name)').order('sort_order').order('created_at', { ascending: false })
  return data || []
}

// Admin-authored slides aren't tied to a provider (provider_id null is fine — the unique
// constraint on provider_id treats NULLs as distinct, so this never collides with the
// one-per-provider cap) and go live immediately since admin is the one approving them.
export async function createAdminAnnouncement(fields) {
  if (!supabase) return { error: 'Not connected' }
  const { error } = await supabase.from('provider_announcements').insert({
    provider_id: fields.provider_id || null,
    template: fields.template,
    headline: fields.headline || null,
    body: fields.body || null,
    image_url: fields.image_url || null,
    image_path: fields.image_path || null,
    cta_label: fields.cta_label || null,
    cta_url: fields.cta_url || null,
    sort_order: fields.sort_order ?? 0,
    status: 'approved',
    reviewed_at: new Date().toISOString(),
  })
  return { error: error?.message }
}

export async function updateAnnouncement(id, fields) {
  if (!supabase) return { error: 'Not connected' }
  const { error } = await supabase.from('provider_announcements').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
  return { error: error?.message }
}

export async function deleteAnnouncement(id) {
  if (!supabase) return false
  const { error } = await supabase.from('provider_announcements').delete().eq('id', id)
  return !error
}

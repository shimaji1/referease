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
    .eq('status', 'approved').order('reviewed_at', { ascending: false }).limit(limit)
  return data || []
}

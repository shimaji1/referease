import { supabase } from './supabase'

export const TEMPLATES = [
  { key: 'image-left', label: 'Image + Text', description: 'Photo on one side, your message and a button on the other.' },
  { key: 'full-banner', label: 'Full Banner', description: 'Full-width photo with your headline overlaid.' },
  { key: 'text-card', label: 'Text Only', description: 'Clean colored card, no photo needed.' },
]

export const FONT_OPTIONS = [
  { key: 'sans', label: 'Sans', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" },
  { key: 'serif', label: 'Serif', family: "Georgia, 'Times New Roman', serif" },
  { key: 'mono', label: 'Monospace', family: "'Courier New', Courier, monospace" },
  { key: 'rounded', label: 'Rounded', family: "ui-rounded, 'SF Pro Rounded', 'Segoe UI', sans-serif" },
  { key: 'display', label: 'Display', family: "'Arial Black', Impact, sans-serif" },
  { key: 'elegant', label: 'Elegant', family: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif" },
  { key: 'condensed', label: 'Condensed', family: "'Arial Narrow', 'Helvetica Neue Condensed', sans-serif" },
]

export const ALIGN_OPTIONS = ['left', 'center', 'right']
export const VALIGN_OPTIONS = ['top', 'middle', 'bottom']
export const IMAGE_SIZE_OPTIONS = ['sm', 'md', 'lg']
export const FONT_SIZE_MIN = 7
export const FONT_SIZE_MAX = 100

const TEXT_SECTION_DEFAULT = { size: 16, color: '', font: 'sans', align: 'left', bold: false, italic: false, underline: false, x: 0, y: 0 }

// Per-section style, stored as one JSONB blob (`style` column) so new sections don't
// require a schema migration every time. Content (text/images) stays in its own columns.
// x/y are a fine-grained pixel nudge on top of the section's normal flow position — not a
// full free-position system, so the three templates' layouts never need to change shape.
export const DEFAULT_STYLE = {
  headline: { ...TEXT_SECTION_DEFAULT, size: 26, bold: true },
  subheadline: { ...TEXT_SECTION_DEFAULT, size: 16, bold: true },
  body: { ...TEXT_SECTION_DEFAULT, size: 14 },
  logo: { size: 40, align: 'left', x: 0, y: 0 },
  button: { size: 15, bg: '', color: '', align: 'left', x: 0, y: 0 },
  image: { size: 'md', x: 0, y: 0, overlay: true },
  background: { color: '' },
  layout: { v: 'middle' },
}

// Old rows may have style: null, or be missing keys added after they were created —
// fill in defaults per-section rather than replacing the whole object.
export function mergeStyle(raw) {
  const s = raw || {}
  return {
    headline: { ...DEFAULT_STYLE.headline, ...(s.headline || {}) },
    subheadline: { ...DEFAULT_STYLE.subheadline, ...(s.subheadline || {}) },
    body: { ...DEFAULT_STYLE.body, ...(s.body || {}) },
    logo: { ...DEFAULT_STYLE.logo, ...(s.logo || {}) },
    button: { ...DEFAULT_STYLE.button, ...(s.button || {}) },
    image: { ...DEFAULT_STYLE.image, ...(s.image || {}) },
    background: { ...DEFAULT_STYLE.background, ...(s.background || {}) },
    layout: { ...DEFAULT_STYLE.layout, ...(s.layout || {}) },
  }
}

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
    subheadline: fields.subheadline || null,
    body: fields.body || null,
    image_url: fields.image_url || null,
    image_path: fields.image_path || null,
    logo_url: fields.logo_url || null,
    logo_path: fields.logo_path || null,
    cta_label: fields.cta_label || null,
    cta_url: fields.cta_url || null,
    style: fields.style || DEFAULT_STYLE,
    status: 'pending',
    admin_notes: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'provider_id' })
  return { error: error?.message }
}

export async function fetchApprovedAnnouncements(limit = 10) {
  if (!supabase) return []
  const { data } = await supabase.from('provider_announcements')
    .select('id, template, headline, subheadline, body, image_url, logo_url, cta_label, cta_url, provider_id, style, providers(id, name)')
    .eq('status', 'approved').order('sort_order').order('reviewed_at', { ascending: false }).limit(limit)
  return data || []
}

// ── Admin-only (used from the admin panel, gated by a real Supabase Auth login) ──

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
    subheadline: fields.subheadline || null,
    body: fields.body || null,
    image_url: fields.image_url || null,
    image_path: fields.image_path || null,
    logo_url: fields.logo_url || null,
    logo_path: fields.logo_path || null,
    cta_label: fields.cta_label || null,
    cta_url: fields.cta_url || null,
    sort_order: fields.sort_order ?? 0,
    style: fields.style || DEFAULT_STYLE,
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

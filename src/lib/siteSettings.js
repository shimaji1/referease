import { supabase } from './supabase'
import { getSupabase } from './supabase-server'

// Generic key/value settings store. One row per category (key), value is JSONB.
// Public pages read via the server-side anon client; the admin panel reads/writes
// via the browser client. Every read has a hardcoded fallback so the site never
// breaks if a row hasn't been created yet.

export const DEFAULTS = {
  general: {
    site_name: 'ReferEasy',
    tagline: "Ontario's live physician-to-physician referral platform.",
    support_email: 'info.refereasy@gmail.com',
    social_facebook: '', social_twitter: '', social_instagram: '', social_linkedin: '',
  },
  seo: {
    default_meta_title: "ReferEasy, Ontario's Live Physician Referral Platform",
    default_meta_description: 'Find Ontario specialists, imaging centres, and clinics accepting referrals in real time. Cut rejected referrals to zero with verified availability, wait times, and referral criteria.',
    default_og_image: '/img/logo.png',
  },
  operations: {
    emails_paused: true,
  },
}

// ── Client-side (browser, admin panel) ──────────────────────────────────────

export async function fetchSetting(key) {
  if (!supabase) return DEFAULTS[key] || null
  const { data } = await supabase.from('site_settings').select('value').eq('key', key).maybeSingle()
  return data?.value ? { ...DEFAULTS[key], ...data.value } : (DEFAULTS[key] || null)
}

export async function saveSetting(key, value) {
  if (!supabase) return { error: 'Not connected' }
  const { error } = await supabase.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() })
  return { error: error?.message }
}

// ── Server-side (server components, cron routes) ───────────────────────────

export async function fetchSettingServer(key) {
  const sb = getSupabase()
  if (!sb) return DEFAULTS[key] || null
  const { data } = await sb.from('site_settings').select('value').eq('key', key).maybeSingle()
  return data?.value ? { ...DEFAULTS[key], ...data.value } : (DEFAULTS[key] || null)
}

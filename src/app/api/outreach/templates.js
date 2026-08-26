import { getServiceSupabase } from '@/lib/supabase-server'
import { DEFAULT_TEMPLATES, SUBJECTS, renderTemplate } from '@/lib/emailTemplateDefaults'

// Server-only layer on top of src/lib/emailTemplateDefaults.js: adds the DB lookup.
// Content lives in two places, in priority order:
//   1. The `email_templates` table (admin-editable via the dashboard's Email
//      Templates tab — see supabase-email-templates.sql).
//   2. DEFAULT_TEMPLATES, used whenever the DB is unreachable, a row is missing, or
//      anything goes wrong — sending must never break just because the
//      editable-content layer had a problem.

export { DEFAULT_TEMPLATES, SUBJECTS }

// Exported so a caller sending to many recipients (a campaign loop) can fetch once and
// reuse it, rather than round-tripping to the DB per recipient. Pass the result into
// getSubject/buildTemplate's third argument; omit it and they'll fetch it themselves.
export async function fetchTemplateRow(key) {
  try {
    const sb = getServiceSupabase()
    if (!sb) return null
    const { data } = await sb.from('email_templates').select('subject, body_html, body_html_featured').eq('key', key).maybeSingle()
    return data || null
  } catch (e) {
    return null
  }
}

function contentFor(key, row) {
  const def = DEFAULT_TEMPLATES[key] || DEFAULT_TEMPLATES.claim
  if (row) return { subject: row.subject || def.subject, body: row.body_html || def.body, bodyFeatured: row.body_html_featured || def.bodyFeatured }
  return { subject: def.subject, body: def.body, bodyFeatured: def.bodyFeatured }
}

export async function getSubject(key, opts = {}, preloadedRow) {
  const row = preloadedRow !== undefined ? preloadedRow : await fetchTemplateRow(key)
  return renderTemplate(key, contentFor(key, row), opts).subject
}

export async function buildTemplate(key, opts = {}, preloadedRow) {
  const row = preloadedRow !== undefined ? preloadedRow : await fetchTemplateRow(key)
  return renderTemplate(key, contentFor(key, row), opts).html
}

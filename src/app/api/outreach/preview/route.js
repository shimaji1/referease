import { buildTemplate } from '../templates'
import { renderTemplate } from '@/lib/emailTemplateDefaults'

const SAMPLE_END_DATE = new Date(Date.now() + 15 * 86400000).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })

function sampleOpts(template, tier) {
  const opts = { name: 'Sample Clinic Name', customMessage: '', tier, endDate: SAMPLE_END_DATE, acceptUrl: 'https://www.refereasy.ca/claim/accept?token=sample-token' }
  // trial_* templates read tier/endDate, claim_more_info's whole body IS the custom
  // message, claim_invite reads acceptUrl — without sample values here those preview
  // as "undefined" or blank.
  if (template === 'claim_more_info') opts.customMessage = 'Could you confirm the practice address on file, or send a callback number we can reach you at?'
  return opts
}

// GET — preview what's actually saved (or the default, if nothing's saved yet).
export async function GET(request) {
  const url = new URL(request.url)
  const template = url.searchParams.get('template') || 'claim'
  const tier = url.searchParams.get('tier') === 'featured' ? 'featured' : 'verified'
  const html = await buildTemplate(template, sampleOpts(template, tier))
  return new Response(html, { headers: { 'Content-Type': 'text/html' } })
}

// POST — preview unsaved draft content from the editor, so admin can check before
// hitting Save. Never touches the database; pure render of whatever was typed.
export async function POST(request) {
  const { template, tier: tierIn, subject, body, bodyFeatured } = await request.json().catch(() => ({}))
  const key = template || 'claim'
  const tier = tierIn === 'featured' ? 'featured' : 'verified'
  const { html } = renderTemplate(key, { subject, body, bodyFeatured }, sampleOpts(key, tier))
  return new Response(html, { headers: { 'Content-Type': 'text/html' } })
}

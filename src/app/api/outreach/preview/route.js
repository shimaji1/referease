import { buildTemplate } from '../templates'

export async function GET(request) {
  const url = new URL(request.url)
  const template = url.searchParams.get('template') || 'claim'
  const html = buildTemplate(template, { name: 'Sample Clinic Name', customMessage: '' })
  return new Response(html, { headers: { 'Content-Type': 'text/html' } })
}

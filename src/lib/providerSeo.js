// Shared between the sitemap and the public /doctors/[slug] page so the URLs
// generated in one place always match what the other expects.

export function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function providerSlug(p) {
  const bits = [p.name, p.type || p.category, extractCity(p.address)].filter(Boolean)
  const slug = slugify(bits.join(' '))
  return slug ? `${p.id}-${slug}` : String(p.id)
}

export function providerIdFromSlug(slug) {
  const id = parseInt(String(slug || ''), 10)
  return Number.isFinite(id) ? id : null
}

// Addresses are one free-text string ("123 Main St, Toronto, ON M5V 1A1"), and
// not consistently formatted — some have a unit/suite as the middle segment
// instead of a city. Only returns something when it's confident, since this is
// used in page titles — better to omit the city than show "Unit 314" as one.
export function extractCity(address) {
  if (!address) return null
  const parts = address.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length < 2) return null
  const candidate = parts[1]
  if (!candidate || /unit|suite|floor|^#|^\d/i.test(candidate) || /\d{3,}/.test(candidate)) return null
  return candidate
}

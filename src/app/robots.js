const BASE = 'https://www.refereasy.ca'

export default function robots() {
  return {
    rules: [
      // The admin path is deliberately NOT listed here — robots.txt is public, so
      // naming it would just hand crawlers (and anyone reading this file) the exact
      // URL it's meant to stay obscure from. It relies on real auth either way.
      { userAgent: '*', allow: '/', disallow: ['/dashboard', '/api'] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}

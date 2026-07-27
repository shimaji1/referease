const BASE = 'https://www.refereasy.ca'

export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/dashboard', '/api'] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}

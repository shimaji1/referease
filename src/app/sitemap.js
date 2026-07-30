import { supabase } from '@/lib/supabase'

const BASE = 'https://www.refereasy.ca'

export default async function sitemap() {
  const staticRoutes = [
    { url: BASE, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/search`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/pricing`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/blog`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/signup`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/login`, changeFrequency: 'monthly', priority: 0.4 },
  ].map(r => ({ ...r, lastModified: new Date() }))

  if (!supabase) return staticRoutes

  // Fetch all complete provider records, batched to beat PostgREST cap
  const fetchAll = async (table, select, filter) => {
    const out = []
    let from = 0
    const pageSize = 1000
    while (from < 20000) {
      let q = supabase.from(table).select(select).range(from, from + pageSize - 1)
      if (filter) q = filter(q)
      const { data, error } = await q
      if (error || !data || data.length === 0) break
      out.push(...data)
      if (data.length < pageSize) break
      from += pageSize
    }
    return out
  }

  try {
    const [providers, doctors, posts] = await Promise.all([
      fetchAll('providers', 'id, updated_at', q => q.eq('data_status', 'complete')),
      fetchAll('physicians', 'id, updated_at', q => q.eq('status', 'active')),
      fetchAll('posts', 'slug, updated_at, published_at', q => q.eq('published', true)),
    ])

    const providerUrls = providers.map(p => ({
      url: `${BASE}/search?id=${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }))
    const doctorUrls = doctors.map(d => ({
      url: `${BASE}/doctors/${d.id}`,
      lastModified: d.updated_at ? new Date(d.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }))
    const postUrls = (posts || []).map(p => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : (p.published_at ? new Date(p.published_at) : new Date()),
      changeFrequency: 'monthly',
      priority: 0.7,
    }))

    return [...staticRoutes, ...providerUrls, ...doctorUrls, ...postUrls]
  } catch {
    return staticRoutes
  }
}

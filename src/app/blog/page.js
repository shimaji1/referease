'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import TopNav from '@/components/TopNav'

export default function BlogPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.from('posts').select('id, slug, title, excerpt, published_at, author, cover_image').eq('published', true).order('published_at', { ascending: false }).range(0, 40)
      .then(({ data }) => { setPosts(data || []); setLoading(false) })
      .then(null, () => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <TopNav />
<section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-4">The ReferEasy Blog</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Referral wisdom, from the frontlines</h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          Practical guides for referring physicians, spotlights on Ontario specialists,
          and insights on making the referral process work, for you, and your patients.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading posts…</div>
        ) : posts.length === 0 ? (
          <div className="bg-gradient-to-br from-brand/5 to-brand/10 border border-brand/15 rounded-2xl p-10 text-center">
            <p className="text-4xl mb-4">✍️</p>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Posts coming soon</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              Our editorial calendar launches with our public rollout. Featured providers get
              spotlight articles as part of their subscription, reach every referring
              physician in Ontario.
            </p>
            <Link href="/pricing" className="inline-block px-6 py-3 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand-dark transition">See Featured plan →</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {posts.map(p => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-brand/30 transition group">
                {p.cover_image && <img src={p.cover_image} alt={p.title} className="w-full h-40 object-cover" />}
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-lg leading-snug group-hover:text-brand transition">{p.title}</h3>
                  {p.excerpt && <p className="text-sm text-gray-500 mt-2 line-clamp-3">{p.excerpt}</p>}
                  <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                    {p.author && <span>{p.author}</span>}
                    {p.published_at && <><span>·</span><span>{new Date(p.published_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</span></>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

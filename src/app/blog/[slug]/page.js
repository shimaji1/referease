'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import TopNav from '@/components/TopNav'

export default function BlogPostPage({ params }) {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const slug = params?.slug

  useEffect(() => {
    if (!supabase || !slug) return
    supabase.from('posts').select('*').eq('slug', slug).eq('published', true).single()
      .then(({ data }) => { setPost(data); setLoading(false) })
      .then(null, () => setLoading(false))
  }, [slug])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  if (!post) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <p className="text-4xl mb-3">🔍</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Post not found</h1>
      <p className="text-sm text-gray-500 mb-6">This article may have been moved or unpublished.</p>
      <Link href="/blog" className="text-sm font-semibold text-brand hover:underline">← Back to Blog</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      <TopNav />
<article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {post.cover_image && <img src={post.cover_image} alt={post.title} className="w-full rounded-2xl mb-8 aspect-video object-cover" />}
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-4">Blog</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">{post.title}</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          {post.author && <span className="font-medium">{post.author}</span>}
          {post.author && post.published_at && <span>·</span>}
          {post.published_at && <span>{new Date(post.published_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
        </div>
        <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
          {post.body || post.content}
        </div>
      </article>
    </div>
  )
}

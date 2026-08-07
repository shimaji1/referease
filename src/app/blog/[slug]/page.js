import Link from 'next/link'
import TopNav from '@/components/TopNav'
import { getSupabase } from '@/lib/supabase-server'

const BASE = 'https://www.refereasy.ca'

async function loadPost(slug) {
  const sb = getSupabase()
  if (!sb || !slug) return null
  const { data } = await sb.from('posts').select('*').eq('slug', slug).eq('published', true).maybeSingle()
  return data
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const post = await loadPost(slug)
  if (!post) return { title: 'Post not found' }

  const title = post.meta_title || post.title
  const description = post.meta_description || post.excerpt || undefined
  const image = post.og_image || post.cover_image

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `${BASE}/blog/${post.slug}`,
      images: image ? [{ url: image, width: 1200, height: 630, alt: post.title }] : undefined,
      publishedTime: post.published_at || undefined,
      authors: post.author ? [post.author] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params
  const post = await loadPost(slug)

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <TopNav />
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <p className="text-4xl mb-3">🔍</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Post not found</h1>
          <p className="text-sm text-gray-500 mb-6">This article may have been moved or unpublished.</p>
          <Link href="/blog" className="text-sm font-semibold text-brand hover:underline">← Back to Blog</Link>
        </div>
      </div>
    )
  }

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta_description || post.excerpt || undefined,
    image: post.og_image || post.cover_image || undefined,
    author: post.author ? { '@type': 'Person', name: post.author } : { '@type': 'Organization', name: 'ReferEasy' },
    publisher: { '@type': 'Organization', name: 'ReferEasy', logo: { '@type': 'ImageObject', url: `${BASE}/img/logo.png` } },
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE}/blog/${post.slug}` },
  }

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
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
        <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: post.body || '' }} />
      </article>
    </div>
  )
}

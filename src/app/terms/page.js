import TopNav from '@/components/TopNav'
import { fetchSettingServer } from '@/lib/siteSettings'
import { DEFAULT_TERMS_HTML } from '@/lib/legalDefaults'

export const metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of ReferEasy.',
}

// Admin-editable content — render fresh every request so a save shows up immediately.
export const dynamic = 'force-dynamic'

export default async function TermsPage() {
  const saved = await fetchSettingServer('legal_terms')
  const html = saved?.html || DEFAULT_TERMS_HTML
  const updated = saved?.updated_at
    ? new Date(saved.updated_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'August 7, 2026'

  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-4">Legal</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {updated}</p>
        <div className="prose prose-gray max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  )
}

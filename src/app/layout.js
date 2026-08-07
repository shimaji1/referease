import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import Footer from '@/components/Footer'
import PageTracker from '@/components/PageTracker'
import CookieBanner from '@/components/CookieBanner'
import { fetchSettingServer, DEFAULTS } from '@/lib/siteSettings'

const BASE = 'https://www.refereasy.ca'

// General/SEO settings are admin-editable in the DB. `dynamic` on the root layout would
// force every page in the app to skip static rendering, so instead this just revalidates
// every 60s — edits show up within a minute without sacrificing site-wide caching.
export const revalidate = 60

export async function generateMetadata() {
  const seo = await fetchSettingServer('seo') || DEFAULTS.seo
  const title = seo.default_meta_title
  const description = seo.default_meta_description
  const image = seo.default_og_image

  return {
    metadataBase: new URL(BASE),
    title: { default: title, template: '%s · ReferEasy' },
    description,
    keywords: ['physician referral Ontario', 'specialist referral', 'family doctor Ontario', 'accepting new patients', 'wait times Ontario', 'imaging clinic', 'referral platform Canada'],
    authors: [{ name: 'ReferEasy' }],
    creator: 'ReferEasy',
    publisher: 'ReferEasy',
    formatDetection: { email: false, address: false, telephone: false },
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'en_CA',
      url: BASE,
      siteName: 'ReferEasy',
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots: {
      index: true, follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    category: 'health',
  }
}

export default async function RootLayout({ children }) {
  const general = (await fetchSettingServer('general')) || DEFAULTS.general

  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: general.site_name,
    url: BASE,
    logo: `${BASE}/img/logo.png`,
    description: general.tagline,
    areaServed: { '@type': 'Place', name: 'Ontario, Canada' },
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: general.support_email, areaServed: 'CA', availableLanguage: ['English', 'French'] },
  }

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: general.site_name,
    url: BASE,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />
      </head>
      <body className="bg-gray-50 text-gray-900">
        <AuthProvider>
          <PageTracker />
          {children}
          <Footer settings={general} />
          <CookieBanner />
        </AuthProvider>
      </body>
    </html>
  )
}

import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import Footer from '@/components/Footer'

const BASE = 'https://www.refereasy.ca'

export const metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'ReferEasy — Ontario\'s Live Physician Referral Platform',
    template: '%s · ReferEasy',
  },
  description: 'Find Ontario specialists, imaging centres, and clinics accepting referrals in real time. Cut rejected referrals to zero with verified availability, wait times, and referral criteria.',
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
    title: 'ReferEasy — Ontario\'s Live Physician Referral Platform',
    description: 'Real-time availability, wait times, and referral criteria for Ontario physicians.',
    images: [{ url: '/img/hero.jpg', width: 1200, height: 630, alt: 'ReferEasy — Ontario physician referral platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReferEasy — Ontario\'s Live Physician Referral Platform',
    description: 'Real-time availability, wait times, and referral criteria for Ontario physicians.',
    images: ['/img/hero.jpg'],
  },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
  category: 'health',
}

const orgLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ReferEasy',
  url: BASE,
  logo: `${BASE}/img/logo.png`,
  description: 'Ontario\'s live physician-to-physician referral platform.',
  areaServed: { '@type': 'Place', name: 'Ontario, Canada' },
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: 'hello@refereasy.ca', areaServed: 'CA', availableLanguage: ['English', 'French'] },
}

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ReferEasy',
  url: BASE,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/search?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />
      </head>
      <body className="bg-gray-50 text-gray-900">
        <AuthProvider>
          {children}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}

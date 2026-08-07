export const metadata = {
  title: 'Blog',
  description: 'Practical guides for referring physicians, specialist spotlights, and insights on making the referral process work for Ontario physicians and patients.',
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    title: 'The ReferEasy Blog',
    description: 'Referral wisdom, from the frontlines.',
    url: 'https://www.refereasy.ca/blog',
  },
}

export default function BlogLayout({ children }) {
  return children
}

import Link from 'next/link'
import TopNav from '@/components/TopNav'
import { fetchSettingServer } from '@/lib/siteSettings'

export const metadata = {
  title: 'FAQ — ReferEasy',
  description: "Every common question about ReferEasy answered in one place: finding a doctor, claiming a listing, verification, billing, and more.",
}

export const dynamic = 'force-dynamic'

const GROUPS = [
  {
    id: 'general',
    title: 'General',
    items: [
      { q: 'What is ReferEasy?', a: "A live, provider-managed directory of family physicians, specialists, clinics, imaging centres, and labs across Ontario. Listings show real-time accepting-patients or accepting-referrals status, wait times, and referral criteria, kept current by the providers themselves." },
      { q: 'Who is ReferEasy for?', a: "Two groups, equally: the general public and patients looking for a family doctor accepting new patients, a specialist, or a clinic, and referring physicians looking for the right specialist to send a patient to." },
      { q: 'Can I use it to find a family doctor accepting new patients?', a: 'Yes — search by location and filter to family physicians currently accepting new patients. No account or login required.' },
      { q: 'Is ReferEasy free?', a: 'Yes, for everyone. Searching and viewing listings is free for the public and physicians. Providers can claim and manage a listing for free, with optional paid plans for extra visibility.' },
      { q: 'Is ReferEasy affiliated with CPSO or the Ministry of Health?', a: 'No. ReferEasy is an independent, privately built directory, not affiliated with the College of Physicians and Surgeons of Ontario or the Ministry of Health, though verified listings are cross-checked against the CPSO registry where applicable.' },
      { q: 'How is listing information kept accurate?', a: "Every listing is managed by the provider themselves, not scraped from an old source. Verified listings have completed email verification reviewed by ReferEasy's team." },
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts',
    items: [
      { q: 'How do I create an account?', a: 'Go to Sign Up and choose User (searching for care) or Provider (listing a practice). Takes under a minute.', link: { href: '/signup', label: 'Sign up →' } },
      { q: "What's the difference between a User and Provider account?", a: 'A User account searches and saves listings. A Provider account can claim, create, and manage listings, invite staff, and access billing.' },
      { q: 'Can I switch account types later?', a: "Yes, anytime from Settings → Account Information → Account Type. Switching away from Provider unclaims any listing(s) you manage — they stay live in the directory without an owner, and anyone (including you later) can claim them again." },
    ],
  },
  {
    id: 'claiming',
    title: 'Claiming a listing',
    items: [
      { q: "How do I claim my practice's listing?", a: "Search for it from your dashboard's Claim Your Listing page by name, phone, fax, or practitioner number, then complete email verification.", link: { href: '/support#claim', label: 'Full walkthrough →' } },
      { q: 'Do I need a CPSO profile link?', a: "Optional for individual physicians, and not applicable to clinics or facilities at all. It speeds up review, but you can skip it and our team will look you up or follow up if needed." },
      { q: 'Is every claim reviewed by a person?', a: 'Yes, always. Nothing is auto-approved, even when the email and CPSO evidence all line up cleanly. If something is missing, we email you asking for it.' },
      { q: 'How long does claim review take?', a: 'Usually 1–2 business days.' },
    ],
  },
  {
    id: 'listing',
    title: 'Building your listing',
    items: [
      { q: 'What information should I include?', a: 'Referral criteria, requirements, referral types, and specific services, not just your specialty name. The more complete it is, the more accurate the referrals you receive.', link: { href: '/support#great-listing', label: 'Full guide →' } },
      { q: 'Can I set different wait times for different locations?', a: 'Yes. Wait time can be set per linked location, not just one number for everywhere you work, and now supports same-day, 24, 48, or 72 hours as well as a number of weeks.' },
      { q: 'Can I upload my referral or requisition forms?', a: "Yes, from your listing's Forms section (limits depend on plan). A referring physician who can download your exact form is far less likely to send an incomplete referral." },
      { q: 'What happens when I add a doctor under my clinic listing?', a: "It creates a directory profile for them, not a login. They can't manage it until they separately sign up and claim it themselves — worth encouraging them to do." },
    ],
  },
  {
    id: 'staff-billing',
    title: 'Staff & billing',
    items: [
      { q: 'Can I give my staff their own login?', a: 'Yes, from Settings → Staff & Team, invite by email, no password sharing. Limits depend on plan.', link: { href: '/pricing', label: 'See plans →' } },
      { q: 'How much does ReferEasy cost?', a: 'Listed is free forever. Verified is $29/month, Featured is $79/month, both with a 60-day free trial.' },
      { q: 'Do I need a credit card to start a trial?', a: 'No. Trials start free with no card. Add a payment method anytime from Settings → Billing to keep the plan when the trial ends.' },
      { q: 'When am I actually charged?', a: "Not until your trial ends, even if you add a card on day one. Cancel anytime before then and you're never charged." },
    ],
  },
]

export default async function FaqPage() {
  const general = await fetchSettingServer('general')
  const supportEmail = general?.support_email || 'info.refereasy@gmail.com'

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: GROUPS.flatMap(g => g.items).map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <TopNav />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">FAQ</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Every question, one place</h1>
        <p className="text-gray-600 mb-8">For a step-by-step walkthrough of claiming and building a listing, see the <Link href="/support" className="text-brand font-semibold hover:underline">full support guide</Link>. This page is the quick-reference version.</p>

        <nav className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-x-5 gap-y-1.5">
          {GROUPS.map(g => (
            <a key={g.id} href={`#${g.id}`} className="text-xs font-semibold text-brand hover:underline">{g.title}</a>
          ))}
        </nav>

        {GROUPS.map(g => (
          <section key={g.id} id={g.id} className="scroll-mt-20 py-8 border-b border-gray-100 last:border-0">
            <h2 className="text-xl font-bold text-gray-900 mb-5">{g.title}</h2>
            <div className="space-y-5">
              {g.items.map((item, i) => (
                <div key={i}>
                  <h3 className="text-sm font-bold text-gray-900">{item.q}</h3>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {item.a}
                    {item.link && <> <Link href={item.link.href} className="text-brand font-semibold hover:underline">{item.link.label}</Link></>}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <p className="text-sm text-gray-500 mt-8">Still stuck? Email <a href={`mailto:${supportEmail}`} className="text-brand font-semibold hover:underline">{supportEmail}</a>.</p>
      </section>
    </div>
  )
}

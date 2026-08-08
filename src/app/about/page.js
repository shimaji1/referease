import Link from 'next/link'
import TopNav from '@/components/TopNav'

export const metadata = {
  title: "About ReferEasy — Find a Doctor & Physician Referrals in Ontario",
  description: "ReferEasy is Ontario's live directory of family physicians, specialists, clinics, imaging centres, and labs. Free for the public to find a doctor accepting new patients, and free for physicians to send accurate referrals.",
}

const faqs = [
  { q: 'What is ReferEasy?', a: "ReferEasy is a live, provider-managed directory of family physicians, specialists, clinics, imaging centres, and labs across Ontario. Listings show real-time accepting-new-patients or accepting-referrals status, current wait times, and referral requirements, kept up to date by the providers themselves." },
  { q: 'Who is ReferEasy for?', a: "Two groups, equally. Members of the public and patients use it to find a family doctor accepting new patients, or a specialist, clinic, or imaging centre near them. Referring physicians and their office staff use it to find the right specialist for a patient, confirm they're accepting referrals, and send a complete referral the first time." },
  { q: 'Can I use ReferEasy to find a family doctor accepting new patients?', a: 'Yes. Search by location and filter to family physicians currently accepting new patients, no account or login required.' },
  { q: 'Is ReferEasy free?', a: 'Yes, for everyone. Searching, viewing listings, and downloading referral forms is free for the public and for physicians. Providers can claim and manage their own listing for free, with optional paid plans for extra visibility.' },
  { q: 'Is ReferEasy affiliated with CPSO or the Ontario Ministry of Health?', a: 'No. ReferEasy is an independent, privately built directory. It is not affiliated with the College of Physicians and Surgeons of Ontario (CPSO) or the Ministry of Health, though verified provider listings are cross-checked against CPSO where applicable.' },
  { q: 'How is the information kept accurate and current?', a: "Every listing is managed by the provider themselves, not scraped from an old directory. Providers marked Verified have completed a fax and email verification process reviewed by ReferEasy's team before the badge is granted." },
]

export default function AboutPage() {
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <TopNav />
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-4">About us</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Ontario's live directory for finding a doctor,<br />and for physician referrals.
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          ReferEasy is a free, provider-managed directory covering all of Ontario. If you're a
          patient or a member of the public looking for a family doctor accepting new patients, a
          specialist, a clinic, or an imaging centre, this is a free search, no account needed. If
          you're a referring physician, it's built to make sure the referral you send is complete,
          well-matched, and going somewhere that will actually take it.
        </p>
      </section>

      {/* Who it's for — the two audiences, explicitly */}
      <section className="bg-gray-50 border-y border-gray-200 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">For patients & the public</h2>
            <p className="text-gray-600 leading-relaxed">
              Search family physicians accepting new patients, specialists, clinics, imaging centres,
              and labs anywhere in Ontario. See real, current accepting-patients status, hours, and
              location before you call, no login, no cost. <Link href="/search" className="text-brand font-semibold hover:underline">Search now →</Link>
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">For referring physicians</h2>
            <p className="text-gray-600 leading-relaxed">
              Find a specialist who's actually accepting referrals, see their criteria and wait time,
              and download their intake form, all before you send anything. Provider-managed
              profiles, not a static directory scraped once and never touched again.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Our mission</h2>
            <p className="text-gray-600 leading-relaxed">
              Make it easy to find real, current healthcare availability in Ontario, whether that's
              a patient looking for a family doctor taking new patients, or a physician trying to
              refer someone to the right specialist without a rejected fax and a reset clock.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">How we're different</h2>
            <p className="text-gray-600 leading-relaxed">
              Provider-managed profiles. Real-time availability. Referral criteria in plain
              language. No hoops, no guessing, and no stale data pulled from a directory nobody's
              updated in years.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 border-y border-gray-200 max-w-full py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">What we care about</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { t: 'Accuracy', d: 'Every listing is provider-managed and verified. Real data. Not scraped, not stale.' },
            { t: 'Speed', d: 'One search finds the right doctor or specialist. Not ten phone calls, not a fax roulette.' },
            { t: 'Fairness', d: 'Every provider can be listed, free. Paid tiers get you featured, not gatekept.' },
          ].map(v => (
            <div key={v.t} className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{v.t}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{v.d}</p>
            </div>
          ))}
        </div>
      </div>
      </section>

      {/* FAQ — direct answers, matches the JSON-LD above */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Frequently asked</h2>
        <div className="space-y-6 max-w-2xl mx-auto">
          {faqs.map(f => (
            <div key={f.q}>
              <h3 className="text-sm font-bold text-gray-900">{f.q}</h3>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Founder note */}
      <section className="bg-gradient-to-br from-brand to-[#2c4f7c] text-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70 mb-4">From the founder</p>
          <blockquote className="text-xl sm:text-2xl font-medium leading-relaxed">
            "I watched too many patients wait months for a referral that ended up rejected
            because of a paperwork mismatch, and too many people struggle just to find a family
            doctor taking new patients. ReferEasy is my answer, a live, honest directory that
            works for both sides."
          </blockquote>
          <p className="text-sm text-white/70 mt-6">, Shima Janati · Founder, ReferEasy</p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Find a doctor, or list your practice</h2>
        <p className="text-gray-600 mb-8">Family doctors, specialists, imaging centres, labs, all in one place, free to search.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/search" className="px-6 py-3 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand-dark transition">Find care →</Link>
          <Link href="/signup" className="px-6 py-3 bg-white text-brand text-sm font-bold rounded-xl border border-brand hover:bg-brand/5 transition">List your practice, free</Link>
        </div>
      </section>
    </div>
  )
}

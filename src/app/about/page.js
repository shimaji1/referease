import Link from 'next/link'
import TopNav from '@/components/TopNav'

export const metadata = {
  title: 'About ReferEasy — Ontario\'s referral platform',
  description: 'Built by physicians for physicians. Our mission is to eliminate referral rejections and cut wait times through real-time provider availability.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <TopNav />
{/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-4">About us</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Making referrals in Ontario<br />actually work.
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Every day, family physicians across Ontario send referrals into a black box.
          Sometimes they're accepted. Often they're rejected — for the wrong specialty,
          the wrong catchment, missing paperwork, or a full roster. Patients wait.
          We built ReferEasy to fix that.
        </p>
      </section>

      {/* Mission */}
      <section className="bg-gray-50 border-y border-gray-200 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Our mission</h2>
            <p className="text-gray-600 leading-relaxed">
              Cut rejected referrals to zero. Every physician deserves to know — in real time —
              which specialist is accepting referrals, what their current wait is, what
              paperwork they need, and where to send it.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">How we're different</h2>
            <p className="text-gray-600 leading-relaxed">
              Provider-managed profiles. Real-time availability. Referral criteria in plain
              language. Direct fax and secure email. No hoops. No guessing. Built specifically
              for the way Ontario physicians actually work.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">What we care about</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { t: 'Accuracy', d: 'Every listing is provider-managed and verified. Real data. Not scraped, not stale.' },
            { t: 'Speed', d: 'One search finds the right specialist. Not ten phone calls, not a fax roulette.' },
            { t: 'Fairness', d: 'Every physician can be listed. Free tier gets you found. Paid tiers get you featured.' },
          ].map(v => (
            <div key={v.t} className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{v.t}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{v.d}</p>
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
            because of a paperwork mismatch. ReferEasy is my answer — a live, honest,
            physician-friendly directory that makes the first attempt the right one."
          </blockquote>
          <p className="text-sm text-white/70 mt-6">— Shima Janati · Founder, ReferEasy</p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Join the physicians using ReferEasy</h2>
        <p className="text-gray-600 mb-8">Family docs, specialists, imaging centres, labs — all in one place.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/search" className="px-6 py-3 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand-dark transition">Find care →</Link>
          <Link href="/signup" className="px-6 py-3 bg-white text-brand text-sm font-bold rounded-xl border border-brand hover:bg-brand/5 transition">List your practice</Link>
        </div>
      </section>
    </div>
  )
}

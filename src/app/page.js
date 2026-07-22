'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const paths = {
  search: 'M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  shield: 'M9 12l2 2 4-4m5.6-2.8A11.9 11.9 0 0112 21 11.9 11.9 0 013.4 7.2 12 12 0 0012 3a12 12 0 008.6 4.2z',
  file: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.6L18 7.4V19a2 2 0 01-2 2zM13 3v5h5',
  doctor: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  filter: 'M3 4h18M7 12h10M11 20h2',
  fax: 'M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-12-3h12v6H6v-6z',
  check: 'M5 13l4 4L19 7',
}
function Icon({ name, className = 'w-5 h-5' }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={paths[name]} /></svg>
}

function Nav() {
  return (
    <nav className="bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">R</span></div>
          <span className="text-xl font-bold text-gray-900">Refer<span className="text-brand">Easy</span></span>
        </Link>
        <div className="hidden sm:flex items-center gap-6">
          <Link href="/search" className="text-sm font-medium text-gray-600 hover:text-brand transition">Find care</Link>
          <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-brand transition">Pricing</Link>
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-brand transition">Sign in</Link>
          <Link href="/signup" className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-dark transition">List your practice</Link>
        </div>
        <Link href="/search" className="sm:hidden px-4 py-2 bg-brand text-white text-sm font-semibold rounded-lg">Search</Link>
      </div>
    </nav>
  )
}

const fmt = (n) => n == null ? '—' : n >= 1000 ? `${(Math.floor(n / 100) / 10).toLocaleString()}k+` : n >= 100 ? `${Math.floor(n / 100) * 100}+` : `${n}`

export default function HomePage() {
  const [counts, setCounts] = useState({ prov: null, docs: null, specs: null })
  const [featured, setFeatured] = useState([])

  useEffect(() => {
    if (!supabase) return
    Promise.all([
      supabase.from('providers').select('id', { count: 'exact', head: true }).eq('data_status', 'complete'),
      supabase.from('physicians').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('specialties').select('snomed_code', { count: 'exact', head: true }),
      supabase.from('providers').select('id, name, type, rating, accepting_referrals, verified').eq('data_status', 'complete').not('rating', 'is', null).order('rating', { ascending: false }).limit(6),
    ]).then(([p, d, sp, f]) => {
      setCounts({ prov: p.count, docs: d.count, specs: sp.count })
      if (f.data) setFeatured(f.data)
    })
  }, [])

  const features = [
    { icon: 'clock', title: 'Real-time availability', text: 'See who is accepting referrals right now, with provider-managed wait times — before you send anything.' },
    { icon: 'file', title: 'Criteria & forms up front', text: 'Referral requirements and downloadable intake forms on every profile, so referrals arrive complete the first time.' },
    { icon: 'shield', title: 'Verified providers', text: 'Listings verified in three steps — fax code, email code, and ID — so contact details actually work.' },
    { icon: 'doctor', title: 'Doctor-level profiles', text: 'Refer to a physician, not just a building. Every doctor has their own profile, availability, and locations.' },
    { icon: 'filter', title: 'Smart filters', text: 'Filter by specialty, language, wait time, distance, hours, and gender to find the right match for your patient.' },
    { icon: 'fax', title: 'Built for how you work', text: 'Fax numbers, phone, hours and addresses front and centre — the details your office actually uses.' },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand to-[#16304f] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60 mb-4">Ontario healthcare referral platform</p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-5">Referrals that don't<br className="hidden sm:block" /> bounce back.</h1>
          <p className="text-base sm:text-lg text-white/75 max-w-2xl mx-auto mb-9">Find specialists who are actually accepting, see their criteria and wait times, download their forms — and send complete referrals the first time.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
            <Link href="/search" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-brand font-bold rounded-xl hover:bg-gray-100 transition text-sm">
              <Icon name="search" className="w-4 h-4" /> Search providers
            </Link>
            <Link href="/signup" className="inline-flex items-center justify-center px-7 py-3.5 bg-white/10 border border-white/25 text-white font-semibold rounded-xl hover:bg-white/20 transition text-sm">List your practice — free</Link>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
            <div><div className="text-3xl font-bold">{fmt(counts.prov)}</div><div className="text-xs text-white/60 mt-1">Providers listed</div></div>
            <div><div className="text-3xl font-bold">{fmt(counts.docs)}</div><div className="text-xs text-white/60 mt-1">Doctor profiles</div></div>
            <div><div className="text-3xl font-bold">{fmt(counts.specs)}</div><div className="text-xs text-white/60 mt-1">Specialties</div></div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3">Three steps to a clean referral</h2>
        <p className="text-sm text-gray-500 text-center mb-12 max-w-xl mx-auto">Rejected referrals cost your staff hours and your patients weeks. ReferEasy removes the guesswork.</p>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { n: '1', t: 'Search live availability', d: 'Filter by specialty, wait time, language and distance. Only see providers who can actually take your patient.' },
            { n: '2', t: 'Check criteria & forms', d: 'Every profile shows referral requirements and downloadable forms, so nothing is missing.' },
            { n: '3', t: 'Send with confidence', d: 'Fax and contact details are verified and current. Complete referral, right provider, first try.' },
          ].map(sp => (
            <div key={sp.n} className="relative bg-gray-50 border border-gray-200 rounded-2xl p-6">
              <div className="w-9 h-9 rounded-xl bg-brand text-white font-bold flex items-center justify-center text-sm mb-4">{sp.n}</div>
              <h3 className="font-bold text-gray-900 mb-2">{sp.t}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{sp.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">Everything a referral needs, in one place</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.title} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-brand/30 transition">
                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-4"><Icon name={f.icon} /></div>
                <h3 className="font-bold text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Top-rated providers</h2>
            <Link href="/search" className="text-sm font-semibold text-brand hover:underline">View all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map(p => (
              <Link key={p.id} href={`/search?id=${p.id}`} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-brand/30 transition block">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">{p.name}</h3>
                  {p.verified && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 shrink-0">✓</span>}
                </div>
                <p className="text-xs text-brand/70 font-medium mb-3">{p.type}</p>
                <div className="flex items-center gap-2">
                  {p.rating && <span className="text-xs font-semibold text-amber-500">★ {Number(p.rating).toFixed(1)}</span>}
                  {p.accepting_referrals && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Accepting</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Specialist CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-gradient-to-r from-brand to-[#2c4f7c] rounded-3xl px-8 py-12 sm:px-14 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Are you a specialist or clinic?</h2>
          <p className="text-white/75 text-sm sm:text-base max-w-xl mx-auto mb-8">Your listing may already be here. Claim it, verify it, and control your availability, criteria and forms — so the referrals you receive are the ones you want.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="px-7 py-3.5 bg-white text-brand font-bold rounded-xl hover:bg-gray-100 transition text-sm">Claim your listing</Link>
            <Link href="/pricing" className="px-7 py-3.5 bg-white/10 border border-white/25 font-semibold rounded-xl hover:bg-white/20 transition text-sm">See pricing</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">R</span></div>
            <span className="font-bold text-gray-900">Refer<span className="text-brand">Easy</span></span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/search" className="hover:text-brand">Find care</Link>
            <Link href="/pricing" className="hover:text-brand">Pricing</Link>
            <Link href="/signup" className="hover:text-brand">List your practice</Link>
          </div>
          <p className="text-xs text-gray-400">© 2026 ReferEasy · Ontario, Canada</p>
        </div>
      </footer>
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const IMG = {
  hero: '/img/hero.jpg',
  problem: '/img/invite.jpg',
  cta: '/img/consult2.jpg',
}

const paths = {
  search: 'M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  shield: 'M9 12l2 2 4-4m5.6-2.8A11.9 11.9 0 0112 21 11.9 11.9 0 013.4 7.2 12 12 0 0012 3a12 12 0 008.6 4.2z',
  file: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.6L18 7.4V19a2 2 0 01-2 2zM13 3v5h5',
  doctor: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  filter: 'M3 4h18M7 12h10M11 20h2',
  fax: 'M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-12-3h12v6H6v-6z',
  check: 'M5 13l4 4L19 7',
  x: 'M6 18L18 6M6 6l12 12',
}
function Icon({ name, className = 'w-5 h-5' }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={paths[name]} /></svg>
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
    { icon: 'shield', title: 'Verified providers', text: 'Listings verified in three steps — fax code, email code, and ID — so the contact details actually work.' },
    { icon: 'doctor', title: 'Doctor-level profiles', text: 'Refer to a physician, not just a building. Every doctor has their own profile, availability, and locations.' },
    { icon: 'filter', title: 'Smart filters', text: 'Filter by specialty, language, wait time, distance, hours, and gender to find the right match for your patient.' },
    { icon: 'fax', title: 'Built for how you work', text: 'Fax numbers, phone, hours and addresses front and centre — the details your office actually uses.' },
  ]

  const faqs = [
    { q: 'Is ReferEasy free for family physicians?', a: 'Yes — searching, filtering, and downloading referral forms is free for referring physicians and their staff, always.' },
    { q: 'How do I know the information is current?', a: 'Providers manage their own availability, wait times and criteria, and verified listings have confirmed their fax and email with one-time codes plus ID.' },
    { q: "I'm a specialist — is my clinic already listed?", a: 'Very likely. We list thousands of Ontario providers. Create a free account, search your name or clinic, and claim your listing to take control of it.' },
    { q: 'What does claiming a listing involve?', a: 'Three quick steps: a code faxed to your practice, a code emailed to you, and an ID or credential upload. It protects your listing from being edited by anyone else.' },
    { q: 'Do referrals go through ReferEasy?', a: 'No — you keep your existing workflow. ReferEasy makes sure the referral you fax is complete, well-matched, and going to someone who can take it.' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">R</span></div>
            <span className="text-xl font-bold text-gray-900">Refer<span className="text-[#2563eb]">Easy</span></span>
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

      {/* Hero — text + image */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 sm:pt-20 sm:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-4">Ontario healthcare referral platform</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-[1.1] mb-5">Referrals that don't bounce back.</h1>
            <p className="text-base sm:text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">Find specialists who are actually accepting, see their criteria and wait times, download their forms — and send complete referrals the first time.</p>
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link href="/search" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition text-sm shadow-lg shadow-brand/20">
                <Icon name="search" className="w-4 h-4" /> Search providers
              </Link>
              <Link href="/signup" className="inline-flex items-center justify-center px-7 py-3.5 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-brand hover:text-brand transition text-sm">List your practice — free</Link>
            </div>
            <div className="inline-flex items-center gap-3 bg-brand/5 border border-brand/15 rounded-2xl px-5 py-3">
              <div className="text-4xl font-extrabold text-brand leading-none">0</div>
              <div className="text-sm text-gray-600 leading-snug">rejected referrals from<br/><span className="font-semibold text-gray-900">complete, well-matched</span> submissions</div>
            </div>
            <div className="flex gap-8 mt-8">
              <div><div className="text-2xl font-bold text-gray-900">1,000+</div><div className="text-xs text-gray-400 mt-0.5">Specialists</div></div>
              <div><div className="text-2xl font-bold text-gray-900">1,000+</div><div className="text-xs text-gray-400 mt-0.5">Doctors</div></div>
              <div><div className="text-2xl font-bold text-gray-900">{fmt(counts.specs)}</div><div className="text-xs text-gray-400 mt-0.5">Specialties</div></div>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-brand/10">
              <img src={IMG.hero} alt="Physician reviewing patient information" className="w-full h-[480px] object-cover" />
            </div>
            <div className="absolute -left-8 top-10 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center"><Icon name="check" className="w-4 h-4" /></div>
              <div><div className="text-xs font-bold text-gray-900">Accepting referrals</div><div className="text-[10px] text-gray-400">Dr. M. Chen · Cardiology</div></div>
            </div>
            <div className="absolute -right-4 bottom-14 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center"><Icon name="clock" className="w-4 h-4" /></div>
              <div><div className="text-xs font-bold text-gray-900">~2 week wait</div><div className="text-[10px] text-gray-400">Updated by the provider</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem / solution */}
      <section className="bg-brand text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-3xl overflow-hidden order-2 lg:order-1 hidden sm:block">
              <img src={IMG.problem} alt="Clinic administrator at work" className="w-full h-[380px] object-cover opacity-90" />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Every rejected referral costs your patient weeks.</h2>
              <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-8">Wrong specialist. Missing requirements. A roster that closed months ago. The fax goes out, the rejection comes back, and the clock restarts. ReferEasy exists to end that loop.</p>
              <ul className="space-y-4">
                {[
                  ['x', 'Before', 'Guess who might be accepting, fax, wait, get rejected, start over.'],
                  ['check', 'With ReferEasy', 'Confirm availability, match the criteria, attach the right form — send once.'],
                ].map(([ic, t, d]) => (
                  <li key={t} className="flex gap-4 items-start">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ic === 'x' ? 'bg-white/10 text-white/50' : 'bg-white text-brand'}`}><Icon name={ic} className="w-4 h-4" /></div>
                    <div><div className="text-sm font-bold">{t}</div><div className="text-sm text-white/70">{d}</div></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3">Three steps to a clean referral</h2>
        <p className="text-sm text-gray-500 text-center mb-12 max-w-xl mx-auto">Built around the workflow your office already has — nothing to install, nothing to change.</p>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            ['1', 'Search live availability', 'Filter by specialty, wait time, language and distance. Only see providers who can actually take your patient.'],
            ['2', 'Check criteria & forms', 'Every profile shows referral requirements and downloadable forms, so nothing is missing.'],
            ['3', 'Send with confidence', 'Fax and contact details are verified and current. Complete referral, right provider, first try.'],
          ].map(([n, t, d]) => (
            <div key={n} className="relative bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:border-brand/30 transition">
              <div className="w-9 h-9 rounded-xl bg-brand text-white font-bold flex items-center justify-center text-sm mb-4">{n}</div>
              <h3 className="font-bold text-gray-900 mb-2">{t}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{d}</p>
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
                  {p.verified && <span className="text-[10px] font-bold text-brand bg-brand/5 px-2 py-0.5 rounded-full border border-brand/15 shrink-0">✓ Verified</span>}
                </div>
                <p className="text-xs text-brand/70 font-medium mb-3">{p.type}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {p.rating && <span className="font-semibold text-gray-700">★ {Number(p.rating).toFixed(1)}</span>}
                  {p.accepting_referrals && <span className="font-semibold text-brand">Accepting referrals</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">Common questions</h2>
        <div className="space-y-3">
          {faqs.map(f => (
            <details key={f.q} className="group bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 open:bg-white open:shadow-sm">
              <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-bold text-gray-900">
                {f.q}
                <span className="text-brand text-lg leading-none group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-sm text-gray-500 leading-relaxed pt-3">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA with image */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="relative rounded-3xl overflow-hidden">
          <img src={IMG.cta} alt="Modern medical clinic" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-brand/85" />
          <div className="relative px-8 py-14 sm:px-14 text-center text-white">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Are you a specialist or clinic?</h2>
            <p className="text-white/80 text-sm sm:text-base max-w-xl mx-auto mb-8">Your listing may already be here. Claim it, verify it, and control your availability, criteria and forms — so the referrals you receive are the ones you want.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup" className="px-7 py-3.5 bg-white text-brand font-bold rounded-xl hover:bg-gray-100 transition text-sm">Claim your listing</Link>
              <Link href="/pricing" className="px-7 py-3.5 bg-white/10 border border-white/30 font-semibold rounded-xl hover:bg-white/20 transition text-sm">See pricing</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">R</span></div>
            <span className="font-bold text-gray-900">Refer<span className="text-[#2563eb]">Easy</span></span>
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

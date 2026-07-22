'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const DEFAULTS = {
  tiers: [
    { name: 'Basic', price: 'Free', period: '', tagline: 'Get listed and discoverable', features: ['Public listing on ReferEasy', 'Searchable doctor profiles', 'Referral criteria displayed', 'Contact details & hours'], cta: 'List your practice', highlight: false },
    { name: 'Verified', price: '$29', period: '/month', tagline: 'Stand out and build trust', features: ['Everything in Basic', 'Verified badge (fax + email + ID)', 'Priority placement in search', 'Real-time availability updates', 'Upload referral & intake forms'], cta: 'Get verified', highlight: true },
    { name: 'Clinic', price: '$99', period: '/month', tagline: 'For multi-doctor clinics', features: ['Everything in Verified', 'Unlimited doctor profiles', 'Multi-location management', 'Team access', 'Priority support'], cta: 'Contact us', highlight: false },
  ]
}

export default function PricingPage() {
  const [pricing, setPricing] = useState(DEFAULTS)

  useEffect(() => {
    if (!supabase) return
    supabase.from('site_settings').select('value').eq('key', 'pricing').single().then(({ data }) => {
      if (data?.value?.tiers?.length) setPricing(data.value)
    })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">R</span></div>
            <span className="text-xl font-bold text-gray-900">Refer<span className="text-brand">Easy</span></span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/search" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-brand transition">Find care</Link>
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-brand transition">Sign in</Link>
            <Link href="/signup" className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-dark transition">Get started</Link>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">Pricing</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple plans for providers</h1>
          <p className="text-sm sm:text-base text-gray-500 max-w-xl mx-auto">Searching is always free for family physicians. Providers choose how visible they want to be.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
          {(pricing.tiers || []).map((t, i) => (
            <div key={i} className={`relative rounded-3xl p-7 flex flex-col ${t.highlight ? 'bg-brand text-white shadow-xl ring-1 ring-brand/40 sm:-my-3' : 'bg-white border border-gray-200'}`}>
              {t.highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-gray-900 px-3 py-1 rounded-full">Most popular</span>}
              <h3 className={`font-bold text-lg ${t.highlight ? 'text-white' : 'text-gray-900'}`}>{t.name}</h3>
              <p className={`text-xs mb-5 ${t.highlight ? 'text-white/70' : 'text-gray-500'}`}>{t.tagline}</p>
              <div className="mb-6">
                <span className={`text-4xl font-bold ${t.highlight ? 'text-white' : 'text-gray-900'}`}>{t.price}</span>
                <span className={`text-sm ${t.highlight ? 'text-white/70' : 'text-gray-400'}`}>{t.period}</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {(t.features || []).filter(Boolean).map((f, fi) => (
                  <li key={fi} className={`flex items-start gap-2 text-sm ${t.highlight ? 'text-white/85' : 'text-gray-600'}`}>
                    <svg className={`w-4 h-4 mt-0.5 shrink-0 ${t.highlight ? 'text-amber-300' : 'text-emerald-500'}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className={`text-center px-5 py-3 rounded-xl font-bold text-sm transition ${t.highlight ? 'bg-white text-brand hover:bg-gray-100' : 'bg-brand text-white hover:bg-brand-dark'}`}>{t.cta || 'Get started'}</Link>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto mt-16 bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
          <h3 className="font-bold text-gray-900 mb-2">Free for referring physicians</h3>
          <p className="text-sm text-gray-500 mb-4">Family doctors and their staff search, filter, and download forms at no cost — always.</p>
          <Link href="/search" className="inline-flex px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-brand hover:text-brand transition text-sm">Start searching</Link>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm font-bold text-gray-900">Refer<span className="text-brand">Easy</span></span>
          <p className="text-xs text-gray-400">© 2026 ReferEasy · Ontario, Canada</p>
        </div>
      </footer>
    </div>
  )
}

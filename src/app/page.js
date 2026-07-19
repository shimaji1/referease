'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'

const NAV_LINKS = [
  { label: 'Search Providers', href: '/search' },
  { label: 'For Specialists', href: '#for-specialists' },
  { label: 'About', href: '#about' },
]

function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, profile } = useAuth()
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Refer<span className="text-brand">Ease</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <Link key={l.label} href={l.href} className="text-sm font-medium text-gray-600 hover:text-brand transition">{l.label}</Link>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="text-sm font-semibold text-white bg-brand hover:bg-brand-dark px-5 py-2.5 rounded-lg transition shadow-sm">
                {profile?.full_name?.split(' ')[0] || 'Dashboard'} →
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-brand px-4 py-2 transition">Sign In</Link>
                <Link href="/signup" className="text-sm font-semibold text-white bg-brand hover:bg-brand-dark px-5 py-2.5 rounded-lg transition shadow-sm">Sign Up Free</Link>
              </>
            )}
          </div>
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
          </button>
        </div>
        {open && (
          <div className="md:hidden pb-4 border-t border-gray-100 mt-2 pt-3 space-y-2">
            {NAV_LINKS.map(l => <Link key={l.label} href={l.href} className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded">{l.label}</Link>)}
            <div className="flex gap-2 px-3 pt-2">
              {user ? (
                <Link href="/dashboard" className="flex-1 text-center text-sm font-semibold text-white bg-brand px-4 py-2 rounded-lg">Dashboard</Link>
              ) : (
                <>
                  <Link href="/login" className="flex-1 text-center text-sm font-medium text-gray-600 border border-gray-300 px-4 py-2 rounded-lg">Sign In</Link>
                  <Link href="/signup" className="flex-1 text-center text-sm font-semibold text-white bg-brand px-4 py-2 rounded-lg">Sign Up</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-brand-dark">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)' }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative z-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-white/10">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Now live in Thornhill & GTA, Ontario
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Cut your referral<br />rejections to <span className="text-emerald-400">zero</span>.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl">
            Real-time specialist availability, wait times, and referral criteria — all in one place. 
            Stop guessing. Start referring with confidence.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link href="/search" className="inline-flex justify-center items-center px-7 py-3.5 bg-white text-brand font-semibold rounded-xl hover:bg-gray-100 transition shadow-lg text-sm">
              Search Providers →
            </Link>
            <Link href="/signup" className="inline-flex justify-center items-center px-7 py-3.5 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition border border-white/20 text-sm backdrop-blur-sm">
              Create Free Account
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-8 text-sm text-gray-400">
            <div><span className="text-2xl font-bold text-white">60+</span><br/>Providers listed</div>
            <div className="w-px h-10 bg-white/20" />
            <div><span className="text-2xl font-bold text-white">12</span><br/>Specialties</div>
            <div className="w-px h-10 bg-white/20" />
            <div><span className="text-2xl font-bold text-white">Free</span><br/>For physicians</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturedProviders({ providers }) {
  const featured = providers.slice(0, 6)
  if (!featured.length) return null
  return (
    <section className="py-16 bg-white" id="featured">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">Featured Providers</span>
          <h2 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900">Trusted specialists accepting referrals</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map(p => (
            <Link href={`/search?id=${p.id}`} key={p.id} className="group border border-gray-200 rounded-xl p-5 hover:border-brand/40 hover:shadow-lg transition bg-white">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-brand transition text-[15px]">{p.name}</h3>
                  <p className="text-xs text-brand/70 font-medium mt-0.5">{p.type}</p>
                </div>
                {p.accepting_referrals ? (
                  <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">Accepting</span>
                ) : (
                  <span className="shrink-0 text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">Not Accepting</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3">📍 {p.address}</p>
              {p.phone && <p className="text-xs text-gray-500 mt-1">📞 {p.phone}</p>}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                {p.rating && <span className="text-xs font-semibold text-amber-600">★ {Number(p.rating).toFixed(1)}</span>}
                {p.wait_weeks !== null && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.wait_weeks === 0 ? 'text-emerald-700 bg-emerald-50' : p.wait_weeks <= 4 ? 'text-amber-700 bg-amber-50' : 'text-red-600 bg-red-50'}`}>
                    {p.wait_weeks === 0 ? 'No wait' : `~${p.wait_weeks} wk wait`}
                  </span>
                )}
                {p.fax && <span className="text-[10px] text-gray-400 ml-auto">📠 Fax available</span>}
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/search" className="text-sm font-semibold text-brand hover:text-brand-dark transition">View all providers →</Link>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { num: '1', icon: '🔍', title: 'Search', desc: 'Find specialists by name, specialty, location, wait time, or services offered.' },
    { num: '2', icon: '✅', title: 'Verify', desc: 'Check real-time availability, referral requirements, and accepted criteria before referring.' },
    { num: '3', icon: '📨', title: 'Refer', desc: 'Send a complete, well-matched referral that meets all the specialist\'s criteria.' },
  ]
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">How It Works</span>
          <h2 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900">Three steps to a successful referral</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(s => (
            <div key={s.num} className="text-center">
              <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">{s.icon}</div>
              <div className="text-xs font-bold text-brand uppercase tracking-wider mb-2">Step {s.num}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhyReferEase() {
  const stats = [
    { value: '30%+', label: 'of referrals get rejected in Ontario due to incomplete information' },
    { value: '6-12 mo', label: 'average wait after a rejected referral before the patient is re-referred' },
    { value: '0', label: 'rejections when referring through ReferEase\'s verified provider data' },
  ]
  return (
    <section className="py-16 bg-white" id="about">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">Why ReferEase</span>
          <h2 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900">Referral rejections waste everyone's time</h2>
          <p className="mt-4 text-gray-500 leading-relaxed">
            Every rejected referral means a patient waits longer, a family doctor repeats work, 
            and a specialist processes a file they can't accept. ReferEase gives you the information 
            you need before you refer — so every referral lands.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((s, i) => (
            <div key={i} className="bg-navy-900 rounded-xl p-6 text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-emerald-400">{s.value}</div>
              <p className="mt-3 text-sm text-gray-300 leading-relaxed">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ForSpecialists() {
  return (
    <section className="py-16 bg-gray-50" id="for-specialists">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-navy-900 to-brand-dark rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">For Specialists & Clinics</span>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold text-white">Control your referral flow</h2>
            <p className="mt-4 text-gray-300 leading-relaxed">
              Create your profile, set your referral criteria, update your wait times in real time, 
              and receive only the referrals that match your practice. Manage multiple locations, 
              showcase your services, and get discovered by family physicians across Ontario.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="inline-flex justify-center items-center px-6 py-3 bg-white text-brand font-semibold rounded-xl hover:bg-gray-100 transition text-sm">
                List Your Practice — Free
              </Link>
              <Link href="#" className="inline-flex justify-center items-center px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition border border-white/20 text-sm">
                See Premium Plans
              </Link>
            </div>
          </div>
          <div className="flex-shrink-0 grid grid-cols-2 gap-3 text-center">
            {[
              { icon: '⏱', label: 'Real-time\nwait times' },
              { icon: '📍', label: 'Multiple\nlocations' },
              { icon: '📋', label: 'Referral\ncriteria' },
              { icon: '📊', label: 'Analytics\n& insights' },
            ].map((f, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 w-28 border border-white/10">
                <div className="text-2xl mb-1">{f.icon}</div>
                <div className="text-[11px] text-gray-300 whitespace-pre-line leading-tight font-medium">{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-navy-950 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">R</span></div>
              <span className="text-lg font-bold text-white">Refer<span className="text-brand-light">Ease</span></span>
            </div>
            <p className="text-xs leading-relaxed">Ontario's healthcare referral platform. Find the right specialist, reduce rejections.</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">Platform</h4>
            <div className="space-y-2">
              <Link href="/search" className="block text-xs hover:text-white transition">Search Providers</Link>
              <Link href="/signup" className="block text-xs hover:text-white transition">Create Account</Link>
              <Link href="/admin" className="block text-xs hover:text-white transition">Admin</Link>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">For Providers</h4>
            <div className="space-y-2">
              <Link href="/signup" className="block text-xs hover:text-white transition">List Your Practice</Link>
              <Link href="#" className="block text-xs hover:text-white transition">Premium Plans</Link>
              <Link href="#" className="block text-xs hover:text-white transition">Resources</Link>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">Company</h4>
            <div className="space-y-2">
              <Link href="#" className="block text-xs hover:text-white transition">About</Link>
              <Link href="#" className="block text-xs hover:text-white transition">Contact</Link>
              <Link href="#" className="block text-xs hover:text-white transition">Privacy Policy</Link>
              <Link href="#" className="block text-xs hover:text-white transition">Terms of Service</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 text-xs text-gray-500 text-center">
          © 2026 ReferEase. All rights reserved. Ontario, Canada.
        </div>
      </div>
    </footer>
  )
}

export default function HomePage() {
  const [providers, setProviders] = useState([])

  useEffect(() => {
    async function load() {
      if (!supabase) return
      try {
        const { data } = await supabase.from('providers').select('*').eq('data_status', 'complete').order('rating', { ascending: false, nullsFirst: false }).limit(6)
        if (data) setProviders(data)
      } catch {}
    }
    load()
  }, [])

  return (
    <main>
      <Navbar />
      <Hero />
      <FeaturedProviders providers={providers} />
      <HowItWorks />
      <WhyReferEase />
      <ForSpecialists />
      <Footer />
    </main>
  )
}

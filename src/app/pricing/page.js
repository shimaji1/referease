'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TopNav from '@/components/TopNav'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

const TIERS = [
  {
    key: 'listed',
    name: 'Listed',
    price: 'Free',
    period: 'forever',
    tagline: 'Get discovered by referring physicians.',
    features: [
      'Public listing in search',
      'Category badge',
      'Claim and edit your listing',
      'Availability, hours, contact info',
      'Unlimited doctors under a clinic',
      '1 location',
    ],
    cta: 'Get listed',
    highlight: false,
  },
  {
    key: 'verified',
    name: 'Verified',
    price: '$29',
    period: '/month · or $290/year',
    tagline: 'The trust badge physicians filter by.',
    features: [
      'Everything in Listed',
      'Verified badge',
      'Mid-priority ranking in search',
      'Verified date shown on listing',
      'Up to 3 referral forms',
      'Up to 2 locations',
      'Basic view count',
      '1 staff account',
      '24-hour support',
    ],
    cta: 'Start 60-day free trial',
    highlight: true,
    trial: true,
  },
  {
    key: 'featured',
    name: 'Featured',
    price: '$79',
    period: '/month · or $790/year',
    tagline: 'Top placement + everything.',
    features: [
      'Everything in Verified',
      'Top-priority search rank',
      'Featured slots on homepage & category pages',
      'Priority in "near me" results',
      'Featured badge',
      'Full analytics dashboard',
      'Monthly performance email',
      'Follower announcements',
      'Unlimited referral forms',
      'Unlimited locations',
      'Unlimited staff accounts',
      'Onboarding call',
      'Same-day support',
      'Editorial blog spotlight',
    ],
    cta: 'Start 60-day free trial',
    highlight: false,
    trial: true,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const { user } = useAuth() || {}
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState('')

  const startTrial = async (plan) => {
    setMsg('')
    if (!user) {
      // Bounce to signup with intent parameter, signup can pick this up post-auth
      router.push(`/signup?intent=trial-${plan}`)
      return
    }
    // Find the user's first provider listing
    if (!supabase) return
    setBusy(plan)
    const { data: providers } = await supabase.from('providers').select('id').eq('claimed_by', user.email).limit(1)
    if (!providers || providers.length === 0) {
      setBusy(null)
      setMsg('You need to claim or create a listing before starting a trial.')
      router.push('/dashboard')
      return
    }
    const providerId = providers[0].id
    const res = await fetch('/api/plan/start-trial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: providerId, plan, user_email: user.email }),
    }).then(r => r.json()).catch(e => ({ error: e.message }))
    setBusy(null)
    if (res.error) { setMsg('Error: ' + res.error); return }
    router.push('/dashboard?trial=' + plan)
  }

  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">Pricing</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Fair pricing for every practice</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Get listed for free. Upgrade to be discovered. Try any paid plan for 60 days, no credit card.</p>
        </div>

        {msg && <div className="max-w-2xl mx-auto mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{msg}</div>}

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map(tier => (
            <div key={tier.key} className={`relative rounded-2xl p-8 flex flex-col ${tier.highlight ? 'bg-gradient-to-br from-brand to-[#2c4f7c] text-white border-2 border-brand shadow-xl scale-[1.02]' : 'bg-white border-2 border-gray-200'}`}>
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-brand text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">Most popular</div>
              )}
              {tier.trial && (
                <div className={`mb-4 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg text-center ${tier.highlight ? 'bg-white/15 text-amber-200 border border-white/20' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  60 days free · No credit card
                </div>
              )}
              <h2 className={`text-2xl font-bold ${tier.highlight ? 'text-white' : 'text-gray-900'}`}>{tier.name}</h2>
              <p className={`text-sm mt-1 mb-6 ${tier.highlight ? 'text-white/80' : 'text-gray-500'}`}>{tier.tagline}</p>
              <div className="mb-6">
                <span className={`text-4xl font-bold ${tier.highlight ? 'text-white' : 'text-gray-900'}`}>{tier.price}</span>
                <span className={`text-sm ml-1 ${tier.highlight ? 'text-white/70' : 'text-gray-500'}`}>{tier.period}</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {tier.features.map((f, i) => (
                  <li key={i} className={`text-sm flex items-start gap-2 ${tier.highlight ? 'text-white/90' : 'text-gray-700'}`}>
                    <span className={`shrink-0 mt-0.5 text-xs ${tier.highlight ? 'text-amber-300' : 'text-emerald-500'}`}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {tier.trial ? (
                <button
                  onClick={() => startTrial(tier.key)}
                  disabled={busy === tier.key}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition ${tier.highlight ? 'bg-white text-brand hover:bg-amber-50' : 'bg-brand text-white hover:bg-brand-dark'} ${busy === tier.key ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {busy === tier.key ? 'Starting…' : tier.cta}
                </button>
              ) : (
                <Link href={user ? '/dashboard/provider/new' : '/signup'} className="w-full py-3 rounded-xl text-sm font-bold transition bg-white text-brand border border-brand hover:bg-brand/5 text-center block">{tier.cta}</Link>
              )}
              {tier.trial && (
                <p className={`text-[11px] mt-3 text-center ${tier.highlight ? 'text-white/60' : 'text-gray-400'}`}>Downgrades to free if not kept, data always preserved</p>
              )}
            </div>
          ))}
        </div>

        {/* Benefits section, why upgrade */}
        <div className="mt-20 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Get in front of the doctors who send referrals</h2>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">Family physicians across Ontario search ReferEasy every day looking for someone accepting referrals. Paid plans put you where they're looking.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 text-center">
              <img src="/img/features/be-seen-first.png" alt="" className="w-full h-40 object-contain mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Be seen first</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Verified and Featured providers appear above unverified listings in every search. Referring physicians see you before your competition.</p>
            </div>
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 text-center">
              <img src="/img/features/build-trust.png" alt="" className="w-full h-40 object-contain mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Build instant trust</h3>
              <p className="text-sm text-gray-600 leading-relaxed">The Verified badge, earned through fax, email, and ID verification, signals to referring doctors that your listing is real, current, and physician managed.</p>
            </div>
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 text-center">
              <img src="/img/features/right-referrals.png" alt="" className="w-full h-40 object-contain mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Get the right referrals</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Upload your intake forms, spell out your referral criteria, and specify what you accept. Fewer rejected referrals. Better matched patients.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 text-center">
              <img src="/img/features/analytics.png" alt="" className="w-full h-40 object-contain mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">See who's finding you</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Featured providers get a full analytics dashboard with profile views, search impressions, and contact clicks, plus a monthly performance summary.</p>
            </div>
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 text-center">
              <img src="/img/features/near-you.png" alt="" className="w-full h-40 object-contain mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Reach patients near you</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Priority placement in "near me" searches means referring doctors in your catchment area find you first, before providers hours away.</p>
            </div>
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 text-center">
              <img src="/img/features/spotlight.png" alt="" className="w-full h-40 object-contain mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Editorial spotlight</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Featured members get an annual editorial spotlight on the ReferEasy blog. A proper article about your practice, your specialty, and how you help physicians and patients.</p>
            </div>
          </div>
        </div>

        {/* Small trust-note footer */}
        <p className="mt-16 text-center text-xs text-gray-400 max-w-xl mx-auto leading-relaxed">
          Try Verified or Featured free for 60 days, no credit card required. Downgrades to free automatically if you don't keep your plan. Your data is always preserved.
        </p>
      </section>
    </div>
  )
}

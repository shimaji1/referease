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
    tagline: 'The trust badge referring physicians filter by.',
    features: [
      'Everything in Listed',
      '✓ Verified badge (fax + email + ID)',
      'Mid-priority ranking in search',
      'Verified date shown on listing',
      'Up to 5 referral forms',
      'Custom How-to-Refer instructions',
      'Up to 3 locations',
      'Basic view count',
      'Direct email inbox',
      '3 staff accounts',
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
      // Bounce to signup with intent parameter — signup can pick this up post-auth
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
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Get listed for free. Upgrade to be discovered. Try any paid plan for 60 days — no credit card.</p>
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
                <p className={`text-[11px] mt-3 text-center ${tier.highlight ? 'text-white/60' : 'text-gray-400'}`}>Downgrades to free if not kept — data always preserved</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 text-center max-w-2xl mx-auto">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Trials end honestly</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            No auto-charge, ever, until Stripe payments are live. If your trial ends and you haven't kept your plan, your listing drops to Listed (free) — your data stays intact, your paid features are hidden until you keep your plan. Reminder emails at 15, 7, 5, and 1 day before the trial ends.
          </p>
        </div>
      </section>
    </div>
  )
}

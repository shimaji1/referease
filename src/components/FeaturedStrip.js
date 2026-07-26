'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// Category badge classes — mirrors the search page palette
const CAT_BADGE = {
  'Family Medicine': 'text-blue-700 bg-blue-50 border-blue-200',
  'Specialist': 'text-purple-700 bg-purple-50 border-purple-200',
  'Multi-Specialty': 'text-indigo-700 bg-indigo-50 border-indigo-200',
  'Clinic': 'text-slate-700 bg-slate-100 border-slate-300',
  'Hospital': 'text-cyan-700 bg-cyan-50 border-cyan-200',
  'Imaging': 'text-amber-700 bg-amber-50 border-amber-200',
  'Lab': 'text-teal-700 bg-teal-50 border-teal-200',
  'Physiotherapy': 'text-orange-700 bg-orange-50 border-orange-200',
  'Rehab': 'text-pink-700 bg-pink-50 border-pink-200',
}
const catBadge = (c) => CAT_BADGE[c] || 'text-gray-600 bg-gray-100 border-gray-200'

const DOC_CATS = new Set(['Family Medicine', 'Specialist'])

// Fisher-Yates shuffle so rotation feels fresh each load
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export default function FeaturedStrip({ category = null, title = 'Featured' }) {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const scroller = useRef(null)

  useEffect(() => {
    if (!supabase) { setLoaded(true); return }
    let alive = true
    const load = async () => {
      const doctorSide = category ? DOC_CATS.has(category) : null
      const results = []

      // Providers (facilities)
      if (doctorSide !== true) {
        let q = supabase.from('providers').select('id, name, type, category, address, accepting_referrals, verified, rating').eq('featured', true).eq('data_status', 'complete')
        if (category && !DOC_CATS.has(category)) q = q.eq('category', category)
        const { data } = await q.limit(12)
        if (data) results.push(...data.map(p => ({ ...p, _kind: 'provider' })))
      }
      // Doctors
      if (doctorSide !== false) {
        let q = supabase.from('physicians').select('id, name, specialty, category, accepting_referrals, verified, wait_weeks').eq('featured', true).eq('status', 'active')
        if (category && DOC_CATS.has(category)) q = q.eq('category', category)
        const { data } = await q.limit(12)
        if (data) results.push(...data.map(d => ({ ...d, _kind: 'doctor' })))
      }
      if (alive) { setItems(shuffle(results).slice(0, 12)); setLoaded(true) }
    }
    load()
    return () => { alive = false }
  }, [category])

  if (!loaded) return null

  // Empty state — CTA card
  if (items.length === 0) {
    return (
      <section className="my-8">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h2>
        </div>
        <div className="bg-gradient-to-r from-brand/5 to-brand/10 border border-brand/15 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm sm:text-base font-bold text-gray-900">Your practice here.</p>
            <p className="text-sm text-gray-500 mt-1 max-w-md">Get Featured to appear in this spot for every referring physician searching {category ? `for ${category}` : 'in your area'}.</p>
          </div>
          <Link href="/pricing" className="px-6 py-3 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand-dark transition shrink-0">Get Featured →</Link>
        </div>
      </section>
    )
  }

  const scrollBy = (dx) => scroller.current?.scrollBy({ left: dx, behavior: 'smooth' })

  return (
    <section className="my-8">
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Sponsored — providers who invest in referrer visibility</p>
        </div>
        <div className="hidden sm:flex gap-2 shrink-0">
          <button onClick={() => scrollBy(-320)} aria-label="Scroll left" className="w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-brand hover:text-brand transition flex items-center justify-center">←</button>
          <button onClick={() => scrollBy(320)} aria-label="Scroll right" className="w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-brand hover:text-brand transition flex items-center justify-center">→</button>
        </div>
      </div>
      <div ref={scroller} className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'thin' }}>
        {items.map(x => {
          const href = x._kind === 'doctor' ? `/doctors/${x.id}` : `/search?id=${x.id}`
          const sub = x._kind === 'doctor' ? (x.specialty || 'Physician') : (x.type || x.category || 'Provider')
          return (
            <Link key={x._kind + x.id} href={href} className="snap-start shrink-0 w-[280px] bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md hover:border-brand/30 transition relative">
              <span className="absolute top-3 right-3 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Featured</span>
              <div className="mb-2 pr-14">
                {x.category && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border tracking-wide inline-block mb-1.5 ${catBadge(x.category)}`}>{x.category.toUpperCase()}</span>}
                <h3 className="font-semibold text-gray-900 text-sm leading-snug">{x.name}</h3>
                <p className="text-xs text-brand/70 font-medium mt-0.5">{sub}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-3">
                {x.verified && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">✓ Verified</span>}
                {x.accepting_referrals === true && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Accepting</span>}
                {x.accepting_referrals === false && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Not accepting</span>}
                {x.accepting_referrals == null && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">Unknown</span>}
                {x.rating && <span className="text-[10px] font-semibold text-amber-500">★ {Number(x.rating).toFixed(1)}</span>}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
